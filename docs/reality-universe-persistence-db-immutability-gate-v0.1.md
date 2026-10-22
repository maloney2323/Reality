# Reality Universe — Database Immutability Gate (review-only)

**Status: PROPOSED. This file is not an applied migration. Never auto-run against production.**

## Read-only audit (2026-10-22)

In the active main Supabase project:
- `public.reality_universe_entries`: RLS enabled; `entry_id` primary key; unique `ledger_entry_hash`; continuity index; **no UPDATE/DELETE blocking trigger**.
- A service-only policy for the `service_role` allows `ALL` operations; RLS does not prevent that privileged role from UPDATE or DELETE.
- Ordinary `anon` and `authenticated` roles have table grants but do not have a row-access policy to reach the canonical table. This does not eliminate a privileged-writer risk.
- `public.universe_events` already has an append-only trigger, `universe_events_append_only`, using `reject_universe_event_mutation()`.
- Distinct historical tables and multiple Supabase projects must not be merged or deleted during this hardening step.

## Proposed additive SQL — require explicit database-change approval

This creates a new, narrowly named trigger function and an append-only guard on the canonical table. Review existing objects, provider permissions and backup/recovery procedures before executing via an approved Supabase migration.

```sql
create function public.reality_reject_universe_entries_mutation_v1()
returns trigger
language plpgsql
security invoker
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'REALITY_UNIVERSE_APPEND_ONLY_VIOLATION';
end;
$$;

create trigger reality_universe_entries_append_only_v1
before update or delete on public.reality_universe_entries
for each row
execute function public.reality_reject_universe_entries_mutation_v1();

revoke all on function public.reality_reject_universe_entries_mutation_v1()
from public;
```

**Warning:** These statements are a review draft, not an idempotent deployment script. Check for existing function/trigger names before application. A DB migration must be reviewed and executed once with a rollback procedure; adding protections must not modify existing historical rows.

## Required post-change verification (isolated fixture and transaction rollback)

1. Confirm existing record count, primary key/indexes, and all historical hashes before and after.
2. Confirm INSERT of a uniquely identified synthetic entry works on an authorized isolated test root.
3. Within an explicit rollback transaction, attempt UPDATE of that fixture and verify SQLSTATE `55000`, including when executed with the same privileged role the server uses.
4. Within the same rollback transaction, attempt DELETE of the fixture and verify SQLSTATE `55000`.
5. Confirm attempted mutation cannot alter prior as-believed-at reconstruction; restore/check the fixture using a documented authorized test cleanup approach.
6. Confirm duplicated entry IDs and duplicated ledger hashes are rejected at the database boundary.
7. Re-run six-layer integration and actual authenticated two-turn readback after separately approved deployment.

## Pre-100-turn launch gates

- **No lost canonical records:** 100 distinct observed revisions generate 100 independently read-back immutable entries; no silent digest repairs.
- **No unprovable completion:** a completed work item requires external outcome evidence and separately granted authority.
- **Per-item continuity:** one construction job becoming COMPLETED does not clear another job's WAITING, BLOCKED or CONTESTED state.
- **Two clocks:** an event's effective time and recorded time are independently queryable; late corrections never rewrite prior historical beliefs.
- **Verifier lineage:** downstream claims refer to actual persisted source hashes, not user-authored pseudo-receipts.
- **Full-history claims:** offset-based scans are NOT transactionally snapshot-isolated under concurrent backdated writes. A DB snapshot/RPC or an independently stable keyset cursor must be verified before claiming concurrency-proof completeness.
- **Legacy storage:** reconcile `universe_events` and `reality_universe_entries` by a read-only manifest before any migration, with cross-project data isolation.
- **Deployment:** current production code is not the isolated repair PR; do not equate CI success with a live release.

This document is an implementation safety gate, not evidence that production immutability or live persistence has already been achieved.
