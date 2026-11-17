-- Additive same-original repair recovery. Prior v1 revisions/CI remain immutable.
-- Service-only eligibility, one lease per independently verified failed CI.
-- A model can propose an edit, not install it, mint a new job or settle it.
CREATE TABLE IF NOT EXISTS reality_internal.riley_same_original_recovery_attempts_v2(
 attempt_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 original_work_id text NOT NULL REFERENCES reality_internal.riley_unattended_repair_originals_v1(original_work_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 attempt_number integer NOT NULL CHECK(attempt_number BETWEEN 2 AND 8),
 source_ref text NOT NULL CHECK(source_ref ~ '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'),
 source_proof_sha256 text NOT NULL CHECK(source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 source_path text NOT NULL CHECK(source_path ~ '^src/[a-zA-Z0-9/_-]+[.]js$' AND source_path NOT LIKE '%..%'),
 prior_attempt_id uuid,
 failed_run_id bigint NOT NULL UNIQUE CHECK(failed_run_id > 10000),
 failed_commit_sha text NOT NULL CHECK(failed_commit_sha ~ '^[a-f0-9]{40}$'),
 failed_candidate_sha256 text NOT NULL CHECK(failed_candidate_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 request_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 phase text NOT NULL DEFAULT 'MODEL_LEASED'
  CHECK(phase IN ('MODEL_LEASED','MODEL_PATCH_RECORDED','PROVIDER_UNVERIFIED',
                  'CANDIDATE_STAGED','CI_FAILED','CI_PASSED')),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '5 minutes'),
 model_response_id text CHECK(model_response_id IS NULL OR model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'),
 source_commit_sha text CHECK(source_commit_sha IS NULL OR source_commit_sha ~ '^[a-f0-9]{40}$'),
 source_blob_sha text CHECK(source_blob_sha IS NULL OR source_blob_sha ~ '^[a-f0-9]{40}$'),
 source_file_sha256 text CHECK(source_file_sha256 IS NULL OR source_file_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 proposed_source_sha256 text CHECK(proposed_source_sha256 IS NULL OR proposed_source_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 replacement_find text,replacement_with text,model_reason text,
 model_output_tokens integer,
 model_completed_at timestamptz,
 failure_class text,
 ci_run_id bigint UNIQUE,
 ci_run_url text,
 ci_commit_sha text,
 ci_conclusion text CHECK(ci_conclusion IS NULL OR ci_conclusion IN ('failure','success')),
 ci_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(original_work_id,attempt_number),
 UNIQUE(original_work_id,failed_run_id),
 CONSTRAINT recovery_patch_all_or_none CHECK(
  (phase NOT IN ('MODEL_PATCH_RECORDED','CANDIDATE_STAGED','CI_FAILED','CI_PASSED'))
  OR (model_response_id IS NOT NULL AND source_commit_sha IS NOT NULL
      AND source_blob_sha IS NOT NULL AND source_file_sha256 IS NOT NULL
      AND proposed_source_sha256 IS NOT NULL AND replacement_find IS NOT NULL
      AND replacement_with IS NOT NULL AND model_reason IS NOT NULL
      AND model_completed_at IS NOT NULL)),
 CONSTRAINT recovery_ci_all_or_none CHECK(
  (phase NOT IN ('CI_FAILED','CI_PASSED'))
  OR (ci_run_id IS NOT NULL AND ci_run_url IS NOT NULL
      AND ci_commit_sha IS NOT NULL AND ci_conclusion IS NOT NULL
      AND ci_verified_at IS NOT NULL)),
 CONSTRAINT recovery_no_forged_settlement CHECK(attempt_number >= 2)
);
ALTER TABLE reality_internal.riley_same_original_recovery_attempts_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.riley_same_original_recovery_attempts_v2 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.riley_same_original_recovery_attempts_v2 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_same_original_recovery_attempt_v2()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb; prior record; r record; prev record; n integer; active_count integer; 
 v_next integer; v_previous uuid; v_failed_run bigint; v_failed_commit text;
 v_failed_hash text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_SERVICE_ROLE_ONLY'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
   OR g->>'installation_authorized'<>'false'
   OR g->>'production_changed'<>'false'
   OR g->>'completion_bound'<>'true'
 THEN RETURN jsonb_build_object('status','NO_VERIFIED_COMPLETION_WARRANT_RECOVERY',
   'model_invocation_authorized',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false); END IF;
 -- Old verified CI supplies the first recovery failure. Exact owner/source
 -- proof is rechecked from the original authorized execution graph.
 SELECT c.*,j.issue_url,j.shift_source_proof_sha256,v.source_path
 INTO prior
 FROM reality_internal.riley_auto_corrective_ci_proofs_v1 c
 JOIN reality_internal.riley_native_model_revisions_v1 v
  ON v.original_work_id=c.original_work_id AND v.shift_id=c.shift_id
   AND v.owner_id=c.owner_id AND v.model_response_id=c.model_response_id
   AND v.proposed_source_sha256=c.proposed_sha256
 JOIN reality_internal.riley_unattended_repair_originals_v1 j
  ON j.original_work_id=c.original_work_id AND j.shift_id=c.shift_id
   AND j.owner_id=c.owner_id AND j.phase='SOURCE_ADMITTED'
   AND j.exact_approval_receipt_ref IS NULL
   AND j.original_settlement_receipt_ref IS NULL AND j.production_changed=false
 JOIN LATERAL pg_catalog.jsonb_array_elements(g->'jobs') x
  ON x->>'original_work_id'=j.original_work_id
   AND x->>'source_ref'=j.issue_url
   AND x->>'source_proof_sha256'=j.shift_source_proof_sha256
   AND x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
   AND x->>'phase'='SOURCE_ADMITTED'
   AND x->>'independent_source_proof_verified'='true'
 WHERE c.owner_id=(g->>'owner_id')::uuid AND c.shift_id=(g->>'shift_id')::uuid
   AND c.conclusion='failure' AND c.independent_run_id>10000
   AND c.independent_run_url='https://github.com/maloney2323/Reality/actions/runs/'||c.independent_run_id::text
   AND c.tested_commit_sha~'^[a-f0-9]{40}$'
   AND c.proposed_sha256~'^sha256:[a-f0-9]{64}$'
   AND c.checked_at IS NOT NULL
   AND v.source_path~'^src/[a-zA-Z0-9/_-]+[.]js$' AND v.source_path NOT LIKE '%..%'
 ORDER BY c.checked_at ASC,c.original_work_id LIMIT 2;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_INDEPENDENT_FAILED_ORIGINAL_TO_RECOVER',
  'model_invocation_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false); END IF;
 SELECT count(*) INTO active_count
 FROM reality_internal.riley_auto_corrective_ci_proofs_v1 c
 JOIN reality_internal.riley_unattended_repair_originals_v1 j ON
  j.original_work_id=c.original_work_id AND j.shift_id=c.shift_id
  AND j.owner_id=c.owner_id AND j.phase='SOURCE_ADMITTED'
 WHERE c.owner_id=(g->>'owner_id')::uuid AND c.shift_id=(g->>'shift_id')::uuid
 AND c.conclusion='failure'
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x WHERE
  x->>'original_work_id'=j.original_work_id AND x->>'source_ref'=j.issue_url
  AND x->>'phase'='SOURCE_ADMITTED' AND x->>'independent_source_proof_verified'='true');
 IF active_count<>1 THEN RAISE EXCEPTION 'RECOVERY_AMBIGUOUS_ORIGINALS_NO_DISPATCH'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(prior.original_work_id));
 SELECT * INTO prev FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE original_work_id=prior.original_work_id ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF prev.phase<>'CI_FAILED' THEN
   RETURN jsonb_build_object('status','EXISTING_SAME_ORIGINAL_RECOVERY_NO_REPLAY',
    'attempt_id',prev.attempt_id,'attempt_number',prev.attempt_number,
    'phase',prev.phase,'original_work_id',prev.original_work_id,
    'shift_id',prev.shift_id,'model_invocation_authorized',false,
    'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  END IF;
  v_next:=prev.attempt_number+1;
  v_previous:=prev.attempt_id;
  v_failed_run:=prev.ci_run_id;v_failed_commit:=prev.ci_commit_sha;
  v_failed_hash:=prev.proposed_source_sha256;
  IF prev.ci_conclusion<>'failure' OR prev.ci_verified_at IS NULL
    OR prev.ci_run_url<>'https://github.com/maloney2323/Reality/actions/runs/'||prev.ci_run_id::text
    OR prev.ci_commit_sha!~'^[a-f0-9]{40}$'
  THEN RAISE EXCEPTION 'RECOVERY_NEXT_ATTEMPT_REQUIRES_VERIFIED_NEGATIVE_PROOF'; END IF;
 ELSE
  v_next:=2;v_previous:=null;
  v_failed_run:=prior.independent_run_id;v_failed_commit:=prior.tested_commit_sha;
  v_failed_hash:=prior.proposed_sha256;
 END IF;
 IF v_next>8 THEN
  RETURN jsonb_build_object('status','RECOVERY_ATTEMPT_BUDGET_REQUIRES_OWNER_REVIEW',
   'original_work_id',prior.original_work_id,'attempts_already_recorded',v_next-1,
   'model_invocation_authorized',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 INSERT INTO reality_internal.riley_same_original_recovery_attempts_v2(
  original_work_id,owner_id,shift_id,attempt_number,source_ref,source_proof_sha256,
  source_path,prior_attempt_id,failed_run_id,failed_commit_sha,failed_candidate_sha256)
 VALUES(prior.original_work_id,prior.owner_id,prior.shift_id,v_next,
  prior.issue_url,prior.shift_source_proof_sha256,prior.source_path,v_previous,
  v_failed_run,v_failed_commit,v_failed_hash)
 ON CONFLICT DO NOTHING RETURNING * INTO r;
 IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_DUPLICATE_OR_CHANGED_PROOF'; END IF;
 RETURN jsonb_build_object('status','SAME_ORIGINAL_RECOVERY_MODEL_LEASED',
  'attempt_id',r.attempt_id,'attempt_number',r.attempt_number,'request_id',r.request_id,
  'original_work_id',r.original_work_id,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'source_ref',r.source_ref,'source_proof_sha256',r.source_proof_sha256,
  'source_path',r.source_path,'failed_run_id',r.failed_run_id,
  'failed_commit_sha',r.failed_commit_sha,
  'failed_candidate_sha256',r.failed_candidate_sha256,
  'model_invocation_authorized',true,'new_shift_started',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_same_original_recovery_attempt_v2() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_same_original_recovery_attempt_v2() TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_same_original_recovery_patch_v2(
 p_attempt_id uuid,p_request_id uuid,p_source_path text,p_base_sha text,
 p_blob_sha text,p_source_file_sha256 text,p_proposed_sha256 text,
 p_model_response_id text,p_find text,p_replace text,p_reason text,
 p_output_tokens integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r record;g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_SERVICE_ROLE_ONLY'; END IF;
 IF p_attempt_id IS NULL OR p_request_id IS NULL
  OR p_base_sha!~'^[a-f0-9]{40}$' OR p_blob_sha!~'^[a-f0-9]{40}$'
  OR p_source_file_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_proposed_sha256!~'^sha256:[a-f0-9]{64}$'
  OR p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$'
  OR p_find IS NULL OR pg_catalog.length(p_find)<20 OR pg_catalog.length(p_find)>12000
  OR p_replace IS NULL OR pg_catalog.length(p_replace)>16000 OR p_find=p_replace
  OR p_reason IS NULL OR pg_catalog.length(p_reason)<8 OR pg_catalog.length(p_reason)>1500
  OR p_output_tokens IS NULL OR p_output_tokens<0 OR p_output_tokens>10000
 THEN RAISE EXCEPTION 'RECOVERY_MODEL_SOURCE_PROOF_INVALID'; END IF;
 SELECT * INTO r FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=p_attempt_id AND request_id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.phase<>'MODEL_LEASED' OR clock_timestamp()>r.lease_expires_at
   OR p_source_path<>r.source_path
 THEN RAISE EXCEPTION 'RECOVERY_MODEL_LEASE_CONSUMED_OR_DRIFTED'; END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'shift_id'<>r.shift_id::text OR g->>'owner_id'<>r.owner_id::text
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
   WHERE x->>'original_work_id'=r.original_work_id
    AND x->>'source_ref'=r.source_ref
    AND x->>'source_proof_sha256'=r.source_proof_sha256
    AND x->>'phase'='SOURCE_ADMITTED'
    AND x->>'independent_source_proof_verified'='true')
 THEN RAISE EXCEPTION 'RECOVERY_OWNER_GOAL_AND_SOURCE_DRIFTED'; END IF;
 UPDATE reality_internal.riley_same_original_recovery_attempts_v2 SET
  phase='MODEL_PATCH_RECORDED',source_commit_sha=p_base_sha,
  source_blob_sha=p_blob_sha,source_file_sha256=p_source_file_sha256,
  proposed_source_sha256=p_proposed_sha256,model_response_id=p_model_response_id,
  replacement_find=p_find,replacement_with=p_replace,
  model_reason=p_reason,model_output_tokens=p_output_tokens,
  model_completed_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND request_id=p_request_id AND phase='MODEL_LEASED';
 IF NOT FOUND THEN RAISE EXCEPTION 'RECOVERY_PATCH_ATOMIC_WRITE_FAILED'; END IF;
 RETURN jsonb_build_object('status','SAME_ORIGINAL_RECOVERY_PATCH_RECORDED',
  'attempt_id',p_attempt_id,'attempt_number',r.attempt_number,
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'model_response_id',p_model_response_id,'proposed_sha256',p_proposed_sha256,
  'independent_tests_passed',false,'new_shift_started',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_same_original_recovery_patch_v2(uuid,uuid,text,text,text,text,text,text,text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_same_original_recovery_patch_v2(uuid,uuid,text,text,text,text,text,text,text,text,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_mark_same_original_recovery_uncertain_v2(
 p_attempt_id uuid,p_request_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'RECOVERY_SERVICE_ROLE_ONLY'; END IF;
 IF p_reason!~'^RECOVERY_[A-Z0-9_]{4,105}$' THEN
  RAISE EXCEPTION 'RECOVERY_SAFE_FAILURE_CODE_REQUIRED'; END IF;
 UPDATE reality_internal.riley_same_original_recovery_attempts_v2 SET
  phase='PROVIDER_UNVERIFIED',failure_class=p_reason
 WHERE attempt_id=p_attempt_id AND request_id=p_request_id AND phase='MODEL_LEASED';
 RETURN jsonb_build_object('status','RECOVERY_PROVIDER_UNVERIFIED_NO_AUTOMATIC_REPLAY',
  'model_invocation_authorized',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_mark_same_original_recovery_uncertain_v2(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_mark_same_original_recovery_uncertain_v2(uuid,uuid,text) TO service_role;

-- Enforce evidence immutability even for a privileged worker: the only
-- permitted updates are one-way phase transitions with retained past proof.
CREATE OR REPLACE FUNCTION reality_internal.guard_same_original_recovery_attempt_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $guard$
BEGIN
 IF (OLD.original_work_id,OLD.owner_id,OLD.shift_id,OLD.attempt_number,
     OLD.attempt_id,OLD.source_ref,OLD.source_proof_sha256,OLD.source_path,
     OLD.prior_attempt_id,OLD.failed_run_id,OLD.failed_commit_sha,
     OLD.failed_candidate_sha256,OLD.request_id,OLD.claimed_at,OLD.created_at)
  IS DISTINCT FROM
    (NEW.original_work_id,NEW.owner_id,NEW.shift_id,NEW.attempt_number,
     NEW.attempt_id,NEW.source_ref,NEW.source_proof_sha256,NEW.source_path,
     NEW.prior_attempt_id,NEW.failed_run_id,NEW.failed_commit_sha,
     NEW.failed_candidate_sha256,NEW.request_id,NEW.claimed_at,NEW.created_at)
 THEN RAISE EXCEPTION 'RECOVERY_IMMUTABLE_ORIGINAL_AND_FAILURE_EVIDENCE'; END IF;
 IF OLD.phase IN ('CI_FAILED','CI_PASSED','PROVIDER_UNVERIFIED')
   OR (OLD.phase='MODEL_LEASED' AND
       NEW.phase NOT IN ('MODEL_PATCH_RECORDED','PROVIDER_UNVERIFIED'))
   OR (OLD.phase='MODEL_PATCH_RECORDED' AND NEW.phase<>'CANDIDATE_STAGED')
   OR (OLD.phase='CANDIDATE_STAGED' AND NEW.phase NOT IN ('CI_FAILED','CI_PASSED'))
 THEN RAISE EXCEPTION 'RECOVERY_ONE_WAY_GOVERNED_TRANSITION_REQUIRED'; END IF;
 IF OLD.phase<>'MODEL_LEASED' AND
    (OLD.model_response_id,OLD.source_commit_sha,OLD.source_blob_sha,
     OLD.source_file_sha256,OLD.proposed_source_sha256,
     OLD.replacement_find,OLD.replacement_with,OLD.model_reason,
     OLD.model_output_tokens,OLD.model_completed_at)
    IS DISTINCT FROM
    (NEW.model_response_id,NEW.source_commit_sha,NEW.source_blob_sha,
     NEW.source_file_sha256,NEW.proposed_source_sha256,
     NEW.replacement_find,NEW.replacement_with,NEW.model_reason,
     NEW.model_output_tokens,NEW.model_completed_at)
 THEN RAISE EXCEPTION 'RECOVERY_IMMUTABLE_MODEL_REPAIR_EVIDENCE'; END IF;
 RETURN NEW;
END $guard$;
REVOKE ALL ON FUNCTION reality_internal.guard_same_original_recovery_attempt_v2() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_same_original_recovery_attempt_v2
BEFORE UPDATE ON reality_internal.riley_same_original_recovery_attempts_v2
FOR EACH ROW EXECUTE FUNCTION reality_internal.guard_same_original_recovery_attempt_v2();
