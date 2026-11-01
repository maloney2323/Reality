-- Genuine Capability Engine v1 / isolated Reality preview.
-- This is a DURABLE INVESTIGATION INBOX, not an installer or owner approval.
-- Every row references a provider-verified gap in the append-only Universe.
create table if not exists reality_internal.genuine_capability_queue_v1 (
 trigger_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 conversation_id uuid not null,
 original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
 original_work_event_id uuid not null,
 goal_id text not null,
 goal_transition_event_id uuid not null,
 gap_event_id uuid not null unique,
 provider_failure_hash text not null check (provider_failure_hash ~ '^[a-f0-9]{64}$'),
 capability_id text not null check (capability_id ~ '^[a-z][a-z0-9._-]{2,90}$'),
 source_ref text not null,
 frozen_suite_ref text not null,
 phase text not null default 'PENDING_FROZEN_REPRODUCTION'
  check (phase in ('PENDING_FROZEN_REPRODUCTION',
   'LEASED_FOR_INDEPENDENT_REPRODUCTION',
   'EVIDENCE_RECONCILIATION_REQUIRED',
   'FROZEN_REPRODUCED_AWAITING_CANDIDATE')),
 claim_id uuid unique,
 claim_expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id, original_work_id, gap_event_id)
);
create index if not exists genuine_capability_pending_idx
 on reality_internal.genuine_capability_queue_v1(phase,created_at);
alter table reality_internal.genuine_capability_queue_v1 enable row level security;
revoke all on reality_internal.genuine_capability_queue_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.genuine_capability_queue_v1 to service_role;

