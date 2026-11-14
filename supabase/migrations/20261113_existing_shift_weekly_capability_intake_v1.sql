-- Frozen source observations from the already scheduled next-week preparation.
-- This is intentionally read-only: it does NOT create original jobs, amend an
-- authorized shift, grant authority, install capabilities, or settle originals.
create or replace function public.reality_read_owner_shift_weekly_backlog_v1(
 p_owner_id uuid,p_shift_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_shift record;v_week record;v_item jsonb;v_refs text[]:=array[]::text[];
declare_now date:= (pg_catalog.timezone('America/New_York',pg_catalog.clock_timestamp()))::date;
begin
 if current_user<>'service_role' then
  raise exception 'WEEKLY_BACKLOG_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null or p_shift_id is null then
  raise exception 'WEEKLY_BACKLOG_OWNER_AND_SHIFT_REQUIRED';
 end if;
 select s.owner_id,s.shift_id,s.plan_fingerprint into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 where s.owner_id=p_owner_id and s.shift_id=p_shift_id
  and s.closed_at is null and s.status in
    ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
  and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  and w.state='ACTIVE' and s.planned_end_at='infinity'::timestamptz;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_CURRENT_OWNER_AUTHORIZED_SHIFT_FOR_SOURCE_BACKLOG',
   'owner_scope_verified',false,'shift_id',p_shift_id,
   'open_issues','[]'::jsonb,'installation_authorized',false,
   'execution_authorized_by_read',false,'production_changed',false);
 end if;
 select w.* into v_week
 from reality_internal.next_week_employee_source_snapshots_v1 w
 where w.week_start>=declare_now
   and w.week_start<=declare_now+9
   and w.week_start=(
      select min(w2.week_start)
      from reality_internal.next_week_employee_source_snapshots_v1 w2
      where w2.week_start>=declare_now and w2.week_start<=declare_now+9)
 order by w.prepared_at desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_FRESH_WEEK_SOURCE_SNAPSHOT',
   'owner_scope_verified',true,'shift_id',p_shift_id,
   'open_issues','[]'::jsonb,'installation_authorized',false,
   'execution_authorized_by_read',false,'production_changed',false);
 end if;
 if v_week.source_scope<>'maloney2323/Reality'
  or v_week.source_complete is not true
  or v_week.shift_execution_authorized is distinct from false
  or v_week.installation_authorized is distinct from false
  or v_week.production_changed is distinct from false
  or v_week.open_issue_count<0 or v_week.open_issue_count>30
  or v_week.source_sha256 !~ '^[a-f0-9]{64}$'
  or pg_catalog.jsonb_typeof(v_week.open_issues)<>'array'
  or pg_catalog.jsonb_array_length(v_week.open_issues)<>v_week.open_issue_count
  or v_week.prepared_at is null or
    v_week.prepared_at>pg_catalog.clock_timestamp()+interval '2 minutes'
 then raise exception 'WEEKLY_BACKLOG_FROZEN_SOURCE_UNVERIFIED';end if;
 for v_item in select value from pg_catalog.jsonb_array_elements(v_week.open_issues) loop
  if jsonb_typeof(v_item)<>'object'
   or (v_item->>'issue_url') !~
     '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
   or (v_item->>'issue_number') !~ '^[1-9][0-9]*$'
   or split_part(v_item->>'issue_url','/issues/',2) <>
      (v_item->>'issue_number')
   or length(v_item->>'title')<5
   or length(v_item->>'title')>220
   or v_item->>'issue_url'=any(v_refs)
  then raise exception 'WEEKLY_BACKLOG_SOURCE_ITEM_UNVERIFIED';end if;
  v_refs:=array_append(v_refs,v_item->>'issue_url');
 end loop;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_WEEKLY_SOURCE_SNAPSHOT_RECONCILED_READ_ONLY',
  'owner_scope_verified',true,
  'shift_id',p_shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'week_start',v_week.week_start,
  'prepared_at',v_week.prepared_at,
  'source_sha256',v_week.source_sha256,
  'open_issue_count',v_week.open_issue_count,
  'open_issues',v_week.open_issues,
  'snapshot_is_original_job_qualification',false,
  'snapshot_is_new_execution_authority',false,
  'installation_authorized',false,
  'execution_authorized_by_read',false,
  'production_changed',false);
end;
$$;
revoke all on function public.reality_read_owner_shift_weekly_backlog_v1(uuid,uuid)
 from public, anon, authenticated;
grant execute on function public.reality_read_owner_shift_weekly_backlog_v1(uuid,uuid)
 to service_role;
