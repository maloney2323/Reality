-- Existing completion-bound shift closer additionally understands a native
-- Riley exact original receipt. This schema is private and service-role-only;
-- NO owner grant, installation or settlement can be created by this migration.
create table if not exists reality_internal.riley_native_independent_final_receipts_v1(
 receipt_id uuid primary key default gen_random_uuid(),
 original_work_id text not null unique
  references reality_internal.riley_unattended_repair_originals_v1(original_work_id),
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid not null,
 source_ref text not null
  check(source_ref='https://github.com/maloney2323/Reality/issues/263'),
 source_proof_sha256 text not null check(source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
 candidate_artifact_sha256 text not null check(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 candidate_commit_sha text not null check(candidate_commit_sha~'^[a-f0-9]{40}$'),
 frozen_verifier_run_id bigint not null check(frozen_verifier_run_id>10000),
 approval_receipt_ref text not null
  check(approval_receipt_ref~'^supabase:riley_native_exact_install_approvals_v1:[a-f0-9-]{36}$'),
 isolated_install_branch text not null
  check(isolated_install_branch~'^reality/riley/[a-z0-9/-]{8,110}$'),
 installed_commit_sha text not null check(installed_commit_sha~'^[a-f0-9]{40}$'),
 installed_provider_run_id bigint not null check(installed_provider_run_id>10000),
 original_execution_run_id bigint not null check(original_execution_run_id>10000),
 final_receipt_sha256 text not null check(final_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 installed_provider_readback_verified boolean not null check(installed_provider_readback_verified),
 original_execution_independently_verified boolean not null check(original_execution_independently_verified),
 final_outcome text not null check(final_outcome='SUCCEEDED'),
 production_changed boolean not null default false check(not production_changed),
 settled_at timestamptz not null default clock_timestamp(),
 constraint riley_native_settlement_distinct_execution
  check(installed_provider_run_id<>original_execution_run_id)
);
revoke all on reality_internal.riley_native_independent_final_receipts_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.riley_native_independent_final_receipts_v1 to service_role;

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
  elsif v_source='https://github.com/maloney2323/Reality/issues/263'
    and exists(
     select 1 from reality_internal.riley_unattended_repair_originals_v1 native
     where native.shift_id=v_shift.shift_id and native.owner_id=v_shift.owner_id
       and native.issue_url=v_source
       and native.shift_source_proof_sha256=v_proof
    ) then
   -- The actual Riley-native original has its OWN independent final receipt,
   -- not a fabricated Universe original. A source review or CI-only patch
   -- cannot satisfy this branch; the exact approved+installed code and
   -- resumed-original verification must already be independently settled.
   select j.original_work_id into v_work
   from reality_internal.riley_unattended_repair_originals_v1 j
   join reality_internal.riley_native_independent_final_receipts_v1 n
     on n.original_work_id=j.original_work_id
     and n.shift_id=j.shift_id and n.owner_id=j.owner_id
     and n.source_proof_sha256=j.shift_source_proof_sha256
     and n.candidate_artifact_sha256=j.candidate_artifact_sha256
     and n.candidate_commit_sha=j.candidate_commit_sha
     and n.frozen_verifier_run_id=j.independent_proof_run_id
     and n.approval_receipt_ref=j.exact_approval_receipt_ref
     and j.original_settlement_receipt_ref=
       'supabase:riley_native_independent_final_receipts_v1:'||n.receipt_id::text
   where j.shift_id=v_shift.shift_id and j.owner_id=v_shift.owner_id
     and j.issue_url=v_source and j.shift_source_proof_sha256=v_proof
     and j.phase='SETTLED' and j.installed=true
     and j.production_changed=false
     and n.installed_provider_readback_verified=true
     and n.original_execution_independently_verified=true
     and n.final_outcome='SUCCEEDED'
     and n.production_changed=false
     and n.settled_at>=v_shift.authorized_at
   limit 2;
  elsif v_source~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*
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
 then
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
