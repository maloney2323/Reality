-- Reality owner-private live shift activity, no model-generated "thoughts".
-- Timestamps come from the DB's existing claims / independently verified
-- receipts, and from actual authenticated preview worker pulse acknowledgments.
create table if not exists reality_internal.governed_employee_shift_worker_pulses_v1 (
 shift_id uuid primary key references
  reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 first_worker_seen_at timestamptz not null default clock_timestamp(),
 last_worker_seen_at timestamptz not null default clock_timestamp(),
 last_worker_completed_at timestamptz,
 wake_count integer not null default 1 check(wake_count between 1 and 2147483647),
 last_worker_status text not null
  check(last_worker_status in ('WAKE_RECEIVED','WAKE_COMPLETED','WAKE_FAILED')),
 last_worker_safe_result text
);
revoke all on reality_internal.governed_employee_shift_worker_pulses_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_employee_shift_worker_pulses_v1
 to service_role;

create or replace function public.reality_record_employee_shift_worker_pulse_v1(
 p_shift_id uuid,p_status text,p_safe_result text default null
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift record;v_seen timestamptz:=clock_timestamp();v record;
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_WORKER_PULSE_SERVICE_ROLE_REQUIRED';end if;
 if p_shift_id is null or p_status not in
  ('WAKE_RECEIVED','WAKE_COMPLETED','WAKE_FAILED') or
  (p_safe_result is not null and
   (length(p_safe_result)>100 or p_safe_result !~ '^[A-Z0-9_]+$'))
 then raise exception 'SHIFT_WORKER_PULSE_STATUS_INVALID';end if;
 select s.shift_id,s.owner_id into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 where s.shift_id=p_shift_id
   and s.authorized_at is not null
   and s.planned_start_at<=v_seen
   and (s.planned_end_at='infinity'::timestamptz
    or s.planned_end_at>v_seen)
   and s.closed_at is null
   and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 for update;
 if not found then
  return jsonb_build_object('status','NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE',
   'worker_started',false,'installation_authorized',false);end if;
 insert into reality_internal.governed_employee_shift_worker_pulses_v1(
  shift_id,owner_id,first_worker_seen_at,last_worker_seen_at,
  last_worker_completed_at,wake_count,last_worker_status,last_worker_safe_result)
 values(v_shift.shift_id,v_shift.owner_id,v_seen,v_seen,
  case when p_status<>'WAKE_RECEIVED' then v_seen else null end,
  1,p_status,p_safe_result)
 on conflict(shift_id) do update
  set last_worker_seen_at=v_seen,
   last_worker_completed_at=case when p_status<>'WAKE_RECEIVED'
    then v_seen else reality_internal.governed_employee_shift_worker_pulses_v1.last_worker_completed_at end,
   wake_count=case when p_status='WAKE_RECEIVED'
    then least(reality_internal.governed_employee_shift_worker_pulses_v1.wake_count+1,2147483647)
    else reality_internal.governed_employee_shift_worker_pulses_v1.wake_count end,
   last_worker_status=p_status,last_worker_safe_result=p_safe_result
 where reality_internal.governed_employee_shift_worker_pulses_v1.owner_id=excluded.owner_id
 returning shift_id,owner_id,first_worker_seen_at,last_worker_seen_at,
  last_worker_completed_at,wake_count,last_worker_status into v;
 if not found then raise exception 'SHIFT_WORKER_PULSE_OWNER_CHANGED';end if;
 return jsonb_build_object(
  'status','SHIFT_WORKER_PULSE_DURABLY_RECORDED',
  'shift_id',v.shift_id,'first_worker_seen_at',v.first_worker_seen_at,
  'last_worker_seen_at',v.last_worker_seen_at,
  'last_worker_completed_at',v.last_worker_completed_at,
  'wake_count',v.wake_count,'worker_status',v.last_worker_status,
  'job_started_by_pulse',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_record_employee_shift_worker_pulse_v1(
 uuid,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_employee_shift_worker_pulse_v1(
 uuid,text,text) to service_role;

-- Worker chooses no owner or shift from its HTTP request; the existing
-- exact service-only authorized window selects the sole current shift.
create or replace function public.reality_record_current_shift_worker_pulse_v1(
 p_status text,p_safe_result text default null
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift_id uuid;v_count int;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_CURRENT_WORKER_PULSE_SERVICE_ROLE_REQUIRED';end if;
 select count(*),min(s.shift_id) into v_count,v_shift_id
 from reality_internal.governed_employee_shifts_v1 s
 where s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=v_now and
  (s.planned_end_at='infinity'::timestamptz or s.planned_end_at>v_now);
 if v_count=0 then
  return jsonb_build_object('status','NO_CURRENT_AUTHORIZED_SHIFT_FOR_WORKER_PULSE',
   'worker_started',false,'installation_authorized',false);end if;
 if v_count<>1 then
  raise exception 'MULTIPLE_OWNER_WORKER_PULSE_SCOPES_AMBIGUOUS';end if;
 return public.reality_record_employee_shift_worker_pulse_v1(
  v_shift_id,p_status,p_safe_result);
end $fn$;
revoke all on function public.reality_record_current_shift_worker_pulse_v1(
 text,text) from public,anon,authenticated;
grant execute on function public.reality_record_current_shift_worker_pulse_v1(
 text,text) to service_role;

create or replace function public.reality_read_owner_shift_live_activity_v1(
 p_owner_id uuid,p_shift_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_s record;v_p record;v_events jsonb;v_originals jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_ACTIVITY_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_shift_id is null then
  raise exception 'SHIFT_ACTIVITY_SCOPE_REQUIRED';end if;
 select s.* into v_s from reality_internal.governed_employee_shifts_v1 s
 where s.owner_id=p_owner_id and s.shift_id=p_shift_id;
 if not found then return jsonb_build_object(
  'status','NO_OWNER_SCOPED_SHIFT_ACTIVITY',
  'shift_id',p_shift_id,'original_job_completed',false);end if;
 select * into v_p from
  reality_internal.governed_employee_shift_worker_pulses_v1 p
 where p.shift_id=v_s.shift_id and p.owner_id=v_s.owner_id;
 select coalesce(jsonb_agg(jsonb_build_object(
  'event_kind',e.event_kind,'stage',e.stage,
  'step_index',e.step_index,'observed_at',e.observed_at,
  'state',e.state,'source_ref',e.source_ref,
  'source_status',e.source_status,
  'proof_sha256',e.proof_sha256,
  'worker_action_not_a_job_settlement',true)
  order by e.observed_at,e.step_index),'[]'::jsonb)
 into v_events from (
  select 'SOURCE_STEP_CLAIMED'::text event_kind,
   t.stage,t.step_index,t.claimed_at observed_at,
   'CLAIMED'::text state,t.source_ref,t.source_status,
   null::text proof_sha256
  from reality_internal.governed_employee_shift_steps_v1 t
  where t.shift_id=v_s.shift_id and t.claimed_at is not null
  union all
  select case when t.state='ORIGINAL_JOB_RECEIPT_VERIFIED' then
      'ORIGINAL_RECEIPT_MATCHED'
    when t.state='BLOCKED_PROVIDER' then 'STEP_BLOCKED'
    when t.state='REPORTED' then 'FINAL_REPORT_RECORDED'
    else 'SOURCE_STEP_VERIFIED' end,
   t.stage,t.step_index,t.completed_at,t.state,
   t.source_ref,t.source_status,t.proof_sha256
  from reality_internal.governed_employee_shift_steps_v1 t
  where t.shift_id=v_s.shift_id and t.completed_at is not null
 ) e;
 select coalesce(jsonb_agg(jsonb_build_object(
  'original_work_id',j.original_work_id,'kind',j.kind,
  'phase',j.phase,'source_ref',j.source_ref,
  'recorded_at',j.recorded_at,
  'completed_at',j.completed_at,
  'verified_final_receipt',j.verified_final_receipt,
  'provider_link',j.provider_link
 ) order by j.recorded_at,j.original_work_id),'[]'::jsonb)
 into v_originals from (
  select a.original_work_id,'PR_REVIEW'::text kind,a.phase,
   a.source_ref,a.created_at recorded_at,a.settled_at completed_at,
   (a.phase='SETTLED' and a.settlement_receipt_id is not null
    and a.independent_provider_digest~'^sha256:[a-f0-9]{64}$'
    and a.settled_at>=v_s.authorized_at) as verified_final_receipt,
   a.provider_comment_url provider_link
  from reality_internal.riley_pr_review_originals_v1 a
  where a.shift_id=v_s.shift_id and a.owner_id=v_s.owner_id
  union all
  select r.original_work_id,'CODE_REPAIR'::text,r.phase,
   r.issue_url,r.requested_at,null::timestamptz,
   false,null::text
  from reality_internal.riley_unattended_repair_originals_v1 r
  where r.shift_id=v_s.shift_id and r.owner_id=v_s.owner_id
  union all
  select t.original_work_id,'FAILURE_TRIAGE'::text,t.phase,
   t.source_ref,t.created_at,t.settled_at,
   (t.phase='SETTLED' and t.settlement_receipt_id is not null
    and t.settled_at>=v_s.authorized_at),
   t.provider_comment_url
  from reality_internal.riley_shift_failure_triage_v1 t
  where t.shift_id=v_s.shift_id and t.owner_id=v_s.owner_id
  union all
  select c.original_work_id,'GOVERNED_CAPABILITY'::text,c.phase,
   c.source_ref,c.created_at,
   r.verified_at,
   (c.phase='RECEIPT_INDEPENDENTLY_RECONCILED' and
    c.independent_receipt_event_id=r.verified_settlement_event_id and
    r.production_changed=false and r.verified_at>=c.created_at),
   null::text
  from reality_internal.governed_employee_original_claims_v1 c
  left join reality_internal.genuine_independent_final_receipts_v1 r
   on r.owner_id=c.owner_id and r.original_work_id=c.original_work_id
  where c.shift_id=v_s.shift_id and c.owner_id=v_s.owner_id
 ) j;
 return jsonb_build_object(
  'status','OWNER_SHIFT_LIVE_ACTIVITY_INDEPENDENT_READBACK',
  'shift_id',v_s.shift_id,'owner_bound',true,
  'shift_status',v_s.status,'authorized_at',v_s.authorized_at,
  'planned_start_at',v_s.planned_start_at,
  'completion_bound',v_s.planned_end_at='infinity'::timestamptz,
  'last_progress_at',v_s.last_progress_at,
  'closed_at',v_s.closed_at,
  'last_worker_status',v_p.last_worker_status,
  'first_worker_seen_at',v_p.first_worker_seen_at,
  'last_worker_seen_at',v_p.last_worker_seen_at,
  'last_worker_completed_at',v_p.last_worker_completed_at,
  'worker_wake_count',v_p.wake_count,
  'source_events',v_events,
  'original_jobs',v_originals,
  'final_receipt',case when v_s.status='ENDED_WITH_VERIFIED_JOB'
    then v_s.close_report else null end,
  'as_of',clock_timestamp(),
  'original_job_completed_by_readback',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_shift_live_activity_v1(
 uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_shift_live_activity_v1(
 uuid,uuid) to service_role;
