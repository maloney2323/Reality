-- Read-only independent GitHub/Vercel integration status receipt for the
-- same source-write canary commit. This NEVER approves/installs a capability.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_preview_deploy_receipts_v1 (
 original_work_id text PRIMARY KEY
  REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid NOT NULL UNIQUE,
 shift_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 github_commit_sha text NOT NULL UNIQUE CHECK(github_commit_sha~'^[a-f0-9]{40}$'),
 github_vercel_status_id bigint NOT NULL UNIQUE CHECK(github_vercel_status_id>0),
 github_vercel_status_creator text NOT NULL CHECK(
  github_vercel_status_creator IN ('vercel[bot]','vercel')),
 vercel_deployment_url text NOT NULL UNIQUE
  CHECK(vercel_deployment_url~'^https://vercel[.]com/[a-zA-Z0-9_-]+/reality/[a-zA-Z0-9_-]{10,100}$'),
 evidence_kind text NOT NULL DEFAULT 'GITHUB_INDEPENDENT_VERCEL_BOT_SUCCESS_FOR_EXACT_CANARY_SHA'
  CHECK(evidence_kind='GITHUB_INDEPENDENT_VERCEL_BOT_SUCCESS_FOR_EXACT_CANARY_SHA'),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_preview_deploy_receipts_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_preview_deploy_receipts_v1
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_generalized_original_auto_deploy_scope_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.governed_original_install_reviews_v1%rowtype;
c reality_internal.governed_original_source_write_probes_v1%rowtype;
g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_PROBE_SERVICE_ONLY';END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'installation_authorized'<>'false' OR g->>'production_changed'<>'false'
 THEN RETURN jsonb_build_object('status','GENERALIZED_DEPLOY_NO_ACTIVE_OWNER_SHIFT',
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE shift_id=(g->>'shift_id')::uuid AND owner_id=(g->>'owner_id')::uuid
  AND phase='REVIEW_STAGED_NOT_INSTALL_READY'
  AND isolated_github_write_verified=true
  AND preview_auto_deploy_verified=false
  AND approval_receipt_id IS NULL
  AND installed_commit_sha IS NULL
  AND original_final_receipt_id IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_ORIGINAL_DEPLOYMENT_RECEIPT_NEEDED',
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 SELECT * INTO c FROM reality_internal.governed_original_source_write_probes_v1
 WHERE original_work_id=r.original_work_id
  AND attempt_id=r.attempt_id AND owner_id=r.owner_id AND shift_id=r.shift_id
  AND target_branch=r.exact_install_target_branch
  AND original_source_path=r.source_file_path
  AND exact_source_blob_sha=r.expected_preinstall_blob_sha
  AND result_status='GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'
  AND github_http_status=201 AND provider_commit_sha~'^[a-f0-9]{40}$';
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_INDEPENDENT_SOURCE_WRITE_RECEIPT_MISSING';END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=r.original_work_id AND j.owner_id=r.owner_id
  AND j.shift_id=r.shift_id AND j.phase='SOURCE_ADMITTED'
  AND j.installed=false AND j.production_changed=false
  AND j.exact_approval_receipt_ref IS NULL
  AND j.original_settlement_receipt_ref IS NULL)
 THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_ORIGINAL_EXECUTION_DRIFT';END IF;
 RETURN jsonb_build_object(
  'status','EXACT_PREAPPROVAL_ORIGINAL_VERCEL_STATUS_ELIGIBLE',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'owner_id',r.owner_id,'attempt_id',r.attempt_id,
  'target_branch',r.exact_install_target_branch,
  'original_source_path',r.source_file_path,
  'unchanged_source_blob_sha',r.expected_preinstall_blob_sha,
  'inert_probe_path',c.inert_probe_path,
  'inert_probe_blob_sha',c.provider_probe_blob_sha,
  'canary_commit_sha',c.provider_commit_sha,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_generalized_original_auto_deploy_scope_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_generalized_original_auto_deploy_scope_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_generalized_original_auto_deploy_receipt_v1(
 p_attempt_id uuid,p_canary_commit_sha text,p_github_vercel_status_id bigint,
 p_github_vercel_creator text,p_vercel_deployment_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb;r reality_internal.governed_original_install_reviews_v1%rowtype;
c reality_internal.governed_original_source_write_probes_v1%rowtype;
v reality_internal.governed_original_preview_deploy_receipts_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_canary_commit_sha!~'^[a-f0-9]{40}$'
  OR p_github_vercel_status_id IS NULL OR p_github_vercel_status_id<=0
  OR p_github_vercel_creator NOT IN ('vercel[bot]','vercel')
  OR coalesce(p_vercel_deployment_url,'')!~
    '^https://vercel[.]com/[a-zA-Z0-9_-]+/reality/[a-zA-Z0-9_-]{10,100}$'
 THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_TRUSTED_PROVIDER_STATUS_REQUIRED';END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR r.shift_id::text<>g->>'shift_id' OR r.owner_id::text<>g->>'owner_id'
  OR g->>'installation_authorized'<>'false'
  OR g->>'production_changed'<>'false'
  OR r.phase<>'REVIEW_STAGED_NOT_INSTALL_READY'
  OR r.isolated_github_write_verified<>true
  OR r.approval_receipt_id IS NOT NULL
  OR r.installed_commit_sha IS NOT NULL
  OR r.original_final_receipt_id IS NOT NULL
 THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_SAME_ORIGINAL_OWNER_DRIFT';END IF;
 SELECT * INTO c FROM reality_internal.governed_original_source_write_probes_v1
 WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id
  AND provider_commit_sha=p_canary_commit_sha
  AND result_status='GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'
  AND github_http_status=201;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_NO_VERIFIED_GIT_CANARY_COMMIT';END IF;
 INSERT INTO reality_internal.governed_original_preview_deploy_receipts_v1(
 original_work_id,attempt_id,shift_id,owner_id,github_commit_sha,
 github_vercel_status_id,github_vercel_status_creator,vercel_deployment_url)
 VALUES(r.original_work_id,r.attempt_id,r.shift_id,r.owner_id,
  p_canary_commit_sha,p_github_vercel_status_id,p_github_vercel_creator,
  p_vercel_deployment_url)
 ON CONFLICT (original_work_id) DO NOTHING;
 SELECT * INTO v FROM reality_internal.governed_original_preview_deploy_receipts_v1
 WHERE original_work_id=r.original_work_id;
 IF NOT FOUND OR v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR
  v.owner_id<>r.owner_id OR v.github_commit_sha<>p_canary_commit_sha OR
  v.github_vercel_status_id<>p_github_vercel_status_id OR
  v.github_vercel_status_creator<>p_github_vercel_creator OR
  v.vercel_deployment_url<>p_vercel_deployment_url
 THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_DIFFERENT_VERDICT_REPLAY_DENIED';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET preview_auto_deploy_verified=true,updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id
  AND phase='REVIEW_STAGED_NOT_INSTALL_READY'
  AND approval_receipt_id IS NULL AND installed_commit_sha IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_DEPLOY_CONSISTENT_OWNER_RECEIPT_MISSING';END IF;
 RETURN jsonb_build_object(
  'status','GENERALIZED_PREVIEW_AUTO_DEPLOY_GITHUB_VERCEL_STATUS_VERIFIED',
  'original_work_id',r.original_work_id,'shift_id',r.shift_id,
  'attempt_id',r.attempt_id,'canary_commit_sha',p_canary_commit_sha,
  'vercel_deployment_url',p_vercel_deployment_url,
  'github_vercel_status_id',p_github_vercel_status_id,
  'preview_auto_deploy_verified',true,
  'isolated_github_write_verified',true,
  'same_original_execution_and_settlement_contract_verified',false,
  'owner_approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_generalized_original_auto_deploy_receipt_v1(
 uuid,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_generalized_original_auto_deploy_receipt_v1(
 uuid,text,bigint,text,text) TO service_role;
