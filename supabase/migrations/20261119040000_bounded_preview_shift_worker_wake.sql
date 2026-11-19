-- Issue #351: preview-only, durable single-flight for the existing signed
-- employee-shift worker. This migration does not create or authorize work.
-- No worker invocation may claim another lease until the current lease expires
-- or its completion has been recorded and a bounded cooldown has elapsed.
CREATE TABLE IF NOT EXISTS reality_internal.governed_preview_shift_worker_leases_v1 (
  worker_key text PRIMARY KEY
    CHECK (worker_key='preview-governed-employee-shift-worker'),
  claim_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  next_wake_at timestamptz NOT NULL,
  released_at timestamptz
);
ALTER TABLE reality_internal.governed_preview_shift_worker_leases_v1
  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_preview_shift_worker_leases_v1
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON
  reality_internal.governed_preview_shift_worker_leases_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_governed_shift_worker_run_v1(
  p_claim_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_accepted uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_claim_id IS NULL THEN
    RAISE EXCEPTION 'PREVIEW_SHIFT_WAKE_CLAIM_REQUIRED';
  END IF;
  INSERT INTO reality_internal.governed_preview_shift_worker_leases_v1 AS current_lease
    (worker_key,claim_id,claimed_at,lease_expires_at,next_wake_at)
  VALUES (
    'preview-governed-employee-shift-worker',p_claim_id,v_now,
    v_now+interval '6 minutes',v_now
  )
  ON CONFLICT (worker_key) DO UPDATE SET
    claim_id=EXCLUDED.claim_id,
    claimed_at=EXCLUDED.claimed_at,
    lease_expires_at=EXCLUDED.lease_expires_at,
    next_wake_at=EXCLUDED.next_wake_at,
    released_at=NULL
  WHERE current_lease.lease_expires_at<=v_now
    AND current_lease.next_wake_at<=v_now
  RETURNING claim_id INTO v_accepted;
  IF v_accepted=p_claim_id THEN
    RETURN pg_catalog.jsonb_build_object(
      'status','WAKE_CLAIMED','claim_id',p_claim_id,
      'original_job_completed',false,'installation_authorized',false
    );
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'status','WAKE_COALESCED_ACTIVE_OR_COOLDOWN',
    'original_job_completed',false,'installation_authorized',false
  );
END
$function$;

CREATE OR REPLACE FUNCTION public.reality_release_governed_shift_worker_run_v1(
  p_claim_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_released uuid;
  v_now timestamptz:=clock_timestamp();
BEGIN
  UPDATE reality_internal.governed_preview_shift_worker_leases_v1 AS claim
  SET lease_expires_at=v_now,
      next_wake_at=v_now+interval '4 minutes',
      released_at=v_now
  WHERE claim.worker_key='preview-governed-employee-shift-worker'
    AND claim.claim_id=p_claim_id
    AND claim.released_at IS NULL
  RETURNING claim_id INTO v_released;
  RETURN pg_catalog.jsonb_build_object(
    'status',CASE WHEN v_released=p_claim_id
      THEN 'WAKE_RELEASED' ELSE 'WAKE_RELEASE_NOT_OWNED' END,
    'original_job_completed',false,'installation_authorized',false
  );
END
$function$;

REVOKE ALL ON FUNCTION public.reality_claim_governed_shift_worker_run_v1(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reality_release_governed_shift_worker_run_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_governed_shift_worker_run_v1(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_release_governed_shift_worker_run_v1(uuid)
  TO service_role;

-- Harden the existing *preview* cron job against its two evidenced runaway
-- wake causes without changing any source/shift/installation authorization.
-- In particular, a standing evidence-only discovery grant is NOT an event.
DO $fix$
DECLARE
  v_job cron.job%rowtype;
  v_old_clause text:=$clause$
 or exists (
  select 1 from reality_internal.owner_routine_delegations_v1 g
  where g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date then g.daily_reserved else 0 end)<g.max_daily_inquiries
 )
$clause$;
  v_new_command text;
BEGIN
  SELECT * INTO v_job FROM cron.job WHERE
    jobname='reality-riley-preview-original-execution-wake-v1'
    AND active=true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_CRON_NOT_FOUND_NO_CHANGE';
  END IF;
  IF v_job.schedule='*/5 * * * *'
     AND position(v_old_clause IN v_job.command)=0 THEN
    RETURN; -- repeatable migration; a prior verified gate remains intact
  END IF;
  IF v_job.schedule<>'* * * * *'
     OR md5(v_job.command)<>'3bfec223bf07e419048ac817b1a87f87'
     OR position(v_old_clause IN v_job.command)=0
     OR length(v_job.command)-length(replace(v_job.command,v_old_clause,''))
        <>length(v_old_clause)
  THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_COMMAND_DRIFT_ABORT_NO_CHANGE';
  END IF;
  v_new_command:=replace(v_job.command,v_old_clause,'');
  IF position('owner_capability_employee_schedule_v1' IN v_new_command)=0
     OR position('eligible_shift.permitted' IN v_new_command)=0
     OR position('net.http_post' IN v_new_command)=0
  THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_DUE_WORK_ELIGIBILITY_MISSING';
  END IF;
  -- The cron remains a fallback poll, but execution is now protected by a
  -- durable per-worker lease. Existing event-driven lanes are preserved.
  PERFORM cron.alter_job(v_job.jobid,
    schedule=>'*/5 * * * *',command=>v_new_command);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid=v_job.jobid
    AND active=true AND schedule='*/5 * * * *' AND command=v_new_command)
  THEN RAISE EXCEPTION 'PREVIEW_WORKER_CRON_READBACK_FAILED_ROLLBACK'; END IF;
END
$fix$;
