
-- Governed continuation of a previously owner-approved, independently monitored isolated capability.
-- No new installation authority or production promotion is created here.
create table if not exists reality_internal.genuine_original_continuations_v1 (
 trigger_id uuid primary key references reality_internal.genuine_capability_queue_v1(trigger_id),
 original_work_id text not null unique,
 owner_id uuid not null,
 installed_commit_sha text not null check (installed_commit_sha ~ '^[a-f0-9]{40}$'),
 approval_id uuid not null,
 artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
 state text not null check(state in ('ACCEPTED_FOR_ISOLATED_RESUMPTION','RESUMPTION_CLAIMED','SETTLED_ISOLATED')),
 acceptance_receipt jsonb not null,
 claim_run_id bigint,
 claim_runner_sha text,
 outcome_receipt jsonb,
 accepted_at timestamptz not null default clock_timestamp(),
 claimed_at timestamptz,
 settled_at timestamptz
);
alter table reality_internal.genuine_original_continuations_v1 enable row level security;
revoke all on reality_internal.genuine_original_continuations_v1 from public, anon, authenticated;
grant select,insert,update on reality_internal.genuine_original_continuations_v1 to service_role;

create or replace function public.reality_read_genuine_continuation_scope_v1()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 o public.universe_events%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_SERVICE_ROLE_REQUIRED'; end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where phase='ISOLATED_INSTALLED_PROBATION' order by updated_at asc limit 1;
 if q.trigger_id is null then return jsonb_build_object('status','NO_PROBATION_WORK'); end if;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=q.trigger_id;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=q.trigger_id;
 select * into o from public.universe_events where event_id=q.original_work_event_id;
 if a.approval_id is null or a.consumed_at is null or a.installed_commit_sha is null or
    a.probation_status<>'ACTIVE' or a.target_environment<>'ISOLATED_PREVIEW' or
    a.artifact_hash<>q.qualified_candidate->>'artifact_sha256' or
    o.event_id is null or o.epistemic_status<>'VERIFIED' or
    o.payload->>'original_work_id'<>q.original_work_id then
    raise exception 'CONTINUATION_ORIGINAL_ACCEPTANCE_SCOPE_UNTRUSTED';
 end if;
 return jsonb_build_object(
  'status',coalesce(c.state,'ISOLATED_INSTALLED_PROBATION'),
  'trigger_id',q.trigger_id,'owner_id',q.owner_id,
  'original_work_id',q.original_work_id,'goal_id',q.goal_id,
  'approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
  'installed_commit_sha',a.installed_commit_sha,'installed_branch',a.install_branch,
  'installer_run_id',a.installer_run_id,
  'frozen_test_path',o.payload->>'frozen_test_path',
  'frozen_test_sha256',o.payload->>'frozen_test_sha256',
  'historical_run_id',o.payload->>'original_provider_failed_run_id',
  'historical_job_id',o.payload->>'original_provider_failed_job_id',
  'historical_source_sha',o.payload->>'original_source_sha',
  'source_path',o.payload->>'source_path',
  'monitored_executions',a.installation_receipt->'monitored_executions',
  'passed_assertions',a.installation_receipt->'passed_assertions',
  'probation_window_target',a.installation_receipt->'probation_window_target',
  'probation_live_business_executions',a.installation_receipt->'probation_live_business_executions',
  'acceptance_receipt',c.acceptance_receipt);
end $$;
revoke all on function public.reality_read_genuine_continuation_scope_v1() from public, anon, authenticated;
grant execute on function public.reality_read_genuine_continuation_scope_v1() to service_role;

