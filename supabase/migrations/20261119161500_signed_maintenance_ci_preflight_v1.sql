-- Bind the existing signed maintenance warrant and verified historical baseline
-- to one exact read-only CI preflight. CI RED is NOT run or receipted here.
-- The historical provider SHA must still be independently re-attested by
-- the future protected CI broker before a source-specific frozen test.
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE m record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL
   OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_CI_SERVICE_WORKER_REQUIRED'; END IF;
 SELECT
   maintenance.incident_id,maintenance.owner_id,maintenance.origin_shift_id,
   maintenance.claimed_shift_id,maintenance.source_ref,
   maintenance.assignee,maintenance.independent_reviewer,
   maintenance.failure_baseline_kind,maintenance.last_source_sha256,
   maintenance.last_source_checked_at,
   maintenance.independent_source_observation_receipt_sha256,
   maintenance.independent_review_receipt_sha256,
   maintenance.independent_failure_baseline_receipt_sha256,
   maintenance.baseline_worker_run_id,
   sh.shift_id AS signed_shift_id
 INTO m
 FROM reality_internal.governed_employee_shifts_v1 sh
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
   AND sh.plan_fingerprint=w.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   ON pulse.shift_id=sh.shift_id AND pulse.owner_id=sh.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
   ON run.run_id=p_worker_run_id AND run.status='STARTED'
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 maintenance
   ON maintenance.owner_id=sh.owner_id
   AND maintenance.claimed_shift_id=sh.shift_id
   AND maintenance.baseline_claimed_shift_id=sh.shift_id
 CROSS JOIN LATERAL (
  SELECT maintenance.* 
 ) m0
 WHERE sh.shift_id=p_shift_id
   AND sh.authorized_at IS NOT NULL AND sh.closed_at IS NULL
   AND sh.planned_start_at<=clock_timestamp()
   AND sh.planned_end_at>clock_timestamp()
   AND sh.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   AND w.state='ACTIVE'
   AND w.authorized_at IS NOT NULL
   AND jsonb_typeof(w.source_scope)='array'
   AND EXISTS(
    SELECT 1 FROM jsonb_array_elements(w.source_scope) scope
    WHERE scope->>'maintenance_id'=maintenance.incident_id::text
      AND scope->>'origin_shift_id'=maintenance.origin_shift_id::text
      AND scope->>'source_ref'=maintenance.source_ref
      AND scope->>'independent_review_receipt_sha256'=
          maintenance.independent_review_receipt_sha256
   )
   AND pulse.last_worker_status='WAKE_RECEIVED'
   AND pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   AND run.started_at>clock_timestamp()-interval '3 minutes'
   AND maintenance.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
   AND maintenance.failure_baseline_kind IN(
     'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
     'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED')
   AND maintenance.baseline_worker_run_id<>p_worker_run_id
   AND maintenance.assignee<>maintenance.independent_reviewer
   AND maintenance.independent_review_receipt_sha256~
      '^sha256:[a-f0-9]{64}$'
   AND maintenance.independent_source_observation_receipt_sha256~
      '^sha256:[a-f0-9]{64}$'
   AND maintenance.last_source_sha256~'^sha256:[a-f0-9]{64}$'
   AND maintenance.independent_failure_baseline_receipt_sha256~
      '^sha256:[a-f0-9]{64}$'
   AND maintenance.independent_frozen_test_receipt_sha256 IS NULL
   AND maintenance.exact_install_approval_receipt_sha256 IS NULL
   AND maintenance.repaired_capability_receipt_sha256 IS NULL
   AND maintenance.original_customer_work_id IS NULL
   AND maintenance.original_job_completed IS FALSE
   AND maintenance.production_changed IS FALSE
   AND maintenance.installation_authorized_by_discovery IS FALSE
   AND maintenance.external_action_authorized_by_discovery IS FALSE
 ORDER BY maintenance.created_at,maintenance.incident_id
 LIMIT 1;
 IF NOT FOUND THEN
  RETURN jsonb_build_object(
   'status','NO_SIGNED_MAINTENANCE_FROZEN_CI_SCOPE',
   'read_only',true,'executable_frozen_ci_red_verified',false,
   'repair_executed',false,'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 RETURN jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CI_PREFLIGHT_NEEDS_SOURCE_ATTESTATION',
  'owner_id',m.owner_id,'shift_id',m.signed_shift_id,
  'maintenance_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
  'source_ref',m.source_ref,'assignee',m.assignee,
  'independent_reviewer',m.independent_reviewer,
  'failure_baseline_kind',m.failure_baseline_kind,
  'historical_source_sha256',m.last_source_sha256,
  'historical_source_checked_at',m.last_source_checked_at,
  'source_observation_receipt_sha256',
   m.independent_source_observation_receipt_sha256,
  'independent_review_receipt_sha256',
   m.independent_review_receipt_sha256,
  'independent_failure_baseline_receipt_sha256',
   m.independent_failure_baseline_receipt_sha256,
  'next_action','RECHECK_EXACT_PROVIDER_SOURCE_AND_RUN_INDEPENDENT_FROZEN_CI_RED',
  'source_current_epoch_verified',false,
  'read_only',true,'executable_frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) TO service_role;
