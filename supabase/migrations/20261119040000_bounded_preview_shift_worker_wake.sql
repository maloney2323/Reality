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

