-- Service-only atomic source-linked gap append. A CI observation alone
-- cannot call this without the independently verified owner original job,
-- current goal, exact frozen evidence and non-settlement.
create or replace function public.reality_commit_auto_genuine_gap_v1(
 p_original_event_id uuid, p_node jsonb
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 o public.universe_events%rowtype;
 g public.universe_events%rowtype;
 t public.universe_events%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 n jsonb;
 p jsonb;
 owner_uuid uuid;
 conv_uuid uuid;
 transition_uuid uuid;
 tips integer;
begin
 if current_user <> 'service_role' then
  raise exception 'GENUINE_AUTO_SERVICE_ROLE_REQUIRED'; end if;
 if jsonb_typeof(p_node) <> 'object' then
  raise exception 'GENUINE_AUTO_NODE_REQUIRED'; end if;
 select * into o from public.universe_events where event_id=p_original_event_id;
 if o.event_id is null or
    o.entity_type <> 'reality_original_source_backed_repair_work' or
    o.epistemic_status <> 'VERIFIED' or
    o.event_kind <> 'OBSERVATION' or
    o.payload->>'owner_authorized_investigation' is distinct from 'true' or
    o.payload->>'owner_authorized_installation' is distinct from 'false' or
    o.payload->>'original_job_completed' is distinct from 'false' or
    o.payload->>'production_changed' is distinct from 'false' or
    o.provenance->>'principal_id' is distinct from o.payload->>'owner_id'
 then raise exception 'GENUINE_AUTO_AUTHORIZED_ORIGINAL_REQUIRED'; end if;
 owner_uuid := (o.payload->>'owner_id')::uuid;
 conv_uuid := (o.provenance->>'conversation_id')::uuid;
 transition_uuid := (o.payload->>'goal_transition_receipt_ref')::uuid;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||owner_uuid::text||':'||conv_uuid::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=owner_uuid and conversation_id=conv_uuid for update;
 if e.user_id is null or
    e.last_transition_event_id is distinct from transition_uuid
 then raise exception 'GENUINE_AUTO_CURRENT_GOAL_REQUIRED'; end if;
 if not exists (select 1 from public.universe_events v
    where v.event_id=transition_uuid and
      v.continuity_root_id=o.continuity_root_id and
      v.worldline_id=o.worldline_id and
      v.payload->>'event_type'='AUTHORITATIVE_USER_GOAL_TRANSITION' and
      v.payload->>'authorized_by'='AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND' and
      v.payload->>'principal_id'=owner_uuid::text and
      v.payload->>'goal_id'=o.payload->>'original_goal_id')
 then raise exception 'GENUINE_AUTO_GOAL_AUTHORITY_NOT_VERIFIED'; end if;
 if exists (select 1 from public.universe_events v
    where v.continuity_root_id=o.continuity_root_id and
      v.worldline_id=o.worldline_id and
      v.epistemic_status='VERIFIED' and
      v.payload->>'original_work_id'=o.payload->>'original_work_id' and
      (v.payload->>'original_job_completed'='true' or
       v.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_AUTO_ALREADY_SETTLED'; end if;
 p:=p_node->'payload';
 if p_node->>'entity_type' <> 'reality_genuine_capability_gap_v1' or
    p_node->>'event_kind' <> 'OBSERVATION' or
    p_node->>'epistemic_status' <> 'VERIFIED' or
    p_node->>'continuity_root_id' is distinct from o.continuity_root_id::text or
    p_node->>'worldline_id' is distinct from o.worldline_id::text or
    p_node->'evidence_refs' <> pg_catalog.jsonb_build_array(o.event_id::text) or
    p_node->'provenance'->>'source' <> 'reality-genuine-capability-auto-admit-v1' or
    p_node->'provenance'->>'principal_id' is distinct from owner_uuid::text or
    p_node->'provenance'->>'conversation_id' is distinct from conv_uuid::text or
    p->>'version' <> 'reality_genuine_capability_gap_v1' or
    p->>'owner_id' is distinct from owner_uuid::text or
    p->>'conversation_id' is distinct from conv_uuid::text or
    p->>'goal_id' is distinct from o.payload->>'original_goal_id' or
    p->>'goal_transition_event_id' is distinct from transition_uuid::text or
    p->>'original_work_event_id' is distinct from o.event_id::text or
    p->>'original_work_id' is distinct from o.payload->>'original_work_id' or
    p->>'installation_authorized' is distinct from 'false' or
    p->>'original_job_completed' is distinct from 'false' or
    p->>'production_changed' is distinct from 'false' or
    p->>'independently_verified' is distinct from 'true' or
    p->>'evidence_kind' <> 'OBSERVED_FAILURE' or
    p->>'blocker_class' <> 'MISSING_INSTRUMENT' or
    p->>'external_action_performed' is distinct from 'false' or
    p->>'provider_effect_may_have_occurred' is distinct from 'false' or
    p->>'verification_suite_ref' is distinct from
      'github:frozen-regression:sha256:'||(o.payload->>'frozen_test_sha256') or
    p->>'capability_id' is distinct from
      pg_catalog.regexp_replace(
       pg_catalog.split_part(o.payload->>'source_path','/',3),'\.mjs$','') or
    p->>'source_ref' is distinct from
      'https://github.com/maloney2323/Reality/actions/runs/'||
      (o.payload->>'original_provider_failed_run_id') or
    (p->>'provider_failure_hash') !~ '^[a-f0-9]{64}$' or
    (p_node->>'content_hash') !~ '^[a-f0-9]{64}$' or
    (p_node->>'lineage_hash') !~ '^[a-f0-9]{64}$'
 then raise exception 'GENUINE_AUTO_GAP_FIELDS_UNTRUSTED'; end if;
 select * into g from public.universe_events
 where event_id=(p_node->>'event_id')::uuid;
 if g.event_id is not null then
  if g.payload <> p or g.lineage_hash <> p_node->>'lineage_hash'
     or g.entity_type <> 'reality_genuine_capability_gap_v1'
  then raise exception 'GENUINE_AUTO_EXISTING_GAP_CONFLICT'; end if;
  return pg_catalog.jsonb_build_object('gap_event_id',g.event_id,
   'original_work_id',p->>'original_work_id','status','ALREADY_PERSISTED');
 end if;
 -- Lock the root to serialize this append with other governed auto-admissions.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-genuine-auto-root:'||o.continuity_root_id::text,0));
 select pg_catalog.count(*) into tips from public.universe_events parent
 where parent.continuity_root_id=o.continuity_root_id
  and parent.worldline_id=o.worldline_id
  and not exists(select 1 from public.universe_events child
   where child.parent_event_id=parent.event_id
    and child.continuity_root_id=o.continuity_root_id
    and child.worldline_id=o.worldline_id);
 if tips <> 1 then raise exception 'GENUINE_AUTO_CHAIN_TIP_UNVERIFIED'; end if;
 select * into t from public.universe_events parent
 where parent.continuity_root_id=o.continuity_root_id
  and parent.worldline_id=o.worldline_id
  and not exists(select 1 from public.universe_events child
   where child.parent_event_id=parent.event_id
    and child.continuity_root_id=o.continuity_root_id
    and child.worldline_id=o.worldline_id);
 if p_node->>'parent_event_id' is distinct from t.event_id::text or
    p_node->'provenance'->'continuity_spine'->>'prior_lineage_hash'
      is distinct from t.lineage_hash
 then raise exception 'GENUINE_AUTO_CHAIN_HEAD_MOVED'; end if;
 insert into public.universe_events(event_id,event_kind,entity_type,entity_id,
  continuity_root_id,worldline_id,parent_event_id,effective_time,
  assertion_time,epistemic_status,payload,evidence_refs,provenance,
  content_hash,lineage_hash)
 values ((p_node->>'event_id')::uuid,'OBSERVATION',
  'reality_genuine_capability_gap_v1',(p_node->>'entity_id')::uuid,
  o.continuity_root_id,o.worldline_id,t.event_id,
  (p_node->>'effective_time')::timestamptz,
  (p_node->>'assertion_time')::timestamptz,'VERIFIED',p,
  p_node->'evidence_refs',p_node->'provenance',
  p_node->>'content_hash',p_node->>'lineage_hash');
 return pg_catalog.jsonb_build_object('gap_event_id',p_node->>'event_id',
  'original_work_id',p->>'original_work_id','status','PERSISTED');
end $$;
revoke all on function public.reality_commit_auto_genuine_gap_v1(uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_commit_auto_genuine_gap_v1(uuid,jsonb)
 to service_role;
