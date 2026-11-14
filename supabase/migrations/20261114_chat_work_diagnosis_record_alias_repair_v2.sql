-- Correct PL/pgSQL record name shadowing: unresolved record variable i hid table alias i.
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
 select intake.*,m.content into i
 from reality_internal.chat_work_handoffs_v1 intake
 join public.reality_chat_messages m on m.id=intake.message_id
  and m.role='user' and m.user_id=intake.owner_id
  and m.request_id=intake.request_id and m.conversation_id=intake.conversation_id
 where intake.message_id=p_message_id for update of intake;
 if not found or i.status<>'CLAIMED'
  or i.claim_id<>p_claim_id or i.shift_id<>p_shift_id
  or i.message_sha256<>p_message_sha256
  or i.message_sha256<>pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(i.content,'UTF8')),'hex')
  or i.claim_expires_at<clock_timestamp()
 then raise exception 'CHAT_WORK_ORIGINAL_CLAIM_OR_SOURCE_UNVERIFIED';end if;
 select warrant.source_scope,warrant.plan_fingerprint into w
 from reality_internal.governed_employee_completion_warrants_v1 warrant
 join reality_internal.governed_employee_shifts_v1 sh
  on sh.shift_id=warrant.shift_id and sh.owner_id=warrant.owner_id
  and sh.plan_fingerprint=warrant.plan_fingerprint
 where warrant.shift_id=i.shift_id and warrant.owner_id=i.owner_id
  and warrant.plan_fingerprint=i.plan_fingerprint and warrant.state='ACTIVE'
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
