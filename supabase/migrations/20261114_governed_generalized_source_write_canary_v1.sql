-- One-shot SOURCE-WRITE TRANSPORT probe, never a candidate installation.
-- Source file remains byte-identical. A durable fence precedes ANY provider PUT.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_source_write_probes_v1(
 original_work_id text PRIMARY KEY REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid UNIQUE NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 target_branch text NOT NULL,
 original_source_path text NOT NULL,
 exact_source_blob_sha text NOT NULL CHECK(exact_source_blob_sha~'^[a-f0-9]{40}$'),
 expected_parent_commit_sha text NOT NULL CHECK(expected_parent_commit_sha~'^[a-f0-9]{40}$'),
 inert_probe_path text NOT NULL UNIQUE,
 intent_fenced_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 result_status text NOT NULL DEFAULT 'INTENT_FENCED_EFFECT_UNVERIFIED'
  CHECK(result_status IN ('INTENT_FENCED_EFFECT_UNVERIFIED',
    'GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED',
    'GITHUB_PROVIDER_REJECTED','GITHUB_EFFECT_UNCERTAIN')),
 github_http_status integer,
 provider_commit_sha text CHECK(provider_commit_sha IS NULL OR provider_commit_sha~'^[a-f0-9]{40}$'),
 provider_probe_blob_sha text CHECK(provider_probe_blob_sha IS NULL OR provider_probe_blob_sha~'^[a-f0-9]{40}$'),
 receipt_at timestamptz,
 CONSTRAINT genuine_probe_receipt_requires_evidence CHECK(
 result_status<>'GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'
 OR (github_http_status=201 AND provider_commit_sha IS NOT NULL
  AND provider_probe_blob_sha IS NOT NULL AND receipt_at IS NOT NULL)),
 CONSTRAINT never_claim_probe_as_installed CHECK(
 original_source_path<>inert_probe_path)
);
ALTER TABLE reality_internal.governed_original_source_write_probes_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_source_write_probes_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.governed_original_source_write_probes_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_generalized_source_write_canary_scope_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERALIZED_CANARY_SERVICE_ONLY';END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','NO_CURRENT_OWNER_AUTHORIZED_CANARY_SCOPE',
  'installation_authorized',false,'source_installed',false,'original_job_completed',false,'production_changed',false);END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE shift_id=(g->>'shift_id')::uuid AND owner_id=(g->>'owner_id')::uuid
 AND phase IN ('REVIEW_STAGED_NOT_INSTALL_READY','PREINSTALL_TRANSPORT_VERIFIED')
 AND approval_receipt_id IS NULL AND installed_commit_sha IS NULL
 AND original_final_receipt_id IS NULL
 AND isolated_github_write_verified=false;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_UNVERIFIED_SOURCE_CANARY',
  'installation_authorized',false,'source_installed',false,'original_job_completed',false,'production_changed',false);END IF;
 IF (SELECT count(*) FROM reality_internal.governed_original_install_reviews_v1
   WHERE shift_id=r.shift_id AND approval_receipt_id IS NULL AND
    phase='REVIEW_STAGED_NOT_INSTALL_READY' AND isolated_github_write_verified=false)>1
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_MULTIPLE_ORIGINALS_NEED_SELECTION';END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=r.original_work_id AND j.owner_id=r.owner_id
    AND j.shift_id=r.shift_id AND j.phase='SOURCE_ADMITTED'
    AND j.installed=false AND j.production_changed=false
    AND j.exact_approval_receipt_ref IS NULL
    AND j.original_settlement_receipt_ref IS NULL)
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_ORIGINAL_JOB_DRIFT';END IF;
 RETURN jsonb_build_object(
 'status','GENERALIZED_CANARY_EXACT_OWNER_PREAPPROVAL_SCOPE',
 'original_work_id',r.original_work_id,'owner_id',r.owner_id,
 'shift_id',r.shift_id,'attempt_id',r.attempt_id,
 'target_branch',r.exact_install_target_branch,
 'source_path',r.source_file_path,
 'expected_source_blob',r.expected_preinstall_blob_sha,
 'probe_path','evidence/reality-governed-original-canary-'||
    r.attempt_id::text||'.json',
 'installation_authorized',false,'source_installed',false,
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_generalized_source_write_canary_scope_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_generalized_source_write_canary_scope_v1() TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_generalized_source_write_canary_v1(
 p_attempt_id uuid,p_current_head_sha text,p_current_source_blob text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v jsonb;r reality_internal.governed_original_install_reviews_v1%rowtype;
a reality_internal.governed_original_source_write_probes_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERALIZED_CANARY_CLAIM_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_current_head_sha!~'^[a-f0-9]{40}$'
  OR p_current_source_blob!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_PROVIDER_IDENTITY_INVALID';END IF;
 v:=public.reality_read_generalized_source_write_canary_scope_v1();
 IF v->>'status'<>'GENERALIZED_CANARY_EXACT_OWNER_PREAPPROVAL_SCOPE'
  OR v->>'attempt_id'<>p_attempt_id::text
  OR v->>'expected_source_blob'<>p_current_source_blob
  OR v->>'installation_authorized'<>'false'
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_CURRENT_SCOPE_NOT_VERIFIED';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR r.phase<>'REVIEW_STAGED_NOT_INSTALL_READY'
  OR r.approval_receipt_id IS NOT NULL OR r.installed_commit_sha IS NOT NULL
  OR r.original_final_receipt_id IS NOT NULL
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_INSTALL_AUTHORITY_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_source_write_probes_v1(
 original_work_id,attempt_id,owner_id,shift_id,target_branch,
 original_source_path,exact_source_blob_sha,expected_parent_commit_sha,inert_probe_path)
 VALUES(r.original_work_id,r.attempt_id,r.owner_id,r.shift_id,
 r.exact_install_target_branch,r.source_file_path,
 r.expected_preinstall_blob_sha,p_current_head_sha,v->>'probe_path')
 ON CONFLICT (original_work_id) DO NOTHING RETURNING * INTO a;
 IF FOUND THEN
  -- This transaction durably fenced the ONE provider effect.
  RETURN jsonb_build_object(
   'status','GENERALIZED_CANARY_EXACT_SINGLE_WRITE_CLAIMED',
   'original_work_id',a.original_work_id,'attempt_id',a.attempt_id,
   'owner_id',a.owner_id,'shift_id',a.shift_id,
   'target_branch',a.target_branch,'source_path',a.original_source_path,
   'expected_source_blob',a.exact_source_blob_sha,
   'expected_parent_commit_sha',a.expected_parent_commit_sha,
   'probe_path',a.inert_probe_path,
   'installation_authorized',false,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
 END IF;
 SELECT * INTO a FROM reality_internal.governed_original_source_write_probes_v1
 WHERE original_work_id=r.original_work_id;
 IF NOT FOUND OR a.attempt_id<>r.attempt_id OR a.owner_id<>r.owner_id
  OR a.shift_id<>r.shift_id OR a.target_branch<>r.exact_install_target_branch
  OR a.exact_source_blob_sha<>r.expected_preinstall_blob_sha
  OR a.inert_probe_path<>v->>'probe_path'
 THEN RAISE EXCEPTION 'GENERALIZED_CANARY_EXISTING_LEASE_DRIFT';END IF;
 RETURN jsonb_build_object('status','GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT',
   'original_work_id',a.original_work_id,'shift_id',a.shift_id,
   'provider_commit_sha',a.provider_commit_sha,
   'result_status',a.result_status,
   'installation_authorized',false,'source_installed',false,
   'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_generalized_source_write_canary_v1(uuid,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_generalized_source_write_canary_v1(uuid,text,text) TO service_role;
