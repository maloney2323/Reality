-- Preview-only owner-authorized employee shift queue, service-only readbacks.
-- Separate from original-job execution and its upgrade-approval boundary.
-- No backfill, no production modifications and no synthetic completion claims.
create table if not exists reality_internal.governed_employee_shifts_v1 (
 shift_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 plan_fingerprint text not null check (plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 source_observed_at timestamptz not null,
 planned_start_at timestamptz not null,
 planned_end_at timestamptz not null,
 status text not null default 'QUEUED' check(status in
  ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ENDED_WITH_BLOCKED_WORK','ENDED_WITH_VERIFIED_JOB','ENDED_READ_ONLY','ESCALATED')),
 created_at timestamptz not null default clock_timestamp(),
 authorized_at timestamptz not null default clock_timestamp(),
 last_progress_at timestamptz,
 closed_at timestamptz,
 close_report jsonb,
 unique(owner_id,plan_fingerprint,planned_start_at),
 check (planned_end_at=planned_start_at + interval '8 hours')
);
create table if not exists reality_internal.governed_employee_shift_steps_v1 (
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 step_index smallint not null check(step_index between 1 and 8),
 stage text not null,
 source_ref text,
 source_title text,
 duration_minutes integer not null check(duration_minutes between 1 and 120),
 offset_start_minutes integer not null check(offset_start_minutes between 0 and 479),
 offset_end_minutes integer not null check(offset_end_minutes between 1 and 480),
 state text not null default 'QUEUED' check(state in
  ('QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK','ORIGINAL_JOB_RECEIPT_VERIFIED','BLOCKED_PROVIDER','REPORTED')),
 claim_id uuid,
 claimed_at timestamptz,
 claim_expires_at timestamptz,
 attempts integer not null default 0 check(attempts between 0 and 3),
 source_status text,
 proof jsonb,
 proof_sha256 text,
 completed_at timestamptz,
 primary key (shift_id,step_index),
 check(offset_end_minutes=offset_start_minutes+duration_minutes),
 check((source_ref is null and source_title is null) or
  (source_ref ~ '^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]*$'
   and length(source_title) between 1 and 300))
);
create index if not exists governed_employee_shift_owner_v1_idx
 on reality_internal.governed_employee_shifts_v1(owner_id,created_at desc);
create index if not exists governed_employee_shift_pending_v1_idx
 on reality_internal.governed_employee_shifts_v1(planned_start_at)
 where status in ('QUEUED','RUNNING');
alter table reality_internal.governed_employee_shifts_v1 enable row level security;
alter table reality_internal.governed_employee_shift_steps_v1 enable row level security;
revoke all on reality_internal.governed_employee_shifts_v1 from public,anon,authenticated;
revoke all on reality_internal.governed_employee_shift_steps_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_employee_shifts_v1 to service_role;
grant select,insert,update on reality_internal.governed_employee_shift_steps_v1 to service_role;

create or replace function public.reality_authorize_employee_shift_v1(
 p_owner_id uuid,p_fingerprint text,p_source_observed_at timestamptz,
 p_start_at timestamptz,p_steps jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 v_shift uuid; v_now timestamptz:=clock_timestamp(); v_item jsonb;
 v_i integer:=0; v_end integer:=0;v_duration integer;v_start integer;
 v_expected_ids text[]:=array['preflight','issue_validation','failure_reproduction',
  'change_review','additional_triage','governed_execution','independent_acceptance','shift_close'];
 v_expected_stages text[]:=array['SOURCE_RECONCILIATION','VERIFY_OPEN_ISSUE',
  'VERIFY_PROVIDER_EVIDENCE','REVIEW_INDEPENDENT_EVIDENCE',
  'QUALIFY_NEXT_WORK','CONDITIONAL_EXECUTION_WINDOW',
  'CONDITIONAL_VERIFICATION_WINDOW','EVIDENCE_AND_VALUE_REPORT'];
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY'; end if;
 if p_owner_id is null or p_fingerprint !~ '^sha256:[a-f0-9]{64}$'
   or p_start_at < v_now-interval '2 minutes'
   or p_start_at > v_now+interval '7 days'
   or p_source_observed_at is null
   or p_source_observed_at < v_now-interval '30 minutes'
   or p_source_observed_at > v_now+interval '2 minutes'
   or jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)<>8
 then raise exception 'SHIFT_EXACT_APPROVAL_SCOPE_INVALID'; end if;
 for v_item in select value from jsonb_array_elements(p_steps) loop
  v_i:=v_i+1;
  if (v_item->>'id') is distinct from v_expected_ids[v_i]
   or (v_item->>'stage') is distinct from v_expected_stages[v_i]
   or (v_item->>'sequence')::integer is distinct from v_i
   or (v_item->>'offset_start_minutes')::integer is distinct from v_end
   or (v_item->>'elapsed_minutes_not_human_labor')::boolean is distinct from true
   then raise exception 'SHIFT_STEP_ORDER_INVALID';end if;
  v_start:=(v_item->>'offset_start_minutes')::integer;
  v_duration:=(v_item->>'planning_minutes')::integer;
  if v_duration is null or v_duration<1 or v_duration>120 or
   (v_item->>'offset_end_minutes')::integer<>v_start+v_duration or
   (v_i in (6,7) and v_item->>'required_gate' is null) or
   (v_i not in (6,7) and v_item->>'required_gate' is not null)
  then raise exception 'SHIFT_BOUNDARIES_INVALID';end if;
  v_end:=v_start+v_duration;
 end loop;
 if v_end<>480 then raise exception 'SHIFT_NOT_EIGHT_HOURS';end if;
 insert into reality_internal.governed_employee_shifts_v1(
  owner_id,plan_fingerprint,source_observed_at,planned_start_at,planned_end_at)
 values(p_owner_id,p_fingerprint,p_source_observed_at,p_start_at,
  p_start_at+interval '8 hours')
 on conflict(owner_id,plan_fingerprint,planned_start_at) do nothing
 returning shift_id into v_shift;
 if v_shift is null then
  select shift_id into v_shift from reality_internal.governed_employee_shifts_v1
   where owner_id=p_owner_id and plan_fingerprint=p_fingerprint
     and planned_start_at=p_start_at;
  if v_shift is null then raise exception 'SHIFT_DUPLICATE_READBACK_FAILED'; end if;
  return jsonb_build_object('status','SHIFT_ALREADY_AUTHORIZED',
   'shift_id',v_shift,'owner_scope_verified',true,
   'installation_authorized',false,'production_changed',false);
 end if;
 for v_item in select value from jsonb_array_elements(p_steps) loop
  insert into reality_internal.governed_employee_shift_steps_v1(
   shift_id,step_index,stage,source_ref,source_title,duration_minutes,
   offset_start_minutes,offset_end_minutes)
  values(v_shift,(v_item->>'sequence')::integer,v_item->>'stage',
   nullif(v_item#>>'{candidate,source_url}',''),
   nullif(v_item#>>'{candidate,title}',''),
   (v_item->>'planning_minutes')::integer,
   (v_item->>'offset_start_minutes')::integer,
   (v_item->>'offset_end_minutes')::integer);
 end loop;
 return jsonb_build_object('status','SHIFT_DURABLY_AUTHORIZED',
  'shift_id',v_shift,'owner_scope_verified',true,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_authorize_employee_shift_v1(uuid,text,timestamptz,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.reality_authorize_employee_shift_v1(uuid,text,timestamptz,timestamptz,jsonb) to service_role;

create or replace function public.reality_read_owner_employee_shifts_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 if p_owner_id is null then raise exception 'SHIFT_OWNER_REQUIRED';end if;
 return jsonb_build_object(
  'status','OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  'shifts',coalesce((
   select jsonb_agg(jsonb_build_object(
    'shift_id',s.shift_id,'status',s.status,
    'plan_fingerprint',s.plan_fingerprint,
    'planned_start_at',s.planned_start_at,
    'planned_end_at',s.planned_end_at,
    'authorized_at',s.authorized_at,'closed_at',s.closed_at,
    'close_report',s.close_report,
    'steps',coalesce((select jsonb_agg(jsonb_build_object(
     'step_index',t.step_index,'stage',t.stage,'state',t.state,
     'source_ref',t.source_ref,'duration_minutes',t.duration_minutes,
     'source_status',t.source_status,'proof_sha256',t.proof_sha256,
     'completed_at',t.completed_at) order by t.step_index)
    from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id),'[]'::jsonb)) order by s.created_at desc)
   from (select * from reality_internal.governed_employee_shifts_v1
    where owner_id=p_owner_id order by created_at desc limit 5) s),'[]'::jsonb),
  'work_installation_authorized_by_read',false,
  'verified_human_hours_saved',null,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_employee_shifts_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_employee_shifts_v1(uuid) to service_role;

create or replace function public.reality_claim_employee_shift_step_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift record;v_step record;v_claim uuid;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into v_shift from reality_internal.governed_employee_shifts_v1
  where status in ('QUEUED','RUNNING') and planned_start_at<=v_now
   and planned_end_at>v_now
  order by planned_start_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_DUE_AUTHORIZED_SHIFT');end if;
 select * into v_step from reality_internal.governed_employee_shift_steps_v1
  where shift_id=v_shift.shift_id and state in ('QUEUED','CLAIMED')
  order by step_index for update limit 1;
 if not found then return jsonb_build_object('status','NO_CLAIMABLE_STEP');end if;
 if v_step.state='CLAIMED' and v_step.claim_expires_at>v_now
   then return jsonb_build_object('status','INFLIGHT_LEASE_UNEXPIRED');end if;
 if v_step.state='CLAIMED' and v_step.attempts>=3 then
  update reality_internal.governed_employee_shift_steps_v1
    set state='BLOCKED_PROVIDER',claim_id=null
   where shift_id=v_shift.shift_id and step_index=v_step.step_index;
  update reality_internal.governed_employee_shifts_v1
    set status='ESCALATED',last_progress_at=v_now where shift_id=v_shift.shift_id;
  return jsonb_build_object('status','LEASE_EXHAUSTED_ESCALATED');end if;
 if v_step.step_index=8 then
  return jsonb_build_object('status','SHIFT_FINAL_REPORT_NOT_DUE',
   'shift_id',v_shift.shift_id);
 end if;
 if v_step.step_index>=6 then
  update reality_internal.governed_employee_shift_steps_v1
    set state='AWAITING_EXACT_WORK'
   where shift_id=v_shift.shift_id and step_index=v_step.step_index;
  update reality_internal.governed_employee_shifts_v1
    set status='AWAITING_EXACT_ORIGINAL_WORK',last_progress_at=v_now
   where shift_id=v_shift.shift_id;
  return jsonb_build_object('status','EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',
    'shift_id',v_shift.shift_id,'installation_authorized',false);
 end if;
 v_claim:=gen_random_uuid();
 update reality_internal.governed_employee_shift_steps_v1
  set state='CLAIMED',claim_id=v_claim,claimed_at=v_now,
   claim_expires_at=v_now+interval '3 minutes',attempts=attempts+1
  where shift_id=v_shift.shift_id and step_index=v_step.step_index;
 update reality_internal.governed_employee_shifts_v1
  set status='RUNNING',last_progress_at=v_now where shift_id=v_shift.shift_id;
 return jsonb_build_object('status','READ_ONLY_STEP_CLAIMED',
  'shift_id',v_shift.shift_id,'step_index',v_step.step_index,
  'stage',v_step.stage,'source_ref',v_step.source_ref,
  'claim_id',v_claim,'owner_id',v_shift.owner_id,
  'no_external_write_authority',true);
end $fn$;
revoke all on function public.reality_claim_employee_shift_step_v1() from public,anon,authenticated;
grant execute on function public.reality_claim_employee_shift_step_v1() to service_role;

create or replace function public.reality_settle_employee_shift_step_v1(
 p_shift_id uuid,p_step_index integer,p_claim_id uuid,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_row record;v_sha text;v_status text;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into v_row from reality_internal.governed_employee_shift_steps_v1
 where shift_id=p_shift_id and step_index=p_step_index for update;
 if not found or v_row.state<>'CLAIMED' or v_row.claim_id is distinct from p_claim_id
  or v_row.claim_expires_at<v_now then raise exception 'SHIFT_CLAIM_FENCE_INVALID';end if;
 if jsonb_typeof(p_proof)<>'object' or
    (p_proof->>'read_only')::boolean is distinct from true or
    (p_proof->>'production_changed')::boolean is distinct from false or
    (p_proof->>'provider_checked')::boolean is distinct from true
   then raise exception 'SHIFT_PROVIDER_PROOF_INVALID';end if;
 if p_step_index=1 then
  if p_proof->>'kind'<>'ORIGINAL_LEDGER_READBACK' or
     (p_proof->>'owner_scope_verified')::boolean is distinct from true
   then raise exception 'SHIFT_PREFLIGHT_PROOF_INVALID';end if;
 elsif p_step_index between 2 and 5 then
  if p_proof->>'kind'<>'GITHUB_SOURCE_READBACK' or
   p_proof->>'source_url' is distinct from v_row.source_ref or
   p_proof->>'provider_status' not in ('OPEN_ISSUE','OPEN_PULL_REQUEST','CLOSED','NOT_FOUND','FAILED_WORKFLOW','COMPLETED_WORKFLOW')
  then raise exception 'SHIFT_SOURCE_PROOF_MISMATCH';end if;
 else raise exception 'SHIFT_WRITER_NOT_PERMITTED';end if;
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(p_proof::text,'UTF8')),'hex');
 v_status:=coalesce(p_proof->>'provider_status','READBACK_VERIFIED');
 update reality_internal.governed_employee_shift_steps_v1 set
  state='SOURCE_CHECKED',source_status=v_status,proof=p_proof,
  proof_sha256=v_sha,completed_at=v_now,claim_id=null,claim_expires_at=null
 where shift_id=p_shift_id and step_index=p_step_index;
 update reality_internal.governed_employee_shifts_v1
  set last_progress_at=v_now where shift_id=p_shift_id;
 return jsonb_build_object('status','READ_ONLY_PROVIDER_EVIDENCE_RECORDED',
  'step_index',p_step_index,'proof_sha256',v_sha,
  'original_job_completed',false,'human_hours_saved',null,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_settle_employee_shift_step_v1(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_settle_employee_shift_step_v1(uuid,integer,uuid,jsonb) to service_role;

create or replace function public.reality_close_employee_shift_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;v_now timestamptz:=clock_timestamp();v_report jsonb;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED')
  and planned_end_at<=v_now
 order by planned_end_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_DUE_FOR_CLOSE');end if;
 v_report:=jsonb_build_object(
   'status','EIGHT_HOUR_SHIFT_EVIDENCE_REPORT',
   'shift_id',s.shift_id,
   'source_checks_recorded',(select count(*) from
     reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.state='SOURCE_CHECKED'),
   'original_jobs_independently_settled_in_this_shift',(select count(*) from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
   'exact_original_job_binding_verified',(select count(*)=1 from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
   'work_installation_authorized',false,
   'net_human_equivalent_hours_returned',null,
   'realized_cash_savings_usd',null,
   'ended_at',v_now,'production_changed',false,
   'blocked_work_included',true);
 update reality_internal.governed_employee_shift_steps_v1
  set state='REPORTED',proof=v_report,
   proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_report::text,'UTF8')),'hex'),
   completed_at=v_now
  where shift_id=s.shift_id and step_index=8 and state='QUEUED';
 update reality_internal.governed_employee_shifts_v1
   set status=case when exists(select 1 from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED') then 'ENDED_WITH_VERIFIED_JOB' else 'ENDED_WITH_BLOCKED_WORK' end,closed_at=v_now,
    close_report=v_report,last_progress_at=v_now where shift_id=s.shift_id;
 return v_report;
end $fn$;
revoke all on function public.reality_close_employee_shift_v1() from public,anon,authenticated;
grant execute on function public.reality_close_employee_shift_v1() to service_role;

-- This checkpoint is driven by the shift worker after the owner's exact
-- capability installation approval has already activated the original job
-- continuation. It never approves, dispatches, or installs a capability.
create or replace function public.reality_reconcile_employee_shift_original_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 s record; v record; v_proof jsonb;
 v_digest text;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status='AWAITING_EXACT_ORIGINAL_WORK' and
  planned_start_at<=v_now and planned_end_at>v_now
 order by planned_start_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_AWAITING_EXACT_WORK');end if;
 select q.original_work_id,r.artifact_sha256,
  r.verified_settlement_event_id,r.verified_at,t.source_ref into v
 from reality_internal.governed_employee_shift_steps_v1 t
 join public.universe_events e
   on e.epistemic_status='VERIFIED' and
    e.payload->>'owner_id'=s.owner_id::text and
    e.provenance->>'principal_id'=s.owner_id::text and
    e.payload->>'owner_authorized_investigation'='true' and
    e.payload->>'issue_number'=pg_catalog.split_part(t.source_ref,'/issues/',2)
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id and
      q.owner_id=s.owner_id and
      q.original_work_id=e.payload->>'original_work_id'
 join reality_internal.genuine_independent_final_receipts_v1 r
   on r.owner_id=s.owner_id and r.original_work_id=q.original_work_id
      and r.production_changed=false and
      r.artifact_sha256=q.qualified_candidate->>'artifact_sha256'
 where t.shift_id=s.shift_id and t.source_ref ~
  '^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
  and r.verified_at>=s.authorized_at and r.verified_at<=v_now
  and q.phase='SETTLED_ISOLATED'
 order by r.verified_at desc limit 1;
 if not found then return jsonb_build_object(
  'status','EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED',
  'shift_id',s.shift_id,'installation_authorized',false);
 end if;
 v_proof:=jsonb_build_object('kind','EXACT_ORIGINAL_JOB_FINAL_RECEIPT_MATCH',
  'original_work_id',v.original_work_id,'source_ref',v.source_ref,
  'artifact_sha256',v.artifact_sha256,
  'verified_settlement_event_id',v.verified_settlement_event_id,
  'verified_at',v.verified_at,'read_only',true,
  'independently_reconciled',true,
  'production_changed',false,'human_hours_saved',null);
 v_digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
 update reality_internal.governed_employee_shift_steps_v1
   set state='ORIGINAL_JOB_RECEIPT_VERIFIED',proof=v_proof,
   proof_sha256=v_digest,completed_at=v_now
   where shift_id=s.shift_id and step_index in (6,7)
   and state in ('QUEUED','AWAITING_EXACT_WORK');
 update reality_internal.governed_employee_shifts_v1
   set status='RUNNING',last_progress_at=v_now
   where shift_id=s.shift_id;
 return jsonb_build_object('status','EXACT_SHIFT_ORIGINAL_RECEIPT_RECONCILED',
  'shift_id',s.shift_id,'original_work_id',v.original_work_id,
  'proof_sha256',v_digest,'installation_authorized',false,
  'production_changed',false,'human_hours_saved',null);
end $fn$;
revoke all on function public.reality_reconcile_employee_shift_original_v1()
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_employee_shift_original_v1()
 to service_role;
