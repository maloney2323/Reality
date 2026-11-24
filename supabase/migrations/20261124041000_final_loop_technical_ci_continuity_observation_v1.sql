-- Evidence-only Continuity attachment for GitHub-verified technical recovery.
-- It is NOT one of the required business-original RED/repair/GREEN proof gates.
-- Runs ONLY in an isolated signed-worker DB; shared and production unchanged.
CREATE TABLE IF NOT EXISTS reality_internal.final_loop_technical_ci_observations_v1(
 observation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contract_id text NOT NULL UNIQUE REFERENCES
  reality_internal.final_loop_recovery_contracts_v1(contract_id),
 owner_id uuid NOT NULL,shift_id uuid NOT NULL,
 original_work_id text NOT NULL CHECK(original_work_id ~ '^work:[a-f0-9]{32}$'),
 source_ref text NOT NULL,source_head_sha text NOT NULL
  CHECK(source_head_sha ~ '^[a-f0-9]{40}$'),
 continuity_root_id uuid NOT NULL,maintenance_id uuid NOT NULL,
 independent_prior_diagnostic_sha256 text NOT NULL
  CHECK(independent_prior_diagnostic_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 github_release_sha text NOT NULL CHECK(github_release_sha ~ '^[a-f0-9]{40}$'),
 github_run_id bigint NOT NULL CHECK(github_run_id>0),
 github_job_id bigint NOT NULL CHECK(github_job_id>0),
 github_artifact_id bigint NOT NULL CHECK(github_artifact_id>0),
 github_artifact_digest text NOT NULL
  CHECK(github_artifact_digest ~ '^sha256:[a-f0-9]{64}$'),
 signed_case_spec_git_blob_sha text NOT NULL
  CHECK(signed_case_spec_git_blob_sha ~ '^[a-f0-9]{40}$'),
 recording_worker_run_id uuid NOT NULL,
 observation_receipt_sha256 text NOT NULL UNIQUE
  CHECK(observation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 proof_scope text NOT NULL DEFAULT 'TECHNICAL_RECOVERY_HANDOFF_ONLY'
  CHECK(proof_scope='TECHNICAL_RECOVERY_HANDOFF_ONLY'),
 original_business_red_proven boolean NOT NULL DEFAULT false
  CHECK(original_business_red_proven=false),
 execution_authorized boolean NOT NULL DEFAULT false
  CHECK(execution_authorized=false),
 original_job_completed boolean NOT NULL DEFAULT false
  CHECK(original_job_completed=false),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(shift_id,original_work_id,github_run_id,github_artifact_digest)
);
ALTER TABLE reality_internal.final_loop_technical_ci_observations_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE reality_internal.final_loop_technical_ci_observations_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.final_loop_technical_ci_observations_v1
 TO service_role;
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_technical_ci_observation_v1(
 p_contract_id text)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $body$
DECLARE r record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'RECOVERY_TECH_CI_READ_SERVICE_ROLE_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.final_loop_technical_ci_observations_v1
 WHERE contract_id=p_contract_id;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECHNICAL_CI_NOT_DURABLY_OBSERVED',
  'technical_ci_observed',false,'business_original_red_verified',false,
  'original_job_completed',false,'execution_authorized',false,
  'read_only',true);END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECHNICAL_CI_SOURCE_BOUND_OBSERVATION_RECORDED',
  'technical_ci_observed',true,'contract_id',r.contract_id,
  'owner_id',r.owner_id,'shift_id',r.shift_id,
  'obligation_id',r.original_work_id,'source_ref',r.source_ref,
  'source_revision',r.source_head_sha,
  'continuity_root_id',r.continuity_root_id,
  'maintenance_id',r.maintenance_id,
  'github_run_id',r.github_run_id,'github_job_id',r.github_job_id,
  'github_artifact_id',r.github_artifact_id,
  'github_release_sha',r.github_release_sha,
  'github_artifact_digest',r.github_artifact_digest,
  'signed_case_spec_git_blob_sha',r.signed_case_spec_git_blob_sha,
  'observation_receipt_sha256',r.observation_receipt_sha256,
  'technical_ci_independently_observed',true,
  'business_original_red_verified',false,
  'original_business_claim_admitted',false,
  'original_job_completed',false,'execution_authorized',false,
  'original_settled',false,'repair_executed',false,
  'production_changed',false,
  'next_governed_action','INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED',
  'read_only',true);
