-- Reality read-only Riley source inventory for owner-authenticated Chat.
-- The unattended planner is the source of truth; an issue is NOT an
-- executable original job, a new capability grant, or settled work.
create or replace function public.reality_read_current_riley_source_work_v1()
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_record reality_internal.next_week_employee_source_snapshots_v1%rowtype;
 v_items jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_WORK_SOURCE_SERVICE_ONLY';
 end if;
 select * into v_record from reality_internal.next_week_employee_source_snapshots_v1
 order by prepared_at desc limit 1;
 if not found then
  return jsonb_build_object('status','RILEY_SOURCE_SNAPSHOT_NOT_AVAILABLE',
   'shift_execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 if v_record.prepared_at<now()-interval '36 hours' or
    v_record.prepared_at>now()+interval '5 minutes' or
    v_record.source_scope<>'maloney2323/Reality' or
    v_record.source_complete is distinct from true or
    v_record.open_issue_count<>jsonb_array_length(v_record.open_issues) then
  return jsonb_build_object('status','RILEY_SOURCE_SNAPSHOT_NOT_CURRENT',
   'shift_execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 select coalesce(jsonb_agg(item order by (item->>'issue_number')::integer desc),'[]'::jsonb)
 into v_items from (
  select value as item from jsonb_array_elements(v_record.open_issues)
  order by (value->>'issue_number')::integer desc limit 12
 ) observed;
 return jsonb_build_object(
  'version','reality-riley-source-work-v1',
  'status','RILEY_CURRENT_SOURCE_BACKLOG_UNQUALIFIED',
  'source_scope',v_record.source_scope,
  'source_sha256',v_record.source_sha256,
  'source_prepared_at',to_char(v_record.prepared_at at time zone 'UTC',
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'open_issue_count',v_record.open_issue_count,
  'source_issues',v_items,
  'omitted_source_issue_count',greatest(0,v_record.open_issue_count-jsonb_array_length(v_items)),
  'original_job_qualified',false,
  'shift_execution_authorized',false,
  'installation_authorized',false,'production_changed',false
 );
end;
$$;
revoke all on function public.reality_read_current_riley_source_work_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_current_riley_source_work_v1()
 to service_role;
