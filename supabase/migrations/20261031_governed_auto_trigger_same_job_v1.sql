-- ISOLATED PREVIEW ONLY: durable, atomic event trigger registration and single
-- claim for an independently source-backed, owner-confirmed ORIGINAL job.
-- No model, browser, anon or authenticated DB role can mint the trigger.
-- This does not grant source installation, production writes or job settlement.
create table if not exists reality_internal.governed_auto_triggers_v1 (
  trigger_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  conversation_id uuid not null,
  original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
  original_work_event_id uuid not null,
  goal_id text not null,
  goal_transition_event_id uuid not null,
  capability_id text not null check (capability_id ~ '^[a-z][a-z0-9._-]{2,90}$'),
  issue_number integer not null check (issue_number between 1 and 100000),
  failed_run_id bigint not null check (failed_run_id > 0),
  frozen_test_sha256 text not null check (frozen_test_sha256 ~ '^[a-f0-9]{64}$'),
  phase text not null default 'PENDING_VERIFIED_GAP_REOBSERVATION'
    check (phase in ('PENDING_VERIFIED_GAP_REOBSERVATION',
     'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
     'EVIDENCE_RECONCILIATION_REQUIRED')),
  claim_id uuid unique,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(owner_id, original_work_id, original_work_event_id)
);
alter table reality_internal.governed_auto_triggers_v1 enable row level security;
revoke all on reality_internal.governed_auto_triggers_v1 from public,anon,authenticated;

create or replace function public.reality_enqueue_governed_auto_trigger_v1(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text,
 p_original_work_event_id uuid,p_goal_transition_event_id uuid,
 p_capability_id text)
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  e reality_internal.goal_publication_epochs%rowtype;
  source_event public.universe_events%rowtype;
  t reality_internal.governed_auto_triggers_v1%rowtype;
  claim_goal text;
  n integer;
  run_id bigint;
  frozen text;
begin
 if current_user <> 'service_role' then
  raise exception 'GOVERNED_AUTO_TRIGGER_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null or p_conversation_id is null
  or p_original_work_event_id is null or p_goal_transition_event_id is null
  or p_original_work_id !~ '^work:[a-f0-9]{32}$'
  or p_capability_id !~ '^[a-z][a-z0-9._-]{2,90}$'
 then raise exception 'GOVERNED_AUTO_TRIGGER_SCOPE_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
  where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if e.user_id is null or e.last_transition_event_id is distinct from p_goal_transition_event_id
 then raise exception 'GOVERNED_AUTO_TRIGGER_CURRENT_GOAL_REQUIRED'; end if;
 select * into source_event from public.universe_events
  where event_id=p_original_work_event_id;
 if source_event.event_id is null
  or source_event.entity_type <> 'reality_original_source_backed_repair_work'
  or source_event.payload->>'owner_id' is distinct from p_owner_id::text
  or source_event.payload->>'original_work_id' is distinct from p_original_work_id
  or source_event.payload->>'goal_transition_receipt_ref' is distinct from e.last_transition_event_id::text
  or source_event.provenance->>'conversation_id' is distinct from p_conversation_id::text
  or source_event.payload->>'owner_authorized_investigation' is distinct from 'true'
  or source_event.payload->>'owner_authorized_installation' is distinct from 'false'
  or source_event.payload->>'original_job_completed' is distinct from 'false'
  or source_event.payload->>'production_changed' is distinct from 'false'
  or source_event.epistemic_status <> 'VERIFIED'
 then raise exception 'GOVERNED_AUTO_TRIGGER_VERIFIED_ORIGINAL_WORK_REQUIRED'; end if;
 claim_goal := source_event.payload->>'goal_id';
 frozen := source_event.payload->>'frozen_test_sha256';
 if claim_goal is null or length(claim_goal)<4
  or frozen !~ '^[a-f0-9]{64}$'
  or coalesce(source_event.payload->>'original_source_sha','') !~ '^[a-f0-9]{40}$'
  or coalesce(source_event.payload->>'provider_failure_evidence_hash','') !~ '^[a-f0-9]{64}$'
 then raise exception 'GOVERNED_AUTO_TRIGGER_PINNED_FAILURE_EVIDENCE_REQUIRED'; end if;
 if coalesce(source_event.payload->>'issue_number','') !~ '^[1-9][0-9]{0,5}$'
  or coalesce(source_event.payload->>'original_provider_failed_run_id','') !~ '^[1-9][0-9]{0,18}$'
 then raise exception 'GOVERNED_AUTO_TRIGGER_PROVIDER_IDENTIFIERS_REQUIRED'; end if;
 n := (source_event.payload->>'issue_number')::integer;
 run_id := (source_event.payload->>'original_provider_failed_run_id')::bigint;
 if n>100000 or run_id<1 then raise exception 'GOVERNED_AUTO_TRIGGER_PROVIDER_RANGE_INVALID'; end if;
 -- Distinguish original failure from owner's user intent. This is only a
 -- queued investigation, never a signed permission to install.
 if not exists (
  select 1 from public.universe_events g
  where g.event_id=p_goal_transition_event_id
    and g.continuity_root_id=source_event.continuity_root_id
    and g.worldline_id=source_event.worldline_id
    and g.payload->>'event_type'='AUTHORITATIVE_USER_GOAL_TRANSITION'
    and g.payload->>'authorized_by'='AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND'
    and g.payload->>'principal_id'=p_owner_id::text
    and g.payload->>'goal_id'=claim_goal
 ) then raise exception 'GOVERNED_AUTO_TRIGGER_GOAL_SOURCE_MISSING'; end if;
 insert into reality_internal.governed_auto_triggers_v1
 (owner_id,conversation_id,original_work_id,original_work_event_id,
  goal_id,goal_transition_event_id,capability_id,issue_number,failed_run_id,frozen_test_sha256)
 values (p_owner_id,p_conversation_id,p_original_work_id,p_original_work_event_id,
  claim_goal,p_goal_transition_event_id,p_capability_id,n,run_id,frozen)
 on conflict(owner_id,original_work_id,original_work_event_id) do nothing;
 select * into t from reality_internal.governed_auto_triggers_v1
 where owner_id=p_owner_id and original_work_id=p_original_work_id
  and original_work_event_id=p_original_work_event_id;
 if t.conversation_id<>p_conversation_id or t.goal_id<>claim_goal
  or t.goal_transition_event_id<>p_goal_transition_event_id
  or t.capability_id<>p_capability_id
  or t.issue_number<>n or t.failed_run_id<>run_id
  or t.frozen_test_sha256<>frozen
 then raise exception 'GOVERNED_AUTO_TRIGGER_CONFLICTING_SOURCE'; end if;
 return pg_catalog.jsonb_build_object(
 'trigger_id',t.trigger_id,'original_work_id',t.original_work_id,
 'source_event_id',t.original_work_event_id,'phase',t.phase,
 'installation_authorized',false,'original_job_completed',false,
 'production_changed',false,'new_customer_job_created',false);
