-- Upgrade the EXISTING unattended weekly planner; no new shift or worker.
-- Legacy 3-key snapshots still read; new 4-key snapshots require bounded,
-- source-checked, investigation-only qualification before appearing in Home.
CREATE OR REPLACE FUNCTION public.reality_store_next_week_source_snapshot_v1(p_week_start date, p_open_issues jsonb, p_source_sha256 text, p_source_complete boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    or (
     (select array_agg(k order by k) from jsonb_object_keys(x) k)
      is distinct from array['issue_number','issue_url','title']
     and (select array_agg(k order by k) from jsonb_object_keys(x) k)
      is distinct from array['issue_number','issue_url','qualification','title'])
    or (x ? 'qualification' and (
      jsonb_typeof(x->'qualification') is distinct from 'object'
      or (case when jsonb_typeof(x->'qualification')='object' then
       (select array_agg(k order by k) from jsonb_object_keys(x->'qualification') k)
       else null end) is distinct from
       array['employee','evidence','executable_original','execution_authorized',
        'installation_authorized','next_proof','status','verified_current_defect']
      or (x->'qualification'->>'status') not in
       ('PRIOR_ORIGINAL_SETTLED_NO_REPLAY',
        'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
        'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
        'CURRENT_FAILURE_REPRODUCTION_REQUIRED',
        'SOURCE_REVIEW_NEEDS_CURRENT_PROOF')
      or (x->'qualification'->>'employee') not in
       ('Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage')
      or (x->'qualification'->>'evidence')
       is distinct from 'GITHUB_CURRENT_OPEN_ISSUE_READBACK'
      or length(x->'qualification'->>'next_proof') not between 20 and 260
      or x->'qualification'->'executable_original' is distinct from 'false'::jsonb
      or x->'qualification'->'execution_authorized' is distinct from 'false'::jsonb
      or x->'qualification'->'installation_authorized' is distinct from 'false'::jsonb
      or x->'qualification'->'verified_current_defect' is distinct from 'false'::jsonb
    ))
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
$function$

CREATE OR REPLACE FUNCTION public.reality_read_next_week_source_snapshot_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_week date;
 v_record reality_internal.next_week_employee_source_snapshots_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NEXT_WEEK_SERVICE_ONLY';
 end if;
 v_week := (timezone('America/New_York',now()))::date +
  (8-extract(isodow from (timezone('America/New_York',now()))::date)::int);
 select * into v_record from reality_internal.next_week_employee_source_snapshots_v1
 where week_start=v_week;
 if not found then
  return jsonb_build_object('status','NO_NEXT_WEEK_SOURCE_SNAPSHOT',
   'week_start',to_char(v_week,'YYYY-MM-DD'),
   'shift_execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 if v_record.prepared_at<now()-interval '36 hours' then
  return jsonb_build_object('status','STALE_NEXT_WEEK_SOURCE_SNAPSHOT',
   'week_start',to_char(v_week,'YYYY-MM-DD'),
   'shift_execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 return jsonb_build_object(
  'status','NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED',
  'week_start',to_char(v_record.week_start,'YYYY-MM-DD'),
  'source_scope',v_record.source_scope,
  'source_sha256',v_record.source_sha256,
  'open_issue_count',v_record.open_issue_count,
  'qualification_status',case when
   (select count(*) from jsonb_array_elements(v_record.open_issues) x
    where jsonb_typeof(x->'qualification')='object')=v_record.open_issue_count
    then 'CURRENT_SOURCE_INSPECTED_BEFORE_OWNER_DISCOVERY'
    else 'LEGACY_SOURCE_INSPECTION_PENDING' end,
  'upstream_inspected_count',
   (select count(*) from jsonb_array_elements(v_record.open_issues) x
    where jsonb_typeof(x->'qualification')='object'),
  'employee_source_investigation_assignments',
    (select coalesce(jsonb_agg(jsonb_build_object(
      'issue_number',(x->>'issue_number')::int,
      'source_url',x->>'issue_url','title',x->>'title',
      'status',x->'qualification'->>'status',
      'assigned_employee',x->'qualification'->>'employee',
      'next_proof',x->'qualification'->>'next_proof',
      'executable_original',false,'installation_authorized',false,
      'execution_authorized',false)
      order by (x->>'issue_number')::int),'[]'::jsonb)
      from jsonb_array_elements(v_record.open_issues) x
      where jsonb_typeof(x->'qualification')='object'),
  'prepared_at',to_char(v_record.prepared_at at time zone 'UTC',
                      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'shift_execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end;
$function$
