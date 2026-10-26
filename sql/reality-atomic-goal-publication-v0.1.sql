-- Proposed isolated-preview-only migration. NOT applied to production.
-- Execute as ONE transaction/migration after reviewing the database target.
-- Ensures authenticated user turn admission, explicit user goal transitions,
-- and assistant publication share the SAME per-owner/conversation lock.
-- An older answer cannot be published after a newer user request commits.
-- The existing universe_events ledger remains the ONLY goal authority history;
-- this private table is a derived revision clock, NOT a second goal database.
begin;

create schema if not exists reality_internal;
revoke all on schema reality_internal from public, anon, authenticated;

create table if not exists reality_internal.goal_publication_epochs (
  user_id uuid not null,
  conversation_id uuid not null,
  revision bigint not null default 0 check (revision >= 0),
  last_transition_event_id uuid,
  -- A separate monotonic clock for ordinary user turn admission. This is
  -- NOT a second conversation store; the actual messages remain authoritative.
  user_message_revision bigint not null default 0 check (user_message_revision>=0),
  latest_user_request_id uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id,conversation_id)
);
alter table reality_internal.goal_publication_epochs enable row level security;
revoke all on reality_internal.goal_publication_epochs from public, anon, authenticated;

-- Freeze the source ledger while the initial projection is constructed.
-- Historical events are counted only if their user-message source actually
-- exists in the owner-scoped private chat table.
lock table public.universe_events in share row exclusive mode;
lock table public.reality_chat_messages in share row exclusive mode;

insert into reality_internal.goal_publication_epochs
 (user_id,conversation_id,revision,last_transition_event_id)
select m.user_id,m.conversation_id,count(*)::bigint,
       (array_agg(e.event_id order by e.assertion_time desc,e.created_at desc,e.event_id desc))[1]
from public.universe_events e
join public.reality_chat_messages m on
  (e.payload->>'source_user_message_ref') =
    'supabase:reality_chat_messages:'||m.id::text
where e.payload->>'event_type'='AUTHORITATIVE_USER_GOAL_TRANSITION'
  and m.role='user'
  and e.payload->>'principal_id'=m.user_id::text
  and e.provenance->>'authenticated_user_id'=m.user_id::text
  and e.payload->>'continuity_root_id'=e.continuity_root_id::text
group by m.user_id,m.conversation_id
on conflict (user_id,conversation_id) do nothing;

-- Bootstrap the derived user-turn clock from existing committed chat messages.
-- Future inserts use the actual serialized lock order, not created_at guesses.
insert into reality_internal.goal_publication_epochs as epoch
 (user_id,conversation_id,user_message_revision,latest_user_request_id)
select user_id,conversation_id,
       count(*) filter (where role='user')::bigint,
       (array_agg(request_id order by created_at desc,id desc)
          filter (where role='user'))[1]
from public.reality_chat_messages
group by user_id,conversation_id
on conflict (user_id,conversation_id) do update
set user_message_revision=excluded.user_message_revision,
    latest_user_request_id=excluded.latest_user_request_id,
    updated_at=pg_catalog.now()
where epoch.user_message_revision=0 and epoch.latest_user_request_id is null;

-- Any authenticated USER admission is serialized on the SAME lock as goal
-- changes and assistant publication. The latest admitted request ID comes
-- from lock acquisition/commit order, never a racing timestamp comparison.
create or replace function reality_internal.bump_user_turn_publication_epoch()
returns trigger language plpgsql security definer
set search_path='' as $
begin
 if new.role <> 'user' then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('reality-goal-pub-v1:'||
    new.user_id::text||':'||new.conversation_id::text,0));
 insert into reality_internal.goal_publication_epochs
   (user_id,conversation_id,user_message_revision,latest_user_request_id,updated_at)
 values(new.user_id,new.conversation_id,1,new.request_id,pg_catalog.now())
 on conflict (user_id,conversation_id)
   do update set user_message_revision=goal_publication_epochs.user_message_revision+1,
     latest_user_request_id=excluded.latest_user_request_id,
     updated_at=excluded.updated_at;
 return new;
end
$;
revoke all on function reality_internal.bump_user_turn_publication_epoch()
 from public,anon,authenticated;
drop trigger if exists reality_user_turn_publication_epoch_bump
 on public.reality_chat_messages;
create trigger reality_user_turn_publication_epoch_bump
 after insert on public.reality_chat_messages
 for each row when (new.role='user')
 execute function reality_internal.bump_user_turn_publication_epoch();

-- Trigger executes inside the existing authoritative-goal event INSERT
-- transaction; it cannot be bypassed by a racing chat publication.
create or replace function reality_internal.bump_goal_publication_epoch()
returns trigger language plpgsql security definer
set search_path='' as $$
declare
  owner_id uuid;
  convo_id uuid;
  msg text;
