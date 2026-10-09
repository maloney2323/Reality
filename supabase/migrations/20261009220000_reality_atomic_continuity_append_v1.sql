-- Reality continuity atomic append v1
-- Apply in a staging Supabase project first. Do not apply to production until the
-- function and adapter pass the concurrent-writer verification suite.

create or replace function public.append_universe_event(p_record jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid := (p_record->>'event_id')::uuid;
  v_root_id uuid := (p_record->>'continuity_root_id')::uuid;
  v_worldline_id uuid := (p_record->>'worldline_id')::uuid;
  v_parent_id uuid := nullif(p_record->>'parent_event_id', '')::uuid;
  v_prior_hash text := nullif(p_record #>> '{provenance,continuity_spine,prior_lineage_hash}', '');
  v_existing public.universe_events%rowtype;
  v_tail public.universe_events%rowtype;
  v_inserted public.universe_events%rowtype;
  v_event_count bigint;
  v_tail_count bigint;
begin
  if v_event_id is null or v_root_id is null or v_worldline_id is null then
    raise exception 'CONTINUITY_REQUIRED_IDENTIFIERS_MISSING';
  end if;

  -- Serialize append attempts for this continuity root + worldline in this transaction.
  perform pg_advisory_xact_lock(hashtextextended(v_root_id::text || ':' || v_worldline_id::text, 0));

  select * into v_existing
  from public.universe_events
  where event_id = v_event_id;

  if found then
    if v_existing.lineage_hash = p_record->>'lineage_hash'
       and v_existing.content_hash = p_record->>'content_hash'
       and v_existing.event_kind is not distinct from p_record->>'event_kind'
       and v_existing.entity_type is not distinct from p_record->>'entity_type'
       and v_existing.entity_id is not distinct from (p_record->>'entity_id')::uuid
       and v_existing.continuity_root_id = v_root_id
       and v_existing.worldline_id = v_worldline_id
       and v_existing.parent_event_id is not distinct from v_parent_id
       and v_existing.effective_time is not distinct from (p_record->>'effective_time')::timestamptz
       and v_existing.assertion_time is not distinct from (p_record->>'assertion_time')::timestamptz
       and v_existing.epistemic_status is not distinct from p_record->>'epistemic_status'
       and v_existing.payload is not distinct from coalesce(p_record->'payload', '{}'::jsonb)
       and v_existing.evidence_refs is not distinct from coalesce(p_record->'evidence_refs', '[]'::jsonb)
       and v_existing.provenance is not distinct from coalesce(p_record->'provenance', '{}'::jsonb) then
      return to_jsonb(v_existing) || jsonb_build_object('status', 'DUPLICATE_IDENTICAL');
    end if;
    raise exception 'CONTINUITY_EVENT_ID_COLLISION';
  end if;

  select count(*) into v_event_count
  from public.universe_events
  where continuity_root_id = v_root_id
    and worldline_id = v_worldline_id;

  if v_event_count > 0 then
    -- Derive the tail from parent topology, never from created_at: legacy rows
    -- can share transaction timestamps and a later transaction can begin before
    -- it acquires the advisory lock.
    select count(*) into v_tail_count
    from public.universe_events e
    where e.continuity_root_id = v_root_id
      and e.worldline_id = v_worldline_id
      and not exists (
        select 1
        from public.universe_events child
        where child.parent_event_id = e.event_id
          and child.continuity_root_id = v_root_id
          and child.worldline_id = v_worldline_id
      );

    if v_tail_count <> 1 then
      raise exception 'CONTINUITY_HISTORY_TAIL_INVALID:%', v_tail_count;
    end if;

    select e.* into v_tail
    from public.universe_events e
    where e.continuity_root_id = v_root_id
      and e.worldline_id = v_worldline_id
      and not exists (
        select 1
        from public.universe_events child
        where child.parent_event_id = e.event_id
          and child.continuity_root_id = v_root_id
          and child.worldline_id = v_worldline_id
      )
    limit 1;

    if v_parent_id is distinct from v_tail.event_id then
      raise exception 'CONTINUITY_APPEND_NOT_TAIL';
    end if;
    if v_prior_hash is distinct from v_tail.lineage_hash then
      raise exception 'CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH';
    end if;
  elsif v_parent_id is not null or v_prior_hash is not null then
    raise exception 'CONTINUITY_INITIAL_PARENT_MUST_BE_NULL';
  end if;

  insert into public.universe_events (
    event_id, event_kind, entity_type, entity_id,
    continuity_root_id, worldline_id, parent_event_id,
    effective_time, assertion_time, epistemic_status,
    payload, evidence_refs, provenance, content_hash, lineage_hash, created_at
  ) values (
    v_event_id,
    p_record->>'event_kind',
    p_record->>'entity_type',
    (p_record->>'entity_id')::uuid,
    v_root_id,
    v_worldline_id,
    v_parent_id,
    (p_record->>'effective_time')::timestamptz,
    (p_record->>'assertion_time')::timestamptz,
    p_record->>'epistemic_status',
    coalesce(p_record->'payload', '{}'::jsonb),
    coalesce(p_record->'evidence_refs', '[]'::jsonb),
    coalesce(p_record->'provenance', '{}'::jsonb),
    p_record->>'content_hash',
    p_record->>'lineage_hash',
    clock_timestamp()
  )
  returning * into v_inserted;

  return to_jsonb(v_inserted) || jsonb_build_object('status', 'PERSISTED');
end;
$$;

revoke all on function public.append_universe_event(jsonb) from public;
revoke all on function public.append_universe_event(jsonb) from anon, authenticated;
grant execute on function public.append_universe_event(jsonb) to service_role;

-- Defense in depth: the ledger is append-only even if a privileged application
-- path accidentally attempts to mutate an existing event directly.
create or replace function public.reject_universe_event_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'UNIVERSE_EVENTS_APPEND_ONLY';
end;
$;

revoke all on function public.reject_universe_event_mutation() from public, anon, authenticated, service_role;

drop trigger if exists universe_events_reject_row_mutation on public.universe_events;
create trigger universe_events_reject_row_mutation
before update or delete on public.universe_events
for each row execute function public.reject_universe_event_mutation();

drop trigger if exists universe_events_reject_truncate on public.universe_events;
create trigger universe_events_reject_truncate
before truncate on public.universe_events
for each statement execute function public.reject_universe_event_mutation();

-- All application writes must go through the atomic RPC. Coordinate this
-- migration with the adapter release; the legacy invoker RPC is intentionally
-- disabled so it cannot bypass the tail lock.
revoke insert, update, delete, truncate, references, trigger
  on table public.universe_events from public, anon, authenticated, service_role;
grant select on table public.universe_events to service_role;

do $$
begin
  if to_regprocedure('public.universe_append_event(uuid,text,text,uuid,uuid,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,text,text)') is not null then
    revoke all on function public.universe_append_event(uuid,text,text,uuid,uuid,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,text,text)
      from public, anon, authenticated, service_role;
  end if;
end;
$$;
