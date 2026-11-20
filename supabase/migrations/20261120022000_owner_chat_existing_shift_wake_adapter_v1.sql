-- A saved authenticated owner Chat instruction can wake the existing signed
-- maintenance worker. This is a transport adapter, NOT new shift authority,
-- an installation approval, a frozen RED receipt, or a completed original.
create table if not exists reality_internal.owner_chat_existing_shift_wakes_v1 (
 owner_id uuid not null,
 conversation_id uuid not null,
 request_id uuid not null,
 shift_id uuid not null,
 chat_source_ref text not null,
 network_request_id bigint,
 queued_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,request_id)
);
alter table reality_internal.owner_chat_existing_shift_wakes_v1 enable row level security;
revoke all on reality_internal.owner_chat_existing_shift_wakes_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_chat_existing_shift_wakes_v1 to service_role;

create or replace function public.reality_dispatch_existing_chat_maintenance_shift_v1(
 p_owner_id uuid,p_conversation_id uuid,p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_message record;v_shift record;v_existing record;
 v_url text;v_worker_token text;v_vercel_bypass text;
 v_network_request_id bigint;v_created uuid;v_scope_count integer;
begin
 if current_user<>'service_role' or p_owner_id is null or
    p_conversation_id is null or p_request_id is null then
  raise exception 'CHAT_EXISTING_SHIFT_SIGNED_SERVICE_REQUIRED';
 end if;
 select m.id,m.content into v_message
 from public.reality_chat_messages m
 where m.user_id=p_owner_id and m.conversation_id=p_conversation_id
  and m.request_id=p_request_id and m.role='user' limit 1;
 if not found or v_message.content is null or
    length(v_message.content)>6000 or
    v_message.content !~*
     '^[[:space:]]*(reality[[:space:]]*[,.:]?[[:space:]]*)?(please[[:space:]]+)?(continue|resume|run|finish|execute)[[:space:]]+.{0,140}(shift|existing|original)' or
    v_message.content ~* '(^|[^a-z])(install|deploy|production|approve)([^a-z]|$)' then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_EXPLICIT_SIGNED_COMMAND_REQUIRED',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 select s.shift_id,s.owner_id,w.source_scope into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 where s.owner_id=p_owner_id and s.authorized_at is not null
  and s.closed_at is null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at='infinity'::timestamptz
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and jsonb_typeof(w.source_scope)='array'
  and jsonb_array_length(w.source_scope) between 1 and 4
 order by s.planned_start_at limit 2;
 if not found then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_NO_AUTHORIZED_MAINTENANCE_WARRANT',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 if (select count(*) from reality_internal.governed_employee_shifts_v1 s
     join reality_internal.governed_employee_completion_warrants_v1 w
      on w.shift_id=s.shift_id and w.owner_id=s.owner_id
     where s.owner_id=p_owner_id and s.authorized_at is not null
      and s.closed_at is null and s.planned_end_at='infinity'::timestamptz
      and w.state='ACTIVE'
      and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')<>1 then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_AMBIGUOUS_AUTHORIZED_SCOPE',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 select count(*) into v_scope_count
 from pg_catalog.jsonb_array_elements(v_shift.source_scope) AS item(entry)
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.incident_id::text=item.entry->>'maintenance_id'
   and m.owner_id=p_owner_id
   and m.source_ref=item.entry->>'source_ref'
   and m.origin_shift_id::text=item.entry->>'origin_shift_id'
   and m.independent_review_receipt_sha256=
      item.entry->>'independent_review_receipt_sha256'
 where m.original_job_completed=false and m.production_changed=false;
 if v_scope_count<>jsonb_array_length(v_shift.source_scope) then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_MAINTENANCE_SCOPE_DRIFT',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 select w.shift_id,w.network_request_id into v_existing
 from reality_internal.owner_chat_existing_shift_wakes_v1 w
 where w.owner_id=p_owner_id and w.request_id=p_request_id;
 if found then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_WAKE_ALREADY_QUEUED',
   'owner_id',p_owner_id,'shift_id',v_existing.shift_id,
   'request_id',p_request_id,
   'source_ref','supabase:reality_chat_messages:'||v_message.id::text,
   'network_request_id',v_existing.network_request_id,
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false,
   'worker_execution_verified',false);
 end if;
 -- Reuse the currently configured, already-scheduled signed preview target.
 -- Neither a Chat message nor the model provides any network endpoint.
 select substring(j.command from
   'https://[a-z0-9-]+[.]vercel[.]app/api/reality/governed-employee-shift-worker')
 into v_url from cron.job j
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
  and j.active=true order by j.jobid desc limit 1;
 select max(decrypted_secret) filter (
  where name='reality_riley_preview_worker_token_20261107'),
  max(decrypted_secret) filter (
  where name='reality_riley_preview_vercel_bypass_20261107')
 into v_worker_token,v_vercel_bypass from vault.decrypted_secrets
 where name in ('reality_riley_preview_worker_token_20261107',
                'reality_riley_preview_vercel_bypass_20261107');
 if v_url is null or v_worker_token !~ '^[a-f0-9]{64}$' or
    v_vercel_bypass is null or length(v_vercel_bypass)<10 then
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_SIGNED_WAKE_TRANSPORT_UNAVAILABLE',
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false);
 end if;
 -- An idempotent claim is committed with the queued HTTP request.
 insert into reality_internal.owner_chat_existing_shift_wakes_v1(
  owner_id,conversation_id,request_id,shift_id,chat_source_ref)
 values(p_owner_id,p_conversation_id,p_request_id,v_shift.shift_id,
  'supabase:reality_chat_messages:'||v_message.id::text)
 on conflict do nothing returning owner_id into v_created;
 if v_created is null then
  select w.shift_id,w.network_request_id into v_existing
  from reality_internal.owner_chat_existing_shift_wakes_v1 w
  where w.owner_id=p_owner_id and w.request_id=p_request_id;
  return jsonb_build_object('status','CHAT_EXISTING_SHIFT_WAKE_ALREADY_QUEUED',
   'owner_id',p_owner_id,'shift_id',v_existing.shift_id,
   'request_id',p_request_id,
   'source_ref','supabase:reality_chat_messages:'||v_message.id::text,
   'network_request_id',v_existing.network_request_id,
   'installation_authorized',false,'production_changed',false,
   'original_job_completed',false,'new_shift_started',false,
   'worker_execution_verified',false);
 end if;
 select net.http_post(url:=v_url,headers:=jsonb_build_object(
   'Authorization','Bearer '||v_worker_token,
   'x-vercel-protection-bypass',v_vercel_bypass,
   'Content-Type','application/json'
  ),body:='{}'::jsonb,timeout_milliseconds:=45000)
 into v_network_request_id;
 if v_network_request_id is null or v_network_request_id<1 then
  raise exception 'CHAT_EXISTING_SHIFT_NETWORK_QUEUE_UNVERIFIED';
 end if;
 update reality_internal.owner_chat_existing_shift_wakes_v1 w
 set network_request_id=v_network_request_id
 where w.owner_id=p_owner_id and w.request_id=p_request_id;
 return jsonb_build_object('status','CHAT_EXISTING_SHIFT_WAKE_ENQUEUED',
  'owner_id',p_owner_id,'shift_id',v_shift.shift_id,
  'request_id',p_request_id,
  'source_ref','supabase:reality_chat_messages:'||v_message.id::text,
  'network_request_id',v_network_request_id,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false,
  'worker_execution_verified',false);
end $fn$;
revoke all on function public.reality_dispatch_existing_chat_maintenance_shift_v1(uuid,uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_dispatch_existing_chat_maintenance_shift_v1(uuid,uuid,uuid)
 to service_role;
