#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point to the ephemeral PostgreSQL test database}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create table public.universe_events (
  event_id uuid primary key,
  event_kind text not null,
  entity_type text not null,
  entity_id uuid not null,
  continuity_root_id uuid not null,
  worldline_id uuid not null,
  parent_event_id uuid null,
  effective_time timestamptz not null,
  assertion_time timestamptz not null,
  epistemic_status text not null,
  payload jsonb not null,
  evidence_refs jsonb not null,
  provenance jsonb not null,
  content_hash text not null,
  lineage_hash text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete, truncate, references, trigger on public.universe_events to service_role;
SQL

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261009220000_reality_atomic_continuity_append_v1.sql

PRIVILEGES=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select has_table_privilege('service_role','public.universe_events','SELECT') || ':' || has_table_privilege('service_role','public.universe_events','INSERT') || ':' || has_table_privilege('service_role','public.universe_events','UPDATE') || ':' || has_table_privilege('service_role','public.universe_events','DELETE') || ':' || has_table_privilege('service_role','public.universe_events','TRUNCATE') || ':' || has_function_privilege('service_role','public.append_universe_event(jsonb)','EXECUTE');")
if [[ "$PRIVILEGES" != 'true:false:false:false:false:true' ]]; then
  echo "FAIL: unexpected ledger permissions after migration: $PRIVILEGES"
  exit 1
fi

set +e
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role service_role; insert into public.universe_events (event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash) values ('99999999-9999-5999-8999-999999999999','RAW_SIGNAL','raw_signal','88888888-8888-5888-8888-888888888888','aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb',now(),now(),'OBSERVED','{}','[]','{}','direct-insert-content','direct-insert-lineage');" >/tmp/append-only-direct-insert.log 2>&1
DIRECT_INSERT_STATUS=$?
set -e
if [[ "$DIRECT_INSERT_STATUS" -eq 0 ]]; then
  echo 'FAIL: service_role bypassed the atomic append RPC with a direct insert'
  exit 1
fi

ROOT='aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa'
WORLD='bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb'
SEED='11111111-1111-5111-8111-111111111111'
CHILD_A='33333333-3333-5333-8333-333333333333'
CHILD_B='55555555-5555-5555-8555-555555555555'
ENTITY_A='44444444-4444-5444-8444-444444444444'
ENTITY_B='66666666-6666-5666-8666-666666666666'
NOW='2026-10-09T22:00:00Z'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into public.universe_events (event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash) values ('$SEED','RAW_SIGNAL','raw_signal','$ENTITY_A','$ROOT','$WORLD',null,'$NOW','$NOW','OBSERVED','{}','[]','{}','seed-content','seed-lineage');"

for OP in "update public.universe_events set payload='{}'::jsonb where event_id='$SEED'" "delete from public.universe_events where event_id='$SEED'" "truncate public.universe_events"; do
  set +e
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "$OP" >/tmp/append-only-guard.log 2>&1
  MUTATION_STATUS=$?
  set -e
  if [[ "$MUTATION_STATUS" -eq 0 ]] || ! grep -q 'UNIVERSE_EVENTS_APPEND_ONLY' /tmp/append-only-guard.log; then
    echo "FAIL: append-only guard did not reject: $OP"
    cat /tmp/append-only-guard.log
    exit 1
  fi
done

PAYLOAD_A="{\"event_id\":\"$CHILD_A\",\"event_kind\":\"TRANSFORMATION\",\"entity_type\":\"transformation\",\"entity_id\":\"$ENTITY_A\",\"continuity_root_id\":\"$ROOT\",\"worldline_id\":\"$WORLD\",\"parent_event_id\":\"$SEED\",\"effective_time\":\"$NOW\",\"assertion_time\":\"$NOW\",\"epistemic_status\":\"OBSERVED\",\"payload\":{\"candidate\":\"a\"},\"evidence_refs\":[],\"provenance\":{\"continuity_spine\":{\"prior_lineage_hash\":\"seed-lineage\"}},\"content_hash\":\"content-a\",\"lineage_hash\":\"lineage-a\"}"
PAYLOAD_B="{\"event_id\":\"$CHILD_B\",\"event_kind\":\"TRANSFORMATION\",\"entity_type\":\"transformation\",\"entity_id\":\"$ENTITY_B\",\"continuity_root_id\":\"$ROOT\",\"worldline_id\":\"$WORLD\",\"parent_event_id\":\"$SEED\",\"effective_time\":\"$NOW\",\"assertion_time\":\"$NOW\",\"epistemic_status\":\"OBSERVED\",\"payload\":{\"candidate\":\"b\"},\"evidence_refs\":[],\"provenance\":{\"continuity_spine\":{\"prior_lineage_hash\":\"seed-lineage\"}},\"content_hash\":\"content-b\",\"lineage_hash\":\"lineage-b\"}"

