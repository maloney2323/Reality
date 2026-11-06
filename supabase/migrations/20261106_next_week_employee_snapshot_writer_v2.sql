-- Post-deployment correction to JSONB operator precedence in service-only weekly snapshot writer.
create or replace function public.reality_store_next_week_source_snapshot_v1(
 p_week_start date,p_open_issues jsonb,p_source_sha256 text,
 p_source_complete boolean
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare v_week date;
 v_count integer;
 v_record reality_internal.next_week_employee_source_snapshots_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NEXT_WEEK_SERVICE_ONLY';
 end if;
 v_week := (timezone('America/New_York',now()))::date +
  (8-extract(isodow from (timezone('America/New_York',now()))::date)::int);
 if p_week_start is distinct from v_week
  or p_source_sha256 is null
  or p_source_sha256 !~ '^[a-f0-9]{64}$'
  or p_source_complete is distinct from true
  or jsonb_typeof(p_open_issues) is distinct from 'array'
  or jsonb_array_length(p_open_issues)>150 then
  raise exception 'NEXT_WEEK_EXACT_SOURCE_SCOPE_INVALID';
 end if;
 v_count:=jsonb_array_length(p_open_issues);
 if exists(select 1 from jsonb_array_elements(p_open_issues) x
  where jsonb_typeof(x) <> 'object'
    or (select array_agg(k order by k) from jsonb_object_keys(x) k)
        is distinct from array['issue_number','issue_url','title']
    or jsonb_typeof(x->'issue_number') is distinct from 'number'
    or (x->>'issue_number') !~ '^[1-9][0-9]{0,7}$'
    or (x->>'issue_number')::bigint>2147483647
    or x->>'issue_url' is distinct from
       ('https://github.com/maloney2323/Reality/issues/'||(x->>'issue_number'))
    or jsonb_typeof(x->'title') is distinct from 'string'
    or length(x->>'title') not between 1 and 200
 ) or (select count(distinct (x->>'issue_number')) from
   jsonb_array_elements(p_open_issues) x) <> v_count then
  raise exception 'NEXT_WEEK_PROVIDER_ISSUES_INVALID_OR_DUPLICATED';
 end if;
 insert into reality_internal.next_week_employee_source_snapshots_v1(
  week_start,source_sha256,open_issues,open_issue_count,
  source_complete,prepared_at)
 values(p_week_start,p_source_sha256,p_open_issues,v_count,true,now())
 on conflict(week_start) do update set
  source_sha256=excluded.source_sha256,
  open_issues=excluded.open_issues,
  open_issue_count=excluded.open_issue_count,
  source_complete=true,
  prepared_at=excluded.prepared_at
 returning * into v_record;
 return jsonb_build_object(
  'status','NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED',
  'week_start',to_char(v_record.week_start,'YYYY-MM-DD'),
  'source_scope',v_record.source_scope,
  'source_sha256',v_record.source_sha256,
  'open_issue_count',v_record.open_issue_count,
  'prepared_at',to_char(v_record.prepared_at at time zone 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'shift_execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end;
$$;