END $body$;
CREATE OR REPLACE FUNCTION public.reality_record_final_loop_technical_ci_observation_v1(
 p_contract_id text,p_worker_run_id uuid,p_proof jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $body$
DECLARE c record; v_plan record; v_maintenance record;
 v_run record;v_head jsonb;v_continuity jsonb;v_receipt text;
 v_prior record;v_run_id bigint;v_job_id bigint;v_artifact_id bigint;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'RECOVERY_TECH_CI_WRITE_SERVICE_ROLE_REQUIRED';END IF;
 IF p_worker_run_id IS NULL OR
  coalesce(p_contract_id,'') !~ '^sha256:[a-f0-9]{64}$' OR
  pg_catalog.jsonb_typeof(p_proof)<>'object' OR
  NOT coalesce(p_proof ?& ARRAY[
   'status','contract_id','owner_id','shift_id','obligation_id',
   'source_ref','source_revision','maintenance_id',
   'independent_technical_ci_verified','frozen_technical_red_verified',
   'original_business_case_red_verified','business_original_warrant_verified',
   'original_job_completed','execution_authorized','production_changed',
   'github_release_sha','github_run_id','github_job_id',
   'github_artifact_id','github_artifact_digest',
   'signed_case_spec_git_blob_sha',
   'existing_diagnostic_receipt_sha256'],false)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_SOURCE_PROOF_INVALID_NO_WRITE',
  'original_job_completed',false,'execution_authorized',false);END IF;
 -- The worker's provider observation is a technical proof, not a model-
 -- generated certificate of the original job or its independent RED gate.
 IF p_proof->>'status'<>
   'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING' OR
  p_proof->>'contract_id'<>p_contract_id OR
  p_proof->>'independent_technical_ci_verified'<>'true' OR
  p_proof->>'frozen_technical_red_verified'<>'true' OR
  p_proof->>'original_business_case_red_verified'<>'false' OR
  p_proof->>'business_original_warrant_verified'<>'false' OR
  p_proof->>'original_job_completed'<>'false' OR
  p_proof->>'execution_authorized'<>'false' OR
  p_proof->>'production_changed'<>'false' OR
  coalesce(p_proof->>'source_revision','') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_proof->>'github_release_sha','') !~ '^[a-f0-9]{40}$' OR
  coalesce(p_proof->>'github_artifact_digest','') !~
     '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_proof->>'signed_case_spec_git_blob_sha','') !~
     '^[a-f0-9]{40}$' OR
  coalesce(p_proof->>'github_run_id','') !~ '^[1-9][0-9]{0,15}$' OR
  coalesce(p_proof->>'github_job_id','') !~ '^[1-9][0-9]{0,15}$' OR
  coalesce(p_proof->>'github_artifact_id','') !~ '^[1-9][0-9]{0,15}$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_PROVIDER_RECEIPT_INVALID_NO_WRITE',
  'original_job_completed',false,'execution_authorized',false);END IF;
 v_run_id:=(p_proof->>'github_run_id')::bigint;
 v_job_id:=(p_proof->>'github_job_id')::bigint;
 v_artifact_id:=(p_proof->>'github_artifact_id')::bigint;
 SELECT * INTO c FROM reality_internal.final_loop_recovery_contracts_v1
 WHERE contract_id=p_contract_id FOR UPDATE;
 IF NOT FOUND OR c.owner_id::text<>p_proof->>'owner_id' OR
  c.shift_id::text<>p_proof->>'shift_id' OR
  c.obligation_id<>p_proof->>'obligation_id' OR
  c.source_ref<>p_proof->>'source_ref' OR
  c.source_revision<>p_proof->>'source_revision' OR
  c.phase<>'FROZEN_EVIDENCE_ONLY' THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','RECOVERY_TECH_CI_FROZEN_CONTRACT_MISMATCH_NO_WRITE',
   'original_job_completed',false,'execution_authorized',false);END IF;
 SELECT * INTO v_run FROM reality_internal.signed_worker_actual_runs_v1
 WHERE run_id=p_worker_run_id AND status='STARTED'
  AND finished_at IS NULL AND started_at>pg_catalog.clock_timestamp()-interval '3 minutes';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_SIGNED_WORKER_LEASE_EXPIRED',
  'original_job_completed',false,'execution_authorized',false);END IF;
 SELECT * INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1
 WHERE shift_id=c.shift_id AND owner_id=c.owner_id
  AND parent_original_work_id=c.obligation_id
  AND source_ref=c.source_ref AND source_head_sha=c.source_revision
  AND state='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_SOURCE_PLAN_EPOCH_CHANGED',
  'original_job_completed',false,'execution_authorized',false);END IF;
 SELECT m.* ,a.ci_independent_diagnostic_receipt_sha256 AS ci_proof
 INTO v_maintenance FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 JOIN reality_internal.signed_maintenance_executor_claims_v1 a
  ON a.maintenance_id=m.incident_id AND a.owner_id=m.owner_id
 WHERE m.owner_id=c.owner_id AND m.claimed_shift_id=c.shift_id
  AND m.source_ref=c.source_ref
  AND m.incident_id::text=p_proof->>'maintenance_id'
  AND m.independent_failure_baseline_receipt_sha256 IS NOT NULL
  AND m.independent_frozen_test_receipt_sha256 IS NULL
  AND a.state='COMPLETED'
  AND a.ci_independent_diagnostic_receipt_sha256 IS NOT NULL
  AND m.original_job_completed=false AND m.production_changed=false;
 IF NOT FOUND OR v_maintenance.ci_proof<>
  p_proof->>'existing_diagnostic_receipt_sha256' THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','RECOVERY_TECH_CI_EXISTING_MAINTENANCE_IDENTITY_CHANGED',
   'original_job_completed',false,'execution_authorized',false);END IF;
 IF NOT EXISTS(SELECT 1 FROM
  reality_internal.governed_employee_completion_warrants_v1 w
  WHERE w.shift_id=c.shift_id AND w.owner_id=c.owner_id
   AND w.state='ACTIVE'
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) i
    WHERE i->>'maintenance_id'=v_maintenance.incident_id::text
     AND i->>'origin_shift_id'=v_maintenance.origin_shift_id::text
     AND i->>'source_ref'=c.source_ref
     AND i->>'independent_review_receipt_sha256'=
      v_maintenance.independent_review_receipt_sha256))
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_EXISTING_WARRANT_NOT_CURRENT',
  'original_job_completed',false,'execution_authorized',false);END IF;
 v_head:=public.reality_read_current_final_loop_proof_envelope_v1(c.shift_id);
 v_continuity:=public.reality_read_final_loop_shared_continuity_guard_v1(c.shift_id);
 IF v_head->>'status' IS DISTINCT FROM
    'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING' OR
  v_continuity->>'status' IS DISTINCT FROM
    'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' OR
  v_head->>'continuity_root_id' IS DISTINCT FROM c.continuity_root_id::text OR
  v_head->>'continuity_head_sha256' IS DISTINCT FROM c.continuity_head_sha256 OR
  v_head->>'revision' IS NULL OR
  (v_head->>'revision')::bigint IS DISTINCT FROM c.continuity_revision OR
  v_continuity->>'continuity_root_id' IS DISTINCT FROM c.continuity_root_id::text OR
  v_continuity->>'continuity_head_sha256' IS DISTINCT FROM c.continuity_head_sha256
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECH_CI_CANONICAL_CONTINUITY_CHANGED_RECHECK',
  'original_job_completed',false,'execution_authorized',false);END IF;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'contract_id',c.contract_id,'shift_id',c.shift_id,
   'original_work_id',c.obligation_id,
   'github_release_sha',p_proof->>'github_release_sha',
   'github_run_id',v_run_id,'github_job_id',v_job_id,
   'github_artifact_id',v_artifact_id,
   'github_artifact_digest',p_proof->>'github_artifact_digest',
   'case_spec_blob_sha',p_proof->>'signed_case_spec_git_blob_sha',
   'worker_run_id',p_worker_run_id)::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_technical_ci_observations_v1(
  contract_id,owner_id,shift_id,original_work_id,source_ref,source_head_sha,
  continuity_root_id,maintenance_id,independent_prior_diagnostic_sha256,
  github_release_sha,github_run_id,github_job_id,
  github_artifact_id,github_artifact_digest,signed_case_spec_git_blob_sha,
  recording_worker_run_id,observation_receipt_sha256)
 VALUES(c.contract_id,c.owner_id,c.shift_id,c.obligation_id,c.source_ref,
  c.source_revision,c.continuity_root_id,v_maintenance.incident_id,
  v_maintenance.ci_proof,p_proof->>'github_release_sha',
  v_run_id,v_job_id,v_artifact_id,p_proof->>'github_artifact_digest',
  p_proof->>'signed_case_spec_git_blob_sha',p_worker_run_id,v_receipt)
 ON CONFLICT DO NOTHING RETURNING * INTO v_prior;
 IF NOT FOUND THEN
  SELECT * INTO v_prior FROM reality_internal.final_loop_technical_ci_observations_v1
  WHERE contract_id=c.contract_id AND observation_receipt_sha256=v_receipt;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','RECOVERY_TECH_CI_ALREADY_RECORDED_WITH_DIFFERENT_PROVIDER_PROOF',
   'original_job_completed',false,'execution_authorized',false);END IF;END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','RECOVERY_TECHNICAL_CI_OBSERVATION_ATOMICALLY_RECORDED',
  'contract_id',c.contract_id,'obligation_id',c.obligation_id,
  'observation_receipt_sha256',v_prior.observation_receipt_sha256,
  'github_artifact_digest',v_prior.github_artifact_digest,
  'technical_ci_observed',true,
  'business_original_red_verified',false,
  'original_job_completed',false,'execution_authorized',false,
  'original_settled',false,'repair_executed',false,
  'production_changed',false);
END $body$;
REVOKE ALL ON FUNCTION
 public.reality_read_final_loop_technical_ci_observation_v1(text),
 public.reality_record_final_loop_technical_ci_observation_v1(text,uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_read_final_loop_technical_ci_observation_v1(text),
 public.reality_record_final_loop_technical_ci_observation_v1(text,uuid,jsonb)
 TO service_role;
