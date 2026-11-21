-- Reality Continuity -> independent signed-Chat qualification -> exact owner
-- admission into the EXISTING isolated development original-work adapter.
-- A verified signed human request, not a model interpretation, is the authority.
-- This does not extend an active maintenance shift or authorize model execution.
create table if not exists reality_internal.owner_qualified_chat_original_review_packets_v1(
 packet_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 conversation_id uuid not null,
 request_id uuid not null,
 message_id uuid not null references public.reality_chat_messages(id),
 continuity_ref text not null,
 source_ref text not null,
 signed_message_sha256 text not null,
 source_quote text not null,
 objective text not null,
 capability_id text not null,
 proposal_fingerprint text not null,
 review_state text not null default 'AWAITING_OWNER_EXACT_APPROVAL',
 approval_request_id uuid,
 approval_receipt_sha256 text,
 original_work_id text,
 approved_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,message_id),
 constraint qualified_chat_exact_source check(
 source_ref='supabase:reality_chat_messages:'||message_id::text
 and continuity_ref~'^reality:qualification:[a-f0-9]{64}$'
 and signed_message_sha256~'^[a-f0-9]{64}$'
 and proposal_fingerprint~'^sha256:[a-f0-9]{64}$'
 and length(trim(source_quote)) between 5 and 500
 and length(trim(objective)) between 8 and 450
 and capability_id='governed-chat-new-development'),
 constraint qualified_chat_approval_consistency check(
 (review_state='AWAITING_OWNER_EXACT_APPROVAL' and approval_request_id is null
  and approval_receipt_sha256 is null and original_work_id is null and approved_at is null)
 or
 (review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
  and approval_request_id is not null and approved_at is not null
  and approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and original_work_id~'^work:[a-f0-9]{32}$')
 )
);
revoke all on reality_internal.owner_qualified_chat_original_review_packets_v1
 from public,anon,authenticated;
grant select,insert,update on
 reality_internal.owner_qualified_chat_original_review_packets_v1 to service_role;

-- Read the exact source from Reality's already reconciled qualifier, not
-- arbitrary client-selected conversations or old model prose.
create or replace function public.reality_read_owner_qualified_chat_original_source_v1(
 p_owner_id uuid,p_message_id uuid,p_continuity_ref text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v record;
begin
 if current_user<>'service_role' or p_owner_id is null or p_message_id is null
 or p_continuity_ref!~'^reality:qualification:[a-f0-9]{64}$' then
  raise exception 'QUALIFIED_CHAT_SOURCE_TRUSTED_OWNER_REQUIRED';end if;
 select r.owner_id,r.intake_key,r.continuity_ref,r.route_state,
  r.last_checked_at,i.source_ref,i.terminal_observation,
  h.request_id,h.conversation_id,h.message_sha256,h.development,
  m.id as persisted_message_id,m.role,m.content
 into v
 from reality_internal.owner_continuity_qualification_routes_v1 r
 join reality_internal.owner_continuous_qualification_inbox_v1 i
  on i.owner_id=r.owner_id and i.intake_family=r.intake_family
  and i.intake_key=r.intake_key
 join reality_internal.chat_work_handoffs_v1 h
  on h.owner_id=r.owner_id and h.message_id=p_message_id
  and h.message_id::text=r.intake_key
 join public.reality_chat_messages m
  on m.id=h.message_id and m.user_id=h.owner_id
  and m.conversation_id=h.conversation_id and m.request_id=h.request_id
  and m.role='user'
 where r.owner_id=p_owner_id and r.intake_family='AUTHENTICATED_CHAT'
  and r.intake_key=p_message_id::text
  and r.continuity_ref=p_continuity_ref
  and r.source_ref='supabase:reality_chat_messages:'||p_message_id::text
  and i.source_ref=r.source_ref
 limit 1;
 if not found or v.terminal_observation or
  v.route_state<>'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION'
  or v.last_checked_at<clock_timestamp()-interval '30 minutes'
  or v.message_sha256 IS DISTINCT FROM
   pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v.content,'UTF8')),'hex')
 then return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_CURRENT_SOURCE_NOT_VERIFIED',
  'exact_review_ready',false,'new_original_admitted',false,
  'execution_authorized',false,'installation_authorized',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_SIGNED_SOURCE_VERIFIED',
  'owner_id',v.owner_id,'conversation_id',v.conversation_id,
  'request_id',v.request_id,'message_id',p_message_id,
  'continuity_ref',v.continuity_ref,'source_ref',v.source_ref,
  'signed_source_sha256',v.message_sha256,
  'already_admitted_original',v.development->>'original_work_id',
  'original_new_admission_possible',v.development is null,
  'signed_user_message_verified',true,'model_did_not_grant_authority',true,
  'execution_authorized',false,'new_original_admitted',false,
  'installation_authorized',false,'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_qualified_chat_original_source_v1(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_qualified_chat_original_source_v1(uuid,uuid,text)
 to service_role;

