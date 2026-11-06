-- The original work and qualification remain immutable; this records only
-- installed source readback and bounded preview probation, not final settlement.
alter table reality_internal.genuine_capability_queue_v1
 drop constraint if exists genuine_capability_queue_v1_phase_check;
alter table reality_internal.genuine_capability_queue_v1
 add constraint genuine_capability_queue_v1_phase_check
 check(phase in ('PENDING_FROZEN_REPRODUCTION',
 'LEASED_FOR_INDEPENDENT_REPRODUCTION',
 'EVIDENCE_RECONCILIATION_REQUIRED',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
 'AWAITING_OWNER_APPROVAL',
 'ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED'));

create or replace function public.reality_record_genuine_preview_activation_v1(
 p_trigger_id uuid,p_approval_id uuid,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 q reality_internal.genuine_capability_queue_v1%rowtype;
 a reality_internal.genuine_preview_install_approvals_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 o public.universe_events%rowtype;
 receipt jsonb;
 now_at timestamptz;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_ACTIVATION_SERVICE_ROLE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 select * into a from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or a.approval_id is distinct from p_approval_id or
   a.consumed_at is null or a.installer_run_id is null or
   a.target_environment<>'ISOLATED_PREVIEW' or
   a.artifact_hash is distinct from q.qualified_candidate->>'artifact_sha256' or
   q.qualification_receipt->>'status'<>'AWAITING_OWNER_APPROVAL'
 then raise exception 'GENUINE_ACTIVATION_CONSUMED_OWNER_AUTHORITY_REQUIRED';end if;
 if q.phase='ISOLATED_INSTALLED_PROBATION' then
   if a.installed_commit_sha is distinct from p_proof->>'installed_commit_sha'
    then raise exception 'GENUINE_ACTIVATION_PROOF_REPLAY_CONFLICT';end if;
   return a.installation_receipt;
 end if;
 if q.phase<>'AWAITING_OWNER_APPROVAL' or
   (p_proof->>'original_work_id') is distinct from q.original_work_id or
   (p_proof->>'approval_id') is distinct from a.approval_id::text or
   (p_proof->>'artifact_sha256') is distinct from a.artifact_hash or
   (p_proof->>'installer_run_id') is distinct from a.installer_run_id or
   (p_proof->>'installed_commit_sha') !~ '^[a-f0-9]{40}$' or
   (p_proof->>'installed_branch') !~ '^feature/reality-qualified-install-[a-f0-9]{12}$' or
   (p_proof->>'independent_verified') is distinct from 'true' or
   (p_proof->>'original_frozen_acceptance_passed') is distinct from 'true' or
   (p_proof->>'isolation_network_disabled') is distinct from 'true' or
   (p_proof->>'production_changed') is distinct from 'false' or
   (p_proof->>'original_job_completed') is distinct from 'false' or
   coalesce((p_proof->>'monitored_executions')::integer,0)<5 or
   coalesce((p_proof->>'failed_assertions')::integer,1)<>0 or
   coalesce((p_proof->>'passed_assertions')::integer,0)<220 or
   pg_catalog.jsonb_typeof(p_proof->'observations')<>'array' or
   pg_catalog.jsonb_array_length(p_proof->'observations')<>5
 then raise exception 'GENUINE_ACTIVATION_FIVE_INDEPENDENT_EXECUTIONS_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||q.owner_id::text||':'||q.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into o from public.universe_events
 where event_id=q.original_work_event_id;
 if e.user_id is null or
   e.last_transition_event_id is distinct from q.goal_transition_event_id or
   o.epistemic_status<>'VERIFIED' or
   o.payload->>'original_job_completed' is distinct from 'false'
 then raise exception 'GENUINE_ACTIVATION_OWNER_GOAL_CHANGED';end if;
 if exists(select 1 from public.universe_events v
   where v.continuity_root_id=o.continuity_root_id and
   v.worldline_id=o.worldline_id and v.epistemic_status='VERIFIED'
   and v.payload->>'original_work_id'=q.original_work_id
   and (v.payload->>'original_job_completed'='true' or
    v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_ACTIVATION_ALREADY_SETTLED';end if;
 now_at:=clock_timestamp();
 receipt:=pg_catalog.jsonb_build_object(
  'version','reality-genuine-preview-activation-v1',
  'status','ISOLATED_INSTALLED_PROBATION',
  'original_work_id',q.original_work_id,
  'approval_id',a.approval_id,'artifact_sha256',a.artifact_hash,
  'installed_branch',p_proof->>'installed_branch',
  'installed_commit_sha',p_proof->>'installed_commit_sha',
  'independent_run_id',p_proof->>'independent_run_id',
  'monitored_executions',(p_proof->>'monitored_executions')::integer,
  'passed_assertions',(p_proof->>'passed_assertions')::integer,
  'probation_window_target',50,
  'probation_live_business_executions',0,
  'valid_time',o.effective_time,
  'transaction_time',now_at,
  'prior_state_hash',q.qualification_receipt->>'post_state_hash',
  'owner_approval_ref',a.approval_id,
  'production_changed',false,
  'original_job_completed',false,
  'settlement_verified',false);
 update reality_internal.genuine_preview_install_approvals_v1
 set installed_commit_sha=p_proof->>'installed_commit_sha',
  install_branch=p_proof->>'installed_branch',
  installation_receipt=receipt,
  probation_status='ACTIVE',
  probation_observations=p_proof->'observations'
 where trigger_id=q.trigger_id;
 update reality_internal.genuine_capability_queue_v1
 set phase='ISOLATED_INSTALLED_PROBATION',
 updated_at=now_at where trigger_id=q.trigger_id;
 return receipt;
end $$;
revoke all on function public.reality_record_genuine_preview_activation_v1(uuid,uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_record_genuine_preview_activation_v1(uuid,uuid,jsonb)
 to service_role;