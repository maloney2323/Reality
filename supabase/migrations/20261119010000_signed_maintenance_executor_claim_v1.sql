-- Durable, single-flight maintenance dispatch claim. Claim != CI proof or repair.
CREATE TABLE IF NOT EXISTS reality_internal.signed_maintenance_executor_claims_v1 (
 maintenance_id uuid PRIMARY KEY,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 worker_run_id uuid NOT NULL,
 source_ref text NOT NULL,
 source_epoch_receipt_sha256 text NOT NULL,
 action text NOT NULL CHECK (action IN
  ('RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
   'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI')),
 state text NOT NULL DEFAULT 'CLAIMED' CHECK (state IN ('CLAIMED','FAILED_RETRYABLE','COMPLETED')),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 lease_expires_at timestamptz NOT NULL DEFAULT (now()+interval '10 minutes'),
 attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 3)
);
REVOKE ALL ON reality_internal.signed_maintenance_executor_claims_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON reality_internal.signed_maintenance_executor_claims_v1 TO service_role;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_executor_v1(
 p_shift_id uuid,p_worker_run_id uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE e record; a text; claimed record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'MAINTENANCE_EXECUTOR_SIGNED_SERVICE_REQUIRED'; END IF;
 -- Never derive authority from an epoch alone. Match the active owner warrant
 -- and exact maintenance source/review receipt in its scope.
 SELECT ep.*,m.origin_shift_id,m.independent_review_receipt_sha256 AS job_review
 INTO e
 FROM reality_internal.signed_maintenance_ci_source_epochs_v1 ep
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
   ON m.incident_id=ep.maintenance_id AND m.owner_id=ep.owner_id
   AND m.source_ref=ep.source_ref
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=ep.shift_id AND w.owner_id=ep.owner_id
   AND w.state='ACTIVE'
   AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 WHERE ep.shift_id=p_shift_id
   AND ep.epoch_status IN ('SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED',
                           'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED')
   AND ep.receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND ep.independent_review_receipt_sha256=m.independent_review_receipt_sha256
   AND m.independent_failure_baseline_receipt_sha256=ep.baseline_receipt_sha256
   AND m.independent_frozen_test_receipt_sha256 IS NULL
   AND m.original_job_completed=false AND m.production_changed=false
   AND ep.owner_id=m.owner_id
   AND EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements(
     CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
       THEN w.source_scope ELSE '[]'::jsonb END) AS sc(entry)
    WHERE sc.entry->>'maintenance_id'=ep.maintenance_id::text
      AND sc.entry->>'source_ref'=ep.source_ref
      AND sc.entry->>'origin_shift_id'=m.origin_shift_id::text
      AND sc.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
   AND NOT EXISTS (SELECT 1 FROM reality_internal.signed_maintenance_executor_claims_v1 c
                   WHERE c.maintenance_id=ep.maintenance_id
                     AND (c.state='COMPLETED' OR c.attempt_count>=3 OR
                          (c.state='CLAIMED' AND c.lease_expires_at>now())))
 ORDER BY ep.recorded_at,ep.maintenance_id LIMIT 1 FOR UPDATE OF ep SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
  'handoff_executed',false,'independent_frozen_ci_red_verified',false,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 END IF;
 a:=CASE WHEN e.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
   THEN 'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
   ELSE 'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI' END;
 INSERT INTO reality_internal.signed_maintenance_executor_claims_v1(
 maintenance_id,owner_id,shift_id,worker_run_id,source_ref,
 source_epoch_receipt_sha256,action)
 VALUES(e.maintenance_id,e.owner_id,e.shift_id,p_worker_run_id,
        e.source_ref,e.receipt_sha256,a)
 ON CONFLICT (maintenance_id) DO UPDATE SET
  worker_run_id=EXCLUDED.worker_run_id,
  claimed_at=now(),lease_expires_at=now()+interval '10 minutes',
  attempt_count=reality_internal.signed_maintenance_executor_claims_v1.attempt_count+1,
  state='CLAIMED'
 WHERE reality_internal.signed_maintenance_executor_claims_v1.attempt_count<3
   AND reality_internal.signed_maintenance_executor_claims_v1.state<>'COMPLETED'
   AND (reality_internal.signed_maintenance_executor_claims_v1.state='FAILED_RETRYABLE'
     OR reality_internal.signed_maintenance_executor_claims_v1.lease_expires_at<=now())
 RETURNING * INTO claimed;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_EXECUTOR_ALREADY_CLAIMED',
  'handoff_executed',false,'independent_frozen_ci_red_verified',false,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED',
  'maintenance_id',claimed.maintenance_id,'shift_id',claimed.shift_id,
  'worker_run_id',claimed.worker_run_id,'source_ref',claimed.source_ref,
  'source_epoch_receipt_sha256',claimed.source_epoch_receipt_sha256,
  'next_action',claimed.action,'claim_attempt',claimed.attempt_count,
  'lease_expires_at',claimed.lease_expires_at,'handoff_executed',false,
  'independent_frozen_ci_red_verified',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_claim_signed_maintenance_executor_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_signed_maintenance_executor_v1(uuid,uuid) TO service_role;
