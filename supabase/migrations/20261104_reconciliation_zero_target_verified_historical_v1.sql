-- Non-executing, owner/source bound reconciliation readback; never fabricates final completion.
CREATE OR REPLACE FUNCTION public.reality_read_genuine_reconciliation_target_v1(p_repairing_trigger_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare repair reality_internal.genuine_capability_queue_v1%rowtype;
 target reality_internal.genuine_original_continuations_v1%rowtype;
 target_q reality_internal.genuine_capability_queue_v1%rowtype;
 approval reality_internal.genuine_preview_install_approvals_v1%rowtype;
 original public.universe_events%rowtype;
 tail public.universe_events%rowtype;
 n int;
 collisions int;
 ancestor_count int;
 chain_nodes int;
 preceding reality_internal.genuine_original_continuations_v1%rowtype;
 preceding_source public.universe_events%rowtype;
 preceding_completion public.universe_events%rowtype;
 target_completion public.universe_events%rowtype;
 repairing_source public.universe_events%rowtype;
 resolved_witnesses int;
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
 -- Zero unresolved targets is NOT proof the job completed. Resolve it
 -- only if one prior owner-bound repair from this exact failed source
 -- already produced both independently VERIFIED Universe completions.
 -- Otherwise fail closed. No arbitrary target selection or new event.
 if n=0 then
  select * into repairing_source from public.universe_events
   where event_id=repair.original_work_event_id;
  if repairing_source.event_id is null or
     repairing_source.epistemic_status<>'VERIFIED' or
     repairing_source.payload->>'owner_id'<>repair.owner_id::text or
     repairing_source.payload->>'original_work_id'<>repair.original_work_id or
     repairing_source.payload->>'original_job_completed'<>'false' or
     repairing_source.payload->>'owner_authorized_investigation'<>'true'
  then raise exception 'RECONCILIATION_RESOLVED_CURRENT_ORIGINAL_UNVERIFIED';end if;
  select count(*) into resolved_witnesses
   from reality_internal.genuine_original_continuations_v1 prior
   join reality_internal.genuine_capability_queue_v1 prior_q
     on prior_q.trigger_id=prior.trigger_id
   join public.universe_events prior_src
     on prior_src.event_id=prior_q.original_work_event_id
   where prior.owner_id=repair.owner_id
    and prior.original_work_id<>repair.original_work_id
    and prior.state='SETTLED_ISOLATED'
    and prior_q.capability_id='reality-continuity-settlement-reconciler'
    and prior_q.phase='SETTLED_ISOLATED'
    and prior_src.epistemic_status='VERIFIED'
    and prior_src.payload->>'owner_id'=repair.owner_id::text
    and prior_src.payload->>'original_work_id'=prior.original_work_id
    and prior_src.payload->>'issue_number'=repairing_source.payload->>'issue_number'
    and prior_src.payload->>'original_source_sha'=repairing_source.payload->>'original_source_sha'
    and prior_src.payload->>'original_provider_failed_run_id'=repairing_source.payload->>'original_provider_failed_run_id'
    and prior_src.payload->>'original_provider_failed_job_id'=repairing_source.payload->>'original_provider_failed_job_id'
    and prior_src.payload->>'source_path'=repairing_source.payload->>'source_path'
    and prior_src.payload->>'frozen_test_sha256'=repairing_source.payload->>'frozen_test_sha256'
    and prior.outcome_receipt->>'independent_outcome_verified'='true'
    and prior.outcome_receipt->>'original_job_completed'='true'
    and prior.outcome_receipt->>'production_changed'='false'
    and prior.outcome_receipt->>'installed_commit_sha'=prior.installed_commit_sha
    and prior.outcome_receipt->>'owner_approval_id'=prior.approval_id::text
    and prior.outcome_receipt->>'reconciliation_target_original_work_id' ~ '^work:[a-f0-9]{32}
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
 -- Prove that the original VERIFIED event is actually reachable from
 -- the UNIQUE current tip, not merely part of an unrelated same-world row.
 with recursive lineage as (
  select tail.event_id,tail.parent_event_id,0 as depth
  union all
  select p.event_id,p.parent_event_id,chain.depth+1
   from public.universe_events p
   join lineage chain on chain.parent_event_id=p.event_id
   where chain.depth<4096
    and p.continuity_root_id=original.continuity_root_id
    and p.worldline_id=original.worldline_id
 )
 select count(*) filter (where event_id=original.event_id)::int,count(*)::int
 into ancestor_count,chain_nodes from lineage;
 if ancestor_count<>1 or chain_nodes<1 or chain_nodes>4096 then
  raise exception 'RECONCILIATION_TARGET_ORIGINAL_CHAIN_ANCESTRY_MISSING';end if;
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
    'original_event_in_chain_verified',true,
    'head_lineage_hash',tail.lineage_hash,'verified_completion_events','[]'::jsonb),
  'production_changed',false);
