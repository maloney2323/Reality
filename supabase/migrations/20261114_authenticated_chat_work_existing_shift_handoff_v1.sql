-- A saved authenticated HUMAN Chat turn becomes durable governed intake BEFORE
-- cognition. The existing authorized shift worker independently qualifies it.
-- A Chat message is NEVER by itself a new execution/installation warrant.
create table if not exists reality_internal.chat_work_handoffs_v1(
 message_id uuid primary key references public.reality_chat_messages(id) on delete cascade,
 owner_id uuid not null,
 conversation_id uuid not null,
 request_id uuid not null,
 message_sha256 text not null check(message_sha256~'^[a-f0-9]{64}$'),
 status text not null default 'PENDING' check(status in
  ('PENDING','CLAIMED','INVESTIGATED_SCOPED','NEEDS_AUTHORIZED_SCOPE',
   'CONVERSATION_ONLY','PROVIDER_UNVERIFIED')),
 shift_id uuid,
 plan_fingerprint text,
 claim_id uuid,
 claimed_at timestamptz,
 claim_expires_at timestamptz,
 finalized_at timestamptz,
 investigation jsonb,
 created_at timestamptz not null default clock_timestamp(),
 constraint chat_work_one_owner_turn unique(owner_id,conversation_id,request_id),
 constraint chat_work_shift_and_warrant check
  ((shift_id is null and plan_fingerprint is null)
   or (shift_id is not null and plan_fingerprint~'^sha256:[a-f0-9]{64}$')),
 constraint chat_work_claim_consistent check
  ((status='PENDING' and claim_id is null and claimed_at is null)
   or (status<>'PENDING' and claim_id is not null and claimed_at is not null)),
 constraint chat_work_no_diagnostic_without_finish check
  ((status in ('PENDING','CLAIMED') and investigation is null and finalized_at is null)
   or (status not in ('PENDING','CLAIMED') and investigation is not null and finalized_at is not null))
);
create index if not exists chat_work_pending_idx
 on reality_internal.chat_work_handoffs_v1(created_at,message_id)
 where status='PENDING';
alter table reality_internal.chat_work_handoffs_v1 enable row level security;
revoke all on reality_internal.chat_work_handoffs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.chat_work_handoffs_v1 to service_role;

create or replace function reality_internal.ingest_authenticated_chat_work_v1()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if new.role='user' then
  insert into reality_internal.chat_work_handoffs_v1(
   message_id,owner_id,conversation_id,request_id,message_sha256)
  values(new.id,new.user_id,new.conversation_id,new.request_id,
   pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(new.content,'UTF8')),'hex'))
  on conflict(message_id) do nothing;
 end if;
 return new;
end $fn$;
revoke all on function reality_internal.ingest_authenticated_chat_work_v1()
 from public,anon,authenticated;
drop trigger if exists reality_ingest_authenticated_chat_work_v1
 on public.reality_chat_messages;
create trigger reality_ingest_authenticated_chat_work_v1
 after insert on public.reality_chat_messages
 for each row when (new.role='user')
 execute function reality_internal.ingest_authenticated_chat_work_v1();

-- A generic, bounded recovery of recent unanswered authenticated messages.
-- This covers a saved instruction whose Chat answer timed out before this
-- trigger existed; no owner ID, issue number, fixed phrase or job hardcoded.
insert into reality_internal.chat_work_handoffs_v1(
 message_id,owner_id,conversation_id,request_id,message_sha256)
select m.id,m.user_id,m.conversation_id,m.request_id,
 pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(m.content,'UTF8')),'hex')
from public.reality_chat_messages m
where m.role='user' and m.created_at>=clock_timestamp()-interval '24 hours'
 and not exists(select 1 from public.reality_chat_messages a
  where a.user_id=m.user_id and a.conversation_id=m.conversation_id
   and a.request_id=m.request_id and a.role='assistant')
on conflict(message_id) do nothing;

