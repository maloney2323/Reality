-- Reality single-use execution reservation v0.1.
-- ISOLATED PREVIEW BENCHMARK DATABASE ONLY. NOT PRODUCTION.
-- Shares the EXISTING goal-publication advisory lock/revision clock.
-- Keep actual provider calls DISABLED until the server adapter consumes a
-- claim and records uncertain outcomes without blind retry.
begin;

create schema if not exists reality_internal;
revoke all on schema reality_internal from public, anon, authenticated;

create table if not exists reality_internal.execution_reservations (
 reservation_id uuid primary key default pg_catalog.gen_random_uuid(),
 user_id uuid not null,
 conversation_id uuid not null,
 action_policy_id text not null check (pg_catalog.length(action_policy_id) between 1 and 200),
 work_fingerprint text not null check (work_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
 goal_id text not null check (pg_catalog.length(goal_id) between 1 and 160),
 goal_revision bigint not null check (goal_revision > 0),
 goal_transition_event_id uuid not null,
 user_message_revision bigint not null check (user_message_revision > 0),
 latest_user_request_id uuid not null,
 status text not null default 'RESERVED' check (status in ('RESERVED','DISPATCHING','UNCERTAIN','VERIFIED','UNRESOLVED')),
 claimed_at timestamptz not null default pg_catalog.now(),
 dispatch_started_at timestamptz,
 settled_at timestamptz,
 verification_receipt_ref text,
 constraint reality_execution_once_per_approved_work
  unique (user_id,conversation_id,action_policy_id,work_fingerprint)
);
alter table reality_internal.execution_reservations enable row level security;
revoke all on reality_internal.execution_reservations from public, anon, authenticated;

-- Snapshot of the same revision clock used by authenticated chat publication.
-- The server must independently authenticate the human before requesting it.
create or replace function public.reality_read_execution_epoch(
 p_user_id uuid,p_conversation_id uuid
) returns table(
 goal_revision bigint,
 goal_transition_event_id uuid,
 user_message_revision bigint,
 latest_user_request_id uuid
) language sql stable security definer set search_path='' as $$
 select e.revision,e.last_transition_event_id,
        e.user_message_revision,e.latest_user_request_id
 from reality_internal.goal_publication_epochs e
 where e.user_id=p_user_id and e.conversation_id=p_conversation_id
$$;

-- Atomic compare-and-claim: identical lock key to goal changes, user-turn
-- admissions and assistant publication. Duplicate concurrent claims cannot
-- both succeed, even if they use distinct HTTP requests or server instances.
create or replace function public.reality_claim_execution_once(
 p_user_id uuid,
 p_conversation_id uuid,
 p_action_policy_id text,
 p_work_fingerprint text,
 p_goal_id text,
 p_expected_goal_revision bigint,
 p_expected_goal_event_id uuid,
 p_expected_user_message_revision bigint,
 p_expected_latest_user_request_id uuid
) returns uuid language plpgsql volatile security definer
set search_path='' as $$
declare
 e record;
 rid uuid;
begin
 if p_user_id is null or p_conversation_id is null or
    p_action_policy_id is null or pg_catalog.length(p_action_policy_id) not between 1 and 200 or
    p_work_fingerprint is null or p_work_fingerprint !~ '^sha256:[0-9a-f]{64}$' or
    p_goal_id is null or pg_catalog.length(p_goal_id) not between 1 and 160 or
    p_expected_goal_revision is null or p_expected_goal_revision<=0 or
    p_expected_goal_event_id is null or
    p_expected_user_message_revision is null or p_expected_user_message_revision<=0 or
    p_expected_latest_user_request_id is null then
    raise exception 'EXECUTION_RESERVATION_INPUT_INVALID';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality-goal-pub-v1:'||
   p_user_id::text||':'||p_conversation_id::text,0));
 select revision,last_transition_event_id,
        user_message_revision,latest_user_request_id into e
 from reality_internal.goal_publication_epochs
 where user_id=p_user_id and conversation_id=p_conversation_id for update;
 if not found then raise exception 'EXECUTION_EPOCH_NOT_FOUND'; end if;
 if e.revision is distinct from p_expected_goal_revision or
    e.last_transition_event_id is distinct from p_expected_goal_event_id then
   raise exception 'EXECUTION_GOAL_REVISION_STALE';
 end if;
 if e.user_message_revision is distinct from p_expected_user_message_revision or
    e.latest_user_request_id is distinct from p_expected_latest_user_request_id then
   raise exception 'EXECUTION_NEWER_USER_MESSAGE_REQUIRES_RECONCILIATION';
 end if;
 insert into reality_internal.execution_reservations (
  user_id,conversation_id,action_policy_id,work_fingerprint,
  goal_id,goal_revision,goal_transition_event_id,
  user_message_revision,latest_user_request_id
 ) values (
  p_user_id,p_conversation_id,p_action_policy_id,p_work_fingerprint,
  p_goal_id,p_expected_goal_revision,p_expected_goal_event_id,
  p_expected_user_message_revision,p_expected_latest_user_request_id
 ) on conflict on constraint reality_execution_once_per_approved_work
   do nothing returning reservation_id into rid;
 if rid is null then
  raise exception 'EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY';
 end if;
 return rid;