end $$;

create or replace function public.reality_claim_governed_auto_trigger_v1(
 p_trigger_id uuid,p_owner_id uuid,p_original_work_id text)
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare t reality_internal.governed_auto_triggers_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user <> 'service_role' then
  raise exception 'GOVERNED_AUTO_TRIGGER_SERVICE_ROLE_REQUIRED'; end if;
 select * into t from reality_internal.governed_auto_triggers_v1
 where trigger_id=p_trigger_id and owner_id=p_owner_id
  and original_work_id=p_original_work_id for update;
 if t.trigger_id is null then raise exception 'GOVERNED_AUTO_TRIGGER_NOT_FOUND'; end if;
 if t.phase<>'PENDING_VERIFIED_GAP_REOBSERVATION' or t.claim_id is not null
 then raise exception 'GOVERNED_AUTO_TRIGGER_ALREADY_CLAIMED_NO_REPLAY'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||p_owner_id::text||':'||t.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=t.owner_id and conversation_id=t.conversation_id for update;
 if e.last_transition_event_id is distinct from t.goal_transition_event_id
 then raise exception 'GOVERNED_AUTO_TRIGGER_GOAL_CHANGED'; end if;
 update reality_internal.governed_auto_triggers_v1
  set phase='CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
      claim_id=gen_random_uuid(),claimed_at=now(),updated_at=now()
 where trigger_id=t.trigger_id
 returning * into t;
 return pg_catalog.jsonb_build_object(
  'trigger_id',t.trigger_id,'claim_id',t.claim_id,
  'original_work_id',t.original_work_id,'original_work_event_id',t.original_work_event_id,
  'goal_id',t.goal_id,'capability_id',t.capability_id,
  'issue_number',t.issue_number,'failed_run_id',t.failed_run_id,
  'frozen_test_sha256',t.frozen_test_sha256,
  'phase',t.phase,'reobserve_before_generation',true,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_customer_job_created',false);
end $$;

revoke all on function public.reality_enqueue_governed_auto_trigger_v1(uuid,uuid,text,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_enqueue_governed_auto_trigger_v1(uuid,uuid,text,uuid,uuid,text)
 to service_role;
revoke all on function public.reality_claim_governed_auto_trigger_v1(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_claim_governed_auto_trigger_v1(uuid,uuid,text)
 to service_role;
