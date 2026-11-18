-- v23 · Reality's owner-scoped, proactively SENT first Chat message.
-- Only a brand-new owner with no prior saved Chat OR signed shifts receives
-- the welcome. Returning customers remain on their existing conversation.
-- Atomic + single-use across browsers, conversations and concurrent requests.
create table if not exists reality_internal.owner_first_chat_contact_v1(
 owner_id uuid primary key references auth.users(id) on delete cascade,
 conversation_id uuid not null,
 request_id uuid not null,
 message_id uuid not null unique references public.reality_chat_messages(id)
  on delete cascade,
 contact_kind text not null check(contact_kind in(
  'NEW_BUSINESS_WELCOME','NEW_BUSINESS_CONTINUE_CONNECTION_SETUP',
  'NEW_BUSINESS_CONNECTION_VERIFIED_FIRST_WORK')),
 first_sent_at timestamptz not null default clock_timestamp(),
 source_kind text not null default 'REAL_OWNER_ACCOUNT_AND_CHAT_LEDGERS'
  check(source_kind='REAL_OWNER_ACCOUNT_AND_CHAT_LEDGERS'),
 no_execution_authorized boolean not null default true
  check(no_execution_authorized=true),
 no_provider_connection_claimed boolean not null default true
  check(no_provider_connection_claimed=true)
);
alter table reality_internal.owner_first_chat_contact_v1 enable row level security;
revoke all on reality_internal.owner_first_chat_contact_v1 from public,anon,authenticated;
grant select,insert on reality_internal.owner_first_chat_contact_v1 to service_role;

create or replace function public.reality_send_owner_first_business_chat_v1(
 p_owner_id uuid,p_conversation_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_prev record; v_request uuid;v_message_id uuid;
 v_kind text;v_text text;v_setup_count integer;v_verified_count integer;
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_conversation_id is null then
  raise exception 'FIRST_CHAT_AUTHENTICATED_OWNER_SERVICE_REQUIRED';end if;
 -- Multi-tab first contact serializes by OWNER, not by caller conversation.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality:owner:first-chat:'||p_owner_id::text,0));
 select owner_id,conversation_id,request_id,message_id,contact_kind
  into v_prev from reality_internal.owner_first_chat_contact_v1
  where owner_id=p_owner_id;
 if found then
  return jsonb_build_object(
   'status','OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE',
   'owner_id',p_owner_id,'conversation_id',v_prev.conversation_id,
   'contact_kind',v_prev.contact_kind,'message_id',v_prev.message_id,
   'created',false,'new_customer_welcome_sent',false,
   'external_actions_authorized',false,'provider_connected_by_read',false,
   'work_shift_authorized',false,'production_changed',false);
 end if;
 if not exists(select 1 from auth.users where id=p_owner_id)
 then raise exception 'FIRST_CHAT_AUTH_USER_NOT_VERIFIED';end if;
 -- Do NOT greet an established user as a new signup, including when they
 -- selected New Chat or already have a prior shift/work history.
 if exists(select 1 from public.reality_chat_messages where user_id=p_owner_id)
  or exists(select 1 from reality_internal.governed_employee_shifts_v1
      where owner_id=p_owner_id)
  or exists(select 1 from reality_internal.owner_internal_maintenance_jobs_v1
      where owner_id=p_owner_id)
 then
  return jsonb_build_object(
   'status','OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK',
   'owner_id',p_owner_id,'created',false,'new_customer_welcome_sent',false,
   'existing_history_preserved',true,
   'external_actions_authorized',false,'provider_connected_by_read',false,
   'work_shift_authorized',false,'production_changed',false);
 end if;
 select count(*),
  count(*) filter(where provider_access_verified=true and
   credential_saved=true and oauth_consent_granted=true)
 into v_setup_count,v_verified_count
 from reality_internal.owner_connector_setup_requests_v1
 where owner_id=p_owner_id;
 if v_verified_count>0 then
  v_kind:='NEW_BUSINESS_CONNECTION_VERIFIED_FIRST_WORK';
  v_text:='Welcome to Reality. I can help you discover useful work from the systems you have already connected. I will confirm current access and what it permits before relying on it.\n\nLet us start with your business: what do you do, and which recurring task takes up the most time? I will help you identify a first low-risk opportunity, show the evidence and ask only for permissions genuinely needed.';
 elsif v_setup_count>0 then
  v_kind:='NEW_BUSINESS_CONTINUE_CONNECTION_SETUP';
  v_text:='Welcome to Reality. I can see that you started setting up a business connection. A setup request does not mean the service is connected yet, and I will not claim access I cannot verify.\n\nI will guide you one step at a time. First, what kind of business do you run and what would you most like to automate? Then we can continue the right connection, review its permissions, and look for your first useful job.';
 else
  v_kind:='NEW_BUSINESS_WELCOME';
  v_text:='Welcome to Reality. I am here to help you run your business with less work on your shoulders.\n\nAutomation can feel confusing at first, but I will walk you through everything, step by step. You do not need to understand the technology.\n\nFirst, tell me a little about your business. Then I will help you connect the tools you already use, discover work your AI employees could handle, and review a safe first job with you. I will show you what is verified and ask permission before doing anything consequential.\n\nTo get started, what kind of business do you run?';
 end if;
 v_request:=pg_catalog.gen_random_uuid();
 insert into public.reality_chat_messages
  (user_id,conversation_id,request_id,role,content)
 values(p_owner_id,p_conversation_id,v_request,'assistant',v_text)
 returning id into v_message_id;
 insert into reality_internal.owner_first_chat_contact_v1
  (owner_id,conversation_id,request_id,message_id,contact_kind)
 values(p_owner_id,p_conversation_id,v_request,v_message_id,v_kind);
 return jsonb_build_object(
  'status','OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'message_id',v_message_id,'contact_kind',v_kind,
  'created',true,'new_customer_welcome_sent',true,
  'saved_conversation_message',true,'human_request_not_created',true,
  'external_actions_authorized',false,'provider_connected_by_read',false,
  'work_shift_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_send_owner_first_business_chat_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_send_owner_first_business_chat_v1(uuid,uuid)
 to service_role;
