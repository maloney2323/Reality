-- Connect the existing signed maintenance CI preflight to independently checked
-- CURRENT provider source. This records a source epoch, NOT executable CI RED.
-- No extra shift, new authorization, code installation or customer completion.
CREATE TABLE IF NOT EXISTS reality_internal.signed_maintenance_ci_source_epochs_v1(
 maintenance_id uuid NOT NULL REFERENCES reality_internal.owner_internal_maintenance_jobs_v1(incident_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 source_ref text NOT NULL,
 worker_run_id uuid NOT NULL UNIQUE,
 historical_source_sha256 text NOT NULL CHECK(historical_source_sha256~'^sha256:[a-f0-9]{64}$'),
 current_provider_sha256 text NOT NULL CHECK(current_provider_sha256~'^sha256:[a-f0-9]{64}$'),
 baseline_receipt_sha256 text NOT NULL CHECK(baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_review_receipt_sha256 text NOT NULL CHECK(independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 source_checked_at timestamptz NOT NULL,
 epoch_status text NOT NULL CHECK(epoch_status IN(
  'SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED',
  'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED')),
 receipt_sha256 text NOT NULL UNIQUE CHECK(receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(maintenance_id,worker_run_id)
);
REVOKE ALL ON TABLE reality_internal.signed_maintenance_ci_source_epochs_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.signed_maintenance_ci_source_epochs_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_ci_source_epoch_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE m record; v_status text; v_hash text; v_now timestamptz:=clock_timestamp();
 v_existing record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR
   p_worker_run_id IS NULL OR p_maintenance_id IS NULL OR
   p_source_ref IS NULL OR
   p_provider_sha256 !~ '^sha256:[a-f0-9]{64}$' OR
   p_checked_at IS NULL OR p_checked_at<v_now-interval '3 minutes' OR
   p_checked_at>v_now+interval '1 minute'
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_CI_SOURCE_AUTHORITY_OR_PROOF_INVALID'; END IF;

 SELECT j.*,sh.plan_fingerprint,w.source_scope INTO m
 FROM reality_internal.owner_internal_maintenance_jobs_v1 j
 JOIN reality_internal.governed_employee_shifts_v1 sh
   ON sh.shift_id=p_shift_id AND sh.owner_id=j.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
   AND w.plan_fingerprint=sh.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   ON pulse.shift_id=sh.shift_id AND pulse.owner_id=sh.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
   ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE j.incident_id=p_maintenance_id AND j.source_ref=p_source_ref
   AND j.claimed_shift_id=p_shift_id
   AND j.baseline_claimed_shift_id=p_shift_id
   AND j.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
   AND j.independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND j.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND j.independent_source_observation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND j.last_source_sha256~'^sha256:[a-f0-9]{64}$'
   AND j.independent_frozen_test_receipt_sha256 IS NULL
   AND j.exact_install_approval_receipt_sha256 IS NULL
   AND j.repaired_capability_receipt_sha256 IS NULL
   AND j.original_customer_work_id IS NULL
   AND j.original_job_completed IS FALSE AND j.production_changed IS FALSE
   AND j.installation_authorized_by_discovery IS FALSE
   AND j.external_action_authorized_by_discovery IS FALSE
   AND j.baseline_worker_run_id<>p_worker_run_id
   AND j.assignee<>j.independent_reviewer
   AND sh.closed_at IS NULL AND sh.authorized_at IS NOT NULL
   AND sh.planned_start_at<=v_now AND sh.planned_end_at>v_now
   AND sh.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   AND w.state='ACTIVE' AND w.authorized_at IS NOT NULL
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) scope
    WHERE scope->>'maintenance_id'=j.incident_id::text
      AND scope->>'source_ref'=j.source_ref
      AND scope->>'origin_shift_id'=j.origin_shift_id::text
      AND scope->>'independent_review_receipt_sha256'=j.independent_review_receipt_sha256)
   AND pulse.last_worker_status='WAKE_RECEIVED'
   AND pulse.last_worker_seen_at>v_now-interval '3 minutes'
   AND run.started_at>v_now-interval '3 minutes'
 FOR UPDATE OF j;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','NO_SIGNED_MAINTENANCE_SOURCE_EPOCH_SCOPE',
   'original_job_completed',false,'repair_executed',false,
   'independent_frozen_ci_red_verified',false,
   'installation_authorized',false,'production_changed',false);
 END IF;

 IF p_provider_sha256=m.last_source_sha256 THEN
  v_status:='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED';
 ELSE
  v_status:='SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED';
 END IF;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   m.owner_id::text||'|'||p_shift_id::text||'|'||m.incident_id::text||
   '|'||p_worker_run_id::text||'|'||m.origin_shift_id::text||
   '|'||m.source_ref||'|'||m.independent_review_receipt_sha256||
   '|'||m.independent_failure_baseline_receipt_sha256||
   '|'||m.last_source_sha256||'|'||p_provider_sha256||'|'||
   p_checked_at::text||'|'||v_status,'UTF8')),'hex');
 INSERT INTO reality_internal.signed_maintenance_ci_source_epochs_v1(
  maintenance_id,owner_id,shift_id,source_ref,worker_run_id,
  historical_source_sha256,current_provider_sha256,
  baseline_receipt_sha256,independent_review_receipt_sha256,
  source_checked_at,epoch_status,receipt_sha256)
 VALUES(m.incident_id,m.owner_id,p_shift_id,m.source_ref,p_worker_run_id,
  m.last_source_sha256,p_provider_sha256,
  m.independent_failure_baseline_receipt_sha256,
  m.independent_review_receipt_sha256,p_checked_at,v_status,v_hash)
 ON CONFLICT(maintenance_id,worker_run_id) DO NOTHING;
 SELECT * INTO v_existing
 FROM reality_internal.signed_maintenance_ci_source_epochs_v1 e
 WHERE e.maintenance_id=m.incident_id AND e.worker_run_id=p_worker_run_id;
 IF NOT FOUND OR v_existing.receipt_sha256<>v_hash OR
   v_existing.current_provider_sha256<>p_provider_sha256
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_CI_EPOCH_CONFLICT'; END IF;

 RETURN pg_catalog.jsonb_build_object(
   'status',v_status,'owner_id',m.owner_id,'maintenance_id',m.incident_id,
   'shift_id',p_shift_id,'origin_shift_id',m.origin_shift_id,
   'source_ref',m.source_ref,'worker_run_id',p_worker_run_id,
   'historical_baseline_receipt_sha256',
      m.independent_failure_baseline_receipt_sha256,
   'historical_source_sha256',m.last_source_sha256,
   'current_provider_sha256',p_provider_sha256,
   'source_epoch_receipt_sha256',v_hash,
   'source_current_epoch_verified',v_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED',
   'next_action',CASE WHEN v_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
     THEN 'RUN_INDEPENDENT_EXECUTABLE_FROZEN_CI_RED'
     ELSE 'REQUALIFY_CHANGED_PROVIDER_SOURCE_BEFORE_CI' END,
   'independent_frozen_ci_red_verified',false,
   'repair_executed',false,'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_ci_source_epoch_v1(uuid,uuid,uuid,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_ci_source_epoch_v1(uuid,uuid,uuid,text,text,timestamptz) TO service_role;
