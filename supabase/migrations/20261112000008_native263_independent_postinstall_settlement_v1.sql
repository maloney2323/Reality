-- Connect exact approved #263 native install to independent, distinct
-- GitHub CI and original-job acceptance readbacks, then ONE atomic final receipt.
-- This migration does not approve #263, execute the installer or fabricate
-- provider run IDs. The existing owner shift and frozen original are preserved.
alter table reality_internal.riley_native_independent_final_receipts_v1
 drop constraint riley_native_independent_final_re_isolated_install_branch_check;
alter table reality_internal.riley_native_independent_final_receipts_v1
 add constraint riley_native_independent_final_re_isolated_install_branch_check
 check (isolated_install_branch ~ '^reality/riley/[a-z0-9/-]{8,110}$' or
  isolated_install_branch='reality/isolated-openai-governance-gateway-20261108');

create or replace function public.reality_read_native263_postinstall_context_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_native_exact_install_approvals_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_POSTINSTALL_PROVIDER_SERVICE_ONLY';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id=c.original_work_id;
 if c.owner_id is distinct from j.owner_id or
   c.shift_id is distinct from j.shift_id or
   c.candidate_artifact_sha256 is distinct from j.candidate_artifact_sha256 or
   j.production_changed is distinct from false
 then raise exception 'NATIVE263_POSTINSTALL_FROZEN_ORIGINAL_DRIFT';end if;
 if c.approval_receipt_id is not null then
  select * into a from reality_internal.riley_native_exact_install_approvals_v1
  where approval_id=c.approval_receipt_id;
  if not found or a.original_work_id<>c.original_work_id or
   a.owner_id<>c.owner_id or a.shift_id<>c.shift_id or
   a.artifact_sha256<>c.candidate_artifact_sha256 or
   j.exact_approval_receipt_ref<>
    'supabase:riley_native_exact_install_approvals_v1:'||a.approval_id::text
  then raise exception 'NATIVE263_POSTINSTALL_APPROVAL_RECEIPT_MISMATCH';end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT',
  'original_work_id',c.original_work_id,'owner_id',c.owner_id,
  'shift_id',c.shift_id,'source_ref',c.source_ref,
  'candidate_artifact_sha256',c.candidate_artifact_sha256,
  'candidate_commit_sha',c.candidate_commit_sha,
  'frozen_verifier_run_id',c.verified_frozen_ci_run_id,
  'target_branch',c.exact_target_branch,'target_path',c.exact_target_path,
  'expected_installed_blob_sha',c.expected_installed_blob_sha,
  'state',c.state,'installed_commit_sha',c.installed_commit_sha,
  'approval_receipt_id',c.approval_receipt_id,
  'owner_approved_at',c.owner_approved_at,
  'original_phase',j.phase,'original_installed',j.installed,
  'original_final_receipt_id',c.original_final_receipt_id,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_native263_postinstall_context_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_native263_postinstall_context_v1()
 to service_role;

