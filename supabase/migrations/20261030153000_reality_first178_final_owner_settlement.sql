-- Final original #178 SETTLED is a derived status ONLY after the
-- authenticated original owner's Continuity journal contains independent
-- provider-authenticated register -> original execution -> settlement receipts.
-- Existing queue remains sole job authority, no second tracker.
alter table reality_internal.governed_build_queue_v1
 drop constraint governed_build_queue_v1_phase_check;
alter table reality_internal.governed_build_queue_v1
 add constraint governed_build_queue_v1_phase_check check (
 phase=any(array[
 'QUEUED_DISCOVERY','CLAIMED_DISCOVERY','BLOCKED_MISSING_EVIDENCE',
 'BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED','AWAITING_SANDBOX',
 'SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL','FAILED','CANCELLED',
 'RUNNING_CONSTITUTIONAL','ESCALATED','EXECUTION_UNRESOLVED','SETTLED'
 ]));
create or replace function public.reality_settle_first178_exact_owner_work_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_candidate_hash text,
 p_checkpoint_hash text,p_continuity_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 receipt public.universe_events%rowtype;
begin
 if current_user<>'service_role'
 then raise exception 'FIRST178_SETTLEMENT_SERVICE_ROLE_ONLY';end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null
 or p_continuity_receipt_id is null
 or p_original_work_id !~ '^work:[a-f0-9]{32}$'
 or p_candidate_hash !~ '^[a-f0-9]{64}$'
 or p_checkpoint_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'FIRST178_SETTLEMENT_SCOPE_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
 for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null or
 q.phase not in ('AWAITING_OWNER_APPROVAL','SETTLED')
 or q.original_work_id<>p_original_work_id
 or q.goal_revision is distinct from e.revision
 or q.goal_transition_event_id is distinct from e.last_transition_event_id
 or q.report->>'installation_approval_candidate_hash'<>p_candidate_hash
 or q.report->>'installation_approval_origin'<>'AUTHENTICATED_OWNER_EXPLICIT_ACTION'
 or q.report->>'installation_approval_target'<>'ISOLATED_PREVIEW'
 or q.report->>'installation_approval_reservation_id' is null
 then raise exception 'FIRST178_SETTLEMENT_APPROVED_ORIGINAL_SCOPE_MISSING';end if;
 select * into receipt from public.universe_events x
 where x.event_id=p_continuity_receipt_id
  and x.entity_type='personal_first_178_constitutional_checkpoint'
  and x.continuity_root_id=q.continuity_root_id
  and x.worldline_id=q.worldline_id
  and x.payload->>'original_work_id'=p_original_work_id
  and x.payload->>'constitutional_head_hash'=p_checkpoint_hash
  and x.payload->>'constitutional_phase'='SETTLED'
  and x.payload->>'installation_authorized'='true'
  and x.payload->>'original_job_completed'='true'
  and x.payload->'driver_state'->>'phase'='SETTLED'
  and x.payload->'driver_state'->'candidate'->>'artifact_hash'=p_candidate_hash
  and x.payload->'driver_state'->'promotion_authorization'->>'consumed_once'='true'
  and x.payload->'driver_state'->'registration'->>'status'='ACTIVE'
  and x.payload->'driver_state'->'resumption'->>'real_execution_observed'='true'
  and x.payload->'driver_state'->'settlement'->>'durable_settlement_readback'='true'
  and x.payload->'driver_state'->'settlement'->>'independent_outcome_verified'='true'
  and x.payload->'driver_state'->'journal'->-1->>'kind'='ORIGINAL_JOB_SETTLED';
 if receipt.event_id is null
 then raise exception 'FIRST178_SETTLEMENT_INDEPENDENT_CONTINUITY_RECEIPT_MISSING';end if;
 if q.phase='SETTLED' then
  if q.report->>'checkpoint_hash'<>p_checkpoint_hash or
   q.report->>'checkpoint_receipt_id'<>p_continuity_receipt_id::text
  then raise exception 'FIRST178_SETTLEMENT_CONFLICT';end if;
  return pg_catalog.jsonb_build_object('settled',true,'readback_verified',true,
   'queue_id',q.id,'original_work_id',p_original_work_id,
   'checkpoint_receipt_id',p_continuity_receipt_id,'checkpoint_hash',p_checkpoint_hash,
   'original_job_completed',true);
 end if;
 update reality_internal.governed_build_queue_v1 set phase='SETTLED',
  report=q.report||pg_catalog.jsonb_build_object(
   'state','SETTLED','checkpoint_hash',p_checkpoint_hash,
   'checkpoint_receipt_id',p_continuity_receipt_id,
   'original_work_id',p_original_work_id,
   'installation_authorized',true,'job_completed',true,
   'settlement_receipt_ref',receipt.payload->'driver_state'->'settlement'->>'settlement_receipt_ref',
   'executor_run_ref',receipt.payload->'driver_state'->'resumption'->>'executor_run_ref',
   'registry_receipt_ref',receipt.payload->'driver_state'->'registration'->>'registry_receipt_ref'),
  updated_at=pg_catalog.now() where id=q.id;
 return pg_catalog.jsonb_build_object('settled',true,'readback_verified',true,
  'queue_id',q.id,'original_work_id',p_original_work_id,
  'checkpoint_receipt_id',p_continuity_receipt_id,'checkpoint_hash',p_checkpoint_hash,
  'original_job_completed',true);
end $fn$;
revoke all on function public.reality_settle_first178_exact_owner_work_v1(
 uuid,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reality_settle_first178_exact_owner_work_v1(
 uuid,uuid,uuid,text,text,text,uuid) to service_role;