-- Isolated-owner preview: one durable, fenced Reality-native read-only model-tool proof.
-- Not a native repair installation, original-job execution, approval or final settlement.
create table if not exists reality_internal.riley_native_readonly_tool_proofs_v1 (
 original_work_id text primary key check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 shift_id uuid not null,
 owner_id uuid not null,
 plan_fingerprint text not null check(plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
 source_proof_sha256 text not null check(source_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 claim_id uuid not null,
 claim_at timestamptz not null default clock_timestamp(),
 attempt_count integer not null default 1 check(attempt_count between 1 and 3),
 state text not null check(state in ('CLAIMED','MODEL_PROVIDER_RETRYABLE','MODEL_TOOL_READBACK_VERIFIED','CURRENT_SCOPE_DRIFT_BLOCKED')),
 first_response_id text,
 function_call_id text,
 final_response_id text,
 tool_readback_sha256 text,
 error_code text,
 verified_at timestamptz,
 check ((state='MODEL_TOOL_READBACK_VERIFIED')=(verified_at is not null))
);
revoke all on reality_internal.riley_native_readonly_tool_proofs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_native_readonly_tool_proofs_v1 to service_role;
create or replace function public.reality_claim_current_native_readonly_tool_v1()
returns jsonb language plpgsql set search_path to '' as $function$
declare v_shift record;v_original record;v_proof record;v_newclaim uuid;v_inserted integer;
begin
 if current_user <> 'service_role' then
  raise exception 'NATIVE_TOOL_PROOF_SERVICE_ONLY';
 end if;
 select s.shift_id,s.owner_id,s.plan_fingerprint into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
 on w.shift_id=s.shift_id and w.owner_id=s.owner_id and
 w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
 where s.closed_at is null and s.authorized_at is not null
 and s.planned_start_at<=clock_timestamp() and
 s.planned_end_at='infinity'::timestamptz and
 s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK');
 if not found then
  return jsonb_build_object('status','NO_ACTIVE_NATIVE_TOOL_SCOPE',
    'installation_authorized',false,'original_job_completed',false);
 end if;
 if (select count(*) from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id and
  w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
  where s.closed_at is null and s.authorized_at is not null and
  s.planned_end_at='infinity'::timestamptz and
  s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'))<>1
 then raise exception 'MULTIPLE_NATIVE_TOOL_OWNER_SHIFTS';end if;
 select j.* into v_original
 from reality_internal.riley_unattended_repair_originals_v1 j
 join reality_internal.governed_employee_shift_steps_v1 t
 on t.shift_id=j.shift_id and t.source_ref=j.issue_url and
 t.proof_sha256=j.shift_source_proof_sha256 and t.state='SOURCE_CHECKED'
 where j.shift_id=v_shift.shift_id and j.owner_id=v_shift.owner_id
 and j.issue_url='https://github.com/maloney2323/Reality/issues/263'
 and j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
 and j.installed=false and j.exact_approval_receipt_ref is null
 and j.original_settlement_receipt_ref is null;
 if not found then return jsonb_build_object(
  'status','NO_CURRENT_TESTED_NATIVE_ORIGINAL_TO_INSPECT',
  'installation_authorized',false,'original_job_completed',false);end if;
 if (select count(*) from reality_internal.riley_unattended_repair_originals_v1
  where shift_id=v_shift.shift_id and issue_url=v_original.issue_url)<>1
 then raise exception 'DUPLICATED_NATIVE_TOOL_ORIGINAL';end if;
 insert into reality_internal.riley_native_readonly_tool_proofs_v1 as x (
  original_work_id,shift_id,owner_id,plan_fingerprint,
  source_proof_sha256,claim_id,state
 ) values (v_original.original_work_id,v_shift.shift_id,v_shift.owner_id,
  v_shift.plan_fingerprint,v_original.shift_source_proof_sha256,
  gen_random_uuid(),'CLAIMED')
 on conflict (original_work_id) do nothing;
 get diagnostics v_inserted = row_count;
 select * into v_proof from reality_internal.riley_native_readonly_tool_proofs_v1
 where original_work_id=v_original.original_work_id for update;
 if v_proof.shift_id<>v_shift.shift_id or
    v_proof.owner_id<>v_shift.owner_id or
    v_proof.plan_fingerprint<>v_shift.plan_fingerprint or
    v_proof.source_proof_sha256<>v_original.shift_source_proof_sha256
 then raise exception 'NATIVE_TOOL_ORIGINAL_SOURCE_DRIFT';end if;
 if v_proof.state='MODEL_TOOL_READBACK_VERIFIED' then
  return jsonb_build_object('status','NATIVE_READONLY_TOOL_ALREADY_VERIFIED',
   'original_work_id',v_proof.original_work_id,'shift_id',v_proof.shift_id,
   'tool_readback_sha256',v_proof.tool_readback_sha256,
   'installation_authorized',false,'original_job_completed',false);
 end if;
 if v_proof.state='CURRENT_SCOPE_DRIFT_BLOCKED' then
  return jsonb_build_object('status','NATIVE_TOOL_SCOPE_DRIFT_STOPPED',
   'installation_authorized',false,'original_job_completed',false);
 end if;
 if v_proof.state='CLAIMED' and
    v_proof.claim_at < clock_timestamp()-interval '2 minutes' then
  update reality_internal.riley_native_readonly_tool_proofs_v1 set
    state='CURRENT_SCOPE_DRIFT_BLOCKED',
    error_code='PREVIOUS_MODEL_EFFECT_UNCERTAIN_NO_REPLAY'
  where original_work_id=v_proof.original_work_id;
  return jsonb_build_object('status','NATIVE_TOOL_PREVIOUS_PROVIDER_EFFECT_UNCERTAIN_NO_REPLAY',
   'installation_authorized',false,'original_job_completed',false);
 end if;
 if v_proof.state='CLAIMED' and v_inserted=0 then
  return jsonb_build_object('status','NATIVE_TOOL_ATTEMPT_ALREADY_CLAIMED',
   'installation_authorized',false,'original_job_completed',false);
 end if;
 if v_proof.state='MODEL_PROVIDER_RETRYABLE' then
  if v_proof.attempt_count>=3 or
     v_proof.claim_at > clock_timestamp()-interval '15 minutes' then
    return jsonb_build_object('status','NATIVE_TOOL_RETRY_BUDGET_OR_BACKOFF',
     'installation_authorized',false,'original_job_completed',false);
  end if;
  v_newclaim:=gen_random_uuid();
  update reality_internal.riley_native_readonly_tool_proofs_v1 set
   state='CLAIMED',claim_id=v_newclaim,claim_at=clock_timestamp(),
   attempt_count=attempt_count+1,error_code=null
  where original_work_id=v_proof.original_work_id;
  v_proof.claim_id:=v_newclaim;
 end if;
 return jsonb_build_object(
  'status','NATIVE_READONLY_TOOL_ATTEMPT_FENCED',
  'claim_id',v_proof.claim_id,'shift_id',v_shift.shift_id,
  'owner_id',v_shift.owner_id,'original_work_id',v_original.original_work_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'source_proof_sha256',v_original.shift_source_proof_sha256,
  'source_ref',v_original.issue_url,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_claim_current_native_readonly_tool_v1() from public,anon,authenticated;
grant execute on function public.reality_claim_current_native_readonly_tool_v1() to service_role;

create or replace function public.reality_finish_current_native_readonly_tool_v1(
 p_original_work_id text,p_claim_id uuid,p_state text,
 p_first_response_id text default null,p_function_call_id text default null,
 p_final_response_id text default null,p_tool_readback_sha256 text default null,
 p_error_code text default null
) returns jsonb language plpgsql set search_path to '' as $function$
declare v_proof record;v_shift record;v_native record;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE_TOOL_FINISH_SERVICE_ONLY';end if;
 select * into v_proof from reality_internal.riley_native_readonly_tool_proofs_v1
 where original_work_id=p_original_work_id and claim_id=p_claim_id for update;
 if not found then raise exception 'NATIVE_TOOL_CLAIM_MISSING';end if;
 if v_proof.state<>'CLAIMED' then
  return jsonb_build_object('status','NATIVE_TOOL_CLAIM_ALREADY_FINISHED',
   'installation_authorized',false,'original_job_completed',false);end if;
 select s.* into v_shift from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
 on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 and w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
 where s.shift_id=v_proof.shift_id and s.owner_id=v_proof.owner_id
 and s.plan_fingerprint=v_proof.plan_fingerprint and s.closed_at is null
 and s.planned_end_at='infinity'::timestamptz
 and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK');
 select j.* into v_native from reality_internal.riley_unattended_repair_originals_v1 j
 where j.original_work_id=v_proof.original_work_id and j.shift_id=v_proof.shift_id
 and j.owner_id=v_proof.owner_id and
 j.shift_source_proof_sha256=v_proof.source_proof_sha256 and
 j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' and
 j.exact_approval_receipt_ref is null and j.installed=false;
 if not found or v_shift.shift_id is null then
  p_state:='CURRENT_SCOPE_DRIFT_BLOCKED';p_error_code:='ORIGINAL_AUTHORITY_CHANGED';
 end if;
 if p_state not in ('MODEL_TOOL_READBACK_VERIFIED','MODEL_PROVIDER_RETRYABLE',
    'CURRENT_SCOPE_DRIFT_BLOCKED') then raise exception 'INVALID_NATIVE_TOOL_RESULT';end if;
 if p_state='MODEL_TOOL_READBACK_VERIFIED' and (
   coalesce(p_first_response_id,'') !~ '^resp_[a-zA-Z0-9_-]{5,150}$' or
   coalesce(p_final_response_id,'') !~ '^resp_[a-zA-Z0-9_-]{5,150}$' or
   coalesce(p_function_call_id,'') !~ '^call_[a-zA-Z0-9_-]{4,150}$' or
   coalesce(p_tool_readback_sha256,'') !~ '^sha256:[a-f0-9]{64}$'
 ) then raise exception 'NATIVE_TOOL_RESULT_EVIDENCE_INVALID';end if;
 if p_state<>'MODEL_TOOL_READBACK_VERIFIED' and (
   p_error_code is null or p_error_code !~ '^[A-Z0-9_]{5,90}$'
 ) then raise exception 'NATIVE_TOOL_FAILURE_REASON_REQUIRED';end if;
 update reality_internal.riley_native_readonly_tool_proofs_v1 set
  state=p_state,first_response_id=p_first_response_id,
  function_call_id=p_function_call_id,final_response_id=p_final_response_id,
  tool_readback_sha256=p_tool_readback_sha256,error_code=p_error_code,
  verified_at=case when p_state='MODEL_TOOL_READBACK_VERIFIED'
   then clock_timestamp() else null end
 where original_work_id=v_proof.original_work_id;
 return jsonb_build_object('status',case when p_state='MODEL_TOOL_READBACK_VERIFIED'
  then 'NATIVE_READONLY_MODEL_TOOL_RESPONSE_RECORDED'
  else 'NATIVE_READONLY_MODEL_TOOL_NOT_PROVEN' end,
  'original_work_id',v_proof.original_work_id,'shift_id',v_proof.shift_id,
  'model_tool_readback_verified',p_state='MODEL_TOOL_READBACK_VERIFIED',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_finish_current_native_readonly_tool_v1(text,uuid,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_finish_current_native_readonly_tool_v1(text,uuid,text,text,text,text,text,text) to service_role;