create or replace function public.reality_accept_genuine_original_v1(
 p_trigger_id uuid,p_run_id bigint,p_runner_sha text,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 receipt jsonb;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_ACCEPT_SERVICE_ROLE_REQUIRED';end if;
 if p_run_id<1 or p_runner_sha !~ '^[a-f0-9]{40}$' or
 p_proof->>'provider_branch_verified'<>'true' or
 p_proof->>'installed_bytes_verified'<>'true' or
 p_proof->>'production_changed'<>'false' then
  raise exception 'CONTINUATION_ACCEPT_PROVIDER_PROOF_MISSING';
 end if;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=p_trigger_id for update;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=p_trigger_id for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id;
 select * into o from public.universe_events where event_id=q.original_work_event_id;
 if q.phase<>'ISOLATED_INSTALLED_PROBATION' or a.approval_id is null or
    a.consumed_at is null or a.target_environment<>'ISOLATED_PREVIEW' or
    a.probation_status<>'ACTIVE' or a.installed_commit_sha is null or
    a.installed_commit_sha<>p_proof->>'installed_commit_sha' or
    a.installation_receipt->>'original_work_id'<>q.original_work_id or
    a.installation_receipt->>'settlement_verified'<>'false' or
    (a.installation_receipt->>'monitored_executions')::int<>5 or
    (a.installation_receipt->>'passed_assertions')::int<220 or
    jsonb_array_length(a.probation_observations)<>5 or
    (select count(*) from jsonb_array_elements(a.probation_observations) obs
      where obs->>'failed'='0' and obs->>'exit_code'='0' and
      obs->>'sandbox_network_disabled'='true' and
      obs->>'executor_privileges_dropped'='true')<>5 or
    a.settlement_receipt is not null or
    e.last_transition_event_id is distinct from q.goal_transition_event_id or
    o.epistemic_status<>'VERIFIED' or o.payload->>'original_work_id'<>q.original_work_id or
    o.payload->>'original_job_completed'<>'false' then
    raise exception 'CONTINUATION_ACCEPT_ORIGINAL_GATES_NOT_MET';
 end if;
 if c.trigger_id is not null then
   if c.installed_commit_sha<>a.installed_commit_sha or c.artifact_sha256<>a.artifact_hash or
      c.approval_id<>a.approval_id then raise exception 'CONTINUATION_ACCEPT_REPLAY_CONFLICT';end if;
   return c.acceptance_receipt;
 end if;
 receipt:=jsonb_build_object('status','ACCEPTED_FOR_ISOLATED_RESUMPTION',
  'version','reality-capability-independent-acceptance-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'owner_approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
  'installed_commit_sha',a.installed_commit_sha,'runner_sha',p_runner_sha,'run_id',p_run_id,
  'provider_branch_verified',true,'installed_bytes_verified',true,
  'monitored_executions',5,'passed_assertions',(a.installation_receipt->>'passed_assertions')::int,
  'probation_window_target',(a.installation_receipt->>'probation_window_target')::int,
  'live_business_executions',0,'full_probation_complete',false,
  'scope','ONE_ORIGINAL_JOB_ISOLATED_PREVIEW_ONLY',
  'production_changed',false,'original_job_completed',false,
  'accepted_at',clock_timestamp());
 insert into reality_internal.genuine_original_continuations_v1
 (trigger_id,original_work_id,owner_id,installed_commit_sha,approval_id,artifact_sha256,state,acceptance_receipt)
 values(q.trigger_id,q.original_work_id,q.owner_id,a.installed_commit_sha,a.approval_id,
 a.artifact_hash,'ACCEPTED_FOR_ISOLATED_RESUMPTION',receipt);
 return receipt;
end $$;
revoke all on function public.reality_accept_genuine_original_v1(uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_accept_genuine_original_v1(uuid,bigint,text,jsonb) to service_role;

create or replace function public.reality_claim_genuine_original_v1(
 p_trigger_id uuid,p_run_id bigint,p_runner_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c reality_internal.genuine_original_continuations_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_CLAIM_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=p_trigger_id for update;
 if c.state<>'ACCEPTED_FOR_ISOLATED_RESUMPTION' or
    p_run_id::text<>c.acceptance_receipt->>'run_id' or
    p_runner_sha<>c.acceptance_receipt->>'runner_sha' then
  raise exception 'CONTINUATION_SINGLE_USE_CLAIM_REQUIRED';
 end if;
 update reality_internal.genuine_original_continuations_v1
 set state='RESUMPTION_CLAIMED',claim_run_id=p_run_id,
 claim_runner_sha=p_runner_sha,claimed_at=clock_timestamp() where trigger_id=p_trigger_id;
 return jsonb_build_object('status','RESUMPTION_CLAIMED',
  'trigger_id',c.trigger_id,'original_work_id',c.original_work_id,
  'installed_commit_sha',c.installed_commit_sha,'artifact_sha256',c.artifact_sha256,
  'run_id',p_run_id,'production_changed',false,'original_job_completed',false);
end $$;
revoke all on function public.reality_claim_genuine_original_v1(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.reality_claim_genuine_original_v1(uuid,bigint,text) to service_role;

create or replace function public.reality_settle_genuine_original_v1(
 p_trigger_id uuid,p_run_id bigint,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 c reality_internal.genuine_original_continuations_v1%rowtype;
 receipt jsonb;
begin
 if current_user<>'service_role' then raise exception 'CONTINUATION_SETTLE_SERVICE_ROLE_REQUIRED';end if;
 select * into c from reality_internal.genuine_original_continuations_v1 where trigger_id=p_trigger_id for update;
 select * into q from reality_internal.genuine_capability_queue_v1 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1 where trigger_id=p_trigger_id for update;
 if c.state='SETTLED_ISOLATED' then
  if c.outcome_receipt->>'github_run_id'<>p_run_id::text then raise exception 'CONTINUATION_SETTLEMENT_CONFLICT'; end if;
  return c.outcome_receipt;
 end if;
 if c.state<>'RESUMPTION_CLAIMED' or q.phase<>'ISOLATED_INSTALLED_PROBATION' or
    c.claim_run_id<>p_run_id or q.original_work_id<>c.original_work_id or
    c.approval_id<>a.approval_id or c.installed_commit_sha<>a.installed_commit_sha or
    p_proof->>'original_work_id'<>c.original_work_id or
    p_proof->>'installed_commit_sha'<>c.installed_commit_sha or
    p_proof->>'artifact_sha256'<>c.artifact_sha256 or
    p_proof->>'github_run_id'<>p_run_id::text or
    p_proof->>'provider_resume_job_success'<>'true' or
    p_proof->>'provider_original_failure_verified'<>'true' or
    p_proof->>'isolated_original_acceptance_passed'<>'true' or
    p_proof->>'observed_classification'<>'MISSING_CAPABILITY' or
    p_proof->>'production_changed'<>'false' or
    p_proof->>'provider_outcome_digest' !~ '^[a-f0-9]{64}$' or
    a.settlement_receipt is not null then
  raise exception 'CONTINUATION_SETTLE_INDEPENDENT_PROVIDER_EVIDENCE_REQUIRED';
 end if;
 receipt:=jsonb_build_object(
  'status','SETTLED_ISOLATED','version','reality-original-job-independent-settlement-v1',
  'original_work_id',c.original_work_id,'trigger_id',c.trigger_id,
  'owner_approval_id',c.approval_id,'installed_commit_sha',c.installed_commit_sha,
  'artifact_sha256',c.artifact_sha256,'github_run_id',p_run_id,
  'provider_outcome_digest',p_proof->>'provider_outcome_digest',
  'provider_resume_job_success',true,'independent_outcome_verified',true,
  'original_job_completed',true,'production_changed',false,
  'full_probation_complete',false,
  'original_job_scope','ISOLATED_PREVIEW_ONLY',
  'settled_at',clock_timestamp());
 update reality_internal.genuine_original_continuations_v1
  set state='SETTLED_ISOLATED',outcome_receipt=receipt,settled_at=clock_timestamp()
  where trigger_id=p_trigger_id;
 update reality_internal.genuine_preview_install_approvals_v1
  set settlement_receipt=receipt where trigger_id=p_trigger_id;
 update reality_internal.genuine_capability_queue_v1
  set phase='SETTLED_ISOLATED',updated_at=clock_timestamp() where trigger_id=p_trigger_id;
 return receipt;
end $$;
revoke all on function public.reality_settle_genuine_original_v1(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.reality_settle_genuine_original_v1(uuid,bigint,jsonb) to service_role;
