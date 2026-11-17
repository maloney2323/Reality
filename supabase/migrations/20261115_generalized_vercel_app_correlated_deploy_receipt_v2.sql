-- Independent GitHub trust bridge: official Vercel App check and Vercel
-- deployment-success status on the SAME immutable source-write canary commit.
-- Neither the check nor a green test alone qualifies. No source install,
-- approval, settlement, or production effect is authorized by this proof.
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ADD COLUMN IF NOT EXISTS official_vercel_app_check_run_id bigint UNIQUE
  CHECK(official_vercel_app_check_run_id IS NULL OR official_vercel_app_check_run_id>0),
 ADD COLUMN IF NOT EXISTS official_vercel_app_id bigint
  CHECK(official_vercel_app_id IS NULL OR official_vercel_app_id>0);
DO $migration$
DECLARE cname name;
BEGIN
 IF EXISTS(SELECT 1 FROM reality_internal.governed_original_preview_deploy_receipts_v1)
 THEN RAISE EXCEPTION 'VERCEL_APP_DEPLOY_SCHEMA_CONFLICT_EXISTING_PROOFS_REQUIRE_RECONCILIATION';END IF;
 SELECT c.conname INTO cname FROM pg_catalog.pg_constraint c
 WHERE c.conrelid='reality_internal.governed_original_preview_deploy_receipts_v1'::pg_catalog.regclass
 AND c.contype='c' AND pg_catalog.pg_get_constraintdef(c.oid)
 LIKE '%github_vercel_status_creator%';
 IF cname IS NULL THEN RAISE EXCEPTION 'VERCEL_APP_OLD_CREATOR_SCOPE_UNKNOWN';END IF;
 EXECUTE pg_catalog.format('ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1 DROP CONSTRAINT %I',cname);
END $migration$;
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ADD CONSTRAINT generalized_exact_vercel_official_actor_v2 CHECK(
 github_vercel_status_creator IN ('vercel[bot]','vercel','vercel-app:vercel')
 AND (github_vercel_status_creator<>'vercel-app:vercel'
      OR (official_vercel_app_check_run_id IS NOT NULL AND official_vercel_app_id IS NOT NULL))
);
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 DROP CONSTRAINT IF EXISTS generalized_original_preview_vercel_actor_evidence_v2;
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ALTER COLUMN evidence_kind SET DEFAULT 'GITHUB_VERIFIED_VERCEL_APP_AND_STATUS_SUCCESS_EXACT_CANARY_SHA';
ALTER TABLE reality_internal.governed_original_preview_deploy_receipts_v1
 ADD CONSTRAINT generalized_vercel_correlated_deploy_evidence_kind_v2
 CHECK(evidence_kind='GITHUB_VERIFIED_VERCEL_APP_AND_STATUS_SUCCESS_EXACT_CANARY_SHA');

