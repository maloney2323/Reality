-- Single-use internal dispatch of EXISTING owner-approved original #178.
-- The invocation receives a short-lived nonce. Only the service role may call.
-- No public/owner/LLM elevation. No installation or final acceptance.
create unique index if not exists first178_background_handoff_one_per_original_queue_v1
 on reality_internal.first178_background_handoffs_v1(queue_id);

create or replace function public.reality_mint_first178_background_handoff_v1()
returns jsonb language plpgsql security invoker set search_path='' as $body$
declare
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 cp public.universe_events%rowtype;
 state jsonb;
 nonce text;
 hashed text;
begin
 if current_user<>'service_role' then
  raise exception 'FIRST178_DISPATCH_SERVICE_ROLE_ONLY';
 end if;
 -- There is exactly ONE source work ID. Never accept work, owner, goal,
 -- queue ID or target environment from the webhook caller.
 select * into q from reality_internal.governed_build_queue_v1
 where original_work_id='work:9b9578b3c65427589c4c6da68fe0fc87'
 for update;
 if q.id is null or q.phase<>'ESCALATED' or
    q.worker_claim_id is null or q.claimed_at is null or
    q.dispatched_at is not null or q.dispatch_commit_sha is not null or
    q.report->>'state'<>'ESCALATED' or
    q.report->>'claim_id'<>q.worker_claim_id::text or
    q.report->>'installation_authorized'<>'false' or
    q.report->>'job_completed'<>'false' or
    q.report ? 'installation_approval_reservation_id' or
    exists(select 1 from reality_internal.first178_final_draft_recovery_reservations_v1
       where queue_id=q.id) or
    exists(select 1 from reality_internal.first178_background_handoffs_v1
       where queue_id=q.id)
 then raise exception 'FIRST178_DISPATCH_ONLY_UNEXECUTED_EXACT_ORIGINAL';end if;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 if e.user_id is null or q.goal_revision is distinct from e.revision or
    q.goal_transition_event_id is distinct from e.last_transition_event_id then
  raise exception 'FIRST178_DISPATCH_ORIGINAL_GOAL_CHANGED';
 end if;
 select * into cp from public.universe_events x
  where x.entity_type='personal_first_178_constitutional_checkpoint'
  and x.continuity_root_id=q.continuity_root_id
  and x.worldline_id=q.worldline_id
  and x.payload->>'original_work_id'=q.original_work_id
 order by x.assertion_time desc,x.event_id desc limit 1;
 state=cp.payload->'driver_state';
 if cp.event_id is null or
    cp.event_id::text<>q.report->>'checkpoint_receipt_id' or
    cp.payload->>'constitutional_head_hash'<>q.report->>'checkpoint_hash' or
    cp.payload->>'constitutional_phase'<>'ESCALATED' or
    cp.payload->>'installation_authorized'<>'false' or
    cp.payload->>'original_job_completed'<>'false' or
    state->>'phase'<>'ESCALATED' or
    state->>'attempt_count'<>'7' or state->>'attempt_limit'<>'7' or
    state->'recovery_continuation_authorization'->>'verified'<>'true' or
    state->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true' or
    state->'journal'->-1->>'kind'<>'SANDBOX_FAILED' or
    state->'promotion_authorization'<>'null'::jsonb or
    state->'registration'<>'null'::jsonb or
    state->'resumption'<>'null'::jsonb or
    state->'settlement'<>'null'::jsonb then
  raise exception 'FIRST178_DISPATCH_CHECKPOINT_NOT_ELIGIBLE';
 end if;
 -- UUID v4 randomness is generated in the database; nonce is never written
 -- in plaintext. Any duplicate invocation fails on the queue uniqueness.
 nonce=replace(pg_catalog.gen_random_uuid()::text,'-','')||
       replace(pg_catalog.gen_random_uuid()::text,'-','');
 hashed=pg_catalog.encode(extensions.digest(nonce,'sha256'),'hex');
 insert into reality_internal.first178_background_handoffs_v1(
  token_hash,original_work_id,queue_id,owner_id,conversation_id,expires_at)
 values(hashed,q.original_work_id,q.id,q.owner_id,q.conversation_id,
        pg_catalog.now()+interval '5 minutes');
 return pg_catalog.jsonb_build_object(
  'minted_once',true,'nonce',nonce,'queue_id',q.id,
  'original_work_id',q.original_work_id,
  'checkpoint_receipt_id',cp.event_id,'installation_authorized',false);
end;
$body$;
revoke all on function public.reality_mint_first178_background_handoff_v1()
 from public,anon,authenticated;
grant execute on function public.reality_mint_first178_background_handoff_v1()
 to service_role;
