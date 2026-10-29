-- Reality governed self-improvement queue: preview-only, owner-scoped,
-- service-role access, no model authority, no external execution on enqueue.
-- Additive; does not change existing goals, jobs, capability registry or production.
create table if not exists reality_internal.governed_build_queue_v1 (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 conversation_id uuid not null,
 goal_id text not null,
 goal_transition_event_id uuid not null,
 goal_revision bigint not null,
 original_work_id text not null check (original_work_id ~ '^work:[a-f0-9]{32}$'),
 original_work_evidence_ref text not null,
 goal_evidence_ref text not null,
 continuity_root_id uuid not null,
 worldline_id uuid not null,
 preview_release_sha text not null check (preview_release_sha ~ '^[a-f0-9]{40}$'),
 phase text not null default 'QUEUED_DISCOVERY'
  check (phase in ('QUEUED_DISCOVERY','CLAIMED_DISCOVERY','BLOCKED_MISSING_EVIDENCE','BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED','AWAITING_SANDBOX','SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL','FAILED','CANCELLED')),
 report jsonb not null default '{}'::jsonb,
 worker_identity_ref text,
 worker_claim_id uuid,
 queued_at timestamptz not null default now(),
 claimed_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint governed_build_queue_once_per_release unique
  (owner_id, conversation_id, original_work_id,preview_release_sha)
);
alter table reality_internal.governed_build_queue_v1 enable row level security;
revoke all on reality_internal.governed_build_queue_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.governed_build_queue_v1 to service_role;
grant usage on schema reality_internal to service_role;

create or replace function public.reality_enqueue_governed_build_v1(
 p_owner_id uuid,p_conversation_id uuid,p_goal_id text,
 p_goal_transition_event_id uuid,p_original_work_id text,
 p_original_work_evidence_ref text,p_goal_evidence_ref text,
 p_continuity_root_id uuid,p_worldline_id uuid,
 p_preview_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare epoch record; row record;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
 then raise exception 'GOVERNED_BUILD_SERVICE_ROLE_REQUIRED'; end if;
 if p_owner_id is null or p_conversation_id is null or p_goal_transition_event_id is null
 or p_continuity_root_id is null or p_worldline_id is null
 or p_goal_id is null or length(p_goal_id)<5
 or coalesce(length(p_original_work_evidence_ref),0)<4
 or coalesce(length(p_goal_evidence_ref),0)<4
 or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 or p_preview_release_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'GOVERNED_BUILD_PINNED_SCOPE_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into epoch from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if not found or epoch.last_transition_event_id is distinct from p_goal_transition_event_id
 then raise exception 'GOVERNED_BUILD_OWNER_GOAL_EPOCH_UNVERIFIED'; end if;
 if not exists (select 1 from public.universe_events where
  event_id=p_goal_transition_event_id and
  continuity_root_id=p_continuity_root_id and
  worldline_id=p_worldline_id and
  payload->>'command'='AUTHORITATIVE_USER_GOAL_TRANSITION')
 then raise exception 'GOVERNED_BUILD_GOAL_TRANSITION_EVIDENCE_MISSING'; end if;
 insert into reality_internal.governed_build_queue_v1
 (owner_id,conversation_id,goal_id,goal_transition_event_id,goal_revision,
 original_work_id,original_work_evidence_ref,goal_evidence_ref,
 continuity_root_id,worldline_id,preview_release_sha)
 values (p_owner_id,p_conversation_id,p_goal_id,p_goal_transition_event_id,epoch.revision,
 p_original_work_id,p_original_work_evidence_ref,p_goal_evidence_ref,
 p_continuity_root_id,p_worldline_id,p_preview_release_sha)
 on conflict (owner_id,conversation_id,original_work_id,preview_release_sha)
 do nothing;
 select * into row from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
 and original_work_id=p_original_work_id and preview_release_sha=p_preview_release_sha;
 if row.goal_transition_event_id<>p_goal_transition_event_id or row.goal_id<>p_goal_id
 then raise exception 'GOVERNED_BUILD_EXISTING_QUEUE_STALE_GOAL'; end if;
 return pg_catalog.jsonb_build_object('queue_id',row.id,'phase',row.phase,
 'original_work_id',row.original_work_id,'goal_id',row.goal_id,
 'queued_at',row.queued_at,'model_executed',false,'installation_authorized',false,
 'job_completed',false);
end $$;

create or replace function public.reality_read_governed_build_v1(
 p_owner_id uuid,p_conversation_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare row record;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
 then raise exception 'GOVERNED_BUILD_SERVICE_ROLE_REQUIRED'; end if;
 select * into row from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
 order by queued_at desc limit 1;
 if not found then return '{}'::jsonb; end if;
 return pg_catalog.jsonb_build_object('queue_id',row.id,'phase',row.phase,
 'goal_id',row.goal_id,'original_work_id',row.original_work_id,
 'preview_release_sha',row.preview_release_sha,'queued_at',row.queued_at,
 'updated_at',row.updated_at,
 'report',row.report,'installation_authorized',false,
 'job_completed',false);
end $$;

revoke all on function public.reality_enqueue_governed_build_v1(uuid,uuid,text,uuid,text,text,text,uuid,uuid,text)
 from public,anon,authenticated;
revoke all on function public.reality_read_governed_build_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_enqueue_governed_build_v1(uuid,uuid,text,uuid,text,text,text,uuid,uuid,text)
 to service_role;
grant execute on function public.reality_read_governed_build_v1(uuid,uuid)
 to service_role;