create or replace function public.reality_claim_chat_work_for_shift_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare chosen record;live record;token uuid;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_WORK_SERVICE_ROLE_REQUIRED';end if;
 select i.message_id,i.owner_id,i.conversation_id,i.request_id,
  i.message_sha256,m.content as prompt,sh.shift_id,
  sh.plan_fingerprint,w.source_scope into chosen
 from reality_internal.chat_work_handoffs_v1 i
 join public.reality_chat_messages m on m.id=i.message_id
  and m.user_id=i.owner_id and m.conversation_id=i.conversation_id
  and m.request_id=i.request_id and m.role='user'
 join lateral (
  select s.shift_id,s.owner_id,s.plan_fingerprint,s.authorized_at,
   s.planned_start_at,s.planned_end_at,s.closed_at,s.status
  from reality_internal.governed_employee_shifts_v1 s
  where s.owner_id=i.owner_id and s.authorized_at is not null
   and s.closed_at is null and s.status in
    ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK') and
    s.planned_start_at<=clock_timestamp() and
    s.planned_end_at>clock_timestamp()
  order by s.authorized_at desc limit 1
 ) sh on true
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
   and w.plan_fingerprint=sh.plan_fingerprint
   and w.state='ACTIVE' and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
 where i.status='PENDING'
  and i.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and pg_catalog.jsonb_typeof(w.source_scope)='array'
  and pg_catalog.jsonb_array_length(w.source_scope) between 1 and 25
 order by i.created_at,i.message_id limit 1
 for update of i skip locked;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_PENDING_CHAT_WITH_CURRENT_OWNER_WARRANT',
   'new_shift_started',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 token:=pg_catalog.gen_random_uuid();
 update reality_internal.chat_work_handoffs_v1
  set status='CLAIMED',claim_id=token,claimed_at=clock_timestamp(),
   claim_expires_at=clock_timestamp()+interval '5 minutes',
   shift_id=chosen.shift_id,plan_fingerprint=chosen.plan_fingerprint
 where message_id=chosen.message_id and status='PENDING';
 if not found then raise exception 'CHAT_WORK_ATOMIC_CLAIM_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','AUTHENTICATED_CHAT_WORK_LEASED_TO_EXISTING_SHIFT',
  'message_id',chosen.message_id,'owner_id',chosen.owner_id,
  'conversation_id',chosen.conversation_id,'request_id',chosen.request_id,
  'message_sha256',chosen.message_sha256,'message',chosen.prompt,
  'shift_id',chosen.shift_id,'plan_fingerprint',chosen.plan_fingerprint,
  'source_scope',chosen.source_scope,'claim_id',token,
  'claim_expires_at',clock_timestamp()+interval '5 minutes',
  'new_shift_started',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_chat_work_diagnosis_v1(
 p_message_id uuid,p_claim_id uuid,p_shift_id uuid,
 p_message_sha256 text,p_decision text,p_diagnosis text,
 p_selected_sources jsonb,p_model_response_id text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare i record;w record;src text;selected_count integer;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_WORK_DIAGNOSIS_SERVICE_ONLY';end if;
 if p_message_id is null or p_claim_id is null or p_shift_id is null
  or p_message_sha256 !~ '^[a-f0-9]{64}$'
  or p_decision not in
   ('INVESTIGATE_EXISTING_WORK','NEEDS_NEW_OR_EXACT_SCOPE',
    'CONVERSATION_ONLY')
  or p_diagnosis is null or char_length(p_diagnosis) not between 20 and 2000
  or pg_catalog.jsonb_typeof(p_selected_sources)<>'array'
  or pg_catalog.jsonb_array_length(p_selected_sources)>25
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'CHAT_WORK_DIAGNOSIS_TYPED_EVIDENCE_REQUIRED';end if;
 select i.*,m.content into i
 from reality_internal.chat_work_handoffs_v1 i
 join public.reality_chat_messages m on m.id=i.message_id
  and m.role='user' and m.user_id=i.owner_id
  and m.request_id=i.request_id and m.conversation_id=i.conversation_id
 where i.message_id=p_message_id for update of i;
 if not found or i.status<>'CLAIMED'
  or i.claim_id<>p_claim_id or i.shift_id<>p_shift_id
  or i.message_sha256<>p_message_sha256
  or i.message_sha256<>pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(i.content,'UTF8')),'hex')
  or i.claim_expires_at<clock_timestamp()
 then raise exception 'CHAT_WORK_ORIGINAL_CLAIM_OR_SOURCE_UNVERIFIED';end if;
 select w.source_scope,w.plan_fingerprint into w
 from reality_internal.governed_employee_completion_warrants_v1 w
 join reality_internal.governed_employee_shifts_v1 sh
  on sh.shift_id=w.shift_id and sh.owner_id=w.owner_id
  and sh.plan_fingerprint=w.plan_fingerprint
 where w.shift_id=i.shift_id and w.owner_id=i.owner_id
  and w.plan_fingerprint=i.plan_fingerprint and w.state='ACTIVE'
  and sh.closed_at is null and sh.authorized_at is not null
  and sh.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and sh.planned_end_at>clock_timestamp();
 if not found then raise exception 'CHAT_WORK_CURRENT_SHIFT_AUTHORITY_EXPIRED';end if;
 selected_count:=pg_catalog.jsonb_array_length(p_selected_sources);
 for src in select pg_catalog.jsonb_array_elements_text(p_selected_sources) loop
  if char_length(src)>500 or not exists(
   select 1 from pg_catalog.jsonb_array_elements(w.source_scope) permitted
   where permitted->>'source_ref'=src) then
   raise exception 'CHAT_WORK_SOURCE_OUTSIDE_FROZEN_WARRANT';
  end if;
 end loop;
 if selected_count<>(
  select count(distinct x) from pg_catalog.jsonb_array_elements_text(p_selected_sources) x)
 then raise exception 'CHAT_WORK_DUPLICATE_SOURCE';end if;
 update reality_internal.chat_work_handoffs_v1
 set status=case
  when p_decision='CONVERSATION_ONLY' then 'CONVERSATION_ONLY'
  when p_decision='INVESTIGATE_EXISTING_WORK' and selected_count>0
   then 'INVESTIGATED_SCOPED'
  else 'NEEDS_AUTHORIZED_SCOPE' end,
  finalized_at=clock_timestamp(),
  investigation=pg_catalog.jsonb_build_object(
   'status','MODEL_SOURCE_BOUNDED_DIAGNOSIS_NOT_INDEPENDENT_REPAIR',
   'decision',p_decision,'diagnosis',p_diagnosis,
   'selected_source_refs',p_selected_sources,
   'model_response_id',p_model_response_id,
   'owner_shift_id',i.shift_id,
   'evidence_class','SIGNED_CHAT_SOURCE_PLUS_EXISTING_SHIFT_WARRANT',
   'independently_verified_code_repair',false,
   'execution_authorized_by_chat',false,
   'installation_authorized',false,'job_settled',false)
 where message_id=i.message_id and claim_id=i.claim_id;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_WORK_DIAGNOSIS_DURABLY_RECORDED',
  'message_id',i.message_id,'request_id',i.request_id,
  'owner_id',i.owner_id,'conversation_id',i.conversation_id,
  'shift_id',i.shift_id,
  'work_status',(select status from reality_internal.chat_work_handoffs_v1
   where message_id=i.message_id),
  'selected_source_count',selected_count,
  'model_advisory_recorded',true,'execution_authorized',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_read_chat_work_for_owner_v1(
 p_owner_id uuid,p_conversation_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare items jsonb;
begin
 if p_owner_id is null or p_conversation_id is null or
  (current_user<>'service_role' and auth.uid() is distinct from p_owner_id)
 then raise exception 'CHAT_WORK_OWNER_SESSION_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'source_message_id',i.message_id,'request_id',i.request_id,
   'status',i.status,'source_ref','supabase:reality_chat_messages:'||i.message_id::text,
   'shift_id',i.shift_id,
   'diagnosis_status',i.investigation->>'status',
   'diagnosis',i.investigation->>'diagnosis',
   'selected_source_refs',i.investigation->'selected_source_refs',
   'worker_invocation_claimed',i.claim_id is not null,
   'execution_authorized_by_chat',false,
   'installation_authorized',false,
   'production_changed',false)
  order by i.created_at desc),'[]'::jsonb)
 into items
 from (select * from reality_internal.chat_work_handoffs_v1
  where owner_id=p_owner_id and conversation_id=p_conversation_id
  order by created_at desc limit 50) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_WORK_INTAKE_READBACK',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'items',items,'independent_execution_receipt_count',0,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
