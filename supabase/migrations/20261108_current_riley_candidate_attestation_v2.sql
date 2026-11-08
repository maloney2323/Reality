-- Current-shift verifier for exact model-written Riley issue #263 repair.
-- No historical fixed digest. The existing service-only shift readback,
-- owner warrant and independently hashed GitHub source evidence are required.
-- This function NEVER runs/install/approves code or settles a customer job.
create or replace function public.reality_attest_riley_263_candidate_v2(
 p_original_work_id text,p_candidate_source_sha256 text,
 p_candidate_commit_sha text,p_model_response_id text,p_github_run_id bigint
) returns jsonb language plpgsql security invoker
set search_path='' as $fn$
declare
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 s record;
begin
 if current_user<>'service_role' then
  raise exception 'RILEY_CURRENT_CANDIDATE_SERVICE_ROLE_REQUIRED';end if;
 if p_original_work_id!~'^work:[a-f0-9]{32}$' or
    p_candidate_source_sha256!~'^sha256:[a-f0-9]{64}$' or
    p_candidate_commit_sha!~'^[a-f0-9]{40}$' or
    p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$' or
    p_github_run_id<10000 then
  raise exception 'RILEY_CURRENT_CANDIDATE_PINNED_PROOF_REQUIRED';end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
  where original_work_id=p_original_work_id for update;
 if not found or j.issue_number<>263 or
    j.issue_url<>'https://github.com/maloney2323/Reality/issues/263' or
    j.shift_source_proof_sha256!~'^sha256:[a-f0-9]{64}$' or
    j.phase not in ('SOURCE_ADMITTED','CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL') or
    j.installed is distinct from false or
    j.production_changed is distinct from false or
    j.exact_approval_receipt_ref is not null or
    j.original_settlement_receipt_ref is not null then
  raise exception 'RILEY_CURRENT_OWNER_ORIGINAL_PREINSTALL_REQUIRED';end if;
 select sh.shift_id,sh.owner_id,sh.plan_fingerprint into s
 from reality_internal.governed_employee_shifts_v1 sh
 join reality_internal.governed_employee_shift_steps_v1 t
   on t.shift_id=sh.shift_id and t.step_index between 2 and 5
 join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
    and w.plan_fingerprint=sh.plan_fingerprint and w.state='ACTIVE'
 where sh.shift_id=j.shift_id and sh.owner_id=j.owner_id
   and sh.status in ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and sh.authorized_at is not null and sh.closed_at is null
   and sh.planned_start_at<=clock_timestamp()
   and sh.planned_end_at='infinity'::timestamptz
   and t.source_ref=j.issue_url
   and t.source_status='OPEN_ISSUE' and t.state='SOURCE_CHECKED'
   and t.proof_sha256=j.shift_source_proof_sha256
   and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
   and t.proof->>'source_url'=j.issue_url
   and t.proof->>'provider_status'='OPEN_ISSUE'
   and t.proof->>'provider_checked'='true'
   and t.proof->>'read_only'='true'
   and t.proof->>'production_changed'='false'
   and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(t.proof::text,'UTF8')),'hex')
 limit 2;
 if not found or s.owner_id<>j.owner_id then
  raise exception 'RILEY_CURRENT_SHIFT_SOURCE_WARRANT_NO_LONGER_VALID';end if;
 if j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' then
  if j.candidate_artifact_sha256<>p_candidate_source_sha256 or
     j.candidate_commit_sha<>p_candidate_commit_sha or
     j.model_response_id<>p_model_response_id or
     j.independent_proof_run_id<>p_github_run_id then
   raise exception 'RILEY_CURRENT_CANDIDATE_DRIFT_NO_REPLACEMENT';end if;
 else
  update reality_internal.riley_unattended_repair_originals_v1
  set phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL',
      candidate_artifact_sha256=p_candidate_source_sha256,
      candidate_commit_sha=p_candidate_commit_sha,
      model_response_id=p_model_response_id,
      independent_proof_run_id=p_github_run_id
  where original_work_id=p_original_work_id
    and phase='SOURCE_ADMITTED'
    and installed=false and production_changed=false;
  if not found then raise exception 'RILEY_CURRENT_CANDIDATE_ATOMIC_CONFLICT';end if;
 end if;
 return jsonb_build_object(
  'status','EXACT_OWNER_SHIFT_CODE_CANDIDATE_INDEPENDENTLY_TESTED_AWAITING_INSTALL_APPROVAL',
  'shift_id',j.shift_id,'owner_id',j.owner_id,
  'original_work_id',j.original_work_id,
  'source_ref',j.issue_url,
  'source_proof_sha256',j.shift_source_proof_sha256,
  'candidate_artifact_sha256',p_candidate_source_sha256,
  'candidate_commit_sha',p_candidate_commit_sha,
  'model_response_id',p_model_response_id,
  'independent_proof_run_id',p_github_run_id,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_attest_riley_263_candidate_v2(text,text,text,text,bigint)
 from public,anon,authenticated;
grant execute on function public.reality_attest_riley_263_candidate_v2(text,text,text,text,bigint)
 to service_role;