end $function$

    and exists(select 1 from public.universe_events finished
      where finished.epistemic_status='VERIFIED'
        and finished.payload->>'original_work_id'=prior.original_work_id
        and finished.payload->>'constitutional_phase'='SETTLED'
        and finished.payload->>'original_job_completed'='true')
    and exists(select 1 from public.universe_events target_finished
      where target_finished.epistemic_status='VERIFIED'
        and target_finished.payload->>'original_work_id'=
          prior.outcome_receipt->>'reconciliation_target_original_work_id'
        and target_finished.payload->>'constitutional_phase'='SETTLED'
        and target_finished.payload->>'original_job_completed'='true');
  if resolved_witnesses<>1 then
   raise exception 'RECONCILIATION_NO_TARGET_EXACT_HISTORICAL_PROOF_REQUIRED';end if;
  select prior.* into preceding
   from reality_internal.genuine_original_continuations_v1 prior
   join reality_internal.genuine_capability_queue_v1 prior_q
     on prior_q.trigger_id=prior.trigger_id
   join public.universe_events prior_src
     on prior_src.event_id=prior_q.original_work_event_id
   where prior.owner_id=repair.owner_id
    and prior.original_work_id<>repair.original_work_id
    and prior.state='SETTLED_ISOLATED'
    and prior_q.capability_id='reality-continuity-settlement-reconciler'
    and prior_q.phase='SETTLED_ISOLATED'
    and prior_src.epistemic_status='VERIFIED'
    and prior_src.payload->>'owner_id'=repair.owner_id::text
    and prior_src.payload->>'issue_number'=repairing_source.payload->>'issue_number'
    and prior_src.payload->>'original_source_sha'=repairing_source.payload->>'original_source_sha'
    and prior_src.payload->>'original_provider_failed_run_id'=repairing_source.payload->>'original_provider_failed_run_id'
    and prior_src.payload->>'original_provider_failed_job_id'=repairing_source.payload->>'original_provider_failed_job_id'
    and prior_src.payload->>'source_path'=repairing_source.payload->>'source_path'
    and prior_src.payload->>'frozen_test_sha256'=repairing_source.payload->>'frozen_test_sha256'
    and prior.outcome_receipt->>'independent_outcome_verified'='true'
    and prior.outcome_receipt->>'original_job_completed'='true'
    and prior.outcome_receipt->>'production_changed'='false'
    and prior.outcome_receipt->>'installed_commit_sha'=prior.installed_commit_sha
    and prior.outcome_receipt->>'owner_approval_id'=prior.approval_id::text
    and prior.outcome_receipt->>'reconciliation_target_original_work_id' ~ '^work:[a-f0-9]{32}
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
 -- Prove that the original VERIFIED event is actually reachable from
 -- the UNIQUE current tip, not merely part of an unrelated same-world row.
 with recursive lineage as (
  select tail.event_id,tail.parent_event_id,0 as depth
  union all
  select p.event_id,p.parent_event_id,chain.depth+1
   from public.universe_events p
   join lineage chain on chain.parent_event_id=p.event_id
   where chain.depth<4096
    and p.continuity_root_id=original.continuity_root_id
    and p.worldline_id=original.worldline_id
 )
 select count(*) filter (where event_id=original.event_id)::int,count(*)::int
 into ancestor_count,chain_nodes from lineage;
 if ancestor_count<>1 or chain_nodes<1 or chain_nodes>4096 then
  raise exception 'RECONCILIATION_TARGET_ORIGINAL_CHAIN_ANCESTRY_MISSING';end if;
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
    'original_event_in_chain_verified',true,
    'head_lineage_hash',tail.lineage_hash,'verified_completion_events','[]'::jsonb),
  'production_changed',false);
