-- Governed auto-deploy transport test. Creates ONE inert GitHub commit on
-- the existing isolated preview branch; does not install native #263.
-- This is a fresh, non-replayable permission+wake test, not a job approval.
create table if not exists reality_internal.native263_preview_auto_deploy_probes_v1 (
 probe_key text primary key check
  (probe_key='native263-active-preview-auto-deploy-20261112'),
 original_work_id text not null check
  (original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'),
 shift_id uuid not null check
  (shift_id='9460cfff-937a-4105-9093-2e41ab39a950'::uuid),
 preview_before_sha text not null check
  (preview_before_sha ~ '^[a-f0-9]{40}$'),
 state text not null default 'CLAIMED'
  check (state in ('CLAIMED','WRITE_VERIFIED','BLOCKED','EFFECT_UNCERTAIN')),
 result_status text,
 provider_http_status integer,
 provider_commit_sha text check
  (provider_commit_sha is null or provider_commit_sha ~ '^[a-f0-9]{40}$'),
 provider_blob_sha text check
  (provider_blob_sha is null or provider_blob_sha ~ '^[a-f0-9]{40}$'),
 claimed_at timestamptz not null default clock_timestamp(),
 recorded_at timestamptz,
 constraint native263_auto_deploy_probe_verified_fence_v1 check
  (state<>'WRITE_VERIFIED' or (result_status='GITHUB_COMMIT_READBACK_VERIFIED'
   and provider_http_status=201 and provider_commit_sha is not null
   and provider_blob_sha is not null))
);
alter table reality_internal.native263_preview_auto_deploy_probes_v1
 enable row level security;
revoke all on reality_internal.native263_preview_auto_deploy_probes_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.native263_preview_auto_deploy_probes_v1
 to service_role;

create or replace function public.reality_claim_native263_preview_auto_deploy_probe_v1(
 p_preview_head_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
 g jsonb; j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 w reality_internal.native263_exact_install_warrants_v1%rowtype;
 c reality_internal.native263_preview_auto_deploy_probes_v1%rowtype;
 inserted boolean:=false;
begin
 if current_user<>'service_role' then
  raise exception 'AUTO_DEPLOY_PROBE_TRUSTED_SERVICE_ONLY';end if;
 if coalesce(p_preview_head_sha,'') !~ '^[a-f0-9]{40}$' then
  raise exception 'AUTO_DEPLOY_PREVIEW_HEAD_SHA_REQUIRED';end if;
 g:=public.reality_read_current_shift_execution_graph_v1();
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  or g->>'owner_id'<>'85eeae0b-2988-43c4-b20c-590fb51da70d'
  or g->>'shift_id'<>'9460cfff-937a-4105-9093-2e41ab39a950'
  or g->>'completion_bound'<>'true'
  or g->>'execution_scope_from_owner_warrant_only'<>'true'
  or g->>'installation_authorized'<>'false'
  or g->>'production_changed'<>'false'
  or (select count(*) from pg_catalog.jsonb_array_elements(g->'jobs') x
   where x->>'original_work_id'='work:873a6e74fd14c6beacc9042dd8021dfc'
    and x->>'phase'='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
    and x->>'independent_source_proof_verified'='true'
    and x->>'source_ref'='https://github.com/maloney2323/Reality/issues/263')<>1
 then raise exception 'AUTO_DEPLOY_ORIGINAL_OWNER_WARRANT_DRIFT';end if;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
 where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 if not found or j.owner_id::text<>g->>'owner_id'
  or j.shift_id::text<>g->>'shift_id'
  or j.installed is distinct from false
  or j.production_changed is distinct from false
  or j.exact_approval_receipt_ref is not null
  or j.original_settlement_receipt_ref is not null
  or j.candidate_commit_sha<>'e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'
 then raise exception 'AUTO_DEPLOY_EXACT_UNINSTALLED_ORIGINAL_REQUIRED';end if;
 select * into w from reality_internal.native263_exact_install_warrants_v1
 where original_work_id=j.original_work_id;
 if not found or w.owner_id<>j.owner_id or w.shift_id<>j.shift_id
  or w.state<>'STAGED_UNAPPROVED'
  or w.approval_receipt_id is not null
  or w.owner_approved_at is not null
  or w.installed_commit_sha is not null
  or w.deployment_id is not null
  or w.original_final_receipt_id is not null
  or w.exact_target_branch<>'reality/isolated-openai-governance-gateway-20261108'
  or w.expected_preinstall_blob_sha<>'aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0'
 then raise exception 'AUTO_DEPLOY_EXACT_UNAPPROVED_INSTALL_WARRANT_REQUIRED';end if;
 if not exists (
  select 1 from reality_internal.native263_contents_canary_probes_v2
  where probe_key='native263-isolated-github-contents-canary-v2-20261112'
   and state='VERIFIED' and result_status='WRITE_READBACK_VERIFIED'
   and github_http_status=201
 ) then raise exception 'AUTO_DEPLOY_GOVERNED_GITHUB_WRITE_NOT_PROVEN';end if;
 insert into reality_internal.native263_preview_auto_deploy_probes_v1(
   probe_key,original_work_id,shift_id,preview_before_sha)
 values ('native263-active-preview-auto-deploy-20261112',
  j.original_work_id,j.shift_id,p_preview_head_sha)
 on conflict do nothing returning * into c;
 inserted:=found;
 if not inserted then
  select * into c from reality_internal.native263_preview_auto_deploy_probes_v1
  where probe_key='native263-active-preview-auto-deploy-20261112';
 end if;
 return pg_catalog.jsonb_build_object(
  'status',case when inserted then
   'EXACT_INERT_ACTIVE_PREVIEW_DEPLOY_PROBE_CLAIMED'
   else 'EXISTING_ACTIVE_PREVIEW_PROBE_FENCED_NO_REPOST' end,
  'original_work_id',c.original_work_id,'shift_id',c.shift_id,
  'preview_before_sha',c.preview_before_sha,'state',c.state,
  'result_status',c.result_status,'provider_commit_sha',c.provider_commit_sha,
  'provider_http_status',c.provider_http_status,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;

create or replace function public.reality_record_native263_preview_auto_deploy_probe_v1(
 p_result_status text,p_provider_http_status integer,
 p_provider_commit_sha text default null,p_provider_blob_sha text default null
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_preview_auto_deploy_probes_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'AUTO_DEPLOY_PROBE_RESULT_SERVICE_ONLY';end if;
 if p_result_status not in (
  'GITHUB_COMMIT_READBACK_VERIFIED','GITHUB_WRITE_HTTP_403',
  'GITHUB_WRITE_HTTP_REJECTED','GITHUB_PROVIDER_EFFECT_UNCERTAIN',
  'GITHUB_BRANCH_OR_SOURCE_DRIFT','GITHUB_PREEXISTING_FILE_BLOCKED',
  'GITHUB_SOURCE_READBACK_UNVERIFIED') or
  (p_provider_http_status is not null and
    (p_provider_http_status<100 or p_provider_http_status>599)) or
  (p_result_status='GITHUB_COMMIT_READBACK_VERIFIED' and
    (p_provider_http_status is distinct from 201 or
     coalesce(p_provider_commit_sha,'') !~ '^[a-f0-9]{40}$' or
     coalesce(p_provider_blob_sha,'') !~ '^[a-f0-9]{40}$')) or
  (p_result_status<>'GITHUB_COMMIT_READBACK_VERIFIED' and
    (p_provider_commit_sha is not null or p_provider_blob_sha is not null))
 then raise exception 'AUTO_DEPLOY_PROBE_RESULT_INVALID';end if;
 update reality_internal.native263_preview_auto_deploy_probes_v1
 set state=case
   when p_result_status='GITHUB_COMMIT_READBACK_VERIFIED'
    then 'WRITE_VERIFIED'
   when p_result_status='GITHUB_PROVIDER_EFFECT_UNCERTAIN'
    then 'EFFECT_UNCERTAIN'
   else 'BLOCKED' end,
  result_status=p_result_status,
  provider_http_status=p_provider_http_status,
  provider_commit_sha=p_provider_commit_sha,
  provider_blob_sha=p_provider_blob_sha,
  recorded_at=clock_timestamp()
 where probe_key='native263-active-preview-auto-deploy-20261112'
  and state='CLAIMED'
 returning * into c;
 if not found then
  select * into c from reality_internal.native263_preview_auto_deploy_probes_v1
   where probe_key='native263-active-preview-auto-deploy-20261112';
  if not found then raise exception 'AUTO_DEPLOY_PROBE_CLAIM_MISSING';end if;
 end if;
 return pg_catalog.jsonb_build_object(
  'status','NATIVE263_AUTO_DEPLOY_GITHUB_TRIGGER_EVIDENCE_RECORDED',
  'state',c.state,'result_status',c.result_status,
  'original_work_id',c.original_work_id,'shift_id',c.shift_id,
  'provider_commit_sha',c.provider_commit_sha,
  'provider_blob_sha',c.provider_blob_sha,
  'provider_http_status',c.provider_http_status,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_claim_native263_preview_auto_deploy_probe_v1(text)
 from public,anon,authenticated;
revoke all on function public.reality_record_native263_preview_auto_deploy_probe_v1(text,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_native263_preview_auto_deploy_probe_v1(text)
 to service_role;
grant execute on function public.reality_record_native263_preview_auto_deploy_probe_v1(text,integer,text,text)
 to service_role;
