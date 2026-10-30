-- Isolated preview: atomic one-time recovery of a validated original #178 escalation.
create table if not exists reality_internal.first178_exhaustion_recovery_reservations_v1 (
 queue_id uuid primary key,
 original_work_id text not null check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 failed_checkpoint_receipt_id uuid not null,
 failed_checkpoint_hash text not null check(failed_checkpoint_hash ~ '^[a-f0-9]{64}$'),
 failure_evidence_ref text not null,
 reservation_id uuid not null unique default pg_catalog.gen_random_uuid(),
 created_at timestamptz not null default pg_catalog.now()
);
revoke all on reality_internal.first178_exhaustion_recovery_reservations_v1 from public,anon,authenticated;
grant select,insert on reality_internal.first178_exhaustion_recovery_reservations_v1 to service_role;
create or replace function public.reality_reserve_first178_exhaustion_recovery_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,p_original_work_id text,
 p_checkpoint_hash text,p_checkpoint_receipt_id uuid,p_failure_evidence_ref text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 cp public.universe_events%rowtype;
 st jsonb; rid uuid;
begin
 if current_user<>'service_role' then raise exception 'FIRST178_RECOVERY_SERVICE_ROLE_REQUIRED'; end if;
 if p_owner_id is null or p_conversation_id is null or p_queue_id is null or
 p_checkpoint_receipt_id is null or p_original_work_id !~ '^work:[a-f0-9]{32}$' or
 p_checkpoint_hash !~ '^[a-f0-9]{64}$' or pg_catalog.length(p_failure_evidence_ref)<16
 then raise exception 'FIRST178_RECOVERY_ARGUMENTS_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
 'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null or q.phase<>'ESCALATED' or
 q.worker_claim_id is null or q.claimed_at is null or q.original_work_id<>p_original_work_id or
 q.goal_revision is distinct from e.revision or
 q.goal_transition_event_id is distinct from e.last_transition_event_id or
 q.dispatched_at is not null or q.dispatch_commit_sha is not null or
 q.report->>'state'<>'ESCALATED' or q.report->>'claim_id'<>q.worker_claim_id::text or
 q.report->>'checkpoint_hash'<>p_checkpoint_hash or
 q.report->>'checkpoint_receipt_id'<>p_checkpoint_receipt_id::text or
 q.report->>'installation_authorized'<>'false' or q.report->>'job_completed'<>'false' or
 q.report ? 'installation_approval_reservation_id'
 then raise exception 'FIRST178_RECOVERY_ORIGINAL_CLAIM_REQUIRED'; end if;
 select * into cp from public.universe_events x
 where x.entity_type='personal_first_178_constitutional_checkpoint'
 and x.continuity_root_id=q.continuity_root_id and x.worldline_id=q.worldline_id
 and x.payload->>'original_work_id'=p_original_work_id
 order by x.assertion_time desc,x.event_id desc limit 1;
 st:=cp.payload->'driver_state';
 if cp.event_id is null or cp.event_id<>p_checkpoint_receipt_id or
 cp.payload->>'constitutional_phase'<>'ESCALATED' or
 cp.payload->>'constitutional_head_hash'<>p_checkpoint_hash or
 cp.payload->>'installation_authorized'<>'false' or
 cp.payload->>'original_job_completed'<>'false' or
 st->>'phase'<>'ESCALATED' or st->>'attempt_count'<>'3' or
 st->>'attempt_limit'<>'3' or
 st->'journal'->-1->>'kind'<>'SANDBOX_FAILED' or
 st->'journal'->-1->>'evidence_ref'<>p_failure_evidence_ref or
 st->'independent_failure'->>'evidence_ref'<>p_failure_evidence_ref or
 st->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true' or
 st->'promotion_authorization'<>'null'::jsonb or
 st->'registration'<>'null'::jsonb or st->'settlement'<>'null'::jsonb or
 st ? 'recovery_authorization'
 then raise exception 'FIRST178_RECOVERY_INDEPENDENT_FAILURE_REQUIRED'; end if;
 insert into reality_internal.first178_exhaustion_recovery_reservations_v1(
 queue_id,original_work_id,failed_checkpoint_receipt_id,failed_checkpoint_hash,failure_evidence_ref)
 values(p_queue_id,p_original_work_id,p_checkpoint_receipt_id,p_checkpoint_hash,p_failure_evidence_ref)
 returning reservation_id into rid;
 update reality_internal.governed_build_queue_v1
 set phase='RUNNING_CONSTITUTIONAL',updated_at=pg_catalog.now(),
 report=q.report||pg_catalog.jsonb_build_object(
 'state','RUNNING_CONSTITUTIONAL','recovery_reservation_id',rid,
 'recovery_source_checkpoint_hash',p_checkpoint_hash,'recovery_attempt_limit',5)
 where id=p_queue_id;
 return pg_catalog.jsonb_build_object('reserved_once',true,'reservation_id',rid,
 'existing_claim_id',q.worker_claim_id,'queue_id',p_queue_id,
 'original_work_id',p_original_work_id,'checkpoint_receipt_id',p_checkpoint_receipt_id,
 'checkpoint_hash',p_checkpoint_hash,'failure_evidence_ref',p_failure_evidence_ref,
 'recovery_attempt_limit',5,'installation_authorized',false);
end;$fn$;
revoke all on function public.reality_reserve_first178_exhaustion_recovery_v1(
 uuid,uuid,uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_reserve_first178_exhaustion_recovery_v1(
 uuid,uuid,uuid,text,text,uuid,text) to service_role;