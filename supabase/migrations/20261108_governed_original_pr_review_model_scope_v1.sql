-- PREVIEW SERVICE-ONLY: current original PR-review inference gate.
-- No new job, permission, receipt, installation or production effects.
-- Re-read immediately before and after each provider model response.
create or replace function public.reality_read_authorized_pr_review_model_scope_v1(
 p_owner_id uuid,p_original_work_id text,p_claim_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' then
  raise exception 'REVIEW_MODEL_SCOPE_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_claim_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' then
  return jsonb_build_object('status','OWNER_REVIEW_MODEL_SCOPE_NOT_CURRENT',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 select j.shift_id,j.owner_id,j.claim_id,j.original_work_id,
        j.source_ref,j.source_proof_sha256,j.phase,j.model_response_id,
        s.status as shift_status,s.plan_fingerprint as shift_plan_fingerprint
 into v
 from reality_internal.riley_pr_review_originals_v1 j
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=j.shift_id and s.owner_id=j.owner_id
 join reality_internal.governed_employee_shift_steps_v1 t
  on t.shift_id=j.shift_id and t.source_ref=j.source_ref
  and t.proof_sha256=j.source_proof_sha256
 where j.owner_id=p_owner_id and j.original_work_id=p_original_work_id
  and j.claim_id=p_claim_id and j.phase='CLAIMED'
  and j.model_response_id is null and j.review_body is null
  and j.provider_comment_id is null and j.settlement_receipt_id is null
  and s.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and t.step_index between 2 and 5
  and t.state='SOURCE_CHECKED'
  and t.source_status='OPEN_PULL_REQUEST'
  and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
  and t.proof->>'source_url'=j.source_ref
  and t.proof->>'provider_status'='OPEN_PULL_REQUEST'
  and t.proof->>'provider_checked'='true'
  and t.proof->>'read_only'='true'
  and t.proof->>'production_changed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(
   pg_catalog.sha256(pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
 limit 2;
 if not found then
  return jsonb_build_object('status','OWNER_REVIEW_MODEL_SCOPE_NOT_CURRENT',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 return jsonb_build_object(
  'status','OWNER_ORIGINAL_REVIEW_CURRENT_FOR_MODEL',
  'readback_source','REALITY_SERVICE_ROLE_ORIGINAL_DB',
  'owner_id',v.owner_id,'shift_id',v.shift_id,
  'claim_id',v.claim_id,'original_work_id',v.original_work_id,
  'source_ref',v.source_ref,'source_proof_sha256',v.source_proof_sha256,
  'phase',v.phase,'model_response_id',v.model_response_id,
  'shift_status',v.shift_status,
  'shift_plan_fingerprint',v.shift_plan_fingerprint,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_authorized_pr_review_model_scope_v1(
 uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_read_authorized_pr_review_model_scope_v1(
 uuid,text,uuid) to service_role;
