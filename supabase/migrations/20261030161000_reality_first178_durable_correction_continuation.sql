-- Durable, bounded model/sandbox correction continuation for original #178.
-- The EXISTING authenticated owner work/claim is the only execution authority.
-- This reserves a step ONLY after a fresh signed-in owner readback of the
-- ORIGINAL source-linked constitutional checkpoint. No installer permission.
create table if not exists reality_internal.first178_continuation_reservations_v1(
 queue_id uuid not null,
 checkpoint_receipt_id uuid not null,
 checkpoint_hash text not null check(checkpoint_hash ~ '^[a-f0-9]{64}$'),
 phase text not null check(phase in ('REPAIR_REQUIRED','CANDIDATE_READY')),
 attempt_count integer not null check(attempt_count between 1 and 3),
 reservation_id uuid not null default pg_catalog.gen_random_uuid(),
 created_at timestamptz not null default pg_catalog.now(),
 primary key(queue_id,checkpoint_receipt_id),
 unique(reservation_id)
);
revoke all on reality_internal.first178_continuation_reservations_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.first178_continuation_reservations_v1 to service_role;
create or replace function public.reality_reserve_first178_continuation_step_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_checkpoint_hash text,
 p_checkpoint_receipt_id uuid,p_phase text,p_attempt_count integer)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 latest public.universe_events%rowtype;
 reserved uuid;
 st jsonb;
begin
 if current_user<>'service_role' then
  raise exception 'FIRST178_CONTINUATION_SERVICE_ROLE_REQUIRED';end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null or
 p_checkpoint_receipt_id is null or
 p_original_work_id !~ '^work:[a-f0-9]{32}$' or
 p_checkpoint_hash !~ '^[a-f0-9]{64}$' or
 p_phase not in ('REPAIR_REQUIRED','CANDIDATE_READY') or
 p_attempt_count not between 1 and 3 then
  raise exception 'FIRST178_CONTINUATION_SCOPE_INVALID';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
 for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null or
 q.phase<>'RUNNING_CONSTITUTIONAL' or
 q.worker_claim_id is null or q.claimed_at is null or
 q.original_work_id<>p_original_work_id or
 q.goal_revision is distinct from e.revision or
 q.goal_transition_event_id is distinct from e.last_transition_event_id or
 q.dispatched_at is not null or q.dispatch_commit_sha is not null or
 q.report->>'state'<>'RUNNING_CONSTITUTIONAL' or
 q.report->>'claim_id'<>q.worker_claim_id::text or
 q.report ? 'installation_approval_reservation_id' then
  raise exception 'FIRST178_CONTINUATION_ORIGINAL_CLAIM_REQUIRED';end if;
 -- Reject stale checkpoints: only the exact LATEST source-linked journal
 -- may receive a continuation reservation.
 select * into latest from public.universe_events x
 where x.entity_type='personal_first_178_constitutional_checkpoint'
  and x.continuity_root_id=q.continuity_root_id
  and x.worldline_id=q.worldline_id
  and x.payload->>'original_work_id'=p_original_work_id
 order by x.assertion_time desc,x.event_id desc limit 1;
 st:=latest.payload->'driver_state';
 if latest.event_id is null or
 latest.event_id<>p_checkpoint_receipt_id or
 latest.payload->>'constitutional_phase'<>p_phase or
 latest.payload->>'constitutional_head_hash'<>p_checkpoint_hash or
 latest.payload->>'installation_authorized'<>'false' or
 latest.payload->>'original_job_completed'<>'false' or
 st->>'phase'<>p_phase or
 st->>'attempt_count'<>p_attempt_count::text or
 st->>'attempt_limit'<>'3' or
 st->'candidate'->>'installed'<>'false' or
 st->'candidate'->>'authorized'<>'false' or
 st->'promotion_authorization'<>'null'::jsonb or
 st->'registration'<>'null'::jsonb or
 st->'settlement'<>'null'::jsonb or
 st->'journal'->-1->>'kind'<>case when p_phase='REPAIR_REQUIRED'
 then 'SANDBOX_FAILED' else 'MODEL_CANDIDATE_PROPOSED' end or
 (p_phase='REPAIR_REQUIRED' and
   (p_attempt_count>=3 or
    st->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true')) or
 (p_phase='CANDIDATE_READY' and
   (p_attempt_count<2 or
    st->'journal'->-2->>'kind'<>'SANDBOX_FAILED'))
 then raise exception 'FIRST178_CONTINUATION_LATEST_CHECKPOINT_UNVERIFIED';end if;
 insert into reality_internal.first178_continuation_reservations_v1(
  queue_id,checkpoint_receipt_id,checkpoint_hash,phase,attempt_count)
 values(p_queue_id,p_checkpoint_receipt_id,p_checkpoint_hash,p_phase,p_attempt_count)
 returning reservation_id into reserved;
 return pg_catalog.jsonb_build_object('reserved_once',true,
  'reservation_id',reserved,'queue_id',p_queue_id,
  'original_work_id',p_original_work_id,
  'checkpoint_receipt_id',p_checkpoint_receipt_id,
  'checkpoint_hash',p_checkpoint_hash,'phase',p_phase,
  'attempt_count',p_attempt_count,
  'existing_claim_id',q.worker_claim_id,
  'installation_authorized',false,'job_completed',false);
end $fn$;
revoke all on function public.reality_reserve_first178_continuation_step_v1(
 uuid,uuid,uuid,text,text,uuid,text,integer)
 from public,anon,authenticated;
grant execute on function public.reality_reserve_first178_continuation_step_v1(
 uuid,uuid,uuid,text,text,uuid,text,integer) to service_role;