create or replace function public.reality_settle_native263_original_after_independent_provider_v1(
 p_installed_commit_sha text,
 p_installed_provider_run_id bigint,
 p_original_execution_run_id bigint,
 p_final_evidence_sha256 text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_native_exact_install_approvals_v1%rowtype;
 receipt_id uuid;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_INDEPENDENT_ORIGINAL_SETTLEMENT_SERVICE_ONLY';end if;
 if coalesce(p_installed_commit_sha,'') !~ '^[a-f0-9]{40}$' or
  coalesce(p_final_evidence_sha256,'') !~ '^sha256:[a-f0-9]{64}$' or
  p_installed_provider_run_id is null or p_installed_provider_run_id<=10000 or
  p_original_execution_run_id is null or p_original_execution_run_id<=10000 or
  p_installed_provider_run_id=p_original_execution_run_id
 then raise exception 'NATIVE263_DISTINCT_REAL_PROVIDER_RUNS_REQUIRED';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
  where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'
  for update;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
  where original_work_id=c.original_work_id for update;
 if c.state='ORIGINAL_SETTLED' then
  return pg_catalog.jsonb_build_object(
   'status','NATIVE263_ORIGINAL_ALREADY_INDEPENDENTLY_SETTLED_NO_REPLAY',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'original_final_receipt_id',c.original_final_receipt_id,
   'original_job_completed',true,'production_changed',false);
 end if;
 select * into a from reality_internal.riley_native_exact_install_approvals_v1
  where approval_id=c.approval_receipt_id;
 if not found or c.state<>'SOURCE_INSTALLED' or
  c.installed_commit_sha<>p_installed_commit_sha or
  c.installed_commit_sha is null or
  c.install_intent_recorded_at is null or
  c.owner_approved_at is null or
  c.expected_installed_blob_sha<>'dda8e71d44cca6745312bcbd000089d5a0b01d54' or
  c.owner_id<>a.owner_id or c.shift_id<>a.shift_id or
  c.candidate_artifact_sha256<>a.artifact_sha256 or
  j.owner_id<>c.owner_id or j.shift_id<>c.shift_id or
  j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' or
  j.installed is distinct from false or
  j.production_changed is distinct from false or
  j.exact_approval_receipt_ref is distinct from
   'supabase:riley_native_exact_install_approvals_v1:'||a.approval_id::text or
  j.original_settlement_receipt_ref is not null
 then raise exception 'NATIVE263_SETTLEMENT_EXACT_APPROVAL_OR_ORIGINAL_DRIFT';end if;
 insert into reality_internal.riley_native_independent_final_receipts_v1(
  original_work_id,shift_id,owner_id,source_ref,source_proof_sha256,
  candidate_artifact_sha256,candidate_commit_sha,frozen_verifier_run_id,
  approval_receipt_ref,isolated_install_branch,installed_commit_sha,
  installed_provider_run_id,original_execution_run_id,final_receipt_sha256,
  installed_provider_readback_verified,original_execution_independently_verified,
  final_outcome,production_changed)
 values(c.original_work_id,c.shift_id,c.owner_id,c.source_ref,
  c.source_proof_sha256,c.candidate_artifact_sha256,c.candidate_commit_sha,
  c.verified_frozen_ci_run_id,j.exact_approval_receipt_ref,
  c.exact_target_branch,c.installed_commit_sha,
  p_installed_provider_run_id,p_original_execution_run_id,p_final_evidence_sha256,
  true,true,'SUCCEEDED',false)
 returning reality_internal.riley_native_independent_final_receipts_v1.receipt_id into receipt_id;
 update reality_internal.riley_unattended_repair_originals_v1
  set phase='SETTLED',installed=true,
   original_settlement_receipt_ref=
    'supabase:riley_native_independent_final_receipts_v1:'||receipt_id::text
  where original_work_id=c.original_work_id
   and phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
   and installed=false and original_settlement_receipt_ref is null;
 if not found then raise exception 'NATIVE263_FINAL_ORIGINAL_SETTLEMENT_ATOMIC_RACE';end if;
 update reality_internal.native263_exact_install_warrants_v1
  set state='ORIGINAL_SETTLED',original_execution_run_id=p_original_execution_run_id,
   original_final_receipt_id=receipt_id,
   deployment_id='vercel-preview-branch-commit:'||p_installed_commit_sha,
   updated_at=clock_timestamp()
  where original_work_id=c.original_work_id and state='SOURCE_INSTALLED'
  and installed_commit_sha=p_installed_commit_sha;
 if not found then raise exception 'NATIVE263_FINAL_WARRANT_ATOMIC_RACE';end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED',
  'original_work_id',c.original_work_id,'shift_id',c.shift_id,
  'approval_receipt_id',a.approval_id,'installed_commit_sha',p_installed_commit_sha,
  'independent_install_ci_run_id',p_installed_provider_run_id,
  'independent_original_execution_run_id',p_original_execution_run_id,
  'final_receipt_sha256',p_final_evidence_sha256,
  'original_final_receipt_id',receipt_id,
  'original_job_completed',true,'production_changed',false);
