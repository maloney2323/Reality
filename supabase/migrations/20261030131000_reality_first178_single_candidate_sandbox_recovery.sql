-- Second and final repair lane for owner original #178:
-- sandbox-only reattestation of exact MODEL_CANDIDATE_PROPOSED bytes.
-- One reservation, no new model generation, no claim reset, no owner approval.
create or replace function public.reality_reserve_first178_candidate_sandbox_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_checkpoint_hash text,
 p_candidate_hash text,p_continuity_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 marker uuid;
begin
 if current_user<>'service_role'
  then raise exception 'FIRST178_SANDBOX_RECOVERY_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null
    or p_continuity_receipt_id is null
    or p_original_work_id !~ '^work:[a-f0-9]{32}$'
    or p_checkpoint_hash !~ '^[a-f0-9]{64}$'
    or p_candidate_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'FIRST178_SANDBOX_RECOVERY_SCOPE_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality-goal-pub-v1:'||
    p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id
  and conversation_id=p_conversation_id for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if not found or q.phase<>'RUNNING_CONSTITUTIONAL'
  or q.worker_claim_id is null or q.claimed_at is null
  or q.original_work_id<>p_original_work_id
  or q.goal_revision is distinct from e.revision
  or q.goal_transition_event_id is distinct from e.last_transition_event_id
  or q.dispatch_commit_sha is not null or q.dispatched_at is not null
  or q.report->>'state'<>'RUNNING_CONSTITUTIONAL'
  or q.report->>'claim_id'<>q.worker_claim_id::text
  or q.report->>'recovery_kind'<>'CONTINUE_UNACCEPTED_MODEL_CANDIDATE_ONCE'
  or q.report->>'recovery_reservation_id' is null
  or q.report ? 'candidate_sandbox_reservation_id'
  or q.updated_at>pg_catalog.now()-interval '30 seconds'
 then raise exception 'FIRST178_SANDBOX_RECOVERY_NOT_ELIGIBLE';end if;
 if (select count(*) from public.universe_events x
    where x.entity_type='personal_first_178_constitutional_checkpoint'
      and x.continuity_root_id=q.continuity_root_id
      and x.worldline_id=q.worldline_id
      and x.payload->>'original_work_id'=p_original_work_id)<>2
 then raise exception 'FIRST178_SANDBOX_EXPECTED_TWO_JOURNAL_STAGES';end if;
 if not exists(select 1 from public.universe_events x
   where x.event_id=p_continuity_receipt_id
     and x.entity_type='personal_first_178_constitutional_checkpoint'
     and x.continuity_root_id=q.continuity_root_id
     and x.worldline_id=q.worldline_id
     and x.payload->>'original_work_id'=p_original_work_id
     and x.payload->>'constitutional_phase'='CANDIDATE_READY'
     and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
     and x.payload->>'installation_authorized'='false'
     and x.payload->>'original_job_completed'='false'
     and x.payload->'driver_state'->>'attempt_count'='1'
     and x.payload->'driver_state'->>'phase'='CANDIDATE_READY'
     and x.payload->'driver_state'->'candidate'->>'artifact_hash'=p_candidate_hash
     and x.payload->'driver_state'->'candidate'->>'generated_by_model'='true'
     and x.payload->'driver_state'->'candidate'->>'installed'='false'
     and x.payload->'driver_state'->'candidate'->>'authorized'='false'
     and x.payload->'driver_state'->'sandbox_receipt'='null'::jsonb
     and pg_catalog.jsonb_array_length(x.payload->'driver_state'->'journal')=2
     and x.payload->'driver_state'->'journal'->1->>'kind'='MODEL_CANDIDATE_PROPOSED'
     and x.payload->'driver_state'->'journal'->1->'body'->>'artifact_hash'=p_candidate_hash
 ) then raise exception 'FIRST178_SANDBOX_CANDIDATE_BYTES_NOT_VERIFIED';end if;
 marker:=pg_catalog.gen_random_uuid();
 update reality_internal.governed_build_queue_v1
  set report=report||pg_catalog.jsonb_build_object(
    'candidate_sandbox_reservation_id',marker,
    'candidate_sandbox_source_checkpoint',p_continuity_receipt_id,
    'candidate_sandbox_source_hash',p_checkpoint_hash,
    'candidate_sandbox_artifact_hash',p_candidate_hash,
    'candidate_sandbox_kind','REVERIFY_SAME_MODEL_CANDIDATE_ONCE',
    'installation_authorized',false,'job_completed',false),
   updated_at=pg_catalog.now()
 where id=q.id;
 return pg_catalog.jsonb_build_object(
  'recovery_reserved',true,'sandbox_reservation_id',marker,
  'queue_id',q.id,'claim_id',q.worker_claim_id,
  'original_work_id',p_original_work_id,
  'continuity_receipt_id',p_continuity_receipt_id,
  'checkpoint_hash',p_checkpoint_hash,
  'candidate_hash',p_candidate_hash,
  'installation_authorized',false,'job_completed',false);
end $fn$;
revoke all on function public.reality_reserve_first178_candidate_sandbox_v1(
 uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_reserve_first178_candidate_sandbox_v1(
 uuid,uuid,uuid,text,text,text,uuid) to service_role;