begin
  if new.payload->>'event_type' <> 'AUTHORITATIVE_USER_GOAL_TRANSITION'
     or new.payload->>'event_type' is null then
    return new;
  end if;
  msg := new.payload->>'source_user_message_ref';
  if msg is null or msg !~ '^supabase:reality_chat_messages:[0-9a-f-]{36}$'
     or new.payload->>'source_verification' <>
         'AUTHENTICATED_RLS_CHAT_USER_MESSAGE_READBACK'
     or new.payload->>'authorized_by' <>
         'AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND'
     or new.payload->>'goal_transition_authority_granted' <> 'true'
     or new.payload->>'continuity_root_id' <> new.continuity_root_id::text then
    raise exception 'GOAL_EPOCH_INVALID_AUTHORITATIVE_EVENT';
  end if;
  select m.user_id,m.conversation_id into owner_id,convo_id
    from public.reality_chat_messages m
   where ('supabase:reality_chat_messages:'||m.id::text)=msg
     and m.role='user'
     and new.payload->>'principal_id'=m.user_id::text
     and new.provenance->>'authenticated_user_id'=m.user_id::text;
  if owner_id is null or convo_id is null then
    raise exception 'GOAL_EPOCH_USER_SOURCE_NOT_VERIFIED';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('reality-goal-pub-v1:'||
      owner_id::text||':'||convo_id::text,0));
  insert into reality_internal.goal_publication_epochs
    (user_id,conversation_id,revision,last_transition_event_id,updated_at)
    values(owner_id,convo_id,1,new.event_id,pg_catalog.now())
  on conflict (user_id,conversation_id)
    do update set revision=goal_publication_epochs.revision+1,
       last_transition_event_id=excluded.last_transition_event_id,
       updated_at=excluded.updated_at;
  return new;
end
$$;
revoke all on function reality_internal.bump_goal_publication_epoch()
  from public,anon,authenticated;
drop trigger if exists reality_goal_publication_epoch_bump
  on public.universe_events;
create trigger reality_goal_publication_epoch_bump
 after insert on public.universe_events
 for each row execute function reality_internal.bump_goal_publication_epoch();

-- ONLY Reality's isolated server credential can call this RPC.
-- The server authenticates the human session and verifies their RLS source
-- message first. The RPC requires that exact user/conversation/request.
-- No browser JWT, model or reviewer can publish arbitrary "assistant" history.
-- PostgREST executes each RPC as one database transaction.
-- The p_user_id argument is trusted ONLY because EXECUTE is service_role-only.
-- Never grant authenticated/anon direct EXECUTE access.
create or replace function public.reality_publish_assistant_if_goal_current(
 p_user_id uuid,
 p_conversation_id uuid,
 p_request_id uuid,
 p_content text,
 p_expected_goal_revision bigint,
 p_expected_last_goal_event_id uuid default null
) returns uuid language plpgsql volatile security definer
set search_path='' as $$
declare
  caller_id uuid := p_user_id;
  current_revision bigint;
  last_event uuid;
  latest_user_request uuid;
  inserted_id uuid;
begin
  if caller_id is null or p_conversation_id is null or
     p_request_id is null or p_content is null or
     pg_catalog.length(pg_catalog.btrim(p_content))=0 or
     pg_catalog.length(p_content)>12000 or
     p_expected_goal_revision is null or p_expected_goal_revision<0 then
    raise exception 'CHAT_ATOMIC_PUBLICATION_INPUT_INVALID';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('reality-goal-pub-v1:'||
      caller_id::text||':'||p_conversation_id::text,0));
  select e.revision,e.last_transition_event_id,e.latest_user_request_id
    into current_revision,last_event,latest_user_request
    from reality_internal.goal_publication_epochs e
   where e.user_id=caller_id and e.conversation_id=p_conversation_id;
  if coalesce(current_revision,0)<>p_expected_goal_revision or
     last_event is distinct from p_expected_last_goal_event_id then
    raise exception 'CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN';
  end if;
  -- Another instruction/goal command arriving while the model was thinking
  -- invalidates an older request even when no explicit goal event was yet
  -- committed. Both user admission and publication hold this same lock.
  if latest_user_request is distinct from p_request_id then
    raise exception 'CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN';
  end if;
  if not exists(
    select 1 from public.reality_chat_messages m
    where m.user_id=caller_id and m.conversation_id=p_conversation_id
      and m.request_id=p_request_id and m.role='user') then
    raise exception 'CHAT_ATOMIC_USER_MESSAGE_NOT_COMMITTED';
  end if;
  if exists(
    select 1 from public.reality_chat_messages m
    where m.user_id=caller_id and m.conversation_id=p_conversation_id
      and m.request_id=p_request_id and m.role='assistant') then
    raise exception 'CHAT_ATOMIC_ASSISTANT_ALREADY_PUBLISHED';
  end if;
  insert into public.reality_chat_messages
    (user_id,conversation_id,request_id,role,content)
    values(caller_id,p_conversation_id,p_request_id,'assistant',p_content)
    returning id into inserted_id;
  return inserted_id;
end
$$;
revoke all on function public.reality_publish_assistant_if_goal_current(
 uuid,uuid,uuid,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.reality_publish_assistant_if_goal_current(
 uuid,uuid,uuid,text,bigint,uuid) to service_role;

-- No authenticated client may directly INSERT a forged assistant reply,
-- bypassing the revision check. Server-authenticated user text remains writable.
drop policy if exists reality_chat_messages_owner_insert
 on public.reality_chat_messages;
create policy reality_chat_messages_owner_insert on public.reality_chat_messages
 for insert to authenticated with check (
   (select auth.uid())=user_id and role='user'
 );

commit;