end $fn$;
revoke all on function public.reality_settle_native263_original_after_independent_provider_v1(text,bigint,bigint,text)
 from public,anon,authenticated;
grant execute on function public.reality_settle_native263_original_after_independent_provider_v1(text,bigint,bigint,text)
 to service_role;

-- A positive release gate attests that the post-install *mechanism* has
-- passed independently verified code/SQL + Git integration checks.
-- Actual original-job settlement remains unrecorded until real provider runs.
create or replace function public.reality_attest_native263_install_continuation_path_v1(
 p_release_commit_sha text,
 p_release_ci_run_id bigint)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 t reality_internal.native263_preview_auto_deploy_probes_v1%rowtype;
 evidence text;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_PATH_ATTESTATION_SERVICE_ONLY';end if;
 if coalesce(p_release_commit_sha,'') !~ '^[a-f0-9]{40}$' or
  p_release_ci_run_id is null or p_release_ci_run_id<=10000
 then raise exception 'NATIVE263_SIGNED_PROVEN_RELEASE_COMMIT_REQUIRED';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
  where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'
  for update;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
  where original_work_id=c.original_work_id;
 select * into t from reality_internal.native263_preview_auto_deploy_probes_v1
  where probe_key='native263-active-preview-auto-deploy-20261112';
 if c.state<>'STAGED_UNAPPROVED' or
  j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' or
  j.installed is distinct from false or
  j.exact_approval_receipt_ref is not null or
  j.original_settlement_receipt_ref is not null or
  c.approval_receipt_id is not null or
  c.owner_id<>j.owner_id or
  c.shift_id<>j.shift_id or
  c.candidate_artifact_sha256<>j.candidate_artifact_sha256 or
  t.state<>'WRITE_VERIFIED' or
  t.result_status<>'GITHUB_COMMIT_READBACK_VERIFIED' or
  t.provider_commit_sha<>'814fea1086ba6a7aa05c88544b2782c25eeebef7' or
  not exists(select 1 from reality_internal.native263_contents_canary_probes_v2
   where state='VERIFIED' and result_status='WRITE_READBACK_VERIFIED'
    and github_http_status=201)
 then raise exception 'NATIVE263_PATH_STILL_MISSING_FROZEN_OWNER_OR_PROVIDER_PROOF';end if;
 evidence:='native263-postinstall-protocol-v1|'||p_release_commit_sha||'|'||
  p_release_ci_run_id::text||'|'||c.original_work_id||'|'||
  c.candidate_artifact_sha256||'|'||t.provider_commit_sha;
 update reality_internal.riley_native_exact_install_readiness_v1
  set state='VERIFIED_READY_FOR_ONE_EXACT_OWNER_APPROVAL',
   source_write_verified=true,automatic_preview_deploy_verified=true,
   same_original_continuation_and_receipt_verified=true,
   independent_evidence_sha256='sha256:'||
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(evidence,'UTF8')),'hex'),
   verified_at=clock_timestamp()
  where original_work_id=c.original_work_id
   and state='BLOCKED_AWAITING_VERIFIED_CONTINUATION';
 if not found then
  raise exception 'NATIVE263_PATH_ATTESTATION_ALREADY_USED_OR_UNVERIFIED';end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_CONTINUATION_AND_RECEIPT_PATH_INDEPENDENTLY_TESTED_READY',
  'original_work_id',c.original_work_id,'shift_id',c.shift_id,
  'release_commit_sha',p_release_commit_sha,
  'release_ci_run_id',p_release_ci_run_id,
  'owner_approval_ready',true,
  'owner_approval_recorded',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_attest_native263_install_continuation_path_v1(text,bigint)
 from public,anon,authenticated;
grant execute on function public.reality_attest_native263_install_continuation_path_v1(text,bigint)
 to service_role;
