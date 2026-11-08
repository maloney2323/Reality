-- Completion-bound Reality employee work warrant. Isolated owner-verified preview only.
-- An eight-slot legacy plan remains ONLY a budgeting/step-order preflight.
-- Its 8-hour estimate does not authorize expiry of an unfinished customer job.
-- Exact frozen sources and an immutable shift fingerprint remain the boundary.
-- Individual provider claims and approval/installation warrants are unchanged.

create table if not exists reality_internal.governed_employee_completion_warrants_v1 (
 shift_id uuid primary key references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 plan_fingerprint text not null check (plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 source_scope jsonb not null check(jsonb_typeof(source_scope)='array'
  and jsonb_array_length(source_scope) between 1 and 4),
 mode text not null default 'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  check(mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'),
 state text not null default 'ACTIVE'
  check(state in ('ACTIVE','SETTLED','PAUSED_FOR_OWNER_REVIEW','CANCELLED')),
 authorized_at timestamptz not null default clock_timestamp(),
 settled_at timestamptz,
 completion_receipt jsonb,
 constraint completion_warrant_settlement_integrity check(
  (state='SETTLED')=(settled_at is not null and completion_receipt is not null))
);
revoke all on reality_internal.governed_employee_completion_warrants_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_employee_completion_warrants_v1
 to service_role;

-- Existing timer-bound shifts remain exactly as before. The only exception
-- is an infinity sentinel issued by the separate completion-bound RPC.
alter table reality_internal.governed_employee_shifts_v1
 drop constraint if exists governed_employee_shifts_v1_allowed_hours_v3;
alter table reality_internal.governed_employee_shifts_v1
 add constraint governed_employee_shifts_v1_allowed_hours_v4 check (
  ((planned_end_at-planned_start_at >= interval '1 hour')
   and (planned_end_at-planned_start_at <= interval '12 hours')
   and mod(extract(epoch from (planned_end_at-planned_start_at)),3600)=0)
  or planned_end_at='infinity'::timestamptz
 );

