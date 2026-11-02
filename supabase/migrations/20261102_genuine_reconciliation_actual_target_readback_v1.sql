-- Service-only authoritative target evidence for a separately approved
-- continuity-reconciliation original job; no writes, claims or permissions.
create or replace function public.reality_read_genuine_reconciliation_target_v1(
 p_repairing_trigger_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare repair reality_internal.genuine_capability_queue_v1%rowtype;
 target reality_internal.genuine_original_continuations_v1%rowtype;
 target_q reality_internal.genuine_capability_queue_v1%rowtype;
 approval reality_internal.genuine_preview_install_approvals_v1%rowtype;
 original public.universe_events%rowtype;
 tail public.universe_events%rowtype;
 n int;
 collisions int;
begin
 if current_user<>'service_role' then
  raise exception 'RECONCILIATION_TARGET_SERVICE_ROLE_ONLY';end if;
 select * into repair from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_repairing_trigger_id;
 if repair.trigger_id is null or repair.capability_id<>'reality-continuity-settlement-reconciler'
 or repair.phase not in ('AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION')
 then raise exception 'RECONCILIATION_TARGET_VALID_REPAIR_WORK_REQUIRED';end if;
 select count(*) into n from reality_internal.genuine_original_continuations_v1 c
 where c.owner_id=repair.owner_id and c.original_work_id<>repair.original_work_id
 and c.state='SETTLED_ISOLATED'
 and c.outcome_receipt->>'independent_outcome_verified'='true'
 and c.outcome_receipt->>'original_job_completed'='true'
 and not exists(select 1 from public.universe_events e
   where e.payload->>'original_work_id'=c.original_work_id
   and e.epistemic_status='VERIFIED' and e.payload->>'constitutional_phase'='SETTLED'
   and e.payload->>'original_job_completed'='true');
 if n<>1 then raise exception 'RECONCILIATION_TARGET_EXACTLY_ONE_SETTLED_UNRECONCILED_REQUIRED';end if;
 select * into target from reality_internal.genuine_original_continuations_v1 c
 where c.owner_id=repair.owner_id and c.original_work_id<>repair.original_work_id
 and c.state='SETTLED_ISOLATED'
 and c.outcome_receipt->>'independent_outcome_verified'='true'
 and c.outcome_receipt->>'original_job_completed'='true'
 and not exists(select 1 from public.universe_events e
   where e.payload->>'original_work_id'=c.original_work_id
   and e.epistemic_status='VERIFIED' and e.payload->>'constitutional_phase'='SETTLED'
   and e.payload->>'original_job_completed'='true');
 select * into target_q from reality_internal.genuine_capability_queue_v1
 where trigger_id=target.trigger_id;
 select * into approval from reality_internal.genuine_preview_install_approvals_v1
 where trigger_id=target.trigger_id;
 select * into original from public.universe_events where event_id=target_q.original_work_event_id;
 if original.event_id is null or original.epistemic_status<>'VERIFIED'
 or original.payload->>'original_job_completed'<>'false'
 or original.payload->>'original_work_id'<>target.original_work_id
 or original.payload->>'owner_id'<>repair.owner_id::text
 or target.approval_id<>approval.approval_id or approval.consumed_at is null
 or target.installed_commit_sha<>approval.installed_commit_sha
 or target.outcome_receipt->>'installed_commit_sha'<>approval.installed_commit_sha
 or target.outcome_receipt->>'production_changed'<>'false'
 then raise exception 'RECONCILIATION_TARGET_PROVENANCE_NOT_TRUSTED';end if;
 select count(*) into collisions from public.universe_events e where
  e.continuity_root_id=original.continuity_root_id and
  e.worldline_id=original.worldline_id and
  e.parent_event_id is null and
  e.event_id<>original.event_id;
 -- This readback never trusts a timestamp as the latest lineage head.
 select count(*) into n from public.universe_events e where
   e.continuity_root_id=original.continuity_root_id and
   e.worldline_id=original.worldline_id and
   not exists(select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 if n<>1 then raise exception 'RECONCILIATION_TARGET_CHAIN_TAIL_AMBIGUOUS';end if;
 select * into tail from public.universe_events e where
   e.continuity_root_id=original.continuity_root_id and
   e.worldline_id=original.worldline_id and
   not exists(select 1 from public.universe_events child where child.parent_event_id=e.event_id);
 return jsonb_build_object('status','TARGET_SETTLED_SIDE_CAR_UNIVERSE_MISSING',
  'repairing_original_work_id',repair.original_work_id,
  'reconciliation_target_work_id',target.original_work_id,
  'target_provider_run_id',target.claim_run_id,
  'original',jsonb_build_object(
    'owner_id',repair.owner_id,'goal_id',target_q.goal_id,
    'original_work_id',target.original_work_id,
    'continuity_root_id',original.continuity_root_id,
    'worldline_id',original.worldline_id,
    'original_event_id',original.event_id,
    'epistemic_status','VERIFIED','original_job_completed',false,
    'source_content_hash',original.content_hash,
    'original_event_lineage_hash',original.lineage_hash),
  'approval',jsonb_build_object('owner_id',approval.owner_id,
    'original_work_id',target.original_work_id,
    'approval_id',approval.approval_id,
    'source','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
    'target_environment','ISOLATED_PREVIEW',
    'consumed_once',true,'artifact_sha256',approval.artifact_hash),
  'installation',jsonb_build_object('original_work_id',target.original_work_id,
    'artifact_sha256',target.artifact_sha256,
    'installed_commit_sha',target.installed_commit_sha,
    'installed_source_verified',true,'production_changed',false),
  'settlement',jsonb_build_object('status','SETTLED_ISOLATED',
    'original_work_id',target.original_work_id,
    'original_job_completed',true,'independent_outcome_verified',true,
    'owner_approval_id',target.approval_id,
    'artifact_sha256',target.artifact_sha256,
    'installed_commit_sha',target.installed_commit_sha,
    'provider_run_id',target.claim_run_id,
    'provider_outcome_digest',target.outcome_receipt->>'provider_outcome_digest',
    'production_changed',false),
  'ledger',jsonb_build_object('continuity_root_id',original.continuity_root_id,
    'worldline_id',original.worldline_id,'append_only_verified',true,
    'head_lineage_hash',tail.lineage_hash,'verified_completion_events','[]'::jsonb),
  'production_changed',false);
end $$;
revoke all on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 to service_role;
