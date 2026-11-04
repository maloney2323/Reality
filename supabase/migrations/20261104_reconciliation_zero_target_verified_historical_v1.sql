-- Read-only reconciliation proof of unique matching historical Universe settlement.
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
 historical reality_internal.genuine_original_continuations_v1%rowtype;
 current_source public.universe_events%rowtype;
 matched_work text;
 matched_count integer;
 prior_universe_event uuid;
 target_universe_event uuid;
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

 -- No unresolved historical targets: independently verify exactly one
 -- owner/source-identical earlier reconciler plus two VERIFIED Universe events.
 -- This is a read-only no-op witness, never settlement of the current job.
 if n=0 then
  select * into current_source from public.universe_events
   where event_id=repair.original_work_event_id;
  if current_source.event_id is null or
    current_source.epistemic_status<>'VERIFIED' or
    current_source.payload->>'owner_id'<>repair.owner_id::text or
    current_source.payload->>'original_work_id'<>repair.original_work_id or
    current_source.payload->>'original_job_completed'<>'false' or
    current_source.payload->>'owner_authorized_investigation'<>'true'
  then raise exception 'RECONCILIATION_CURRENT_SCOPE_NOT_VERIFIED';end if;
  select count(*)::int,min(prior.original_work_id)
    into matched_count,matched_work
   from reality_internal.genuine_original_continuations_v1 prior
   join reality_internal.genuine_capability_queue_v1 prior_q
     on prior_q.trigger_id=prior.trigger_id
   join public.universe_events prior_src
     on prior_src.event_id=prior_q.original_work_event_id
   join public.universe_events previous_done
     on previous_done.payload->>'original_work_id'=prior.original_work_id
     and previous_done.epistemic_status='VERIFIED'
     and previous_done.payload->>'constitutional_phase'='SETTLED'
     and previous_done.payload->>'original_job_completed'='true'
   join public.universe_events target_done
     on target_done.payload->>'original_work_id'=
        prior.outcome_receipt->>'reconciliation_target_original_work_id'
     and target_done.epistemic_status='VERIFIED'
     and target_done.payload->>'constitutional_phase'='SETTLED'
     and target_done.payload->>'original_job_completed'='true'
   where prior.owner_id=repair.owner_id
    and prior.original_work_id<>repair.original_work_id
    and prior_q.capability_id='reality-continuity-settlement-reconciler'
    and prior_q.phase='SETTLED_ISOLATED'
    and prior.state='SETTLED_ISOLATED'
    and prior_src.epistemic_status='VERIFIED'
    and prior_src.payload->>'owner_id'=repair.owner_id::text
    and prior_src.payload->>'original_work_id'=prior.original_work_id
    and prior_src.payload->>'issue_number'=current_source.payload->>'issue_number'
    and prior_src.payload->>'original_source_sha'=current_source.payload->>'original_source_sha'
    and prior_src.payload->>'original_provider_failed_run_id'=current_source.payload->>'original_provider_failed_run_id'
    and prior_src.payload->>'original_provider_failed_job_id'=current_source.payload->>'original_provider_failed_job_id'
    and prior_src.payload->>'source_path'=current_source.payload->>'source_path'
    and prior_src.payload->>'frozen_test_sha256'=current_source.payload->>'frozen_test_sha256'
    and prior.outcome_receipt->>'independent_outcome_verified'='true'
    and prior.outcome_receipt->>'original_job_completed'='true'
    and prior.outcome_receipt->>'production_changed'='false'
    and prior.outcome_receipt->>'installed_commit_sha'=prior.installed_commit_sha
    and prior.outcome_receipt->>'owner_approval_id'=prior.approval_id::text
    and prior.outcome_receipt->>'reconciliation_target_original_work_id' is not null;
  if matched_count<>1 or matched_work is null then
   raise exception 'RECONCILIATION_NO_TARGET_UNIQUE_HISTORICAL_PROOF_REQUIRED';
  end if;
  select * into historical
   from reality_internal.genuine_original_continuations_v1
   where owner_id=repair.owner_id and original_work_id=matched_work;
  select event_id into prior_universe_event from public.universe_events
   where payload->>'original_work_id'=matched_work
     and epistemic_status='VERIFIED'
     and payload->>'constitutional_phase'='SETTLED'
     and payload->>'original_job_completed'='true';
  select event_id into target_universe_event from public.universe_events
   where payload->>'original_work_id'=
       historical.outcome_receipt->>'reconciliation_target_original_work_id'
     and epistemic_status='VERIFIED'
     and payload->>'constitutional_phase'='SETTLED'
     and payload->>'original_job_completed'='true';
  if prior_universe_event is null or target_universe_event is null then
   raise exception 'RECONCILIATION_NO_TARGET_VERIFIED_EVENTS_REQUIRED';
  end if;
  return pg_catalog.jsonb_build_object(
   'status','RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE',
   'repairing_original_work_id',repair.original_work_id,
   'previous_repairing_original_work_id',historical.original_work_id,
   'previous_original_universe_event_id',prior_universe_event,
   'previous_reconciliation_target_work_id',
      historical.outcome_receipt->>'reconciliation_target_original_work_id',
   'previous_target_universe_event_id',target_universe_event,
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
end $function$;

revoke all on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_reconciliation_target_v1(uuid)
 to service_role;
