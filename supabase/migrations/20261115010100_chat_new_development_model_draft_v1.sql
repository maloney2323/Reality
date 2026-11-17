-- Reuse the signed Chat inbox and the EXISTING completion-bound worker.
-- New development is an isolated code-draft task, never a second shift.
CREATE OR REPLACE FUNCTION public.reality_claim_chat_new_development_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;claim uuid;expires timestamptz;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 SELECT w.message_id,w.owner_id,w.conversation_id,w.request_id,
 w.message_sha256,w.development,m.content AS original_instruction
 INTO i FROM reality_internal.chat_work_handoffs_v1 w
 JOIN public.reality_chat_messages m ON m.id=w.message_id
  AND m.user_id=w.owner_id AND m.conversation_id=w.conversation_id
  AND m.request_id=w.request_id AND m.role='user'
 WHERE w.development->>'phase'='QUEUED'
  AND w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
  AND w.development->>'source_sha256'=w.message_sha256
  AND w.development->>'installation_authorized'='false'
  AND w.development->>'production_changed'='false'
 ORDER BY w.created_at,w.message_id LIMIT 1
 FOR UPDATE OF w SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_PENDING_SIGNED_NEW_DEVELOPMENT');END IF;
 claim:=pg_catalog.gen_random_uuid();expires:=clock_timestamp()+interval '3 minutes';
 UPDATE reality_internal.chat_work_handoffs_v1
 SET development=development||pg_catalog.jsonb_build_object(
  'phase','CLAIMED','claim_id',claim,'claimed_at',clock_timestamp(),
  'claim_expires_at',expires)
 WHERE message_id=i.message_id AND development->>'phase'='QUEUED';
 IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_DEV_CLAIM_ATOMIC_RACE';END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_NEW_DEVELOPMENT_SOURCE_LEASED',
  'message_id',i.message_id,'request_id',i.request_id,
  'owner_id',i.owner_id,'conversation_id',i.conversation_id,
  'claim_id',claim,'claim_expires_at',expires,
  'message_sha256',i.message_sha256,
  'original_work_id',i.development->>'original_work_id',
  'objective',i.development->>'objective',
  'original_instruction',i.original_instruction,
  'source_ref',i.development->>'source_ref',
  'release_sha',i.development->>'release_sha',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_chat_new_development_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_chat_new_development_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_chat_new_development_draft_v1(
 p_message_id uuid,p_claim_id uuid,p_original_work_id text,
 p_base_sha text,p_target_path text,p_source_blob_sha text,
 p_find text,p_replace text,p_reason text,p_model_response_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;e jsonb;candidate jsonb;digest text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 IF p_message_id IS NULL OR p_claim_id IS NULL OR
  p_original_work_id !~ '^work:[a-f0-9]{32}$' OR
  p_base_sha !~ '^[a-f0-9]{40}$' OR
  p_source_blob_sha !~ '^[a-f0-9]{40}$' OR
  p_target_path !~ '^(src/[a-zA-Z0-9_./-]+[.]js|api/reality/[a-zA-Z0-9_./-]+[.]js|reality-[a-zA-Z0-9_.-]+[.](js|css)|index[.]html)$'
  OR p_target_path LIKE '%..%' OR p_target_path LIKE '%//%'
  OR length(p_find) NOT BETWEEN 20 AND 12000 OR
  length(p_replace) NOT BETWEEN 20 AND 16000 OR
  p_find=p_replace OR length(p_reason) NOT BETWEEN 10 AND 1800 OR
  p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 THEN RAISE EXCEPTION 'CHAT_DEV_TYPED_BOUNDED_CODE_DRAFT_REQUIRED';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE message_id=p_message_id FOR UPDATE;
 IF NOT FOUND OR i.development->>'phase'<>'CLAIMED' OR
  i.development->>'claim_id'<>p_claim_id::text OR
  (i.development->>'claim_expires_at')::timestamptz<clock_timestamp()
  OR i.development->>'original_work_id'<>p_original_work_id OR
  i.development->>'release_sha'<>p_base_sha OR
  i.development->>'source_sha256'<>i.message_sha256
 THEN RAISE EXCEPTION 'CHAT_DEV_CURRENT_SOURCE_CLAIM_DRIFT';END IF;
 candidate:=pg_catalog.jsonb_build_object(
  'target_path',p_target_path,'source_blob_sha',p_source_blob_sha,
  'find',p_find,'replace',p_replace,'reason',p_reason,
  'base_sha',p_base_sha);
 digest:=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(candidate::text,'UTF8')),'hex');
 e:=pg_catalog.jsonb_build_object(
  'provider_model_response_id',p_model_response_id,
  'candidate_sha256','sha256:'||digest,
  'base_sha',p_base_sha,'target_path',p_target_path,
  'source_blob_sha',p_source_blob_sha,
  'result','MODEL_CANDIDATE_UNTESTED_NO_INSTALLATION',
  'generated_at',clock_timestamp());
 UPDATE reality_internal.chat_work_handoffs_v1 SET
  development=(development-'claim_expires_at')||
   pg_catalog.jsonb_build_object('phase','DRAFT_GENERATED',
    'model_generated',true,'independent_ci_verified',false,
    'candidate',candidate,'evidence',e)
 WHERE message_id=p_message_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_NEW_DEVELOPMENT_MODEL_DRAFT_RECORDED',
  'original_work_id',p_original_work_id,
  'message_id',p_message_id,'candidate_sha256','sha256:'||digest,
  'source_path',p_target_path,'model_generated',true,
  'independent_ci_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_chat_new_development_draft_v1(
 uuid,uuid,text,text,text,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_chat_new_development_draft_v1(
 uuid,uuid,text,text,text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_mark_chat_new_development_unverified_v1(
 p_message_id uuid,p_claim_id uuid,p_reason text,p_phase text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 IF p_phase NOT IN ('NEEDS_SOURCE','PROVIDER_UNVERIFIED') OR
  p_reason !~ '^[A-Z][A-Z0-9_]{3,130}$'
 THEN RAISE EXCEPTION 'CHAT_DEV_FAILURE_CODE_REQUIRED';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE message_id=p_message_id FOR UPDATE;
 IF NOT FOUND OR i.development->>'phase'<>'CLAIMED' OR
  i.development->>'claim_id'<>p_claim_id::text THEN
  RAISE EXCEPTION 'CHAT_DEV_CURRENT_CLAIM_REQUIRED';END IF;
 UPDATE reality_internal.chat_work_handoffs_v1
 SET development=development||pg_catalog.jsonb_build_object(
  'phase',p_phase,'failure_code',p_reason,'failed_at',clock_timestamp())
 WHERE message_id=p_message_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_NEW_DEVELOPMENT_UNVERIFIED',
  'original_work_id',i.development->>'original_work_id',
  'phase',p_phase,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_mark_chat_new_development_unverified_v1(
 uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_mark_chat_new_development_unverified_v1(
 uuid,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_next_chat_new_development_draft_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE i record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';END IF;
 SELECT * INTO i FROM reality_internal.chat_work_handoffs_v1
 WHERE development->>'phase'='DRAFT_GENERATED'
 ORDER BY created_at,message_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_STAGED_CHAT_DEVELOPMENT_CANDIDATE');END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_NEW_DEVELOPMENT_DRAFT_READY_FOR_INDEPENDENT_CI',
  'message_id',i.message_id,'owner_id',i.owner_id,
  'conversation_id',i.conversation_id,
  'request_id',i.request_id,'message_sha256',i.message_sha256,
  'original_work_id',i.development->>'original_work_id',
  'candidate',i.development->'candidate',
  'evidence',i.development->'evidence',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_next_chat_new_development_draft_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_next_chat_new_development_draft_v1()
 TO service_role;