create or replace function public.reality_stage_qualified_chat_original_review_v1(
 p_owner_id uuid,p_message_id uuid,p_continuity_ref text,
 p_signed_source_sha256 text,p_source_quote text,p_objective text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v jsonb; p reality_internal.owner_qualified_chat_original_review_packets_v1%rowtype;
 v_fingerprint text;v_sha text;
begin
 if current_user<>'service_role' or
 p_signed_source_sha256!~'^[a-f0-9]{64}$' or
 p_source_quote is null or length(trim(p_source_quote)) not between 5 and 500 or
 p_objective is null or length(trim(p_objective)) not between 8 and 450
 then raise exception 'QUALIFIED_CHAT_STAGING_EXACT_SCOPE_REQUIRED';end if;
 v:=public.reality_read_owner_qualified_chat_original_source_v1(
  p_owner_id,p_message_id,p_continuity_ref);
 if v->>'status'<>'QUALIFIED_CHAT_SIGNED_SOURCE_VERIFIED'
  or v->>'signed_source_sha256'<>p_signed_source_sha256
  or v->>'already_admitted_original' is not null
  or v->>'original_new_admission_possible'<>'true'
  or not exists (
   select 1 from public.reality_chat_messages m
   where m.id=p_message_id and m.user_id=p_owner_id and m.role='user'
    and pg_catalog.strpos(m.content,p_source_quote)>0)
 then return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_REVIEW_ADMISSION_NOT_ELIGIBLE',
  'owner_approval_ready',false,'new_original_admitted',false,
  'installation_authorized',false);end if;
 v_sha:=v->>'signed_source_sha256';
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(
   'reality-signed-chat-original-approval-v1|'||
   p_owner_id::text||'|'||p_message_id::text||'|'||
   p_continuity_ref||'|'||v_sha||'|'||trim(p_source_quote)||'|'||
   trim(p_objective)||'|governed-chat-new-development','UTF8')),'hex');
 insert into reality_internal.owner_qualified_chat_original_review_packets_v1(
  owner_id,conversation_id,request_id,message_id,
  continuity_ref,source_ref,signed_message_sha256,source_quote,
  objective,capability_id,proposal_fingerprint)
 values(p_owner_id,(v->>'conversation_id')::uuid,
  (v->>'request_id')::uuid,p_message_id,p_continuity_ref,
  v->>'source_ref',v_sha,trim(p_source_quote),trim(p_objective),
  'governed-chat-new-development',v_fingerprint)
 on conflict (owner_id,message_id) do nothing;
 select * into p from reality_internal.owner_qualified_chat_original_review_packets_v1
 where owner_id=p_owner_id and message_id=p_message_id;
 if p.proposal_fingerprint<>v_fingerprint or
 p.continuity_ref<>p_continuity_ref or
 p.signed_message_sha256<>v_sha or
 p.conversation_id<>(v->>'conversation_id')::uuid or
 p.request_id<>(v->>'request_id')::uuid then
  return pg_catalog.jsonb_build_object(
   'status','QUALIFIED_CHAT_EXISTING_REVIEW_SCOPE_CHANGED_NO_REPLAY',
   'owner_approval_ready',false,'new_original_admitted',false,
   'installation_authorized',false);end if;
 return pg_catalog.jsonb_build_object(
  'status',case when p.review_state='AWAITING_OWNER_EXACT_APPROVAL'
   then 'QUALIFIED_CHAT_EXACT_OWNER_ADMISSION_APPROVAL_READY'
   else 'QUALIFIED_CHAT_ORIGINAL_ALREADY_ADMITTED_NO_REPLAY' end,
  'packet_id',p.packet_id,'owner_id',p.owner_id,
  'conversation_id',p.conversation_id,'request_id',p.request_id,
  'message_id',p.message_id,'continuity_ref',p.continuity_ref,
  'source_ref',p.source_ref,'signed_source_sha256',p.signed_message_sha256,
  'capability_id',p.capability_id,'source_quote',p.source_quote,
  'objective',p.objective,'proposal_fingerprint',p.proposal_fingerprint,
  'original_work_id',p.original_work_id,
  'owner_approval_ready',p.review_state='AWAITING_OWNER_EXACT_APPROVAL',
  'original_already_admitted',p.review_state<>'AWAITING_OWNER_EXACT_APPROVAL',
  'new_original_admitted',false,
  'model_execution_authorized',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $function$;
revoke all on function public.reality_stage_qualified_chat_original_review_v1(uuid,uuid,text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_stage_qualified_chat_original_review_v1(uuid,uuid,text,text,text,text)
 to service_role;

-- One exact authenticated owner click consumes the review packet and calls
-- Reality's installed canonical SIGNED CHAT original-admission RPC in the
-- SAME DB transaction. The original is not an active-shift claim/warrant.
create or replace function public.reality_owner_approve_qualified_chat_original_v1(
 p_owner_id uuid,p_packet_id uuid,p_proposal_fingerprint text,
 p_approval_request_id uuid,p_preview_release_sha text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare p reality_internal.owner_qualified_chat_original_review_packets_v1%rowtype;
 v jsonb;admitted jsonb;v_receipt text;
begin
 if current_user<>'service_role' or p_owner_id is null
 or p_packet_id is null or p_approval_request_id is null
 or p_proposal_fingerprint!~'^sha256:[a-f0-9]{64}$'
 or p_preview_release_sha!~'^[a-f0-9]{40}$'
 then raise exception 'QUALIFIED_CHAT_EXACT_OWNER_ACTION_REQUIRED';end if;
 select * into p from reality_internal.owner_qualified_chat_original_review_packets_v1
 where owner_id=p_owner_id and packet_id=p_packet_id for update;
 if not found or p.proposal_fingerprint<>p_proposal_fingerprint
 then raise exception 'QUALIFIED_CHAT_EXACT_PACKET_CHANGED';end if;
 if p.review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER' then
  return pg_catalog.jsonb_build_object(
   'status','QUALIFIED_CHAT_ORIGINAL_ALREADY_ADMITTED_NO_REPLAY',
   'packet_id',p.packet_id,'original_work_id',p.original_work_id,
   'approval_receipt_sha256',p.approval_receipt_sha256,
   'owner_id',p.owner_id,'continuity_ref',p.continuity_ref,
   'original_admitted',true,'model_execution_authorized',false,
   'installation_authorized',false,'production_changed',false,
   'new_shift_started',false);end if;
 v:=public.reality_read_owner_qualified_chat_original_source_v1(
  p_owner_id,p.message_id,p.continuity_ref);
 if v->>'status'<>'QUALIFIED_CHAT_SIGNED_SOURCE_VERIFIED'
 or v->>'signed_source_sha256'<>p.signed_message_sha256
 or v->>'conversation_id'<>p.conversation_id::text
 or v->>'request_id'<>p.request_id::text
 or v->>'already_admitted_original' is not null
 then raise exception 'QUALIFIED_CHAT_OWNER_SOURCE_CHANGED_BEFORE_ADMISSION';end if;
 admitted:=public.reality_admit_chat_new_development_v1(
  p.owner_id,p.conversation_id,p.request_id,p.message_id,
  p.source_quote,p.objective,p_preview_release_sha);
 if admitted->>'status'<>'SIGNED_CHAT_NEW_DEVELOPMENT_ADMITTED'
 or admitted->>'original_work_id'!~'^work:[a-f0-9]{32}$'
 or admitted->>'new_shift_started'<>'false'
 or admitted->>'installation_authorized'<>'false'
 then raise exception 'QUALIFIED_CHAT_ORIGINAL_ADMISSION_NOT_VERIFIED';end if;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to('qualified-chat-owner-admission-v1|'||
   p.packet_id::text||'|'||p_approval_request_id::text||'|'||
   p.proposal_fingerprint||'|'||(admitted->>'original_work_id'),
   'UTF8')),'hex');
 update reality_internal.owner_qualified_chat_original_review_packets_v1
 set review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER',
  approval_request_id=p_approval_request_id,
  approval_receipt_sha256=v_receipt,
  original_work_id=admitted->>'original_work_id',approved_at=clock_timestamp()
 where packet_id=p.packet_id and review_state='AWAITING_OWNER_EXACT_APPROVAL';
 if not found then raise exception 'QUALIFIED_CHAT_OWNER_ADMISSION_ATOMIC_WRITE_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_ORIGINAL_ADMITTED_OWNER_APPROVAL_RECEIPTED',
  'packet_id',p.packet_id,'owner_id',p.owner_id,
  'request_id',p.request_id,'source_ref',p.source_ref,
  'continuity_ref',p.continuity_ref,
  'original_work_id',admitted->>'original_work_id',
  'approval_receipt_sha256',v_receipt,'original_admitted',true,
  'owner_approval_recorded',true,
  'model_execution_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false,'original_job_completed',false);
end $function$;
revoke all on function public.reality_owner_approve_qualified_chat_original_v1(uuid,uuid,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_owner_approve_qualified_chat_original_v1(uuid,uuid,text,uuid,text)
 to service_role;

create or replace function public.reality_read_owner_qualified_chat_original_reviews_v1(
 p_owner_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'QUALIFIED_CHAT_OWNER_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'packet_id',p.packet_id,'message_id',p.message_id,'continuity_ref',p.continuity_ref,
  'source_ref',p.source_ref,'source_quote',p.source_quote,'objective',p.objective,
  'proposal_fingerprint',p.proposal_fingerprint,
  'review_state',p.review_state,'original_work_id',p.original_work_id,
  'approval_receipt_sha256',p.approval_receipt_sha256,
  'owner_approval_ready',p.review_state='AWAITING_OWNER_EXACT_APPROVAL',
  'model_execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'new_shift_started',false)
 order by p.created_at desc),'[]'::jsonb) into v
 from (select * from reality_internal.owner_qualified_chat_original_review_packets_v1
  where owner_id=p_owner_id order by created_at desc limit 20) p;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_QUALIFIED_CHAT_ORIGINAL_EXACT_REVIEWS',
  'owner_id',p_owner_id,'items',v,'read_only',true,
  'owner_approval_granted_by_read',false,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_qualified_chat_original_reviews_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_qualified_chat_original_reviews_v1(uuid)
 to service_role;
