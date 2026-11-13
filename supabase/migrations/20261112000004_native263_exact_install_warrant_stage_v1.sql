-- Native engineering source update warrant for EXACT existing Riley/Taylor job #263.
-- Stage protocol identity now; grant ZERO install approval or replay authority.
-- Only one owner-specific, durable original and frozen reviewed candidate.
create table if not exists reality_internal.native263_exact_install_warrants_v1 (
 original_work_id text primary key
  references reality_internal.riley_unattended_repair_originals_v1(original_work_id)
  check (original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'),
 owner_id uuid not null
  check (owner_id='85eeae0b-2988-43c4-b20c-590fb51da70d'::uuid),
 shift_id uuid not null
  check (shift_id='9460cfff-937a-4105-9093-2e41ab39a950'::uuid),
 source_ref text not null check
  (source_ref='https://github.com/maloney2323/Reality/issues/263'),
 source_proof_sha256 text not null check
  (source_proof_sha256='sha256:2969a5ea2c0ea27446be73c4840d762e669872b3e1a2351524d6a3cc8d9554b4'),
 candidate_commit_sha text not null check
  (candidate_commit_sha='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'),
 candidate_artifact_sha256 text not null check
  (candidate_artifact_sha256='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48'),
 verified_frozen_ci_run_id bigint not null check
  (verified_frozen_ci_run_id=42525028367),
 exact_target_branch text not null check
  (exact_target_branch='reality/isolated-openai-governance-gateway-20261108'),
 exact_target_path text not null check
  (exact_target_path='src/reality-riley-service-original-runtime-v1.js'),
 expected_preinstall_blob_sha text not null check
  (expected_preinstall_blob_sha='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0'),
 expected_installed_blob_sha text not null check
  (expected_installed_blob_sha='dda8e71d44cca6745312bcbd000089d5a0b01d54'),
 approval_receipt_id uuid unique,
 owner_approved_at timestamptz,
 install_intent_recorded_at timestamptz,
 installed_commit_sha text,
 deployment_id text,
 original_execution_run_id bigint,
 original_final_receipt_id uuid,
 state text not null default 'STAGED_UNAPPROVED'
  check (state in ('STAGED_UNAPPROVED','OWNER_APPROVED',
    'INSTALL_INTENT_FENCED','SOURCE_INSTALLED','DEPLOYMENT_VERIFIED',
    'ORIGINAL_EXECUTING','ORIGINAL_SETTLED','EFFECT_UNCERTAIN')),
 prepared_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 constraint exact_native263_install_receipt_state_guard check (
  (state='STAGED_UNAPPROVED'
   and approval_receipt_id is null and owner_approved_at is null
   and install_intent_recorded_at is null and installed_commit_sha is null
   and deployment_id is null and original_execution_run_id is null
   and original_final_receipt_id is null)
  or
  (state<>'STAGED_UNAPPROVED' and approval_receipt_id is not null
    and owner_approved_at is not null)),
 constraint exact_native263_installed_sha_guard check (
  installed_commit_sha is null or installed_commit_sha ~ '^[a-f0-9]{40}$')
);
alter table reality_internal.native263_exact_install_warrants_v1
 enable row level security;
revoke all on reality_internal.native263_exact_install_warrants_v1
 from public,anon,authenticated;
grant select,insert,update on
 reality_internal.native263_exact_install_warrants_v1 to service_role;

create or replace function public.reality_stage_native263_exact_install_warrant_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 g jsonb;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 c reality_internal.native263_exact_install_warrants_v1%rowtype;
 p reality_internal.native263_contents_canary_probes_v2%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_EXACT_INSTALL_WARRANT_SERVICE_ONLY'; end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'shift_id'<>'9460cfff-937a-4105-9093-2e41ab39a950'
  or g->>'owner_id'<>'85eeae0b-2988-43c4-b20c-590fb51da70d'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
  or g->>'completion_bound'<>'true'
  or g->>'execution_scope_from_owner_warrant_only'<>'true'
  or (select count(*) from pg_catalog.jsonb_array_elements(g->'jobs') x
    where x->>'original_work_id'='work:873a6e74fd14c6beacc9042dd8021dfc'
     and x->>'phase'='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
     and x->>'source_ref'='https://github.com/maloney2323/Reality/issues/263'
     and x->>'source_proof_sha256'=
       'sha256:2969a5ea2c0ea27446be73c4840d762e669872b3e1a2351524d6a3cc8d9554b4'
     and x->>'independent_source_proof_verified'='true')<>1
 then raise exception 'NATIVE263_FROZEN_OWNER_SHIFT_ORIGINAL_NOT_CURRENT'; end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 if not found or j.owner_id::text<>g->>'owner_id'
  or j.shift_id::text<>g->>'shift_id'
  or j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
  or j.installed is distinct from false
  or j.production_changed is distinct from false
  or j.candidate_commit_sha<>'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'
  or j.candidate_artifact_sha256<>
    'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48'
  or j.independent_proof_run_id<>42525028367
  or j.exact_approval_receipt_ref is not null
  or j.original_settlement_receipt_ref is not null
 then raise exception 'NATIVE263_REVIEWED_ORIGINAL_OR_PREAPPROVAL_STATE_CHANGED'; end if;
 if not exists (
  select 1 from reality_internal.riley_native_reviewed_candidate_proofs_v1 x
  where x.original_work_id=j.original_work_id
   and x.owner_id=j.owner_id and x.shift_id=j.shift_id
   and x.candidate_commit_sha=j.candidate_commit_sha
   and x.candidate_artifact_sha256=j.candidate_artifact_sha256
   and x.independent_passing_run_id=j.independent_proof_run_id
   and x.frozen_regressions_verified=true
   and x.provider_source_bytes_verified=true
   and x.installed=false and x.owner_installation_authorized=false
 ) then raise exception 'NATIVE263_INDEPENDENTLY_TESTED_FROZEN_SOURCE_MISSING'; end if;
 select * into p from reality_internal.native263_contents_canary_probes_v2
 where probe_key='native263-isolated-github-contents-canary-v2-20261112';
 if not found or p.state<>'VERIFIED'
  or p.result_status<>'WRITE_READBACK_VERIFIED'
  or p.github_http_status<>201 or
  p.provider_commit_sha<>'e2dbe182f74c7036255ebdc9637b893fd55da75c'
 then raise exception 'NATIVE263_REALITY_GITHUB_CONTENTS_WRITE_PERMISSION_NOT_PROVEN'; end if;
 insert into reality_internal.native263_exact_install_warrants_v1(
  original_work_id,owner_id,shift_id,source_ref,source_proof_sha256,
  candidate_commit_sha,candidate_artifact_sha256,verified_frozen_ci_run_id,
  exact_target_branch,exact_target_path,expected_preinstall_blob_sha,
  expected_installed_blob_sha)
 values (
  j.original_work_id,j.owner_id,j.shift_id,j.issue_url,
  j.shift_source_proof_sha256,j.candidate_commit_sha,
  j.candidate_artifact_sha256,j.independent_proof_run_id,
  'reality/isolated-openai-governance-gateway-20261108',
  'src/reality-riley-service-original-runtime-v1.js',
  'aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0',
  'dda8e71d44cca6745312bcbd000089d5a0b01d54')
 on conflict (original_work_id) do nothing;
 select * into c from reality_internal.native263_exact_install_warrants_v1
 where original_work_id=j.original_work_id;
 if not found or c.owner_id<>j.owner_id or c.shift_id<>j.shift_id
  or c.candidate_artifact_sha256<>j.candidate_artifact_sha256
  or c.candidate_commit_sha<>j.candidate_commit_sha
  or c.source_proof_sha256<>j.shift_source_proof_sha256
 then raise exception 'NATIVE263_EXACT_STAGED_WARRANT_CHANGED'; end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_NATIVE263_INSTALL_WARRANT_STAGED_PREAPPROVAL',
  'original_work_id',c.original_work_id,
  'owner_id',c.owner_id,'shift_id',c.shift_id,
  'source_ref',c.source_ref,'source_proof_sha256',c.source_proof_sha256,
  'candidate_commit_sha',c.candidate_commit_sha,
  'candidate_artifact_sha256',c.candidate_artifact_sha256,
  'existing_file_path',c.exact_target_path,
  'exact_target_branch',c.exact_target_branch,
  'expected_preinstall_blob_sha',c.expected_preinstall_blob_sha,
  'expected_installed_blob_sha',c.expected_installed_blob_sha,
  'github_contents_permission_independently_verified',true,
  'state',c.state,'owner_approval_ready',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'automatic_deployment_verified',false,
  'postinstall_original_resumption_verified',false);
