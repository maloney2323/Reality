-- Native #263 authenticated owner Chat click -> durable exact install approval.
-- Default release state is BLOCKED until independent same-original
-- deploy/continuation/settlement evidence is verified. This migration never
-- approves the candidate, invokes the installer, or creates a second shift.
create table if not exists reality_internal.riley_native_exact_install_readiness_v1 (
 original_work_id text primary key check
  (original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'),
 state text not null default 'BLOCKED_AWAITING_VERIFIED_CONTINUATION'
  check (state in ('BLOCKED_AWAITING_VERIFIED_CONTINUATION',
                  'VERIFIED_READY_FOR_ONE_EXACT_OWNER_APPROVAL')),
 source_write_verified boolean not null default false,
 automatic_preview_deploy_verified boolean not null default false,
 same_original_continuation_and_receipt_verified boolean not null default false,
 independent_evidence_sha256 text,
 verified_at timestamptz,
 constraint native263_release_proof_required_v1 check (
  state='BLOCKED_AWAITING_VERIFIED_CONTINUATION' or
  (source_write_verified and automatic_preview_deploy_verified and
   same_original_continuation_and_receipt_verified and verified_at is not null
   and independent_evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'))
);
alter table reality_internal.riley_native_exact_install_readiness_v1
 enable row level security;
revoke all on reality_internal.riley_native_exact_install_readiness_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.riley_native_exact_install_readiness_v1
 to service_role;
insert into reality_internal.riley_native_exact_install_readiness_v1(
 original_work_id,source_write_verified,automatic_preview_deploy_verified,
 same_original_continuation_and_receipt_verified)
values ('work:873a6e74fd14c6beacc9042dd8021dfc',true,true,false)
on conflict (original_work_id) do nothing;

create table if not exists reality_internal.riley_native_exact_install_approvals_v1 (
 approval_id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 owner_id uuid not null check
  (owner_id='85eeae0b-2988-43c4-b20c-590fb51da70d'::uuid),
 original_work_id text not null unique check
  (original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc'),
 shift_id uuid not null check
  (shift_id='9460cfff-937a-4105-9093-2e41ab39a950'::uuid),
 artifact_sha256 text not null check
  (artifact_sha256='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48'),
 source_commit_sha text not null check
  (source_commit_sha='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'),
 target_branch text not null check
  (target_branch='reality/isolated-openai-governance-gateway-20261108'),
 approval_origin text not null check
  (approval_origin='AUTHENTICATED_OWNER_EXPLICIT_REALITY_CHAT_CLICK'),
 approval_state text not null default 'OWNER_APPROVED'
  check (approval_state='OWNER_APPROVED'),
 approved_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.riley_native_exact_install_approvals_v1
 enable row level security;
revoke all on reality_internal.riley_native_exact_install_approvals_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.riley_native_exact_install_approvals_v1
 to service_role;

-- Read-only service-gated owner card. Server independently maps its verified
-- signed-in Supabase session to this exact immutable original.
create or replace function public.reality_read_native263_owner_approval_card_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
 r reality_internal.riley_native_exact_install_readiness_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'NATIVE263_OWNER_APPROVAL_CARD_SERVICE_ONLY';end if;
 if p_owner_id is distinct from
    '85eeae0b-2988-43c4-b20c-590fb51da70d'::uuid then
  return pg_catalog.jsonb_build_object('status','NO_OWNER_NATIVE263_APPROVAL_CARD',
   'owner_approval_ready',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false);end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
  where original_work_id='work:873a6e74fd14c6beacc9042dd8021dfc';
 select * into r from reality_internal.riley_native_exact_install_readiness_v1
  where original_work_id=c.original_work_id;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
  where original_work_id=c.original_work_id and owner_id=p_owner_id;
 if c.original_work_id is null or j.original_work_id is null or
    c.owner_id<>p_owner_id or c.shift_id<>j.shift_id or
    c.candidate_artifact_sha256<>j.candidate_artifact_sha256 or
    c.candidate_commit_sha<>j.candidate_commit_sha or
    c.verified_frozen_ci_run_id<>j.independent_proof_run_id then
  raise exception 'NATIVE263_APPROVAL_CARD_ORIGINAL_PROOF_MISMATCH';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD',
  'owner_id',c.owner_id,'original_work_id',c.original_work_id,
  'shift_id',c.shift_id,'source_ref',c.source_ref,
  'target_branch',c.exact_target_branch,'source_file',c.exact_target_path,
  'artifact_sha256',c.candidate_artifact_sha256,
  'candidate_commit_sha',c.candidate_commit_sha,
  'verified_frozen_ci_run_id',c.verified_frozen_ci_run_id,
  'approval_state',c.state,
  'owner_approval_ready',(c.state='STAGED_UNAPPROVED' and
    r.state='VERIFIED_READY_FOR_ONE_EXACT_OWNER_APPROVAL' and
    j.phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' and
    j.installed=false and j.exact_approval_receipt_ref is null),
  'source_write_verified',coalesce(r.source_write_verified,false),
  'automatic_preview_deploy_verified',coalesce(r.automatic_preview_deploy_verified,false),
  'same_original_continuation_and_receipt_verified',
    coalesce(r.same_original_continuation_and_receipt_verified,false),
  'approval_receipt_id',c.approval_receipt_id,
  'installation_authorized',(c.state not in ('STAGED_UNAPPROVED')),
  'original_job_completed',(j.phase='SETTLED' and
    j.original_settlement_receipt_ref is not null),
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_native263_owner_approval_card_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_native263_owner_approval_card_v1(uuid)
 to service_role;

-- The ONLY native #263 approval mutation. Unlike a worker/service-key call,
-- the caller MUST present a validated Supabase Auth user JWT. Explicit
-- request/confirmation inputs are from the owner's click, not LLM text.
create or replace function public.reality_owner_approve_native263_exact_install_v1(
 p_original_work_id text,p_artifact_sha256 text,p_intent text,
 p_confirmation text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare c reality_internal.native263_exact_install_warrants_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 r reality_internal.riley_native_exact_install_readiness_v1%rowtype;
 a reality_internal.riley_native_exact_install_approvals_v1%rowtype;
 v_owner uuid:=auth.uid();
 v_now timestamptz:=clock_timestamp();
 v_id uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'authenticated'
   or coalesce(auth.jwt()->>'is_anonymous','false')='true'
   or v_owner is distinct from
      '85eeae0b-2988-43c4-b20c-590fb51da70d'::uuid
 then raise exception 'NATIVE263_AUTHENTICATED_EXACT_OWNER_REQUIRED';end if;
 if p_original_work_id<>'work:873a6e74fd14c6beacc9042dd8021dfc'
  or p_artifact_sha256<>
    'sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48'
  or p_intent<>'OWNER_APPROVE_NATIVE263_FROZEN_PREVIEW_INSTALL'
  or p_confirmation<>'APPROVE EXACT TESTED ISSUE 263 INSTALLATION IN ISOLATED PREVIEW'
  or p_request_id is null
 then raise exception 'NATIVE263_EXACT_OWNER_CLICK_ARTIFACT_REQUIRED';end if;
 select * into c from reality_internal.native263_exact_install_warrants_v1
  where original_work_id=p_original_work_id for update;
 select * into j from reality_internal.riley_unattended_repair_originals_v1
  where original_work_id=p_original_work_id for update;
 if not found or c.owner_id<>v_owner or j.owner_id<>v_owner or
   c.shift_id<>j.shift_id or
   c.candidate_commit_sha<>j.candidate_commit_sha or
   c.candidate_artifact_sha256<>j.candidate_artifact_sha256 or
   c.candidate_artifact_sha256<>p_artifact_sha256 or
   c.verified_frozen_ci_run_id<>j.independent_proof_run_id or
   c.source_ref<>j.issue_url or
   c.source_proof_sha256<>j.shift_source_proof_sha256 or
   j.production_changed is distinct from false or
   j.original_settlement_receipt_ref is not null
 then raise exception 'NATIVE263_CURRENT_OWNER_OR_SOURCE_PROOF_DRIFT';end if;
 if c.state<>'STAGED_UNAPPROVED' then
  -- The API must never send a second owner prompt after a committed click.
  return pg_catalog.jsonb_build_object(
   'status','NATIVE263_EXACT_OWNER_APPROVAL_ALREADY_RECORDED_NO_REAPPROVE',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'approval_receipt_id',c.approval_receipt_id,
   'approval_recorded',c.approval_receipt_id is not null,
   'installation_completed',c.installed_commit_sha is not null,
   'original_job_completed',c.original_final_receipt_id is not null,
   'production_changed',false);
 end if;
 if j.phase<>'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL' or
   j.installed is distinct from false or
   j.exact_approval_receipt_ref is not null or
   c.approval_receipt_id is not null or
   c.owner_approved_at is not null
 then raise exception 'NATIVE263_PREAPPROVAL_ORIGINAL_NOT_CURRENT';end if;
 select * into r from reality_internal.riley_native_exact_install_readiness_v1
  where original_work_id=p_original_work_id for share;
 if not found or
    r.state<>'VERIFIED_READY_FOR_ONE_EXACT_OWNER_APPROVAL' or
    r.source_write_verified is distinct from true or
    r.automatic_preview_deploy_verified is distinct from true or
    r.same_original_continuation_and_receipt_verified is distinct from true or
    r.independent_evidence_sha256 !~ '^sha256:[a-f0-9]{64}$'
 then return pg_catalog.jsonb_build_object(
   'status','NATIVE263_INSTALL_APPROVAL_BLOCKED_UNVERIFIED_FINAL_CONTINUATION',
   'original_work_id',c.original_work_id,'shift_id',c.shift_id,
   'approval_recorded',false,'owner_approval_ready',false,
   'installation_completed',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 -- One immutable approval receipt shared with both the original job and
 -- its exact installer warrant, in one atomic transaction.
 v_id:=pg_catalog.gen_random_uuid();
 insert into reality_internal.riley_native_exact_install_approvals_v1(
   approval_id,request_id,owner_id,original_work_id,shift_id,
   artifact_sha256,source_commit_sha,target_branch,approval_origin,approved_at)
 values(v_id,p_request_id,v_owner,c.original_work_id,c.shift_id,
   c.candidate_artifact_sha256,c.candidate_commit_sha,c.exact_target_branch,
   'AUTHENTICATED_OWNER_EXPLICIT_REALITY_CHAT_CLICK',v_now);
 update reality_internal.native263_exact_install_warrants_v1
  set state='OWNER_APPROVED',approval_receipt_id=v_id,
   owner_approved_at=v_now,updated_at=v_now
  where original_work_id=c.original_work_id and state='STAGED_UNAPPROVED';
 if not found then raise exception 'NATIVE263_APPROVAL_WARRANT_ATOMIC_RACE';end if;
 update reality_internal.riley_unattended_repair_originals_v1
  set exact_approval_receipt_ref=
    'supabase:riley_native_exact_install_approvals_v1:'||v_id::text
  where original_work_id=c.original_work_id
    and phase='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'
    and exact_approval_receipt_ref is null;
 if not found then raise exception 'NATIVE263_APPROVAL_ORIGINAL_ATOMIC_RACE';end if;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_APPROVED_EXACT_NATIVE263_INSTALL_AUTO_CONTINUATION',
  'owner_id',v_owner,'shift_id',c.shift_id,
  'original_work_id',c.original_work_id,
  'artifact_sha256',c.candidate_artifact_sha256,
  'approval_receipt_id',v_id,
  'approval_origin','AUTHENTICATED_OWNER_EXPLICIT_REALITY_CHAT_CLICK',
  'installation_authorized',true,'installation_completed',false,
  'original_job_completed',false,'production_changed',false,
  'next_action','SCHEDULED_EXISTING_WORKER_INSTALL_AND_RECONCILE_NO_THIRD_CONFIRMATION');
end $fn$;
revoke all on function public.reality_owner_approve_native263_exact_install_v1(text,text,text,text,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_owner_approve_native263_exact_install_v1(text,text,text,text,uuid)
 to authenticated;
