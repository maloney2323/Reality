
-- Reality: signed provider reinspection of already-staged independent GitHub
-- history. This explicitly does NOT attest maintenance-specific CI RED or
-- authorize an installation or settle customer-original work.
CREATE TABLE IF NOT EXISTS reality_internal.owner_maintenance_external_regression_signed_reviews_v1(
 maintenance_id uuid PRIMARY KEY REFERENCES reality_internal.owner_internal_maintenance_jobs_v1(incident_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 worker_run_id uuid NOT NULL UNIQUE,
 reviewer text NOT NULL CHECK(reviewer <> ''),
 source_ref text NOT NULL,
 staging_receipt_sha256 text NOT NULL UNIQUE CHECK(staging_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 source_epoch_receipt_sha256 text NOT NULL CHECK(source_epoch_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_provider_digest text NOT NULL CHECK(independent_provider_digest~'^sha256:[a-f0-9]{64}$'),
 github_run_id bigint NOT NULL,
 red_job_id bigint NOT NULL,
 green_job_id bigint NOT NULL,
 evidence_verdict text NOT NULL CHECK(evidence_verdict=
  'HISTORICAL_GUARD_REGRESSION_VERIFIED_NOT_MAINTENANCE_CASE_SPECIFIC_RED'),
 final_receipt_sha256 text NOT NULL UNIQUE CHECK(final_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON TABLE reality_internal.owner_maintenance_external_regression_signed_reviews_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.owner_maintenance_external_regression_signed_reviews_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_next_signed_maintenance_external_review_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO ''
AS $fn$
DECLARE v record; v_now timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_EXTERNAL_REVIEW_OWNER_WORKER_REQUIRED'; END IF;
 SELECT x.*,m.assignee,m.independent_reviewer,
  e.current_provider_sha256
 INTO v
 FROM reality_internal.owner_maintenance_external_regression_evidence_v1 x
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=x.maintenance_id AND m.owner_id=x.owner_id
 JOIN reality_internal.signed_maintenance_ci_source_epochs_v1 e
  ON e.maintenance_id=x.maintenance_id AND e.owner_id=x.owner_id
   AND e.shift_id=x.shift_id AND e.receipt_sha256=x.source_epoch_receipt_sha256
 JOIN reality_internal.governed_employee_shifts_v1 sh
  ON sh.shift_id=x.shift_id AND sh.owner_id=x.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
  AND w.plan_fingerprint=sh.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  ON pulse.shift_id=sh.shift_id AND pulse.owner_id=sh.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE x.shift_id=p_shift_id
  AND m.claimed_shift_id=sh.shift_id
  AND m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
  AND m.independent_frozen_test_receipt_sha256 IS NULL
  AND m.repaired_capability_receipt_sha256 IS NULL
  AND m.exact_install_approval_receipt_sha256 IS NULL
  AND m.original_customer_work_id IS NULL
  AND m.original_job_completed IS FALSE
  AND m.production_changed IS FALSE
  AND m.assignee<>m.independent_reviewer
  AND m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND e.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
  AND e.current_provider_sha256=e.historical_source_sha256
  AND sh.closed_at IS NULL AND sh.authorized_at IS NOT NULL
  AND sh.planned_start_at<=v_now AND sh.planned_end_at>v_now
  AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) scope
    WHERE scope->>'maintenance_id'=m.incident_id::text
      AND scope->>'source_ref'=m.source_ref
      AND scope->>'origin_shift_id'=m.origin_shift_id::text
      AND scope->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  AND pulse.last_worker_status='WAKE_RECEIVED'
  AND pulse.last_worker_seen_at>v_now-interval '3 minutes'
  AND run.started_at>v_now-interval '3 minutes'
  AND NOT EXISTS(SELECT 1 FROM reality_internal.owner_maintenance_external_regression_signed_reviews_v1 done
   WHERE done.maintenance_id=x.maintenance_id)
 ORDER BY x.staged_at,x.maintenance_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_EXTERNAL_REGRESSION_TO_REVIEW',
  'read_only',true,'independent_maintenance_ci_red_attested',false,
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
 'status','SIGNED_EXTERNAL_REGRESSION_NEEDS_INDEPENDENT_GITHUB_RECHECK',
 'shift_id',v.shift_id,'owner_id',v.owner_id,
 'maintenance_id',v.maintenance_id,'source_ref',v.source_ref,
 'assignee',v.assignee,'reviewer',v.independent_reviewer,
 'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
 'current_provider_sha256',v.current_provider_sha256,
 'staging_receipt_sha256',v.staging_receipt_sha256,
 'external_test_pr_number',v.external_test_pr_number,
 'github_run_id',v.github_run_id,'github_run_url',v.github_run_url,
 'github_red_job_id',v.github_red_job_id,'github_green_job_id',v.github_green_job_id,
 'github_head_sha',v.github_head_sha,
 'historical_source_commit_sha',v.historical_source_commit_sha,
 'corrected_source_commit_sha',v.corrected_source_commit_sha,
 'frozen_test_blob_sha',v.frozen_test_blob_sha,
 'frozen_workflow_blob_sha',v.frozen_workflow_blob_sha,
 'read_only',true,'independent_maintenance_ci_red_attested',false,
 'original_job_completed',false,'repair_executed',false,
 'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_next_signed_maintenance_external_review_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_next_signed_maintenance_external_review_v1(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_external_review_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_staging_receipt_sha256 text,p_independent_provider_digest text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO ''
AS $fn$
DECLARE v record; prev record; v_sha text;
 v_verdict text:='HISTORICAL_GUARD_REGRESSION_VERIFIED_NOT_MAINTENANCE_CASE_SPECIFIC_RED';
 v_now timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 OR p_maintenance_id IS NULL OR
 p_staging_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$' OR
 p_independent_provider_digest !~ '^sha256:[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'SIGNED_EXTERNAL_REVIEW_PROOF_INVALID'; END IF;
 SELECT x.*,m.assignee,m.independent_reviewer,e.current_provider_sha256
 INTO v
 FROM reality_internal.owner_maintenance_external_regression_evidence_v1 x
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=x.maintenance_id AND m.owner_id=x.owner_id
 JOIN reality_internal.signed_maintenance_ci_source_epochs_v1 e
  ON e.maintenance_id=x.maintenance_id AND e.shift_id=x.shift_id
  AND e.receipt_sha256=x.source_epoch_receipt_sha256
 JOIN reality_internal.governed_employee_shifts_v1 sh
  ON sh.shift_id=x.shift_id AND sh.owner_id=x.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id
  AND w.plan_fingerprint=sh.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  ON pulse.shift_id=sh.shift_id AND pulse.owner_id=sh.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE x.maintenance_id=p_maintenance_id AND x.shift_id=p_shift_id
  AND x.staging_receipt_sha256=p_staging_receipt_sha256
  AND m.claimed_shift_id=p_shift_id
  AND m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
  AND m.independent_frozen_test_receipt_sha256 IS NULL
  AND m.repaired_capability_receipt_sha256 IS NULL
  AND m.exact_install_approval_receipt_sha256 IS NULL
  AND m.original_customer_work_id IS NULL
  AND m.original_job_completed IS FALSE AND m.production_changed IS FALSE
  AND m.assignee<>m.independent_reviewer
  AND e.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
  AND e.current_provider_sha256=e.historical_source_sha256
  AND sh.closed_at IS NULL AND sh.authorized_at IS NOT NULL
  AND sh.planned_start_at<=v_now AND sh.planned_end_at>v_now
  AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) scope
    WHERE scope->>'maintenance_id'=m.incident_id::text
      AND scope->>'source_ref'=m.source_ref
      AND scope->>'origin_shift_id'=m.origin_shift_id::text
      AND scope->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  AND pulse.last_worker_status='WAKE_RECEIVED'
  AND pulse.last_worker_seen_at>v_now-interval '3 minutes'
  AND run.started_at>v_now-interval '3 minutes'
 FOR UPDATE OF m;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_EXTERNAL_REVIEW_NOT_AUTHORIZED',
  'independent_maintenance_ci_red_attested',false,
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false); END IF;
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   v.owner_id::text||'|'||v.maintenance_id::text||'|'||p_shift_id::text||'|'||
   p_worker_run_id::text||'|'||v.source_ref||'|'||
   v.independent_reviewer||'|'||v.staging_receipt_sha256||'|'||
   v.source_epoch_receipt_sha256||'|'||p_independent_provider_digest||'|'||
   v.github_run_id::text||'|'||v.github_red_job_id::text||'|'||
   v.github_green_job_id::text||'|'||v_verdict,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_maintenance_external_regression_signed_reviews_v1(
  maintenance_id,owner_id,shift_id,worker_run_id,reviewer,source_ref,
  staging_receipt_sha256,source_epoch_receipt_sha256,independent_provider_digest,
  github_run_id,red_job_id,green_job_id,evidence_verdict,final_receipt_sha256)
 VALUES(v.maintenance_id,v.owner_id,p_shift_id,p_worker_run_id,
  v.independent_reviewer,v.source_ref,v.staging_receipt_sha256,
  v.source_epoch_receipt_sha256,p_independent_provider_digest,
  v.github_run_id,v.github_red_job_id,v.github_green_job_id,v_verdict,v_sha)
 ON CONFLICT(maintenance_id) DO NOTHING;
 SELECT * INTO prev FROM reality_internal.owner_maintenance_external_regression_signed_reviews_v1
 WHERE maintenance_id=v.maintenance_id;
 IF NOT FOUND OR prev.final_receipt_sha256<>v_sha
 THEN RAISE EXCEPTION 'SIGNED_EXTERNAL_REVIEW_IMMUTABLE_CONFLICT'; END IF;
 RETURN pg_catalog.jsonb_build_object(
 'status','SIGNED_EXTERNAL_HISTORICAL_REGRESSION_REVIEW_RECORDED_CASE_RED_STILL_REQUIRED',
 'owner_id',v.owner_id,'shift_id',p_shift_id,'maintenance_id',v.maintenance_id,
 'reviewer',v.independent_reviewer,'source_ref',v.source_ref,
 'review_receipt_sha256',v_sha,'staging_receipt_sha256',v.staging_receipt_sha256,
 'independent_maintenance_ci_red_attested',false,
 'next_action','CASE_SPECIFIC_INDEPENDENT_FROZEN_CI_RED_REQUIRED',
 'original_job_completed',false,'repair_executed',false,
 'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_external_review_v1(uuid,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_external_review_v1(uuid,uuid,uuid,text,text) TO service_role;

-- The original-job continuation gate is a read-only lens over the EXISTING
-- Riley original and final-receipt ledgers, not an additional job queue.
CREATE OR REPLACE FUNCTION public.reality_read_same_original_postmaintenance_gate_v1(
 p_shift_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO ''
AS $fn$
DECLARE v record; v_receipt record; v_warrant record;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL
 THEN RAISE EXCEPTION 'SAME_ORIGINAL_GATE_SERVICE_REQUIRED'; END IF;
 SELECT s.shift_id,s.owner_id,s.status,
  o.original_work_id,o.source_ref,o.phase,o.attempts,
  o.model_response_id,o.provider_comment_id
 INTO v
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.riley_pr_review_originals_v1 o
  ON o.shift_id=s.shift_id AND o.owner_id=s.owner_id
 WHERE s.shift_id=p_shift_id ORDER BY o.created_at LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','NO_EXISTING_SAME_ORIGINAL_FOR_SHIFT',
   'original_job_completed',false,'independent_final_receipt_verified',false,
   'new_job_created',false,'installation_authorized',false); END IF;
 SELECT w.mode,w.state INTO v_warrant
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 WHERE w.shift_id=p_shift_id AND w.owner_id=v.owner_id LIMIT 1;
 SELECT f.receipt_id,f.original_work_id,f.outcome,f.final_evidence_sha256
 INTO v_receipt
 FROM reality_internal.governed_original_independent_final_receipts_v1 f
 WHERE f.shift_id=p_shift_id AND f.owner_id=v.owner_id
  AND f.original_work_id=v.original_work_id
  AND f.source_ref=v.source_ref
 ORDER BY f.recorded_at DESC LIMIT 1;
 RETURN pg_catalog.jsonb_build_object(
 'status',CASE
  WHEN v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   THEN 'EXISTING_ORIGINAL_HAS_INDEPENDENT_FINAL_RECEIPT'
  WHEN v_warrant.mode<>'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS' OR
   v_warrant.state<>'ACTIVE' OR v_warrant.mode IS NULL
   THEN 'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT'
  WHEN v.phase='BLOCKED'
   THEN 'EXISTING_ORIGINAL_BLOCKED_REQUALIFICATION_REQUIRED'
  ELSE 'EXISTING_ORIGINAL_GOVERNED_EXECUTION_REQUIRES_FRESH_ACCEPTANCE'
 END,
 'shift_id',v.shift_id,'owner_id',v.owner_id,
 'original_work_id',v.original_work_id,'source_ref',v.source_ref,
 'phase',v.phase,'attempts',v.attempts,'warrant_mode',v_warrant.mode,
 'independent_final_receipt_id',v_receipt.receipt_id,
 'independent_final_receipt_verified',
  coalesce(v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$',false),
 'original_job_completed',coalesce(v_receipt.outcome='SUCCEEDED' AND
   v_receipt.final_evidence_sha256~'^sha256:[a-f0-9]{64}$',false),
 'new_job_created',false,'installation_authorized',false,
 'production_changed',false,'read_only',true);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_same_original_postmaintenance_gate_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_same_original_postmaintenance_gate_v1(uuid) TO service_role;