create or replace function public.reality_enqueue_genuine_capability_gap_v1(
 p_gap_event_id uuid)
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
 g public.universe_events%rowtype;
 o public.universe_events%rowtype;
 t reality_internal.genuine_capability_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 owner_uuid uuid;
 conv_uuid uuid;
 original_uuid uuid;
 transition_uuid uuid;
 w text;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_CAPABILITY_SERVICE_ROLE_REQUIRED'; end if;
 select * into g from public.universe_events where event_id=p_gap_event_id;
 if g.event_id is null or g.entity_type<>'reality_genuine_capability_gap_v1'
   or g.epistemic_status<>'VERIFIED'
   or g.payload->>'independently_verified' is distinct from 'true'
   or g.payload->>'installation_authorized' is distinct from 'false'
   or g.payload->>'original_job_completed' is distinct from 'false'
   or g.payload->>'production_changed' is distinct from 'false'
   or g.payload->>'provider_effect_may_have_occurred' is distinct from 'false'
   or g.payload->>'external_action_performed' is distinct from 'false'
   or g.payload->>'evidence_kind' is distinct from 'OBSERVED_FAILURE'
   or g.payload->>'blocker_class' is distinct from 'MISSING_INSTRUMENT'
 then raise exception 'GENUINE_CAPABILITY_TRUSTED_PROVIDER_GAP_REQUIRED'; end if;
 if coalesce(g.payload->>'owner_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or coalesce(g.payload->>'conversation_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or coalesce(g.payload->>'original_work_event_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or coalesce(g.payload->>'goal_transition_event_id','') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or coalesce(g.payload->>'original_work_id','') !~ '^work:[a-f0-9]{32}$'
   or coalesce(g.payload->>'provider_failure_hash','') !~ '^[a-f0-9]{64}$'
   or coalesce(g.payload->>'capability_id','') !~ '^[a-z][a-z0-9._-]{2,90}$'
   or length(coalesce(g.payload->>'verification_suite_ref',''))<13
   or length(coalesce(g.payload->>'source_ref',''))<20
 then raise exception 'GENUINE_CAPABILITY_GAP_EVIDENCE_FIELDS_INVALID'; end if;
 owner_uuid := (g.payload->>'owner_id')::uuid;
 conv_uuid := (g.payload->>'conversation_id')::uuid;
 original_uuid := (g.payload->>'original_work_event_id')::uuid;
 transition_uuid := (g.payload->>'goal_transition_event_id')::uuid;
 w := g.payload->>'original_work_id';
 if g.provenance->>'conversation_id' is distinct from conv_uuid::text
   or g.provenance->>'principal_id' is distinct from owner_uuid::text
 then raise exception 'GENUINE_CAPABILITY_GAP_PROVENANCE_MISMATCH'; end if;
 -- Lock the same authenticated goal epoch used by Reality's existing owner
 -- admission. No model or asynchronous worker can change the goal.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||owner_uuid::text||':'||conv_uuid::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=owner_uuid and conversation_id=conv_uuid for update;
 if e.user_id is null or e.last_transition_event_id is distinct from transition_uuid
 then raise exception 'GENUINE_CAPABILITY_CURRENT_OWNER_GOAL_REQUIRED'; end if;
 select * into o from public.universe_events where event_id=original_uuid;
 if o.event_id is null
   or o.epistemic_status<>'VERIFIED'
   or o.continuity_root_id is distinct from g.continuity_root_id
   or o.worldline_id is distinct from g.worldline_id
   or o.payload->>'original_work_id' is distinct from w
   or o.payload->>'owner_id' is distinct from owner_uuid::text
   or o.payload->>'original_job_completed' is distinct from 'false'
   or o.provenance->>'conversation_id' is distinct from conv_uuid::text
 then raise exception 'GENUINE_CAPABILITY_ORIGINAL_UNFINISHED_WORK_REQUIRED'; end if;
 if not exists (select 1 from public.universe_events x
    where x.event_id=transition_uuid
      and x.continuity_root_id=g.continuity_root_id
      and x.worldline_id=g.worldline_id
      and x.payload->>'event_type'='AUTHORITATIVE_USER_GOAL_TRANSITION'
      and x.payload->>'authorized_by'='AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND'
      and x.payload->>'principal_id'=owner_uuid::text
      and x.payload->>'goal_id'=g.payload->>'goal_id')
 then raise exception 'GENUINE_CAPABILITY_AUTHORITATIVE_GOAL_MISSING'; end if;
 insert into reality_internal.genuine_capability_queue_v1
 (owner_id,conversation_id,original_work_id,original_work_event_id,
  goal_id,goal_transition_event_id,gap_event_id,
  provider_failure_hash,capability_id,source_ref,frozen_suite_ref)
 values (owner_uuid,conv_uuid,w,original_uuid,
  g.payload->>'goal_id',transition_uuid,g.event_id,
  g.payload->>'provider_failure_hash',g.payload->>'capability_id',
  g.payload->>'source_ref',g.payload->>'verification_suite_ref')
 on conflict(gap_event_id) do nothing;
 select * into t from reality_internal.genuine_capability_queue_v1
 where gap_event_id=g.event_id;
 if t.owner_id is distinct from owner_uuid
   or t.conversation_id is distinct from conv_uuid
   or t.original_work_id is distinct from w
   or t.original_work_event_id is distinct from original_uuid
   or t.goal_transition_event_id is distinct from transition_uuid
   or t.provider_failure_hash is distinct from g.payload->>'provider_failure_hash'
   or t.capability_id is distinct from g.payload->>'capability_id'
 then raise exception 'GENUINE_CAPABILITY_QUEUE_SOURCE_CONFLICT'; end if;
 return pg_catalog.jsonb_build_object(
  'trigger_id',t.trigger_id,'source_event_id',t.gap_event_id,
  'original_work_id',t.original_work_id,'phase',t.phase,
  'new_customer_job_created',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $$;

create or replace function public.reality_claim_genuine_capability_gap_v1(
 p_trigger_id uuid,p_gap_event_id uuid)
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
 t reality_internal.genuine_capability_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_CAPABILITY_SERVICE_ROLE_REQUIRED'; end if;
 select * into t from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and gap_event_id=p_gap_event_id;
 if t.trigger_id is null then
  raise exception 'GENUINE_CAPABILITY_TRIGGER_NOT_FOUND'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||t.owner_id::text||':'||t.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=t.owner_id and conversation_id=t.conversation_id for update;
 select * into t from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and gap_event_id=p_gap_event_id for update;
 if t.phase<>'PENDING_FROZEN_REPRODUCTION' or t.claim_id is not null
 then raise exception 'GENUINE_CAPABILITY_ALREADY_CLAIMED_NO_REPLAY'; end if;
 if e.last_transition_event_id is distinct from t.goal_transition_event_id
 then raise exception 'GENUINE_CAPABILITY_OWNER_GOAL_CHANGED'; end if;
 update reality_internal.genuine_capability_queue_v1
 set phase='LEASED_FOR_INDEPENDENT_REPRODUCTION',claim_id=gen_random_uuid(),
  claim_expires_at=now()+interval '15 minutes',updated_at=now()
 where trigger_id=t.trigger_id
 returning * into t;
 return pg_catalog.jsonb_build_object(
  'trigger_id',t.trigger_id,'claim_id',t.claim_id,
  'source_event_id',t.gap_event_id,
  'owner_id',t.owner_id,'conversation_id',t.conversation_id,
  'original_work_id',t.original_work_id,'original_work_event_id',t.original_work_event_id,
  'goal_id',t.goal_id,'goal_transition_event_id',t.goal_transition_event_id,
  'capability_id',t.capability_id,'source_ref',t.source_ref,
  'verification_suite_ref',t.frozen_suite_ref,
  'provider_failure_hash',t.provider_failure_hash,
  'phase',t.phase,'model_generation_authorized',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $$;

revoke all on function public.reality_enqueue_genuine_capability_gap_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_enqueue_genuine_capability_gap_v1(uuid)
 to service_role;
revoke all on function public.reality_claim_genuine_capability_gap_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_genuine_capability_gap_v1(uuid,uuid)
 to service_role;
