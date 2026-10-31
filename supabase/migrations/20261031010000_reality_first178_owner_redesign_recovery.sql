-- Original #178 8/8 -> 9/9 redesign. One explicit original owner authorization.
-- Existing historical failed checkpoints and authorization grants are immutable.
create table if not exists reality_internal.first178_owner_redesign_recovery_v1(
 queue_id uuid primary key,
 owner_id uuid not null,
 conversation_id uuid not null,
 original_work_id text not null check(original_work_id='work:9b9578b3c65427589c4c6da68fe0fc87'),
 reservation_id uuid not null unique default gen_random_uuid(),
 failed_checkpoint_receipt_id uuid not null,
 failed_checkpoint_hash text not null check(failed_checkpoint_hash ~ '^[a-f0-9]{64}$'),
 failure_evidence_ref text not null,
 consent_origin text not null check(consent_origin='AUTHENTICATED_OWNER_EXPLICIT_ACTION'),
 created_at timestamptz not null default now()
);
revoke all on reality_internal.first178_owner_redesign_recovery_v1 from public,anon,authenticated;
grant select,insert on reality_internal.first178_owner_redesign_recovery_v1 to service_role;

create or replace function public.reality_authorize_first178_one_redesign_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,
 p_original_work_id text,p_checkpoint_hash text,p_checkpoint_receipt_id uuid,
 p_failure_evidence_ref text,p_owner_confirms_one_attempt boolean)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.governed_build_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 cp public.universe_events%rowtype; st jsonb; rid uuid;
