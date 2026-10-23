#!/usr/bin/env bash
set -euo pipefail
# Real PostgreSQL against JS-signed SYNTHETIC source receipts only.
createdb reality_source_tamper_test
export PGDATABASE=reality_source_tamper_test
psql -v ON_ERROR_STOP=1 -f test/fixtures/ephemeral-postgres-recovery-schema.sql >/tmp/tamper-bootstrap.log
psql -v ON_ERROR_STOP=1 -f sql/REVIEW_ONLY_preview_atomic_abandonment_v1.sql >/tmp/tamper-migration.log
psql -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-seed.sql >/tmp/tamper-seed.log
for entry_id in synthetic-user synthetic-processing synthetic-interrupted-receipt; do
  cat >/tmp/tamper-original-evidence.sql <<SQL
\set ON_ERROR_STOP on
begin;
update public.reality_universe_entries
  set payload=payload || '{"_tampered":true}'::jsonb
  where entry_id='$entry_id';
\i /tmp/reality-parallel-call.sql
SQL
  if psql -X -v ON_ERROR_STOP=1 -f /tmp/tamper-original-evidence.sql \
       >/tmp/tamper.out 2>/tmp/tamper.err; then
    echo "DANGEROUS: signed source alteration was accepted for $entry_id"
    exit 1
  fi
  grep -q 'REALITY_ABANDONMENT_SOURCE_HASH_INVALID' /tmp/tamper.err
  test "$(psql -X -At -c "select count(*) from public.reality_universe_entries where event_kind='REALITY_TURN_RESOLUTION_RECEIPT';")" = "0"
  test "$(psql -X -At -c "select count(*) from public.reality_conversation_turn_fences where active_turn_id='synthetic-interrupted' and sequence_num=1;")" = "1"
  test "$(psql -X -At -c "select count(*) from public.reality_universe_entries where payload ? '_tampered';")" = "0"
done
echo 'SIGNED_SOURCE_TAMPER_REJECTED_FOR_USER_PROCESSING_AND_INTERRUPTION'
