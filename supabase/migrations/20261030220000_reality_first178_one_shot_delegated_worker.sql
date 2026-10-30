-- One-shot, strictly scoped delegation for the ORIGINAL authorized customer #178.
-- No user cookies, no broad worker authority, no capability installation.
create table if not exists reality_internal.first178_background_handoffs_v1(
  token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
  original_work_id text not null check(original_work_id='work:9b9578b3c65427589c4c6da68fe0fc87'),
  queue_id uuid not null,
  owner_id uuid not null,
  conversation_id uuid not null,
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  dispatch_request_id bigint unique
);
revoke all on reality_internal.first178_background_handoffs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.first178_background_handoffs_v1 to service_role;
create or replace function public.reality_consume_first178_background_handoff_v1(p_nonce text)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare
 h reality_internal.first178_background_handoffs_v1%rowtype;
 q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 cp public.universe_events%rowtype;
 st jsonb;
begin
 if current_user<>'service_role' then raise exception 'BACKGROUND_HANDOFF_SERVICE_ROLE_REQUIRED';end if;
 if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then
  raise exception 'BACKGROUND_HANDOFF_TOKEN_FORMAT_REQUIRED';end if;
 select * into h from reality_internal.first178_background_handoffs_v1
 where token_hash=pg_catalog.encode(extensions.digest(p_nonce,'sha256'),'hex')
 for update;
 if h.token_hash is null or h.consumed_at is not null or
    h.expires_at <= pg_catalog.now() or
    h.original_work_id<>'work:9b9578b3c65427589c4c6da68fe0fc87' then
  raise exception 'BACKGROUND_HANDOFF_NOT_LIVE';end if;
 select * into q from reality_internal.governed_build_queue_v1
 where id=h.queue_id and owner_id=h.owner_id and
 conversation_id=h.conversation_id and original_work_id=h.original_work_id for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=h.owner_id and conversation_id=h.conversation_id for update;
 if q.id is null or e.user_id is null or
    q.phase<>'ESCALATED' or q.worker_claim_id is null or
    q.claimed_at is null or q.dispatched_at is not null or
    q.dispatch_commit_sha is not null or
    q.goal_revision is distinct from e.revision or
    q.goal_transition_event_id is distinct from e.last_transition_event_id or
    q.report->>'claim_id'<>q.worker_claim_id::text or
    q.report->>'state'<>'ESCALATED' or
    q.report->>'installation_authorized'<>'false' or
    q.report->>'job_completed'<>'false' or
    q.report ? 'installation_approval_reservation_id' then
  raise exception 'BACKGROUND_HANDOFF_ORIGINAL_OWNER_JOB_NOT_APPROVED';end if;
 select * into cp from public.universe_events x
 where x.entity_type='personal_first_178_constitutional_checkpoint'
 and x.continuity_root_id=q.continuity_root_id
 and x.worldline_id=q.worldline_id
 and x.payload->>'original_work_id'=h.original_work_id
 order by x.assertion_time desc,x.event_id desc limit 1;
 st=cp.payload->'driver_state';
 if cp.event_id is null or
   cp.event_id::text<>q.report->>'checkpoint_receipt_id' or
   cp.payload->>'constitutional_head_hash'<>q.report->>'checkpoint_hash' or
   cp.payload->>'constitutional_phase'<>'ESCALATED' or
   cp.payload->>'installation_authorized'<>'false' or
   cp.payload->>'original_job_completed'<>'false' or
   st->>'phase'<>'ESCALATED' or
   st->>'attempt_count'<>'7' or st->>'attempt_limit'<>'7' or
   st->'journal'->-1->>'kind'<>'SANDBOX_FAILED' or
   st->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true' or
   st->'recovery_authorization'->>'verified'<>'true' or
   st->'recovery_continuation_authorization'->>'verified'<>'true' or
   st->'promotion_authorization'<>'null'::jsonb or
   st->'registration'<>'null'::jsonb or
   st->'settlement'<>'null'::jsonb or
   not exists (select 1 from reality_internal.first178_second_exhaustion_recovery_reservations_v1
    where queue_id=q.id and original_work_id=q.original_work_id) then
  raise exception 'BACKGROUND_HANDOFF_INDEPENDENT_CHECKPOINT_MISMATCH';end if;
 update reality_internal.first178_background_handoffs_v1
 set consumed_at=pg_catalog.now() where token_hash=h.token_hash;
 return pg_catalog.jsonb_build_object(
  'verified',true,'delegation','EXISTING_OWNER_AUTHORIZED_ORIGINAL_JOB',
  'owner_id',h.owner_id,'conversation_id',h.conversation_id,
  'original_work_id',h.original_work_id,'queue_id',h.queue_id,
  'checkpoint_receipt_id',cp.event_id,'installation_authorized',false,
  'production_changed',false);
end;$function$;
revoke all on function public.reality_consume_first178_background_handoff_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_consume_first178_background_handoff_v1(text) to service_role;
