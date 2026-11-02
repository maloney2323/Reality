
create table if not exists reality_internal.genuine_original_claim_recoveries_v1 (
  trigger_id uuid primary key,
  original_work_id text not null,
  owner_id uuid not null,
  approval_id uuid not null,
  installed_commit_sha text not null,
  acceptance_run_id bigint not null,
  acceptance_runner_sha text not null,
  claim_run_id bigint not null,
  claim_runner_sha text not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_original_claim_recoveries_v1 enable row level security;
revoke all on reality_internal.genuine_original_claim_recoveries_v1 from anon,authenticated,public;
grant select,insert on reality_internal.genuine_original_claim_recoveries_v1 to service_role;

create or replace function public.reality_claim_genuine_original_v1(
 p_trigger_id uuid,p_run_id bigint,p_runner_sha text)
returns jsonb language plpgsql set search_path to '' as $body$
declare
 c reality_internal.genuine_original_continuations_v1%rowtype;
 q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 original_run bigint;
 recovered boolean;
begin
 if current_user <> 'service_role' then
  raise exception 'CONTINUATION_CLAIM_SERVICE_ROLE_REQUIRED';end if;
 if p_trigger_id is null or p_run_id is null or p_run_id<1 or
  p_runner_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'CONTINUATION_CLAIM_SIGNED_RUN_REQUIRED';end if;
 select * into c from reality_internal.genuine_original_continuations_v1
  where trigger_id=p_trigger_id for update;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
  where trigger_id=p_trigger_id for update;
 if c.trigger_id is null or q.trigger_id is null or a.trigger_id is null or
  c.state<>'ACCEPTED_FOR_ISOLATED_RESUMPTION' or
  c.claimed_at is not null or c.claim_run_id is not null or
  c.outcome_receipt is not null or
  c.acceptance_receipt->>'status'<>'ACCEPTED_FOR_ISOLATED_RESUMPTION' or
  c.acceptance_receipt->>'original_work_id' is distinct from q.original_work_id or
  c.acceptance_receipt->>'installed_commit_sha' is distinct from c.installed_commit_sha or
  c.acceptance_receipt->>'owner_approval_id' is distinct from a.approval_id::text or
  c.acceptance_receipt->>'artifact_sha256' is distinct from a.artifact_hash or
  c.acceptance_receipt->>'provider_branch_verified'<>'true' or
  c.acceptance_receipt->>'installed_bytes_verified'<>'true' or
  c.acceptance_receipt->>'production_changed'<>'false' or
  (c.acceptance_receipt->>'run_id') !~ '^[1-9][0-9]{6,17}$' or
  (c.acceptance_receipt->>'runner_sha') !~ '^[a-f0-9]{40}$' then
  raise exception 'CONTINUATION_CLAIM_ORIGINAL_ACCEPTANCE_UNVERIFIED';end if;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=q.owner_id and conversation_id=q.conversation_id;
 select * into o from public.universe_events
  where event_id=q.original_work_event_id;
 if q.phase<>'ISOLATED_INSTALLED_PROBATION' or
  q.original_work_id is distinct from c.original_work_id or
  q.owner_id is distinct from c.owner_id or
  q.qualified_candidate->>'artifact_sha256' is distinct from c.artifact_sha256 or
  a.owner_id is distinct from q.owner_id or
  a.original_work_id is distinct from q.original_work_id or
  a.approval_id is distinct from c.approval_id or
  a.artifact_hash is distinct from c.artifact_sha256 or
  a.approval_receipt->>'approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION' or
  a.consumed_at is null or a.target_environment<>'ISOLATED_PREVIEW' or
  a.probation_status<>'ACTIVE' or
  a.installation_receipt->>'status'<>'ISOLATED_INSTALLED_PROBATION' or
  a.installation_receipt->>'original_job_completed'<>'false' or
  a.installation_receipt->>'production_changed'<>'false' or
  a.installed_commit_sha is distinct from c.installed_commit_sha or
  a.settlement_receipt is not null or
  e.user_id is null or
  e.last_transition_event_id is distinct from q.goal_transition_event_id or
  o.event_id is null or o.epistemic_status<>'VERIFIED' or
  o.payload->>'original_work_id' is distinct from q.original_work_id or
  o.payload->>'owner_authorized_investigation'<>'true' or
  o.payload->>'original_job_completed'<>'false' then
  raise exception 'CONTINUATION_CLAIM_CURRENT_OWNER_OR_INSTALLED_STATE_CHANGED';end if;
 if exists(select 1 from public.universe_events v
  where v.continuity_root_id=o.continuity_root_id
    and v.worldline_id=o.worldline_id
    and v.epistemic_status='VERIFIED'
    and v.payload->>'original_work_id'=q.original_work_id
    and (v.payload->>'original_job_completed'='true'
       or v.payload->>'constitutional_phase'='SETTLED')) then
  raise exception 'CONTINUATION_CLAIM_ALREADY_SETTLED';end if;
 original_run:=(c.acceptance_receipt->>'run_id')::bigint;
 recovered:=original_run<>p_run_id or
  (c.acceptance_receipt->>'runner_sha')<>p_runner_sha;
 if recovered then
  insert into reality_internal.genuine_original_claim_recoveries_v1(
   trigger_id,original_work_id,owner_id,approval_id,installed_commit_sha,
   acceptance_run_id,acceptance_runner_sha,claim_run_id,claim_runner_sha)
  values(c.trigger_id,c.original_work_id,c.owner_id,c.approval_id,
   c.installed_commit_sha,original_run,
   c.acceptance_receipt->>'runner_sha',p_run_id,p_runner_sha);
 end if;
 update reality_internal.genuine_original_continuations_v1
  set state='RESUMPTION_CLAIMED',claim_run_id=p_run_id,
   claim_runner_sha=p_runner_sha,claimed_at=clock_timestamp()
  where trigger_id=p_trigger_id and state='ACCEPTED_FOR_ISOLATED_RESUMPTION';
 if not found then raise exception 'CONTINUATION_CLAIM_CONCURRENT_STATE_CHANGE';end if;
 return jsonb_build_object('status','RESUMPTION_CLAIMED',
  'trigger_id',c.trigger_id,'original_work_id',c.original_work_id,
  'installed_commit_sha',c.installed_commit_sha,
  'artifact_sha256',c.artifact_sha256,
  'run_id',p_run_id,'recovered_from_prior_acceptance_run',recovered,
  'production_changed',false,'original_job_completed',false);
end $body$;
revoke all on function public.reality_claim_genuine_original_v1(uuid,bigint,text)
 from anon,authenticated,public;
grant execute on function public.reality_claim_genuine_original_v1(uuid,bigint,text)
 to service_role;
