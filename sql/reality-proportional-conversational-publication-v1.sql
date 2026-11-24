-- Conversation replies are not goal transitions, operational proof or execution authority.
-- Keep the existing owner/conversation lock and exact committed turn identity.
CREATE OR REPLACE FUNCTION public.reality_publish_conversational_reply_v1(
 p_user_id uuid,p_conversation_id uuid,p_request_id uuid,p_user_message_id uuid,p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE latest uuid; existing record; result_id uuid;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CHAT_CONVERSATION_SERVICE_ONLY'; END IF;
 IF p_user_id IS NULL OR p_conversation_id IS NULL OR p_request_id IS NULL OR p_user_message_id IS NULL
 OR length(btrim(coalesce(p_content,''))) NOT BETWEEN 1 AND 12000 THEN RAISE EXCEPTION 'CHAT_CONVERSATION_INPUT_INVALID';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reality-goal-pub-v1:'||p_user_id::text||':'||p_conversation_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.reality_chat_messages m WHERE m.id=p_user_message_id AND m.user_id=p_user_id
  AND m.conversation_id=p_conversation_id AND m.request_id=p_request_id AND m.role='user') THEN
  RAISE EXCEPTION 'CHAT_CONVERSATION_USER_MESSAGE_NOT_COMMITTED'; END IF;
 SELECT id,content INTO existing FROM public.reality_chat_messages m WHERE m.user_id=p_user_id
  AND m.conversation_id=p_conversation_id AND m.request_id=p_request_id AND m.role='assistant';
 IF FOUND THEN
  IF existing.content IS DISTINCT FROM p_content THEN RAISE EXCEPTION 'CHAT_ATOMIC_ASSISTANT_ALREADY_PUBLISHED';END IF;
  RETURN existing.id;
 END IF;
 SELECT request_id INTO latest FROM public.reality_chat_messages m WHERE m.user_id=p_user_id
 AND m.conversation_id=p_conversation_id AND m.role='user' ORDER BY created_at DESC,id DESC LIMIT 1;
 IF latest IS DISTINCT FROM p_request_id THEN RAISE EXCEPTION 'CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN';END IF;
 INSERT INTO public.reality_chat_messages(user_id,conversation_id,request_id,role,content)
 VALUES(p_user_id,p_conversation_id,p_request_id,'assistant',p_content) RETURNING id INTO result_id;
 RETURN result_id;
END $fn$;
REVOKE ALL ON FUNCTION public.reality_publish_conversational_reply_v1(uuid,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_publish_conversational_reply_v1(uuid,uuid,uuid,uuid,text) TO service_role;