end
$$;

-- A second atomic state change must be made just before network dispatch.
-- Once DISPATCHING, never auto-return to RESERVED: a timeout is UNCERTAIN.
-- Recheck goal/turn epoch under the SAME lock before this transition.
create or replace function public.reality_begin_reserved_execution(
 p_user_id uuid,p_conversation_id uuid,p_reservation_id uuid
) returns boolean language plpgsql volatile security definer
set search_path='' as $$
declare
 r record;
 e record;
begin
 if p_user_id is null or p_conversation_id is null or p_reservation_id is null then
  raise exception 'EXECUTION_DISPATCH_INPUT_INVALID';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('reality-goal-pub-v1:'||
   p_user_id::text||':'||p_conversation_id::text,0));
 select * into r from reality_internal.execution_reservations
 where reservation_id=p_reservation_id and user_id=p_user_id and
       conversation_id=p_conversation_id for update;
 if not found then raise exception 'EXECUTION_RESERVATION_NOT_FOUND'; end if;
 if r.status<>'RESERVED' then
  raise exception 'EXECUTION_RESERVATION_ALREADY_CONSUMED';
 end if;
 select revision,last_transition_event_id,
        user_message_revision,latest_user_request_id into e
 from reality_internal.goal_publication_epochs
 where user_id=p_user_id and conversation_id=p_conversation_id for update;
 if not found or e.revision is distinct from r.goal_revision or
    e.last_transition_event_id is distinct from r.goal_transition_event_id or
    e.user_message_revision is distinct from r.user_message_revision or
    e.latest_user_request_id is distinct from r.latest_user_request_id then
  raise exception 'EXECUTION_DISPATCH_GROUNDING_CHANGED';
 end if;
 update reality_internal.execution_reservations
  set status='DISPATCHING',dispatch_started_at=pg_catalog.now()
  where reservation_id=p_reservation_id;
 return true;
end
$$;

-- Settlement cannot re-arm a dispatched reservation. "VERIFIED" represents
-- an independent readback receipt supplied by the server Verifier, never a
-- connector's own success assertion or a model statement.
create or replace function public.reality_settle_execution_reservation(
 p_user_id uuid,p_conversation_id uuid,p_reservation_id uuid,
 p_outcome text,p_verification_receipt_ref text
) returns boolean language plpgsql volatile security definer
set search_path='' as $$
declare old_status text;
begin
 if p_user_id is null or p_conversation_id is null or p_reservation_id is null or
    p_outcome not in ('VERIFIED','UNRESOLVED','UNCERTAIN') or
    p_verification_receipt_ref is null or
    pg_catalog.length(p_verification_receipt_ref) not between 1 and 240 then
   raise exception 'EXECUTION_SETTLEMENT_INPUT_INVALID';
 end if;
 select status into old_status from reality_internal.execution_reservations
 where reservation_id=p_reservation_id and user_id=p_user_id and
       conversation_id=p_conversation_id for update;
 if not found then raise exception 'EXECUTION_RESERVATION_NOT_FOUND'; end if;
 if old_status<>'DISPATCHING' then
   raise exception 'EXECUTION_RESERVATION_CANNOT_REARM_OR_RESET';
 end if;
 update reality_internal.execution_reservations
 set status=p_outcome,settled_at=pg_catalog.now(),
     verification_receipt_ref=p_verification_receipt_ref
 where reservation_id=p_reservation_id;
 return true;
end
$$;

revoke all on function public.reality_read_execution_epoch(uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_claim_execution_once(
 uuid,uuid,text,text,text,bigint,uuid,bigint,uuid) from public,anon,authenticated;
revoke all on function public.reality_begin_reserved_execution(uuid,uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_settle_execution_reservation(uuid,uuid,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_execution_epoch(uuid,uuid) to service_role;
grant execute on function public.reality_claim_execution_once(
 uuid,uuid,text,text,text,bigint,uuid,bigint,uuid) to service_role;
grant execute on function public.reality_begin_reserved_execution(uuid,uuid,uuid) to service_role;
grant execute on function public.reality_settle_execution_reservation(uuid,uuid,uuid,text,text)
 to service_role;
commit;
