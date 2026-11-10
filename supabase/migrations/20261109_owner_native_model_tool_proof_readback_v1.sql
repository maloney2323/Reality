-- Owner-scoped display of a genuine fenced read-only model->Reality tool receipt.
-- Service-only; provides no model output, provider credentials, installation approval,
-- write permission, Continuity warrant, or independent original settlement.
create or replace function public.reality_read_owner_native_readonly_tool_proof_v1(
 p_owner_id uuid,p_shift_id uuid
) returns jsonb language plpgsql set search_path to '' as $function$
declare v_shift record;v_tool record;v_total integer;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE_MODEL_TOOL_OWNER_READBACK_SERVICE_ONLY';end if;
 select s.shift_id,s.owner_id into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 where s.shift_id=p_shift_id and s.owner_id=p_owner_id
 and s.authorized_at is not null and w.state='ACTIVE';
 if not found then return jsonb_build_object(
  'status','NO_CURRENT_OWNER_NATIVE_MODEL_TOOL_SCOPE',
  'model_tool_readback_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 select count(*) into v_total
 from reality_internal.riley_native_readonly_tool_proofs_v1 p
 where p.shift_id=p_shift_id and p.owner_id=p_owner_id;
 if v_total>1 then raise exception 'DUPLICATE_OWNER_MODEL_TOOL_ORIGINAL';end if;
 select p.* into v_tool from reality_internal.riley_native_readonly_tool_proofs_v1 p
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=p.original_work_id and j.shift_id=p.shift_id
  and j.owner_id=p.owner_id and j.shift_source_proof_sha256=p.source_proof_sha256
 where p.shift_id=p_shift_id and p.owner_id=p_owner_id
 and j.issue_url='https://github.com/maloney2323/Reality/issues/263';
 if not found then return jsonb_build_object(
  'status','NO_NATIVE_MODEL_TOOL_ATTEMPT_READBACK',
  'model_tool_readback_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 if v_tool.state='MODEL_TOOL_READBACK_VERIFIED' and
  v_tool.tool_readback_sha256 ~ '^sha256:[a-f0-9]{64}$' and
  v_tool.first_response_id ~ '^resp_[a-zA-Z0-9_-]{5,150}$' and
  v_tool.function_call_id ~ '^call_[a-zA-Z0-9_-]{4,150}$' and
  v_tool.final_response_id ~ '^resp_[a-zA-Z0-9_-]{5,150}$' and
  v_tool.verified_at is not null then
  return jsonb_build_object(
   'status','OWNER_NATIVE_MODEL_TOOL_INDEPENDENT_READBACK_VERIFIED',
   'shift_id',v_tool.shift_id,'original_work_id',v_tool.original_work_id,
   'tool_scope','READ_ONLY_CURRENT_ORIGINAL_EVIDENCE',
   'model_tool_readback_verified',true,
   'tool_readback_sha256',v_tool.tool_readback_sha256,
   'verified_at',v_tool.verified_at,
   'model_call_count',v_tool.attempt_count,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 return jsonb_build_object(
  'status','NATIVE_MODEL_TOOL_RECEIPT_PENDING_OR_BLOCKED',
  'shift_id',v_tool.shift_id,'original_work_id',v_tool.original_work_id,
  'model_tool_readback_verified',false,
  'safe_state',v_tool.state,'error_code',v_tool.error_code,
  'model_call_count',v_tool.attempt_count,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_native_readonly_tool_proof_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_native_readonly_tool_proof_v1(uuid,uuid)
 to service_role;
