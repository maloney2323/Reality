-- v25: proactive operational messages grounded exclusively in Reality owner ledgers.
-- Durable CHAT response, not a pretend bubble. One per meaningful owner
-- snapshot/day, with 90-minute noise suppression and no execution authority.
create table if not exists reality_internal.owner_operational_chat_digest_v1 (
 owner_id uuid not null references auth.users(id) on delete cascade,
 digest_day date not null,
 evidence_sha256 text not null check(evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 conversation_id uuid not null,
 message_id uuid not null unique references public.reality_chat_messages(id) on delete cascade,
 message_kind text not null check(message_kind='VERIFIED_OWNER_OPERATIONAL_UPDATE'),
 emitted_at timestamptz not null default clock_timestamp(),
 read_only boolean not null default true check(read_only),
 production_changed boolean not null default false check(not production_changed),
 primary key(owner_id,digest_day,evidence_sha256)
);
create index if not exists owner_operational_chat_digest_owner_recent_v1
 on reality_internal.owner_operational_chat_digest_v1(owner_id,emitted_at desc);
alter table reality_internal.owner_operational_chat_digest_v1 enable row level security;
revoke all on reality_internal.owner_operational_chat_digest_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.owner_operational_chat_digest_v1
 to service_role;

create or replace function public.reality_send_owner_operational_chat_digest_v1(
 p_owner_id uuid,p_conversation_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_maintenance jsonb;v_warrant jsonb;v_repairs jsonb;v_state jsonb;
 v_open integer:=0;v_signed integer:=0;v_outside integer:=0;
 v_source_reviews integer:=0;v_capability_inquiries integer:=0;
 v_shift uuid;v_sha text;v_day date;v_existing uuid;
 v_request uuid;v_message uuid;v_text text;v_lines text;
 v_row record;v_signed_job boolean;v_step text;v_name text;
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_conversation_id is null then
  raise exception 'OPERATIONAL_CHAT_VERIFIED_OWNER_SERVICE_REQUIRED';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality:operational-chat:'||p_owner_id::text,0));
 v_day:=(clock_timestamp() at time zone 'America/New_York')::date;
 v_maintenance:=public.reality_read_owner_internal_maintenance_v1(p_owner_id);
 if v_maintenance->>'status'<>'OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY'
    or v_maintenance->>'owner_id'<>p_owner_id::text
    or v_maintenance->>'read_only'<>'true'
    or v_maintenance->>'production_changed'<>'false'
 then raise exception 'OPERATIONAL_CHAT_MAINTENANCE_READBACK_UNVERIFIED';end if;
 v_warrant:=v_maintenance->'active_maintenance_warrant';
 if v_warrant is not null and v_warrant<>'null'::jsonb then
  if v_warrant->>'status'<>
     'VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE'
     or v_warrant->>'mode'<>
      'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
     or v_warrant->>'state'<>'ACTIVE'
     or pg_catalog.jsonb_typeof(v_warrant->'source_scope')<>'array'
  then raise exception 'OPERATIONAL_CHAT_SIGNED_WARRANT_INVALID';end if;
  v_shift:=(v_warrant->>'shift_id')::uuid;
 end if;
 select pg_catalog.coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
    'incident_id',m.incident_id,'assignee',m.assignee,
    'kind',m.maintenance_kind,'source_ref',m.source_ref,
    'handling_state',m.handling_state,
    'baseline_sha',m.independent_failure_baseline_receipt_sha256,
    'frozen_sha',m.independent_frozen_test_receipt_sha256,
    'repair_sha',m.repaired_capability_receipt_sha256,
    'signed',v_shift is not null and
      pg_catalog.coalesce((v_warrant->'source_scope') @>
        pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'maintenance_id',m.incident_id::text,
          'source_ref',m.source_ref,
          'independent_review_receipt_sha256',
             m.independent_review_receipt_sha256)),false))
  order by m.incident_id),'[]'::jsonb)
 into v_repairs
 from (
  select incident_id,assignee,maintenance_kind,source_ref,handling_state,
   independent_failure_baseline_receipt_sha256,
   independent_frozen_test_receipt_sha256,repaired_capability_receipt_sha256,
   independent_review_receipt_sha256
  from reality_internal.owner_internal_maintenance_jobs_v1
  where owner_id=p_owner_id and repaired_capability_receipt_sha256 is null
   and independent_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and source_ref ~ '^https://github[.]com/maloney2323/Reality/(pull|issues)/[1-9][0-9]*$'
   and assignee in('Avery','Riley','Taylor','Quinn','Casey','Morgan','Jordan','Sage')
  order by created_at desc limit 12
 ) m;
 v_open:=pg_catalog.jsonb_array_length(v_repairs);
 select pg_catalog.count(*) into v_signed
 from pg_catalog.jsonb_array_elements(v_repairs) x
 where x.value->>'signed'='true';
 v_outside:=v_open-v_signed;
 select pg_catalog.count(*) into v_source_reviews
 from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=p_owner_id and work_kind='SOURCE_INVESTIGATION'
  and work_state in ('CURRENT_SOURCE_REVIEW_REQUIRED',
   'SOURCE_EPOCH_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED')
  and planned_business_date<=v_day
  and last_reconciled_at>clock_timestamp()-interval '36 hours';
 select pg_catalog.count(*) into v_capability_inquiries
 from reality_internal.owner_capability_employee_schedule_v1
 where owner_id=p_owner_id
  and phase in ('INQUIRY_RECORDED_NEEDS_INDEPENDENT_GAP_PROOF',
   'INQUIRY_BLOCKED_NEEDS_PROVIDER_PROOF');
 if v_open=0 and v_source_reviews=0 and v_capability_inquiries=0 then
  return pg_catalog.jsonb_build_object(
   'status','NO_NEW_ACTIONABLE_VERIFIED_OPERATIONAL_STATE',
   'owner_id',p_owner_id,'created',false,'shift_authorized',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 -- Snapshot includes real stages, source evidence and signed authority,
 -- not the render time or generic "open app" event.
 v_state:=pg_catalog.jsonb_build_object(
  'repairs',v_repairs,'active_exact_warrant',v_shift,
  'source_reviews_due',v_source_reviews,
  'capability_inquiries_unverified',v_capability_inquiries);
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v_state::text,'UTF8')),'hex');
 select message_id into v_existing
 from reality_internal.owner_operational_chat_digest_v1
 where owner_id=p_owner_id and digest_day=v_day and evidence_sha256=v_sha;
 if found then
  return pg_catalog.jsonb_build_object(
   'status','OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
   'owner_id',p_owner_id,'created',false,
   'message_id',v_existing,
   'shift_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 if exists(
  select 1 from reality_internal.owner_operational_chat_digest_v1
  where owner_id=p_owner_id
   and emitted_at>clock_timestamp()-interval '90 minutes')
 then
  return pg_catalog.jsonb_build_object(
   'status','OPERATIONAL_GREETING_COOLDOWN_NO_REPEAT',
   'owner_id',p_owner_id,'created',false,
   'shift_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 v_text:='Reality · Operational update'||pg_catalog.chr(10)||
  'I reviewed your employees'' current work and the independently recorded evidence.';
 if v_open>0 then
  v_text:=v_text||pg_catalog.chr(10)||pg_catalog.chr(10)||
   'There are '||v_open||' unfinished source-backed maintenance incidents. '||
   case when v_shift is not null then
     v_signed||' are covered by your existing signed maintenance shift '||
      v_shift::text||'. The other '||v_outside||
      ' are NOT included in that authorization. '
    else 'I could not verify an active exact maintenance warrant. ' end;
  v_lines:='';
  for v_row in
   select x.value as item from pg_catalog.jsonb_array_elements(v_repairs) x
   order by x.value->>'assignee',x.value->>'incident_id'
  loop
   v_signed_job:=v_row.item->>'signed'='true';
   v_name:=case when v_row.item->>'kind'=
       'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     then 'employee job-qualification handoff'
     else 'source-evidence execution handoff' end;
   v_step:=case
    when v_row.item->>'frozen_sha' is not null then
     'frozen test evidence exists; next independently verify a candidate repair and its exact installation authority'
    when v_row.item->>'baseline_sha' is not null then
     'failure baseline recorded; next obtain an independent frozen CI RED test before proposing a repair'
    else 'failure baseline is not independently verified; next reproduce and verify the problem in isolation'
    end;
   v_lines:=v_lines||pg_catalog.chr(10)||
    '• '||(v_row.item->>'assignee')||' — '||v_name||
    ' ('||v_row.item->>'source_ref'||'): '||v_step||'. '||
    case when v_signed_job then 'Already covered by the signed shift.'
    else 'Not covered by that signed shift.' end;
  end loop;
  v_text:=v_text||v_lines;
 end if;
 if v_source_reviews>0 then
  v_text:=v_text||pg_catalog.chr(10)||pg_catalog.chr(10)||
   'I also found '||v_source_reviews||
   ' scheduled source reviews awaiting current evidence. These are investigation opportunities, not completed or authorized customer-original jobs.';
 end if;
 if v_capability_inquiries>0 then
  v_text:=v_text||pg_catalog.chr(10)||
   'There are '||v_capability_inquiries||
   ' capability inquiries awaiting independent gap/provider proof. A possible capability is not an installed upgrade.';
 end if;
 v_text:=v_text||pg_catalog.chr(10)||pg_catalog.chr(10)||
  'My next safe step is to advance work within the authority already granted and independently verify the result. '||
  'I will only ask for a new approval where existing authority is insufficient. '||
  'No repair completion, code installation or measured savings is implied here. '||
  'You can reply here to ask why any job is blocked or what happens next.';
 v_request:=pg_catalog.gen_random_uuid();
 insert into public.reality_chat_messages
  (user_id,conversation_id,request_id,role,content)
 values(p_owner_id,p_conversation_id,v_request,'assistant',v_text)
 returning id into v_message;
 insert into reality_internal.owner_operational_chat_digest_v1
  (owner_id,digest_day,evidence_sha256,conversation_id,message_id,message_kind)
 values(p_owner_id,v_day,v_sha,p_conversation_id,v_message,
  'VERIFIED_OWNER_OPERATIONAL_UPDATE');
 return pg_catalog.jsonb_build_object(
  'status','VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'message_id',v_message,'created',true,'message_saved',true,
  'unfinished_maintenance',v_open,'previously_signed_repairs',v_signed,
  'outside_signed_authority',v_outside,
  'scheduled_source_reviews',v_source_reviews,
  'unverified_capability_inquiries',v_capability_inquiries,
  'shift_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke execute on function public.reality_send_owner_operational_chat_digest_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_send_owner_operational_chat_digest_v1(uuid,uuid)
 to service_role;
