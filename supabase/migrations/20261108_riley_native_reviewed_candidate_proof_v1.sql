-- Exact independent frozen source artifact under the existing owner-shift
-- native original. Reviewed engineering provenance is NOT an autonomous
-- model-generated capability, install authority, or settled original job.
create table if not exists reality_internal.riley_native_reviewed_candidate_proofs_v1(
 original_work_id text primary key
  references reality_internal.riley_unattended_repair_originals_v1(original_work_id),
 owner_id uuid not null,
 shift_id uuid not null references reality_internal.governed_employee_shifts_v1(shift_id),
 issue_url text not null
  check(issue_url='https://github.com/maloney2323/Reality/issues/263'),
 shift_source_proof_sha256 text not null
  check(shift_source_proof_sha256~'^sha256:[a-f0-9]{64}$'),
 source_file_path text not null
  check(source_file_path='src/reality-riley-service-original-runtime-v1.js'),
 candidate_branch text not null
  check(candidate_branch~'^reality/riley/repair-263-[a-z0-9-]{8,90}$'),
 candidate_commit_sha text not null
  check(candidate_commit_sha~'^[a-f0-9]{40}$'),
 candidate_artifact_sha256 text not null
  check(candidate_artifact_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_passing_run_id bigint not null check(independent_passing_run_id>10000),
 independent_failing_run_id bigint not null check(independent_failing_run_id>10000),
 independent_run_url text not null check(
  independent_run_url~'^https://github.com/maloney2323/Reality/actions/runs/[1-9][0-9]+$'),
 provenance text not null check(provenance='CHATGPT_REVIEWED_ENGINEERING_PATCH_AFTER_REJECTED_MODEL_DRAFT'),
 frozen_regressions_verified boolean not null check(frozen_regressions_verified),
 provider_source_bytes_verified boolean not null check(provider_source_bytes_verified),
 verified_at timestamptz not null default clock_timestamp(),
 owner_installation_authorized boolean not null default false check(not owner_installation_authorized),
 installed boolean not null default false check(not installed),
 original_job_completed boolean not null default false check(not original_job_completed),
 production_changed boolean not null default false check(not production_changed)
);
revoke all on reality_internal.riley_native_reviewed_candidate_proofs_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.riley_native_reviewed_candidate_proofs_v1 to service_role;
create or replace function public.reality_read_owner_native_reviewed_patch_v1(
 p_owner_id uuid,p_shift_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare g jsonb;v record;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE_REVIEWED_PATCH_SERVICE_ONLY';end if;
 if p_owner_id is null or p_shift_id is null then
  raise exception 'NATIVE_REVIEWED_PATCH_OWNER_AND_SHIFT_REQUIRED';end if;
 g:=public.reality_read_owner_shift_execution_graph_v1(p_owner_id,p_shift_id);
 if g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED' or
  g->>'owner_id'<>p_owner_id::text or g->>'shift_id'<>p_shift_id::text then
  return jsonb_build_object('status','NO_CURRENT_OWNER_NATIVE_REVIEWED_PATCH',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);end if;
 select p.* into v from reality_internal.riley_native_reviewed_candidate_proofs_v1 p
 join reality_internal.riley_unattended_repair_originals_v1 j
  on j.original_work_id=p.original_work_id and j.owner_id=p.owner_id
  and j.shift_id=p.shift_id and j.issue_url=p.issue_url
  and j.shift_source_proof_sha256=p.shift_source_proof_sha256
  and j.phase='SOURCE_ADMITTED' and j.installed=false
  and j.production_changed=false
 where p.owner_id=p_owner_id and p.shift_id=p_shift_id
   and exists(select 1 from jsonb_array_elements(g->'jobs') x
    where x->>'original_work_id'=p.original_work_id
     and x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL'
     and x->>'source_ref'=p.issue_url
     and x->>'source_proof_sha256'=p.shift_source_proof_sha256)
 limit 2;
 if not found then return jsonb_build_object(
  'status','NO_CURRENT_OWNER_NATIVE_REVIEWED_PATCH',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);end if;
 return jsonb_build_object(
  'status','EXACT_NATIVE_ENGINEERING_PATCH_INDEPENDENTLY_TESTED_REVIEW_ONLY',
  'owner_id',v.owner_id,'shift_id',v.shift_id,
  'original_work_id',v.original_work_id,'source_ref',v.issue_url,
  'source_proof_sha256',v.shift_source_proof_sha256,
  'source_file_path',v.source_file_path,
  'candidate_commit_sha',v.candidate_commit_sha,
  'candidate_artifact_sha256',v.candidate_artifact_sha256,
  'independent_passing_run_id',v.independent_passing_run_id,
  'independent_failing_run_id',v.independent_failing_run_id,
  'independent_run_url',v.independent_run_url,
  'provenance',v.provenance,'verified_at',v.verified_at,
  'native_install_to_settlement_accepted',false,
  'owner_approval_ready',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_native_reviewed_patch_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_native_reviewed_patch_v1(uuid,uuid)
 to service_role;