CREATE OR REPLACE FUNCTION public.reality_record_generalized_original_auto_deploy_app_receipt_v2(
 p_attempt_id uuid,p_canary_commit_sha text,p_github_vercel_status_id bigint,
 p_vercel_app_check_run_id bigint,p_vercel_app_id bigint,p_vercel_deployment_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE g jsonb;r reality_internal.governed_original_install_reviews_v1%rowtype;
 c reality_internal.governed_original_source_write_probes_v1%rowtype;
 v reality_internal.governed_original_preview_deploy_receipts_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_RECEIPT_SERVICE_ONLY';END IF;
 IF p_attempt_id IS NULL OR p_canary_commit_sha!~'^[a-f0-9]{40}$'
  OR p_github_vercel_status_id IS NULL OR p_github_vercel_status_id<=0
  OR p_vercel_app_check_run_id IS NULL OR p_vercel_app_check_run_id<=0
  OR p_vercel_app_id IS NULL OR p_vercel_app_id<=0
  OR coalesce(p_vercel_deployment_url,'')!~
    '^https://vercel[.]com/[a-zA-Z0-9_-]+/reality/[a-zA-Z0-9_-]{10,100}$'
 THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_EXACT_PROVIDER_EVIDENCE_REQUIRED';END IF;
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
 THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_ORIGINAL_JOB_SCOPE_DRIFT';END IF;
 SELECT * INTO c FROM reality_internal.governed_original_source_write_probes_v1
 WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id
  AND provider_commit_sha=p_canary_commit_sha
  AND result_status='GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'
  AND github_http_status=201
  AND exact_source_blob_sha=r.expected_preinstall_blob_sha
  AND target_branch=r.exact_install_target_branch;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_CANARY_SHA_AND_ORIGINAL_SOURCE_NOT_VERIFIED';END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.riley_unattended_repair_originals_v1 j
  WHERE j.original_work_id=r.original_work_id AND j.owner_id=r.owner_id
  AND j.shift_id=r.shift_id AND j.phase='SOURCE_ADMITTED'
  AND j.installed=false AND j.production_changed=false
  AND j.exact_approval_receipt_ref IS NULL AND j.original_settlement_receipt_ref IS NULL)
 THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_ORIGINAL_UNSETTLED_SCOPE_DRIFT';END IF;
 INSERT INTO reality_internal.governed_original_preview_deploy_receipts_v1(
 original_work_id,attempt_id,shift_id,owner_id,github_commit_sha,
 github_vercel_status_id,github_vercel_status_creator,vercel_deployment_url,
 official_vercel_app_check_run_id,official_vercel_app_id)
 VALUES(r.original_work_id,r.attempt_id,r.shift_id,r.owner_id,p_canary_commit_sha,
 p_github_vercel_status_id,'vercel-app:vercel',p_vercel_deployment_url,
 p_vercel_app_check_run_id,p_vercel_app_id)
 ON CONFLICT(original_work_id) DO NOTHING;
 SELECT * INTO v FROM reality_internal.governed_original_preview_deploy_receipts_v1
 WHERE original_work_id=r.original_work_id;
 IF NOT FOUND OR v.attempt_id<>r.attempt_id OR v.shift_id<>r.shift_id OR
  v.owner_id<>r.owner_id OR v.github_commit_sha<>p_canary_commit_sha OR
  v.github_vercel_status_id<>p_github_vercel_status_id OR
  v.github_vercel_status_creator<>'vercel-app:vercel' OR
  v.vercel_deployment_url<>p_vercel_deployment_url OR
  v.official_vercel_app_check_run_id<>p_vercel_app_check_run_id OR
  v.official_vercel_app_id<>p_vercel_app_id
 THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_PROVIDER_REPLAY_CONFLICT';END IF;
 UPDATE reality_internal.governed_original_install_reviews_v1
 SET preview_auto_deploy_verified=true,updated_at=clock_timestamp()
 WHERE original_work_id=r.original_work_id
  AND phase='REVIEW_STAGED_NOT_INSTALL_READY'
  AND approval_receipt_id IS NULL AND installed_commit_sha IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GENERALIZED_VERCEL_APP_OWNER_READBACK_MISSING';END IF;
 RETURN jsonb_build_object(
  'status','GENERALIZED_VERCEL_APP_CORRELATED_EXACT_DEPLOY_STATUS_VERIFIED',
  'attempt_id',r.attempt_id,'original_work_id',r.original_work_id,
  'shift_id',r.shift_id,'canary_commit_sha',p_canary_commit_sha,
  'github_vercel_status_id',p_github_vercel_status_id,
  'official_vercel_app_check_run_id',p_vercel_app_check_run_id,
  'official_vercel_app_id',p_vercel_app_id,
  'vercel_deployment_url',p_vercel_deployment_url,
  'preview_auto_deploy_verified',true,
  'isolated_github_write_verified',true,
  'same_original_execution_and_settlement_contract_verified',false,
  'owner_approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_generalized_original_auto_deploy_app_receipt_v2(
 uuid,text,bigint,bigint,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_generalized_original_auto_deploy_app_receipt_v2(
 uuid,text,bigint,bigint,bigint,text) TO service_role;
