-- Use the existing signed shift worker to do actual independent source
-- investigation BEFORE any executable repair is admitted.
-- Evidence receipts are NOT customer-job settlements or upgrade authority.
create table if not exists reality_internal.weekly_employee_investigation_receipts_v1(
 shift_id uuid not null,
 owner_id uuid not null,
 week_start date not null,
 snapshot_sha256 text not null check(snapshot_sha256~'^[a-f0-9]{64}$'),
 issue_number integer not null check(issue_number>0),
 source_ref text not null,
 employee text not null,
 issue_updated_at timestamptz not null,
 issue_body_sha256 text not null check(issue_body_sha256~'^sha256:[a-f0-9]{64}$'),
 provider_evidence_sha256 text not null check(provider_evidence_sha256~'^sha256:[a-f0-9]{64}$'),
 evidence_run_id bigint,
 evidence_run_conclusion text not null,
 investigation_status text not null,
 investigation_receipt_id uuid not null default gen_random_uuid(),
 investigated_at timestamptz not null default clock_timestamp(),
 primary key(shift_id,snapshot_sha256,issue_number),
 unique(investigation_receipt_id),
 check(source_ref='https://github.com/maloney2323/Reality/issues/'||issue_number),
 check(employee in ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')),
 check(evidence_run_conclusion in ('NO_RUN_LINK','HISTORICAL_FAILURE','HISTORICAL_SUCCESS','HISTORICAL_NONFINAL')),
 check(investigation_status in (
 'CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
 'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED',
 'CURRENT_SOURCE_INSPECTED_NO_INDEPENDENT_DEFECT_PROOF'))
);
revoke all on reality_internal.weekly_employee_investigation_receipts_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.weekly_employee_investigation_receipts_v1 to service_role;

create or replace function public.reality_read_current_shift_weekly_investigations_v1()
 returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare s record;v_week record;
begin
 if current_user<>'service_role' then raise exception 'WEEKLY_INVESTIGATION_SERVICE_ONLY';end if;
 select sh.shift_id,sh.owner_id,sh.plan_fingerprint into s
  from reality_internal.governed_employee_shifts_v1 sh
  join reality_internal.governed_employee_completion_warrants_v1 w
    on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
    and w.plan_fingerprint=sh.plan_fingerprint
  where sh.closed_at is null and sh.status in
   ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and sh.planned_end_at='infinity'::timestamptz and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS';
 if not found then return jsonb_build_object(
  'status','NO_CURRENT_AUTHORIZED_SHIFT_INVESTIGATION',
  'items','[]'::jsonb,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 select * into v_week from reality_internal.next_week_employee_source_snapshots_v1
 where source_scope='maloney2323/Reality'
 and week_start>=timezone('America/New_York',clock_timestamp())::date
 and week_start<=timezone('America/New_York',clock_timestamp())::date+9
 order by week_start,prepared_at desc limit 1;
 if not found or v_week.source_complete is distinct from true or
  v_week.open_issue_count>30 or v_week.source_sha256 !~ '^[a-f0-9]{64}$'
 then return jsonb_build_object(
  'status','NO_VERIFIED_WEEKLY_SOURCE_SNAPSHOT',
  'items','[]'::jsonb,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','CURRENT_SIGNED_WEEKLY_INVESTIGATION_READBACK',
  'owner_id',s.owner_id,'shift_id',s.shift_id,
  'plan_fingerprint',s.plan_fingerprint,
  'week_start',v_week.week_start,'snapshot_sha256',v_week.source_sha256,
  'items',coalesce((select jsonb_agg(jsonb_build_object(
   'source_ref',t.source_ref,'issue_number',t.issue_number,
   'employee',t.employee,'investigation_status',t.investigation_status,
   'provider_evidence_sha256',t.provider_evidence_sha256,
   'investigation_receipt_ref',
    'supabase:weekly_employee_investigation_receipts_v1:'||
     t.investigation_receipt_id::text,
   'investigated_at',t.investigated_at)
    order by t.issue_number)
   from reality_internal.weekly_employee_investigation_receipts_v1 t
   where t.shift_id=s.shift_id and t.owner_id=s.owner_id
    and t.week_start=v_week.week_start and
    t.snapshot_sha256=v_week.source_sha256),'[]'::jsonb),
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_record_current_shift_weekly_investigation_v1(
 p_source_ref text,p_snapshot_sha256 text,p_issue_number integer,p_employee text,
 p_issue_updated_at timestamptz,p_issue_body_sha256 text,
 p_provider_evidence_sha256 text,p_evidence_run_id bigint,
 p_evidence_run_conclusion text,p_investigation_status text)
 returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare s record;v_week record;q jsonb;v_receipt reality_internal.weekly_employee_investigation_receipts_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'WEEKLY_INVESTIGATION_SERVICE_ONLY';end if;
 select sh.shift_id,sh.owner_id,sh.plan_fingerprint into s
  from reality_internal.governed_employee_shifts_v1 sh
  join reality_internal.governed_employee_completion_warrants_v1 w
    on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
    and w.plan_fingerprint=sh.plan_fingerprint
  where sh.closed_at is null and sh.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and sh.planned_end_at='infinity'::timestamptz and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
   and sh.planned_start_at<=clock_timestamp();
 if not found then raise exception 'WEEKLY_INVESTIGATION_SIGNED_SHIFT_REQUIRED';end if;
 select * into v_week from reality_internal.next_week_employee_source_snapshots_v1
 where source_sha256=p_snapshot_sha256 and source_scope='maloney2323/Reality'
 and week_start>=timezone('America/New_York',clock_timestamp())::date
 and week_start<=timezone('America/New_York',clock_timestamp())::date+9
 order by prepared_at desc limit 1;
 if not found or v_week.source_complete is distinct from true or
  v_week.open_issue_count>30 or v_week.source_sha256 !~ '^[a-f0-9]{64}$'
  or v_week.shift_execution_authorized is distinct from false
  or v_week.installation_authorized is distinct from false
 then raise exception 'WEEKLY_INVESTIGATION_SNAPSHOT_SCOPE_UNVERIFIED';end if;
 if p_source_ref is null or
   p_source_ref<>'https://github.com/maloney2323/Reality/issues/'||p_issue_number::text
   or p_issue_number<1 or p_employee not in
    ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')
   or p_issue_body_sha256 !~ '^sha256:[a-f0-9]{64}$'
   or p_provider_evidence_sha256 !~ '^sha256:[a-f0-9]{64}$'
   or p_issue_updated_at is null or
   p_issue_updated_at>clock_timestamp()+interval '2 minutes'
   or p_evidence_run_conclusion not in
    ('NO_RUN_LINK','HISTORICAL_FAILURE','HISTORICAL_SUCCESS','HISTORICAL_NONFINAL')
   or p_investigation_status not in
    ('CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST',
     'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED',
     'CURRENT_SOURCE_INSPECTED_NO_INDEPENDENT_DEFECT_PROOF')
   or (p_evidence_run_conclusion='NO_RUN_LINK')<>(p_evidence_run_id is null)
   or (p_evidence_run_id is not null and p_evidence_run_id<1)
 then raise exception 'WEEKLY_INVESTIGATION_PROVIDER_EVIDENCE_INVALID';end if;
 select x.value->'qualification' into q
 from jsonb_array_elements(v_week.open_issues) x(value)
 where x.value->>'issue_url'=p_source_ref
 and x.value->>'issue_number'=p_issue_number::text;
 if q is null or q->>'employee'<>p_employee or
  q->>'evidence'<>'GITHUB_CURRENT_OPEN_ISSUE_READBACK' or
  q->>'status'='PRIOR_ORIGINAL_SETTLED_NO_REPLAY' or
  q->'executable_original' is distinct from 'false'::jsonb or
  q->'execution_authorized' is distinct from 'false'::jsonb or
  q->'installation_authorized' is distinct from 'false'::jsonb
 then raise exception 'WEEKLY_INVESTIGATION_EXACT_UNSETTLED_ASSIGNMENT_REQUIRED';end if;
 insert into reality_internal.weekly_employee_investigation_receipts_v1(
  shift_id,owner_id,week_start,snapshot_sha256,issue_number,source_ref,
  employee,issue_updated_at,issue_body_sha256,provider_evidence_sha256,
  evidence_run_id,evidence_run_conclusion,investigation_status)
 values(s.shift_id,s.owner_id,v_week.week_start,v_week.source_sha256,
  p_issue_number,p_source_ref,p_employee,p_issue_updated_at,
  p_issue_body_sha256,p_provider_evidence_sha256,p_evidence_run_id,
  p_evidence_run_conclusion,p_investigation_status)
 on conflict(shift_id,snapshot_sha256,issue_number) do nothing;
 select * into v_receipt from reality_internal.weekly_employee_investigation_receipts_v1
 where shift_id=s.shift_id and snapshot_sha256=v_week.source_sha256
 and issue_number=p_issue_number;
 if v_receipt.source_ref<>p_source_ref or v_receipt.employee<>p_employee
  or v_receipt.provider_evidence_sha256<>p_provider_evidence_sha256
  or v_receipt.issue_body_sha256<>p_issue_body_sha256
  or v_receipt.investigation_status<>p_investigation_status
 then raise exception 'WEEKLY_INVESTIGATION_REPEAT_EVIDENCE_DRIFT';end if;
 return jsonb_build_object(
  'status','WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATION_DURABLY_RECORDED',
  'shift_id',s.shift_id,'owner_id',s.owner_id,'source_ref',v_receipt.source_ref,
  'issue_number',v_receipt.issue_number,'employee',v_receipt.employee,
  'investigation_status',v_receipt.investigation_status,
  'investigation_receipt_ref',
   'supabase:weekly_employee_investigation_receipts_v1:'||
    v_receipt.investigation_receipt_id::text,
  'source_investigated',true,
  'executable_original_admitted',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_current_shift_weekly_investigations_v1() from public,anon,authenticated;
grant execute on function public.reality_read_current_shift_weekly_investigations_v1() to service_role;
revoke all on function public.reality_record_current_shift_weekly_investigation_v1(
 text,text,integer,text,timestamptz,text,text,bigint,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_current_shift_weekly_investigation_v1(
 text,text,integer,text,timestamptz,text,text,bigint,text,text)
 to service_role;