end $function$

    and exists(select 1 from public.universe_events e
      where e.epistemic_status='VERIFIED'
       and e.payload->>'original_work_id'=prior.original_work_id
       and e.payload->>'constitutional_phase'='SETTLED'
       and e.payload->>'original_job_completed'='true')
    and exists(select 1 from public.universe_events e
      where e.epistemic_status='VERIFIED'
       and e.payload->>'original_work_id'=
         prior.outcome_receipt->>'reconciliation_target_original_work_id'
       and e.payload->>'constitutional_phase'='SETTLED'
       and e.payload->>'original_job_completed'='true');
  select * into preceding_completion from public.universe_events e
   where e.epistemic_status='VERIFIED'
     and e.payload->>'original_work_id'=preceding.original_work_id
     and e.payload->>'constitutional_phase'='SETTLED'
     and e.payload->>'original_job_completed'='true';
  select * into target_completion from public.universe_events e
   where e.epistemic_status='VERIFIED'
     and e.payload->>'original_work_id'=
       preceding.outcome_receipt->>'reconciliation_target_original_work_id'
     and e.payload->>'constitutional_phase'='SETTLED'
     and e.payload->>'original_job_completed'='true';
  if preceding_completion.event_id is null or target_completion.event_id is null then
    raise exception 'RECONCILIATION_NO_TARGET_VERIFIED_UNIVERSE_EVENTS_REQUIRED';end if;
  return pg_catalog.jsonb_build_object(
   'status','RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE',
   'repairing_original_work_id',repair.original_work_id,
   'previous_repairing_original_work_id',preceding.original_work_id,
   'previous_original_universe_event_id',preceding_completion.event_id,
   'previous_reconciliation_target_work_id',
     preceding.outcome_receipt->>'reconciliation_target_original_work_id',
   'previous_target_universe_event_id',target_completion.event_id,
   'independent_database_readback',true,
   'unresolved_reconciliation_targets',0,
   'new_reconciliation_proposed',false,
   'original_job_completed',false,
   'production_changed',false);
 end if;
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
 -- Prove that the original VERIFIED event is actually reachable from
 -- the UNIQUE current tip, not merely part of an unrelated same-world row.
 with recursive lineage as (
  select tail.event_id,tail.parent_event_id,0 as depth
  union all
  select p.event_id,p.parent_event_id,chain.depth+1
   from public.universe_events p
   join lineage chain on chain.parent_event_id=p.event_id
   where chain.depth<4096
    and p.continuity_root_id=original.continuity_root_id
    and p.worldline_id=original.worldline_id
 )
 select count(*) filter (where event_id=original.event_id)::int,count(*)::int
 into ancestor_count,chain_nodes from lineage;
 if ancestor_count<>1 or chain_nodes<1 or chain_nodes>4096 then
  raise exception 'RECONCILIATION_TARGET_ORIGINAL_CHAIN_ANCESTRY_MISSING';end if;
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
    'original_event_in_chain_verified',true,
    'head_lineage_hash',tail.lineage_hash,'verified_completion_events','[]'::jsonb),
  'production_changed',false);
end $function$

-- Explicitly preserve the trusted service-only readback boundary.
revoke all on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 to service_role;