create or replace function public.reality_fail_chat_work_claim_v1(
 p_message_id uuid,p_claim_id uuid,p_failure_code text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare i record;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_WORK_FAILURE_SERVICE_ROLE_ONLY';end if;
 if p_message_id is null or p_claim_id is null
  or p_failure_code is null or p_failure_code !~ '^[A-Z][A-Z0-9_]{3,100}$'
 then raise exception 'CHAT_WORK_FAILURE_CODE_INVALID';end if;
 select * into i from reality_internal.chat_work_handoffs_v1
 where message_id=p_message_id for update;
 if not found or i.claim_id<>p_claim_id or i.status<>'CLAIMED'
 then return pg_catalog.jsonb_build_object(
  'status','CHAT_WORK_FAILURE_CLAIM_NO_LONGER_ACTIVE',
  'production_changed',false,'installation_authorized',false);end if;
 update reality_internal.chat_work_handoffs_v1
 set status='PROVIDER_UNVERIFIED',finalized_at=clock_timestamp(),
 investigation=pg_catalog.jsonb_build_object(
  'status','INVESTIGATION_DID_NOT_COMPLETE',
  'failure_code',p_failure_code,
  'independently_verified_code_repair',false,
  'execution_authorized_by_chat',false,'installation_authorized',false,
  'job_settled',false)
 where message_id=i.message_id and claim_id=i.claim_id and status='CLAIMED';
 return pg_catalog.jsonb_build_object(
  'status','CHAT_WORK_FAILURE_DURABLY_RECORDED',
  'message_id',i.message_id,'request_id',i.request_id,
  'shift_id',i.shift_id,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_reconcile_expired_chat_work_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare n integer;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_WORK_RECONCILIATION_SERVICE_ROLE_ONLY';end if;
 update reality_internal.chat_work_handoffs_v1
 set status='PROVIDER_UNVERIFIED',finalized_at=clock_timestamp(),
 investigation=pg_catalog.jsonb_build_object(
  'status','INCOMPLETE_PROVIDER_ATTEMPT_NO_AUTOMATIC_REPLAY',
  'failure_code','LEASE_EXPIRED_WITHOUT_DURABLE_RESULT',
  'independently_verified_code_repair',false,
  'execution_authorized_by_chat',false,'installation_authorized',false,
  'job_settled',false)
 where status='CLAIMED' and claim_expires_at<clock_timestamp();
 get diagnostics n=row_count;
 return pg_catalog.jsonb_build_object(
  'status','STALE_CHAT_WORK_CLAIMS_RECONCILED',
  'stale_claims',n,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_claim_chat_work_for_shift_v1()
 from public,anon,authenticated;
revoke all on function public.reality_record_chat_work_diagnosis_v1(
 uuid,uuid,uuid,text,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.reality_read_chat_work_for_owner_v1(uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_fail_chat_work_claim_v1(
 uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.reality_reconcile_expired_chat_work_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_chat_work_for_shift_v1() to service_role;
grant execute on function public.reality_record_chat_work_diagnosis_v1(
 uuid,uuid,uuid,text,text,text,jsonb,text) to service_role;
grant execute on function public.reality_read_chat_work_for_owner_v1(uuid,uuid) to service_role;
grant execute on function public.reality_fail_chat_work_claim_v1(
 uuid,uuid,text) to service_role;
grant execute on function public.reality_reconcile_expired_chat_work_v1()
 to service_role;
