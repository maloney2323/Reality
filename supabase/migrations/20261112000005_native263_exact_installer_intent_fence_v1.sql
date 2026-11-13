-- Service-only native #263 exact existing-file installer intent.
-- No owner approval is created here; all source effects remain blocked until
-- a separate durable, exact owner-approved receipt is present.
create or replace function public.reality_claim_exact_native263_install_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 c reality_internal.native263_exact_install_warrants_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 v_count int;
 v_expected_ref text;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_INSTALL_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'
 for update;
 if not found then return pg_catalog.jsonb_build_object(
  'status','EXACT_NATIVE263_INSTALL_WARRANT_NOT_STAGED_NO_WRITE',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id=c.original_work_id and owner_id=c.owner_id
  and shift_id=c.shift_id for update;
 if not found or j.issue_number<>263 or
    j.issue_url<>c.source_ref or
    j.shift_source_proof_sha256<>c.source_proof_sha256 or
    j.candidate_commit_sha<>c.candidate_commit_sha or
    j.candidate_artifact_sha256<>c.candidate_artifact_sha256 or
    j.independent_proof_run_id<>c.verified_frozen_ci_run_id or
    j.production_changed is distinct from false or
    j.original_settlement_receipt_ref is not null then
  raise exception 'NATIVE263_INSTALL_CURRENT_ORIGINAL_INCONSISTENT';end if;
 if c.state='STAGED_UNAPPROVED' then
  if c.approval_receipt_id is not null or
     c.owner_approved_at is not null or
     j.exact_approval_receipt_ref is not null or
     j.installed is distinct from false then
   raise exception 'NATIVE263_STAGED_PREAPPROVAL_BOUNDARY_DRIFT';end if;
  return pg_catalog.jsonb_build_object(
   'status','EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'candidate_artifact_sha256',c.candidate_artifact_sha256,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 if c.state='SOURCE_INSTALLED' then
  return pg_catalog.jsonb_build_object(
   'status','NATIVE263_INSTALLED_SOURCE_PENDING_DEPLOYMENT_AND_RESUME',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'installed_commit_sha',c.installed_commit_sha,
   'source_installed',true,'original_job_completed',false,
   'production_changed',false);
 end if;
 if c.state='INSTALL_INTENT_FENCED' then
  return pg_catalog.jsonb_build_object(
   'status','NATIVE263_PUBLISH_INTENT_ALREADY_FENCED_READBACK_ONLY',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'expected_installed_blob_sha',c.expected_installed_blob_sha,
   'source_installed',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 if c.state<>'OWNER_APPROVED' then
  return pg_catalog.jsonb_build_object(
   'status','NATIVE263_INSTALL_LATER_PHASE_RECONCILIATION_ONLY',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'original_job_completed',false,'production_changed',false);
 end if;
 -- Future authenticated owner Chat approval must bind exact durable receipt.
 v_expected_ref:='supabase:riley_native_exact_install_approvals_v1:'||
  c.approval_receipt_id::text;
 if c.approval_receipt_id is null or
  c.owner_approved_at is null or
  j.exact_approval_receipt_ref is distinct from v_expected_ref or
  j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' or
  j.installed is distinct from false or
  c.install_intent_recorded_at is not null or
  c.installed_commit_sha is not null then
  raise exception 'NATIVE263_EXACT_OWNER_APPROVAL_RECEIPT_REQUIRED';end if;
 if not exists (
  select 1 from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
  where s.shift_id=c.shift_id and s.owner_id=c.owner_id
   and s.authorized_at is not null and s.closed_at is null
   and s.planned_end_at='infinity'::timestamptz
   and s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and w.state='ACTIVE'
 ) then raise exception 'NATIVE263_EXACT_OWNER_SHIFT_EXPIRED';end if;
 update reality_internal.native263_exact_install_warrants_v1
 set state='INSTALL_INTENT_FENCED',
  install_intent_recorded_at=clock_timestamp(),
  updated_at=clock_timestamp()
 where original_work_id=c.original_work_id and state='OWNER_APPROVED'
  and install_intent_recorded_at is null
 returning * into c;
 if not found then raise exception 'NATIVE263_INSTALL_INTENT_RACE_FENCED';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_NATIVE263_OWNER_APPROVED_INSTALL_INTENT_FENCED',
  'owner_id',c.owner_id,'shift_id',c.shift_id,
  'original_work_id',c.original_work_id,
  'approval_receipt_ref',v_expected_ref,
  'candidate_commit_sha',c.candidate_commit_sha,
  'candidate_artifact_sha256',c.candidate_artifact_sha256,
  'target_branch',c.exact_target_branch,
  'target_file_path',c.exact_target_path,
  'expected_preinstall_blob_sha',c.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',c.expected_installed_blob_sha,
  'installation_authorized',true,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_claim_exact_native263_install_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_exact_native263_install_v1()
 to service_role;

create or replace function public.reality_attest_exact_native263_installed_source_v1(
 p_commit_sha text,p_blob_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_SOURCE_RECEIPT_SERVICE_ROLE_REQUIRED';end if;
 if coalesce(p_commit_sha,'') !~ '^[a-f0-9]{40}$' or
    p_blob_sha<>'dda8e71d44cca6745312bcbd000089d5a0b01d54'
 then raise exception 'NATIVE263_EXACT_INSTALLED_BLOB_REQUIRED';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'
 for update;
 if not found or c.approval_receipt_id is null or
    c.owner_approved_at is null or
    c.install_intent_recorded_at is null or
    c.state not in ('INSTALL_INTENT_FENCED','SOURCE_INSTALLED') or
    (c.installed_commit_sha is not null and
     c.installed_commit_sha<>p_commit_sha)
 then raise exception 'NATIVE263_APPROVED_ONE_TIME_INSTALL_INTENT_REQUIRED';end if;
 if c.state='INSTALL_INTENT_FENCED' then
  update reality_internal.native263_exact_install_warrants_v1
  set state='SOURCE_INSTALLED',installed_commit_sha=p_commit_sha,
   updated_at=clock_timestamp()
  where original_work_id=c.original_work_id
   and state='INSTALL_INTENT_FENCED'
  returning * into c;
  if not found then raise exception 'NATIVE263_SOURCE_INSTALL_RACE';end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_EXACT_SOURCE_PROVIDER_READBACK_RECORDED',
  'original_work_id',c.original_work_id,'shift_id',c.shift_id,
  'installed_commit_sha',c.installed_commit_sha,
  'installed_blob_sha',p_blob_sha,'source_installed',true,
  'deployment_verified',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_attest_exact_native263_installed_source_v1(text,text)
 from public,anon,authenticated;
grant execute on function public.reality_attest_exact_native263_installed_source_v1(text,text)
 to service_role;