set +e
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role service_role; select public.append_universe_event('$PAYLOAD_A'::jsonb);" > /tmp/atomic-a.log 2>&1 &
PID_A=$!
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role service_role; select public.append_universe_event('$PAYLOAD_B'::jsonb);" > /tmp/atomic-b.log 2>&1 &
PID_B=$!
wait "$PID_A"; STATUS_A=$?
wait "$PID_B"; STATUS_B=$?
set -e

if [[ "$STATUS_A" -eq 0 && "$STATUS_B" -eq 0 ]]; then
  echo 'FAIL: both competing writes succeeded; continuity fork detected'
  cat /tmp/atomic-a.log /tmp/atomic-b.log
  exit 1
fi
if [[ "$STATUS_A" -ne 0 && "$STATUS_B" -ne 0 ]]; then
  echo 'FAIL: both competing writes were rejected'
  cat /tmp/atomic-a.log /tmp/atomic-b.log
  exit 1
fi

ROW_COUNT=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.universe_events where continuity_root_id='$ROOT' and worldline_id='$WORLD';")
CHILD_COUNT=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select count(*) from public.universe_events where continuity_root_id='$ROOT' and worldline_id='$WORLD' and parent_event_id='$SEED';")
if [[ "$ROW_COUNT" != '2' || "$CHILD_COUNT" != '1' ]]; then
  echo "FAIL: expected 2 total events and exactly 1 child of seed; got rows=$ROW_COUNT children=$CHILD_COUNT"
  exit 1
fi

ORDER_OK=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select (child.created_at > seed.created_at)::text from public.universe_events child join public.universe_events seed on seed.event_id=child.parent_event_id where child.continuity_root_id='$ROOT' and child.worldline_id='$WORLD';")
if [[ "$ORDER_OK" != 'true' ]]; then
  echo "FAIL: durable insertion timestamp does not follow the committed parent"
  exit 1
fi

echo 'PASS: concurrent stale-tail appends serialize; exactly one succeeds, no fork is created, and insertion order is monotonic.'

# Legacy rows can share created_at. The tail must still be selected by parent
# topology, even when event_id sorting would put the parent after its child.
ROOT2='aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaab'
WORLD2='bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbc'
PARENT2='ffffffff-ffff-5fff-8fff-ffffffffffff'
CHILD2='11111111-1111-5111-8111-111111111112'
GRANDCHILD2='22222222-2222-5222-8222-222222222223'
ENTITY2='33333333-3333-5333-8333-333333333334'
TIED='2026-10-09T22:00:00Z'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into public.universe_events (event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash,created_at) values ('$PARENT2','RAW_SIGNAL','raw_signal','$ENTITY2','$ROOT2','$WORLD2',null,'$TIED','$TIED','OBSERVED','{}','[]','{}','legacy-parent-content','legacy-parent-hash','$TIED'),('$CHILD2','TRANSFORMATION','transformation','$ENTITY2','$ROOT2','$WORLD2','$PARENT2','$TIED','$TIED','OBSERVED','{}','[]','{}','legacy-child-content','legacy-child-hash','$TIED');"

GRANDCHILD_PAYLOAD="{\"event_id\":\"$GRANDCHILD2\",\"event_kind\":\"OBSERVATION\",\"entity_type\":\"observation\",\"entity_id\":\"$ENTITY2\",\"continuity_root_id\":\"$ROOT2\",\"worldline_id\":\"$WORLD2\",\"parent_event_id\":\"$CHILD2\",\"effective_time\":\"$TIED\",\"assertion_time\":\"$TIED\",\"epistemic_status\":\"OBSERVED\",\"payload\":{},\"evidence_refs\":[],\"provenance\":{\"continuity_spine\":{\"prior_lineage_hash\":\"legacy-child-hash\"}},\"content_hash\":\"legacy-grandchild-content\",\"lineage_hash\":\"legacy-grandchild-hash\"}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "set role service_role; select public.append_universe_event('$GRANDCHILD_PAYLOAD'::jsonb);" >/tmp/atomic-tied-tail.log
PARENT_CHECK=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -c "select parent_event_id::text from public.universe_events where event_id='$GRANDCHILD2';")
if [[ "$PARENT_CHECK" != "$CHILD2" ]]; then
  echo "FAIL: tied-timestamp append chose the wrong tail; expected $CHILD2 got $PARENT_CHECK"
  cat /tmp/atomic-tied-tail.log
  exit 1
fi

echo 'PASS: parent topology identifies the true tail when legacy timestamps tie.'
