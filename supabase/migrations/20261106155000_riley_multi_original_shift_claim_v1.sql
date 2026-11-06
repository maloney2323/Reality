-- Multi-original work claims are a separate DURABLE continuation journal for
-- an EXISTING authenticated employee shift. This does not admit original jobs,
-- produce model candidates, change business operations, grant installation,
-- or certify a final receipt. The existing queue and owner-goal epoch remain
-- the source of truth for authority.
create table if not exists reality_internal.governed_employee_original_claims_v1(
  shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
  owner_id uuid not null,
  original_work_id text not null check(original_work_id~'^work:[a-f0-9]{32}$'),
  trigger_id uuid not null,
  source_event_id uuid not null,
  source_ref text not null,
  source_proof_sha256 text not null check(source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
  claim_id uuid not null,
  phase text not null default 'LEASED_FOR_GOVERNED_EXECUTOR' check(phase in (
   'LEASED_FOR_GOVERNED_EXECUTOR','PROVIDER_OUTCOME_RECONCILIATION_REQUIRED',
   'AWAITING_EXACT_OWNER_APPROVAL','AWAITING_INDEPENDENT_FINAL_SETTLEMENT',
   'RECEIPT_INDEPENDENTLY_RECONCILED')),
  created_at timestamptz not null default clock_timestamp(),
  claim_expires_at timestamptz not null,
  updated_at timestamptz not null default clock_timestamp(),
  last_execution_status text,
  independent_receipt_event_id uuid,
  primary key (shift_id,original_work_id),
  unique (original_work_id),
  unique (claim_id)
);
revoke all on reality_internal.governed_employee_original_claims_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_employee_original_claims_v1
 to service_role;
alter table reality_internal.governed_employee_original_claims_v1 enable row level security;

create or replace function public.reality_read_eligible_shift_originals_v1(p_shift_id uuid)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare v_shift record;v_candidate record;v_gate jsonb;
  v_jobs jsonb:='[]'::jsonb;v_checked integer:=0;
begin
 if current_user<>'service_role' then
   raise exception 'SHIFT_MULTI_JOB_SERVICE_ROLE_REQUIRED';
 end if;
 select * into v_shift from reality_internal.governed_employee_shifts_v1
 where shift_id=p_shift_id and status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and planned_start_at<=clock_timestamp() and planned_end_at>clock_timestamp()
  and closed_at is null;
 if not found then
  return jsonb_build_object('status','NO_ACTIVE_OWNER_SHIFT_FOR_MULTI_JOB',
   'shift_id',p_shift_id,'candidates','[]'::jsonb,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 -- Only independently checked source issues with existing owner-scoped
 -- original queue records. The existing single-job authority gate re-verifies
 -- every candidate, including current goal epoch and no prior settlement.
 for v_candidate in
  select distinct q.trigger_id,q.original_work_id,t.source_ref,
    t.proof_sha256,t.step_index
  from reality_internal.governed_employee_shift_steps_v1 t
  join public.universe_events e
    on e.entity_type='reality_original_source_backed_repair_work'
     and e.epistemic_status='VERIFIED'
     and e.payload->>'owner_id'=v_shift.owner_id::text
     and e.provenance->>'principal_id'=v_shift.owner_id::text
     and e.payload->>'owner_authorized_investigation'='true'
     and e.payload->>'owner_authorized_installation'='false'
     and e.payload->>'original_job_completed'='false'
     and e.payload->>'production_changed'='false'
     and e.payload->>'issue_number'=split_part(t.source_ref,'/issues/',2)
  join reality_internal.genuine_capability_queue_v1 q
    on q.original_work_event_id=e.event_id
     and q.owner_id=v_shift.owner_id
     and q.original_work_id=e.payload->>'original_work_id'
     and q.conversation_id::text=e.provenance->>'conversation_id'
  where t.shift_id=v_shift.shift_id and t.step_index between 2 and 5
   and t.state='SOURCE_CHECKED' and t.source_status='OPEN_ISSUE'
   and t.source_ref~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]*$'
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=t.source_ref
   and t.proof->>'provider_checked'='true'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   and t.proof_sha256='sha256:'||encode(sha256(convert_to(t.proof::text,'UTF8')),'hex')
   and q.phase in ('PENDING_FROZEN_REPRODUCTION',
     'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE')
   and q.claim_id is null
  order by t.step_index,q.original_work_id
  limit 5
 loop
   v_checked:=v_checked+1;
   if v_checked>4 then
    return jsonb_build_object('status','AMBIGUOUS_SHIFT_TOO_MANY_ORIGINALS',
      'shift_id',p_shift_id,'candidates','[]'::jsonb,
      'execution_authorized',false,'installation_authorized',false,
      'production_changed',false);
   end if;
   v_gate:=public.reality_read_shift_capability_wake_v1(
     p_shift_id,v_candidate.original_work_id,v_candidate.trigger_id);
   if v_gate->>'status'='EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE' and
      v_gate->>'source_ref'=v_candidate.source_ref and
      v_gate->>'source_proof_sha256'=v_candidate.proof_sha256 and
      v_gate->>'original_work_id'=v_candidate.original_work_id and
      v_gate->>'trigger_id'=v_candidate.trigger_id::text and
      v_gate->>'installation_authorized'='false' and
      v_gate->>'production_changed'='false' and
      not exists(
       select 1 from reality_internal.governed_employee_original_claims_v1 c
       where c.original_work_id=v_candidate.original_work_id)
   then
      v_jobs:=v_jobs||jsonb_build_array(jsonb_build_object(
       'shift_id',p_shift_id,'original_work_id',v_candidate.original_work_id,
       'trigger_id',v_candidate.trigger_id,
       'source_event_id',v_gate->>'source_event_id',
       'source_ref',v_candidate.source_ref,
       'source_proof_sha256',v_candidate.proof_sha256,
       'source_step_index',v_candidate.step_index,
       'owner_id',v_shift.owner_id,
       'current_owner_scope_verified',true,
       'independently_settled',false,
       'installation_authorized',false,
       'production_changed',false));
   end if;
 end loop;
 return jsonb_build_object('status','EXISTING_SHIFT_ORIGINALS_INDEPENDENTLY_RECONCILED',
   'shift_id',p_shift_id,'candidates',v_jobs,
   'candidate_count',jsonb_array_length(v_jobs),
   'execution_authorized',false,'installation_authorized',false,
   'production_changed',false);
end
$$;

create or replace function public.reality_claim_exact_shift_original_v1(
 p_shift_id uuid,p_original_work_id text,p_trigger_id uuid)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare v_candidate jsonb;v_gate jsonb;v_shift record;v_existing record;
 v_claim uuid:=gen_random_uuid();v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then
   raise exception 'SHIFT_ORIGINAL_CLAIM_SERVICE_ROLE_REQUIRED';
 end if;
 if p_shift_id is null or p_trigger_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' then
   return jsonb_build_object('status','EXACT_SHIFT_JOB_CLAIM_DENIED',
    'installation_authorized',false,'production_changed',false);
 end if;
 -- Lock the actual shift before checking the existing queue. A competing
 -- shift claim cannot invent an original work authorization.
 select * into v_shift from reality_internal.governed_employee_shifts_v1
 where shift_id=p_shift_id and status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and planned_start_at<=v_now and planned_end_at>v_now
  and closed_at is null
 for update;
 if not found then
  return jsonb_build_object('status','EXACT_SHIFT_JOB_CLAIM_DENIED',
    'installation_authorized',false,'production_changed',false);
 end if;
 v_gate:=public.reality_read_shift_capability_wake_v1(
   p_shift_id,p_original_work_id,p_trigger_id);
 if v_gate->>'status'<>'EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE' or
    v_gate->>'existing_job_only'<>'true' or
    v_gate->>'installation_authorized'<>'false' or
    v_gate->>'original_job_completed'<>'false' or
    v_gate->>'production_changed'<>'false' then
   return jsonb_build_object('status','EXACT_SHIFT_JOB_CLAIM_DENIED',
    'installation_authorized',false,'production_changed',false);
 end if;
 -- Global original-work uniqueness guarantees a different shift cannot
 -- consume the same execution claim, even if a worker restarts.
 insert into reality_internal.governed_employee_original_claims_v1(
    shift_id,owner_id,original_work_id,trigger_id,source_event_id,
    source_ref,source_proof_sha256,claim_id,claim_expires_at)
 values (
    p_shift_id,v_shift.owner_id,p_original_work_id,p_trigger_id,
    (v_gate->>'source_event_id')::uuid,
    v_gate->>'source_ref',v_gate->>'source_proof_sha256',
    v_claim,v_now+interval '3 minutes')
 on conflict do nothing;
 if found then
  return jsonb_build_object('status','EXACT_EXISTING_SHIFT_ORIGINAL_CLAIMED',
   'shift_id',p_shift_id,'original_work_id',p_original_work_id,
   'owner_id',v_shift.owner_id,'trigger_id',p_trigger_id,
   'claim_id',v_claim,'claim_expires_at',v_now+interval '3 minutes',
   'original_execution_completed',false,'owner_installation_authorized',false,
   'production_changed',false);
 end if;
 select * into v_existing from reality_internal.governed_employee_original_claims_v1
 where original_work_id=p_original_work_id;
 return jsonb_build_object(
  'status','ORIGINAL_ALREADY_CLAIMED_NO_AUTOMATIC_REPLAY',
  'shift_id',v_existing.shift_id,'original_work_id',p_original_work_id,
  'existing_phase',v_existing.phase,'claim_id',null,
  'original_execution_completed',false,'owner_installation_authorized',false,
  'production_changed',false);
end
$$;

revoke all on function public.reality_read_eligible_shift_originals_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_eligible_shift_originals_v1(uuid)
 to service_role;
revoke all on function public.reality_claim_exact_shift_original_v1(uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_exact_shift_original_v1(uuid,text,uuid)
 to service_role;

-- Persist the truthful outcome; never let an employee claim success. The
-- only way to mark independent settlement is the separate provider receipt
-- reconciliation below.
create or replace function public.reality_record_exact_shift_original_outcome_v1(
 p_shift_id uuid,p_original_work_id text,p_claim_id uuid,p_status text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare v record;v_phase text;
begin
 if current_user<>'service_role' then
   raise exception 'SHIFT_MULTI_JOB_OUTCOME_SERVICE_ROLE_REQUIRED';
 end if;
 if p_status not in ('ORIGINAL_JOB_AUTHORIZATION_BLOCKED',
  'ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT',
  'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
  'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY',
  'EXECUTION_PROVIDER_EFFECT_UNKNOWN') then
   raise exception 'SHIFT_MULTI_JOB_OUTCOME_NOT_ALLOWED';
 end if;
 select * into v from reality_internal.governed_employee_original_claims_v1
  where shift_id=p_shift_id and original_work_id=p_original_work_id
    and claim_id=p_claim_id for update;
 if not found then
   raise exception 'SHIFT_MULTI_JOB_CLAIM_IDENTITY_UNVERIFIED';
 end if;
 if v.phase<>'LEASED_FOR_GOVERNED_EXECUTOR' then
  if v.last_execution_status=p_status then
    return jsonb_build_object('status','SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED',
     'shift_id',p_shift_id,'original_work_id',p_original_work_id,
     'claim_id',p_claim_id,'last_execution_status',p_status,
     'original_job_settled',false,'installation_authorized',false,
     'production_changed',false);
  end if;
  raise exception 'SHIFT_MULTI_JOB_EFFECT_ALREADY_UNCERTAIN_NO_REPLAY';
 end if;
 v_phase:=case when p_status='ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT'
   then 'AWAITING_INDEPENDENT_FINAL_SETTLEMENT'
  when p_status='SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF'
   then 'AWAITING_EXACT_OWNER_APPROVAL'
  else 'PROVIDER_OUTCOME_RECONCILIATION_REQUIRED' end;
 update reality_internal.governed_employee_original_claims_v1
  set phase=v_phase,last_execution_status=p_status,
   updated_at=clock_timestamp()
  where shift_id=p_shift_id and original_work_id=p_original_work_id
   and claim_id=p_claim_id;
 return jsonb_build_object('status','SHIFT_ORIGINAL_OUTCOME_DURABLY_RECORDED',
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'claim_id',p_claim_id,'last_execution_status',p_status,
  'original_job_settled',false,'installation_authorized',false,
  'production_changed',false);
end
$$;
create or replace function public.reality_reconcile_exact_shift_original_receipt_v1(
 p_shift_id uuid,p_original_work_id text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare v record;v_final record;
begin
 if current_user<>'service_role' then
  raise exception 'SHIFT_MULTI_JOB_RECEIPT_SERVICE_ROLE_REQUIRED';
 end if;
 select * into v from reality_internal.governed_employee_original_claims_v1
 where shift_id=p_shift_id and original_work_id=p_original_work_id
  for update;
 if not found then
  raise exception 'SHIFT_MULTI_JOB_NO_PRIOR_CLAIM';
 end if;
 select r.verified_settlement_event_id,r.verified_at,
   r.artifact_sha256 into v_final
 from reality_internal.genuine_independent_final_receipts_v1 r
 join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_id=r.original_work_id and q.owner_id=r.owner_id
   and q.phase='SETTLED_ISOLATED'
   and q.qualified_candidate->>'artifact_sha256'=r.artifact_sha256
 where r.original_work_id=v.original_work_id and r.owner_id=v.owner_id
  and r.production_changed=false and r.verified_at>=v.created_at
 order by r.verified_at desc limit 1;
 if not found then
  return jsonb_build_object('status','NO_INDEPENDENT_ORIGINAL_RECEIPT_YET',
   'shift_id',p_shift_id,'original_work_id',p_original_work_id,
   'installation_authorized',false,'production_changed',false);
 end if;
 update reality_internal.governed_employee_original_claims_v1
  set phase='RECEIPT_INDEPENDENTLY_RECONCILED',
   independent_receipt_event_id=v_final.verified_settlement_event_id,
   updated_at=clock_timestamp()
 where shift_id=p_shift_id and original_work_id=p_original_work_id;
 return jsonb_build_object(
  'status','EXACT_ORIGINAL_RECEIPT_INDEPENDENTLY_RECONCILED',
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'settlement_event_id',v_final.verified_settlement_event_id,
  'installation_authorized',false,'production_changed',false);
end
$$;
revoke all on function public.reality_record_exact_shift_original_outcome_v1(
 uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_record_exact_shift_original_outcome_v1(
 uuid,text,uuid,text) to service_role;
revoke all on function public.reality_reconcile_exact_shift_original_receipt_v1(
 uuid,text) from public,anon,authenticated;
grant execute on function public.reality_reconcile_exact_shift_original_receipt_v1(
 uuid,text) to service_role;
