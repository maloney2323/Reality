-- Protected source-proposal publisher. Generated code is stored as an
-- INERT JSON artifact in an isolated GitHub PR, never loaded by Vercel or
-- installed into executable source merely because the model wrote it.
ALTER TABLE reality_internal.chat_work_handoffs_v1
 DROP CONSTRAINT IF EXISTS chat_development_v1_shape;
ALTER TABLE reality_internal.chat_work_handoffs_v1
 ADD CONSTRAINT chat_development_v1_shape CHECK (
 development IS NULL OR (pg_catalog.jsonb_typeof(development)='object'
  AND development->>'version'='reality-chat-new-development-v1'
  AND development->>'original_work_id' ~ '^work:[a-f0-9]{32}$'
  AND development->>'phase' IN (
   'QUEUED','CLAIMED','DRAFT_GENERATED','NEEDS_SOURCE','PROVIDER_UNVERIFIED',
   'PUBLISH_FENCED','CANDIDATE_STAGED','CI_VERIFIED','CI_REJECTED')
  AND development->>'installation_authorized'='false'
  AND development->>'production_changed'='false'));

CREATE OR REPLACE FUNCTION public.reality_read_next_chat_new_development_candidate_v2()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE development->>'phase' IN ('DRAFT_GENERATED','PUBLISH_FENCED','CANDIDATE_STAGED')
 ORDER BY created_at,message_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_CHAT_NEW_DEVELOPMENT_CANDIDATE');END IF;
 IF i.development->>'source_sha256' IS DISTINCT FROM i.message_sha256 OR
   i.development->>'original_work_id' !~ '^work:[a-f0-9]{32}$' OR
   i.development->>'installation_authorized'<>'false' OR
   i.development->>'production_changed'<>'false' THEN
  RAISE EXCEPTION 'CHAT_DEV_STALE_OR_UNSCOPED_SOURCE';END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_SIGNED_CHAT_NEW_DEVELOPMENT_CANDIDATE',
  'message_id',i.message_id,'request_id',i.request_id,
  'owner_id',i.owner_id,'conversation_id',i.conversation_id,
  'source_sha256',i.message_sha256,'original_work_id',i.development->>'original_work_id',
  'phase',i.development->>'phase',
  'candidate',i.development->'candidate',
  'evidence',i.development->'evidence',
  'release_sha',i.development->>'release_sha',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_next_chat_new_development_candidate_v2()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_next_chat_new_development_candidate_v2()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_fence_chat_new_development_publish_v1(
 p_message_id uuid,p_candidate_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 IF p_message_id IS NULL OR p_candidate_sha256 !~ '^sha256:[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'CHAT_DEV_EXACT_CANDIDATE_REQUIRED';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE message_id=p_message_id FOR UPDATE;
 IF NOT FOUND OR i.development->>'phase'<>'DRAFT_GENERATED' OR
  i.development->'evidence'->>'candidate_sha256'<>p_candidate_sha256 OR
  i.development->>'source_sha256'<>i.message_sha256 OR
  i.development->'candidate'->>'base_sha'<>i.development->>'release_sha' OR
  i.development->>'installation_authorized'<>'false' THEN
  RAISE EXCEPTION 'CHAT_DEV_ONE_USE_PUBLISH_FENCE_DRIFT';END IF;
 UPDATE reality_internal.chat_work_handoffs_v1 SET
  development=development||pg_catalog.jsonb_build_object(
   'phase','PUBLISH_FENCED','publish_fenced_at',clock_timestamp())
 WHERE message_id=p_message_id AND development->>'phase'='DRAFT_GENERATED';
 IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_DEV_FENCE_ATOMIC_LOST';END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_CHAT_DEVELOPMENT_PUBLISH_FENCED',
  'message_id',p_message_id,
  'original_work_id',i.development->>'original_work_id',
  'candidate_sha256',p_candidate_sha256,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_fence_chat_new_development_publish_v1(uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_fence_chat_new_development_publish_v1(uuid,text)
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_chat_new_development_candidate_v1(
 p_message_id uuid,p_original_work_id text,p_commit_sha text,
 p_branch text,p_pr_number bigint,p_artifact_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 IF p_message_id IS NULL OR p_original_work_id !~ '^work:[a-f0-9]{32}$'
 OR p_commit_sha !~ '^[a-f0-9]{40}$'
 OR p_artifact_blob_sha !~ '^[a-f0-9]{40}$'
 OR p_branch<>'reality/chat-development/'||p_message_id::text
 OR p_pr_number<=0 THEN RAISE EXCEPTION 'CHAT_DEV_PROVIDER_ATTESTATION_SHAPE_INVALID';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE message_id=p_message_id FOR UPDATE;
 IF NOT FOUND OR i.development->>'phase'<>'PUBLISH_FENCED' OR
 i.development->>'original_work_id'<>p_original_work_id OR
 i.development->'candidate'->>'base_sha'<>i.development->>'release_sha' OR
 i.development->>'installation_authorized'<>'false' OR
 i.development->>'production_changed'<>'false' THEN
 RAISE EXCEPTION 'CHAT_DEV_FENCED_PROVIDER_ORIGINAL_DRIFT';END IF;
 UPDATE reality_internal.chat_work_handoffs_v1
 SET development=(development-'candidate')||
  pg_catalog.jsonb_build_object('phase','CANDIDATE_STAGED',
   'evidence',(development->'evidence')||pg_catalog.jsonb_build_object(
    'artifact_branch',p_branch,
    'artifact_blob_sha',p_artifact_blob_sha,
    'artifact_commit_sha',p_commit_sha,
    'pull_request_number',p_pr_number,
    'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number::text,
    'provider_verified',true,
    'feature_acceptance_verified',false,
    'candidate_staged_at',clock_timestamp()))
 WHERE message_id=p_message_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','NEW_CHAT_DEVELOPMENT_PROVIDER_CANDIDATE_STAGED',
  'original_work_id',p_original_work_id,
  'message_id',p_message_id,'artifact_commit_sha',p_commit_sha,
  'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number::text,
  'model_generated',true,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_chat_new_development_candidate_v1(
 uuid,text,text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_chat_new_development_candidate_v1(
 uuid,text,text,text,bigint,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_chat_new_development_ci_v1(
 p_message_id uuid,p_commit_sha text,p_run_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 IF p_message_id IS NULL OR p_commit_sha !~ '^[a-f0-9]{40}$'
 OR p_run_id<10000 THEN
 RAISE EXCEPTION 'CHAT_DEV_INDEPENDENT_CI_PROVIDER_IDENTITY_REQUIRED';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE message_id=p_message_id FOR UPDATE;
 IF NOT FOUND OR i.development->>'phase'<>'CANDIDATE_STAGED' OR
 i.development->'evidence'->>'artifact_commit_sha'<>p_commit_sha OR
 i.development->'evidence'->>'feature_acceptance_verified'<>'false' OR
 i.development->>'installation_authorized'<>'false' OR
 i.development->>'production_changed'<>'false' THEN
 RAISE EXCEPTION 'CHAT_DEV_ORIGINAL_CANDIDATE_CI_DRIFT';END IF;
 UPDATE reality_internal.chat_work_handoffs_v1 SET development=
  development||pg_catalog.jsonb_build_object(
   'phase','CI_VERIFIED','independent_ci_verified',true,
   'evidence',(development->'evidence')||
    pg_catalog.jsonb_build_object(
     'independent_ci_run_id',p_run_id,
     'ci_url','https://github.com/maloney2323/Reality/actions/runs/'||p_run_id::text,
     'ci_scope','SYNTAX_AND_SOURCE_IDENTITY_ONLY',
     'feature_acceptance_verified',false,
     'ci_verification_at',clock_timestamp()))
 WHERE message_id=p_message_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','CHAT_DEVELOPMENT_INDEPENDENT_SOURCE_SYNTAX_CI_VERIFIED',
  'original_work_id',i.development->>'original_work_id',
  'artifact_commit_sha',p_commit_sha,'ci_run_id',p_run_id,
  'ci_scope','SYNTAX_AND_SOURCE_IDENTITY_ONLY',
  'feature_acceptance_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_chat_new_development_ci_v1(
 uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_chat_new_development_ci_v1(
 uuid,text,bigint) TO service_role;