create or replace function public.reality_authorize_employee_completion_shift_v1(
 p_owner_id uuid,p_fingerprint text,p_source_observed_at timestamptz,
 p_start_at timestamptz,p_steps jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_receipt jsonb;v_shift uuid;v_now timestamptz:=clock_timestamp();
 v_source_scope jsonb;v_count int;v_plan_minutes int;
begin
 if current_user<>'service_role' then
  raise exception 'COMPLETION_WARRANT_SERVICE_ROLE_ONLY';end if;
 if p_owner_id is null or p_fingerprint !~ '^sha256:[a-f0-9]{64}$'
  or jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)<>8
 then raise exception 'COMPLETION_WARRANT_PLAN_INVALID';end if;
 -- Serialize starts per owner. This is NOT an authorization to reuse an
 -- expired, previously claimed or already settled original job.
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_owner_id::text,7209));
 if exists(select 1 from reality_internal.governed_employee_shifts_v1 s
   where s.owner_id=p_owner_id and s.closed_at is null
    and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
    and s.planned_end_at>v_now)
 then raise exception 'CURRENT_OWNER_SHIFT_ALREADY_ACTIVE_NO_DUPLICATE';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'step_index',(x.value->>'sequence')::int,
  'source_ref',x.value#>>'{candidate,source_url}'
 ) order by (x.value->>'sequence')::int),'[]'::jsonb)
 into v_source_scope
 from jsonb_array_elements(p_steps) x
 where (x.value->>'sequence')::int between 2 and 5
  and nullif(x.value#>>'{candidate,source_url}','') is not null;
 v_count:=jsonb_array_length(v_source_scope);
 if v_count<1 or v_count>4 or
  exists(select 1 from jsonb_array_elements(v_source_scope) x
   where (x->>'source_ref') !~
    '^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]*$') or
  (select count(distinct x->>'source_ref')
   from jsonb_array_elements(v_source_scope) x)<>v_count
 then raise exception 'COMPLETION_WARRANT_SOURCE_SCOPE_INVALID';end if;
 v_plan_minutes:=(p_steps->7->>'offset_end_minutes')::int;
 if v_plan_minutes<60 or v_plan_minutes>720
 then raise exception 'COMPLETION_WARRANT_STEP_PLAN_INVALID';end if;
 -- Reuse the exact source-fingerprinted legacy admission and all eight
 -- step-boundary checks inside one transaction.
 v_receipt:=public.reality_authorize_employee_shift_v1(
  p_owner_id,p_fingerprint,p_source_observed_at,p_start_at,p_steps);
 if v_receipt->>'status'<>'SHIFT_DURABLY_AUTHORIZED' then
  raise exception 'COMPLETION_WARRANT_NEW_EXACT_SHIFT_REQUIRED';end if;
 v_shift:=(v_receipt->>'shift_id')::uuid;
 update reality_internal.governed_employee_shifts_v1 s
 set planned_end_at='infinity'::timestamptz
 where s.shift_id=v_shift and s.owner_id=p_owner_id
  and s.plan_fingerprint=p_fingerprint
  and s.planned_start_at=p_start_at
  and s.planned_end_at=p_start_at+make_interval(mins=>v_plan_minutes)
  and s.status='QUEUED' and s.closed_at is null;
 if not found then raise exception 'COMPLETION_WARRANT_NOT_DURABLY_BOUND';end if;
 insert into reality_internal.governed_employee_completion_warrants_v1(
  shift_id,owner_id,plan_fingerprint,source_scope)
 values(v_shift,p_owner_id,p_fingerprint,v_source_scope);
 return jsonb_build_object(
  'status','SHIFT_DURABLY_AUTHORIZED','shift_id',v_shift,
  'owner_scope_verified',true,'completion_bound',true,
  'completion_condition','ALL_SELECTED_JOBS_INDEPENDENTLY_VERIFIED_AND_RECEIPTED',
  'per_job_atomic_claims_required',true,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_authorize_employee_completion_shift_v1(
 uuid,text,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.reality_authorize_employee_completion_shift_v1(
 uuid,text,timestamptz,timestamptz,jsonb) to service_role;

-- This RPC is called before every ordinary shift pulse. It DOES NOT
-- close on elapsed time or count model advice/source checks as completion.
-- Each selected source requires its own current, independently final receipt.
create or replace function public.reality_close_employee_completion_shift_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_shift record;v_item jsonb;v_source text;v_index int;
 v_proof text;v_work text;v_now timestamptz:=clock_timestamp();
 v_total int:=0;v_verified int:=0;v_events jsonb:='[]'::jsonb;
 v_work_ids text[]:=array[]::text[];v_receipt jsonb;v_hash text;
begin
 if current_user<>'service_role' then
  raise exception 'COMPLETION_CLOSURE_SERVICE_ROLE_ONLY';end if;
 select s.*,w.source_scope into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 where w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  and w.state='ACTIVE' and s.planned_end_at='infinity'::timestamptz
  and s.planned_start_at<=v_now and s.closed_at is null
  and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 order by s.planned_start_at,s.created_at
 for update of s skip locked limit 1;
 if not found then
  return jsonb_build_object('status','NO_COMPLETION_BOUND_SHIFT_READY');end if;
 if not exists(select 1 from reality_internal.governed_employee_shift_steps_v1 t
   where t.shift_id=v_shift.shift_id and t.step_index=1
    and t.state='SOURCE_CHECKED')
 then return jsonb_build_object('status','COMPLETION_WAITING_FOR_SOURCE_VALIDATION',
  'shift_id',v_shift.shift_id,'original_jobs_independently_settled',0);end if;
 v_total:=jsonb_array_length(v_shift.source_scope);
 if v_total<1 or v_total>4 then
  raise exception 'COMPLETION_WARRANT_SCOPE_CHANGED';end if;
 for v_item in select value from jsonb_array_elements(v_shift.source_scope) loop
  v_index:=(v_item->>'step_index')::int;
  v_source:=v_item->>'source_ref';
  select t.proof_sha256 into v_proof
  from reality_internal.governed_employee_shift_steps_v1 t
  where t.shift_id=v_shift.shift_id
   and t.step_index=v_index
   and t.source_ref=v_source and t.state='SOURCE_CHECKED'
   and t.proof_sha256~'^sha256:[a-f0-9]{64}$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'provider_checked'='true'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false';
  if v_proof is null then
   return jsonb_build_object('status','COMPLETION_WAITING_FOR_SOURCE_VALIDATION',
    'shift_id',v_shift.shift_id,
    'original_jobs_independently_settled',v_verified);end if;
  v_work:=null;
  if v_source~'^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$' then
   select j.original_work_id into v_work
   from reality_internal.riley_pr_review_originals_v1 j
   where j.shift_id=v_shift.shift_id and j.owner_id=v_shift.owner_id
    and j.source_ref=v_source and j.source_proof_sha256=v_proof
    and j.phase='SETTLED' and j.settled_at>=v_shift.authorized_at
    and j.model_response_id~'^resp_[A-Za-z0-9_-]+$'
    and j.provider_comment_id is not null
    and j.provider_comment_url~'^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*#issuecomment-[1-9][0-9]*$'
    and j.independent_provider_digest~'^sha256:[a-f0-9]{64}$'
    and j.settlement_receipt_id is not null
   limit 2;
  elsif v_source~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$' then
   select c.original_work_id into v_work
   from reality_internal.governed_employee_original_claims_v1 c
   join reality_internal.genuine_independent_final_receipts_v1 r
    on r.owner_id=c.owner_id and r.original_work_id=c.original_work_id
    and r.verified_settlement_event_id=c.independent_receipt_event_id
    and r.verified_at>=c.created_at and r.production_changed=false
   join reality_internal.genuine_capability_queue_v1 q
    on q.owner_id=c.owner_id and q.original_work_id=c.original_work_id
    and q.original_work_event_id=c.source_event_id
    and q.phase='SETTLED_ISOLATED'
    and q.qualified_candidate->>'artifact_sha256'=r.artifact_sha256
   where c.shift_id=v_shift.shift_id and c.owner_id=v_shift.owner_id
    and c.source_ref=v_source and c.source_proof_sha256=v_proof
    and c.phase='RECEIPT_INDEPENDENTLY_RECONCILED'
    and c.independent_receipt_event_id is not null
   limit 2;
  end if;
  if v_work is null or v_work=any(v_work_ids) then
   return jsonb_build_object('status','COMPLETION_WAITING_FOR_FINAL_JOB_RECEIPTS',
    'shift_id',v_shift.shift_id,
    'original_jobs_independently_settled',v_verified,
    'selected_job_count',v_total,
    'installation_authorized',false,'production_changed',false);
  end if;
  v_work_ids:=array_append(v_work_ids,v_work);
  v_verified:=v_verified+1;
  v_events:=v_events||jsonb_build_array(jsonb_build_object(
   'original_work_id',v_work,'source_ref',v_source,
   'source_proof_sha256',v_proof,'independent_final_receipt_verified',true));
 end loop;
 if v_verified<>v_total then raise exception 'COMPLETION_VERIFICATION_COUNT_MISMATCH';end if;
 v_receipt:=jsonb_build_object(
  'status','EMPLOYEE_SHIFT_EVIDENCE_REPORT',
  'shift_id',v_shift.shift_id,'completion_bound',true,
  'completion_condition','ALL_SELECTED_JOBS_INDEPENDENTLY_VERIFIED_AND_RECEIPTED',
  'completion_reason','ALL_AUTHORIZED_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED',
  'authorized_source_job_count',v_total,
  'original_jobs_independently_settled_in_this_shift',v_verified,
  'verified_original_receipts',v_events,
  'human_hours_saved',null,'realized_cash_savings_usd',null,
  'work_installation_authorized',false,'production_changed',false,
  'ended_at',v_now);
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_receipt::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1 t
  set state='ORIGINAL_JOB_RECEIPT_VERIFIED',proof=v_receipt,
   proof_sha256=v_hash,completed_at=v_now
  where t.shift_id=v_shift.shift_id and t.step_index in (6,7)
   and t.state in ('QUEUED','AWAITING_EXACT_WORK');
 update reality_internal.governed_employee_shift_steps_v1 t
  set state='REPORTED',proof=v_receipt,
   proof_sha256=v_hash,completed_at=v_now
  where t.shift_id=v_shift.shift_id and t.step_index=8
   and t.state='QUEUED';
 update reality_internal.governed_employee_shifts_v1 s
  set status='ENDED_WITH_VERIFIED_JOB',closed_at=v_now,
   close_report=v_receipt,last_progress_at=v_now
  where s.shift_id=v_shift.shift_id and s.owner_id=v_shift.owner_id
   and s.closed_at is null;
 update reality_internal.governed_employee_completion_warrants_v1 w
  set state='SETTLED',settled_at=v_now,completion_receipt=v_receipt
  where w.shift_id=v_shift.shift_id and w.owner_id=v_shift.owner_id
   and w.state='ACTIVE';
 return v_receipt;
end $fn$;
revoke all on function public.reality_close_employee_completion_shift_v1()
 from public,anon,authenticated;
grant execute on function public.reality_close_employee_completion_shift_v1()
 to service_role;
