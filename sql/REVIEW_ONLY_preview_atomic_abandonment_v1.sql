-- REVIEW ONLY. Do NOT apply this file to live or Preview without separate
-- owner approval, a disposable-clone SQL integration run, and an independent
-- DB privileges/late-write race audit. This migration is NOT installed.
--
-- Isolated Preview only. Rollback requires separate review: audit receipts
-- and late-response tombstones must not be silently dropped.
--
-- Before applying in a DISPOSABLE CLONE, verify pgcrypto lives in extensions.
-- A server-side owner authentication + double confirmation is mandatory.
--
-- SQL functions are SECURITY INVOKER. Only service_role receives EXECUTE.
-- No writes are allowed from the browser.

-- Canonical JSON serializer for the restricted, string/integer/boolean/null
-- receipt format, matching stable object key sorting in the JS Universe hash.
-- Do not enable without testing against REAL createUniverseEntry fixtures.
create or replace function public.reality_canonical_json_v1(p jsonb)
returns text
language plpgsql immutable strict
set search_path = ''
as $$
declare result text;
begin
 case pg_catalog.jsonb_typeof(p)
 when 'object' then
  select '{'||coalesce(pg_catalog.string_agg(
    pg_catalog.to_json(k)::text||':'||public.reality_canonical_json_v1(v),
    ',' order by k collate "C"),'')||'}'
   into result from pg_catalog.jsonb_each(p) as x(k,v);
  return result;
 when 'array' then
  select '['||coalesce(pg_catalog.string_agg(
    public.reality_canonical_json_v1(value),
    ',' order by ordinality),'')||']'
   into result
   from pg_catalog.jsonb_array_elements(p) with ordinality as x(value,ordinality);
  return result;
 else
  return p::text;
 end case;
end;
$$;
revoke all on function public.reality_canonical_json_v1(jsonb)
 from public, anon, authenticated;
grant execute on function public.reality_canonical_json_v1(jsonb) to service_role;

-- Validate the identical Universe hash; NEVER regenerate the hash during
-- migration, and refuse extra/missing top-level fields.
create or replace function public.reality_verify_resolution_entry_v1(p_entry jsonb)
returns boolean
language plpgsql stable strict
set search_path = ''
as $$
declare computed text; n int;
begin
 if pg_catalog.jsonb_typeof(p_entry) is distinct from 'object'
    or p_entry->>'ledger_entry_hash' !~ '^[a-f0-9]{64}$' then
  return false;
 end if;
 select count(*) into n from pg_catalog.jsonb_object_keys(p_entry);
 if n is distinct from 12 then return false; end if;
 if not (p_entry ?& array[
  'entry_id','continuity_root_id','worldline_id','event_kind',
  'epistemic_kind','assertion_time','effective_time','source_ref',
  'payload','evidence_references','provenance','ledger_entry_hash'
 ]) then return false; end if;
 if pg_catalog.jsonb_typeof(p_entry->'payload') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_entry->'provenance') is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_entry->'evidence_references') is distinct from 'array' then
  return false;
 end if;
 computed:=pg_catalog.encode(extensions.digest(
    pg_catalog.convert_to(
      public.reality_canonical_json_v1(p_entry - 'ledger_entry_hash'),
      'UTF8'),'sha256'),'hex');
 return coalesce(computed = p_entry->>'ledger_entry_hash',false);
exception when others then
 return false;
end;
$$;
revoke all on function public.reality_verify_resolution_entry_v1(jsonb)
 from public, anon, authenticated;
grant execute on function public.reality_verify_resolution_entry_v1(jsonb)
 to service_role;

-- Recompute original source hashes, not merely check hash pointers.
create or replace function public.reality_verify_stored_source_entry_v1(
 p_entry public.reality_universe_entries)
