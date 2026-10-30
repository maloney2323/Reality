-- Recover an already claimed original #178 only if one intact
-- constitutional GAP_CONFIRMED checkpoint is independently durable and
-- no candidate was accepted. One atomic recovery lease per original claim.
-- Never reset the claim or create a new work item.
create or replace function public.reality_reserve_first178_gap_recovery_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_checkpoint_hash text,
 p_continuity_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 marker uuid;
begin
 if current_user<>'service_role'
 then raise exception 'FIRST178_RECOVERY_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_conversation_id is null or
    p_queue_id is null or p_continuity_receipt_id is null or
    p_original_work_id !~ '^work:[a-f0-9]{32}$' or
    p_checkpoint_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'FIRST178_RECOVERY_SCOPE_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id
  and conversation_id=p_conversation_id for update;
 if not found or q.phase<>'RUNNING_CONSTITUTIONAL' or
    q.worker_claim_id is null or q.claimed_at is null or
    q.original_work_id<>p_original_work_id or
    q.goal_revision is distinct from e.revision or
    q.goal_transition_event_id is distinct from e.last_transition_event_id or
    q.dispatched_at is not null or q.dispatch_commit_sha is not null or
    q.report->>'state'<>'RUNNING_CONSTITUTIONAL' or
    q.report->>'claim_id'<>q.worker_claim_id::text or
    q.report ? 'recovery_reservation_id' or
    q.report ? 'recovery_completed' or
    q.claimed_at>pg_catalog.now()-interval '45 seconds'
 then raise exception 'FIRST178_RECOVERY_NOT_EXACTLY_ELIGIBLE';end if;
 if (select count(*) from public.universe_events x
   where x.entity_type='personal_first_178_constitutional_checkpoint'
    and x.continuity_root_id=q.continuity_root_id
    and x.worldline_id=q.worldline_id
    and x.payload->>'original_work_id'=p_original_work_id
 )<>1 then
    raise exception 'FIRST178_RECOVERY_ONLY_ONE_CHECKPOINT_ALLOWED';end if;
 if not exists(select 1 from public.universe_events x
   where x.event_id=p_continuity_receipt_id
    and x.entity_type='personal_first_178_constitutional_checkpoint'
    and x.continuity_root_id=q.continuity_root_id
    and x.worldline_id=q.worldline_id
    and x.payload->>'original_work_id'=p_original_work_id
    and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
    and x.payload->>'constitutional_phase'='GAP_CONFIRMED'
    and x.payload->>'installation_authorized'='false'
    and x.payload->>'original_job_completed'='false'
    and x.payload->'driver_state'->>'attempt_count'='0'
    and x.payload->'driver_state'->>'phase'='GAP_CONFIRMED'
    and pg_catalog.jsonb_array_length(x.payload->'driver_state'->'journal')=1
    and x.payload->'driver_state'->'candidate'='null'::jsonb
 ) then raise exception 'FIRST178_RECOVERY_VERIFIED_GAP_NOT_FOUND'; end if;
 marker:=pg_catalog.gen_random_uuid();
 update reality_internal.governed_build_queue_v1
  set report=report||pg_catalog.jsonb_build_object(
   'recovery_reservation_id',marker,
   'recovery_source_checkpoint',p_continuity_receipt_id,
   'recovery_source_hash',p_checkpoint_hash,
   'recovery_kind','CONTINUE_UNACCEPTED_MODEL_CANDIDATE_ONCE',
   'installation_authorized',false,
   'job_completed',false),
   updated_at=pg_catalog.now()
 where id=p_queue_id;
 return pg_catalog.jsonb_build_object(
  'recovery_reserved',true,'recovery_reservation_id',marker,
  'queue_id',p_queue_id,'claim_id',q.worker_claim_id,
  'original_work_id',p_original_work_id,
  'continuity_receipt_id',p_continuity_receipt_id,
  'checkpoint_hash',p_checkpoint_hash,
  'installation_authorized',false,'job_completed',false);
end $fn$;
revoke all on function public.reality_reserve_first178_gap_recovery_v1(
 uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_reserve_first178_gap_recovery_v1(
 uuid,uuid,uuid,text,text,uuid) to service_role;