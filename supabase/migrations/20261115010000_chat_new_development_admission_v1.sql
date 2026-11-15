-- Chat's authenticated user-message inbox is the original source for a
-- NEW development task. No employee shift, GitHub issue or prior customer job
-- is fabricated or reused. This is admission to isolated development only.
ALTER TABLE reality_internal.chat_work_handoffs_v1
 ADD COLUMN IF NOT EXISTS development jsonb;
ALTER TABLE reality_internal.chat_work_handoffs_v1
 ADD CONSTRAINT chat_development_v1_shape
 CHECK (development IS NULL OR (jsonb_typeof(development)='object'
  AND development->>'version'='reality-chat-new-development-v1'
  AND development->>'original_work_id' ~ '^work:[a-f0-9]{32}$'
  AND development->>'phase' IN (
   'QUEUED','CLAIMED','DRAFT_GENERATED','NEEDS_SOURCE','PROVIDER_UNVERIFIED',
   'CANDIDATE_STAGED','CI_VERIFIED','CI_REJECTED')
  AND development->>'installation_authorized'='false'
  AND development->>'production_changed'='false'));

CREATE OR REPLACE FUNCTION public.reality_admit_chat_new_development_v1(
 p_owner_id uuid,p_conversation_id uuid,p_request_id uuid,
 p_message_id uuid,p_quote text,p_objective text,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r record;d jsonb;fresh jsonb;work text;hash text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'NEW_DEVELOPMENT_SERVICE_ONLY';END IF;
 IF p_owner_id IS NULL OR p_conversation_id IS NULL OR
 p_request_id IS NULL OR p_message_id IS NULL OR
 p_release_sha !~ '^[a-f0-9]{40}$' OR
 p_quote IS NULL OR length(trim(p_quote)) NOT BETWEEN 5 AND 500 OR
 p_objective IS NULL OR length(trim(p_objective)) NOT BETWEEN 8 AND 450
 THEN RAISE EXCEPTION 'NEW_DEVELOPMENT_EXACT_SIGNED_REQUEST_REQUIRED'; END IF;
 SELECT i.*,m.content AS body INTO r
 FROM reality_internal.chat_work_handoffs_v1 i
 JOIN public.reality_chat_messages m ON m.id=i.message_id
 AND m.user_id=i.owner_id AND m.conversation_id=i.conversation_id
 AND m.request_id=i.request_id AND m.role='user'
 WHERE i.message_id=p_message_id AND i.owner_id=p_owner_id
 AND i.conversation_id=p_conversation_id AND i.request_id=p_request_id
 FOR UPDATE OF i;
 IF NOT FOUND OR length(r.body) NOT BETWEEN 12 AND 6500
 OR position(p_quote in r.body)<1 OR
 r.message_sha256 IS DISTINCT FROM
 pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.body,'UTF8')),'hex')
 THEN RAISE EXCEPTION 'NEW_DEVELOPMENT_SAVED_USER_SOURCE_CHANGED'; END IF;
 IF r.development IS NOT NULL THEN
  IF r.development->>'version'<>'reality-chat-new-development-v1'
   OR r.development->>'source_sha256'<>r.message_sha256
   OR r.development->>'original_work_id' !~ '^work:[a-f0-9]{32}$'
   OR r.development->>'installation_authorized'<>'false'
  THEN RAISE EXCEPTION 'NEW_DEVELOPMENT_EXISTING_SOURCE_CONFLICT';END IF;
  d:=r.development;
 ELSE
  work:='work:'||substr(pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to('chat-new-development-v1:'||
    p_owner_id::text||':'||p_conversation_id::text||':'||
    p_message_id::text||':'||r.message_sha256,'UTF8')),'hex'),1,32);
  fresh:=pg_catalog.jsonb_build_object(
   'version','reality-chat-new-development-v1',
   'phase','QUEUED','original_work_id',work,
   'source_sha256',r.message_sha256,
   'source_ref','supabase:reality_chat_messages:'||p_message_id::text,
   'objective',trim(p_objective),'release_sha',p_release_sha,
   'created_at',clock_timestamp(),'model_generated',false,
   'independent_ci_verified',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false,
   'new_shift_started',false);
  UPDATE reality_internal.chat_work_handoffs_v1 SET development=fresh
  WHERE message_id=p_message_id AND development IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NEW_DEVELOPMENT_ATOMIC_ADMISSION_LOST';END IF;
  d:=fresh;
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_NEW_DEVELOPMENT_ADMITTED',
  'request_id',p_request_id,'message_id',p_message_id,
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'original_work_id',d->>'original_work_id',
  'development_phase',d->>'phase',
  'development_existing',r.development IS NOT NULL,
  'source_ref',d->>'source_ref',
  'execution_started',false,'model_generated',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_admit_chat_new_development_v1(
 uuid,uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_admit_chat_new_development_v1(
 uuid,uuid,uuid,uuid,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_chat_new_development_v1(
 p_owner_id uuid,p_conversation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'NEW_DEVELOPMENT_SERVICE_ONLY';END IF;
 IF p_owner_id IS NULL OR p_conversation_id IS NULL THEN
  RAISE EXCEPTION 'NEW_DEVELOPMENT_EXACT_OWNER_REQUIRED';END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'request_id',i.request_id,'message_id',i.message_id,
  'source_ref','supabase:reality_chat_messages:'||i.message_id::text,
  'original_work_id',i.development->>'original_work_id',
  'phase',i.development->>'phase',
  'objective',i.development->>'objective',
  'evidence',i.development->'evidence',
  'created_at',i.development->>'created_at',
  'model_generated',coalesce((i.development->>'model_generated')::boolean,false),
  'independent_ci_verified',coalesce((i.development->>'independent_ci_verified')::boolean,false),
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false)
  ORDER BY i.created_at DESC),'[]'::jsonb) INTO v
 FROM (SELECT * FROM reality_internal.chat_work_handoffs_v1
  WHERE owner_id=p_owner_id AND conversation_id=p_conversation_id
  AND development IS NOT NULL
  ORDER BY created_at DESC LIMIT 40) i;
 RETURN pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_NEW_DEVELOPMENT_READBACK',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'items',v,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_chat_new_development_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_chat_new_development_v1(uuid,uuid)
 TO service_role;