returns boolean language plpgsql stable strict set search_path = ''
as $$
declare original jsonb;
begin
 original:=pg_catalog.jsonb_build_object(
  'entry_id',p_entry.entry_id,
  'continuity_root_id',p_entry.continuity_root_id,
  'worldline_id',p_entry.worldline_id,
  'event_kind',p_entry.event_kind,
  'epistemic_kind',p_entry.epistemic_kind,
  'assertion_time',pg_catalog.to_char(p_entry.assertion_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'effective_time',pg_catalog.to_char(p_entry.effective_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'source_ref',p_entry.source_ref,
  'payload',p_entry.payload,
  'evidence_references',p_entry.evidence_references,
  'provenance',p_entry.provenance,
  'ledger_entry_hash',p_entry.ledger_entry_hash);
 return coalesce(public.reality_verify_resolution_entry_v1(original),false);
exception when others then return false;
end;
$$;
revoke all on function public.reality_verify_stored_source_entry_v1(public.reality_universe_entries) from public,anon,authenticated;
grant execute on function public.reality_verify_stored_source_entry_v1(public.reality_universe_entries) to service_role;

-- Late-write tombstone. Every assistant/COMMITTED insert is serialized that an abandonment RPC locks. A model response
-- already in flight after interruption cannot commit a completion afterward.
create or replace function public.reality_reject_late_abandoned_turn_v1()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
declare v_turn text; f public.reality_conversation_turn_fences%rowtype;
begin
 if (new.event_kind='AUTHENTICATED_CONVERSATION_MESSAGE'
      and new.payload->>'role'='assistant')
    or (new.event_kind='REALITY_CAUSAL_TURN_RECEIPT'
      and new.payload->>'phase'='COMMITTED') then
  v_turn:=new.payload->>'turn_id';
  if v_turn is null then
   raise exception 'REALITY_LATE_TURN_MISSING_ID';
  end if;
  -- This lock is essential to eliminate the concurrent late-response race.
  select * into f from public.reality_conversation_turn_fences
   where root_id=new.continuity_root_id for update;
  if exists(
   select 1 from public.reality_universe_entries e
   where e.continuity_root_id=new.continuity_root_id
     and e.worldline_id=new.worldline_id
     and e.event_kind='REALITY_TURN_RESOLUTION_RECEIPT'
     and e.payload->>'turn_id'=v_turn
     and e.payload->>'resolution_status'='ABANDONED'
  ) then
   raise exception 'REALITY_LATE_OUTPUT_FOR_ABANDONED_TURN';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function public.reality_reject_late_abandoned_turn_v1()
 from public, anon, authenticated;
-- Trigger functions are called by trigger engine, not by the browser API.

drop trigger if exists reality_reject_late_abandoned_turn_v1
 on public.reality_universe_entries;
create trigger reality_reject_late_abandoned_turn_v1
before insert on public.reality_universe_entries
for each row execute function public.reality_reject_late_abandoned_turn_v1();

-- Atomic append-only approval + abandonment and sequence rollback. PostgreSQL
-- treats every function call as one transaction: if ANY check/write fails,
-- neither receipt nor fence change is committed.
create or replace function public.reality_abandon_incomplete_conversation_turn_v1(
 p_root_id text,
 p_worldline_id text,
 p_owner_user_id uuid,
 p_turn_id text,
 p_claim_token uuid,
 p_expected_sequence bigint,
 p_approval_entry jsonb,
 p_resolution_entry jsonb
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
 f public.reality_conversation_turn_fences%rowtype;
 u public.reality_universe_entries%rowtype;
 processing public.reality_universe_entries%rowtype;
 interrupted public.reality_universe_entries%rowtype;
 old_resolution public.reality_universe_entries%rowtype;
 proposed_id text;
 preceding bigint;
begin
 if current_user is distinct from 'service_role' then
  raise exception 'REALITY_ABANDONMENT_CALLER_DENIED';
 end if;
 if p_root_id !~ '^continuity:[a-f0-9]{32}$'
    or p_worldline_id is distinct from 'reality:primary'
    or p_owner_user_id is null
    or p_turn_id !~ '^[A-Za-z0-9:_-]{1,96}$'
    or p_claim_token is null
    or p_approval_entry is null or p_resolution_entry is null
    or p_expected_sequence is null or p_expected_sequence < 1
    or not public.reality_verify_resolution_entry_v1(p_approval_entry)
    or not public.reality_verify_resolution_entry_v1(p_resolution_entry) then
  raise exception 'REALITY_ABANDONMENT_INVALID_INPUT_OR_HASH';
 end if;

 proposed_id:=p_resolution_entry->>'entry_id';
 select * into strict f from public.reality_conversation_turn_fences
  where root_id=p_root_id for update;
 if f.owner_user_id is distinct from p_owner_user_id
    or f.worldline_id is distinct from p_worldline_id then
  raise exception 'REALITY_ABANDONMENT_ROOT_OWNER_MISMATCH';
 end if;

 if p_approval_entry->>'event_kind' is distinct from 'REALITY_TURN_ABANDONMENT_APPROVAL'
    or p_resolution_entry->>'event_kind' is distinct from 'REALITY_TURN_RESOLUTION_RECEIPT'
    or p_approval_entry->>'epistemic_kind' is distinct from 'OBSERVATION'
    or p_resolution_entry->>'epistemic_kind' is distinct from 'OBSERVATION'
    or p_approval_entry->>'continuity_root_id' is distinct from p_root_id
    or p_resolution_entry->>'continuity_root_id' is distinct from p_root_id
    or p_approval_entry->>'worldline_id' is distinct from p_worldline_id
    or p_resolution_entry->>'worldline_id' is distinct from p_worldline_id
    or p_approval_entry->'payload'->>'owner_user_id' is distinct from p_owner_user_id::text
    or p_resolution_entry->'payload'->>'owner_user_id' is distinct from p_owner_user_id::text
    or p_approval_entry->'payload'->>'turn_id' is distinct from p_turn_id
    or p_resolution_entry->'payload'->>'turn_id' is distinct from p_turn_id
    or p_approval_entry->'payload'->>'approval_intent' is distinct from 'EXPLICIT_OWNER_ABANDON_INCOMPLETE'
    or p_approval_entry->'payload'->>'acknowledges_uncertain_model_execution' is distinct from 'true'
    or p_approval_entry->'payload'->>'acknowledges_possible_model_billing' is distinct from 'true'
    or p_resolution_entry->'payload'->>'resolution_status' is distinct from 'ABANDONED'
    or p_resolution_entry->'payload'->>'model_call_outcome' is distinct from 'UNKNOWN'
    or p_resolution_entry->'payload'->>'external_action_outcome' is distinct from 'NOT_ESTABLISHED'
    or p_resolution_entry->'payload'->>'approval_receipt_hash'
        is distinct from p_approval_entry->>'ledger_entry_hash'
    or p_resolution_entry->'payload'->>'approval_receipt_id'
        is distinct from p_approval_entry->>'entry_id'
    or (p_resolution_entry->'payload'->>'claim_sequence_num')::bigint is distinct from p_expected_sequence
    or (p_approval_entry->'payload'->>'claim_sequence_num')::bigint is distinct from p_expected_sequence
    or p_resolution_entry->'payload'->>'prior_commit_entry_id'
         is distinct from f.last_committed_entry_id
    or p_resolution_entry->'payload'->>'prior_commit_hash'
         is distinct from f.last_committed_entry_hash
 then
  raise exception 'REALITY_ABANDONMENT_RECEIPT_CONTENT_INVALID';
 end if;

 -- Idempotent network retry: report ONLY the verified already-stored result.
 -- Do not append a new receipt, do not touch another active turn.
 select * into old_resolution from public.reality_universe_entries
  where entry_id=proposed_id and event_kind='REALITY_TURN_RESOLUTION_RECEIPT'
    and continuity_root_id=p_root_id and worldline_id=p_worldline_id;
 if found then
  if old_resolution.ledger_entry_hash is distinct from p_resolution_entry->>'ledger_entry_hash'
     or old_resolution.payload->>'approval_receipt_hash' is distinct from p_approval_entry->>'ledger_entry_hash'
     or old_resolution.payload->>'turn_id' is distinct from p_turn_id
     or old_resolution.payload->>'owner_user_id' is distinct from p_owner_user_id::text
     or old_resolution.payload->>'resolution_status' is distinct from 'ABANDONED'
     or f.active_turn_id is not null
     or f.sequence_num is distinct from p_expected_sequence-1 then
   raise exception 'REALITY_ABANDONMENT_REPLAY_STATE_CONFLICT';
  end if;
  return pg_catalog.jsonb_build_object(
   'status','ALREADY_ABANDONED','receipt_id',old_resolution.entry_id,
   'receipt_hash',old_resolution.ledger_entry_hash,
   'sequence_num',f.sequence_num);
 end if;

 if f.active_turn_id is distinct from p_turn_id
    or f.active_claim_token is distinct from p_claim_token
    or f.sequence_num is distinct from p_expected_sequence then
  raise exception 'REALITY_ABANDONMENT_ACTIVE_CLAIM_CHANGED';
 end if;
 preceding:=f.sequence_num-1;
 if preceding=0 then
  if f.last_committed_entry_id is not null or
     f.last_committed_entry_hash is not null then
   raise exception 'REALITY_ABANDONMENT_GENESIS_CONFLICT';
  end if;
 else
  if f.last_committed_entry_id is null or
     f.last_committed_entry_hash !~ '^[a-f0-9]{64}$'
     or not exists (
      select 1 from public.reality_universe_entries e
      where e.entry_id=f.last_committed_entry_id
        and e.ledger_entry_hash=f.last_committed_entry_hash
        and e.continuity_root_id=p_root_id
        and e.event_kind='REALITY_CAUSAL_TURN_RECEIPT'
        and e.payload->>'phase'='COMMITTED'
        and (e.payload->>'sequence_num')::bigint=preceding
     ) then
   raise exception 'REALITY_ABANDONMENT_PRIOR_CHAIN_UNVERIFIED';
  end if;
 end if;

 select * into strict u from public.reality_universe_entries
  where continuity_root_id=p_root_id and worldline_id=p_worldline_id
    and event_kind='AUTHENTICATED_CONVERSATION_MESSAGE'
    and payload->>'role'='user' and payload->>'turn_id'=p_turn_id
    and payload->>'principal_id'=p_owner_user_id::text;
 select * into strict processing from public.reality_universe_entries
  where continuity_root_id=p_root_id and worldline_id=p_worldline_id
    and event_kind='REALITY_CAUSAL_TURN_RECEIPT'
    and payload->>'phase'='PROCESSING' and payload->>'turn_id'=p_turn_id
    and payload->>'authenticated_user_id'=p_owner_user_id::text;
 select * into strict interrupted from public.reality_universe_entries
  where continuity_root_id=p_root_id and worldline_id=p_worldline_id
    and event_kind='REALITY_CAUSAL_TURN_RECEIPT'
    and payload->>'phase'='INTERRUPTED' and payload->>'turn_id'=p_turn_id
    and payload->>'authenticated_user_id'=p_owner_user_id::text;

 if not public.reality_verify_stored_source_entry_v1(u)
    or not public.reality_verify_stored_source_entry_v1(processing)
    or not public.reality_verify_stored_source_entry_v1(interrupted)
 then raise exception 'REALITY_ABANDONMENT_SOURCE_HASH_INVALID';end if;

 if not (p_approval_entry->'evidence_references' @>
           pg_catalog.jsonb_build_array(u.entry_id,interrupted.entry_id))
    or not (p_resolution_entry->'evidence_references' @>
           pg_catalog.jsonb_build_array(u.entry_id,processing.entry_id,
                interrupted.entry_id,p_approval_entry->>'entry_id'))
    or pg_catalog.abs(extract(epoch from
       (pg_catalog.clock_timestamp() -
        (p_approval_entry->>'assertion_time')::timestamptz))) > 300
    or processing.payload->>'user_message_hash' is distinct from u.ledger_entry_hash
    or p_resolution_entry->'payload'->>'user_message_hash' is distinct from u.ledger_entry_hash
    or p_resolution_entry->'payload'->>'processing_receipt_hash' is distinct from processing.ledger_entry_hash
    or p_resolution_entry->'payload'->>'interruption_receipt_hash' is distinct from interrupted.ledger_entry_hash
    or exists (
     select 1 from public.reality_universe_entries e
     where e.continuity_root_id=p_root_id and e.worldline_id=p_worldline_id
       and e.payload->>'turn_id'=p_turn_id
       and ((e.event_kind='AUTHENTICATED_CONVERSATION_MESSAGE'
             and e.payload->>'role'='assistant')
         or (e.event_kind='REALITY_CAUSAL_TURN_RECEIPT'
             and e.payload->>'phase'='COMMITTED'))
    ) then
  raise exception 'REALITY_ABANDONMENT_LIVE_ASSISTANT_OR_EVIDENCE_CONFLICT';
 end if;

 -- Restrict allowed receipt provenance. None of these entries grants action
 -- authority; authorization was checked by signed-in server before invoking.
 if p_approval_entry->'provenance'->>'source' is distinct from 'REALITY_STANDALONE_OWNER_AUTHORIZED'
    or p_resolution_entry->'provenance'->>'source' is distinct from 'REALITY_STANDALONE_VERIFIED_RESOLUTION'
    or p_approval_entry->'provenance'->>'authenticated_user_id' is distinct from p_owner_user_id::text
    or p_resolution_entry->'provenance'->>'authenticated_user_id' is distinct from p_owner_user_id::text
    or p_approval_entry->'payload'->>'user_message_hash' is distinct from u.ledger_entry_hash
    or p_approval_entry->'payload'->>'interruption_receipt_hash' is distinct from interrupted.ledger_entry_hash
 then
  raise exception 'REALITY_ABANDONMENT_OWNER_INTENT_EVIDENCE_INVALID';
 end if;

 insert into public.reality_universe_entries
 (entry_id,continuity_root_id,worldline_id,event_kind,epistemic_kind,
  assertion_time,effective_time,source_ref,payload,evidence_references,
  provenance,ledger_entry_hash)
 values
 (p_approval_entry->>'entry_id',p_root_id,p_worldline_id,
  p_approval_entry->>'event_kind',p_approval_entry->>'epistemic_kind',
  (p_approval_entry->>'assertion_time')::timestamptz,
  (p_approval_entry->>'effective_time')::timestamptz,
  p_approval_entry->>'source_ref',p_approval_entry->'payload',
  p_approval_entry->'evidence_references',p_approval_entry->'provenance',
  p_approval_entry->>'ledger_entry_hash');
 insert into public.reality_universe_entries
 (entry_id,continuity_root_id,worldline_id,event_kind,epistemic_kind,
  assertion_time,effective_time,source_ref,payload,evidence_references,
  provenance,ledger_entry_hash)
 values
 (p_resolution_entry->>'entry_id',p_root_id,p_worldline_id,
  p_resolution_entry->>'event_kind',p_resolution_entry->>'epistemic_kind',
  (p_resolution_entry->>'assertion_time')::timestamptz,
  (p_resolution_entry->>'effective_time')::timestamptz,
  p_resolution_entry->>'source_ref',p_resolution_entry->'payload',
  p_resolution_entry->'evidence_references',p_resolution_entry->'provenance',
  p_resolution_entry->>'ledger_entry_hash');

 update public.reality_conversation_turn_fences
  set sequence_num=preceding,active_turn_id=null,
      active_claim_token=null,changed_at=pg_catalog.clock_timestamp()
  where root_id=p_root_id and owner_user_id=p_owner_user_id
    and active_turn_id=p_turn_id and active_claim_token=p_claim_token
    and sequence_num=p_expected_sequence;
 if not found then
  raise exception 'REALITY_ABANDONMENT_ATOMIC_FENCE_UPDATE_FAILED';
 end if;
 return pg_catalog.jsonb_build_object(
  'status','ABANDONED','receipt_id',proposed_id,
  'receipt_hash',p_resolution_entry->>'ledger_entry_hash',
  'sequence_num',preceding);
end;
$$;
revoke all on function public.reality_abandon_incomplete_conversation_turn_v1(
 text,text,uuid,text,uuid,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.reality_abandon_incomplete_conversation_turn_v1(
 text,text,uuid,text,uuid,bigint,jsonb,jsonb) to service_role;

-- Post-migration testing MUST prove:
-- * canonical digest matches JS createUniverseEntry on multiple real fixtures
-- * no assistant/COMMITTED writes can race abandonment (trigger locking)
-- * a failed check rolls back both appended receipts and the sequence change
-- * a conflicting turn or wrong owner cannot unlock anything
-- * genesis N=1 resets to 0; next claim reuses 1 with unchanged predecessor
-- * N>1 resets to last committed N-1, no fabricated COMMITTED
-- * idempotent second request never inserts more receipts
-- * direct anon/authenticated RPC call has no EXECUTE privilege
