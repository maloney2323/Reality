-- Reuse the installed service-only recovery-attempt ledger and existing
-- GitHub corrective broker. Each attempt gets an isolated candidate branch
-- and independently read-back CI receipt. No new job, shift or installation.
ALTER TABLE reality_internal.riley_same_original_recovery_attempts_v2
 ADD COLUMN IF NOT EXISTS candidate_staged_branch text,
 ADD COLUMN IF NOT EXISTS candidate_staged_commit_sha text,
 ADD COLUMN IF NOT EXISTS candidate_staged_at timestamptz;
ALTER TABLE reality_internal.riley_same_original_recovery_attempts_v2
 ADD CONSTRAINT recovery_candidate_staged_all_or_none CHECK (
  (candidate_staged_branch IS NULL AND candidate_staged_commit_sha IS NULL AND candidate_staged_at IS NULL)
  OR (candidate_staged_branch IS NOT NULL AND candidate_staged_commit_sha IS NOT NULL AND candidate_staged_at IS NOT NULL));
ALTER TABLE reality_internal.riley_same_original_recovery_attempts_v2
 ADD CONSTRAINT recovery_ci_requires_exact_staging CHECK (
  phase NOT IN ('CANDIDATE_STAGED','CI_FAILED','CI_PASSED')
  OR (candidate_staged_branch ~ '^reality/riley/auto-corrective-[a-f0-9]{32}-a[2-9][0-9]*$'
    AND candidate_staged_commit_sha ~ '^[a-f0-9]{40}$'
    AND candidate_staged_at IS NOT NULL));
ALTER TABLE reality_internal.riley_same_original_recovery_attempts_v2
 ADD CONSTRAINT recovery_ci_hash_not_changed CHECK (
  phase NOT IN ('CI_FAILED','CI_PASSED')
  OR ci_commit_sha=candidate_staged_commit_sha);

