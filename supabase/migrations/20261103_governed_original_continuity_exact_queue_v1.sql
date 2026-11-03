-- Preview-only Reality governed original-work continuity handoff.
-- Exact, service-role owner/work lookup and single original queue across releases.
-- No capability installation, owner authorization grant or job settlement.
create or replace function public.reality_read_exact_original_queue_v1(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.governed_build_queue_v1%rowtype; matches integer;
begin
 if current_user<>'service_role' then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_conversation_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_EXACT_IDENTITY_REQUIRED';end if;
 select count(*) into matches from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
  and original_work_id=p_original_work_id;
 if matches>1 then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_DUPLICATE_RELEASE_QUEUE_REVIEW_REQUIRED';end if;
 select * into q from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
  and original_work_id=p_original_work_id limit 1;
 if q.id is null then return '{}'::jsonb;end if;
 return pg_catalog.jsonb_build_object(
  'queue_id',q.id,'owner_id',q.owner_id,'conversation_id',q.conversation_id,
  'goal_id',q.goal_id,'goal_transition_event_id',q.goal_transition_event_id,
  'continuity_root_id',q.continuity_root_id,'worldline_id',q.worldline_id,
  'original_work_id',q.original_work_id,'phase',q.phase,
  'preview_release_sha',q.preview_release_sha,
  'dispatch_commit_sha',q.dispatch_commit_sha,
  'request_path',q.dispatch_request_path,'dispatched_at',q.dispatched_at,
  'queued_at',q.queued_at,'installation_authorized',false,'job_completed',false,
  'production_changed',false
 );
end $$;
revoke all on function public.reality_read_exact_original_queue_v1(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_exact_original_queue_v1(uuid,uuid,text)
 to service_role;

create or replace function public.reality_enqueue_exact_original_queue_v1(
 p_owner_id uuid,p_conversation_id uuid,p_goal_id text,
 p_goal_transition_event_id uuid,p_original_work_id text,
 p_original_work_evidence_ref text,p_goal_evidence_ref text,
 p_continuity_root_id uuid,p_worldline_id uuid,
 p_preview_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.governed_build_queue_v1%rowtype;
 epoch reality_internal.goal_publication_epochs%rowtype;
 matches integer;
begin
 if current_user<>'service_role' then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_conversation_id is null or
    p_goal_transition_event_id is null or p_continuity_root_id is null or
    p_worldline_id is null or length(coalesce(p_goal_id,''))<5 or
    length(coalesce(p_original_work_evidence_ref,''))<4 or
    length(coalesce(p_goal_evidence_ref,''))<4 or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' or
    p_preview_release_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_PINNED_SCOPE_REQUIRED';end if;
 -- Lock identically to the existing builder and user-goal publisher.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into epoch from reality_internal.goal_publication_epochs
  where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if epoch.user_id is null or epoch.last_transition_event_id is distinct from
     p_goal_transition_event_id then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_GOAL_EPOCH_CHANGED';end if;
 select count(*) into matches from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
  and original_work_id=p_original_work_id;
 if matches>1 then
  raise exception 'GOVERNED_ORIGINAL_QUEUE_DUPLICATE_RELEASE_QUEUE_REVIEW_REQUIRED';end if;
 select * into q from reality_internal.governed_build_queue_v1
 where owner_id=p_owner_id and conversation_id=p_conversation_id
  and original_work_id=p_original_work_id limit 1;
 if q.id is not null then
  if q.goal_id<>p_goal_id or
     q.goal_transition_event_id<>p_goal_transition_event_id or
     q.goal_revision<>epoch.revision or
     q.original_work_evidence_ref<>p_original_work_evidence_ref or
     q.goal_evidence_ref<>p_goal_evidence_ref or
     q.continuity_root_id<>p_continuity_root_id or
     q.worldline_id<>p_worldline_id then
    raise exception 'GOVERNED_ORIGINAL_QUEUE_EXISTING_LINEAGE_CHANGED';end if;
  return pg_catalog.jsonb_build_object(
   'queue_id',q.id,'owner_id',q.owner_id,'conversation_id',q.conversation_id,
   'goal_id',q.goal_id,'goal_transition_event_id',q.goal_transition_event_id,
   'continuity_root_id',q.continuity_root_id,'worldline_id',q.worldline_id,
   'original_work_id',q.original_work_id,'phase',q.phase,
   'preview_release_sha',q.preview_release_sha,
   'dispatch_commit_sha',q.dispatch_commit_sha,
   'request_path',q.dispatch_request_path,'dispatched_at',q.dispatched_at,
   'queued_at',q.queued_at,'installation_authorized',false,'job_completed',false,
   'production_changed',false,'existing_original_reused',true);
 end if;
 -- Existing V1 function performs independent source and goal evidence checks
 -- and inserts under the same transaction/advisory lock.
 return public.reality_enqueue_governed_build_v1(
  p_owner_id,p_conversation_id,p_goal_id,p_goal_transition_event_id,
  p_original_work_id,p_original_work_evidence_ref,p_goal_evidence_ref,
  p_continuity_root_id,p_worldline_id,p_preview_release_sha
 );
end $$;
revoke all on function public.reality_enqueue_exact_original_queue_v1(
 uuid,uuid,text,uuid,text,text,text,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_enqueue_exact_original_queue_v1(
 uuid,uuid,text,uuid,text,text,text,uuid,uuid,text)
 to service_role;
