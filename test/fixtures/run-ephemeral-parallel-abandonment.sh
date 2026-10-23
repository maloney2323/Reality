#!/usr/bin/env bash
set -euo pipefail

# This database is created inside the isolated GitHub Actions service only.
# Real Supabase credentials, customer records and server runtime are absent.
createdb reality_parallel_test
export PGDATABASE=reality_parallel_test
psql -v ON_ERROR_STOP=1 -f test/fixtures/ephemeral-postgres-recovery-schema.sql >/tmp/reality-parallel-bootstrap.log
psql -v ON_ERROR_STOP=1 -f sql/REVIEW_ONLY_preview_atomic_abandonment_v1.sql >/tmp/reality-parallel-migration.log
psql -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-seed.sql >/tmp/reality-parallel-seed.log

# Both independent psql sessions race for EXACTLY the same active fence.
psql -X -At -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-call.sql > /tmp/reality-concurrent-a.log 2> /tmp/reality-concurrent-a.err &
one=$!
sleep 0.10
psql -X -At -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-call.sql > /tmp/reality-concurrent-b.log 2> /tmp/reality-concurrent-b.err &
two=$!
wait "$one"
wait "$two"

grep -qx 'ABANDONED' /tmp/reality-concurrent-a.log
grep -qx 'ALREADY_ABANDONED' /tmp/reality-concurrent-b.log
psql -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-verify.sql

# A different signed payload with the same deterministic receipt ID must not
# pass as a legal idempotent retry, even though that turn was already closed.
if psql -X -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-conflict.sql      > /tmp/reality-concurrent-conflict.out 2>/tmp/reality-concurrent-conflict.err; then
  echo 'UNSAFE_REPLAY_ACCEPTED_DIFFERENT_RECEIPT'
  exit 1
fi
grep -q 'REALITY_ABANDONMENT_REPLAY_STATE_CONFLICT' /tmp/reality-concurrent-conflict.err

psql -v ON_ERROR_STOP=1 -f /tmp/reality-parallel-verify.sql >/dev/null
echo 'EPHEMERAL_CONCURRENT_TURN_RECOVERY_PASSED: one transaction, one verified replay, altered receipt denied'