CREATE OR REPLACE FUNCTION public.reality_read_next_same_original_recovery_candidate_v2()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb; r record; cnt integer;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_CI_SERVICE_ONLY'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','NO_OWNER_WARRANTED_RECOVERY_PATCH_FOR_CI',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false); END IF;
 SELECT count(*) INTO cnt
 FROM reality_internal.riley_same_original_recovery_attempts_v2 a
 JOIN reality_internal.riley_unattended_repair_originals_v1 j
  ON j.original_work_id=a.original_work_id AND j.shift_id=a.shift_id
  AND j.owner_id=a.owner_id AND j.issue_url=a.source_ref
  AND j.shift_source_proof_sha256=a.source_proof_sha256
  AND j.phase='SOURCE_ADMITTED' AND j.production_changed=false
  AND j.exact_approval_receipt_ref IS NULL AND j.original_settlement_receipt_ref IS NULL
 WHERE a.shift_id=(g->>'shift_id')::uuid AND a.owner_id=(g->>'owner_id')::uuid
  AND a.phase IN ('MODEL_PATCH_RECORDED','CANDIDATE_STAGED')
  AND a.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
  AND a.source_commit_sha ~ '^[a-f0-9]{40}$'
  AND a.source_blob_sha ~ '^[a-f0-9]{40}$'
  AND a.proposed_source_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
   WHERE x->>'original_work_id'=a.original_work_id
    AND x->>'source_ref'=a.source_ref
    AND x->>'source_proof_sha256'=a.source_proof_sha256
    AND x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
    AND x->>'phase'='SOURCE_ADMITTED'
    AND x->>'independent_source_proof_verified'='true');
 IF cnt=0 THEN RETURN jsonb_build_object('status','NO_UNTESTED_SAME_ORIGINAL_RECOVERY_CANDIDATE',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false); END IF;
 IF cnt<>1 THEN RAISE EXCEPTION 'RECOVERY_CI_MULTIPLE_CANDIDATES_NO_DISPATCH'; END IF;
 SELECT * INTO r FROM reality_internal.riley_same_original_recovery_attempts_v2 a
 WHERE a.shift_id=(g->>'shift_id')::uuid AND a.owner_id=(g->>'owner_id')::uuid
  AND a.phase IN ('MODEL_PATCH_RECORDED','CANDIDATE_STAGED')
 ORDER BY a.attempt_number LIMIT 1;
 IF r.source_path<>'src/reality-riley-service-original-runtime-v1.js'
   OR r.replacement_find IS NULL OR r.replacement_with IS NULL
   OR r.attempt_number<2 OR r.attempt_number>8
 THEN RAISE EXCEPTION 'RECOVERY_CI_EXACT_SOURCE_PATH_AND_EDIT_REQUIRED'; END IF;
 RETURN jsonb_build_object(
  'status','SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI',
  'attempt_id',r.attempt_id,'attempt_number',r.attempt_number,
  'attempt_phase',r.phase,'original_work_id',r.original_work_id,
  'shift_id',r.shift_id,'owner_id',r.owner_id,'source_ref',r.source_ref,
  'source_proof_sha256',r.source_proof_sha256,
  'source_path',r.source_path,'source_commit_sha',r.source_commit_sha,
  'source_blob_sha',r.source_blob_sha,'model_response_id',r.model_response_id,
  'proposed_sha256',r.proposed_source_sha256,
  'find',r.replacement_find,'replace',r.replacement_with,
  'candidate_staged_branch',r.candidate_staged_branch,
  'candidate_staged_commit_sha',r.candidate_staged_commit_sha,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_next_same_original_recovery_candidate_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_next_same_original_recovery_candidate_v2() TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_same_original_recovery_staging_v2(
 p_attempt_id uuid,p_model_response_id text,p_proposed_sha256 text,
 p_candidate_branch text,p_candidate_commit_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r record;g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_CI_SERVICE_ONLY'; END IF;
 SELECT * INTO r FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR r.model_response_id<>p_model_response_id
  OR r.proposed_source_sha256<>p_proposed_sha256
  OR r.phase NOT IN ('MODEL_PATCH_RECORDED','CANDIDATE_STAGED')
  OR p_candidate_branch<>'reality/riley/auto-corrective-'||
      pg_catalog.split_part(r.original_work_id,':',2)||'-a'||r.attempt_number::text
  OR p_candidate_commit_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'RECOVERY_CI_EXACT_ATTEMPT_AND_BRANCH_REQUIRED'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
   WHERE x->>'original_work_id'=r.original_work_id
    AND x->>'source_ref'=r.source_ref
    AND x->>'source_proof_sha256'=r.source_proof_sha256
    AND x->>'phase'='SOURCE_ADMITTED')
 THEN RAISE EXCEPTION 'RECOVERY_CI_ORIGINAL_OWNER_WARRANT_DRIFT'; END IF;
 IF r.phase='CANDIDATE_STAGED' THEN
  IF r.candidate_staged_branch<>p_candidate_branch
   OR r.candidate_staged_commit_sha<>p_candidate_commit_sha
  THEN RAISE EXCEPTION 'RECOVERY_CI_STAGED_CANDIDATE_CHANGED'; END IF;
 ELSE
  UPDATE reality_internal.riley_same_original_recovery_attempts_v2 SET
   phase='CANDIDATE_STAGED',candidate_staged_branch=p_candidate_branch,
   candidate_staged_commit_sha=p_candidate_commit_sha,
   candidate_staged_at=clock_timestamp()
  WHERE attempt_id=p_attempt_id AND phase='MODEL_PATCH_RECORDED';
  IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_CI_STAGING_ATOMIC_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('status','SAME_ORIGINAL_RECOVERY_CANDIDATE_STAGED',
  'attempt_id',r.attempt_id,'attempt_number',r.attempt_number,
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'candidate_branch',p_candidate_branch,'candidate_commit_sha',p_candidate_commit_sha,
  'independent_ci_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_same_original_recovery_staging_v2(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_same_original_recovery_staging_v2(uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_same_original_recovery_ci_v2(
 p_attempt_id uuid,p_model_response_id text,p_proposed_sha256 text,
 p_tested_commit_sha text,p_independent_run_id bigint,
 p_independent_run_url text,p_conclusion text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r record;g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_CI_SERVICE_ONLY'; END IF;
 IF p_tested_commit_sha!~'^[a-f0-9]{40}$' OR p_independent_run_id<10000
  OR p_independent_run_url<>'https://github.com/maloney2323/Reality/actions/runs/'||p_independent_run_id::text
  OR p_conclusion NOT IN ('success','failure')
 THEN RAISE EXCEPTION 'RECOVERY_CI_EXACT_INDEPENDENT_PROVIDER_RUN_REQUIRED'; END IF;
 SELECT * INTO r FROM reality_internal.riley_same_original_recovery_attempts_v2
  WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR r.phase NOT IN ('CANDIDATE_STAGED','CI_FAILED','CI_PASSED')
  OR r.model_response_id<>p_model_response_id
  OR r.proposed_source_sha256<>p_proposed_sha256
  OR r.candidate_staged_commit_sha<>p_tested_commit_sha
 THEN RAISE EXCEPTION 'RECOVERY_CI_FROZEN_ATTEMPT_CHANGED'; END IF;
 IF r.phase IN ('CI_FAILED','CI_PASSED') THEN
  IF r.ci_run_id<>p_independent_run_id OR r.ci_conclusion<>p_conclusion
   OR r.ci_commit_sha<>p_tested_commit_sha
  THEN RAISE EXCEPTION 'RECOVERY_CI_RECEIPT_REPLAY_CONFLICT'; END IF;
 ELSE
  g:=public.reality_read_current_shift_execution_graph_v1();
  IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
   OR g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
    WHERE x->>'original_work_id'=r.original_work_id
     AND x->>'source_ref'=r.source_ref
     AND x->>'source_proof_sha256'=r.source_proof_sha256
     AND x->>'phase'='SOURCE_ADMITTED')
  THEN RAISE EXCEPTION 'RECOVERY_CI_OWNER_WARRANT_DRIFT'; END IF;
  UPDATE reality_internal.riley_same_original_recovery_attempts_v2 SET
   phase=CASE WHEN p_conclusion='failure' THEN 'CI_FAILED' ELSE 'CI_PASSED' END,
   ci_run_id=p_independent_run_id,ci_run_url=p_independent_run_url,
   ci_commit_sha=p_tested_commit_sha,ci_conclusion=p_conclusion,
   ci_verified_at=clock_timestamp()
   WHERE attempt_id=p_attempt_id AND phase='CANDIDATE_STAGED';
  IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_CI_RECEIPT_ATOMIC_CONFLICT'; END IF;
 END IF;
 RETURN jsonb_build_object('status',CASE WHEN p_conclusion='failure'
  THEN 'SAME_ORIGINAL_RECOVERY_CI_FAILED_NEXT_EVIDENCE_BACKED_ATTEMPT_ELIGIBLE'
  ELSE 'SAME_ORIGINAL_RECOVERY_CI_PASSED_EXACT_INSTALL_APPROVAL_REQUIRED' END,
  'attempt_id',r.attempt_id,'attempt_number',r.attempt_number,
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'independent_run_id',p_independent_run_id,'independent_run_url',p_independent_run_url,
  'ci_conclusion',p_conclusion,'independent_ci_verified',true,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_same_original_recovery_ci_v2(uuid,text,text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_same_original_recovery_ci_v2(uuid,text,text,text,bigint,text,text) TO service_role;
