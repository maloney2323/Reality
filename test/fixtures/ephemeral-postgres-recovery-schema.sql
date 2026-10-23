\set ON_ERROR_STOP on
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $do$ begin
 if not exists(select 1 from pg_roles where rolname='service_role') then
  create role service_role login bypassrls;
 end if;
 if not exists(select 1 from pg_roles where rolname='anon') then
  create role anon login;
 end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then
  create role authenticated login;
 end if;
end $do$;
create table public.reality_conversation_turn_fences(
 root_id text primary key,
 worldline_id text not null,
 owner_user_id uuid not null,
 sequence_num bigint not null default 0 check(sequence_num>=0),
 active_turn_id text,
 active_claim_token uuid,
 last_committed_turn_id text,
 last_committed_entry_id text,
 last_committed_entry_hash text,
 changed_at timestamptz not null default now(),
 constraint reality_turn_fence_active_pair check((active_turn_id is null)=(active_claim_token is null))
);
create table public.reality_universe_entries(
 entry_id text primary key,
 continuity_root_id text not null,
 worldline_id text not null,
 event_kind text not null,
 epistemic_kind text not null,
 assertion_time timestamptz not null,
 effective_time timestamptz not null,
 source_ref text not null,
 payload jsonb not null,
 evidence_references jsonb not null default '[]'::jsonb
   check(jsonb_typeof(evidence_references)='array'),
 provenance jsonb not null check(jsonb_typeof(provenance)='object'),
 ledger_entry_hash text not null,
 created_at timestamptz not null default now()
);
grant usage on schema public,extensions to service_role;
grant select,insert,update on public.reality_conversation_turn_fences to service_role;
grant select,insert on public.reality_universe_entries to service_role;
grant execute on function extensions.digest(bytea,text) to service_role;

-- Match the isolated Supabase schema's RLS posture. The synthetic service_role
-- bypasses RLS like the privileged Supabase service role; browser roles never
-- receive table grants or permissive policies.
alter table public.reality_universe_entries enable row level security;
alter table public.reality_conversation_turn_fences enable row level security;
