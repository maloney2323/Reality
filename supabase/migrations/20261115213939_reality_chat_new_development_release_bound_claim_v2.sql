-- Migration version from Supabase hosted project migration history: 20261115213939
-- Existing worker stays read-only for new Chat development. Exact preview
-- release-scoped worker claims queued signed human instructions atomically.
-- No client privilege, code execution, installation or production change.

CREATE OR REPLACE FUNCTION public.reality_claim_chat_new_development_release_v2(p_release_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE i record;claim uuid;expires timestamptz;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';
 END IF;
 IF p_release_sha !~ '^[a-f0-9]{40}$' THEN
  RAISE EXCEPTION 'CHAT_DEV_EXACT_RELEASE_REQUIRED';
 END IF;
 SELECT w.message_id,w.owner_id,w.conversation_id,w.request_id,
  w.message_sha256,w.development,m.content AS original_instruction
 INTO i FROM reality_internal.chat_work_handoffs_v1 w
 JOIN public.reality_chat_messages m ON m.id=w.message_id
  AND m.user_id=w.owner_id AND m.conversation_id=w.conversation_id
  AND m.request_id=w.request_id AND m.role='user'
 WHERE w.development->>'phase'='QUEUED'
  AND w.development->>'release_sha'=p_release_sha
  AND w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(m.content,'UTF8')),'hex')
  AND w.development->>'source_sha256'=w.message_sha256
  AND w.development->>'installation_authorized'='false'
  AND w.development->>'production_changed'='false'
 ORDER BY w.created_at,w.message_id LIMIT 1
 FOR UPDATE OF w SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_PENDING_SIGNED_NEW_DEVELOPMENT'); END IF;
 claim:=pg_catalog.gen_random_uuid();
 expires:=clock_timestamp()+interval '3 minutes';
 UPDATE reality_internal.chat_work_handoffs_v1
 SET development=development||pg_catalog.jsonb_build_object(
  'phase','CLAIMED','claim_id',claim,'claimed_at',clock_timestamp(),
  'claim_expires_at',expires)
 WHERE message_id=i.message_id AND development->>'phase'='QUEUED'
  AND development->>'release_sha'=p_release_sha;
 IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_DEV_CLAIM_ATOMIC_RACE'; END IF;
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
END $function$;

CREATE OR REPLACE FUNCTION public.reality_claim_chat_new_development_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'CHAT_DEV_SERVICE_ONLY';
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','NO_PENDING_SIGNED_NEW_DEVELOPMENT');
END $function$;

REVOKE ALL ON FUNCTION public.reality_claim_chat_new_development_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_chat_new_development_v1()
 TO service_role;
REVOKE ALL ON FUNCTION public.reality_claim_chat_new_development_release_v2(text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_chat_new_development_release_v2(text)
 TO service_role;
