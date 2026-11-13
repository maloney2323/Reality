-- Chat proposals become durable *employee job-list assignments* only after an
-- exact signed-in owner confirmation. Assignment approval is not a new shift
-- warrant, independent source qualification, capability-install authorization,
-- or permission to change existing original jobs.
create table if not exists reality_internal.approved_chat_employee_assignments_v1(
 approval_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 source_message_id uuid not null,
 conversation_id uuid not null,
 source_content_sha256 text not null
  check(source_content_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 roles jsonb not null check(jsonb_typeof(roles)='array'),
 role_count integer not null check(role_count between 2 and 8),
 task_count integer not null check(task_count between 1 and 64),
 approval_status text not null default 'APPROVED_ASSIGNMENTS_AWAITING_QUALIFICATION'
  check(approval_status='APPROVED_ASSIGNMENTS_AWAITING_QUALIFICATION'),
 approved_at timestamptz not null default clock_timestamp(),
 execution_authorized boolean not null default false check(not execution_authorized),
 installation_authorized boolean not null default false check(not installation_authorized),
 production_changed boolean not null default false check(not production_changed),
 unique(owner_id,source_message_id)
);
revoke all on reality_internal.approved_chat_employee_assignments_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.approved_chat_employee_assignments_v1
 to service_role;

create or replace function public.reality_record_owner_chat_employee_assignments_v1(
 p_owner_id uuid,p_message_id uuid,p_content_sha256 text,p_roles jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
 v_message record;v_role jsonb;v_task jsonb;
 v_seen text[]:=array[]::text[];
 v_role_count integer:=0;v_task_count integer:=0;
 v_existing record;v_approval record;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_EMPLOYEE_APPROVAL_SERVICE_ROLE_ONLY';
 end if;
 if p_owner_id is null or p_message_id is null or
  p_content_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  pg_catalog.jsonb_typeof(p_roles)<>'array' or
  pg_catalog.jsonb_array_length(p_roles) not between 2 and 8 or
  length(p_roles::text)>26000
 then raise exception 'CHAT_EMPLOYEE_APPROVAL_INVALID_INPUT';end if;
 select m.id,m.user_id,m.conversation_id,m.role,m.content into v_message
 from public.reality_chat_messages m
 where m.id=p_message_id and m.user_id=p_owner_id
   and m.role='assistant'
 limit 1;
 if not found or v_message.content is null
   or length(v_message.content)>12000
   or p_content_sha256 <>
     'sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(v_message.content,'UTF8')),'hex')
 then raise exception 'CHAT_EMPLOYEE_APPROVAL_SOURCE_CHANGED_OR_UNVERIFIED';end if;
 for v_role in select value from pg_catalog.jsonb_array_elements(p_roles) loop
  if pg_catalog.jsonb_typeof(v_role)<>'object' or
   v_role->>'employee_name' not in
     ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage') or
   v_role->>'employee_name'=any(v_seen) or
   pg_catalog.jsonb_typeof(v_role->'tasks')<>'array' or
   pg_catalog.jsonb_array_length(v_role->'tasks') not between 1 and 8 or
   pg_catalog.jsonb_object_length(v_role)<>2
  then raise exception 'CHAT_EMPLOYEE_APPROVAL_ROLE_UNVERIFIED';end if;
  v_seen:=array_append(v_seen,v_role->>'employee_name');
  v_role_count:=v_role_count+1;
  for v_task in select value from pg_catalog.jsonb_array_elements(v_role->'tasks') loop
   if pg_catalog.jsonb_typeof(v_task)<>'string' or
    length(v_task #>> '{}')<5 or length(v_task #>> '{}')>270 or
    pg_catalog.btrim(v_task #>> '{}')<>v_task #>> '{}'
   then raise exception 'CHAT_EMPLOYEE_APPROVAL_TASK_UNVERIFIED';end if;
   v_task_count:=v_task_count+1;
  end loop;
 end loop;
 if v_task_count<1 or v_task_count>64 or v_role_count<>array_length(v_seen,1)
 then raise exception 'CHAT_EMPLOYEE_APPROVAL_COUNTS_UNVERIFIED';end if;
 select * into v_existing from
  reality_internal.approved_chat_employee_assignments_v1 a
 where a.owner_id=p_owner_id and a.source_message_id=p_message_id;
 if found and (v_existing.source_content_sha256<>p_content_sha256 or
   v_existing.conversation_id<>v_message.conversation_id or
   v_existing.roles<>p_roles or
   v_existing.role_count<>v_role_count or
   v_existing.task_count<>v_task_count)
 then raise exception 'CHAT_EMPLOYEE_APPROVAL_EXISTING_SNAPSHOT_CONFLICT';end if;
 if not found then
  insert into reality_internal.approved_chat_employee_assignments_v1(
   owner_id,source_message_id,conversation_id,source_content_sha256,
   roles,role_count,task_count)
  values(p_owner_id,p_message_id,v_message.conversation_id,
   p_content_sha256,p_roles,v_role_count,v_task_count)
  on conflict (owner_id,source_message_id) do nothing;
 end if;
 select * into v_approval from
  reality_internal.approved_chat_employee_assignments_v1 a
 where a.owner_id=p_owner_id and a.source_message_id=p_message_id;
 if not found or v_approval.roles<>p_roles or
  v_approval.source_content_sha256<>p_content_sha256
 then raise exception 'CHAT_EMPLOYEE_APPROVAL_ATOMIC_READBACK_FAILED';end if;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_EMPLOYEE_ASSIGNMENTS_DURABLY_APPROVED',
  'approval_id',v_approval.approval_id,
  'source_message_id',v_approval.source_message_id,
  'conversation_id',v_approval.conversation_id,
  'source_content_sha256',v_approval.source_content_sha256,
  'role_count',v_approval.role_count,'task_count',v_approval.task_count,
  'roles',v_approval.roles,
  'approved_at',v_approval.approved_at,
  'owner_scope_verified',true,
  'source_message_bound',true,
  'job_list_assignments_persisted',true,
  'source_qualification_still_required',true,
  'shift_execution_authorized',false,
  'original_job_created',false,
  'capability_installation_authorized',false,
  'production_changed',false);
end;
$$;
revoke all on function public.reality_record_owner_chat_employee_assignments_v1(
 uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_owner_chat_employee_assignments_v1(
 uuid,uuid,text,jsonb) to service_role;

create or replace function public.reality_read_owner_chat_employee_assignments_v1(
 p_owner_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare v_approved jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_EMPLOYEE_ASSIGNMENTS_READ_SERVICE_ROLE_ONLY';
 end if;
 if p_owner_id is null then
  raise exception 'CHAT_EMPLOYEE_ASSIGNMENTS_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'approval_id',x.approval_id,
    'source_message_id',x.source_message_id,
    'conversation_id',x.conversation_id,
    'source_content_sha256',x.source_content_sha256,
    'roles',x.roles,
    'role_count',x.role_count,'task_count',x.task_count,
    'approval_status',x.approval_status,
    'approved_at',x.approved_at,
    'shift_execution_authorized',false,
    'installation_authorized',false,
    'production_changed',false)
   order by x.approved_at desc), '[]'::jsonb)
 into v_approved
 from (select * from
  reality_internal.approved_chat_employee_assignments_v1 a
  where a.owner_id=p_owner_id
  order by a.approved_at desc limit 12) x;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_APPROVED_CHAT_EMPLOYEE_JOB_LIST_READBACK',
  'owner_scope_verified',true,
  'approvals',v_approved,
  'approvals_count',pg_catalog.jsonb_array_length(v_approved),
  'read_only',true,
  'work_execution_authorized_by_read',false,
  'installation_authorized',false,
  'production_changed',false);
end;
$$;
revoke all on function public.reality_read_owner_chat_employee_assignments_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_chat_employee_assignments_v1(uuid)
 to service_role;