begin
 if current_user<>'service_role' then
  raise exception 'FIRST178_REDESIGN_SERVICE_ROLE_ONLY';end if;
 if p_owner_confirms_one_attempt is distinct from true or
  p_owner_id is null or p_conversation_id is null or p_queue_id is null or
  p_checkpoint_receipt_id is null or
  p_original_work_id<>'work:9b9578b3c65427589c4c6da68fe0fc87' or
  p_checkpoint_hash !~ '^[a-f0-9]{64}$' or
  length(p_failure_evidence_ref)<16 then
  raise exception 'FIRST178_REDESIGN_EXPLICIT_OWNER_INTENT_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into q from reality_internal.governed_build_queue_v1
 where id=p_queue_id and owner_id=p_owner_id and conversation_id=p_conversation_id
 for update;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if q.id is null or e.user_id is null or q.phase<>'ESCALATED' or
    q.original_work_id<>p_original_work_id or
    q.goal_revision is distinct from e.revision or
    q.goal_transition_event_id is distinct from e.last_transition_event_id or
    q.worker_claim_id is null or q.claimed_at is null or
    q.dispatched_at is not null or q.dispatch_commit_sha is not null or
    q.report->>'state'<>'ESCALATED' or
    q.report->>'claim_id'<>q.worker_claim_id::text or
    q.report->>'checkpoint_hash'<>p_checkpoint_hash or
    q.report->>'checkpoint_receipt_id'<>p_checkpoint_receipt_id::text or
    q.report->>'installation_authorized'<>'false' or
    q.report->>'job_completed'<>'false' or
    q.report ? 'installation_approval_reservation_id' or
    exists(select 1 from reality_internal.first178_owner_redesign_recovery_v1
      where queue_id=q.id) then
  raise exception 'FIRST178_REDESIGN_ALREADY_CONSUMED_OR_SCOPE_CHANGED';end if;
 select * into cp from public.universe_events x
 where x.entity_type='personal_first_178_constitutional_checkpoint'
  and x.continuity_root_id=q.continuity_root_id
  and x.worldline_id=q.worldline_id
  and x.payload->>'original_work_id'=p_original_work_id
 order by x.assertion_time desc,x.event_id desc limit 1;
 st:=cp.payload->'driver_state';
 if cp.event_id is null or cp.event_id<>p_checkpoint_receipt_id or
   cp.payload->>'constitutional_head_hash'<>p_checkpoint_hash or
   cp.payload->>'constitutional_phase'<>'ESCALATED' or
   cp.payload->>'installation_authorized'<>'false' or
   cp.payload->>'original_job_completed'<>'false' or
   st->>'phase'<>'ESCALATED' or
   st->>'attempt_count'<>'8' or st->>'attempt_limit'<>'8' or
   st->'journal'->-1->>'kind'<>'SANDBOX_FAILED' or
   st->'independent_failure'->>'evidence_ref'<>p_failure_evidence_ref or
   st->'journal'->-1->>'evidence_ref'<>p_failure_evidence_ref or
   st->'independent_failure'->'classification'->>'class'<>'REGRESSION' or
   st->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true' or
   st->'recovery_authorization'->>'verified'<>'true' or
   st->'recovery_continuation_authorization'->>'verified'<>'true' or
   st->'recovery_final_authorization'->>'verified'<>'true' or
   st->'recovery_redesign_authorization'<>'null'::jsonb or
   st->'promotion_authorization'<>'null'::jsonb or
   st->'registration'<>'null'::jsonb or
   st->'resumption'<>'null'::jsonb or st->'settlement'<>'null'::jsonb then
  raise exception 'FIRST178_REDESIGN_INDEPENDENT_8_OF_8_NOT_VERIFIED';end if;
 insert into reality_internal.first178_owner_redesign_recovery_v1(
  queue_id,owner_id,conversation_id,original_work_id,
  failed_checkpoint_receipt_id,failed_checkpoint_hash,
  failure_evidence_ref,consent_origin)
 values(q.id,p_owner_id,p_conversation_id,p_original_work_id,
  p_checkpoint_receipt_id,p_checkpoint_hash,p_failure_evidence_ref,
  'AUTHENTICATED_OWNER_EXPLICIT_ACTION')
 returning reservation_id into rid;
 update reality_internal.governed_build_queue_v1
 set phase='RUNNING_CONSTITUTIONAL',updated_at=now(),
 report=q.report||pg_catalog.jsonb_build_object(
  'state','RUNNING_CONSTITUTIONAL','redesign_recovery_reservation_id',rid,
  'redesign_recovery_owner_consent','AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  'recovery_attempt_limit',9)
 where id=q.id;
 return pg_catalog.jsonb_build_object('reserved_once',true,
  'reservation_id',rid,'queue_id',q.id,'original_work_id',p_original_work_id,
  'checkpoint_receipt_id',p_checkpoint_receipt_id,
  'checkpoint_hash',p_checkpoint_hash,
  'failure_evidence_ref',p_failure_evidence_ref,
  'existing_claim_id',q.worker_claim_id,'recovery_attempt_limit',9,
  'owner_confirmed',true,
  'authorization_scope','ONE_ORIGINAL178_REDESIGN_ATTEMPT',
  'installation_authorized',false,'job_completed',false);
end;$fn$;

create or replace function public.reality_read_first178_one_redesign_v1(
 p_owner_id uuid,p_conversation_id uuid,p_queue_id uuid,p_original_work_id text)
returns jsonb language sql security invoker set search_path='' as $fn$
 select coalesce((
  select pg_catalog.jsonb_build_object(
   'reserved_once',true,'reservation_id',rec.reservation_id,
   'queue_id',q.id,'original_work_id',q.original_work_id,
   'checkpoint_receipt_id',rec.failed_checkpoint_receipt_id,
   'checkpoint_hash',rec.failed_checkpoint_hash,
   'failure_evidence_ref',rec.failure_evidence_ref,
   'existing_claim_id',q.worker_claim_id,'recovery_attempt_limit',9,
   'owner_confirmed',true,
   'authorization_scope','ONE_ORIGINAL178_REDESIGN_ATTEMPT',
   'installation_authorized',false,'job_completed',false)
  from reality_internal.first178_owner_redesign_recovery_v1 rec
  join reality_internal.governed_build_queue_v1 q on q.id=rec.queue_id
  where current_user='service_role' and q.id=p_queue_id
   and q.owner_id=p_owner_id and q.conversation_id=p_conversation_id
   and q.original_work_id=p_original_work_id
   and rec.owner_id=p_owner_id and rec.conversation_id=p_conversation_id
   and q.phase='RUNNING_CONSTITUTIONAL'
   and q.report->>'redesign_recovery_reservation_id'=rec.reservation_id::text
   and q.report->>'redesign_recovery_owner_consent'='AUTHENTICATED_OWNER_EXPLICIT_ACTION'
   and q.report->>'checkpoint_hash'=rec.failed_checkpoint_hash
   and q.report->>'checkpoint_receipt_id'=rec.failed_checkpoint_receipt_id::text
 ),'{}'::jsonb)
$fn$;

revoke all on function public.reality_authorize_first178_one_redesign_v1(
 uuid,uuid,uuid,text,text,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.reality_authorize_first178_one_redesign_v1(
 uuid,uuid,uuid,text,text,uuid,text,boolean) to service_role;
revoke all on function public.reality_read_first178_one_redesign_v1(
 uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_first178_one_redesign_v1(
 uuid,uuid,uuid,text) to service_role;

alter table reality_internal.first178_continuation_reservations_v1
 drop constraint if exists first178_continuation_reservations_v1_attempt_count_check;
alter table reality_internal.first178_continuation_reservations_v1
 add constraint first178_continuation_reservations_v1_attempt_count_check
 check(attempt_count between 1 and 9);

CREATE OR REPLACE FUNCTION public.reality_reserve_first178_continuation_step_v1(p_owner_id uuid, p_conversation_id uuid, p_queue_id uuid, p_original_work_id text, p_checkpoint_hash text, p_checkpoint_receipt_id uuid, p_phase text, p_attempt_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 p_attempt_count not between 1 and 9 then
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
 st->>'attempt_limit' not in ('3','5','7','8','9') or
 (st->>'attempt_limit' in ('5','7','8','9') and not exists(
  select 1 from reality_internal.first178_exhaustion_recovery_reservations_v1 rec
  where rec.queue_id=q.id and rec.original_work_id=q.original_work_id
  and st->'recovery_authorization'->>'reservation_id'=rec.reservation_id::text
  and st->'recovery_authorization'->>'checkpoint_hash'=rec.failed_checkpoint_hash
  and st->'recovery_authorization'->>'verified'='true')) or
 (st->>'attempt_limit' in ('7','8','9') and not exists(
 select 1 from reality_internal.first178_second_exhaustion_recovery_reservations_v1 rec2
 where rec2.queue_id=q.id and rec2.original_work_id=q.original_work_id
 and st->'recovery_continuation_authorization'->>'reservation_id'=rec2.reservation_id::text
 and st->'recovery_continuation_authorization'->>'checkpoint_hash'=rec2.failed_checkpoint_hash
 and st->'recovery_continuation_authorization'->>'verified'='true')) or
 (st->>'attempt_limit' in ('8','9') and not exists(
  select 1 from reality_internal.first178_final_draft_recovery_reservations_v1 final
  where final.queue_id=q.id and final.original_work_id=q.original_work_id
  and st->'recovery_final_authorization'->>'reservation_id'=final.reservation_id::text
  and st->'recovery_final_authorization'->>'checkpoint_hash'=final.failed_checkpoint_hash
  and st->'recovery_final_authorization'->>'verified'='true')) or
 (st->>'attempt_limit'='9' and not exists(
  select 1 from reality_internal.first178_owner_redesign_recovery_v1 rec9
  where rec9.queue_id=q.id and rec9.original_work_id=q.original_work_id
    and rec9.failed_checkpoint_hash=st->'recovery_redesign_authorization'->>'checkpoint_hash'
    and rec9.reservation_id::text=st->'recovery_redesign_authorization'->>'reservation_id'
    and st->'recovery_redesign_authorization'->>'owner_confirmed'='true'
    and st->'recovery_redesign_authorization'->>'authorization_scope'='ONE_ORIGINAL178_REDESIGN_ATTEMPT')) or
 st->'candidate'->>'installed'<>'false' or
 st->'candidate'->>'authorized'<>'false' or
 st->'promotion_authorization'<>'null'::jsonb or
 st->'registration'<>'null'::jsonb or
 st->'settlement'<>'null'::jsonb or
 (p_phase='REPAIR_REQUIRED' and
    st->'journal'->-1->>'kind' not in ('SANDBOX_FAILED','RECOVERY_STARTED')) or
 (p_phase='CANDIDATE_READY' and
    st->'journal'->-1->>'kind'<>'MODEL_CANDIDATE_PROPOSED') or
 (p_phase='REPAIR_REQUIRED' and
   (p_attempt_count>=case when st->>'attempt_limit'='9' then 9 when st->>'attempt_limit'='8' then 8 when st->>'attempt_limit'='7' then 7 when st->>'attempt_limit'='5' then 5 else 3 end or
    st->'independent_failure'->'classification'->>'retry_source_without_dependency'<>'true')) or
 (p_phase='CANDIDATE_READY' and
   (p_attempt_count<2 or
    (st->'journal'->-2->>'kind'<>'SANDBOX_FAILED' and not (
    (p_attempt_count=4 and st->>'attempt_limit'='5' and
     st->'journal'->-2->>'kind'='RECOVERY_STARTED' and
     st->'journal'->-3->>'kind'='SANDBOX_FAILED') or
    (p_attempt_count=6 and st->>'attempt_limit'='7' and
     st->'journal'->-2->>'kind'='RECOVERY_STARTED' and
     st->'journal'->-3->>'kind'='SANDBOX_FAILED') or
    (p_attempt_count=8 and st->>'attempt_limit'='8' and
     st->'journal'->-2->>'kind'='RECOVERY_STARTED' and
     st->'journal'->-3->>'kind'='SANDBOX_FAILED') or
    (p_attempt_count=9 and st->>'attempt_limit'='9' and
     st->'journal'->-2->>'kind'='RECOVERY_STARTED' and
     st->'journal'->-3->>'kind'='SANDBOX_FAILED')))))
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
end; $function$
;
revoke all on function public.reality_reserve_first178_continuation_step_v1(
 uuid,uuid,uuid,text,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.reality_reserve_first178_continuation_step_v1(
 uuid,uuid,uuid,text,text,uuid,text,integer) to service_role;
