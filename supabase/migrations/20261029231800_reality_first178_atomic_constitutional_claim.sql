-- Isolated Reality #178: the existing governed_build_queue owns the
-- at-most-once execution reservation. No new job table or duplicate state
-- machine. SECURITY INVOKER; server service_role only. No external actions.
create or replace function public.reality_claim_governed_build_178_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_goal_id text,p_original_work_id text,
 p_goal_transition_event_id uuid,p_preview_release_sha text)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare q reality_internal.governed_build_queue_v1%rowtype;
        e reality_internal.goal_publication_epochs%rowtype;
        claim uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
 then raise exception 'FIRST178_SERVICE_ROLE_REQUIRED'; end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null
    or p_goal_transition_event_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' or
    p_preview_release_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'FIRST178_INVALID_OWNER_SCOPE'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality-goal-pub-v1:'||
   p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if not found or e.last_transition_event_id is distinct from p_goal_transition_event_id
 then raise exception 'FIRST178_GOAL_CHANGED'; end if;
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and
  conversation_id=p_conversation_id for update;
 if not found or q.phase <> 'QUEUED_DISCOVERY' or
    q.claimed_at is not null or q.worker_claim_id is not null or
    q.original_work_id<>p_original_work_id or q.goal_id<>p_goal_id or
    q.goal_transition_event_id<>p_goal_transition_event_id or
    q.preview_release_sha<>p_preview_release_sha or
    q.goal_revision<>e.revision or
    q.dispatch_commit_sha is not null or q.dispatched_at is not null
 then raise exception 'FIRST178_JOB_NOT_SINGLE_USE_ELIGIBLE'; end if;
 if not exists(select 1 from public.universe_events x
   where x.entity_type='personal_first_self_upgrade_customer_work'
   and x.event_kind='WORK'
   and x.continuity_root_id=q.continuity_root_id
   and x.worldline_id=q.worldline_id
   and x.payload->>'issue_number'='178'
   and x.payload->>'original_work_id'=q.original_work_id
   and x.payload->>'original_goal_id'=q.goal_id
   and x.payload->>'goal_transition_receipt_ref'=q.goal_transition_event_id::text
   and x.payload->>'installation_authorized'='false'
   and x.payload->>'original_job_completed'='false')
 then raise exception 'FIRST178_ORIGINAL_CONTINUITY_WORK_MISSING'; end if;
 claim := pg_catalog.gen_random_uuid();
 update reality_internal.governed_build_queue_v1
  set worker_claim_id=claim,worker_identity_ref='reality:preview:constitutional-driver:178',
      phase='RUNNING_CONSTITUTIONAL',claimed_at=pg_catalog.now(),
      updated_at=pg_catalog.now(),
      report=pg_catalog.jsonb_build_object(
        'claim_id',claim,'state','RUNNING_CONSTITUTIONAL',
        'original_work_id',p_original_work_id,
        'installation_authorized',false,'job_completed',false)
 where id=p_queue_id;
 return pg_catalog.jsonb_build_object('claimed',true,'claim_id',claim,
   'queue_id',p_queue_id,'original_work_id',p_original_work_id,
   'phase','RUNNING_CONSTITUTIONAL','installation_authorized',false,
   'job_completed',false);
end $$;
revoke all on function public.reality_claim_governed_build_178_v1(
 uuid,uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_claim_governed_build_178_v1(
 uuid,uuid,uuid,text,text,uuid,text) to service_role;

create or replace function public.reality_record_governed_build_178_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_claim_id uuid,p_original_work_id text,p_phase text,
 p_checkpoint_hash text,p_continuity_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare q reality_internal.governed_build_queue_v1%rowtype;
        e reality_internal.goal_publication_epochs%rowtype;
        event_found boolean;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
 then raise exception 'FIRST178_SERVICE_ROLE_REQUIRED'; end if;
 if p_phase not in ('AWAITING_OWNER_APPROVAL','ESCALATED','EXECUTION_UNRESOLVED')
   or p_claim_id is null or p_continuity_receipt_id is null or
   p_checkpoint_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'FIRST178_TERMINAL_RECEIPT_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality-goal-pub-v1:'||
   p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id
   and conversation_id=p_conversation_id for update;
 if not found or q.phase <> 'RUNNING_CONSTITUTIONAL' or
    q.worker_claim_id is distinct from p_claim_id or
    q.original_work_id<>p_original_work_id
 then raise exception 'FIRST178_CLAIM_NOT_ACTIVE'; end if;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if not found or q.goal_revision<>e.revision or
    q.goal_transition_event_id is distinct from e.last_transition_event_id
 then raise exception 'FIRST178_GOAL_CHANGED_BEFORE_RECEIPT'; end if;
 select exists(select 1 from public.universe_events x
   where x.event_id=p_continuity_receipt_id
     and x.entity_type='personal_first_178_constitutional_checkpoint'
     and x.continuity_root_id=q.continuity_root_id
     and x.worldline_id=q.worldline_id
     and x.payload->>'original_work_id'=p_original_work_id
     and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
     and x.payload->>'installation_authorized'='false'
     and x.payload->>'original_job_completed'='false'
     and x.payload->>'constitutional_phase'=case
       when p_phase='AWAITING_OWNER_APPROVAL' then p_phase
       when p_phase='ESCALATED' then p_phase
       else x.payload->>'constitutional_phase' end)
   into event_found;
 if not event_found then raise exception 'FIRST178_CONTINUITY_CHECKPOINT_UNVERIFIED';end if;
 update reality_internal.governed_build_queue_v1
  set phase=p_phase,updated_at=pg_catalog.now(),
      report=pg_catalog.jsonb_build_object(
        'claim_id',p_claim_id,'state',p_phase,
        'checkpoint_hash',p_checkpoint_hash,
        'checkpoint_receipt_id',p_continuity_receipt_id,
        'original_work_id',p_original_work_id,
        'installation_authorized',false,'job_completed',false)
  where id=p_queue_id;
 return pg_catalog.jsonb_build_object('recorded',true,
   'queue_id',p_queue_id,'phase',p_phase,
   'checkpoint_hash',p_checkpoint_hash,
   'checkpoint_receipt_id',p_continuity_receipt_id,
   'installation_authorized',false,'job_completed',false);
end $$;
revoke all on function public.reality_record_governed_build_178_v1(
 uuid,uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_record_governed_build_178_v1(
 uuid,uuid,uuid,uuid,text,text,text,uuid) to service_role;