end $fn$;
revoke all on function public.reality_stage_native263_exact_install_warrant_v1()
 from public,anon,authenticated;
grant execute on function public.reality_stage_native263_exact_install_warrant_v1()
 to service_role;

-- No owner-approval mutation or source-code effect is exposed by this
-- migration. A later separately verified stage must bind Chat owner consent
-- to independently proven automated deployment and same-original execution.
create or replace function public.reality_read_native263_exact_install_warrant_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_WARRANT_READ_SERVICE_ONLY';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NATIVE263_INSTALL_WARRANT_NOT_STAGED',
  'approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_NATIVE263_WARRANT_READBACK',
  'original_work_id',c.original_work_id,'owner_id',c.owner_id,
  'shift_id',c.shift_id,'candidate_artifact_sha256',c.candidate_artifact_sha256,
  'state',c.state,'approval_ready',false,
  'exact_approval_receipt_recorded',c.approval_receipt_id is not null,
  'source_installed',c.installed_commit_sha is not null,
  'deployment_verified',c.deployment_id is not null,
  'original_execution_run_recorded',c.original_execution_run_id is not null,
  'original_final_receipt_recorded',c.original_final_receipt_id is not null,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_native263_exact_install_warrant_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_native263_exact_install_warrant_v1()
 to service_role;
