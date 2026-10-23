# Reality benchmark database: causal sequencing and verified reconciliation proof
**Date (America/New_York):** October 22, 2026
**Environment:** isolated Supabase project `hvkfreoagbrphwghjajw` (`reality-continuity-benchmark`) only.
**Production/main Universe:** `qkzvjfiegihyaoabiniy`, untouched.

## Schema installations
- Applied `reality_benchmark_conversation_recovery_v01_20261022`: dedicated `public.reality_conversation_turn_fences`, `reality_claim_conversation_turn`, `reality_finish_conversation_turn`, and `reality_reconcile_committed_conversation_turn`.
- Applied `reality_benchmark_finish_full_chain_v02_20261022`: the normal finish function now validates the complete immutable evidence chain via the same recovery function used after crashes. This prevents divergent completion rules.
- The first attempted migration did **not** apply because the draft SQL contained malformed dollar-delimited text. Fixed the source from the last clean version; Supabase then accepted the corrected migration. The schema-absence preflight confirmed the failed attempt left no partial installation.
- Source for future staging review: `docs/migrations/REVIEW_ONLY_benchmark_conversation_sequencer_v0.1.sql` (now includes the v02 finish definition; do not automatically apply it again).

## Actual PostgreSQL behavior (rollback-only fixtures)
Tests ran with `SET LOCAL ROLE service_role` inside PostgreSQL transactions, using **synthetic** conversations and receipts and explicit `ROLLBACK`:
1. Claim A returns CLAIMED with sequence 1; a second distinct turn on the same root returns BUSY without taking the slot.
2. Recovery rejects a missing committed record and rejects a forged/mismatched commit hash.
3. With matching synthetic user, processing, assistant, cognition and COMMITTED receipt rows, recovery returns RECOVERED and releases the blocked fence.
4. Repeating recovery for that same most-recent commitment returns ALREADY_FINISHED, without another model call (the SQL fixture never invokes a model).
5. A second turn can claim sequence 2 with the verified predecessor identity and hash; an older turn's recovery request cannot unlock the new active turn.
6. Normal finalization now refuses a COMMITTED row when its underlying proof is missing, and refuses a wrong claim token.
7. With full matched synthetic evidence and correct token, normal finalization returns FINISHED and leaves a verified idle fence.
8. PostgreSQL role tests confirm `anon` and `authenticated` cannot execute the claim function. All three stored procedures are SECURITY INVOKER with EXECUTE granted only to `service_role`.
9. Fence table has RLS enabled and grants only `SELECT/INSERT/UPDATE` to `service_role`.

**Fixtures use synthetic digest-shaped strings to exercise SQL referential checks; these checks do not replace JavaScript's cryptographic hash validation tests or an end-to-end authenticated HTTP test.**

## Persistence isolation readback
- Benchmark `reality_universe_entries` count: **17 before and 17 after**; fence rows: **0 after rollback-only fixtures**.
- Main Universe count: **2**; no sequencing table or recovery functions installed.
- Vercel branch variable `REALITY_CAUSAL_SEQUENCE_ENABLED` is **not configured**; no production deployment or preview enablement was performed.
- Draft PR #87 remained **unmerged** throughout this verification.
- Security advisor still reports INFO `rls_enabled_no_policy` for service-role-only tables and WARN `auth_leaked_password_protection`. These are not new open-access grants; password protection should be addressed separately before public release.

## Still required
- Validate the exact service-role Data API HTTP path with a bounded staging runtime, without revealing keys or invoking a paid model.
- Resolve the independent Supabase confirmation/email login blocker, then prove verified user auth, tenant isolation and recovery through the preview UI.
- Enable the sequence flag for the isolated migration Preview branch only after REST and live auth proof; not Production.
- Failure recovery for an **incomplete** model/action, automatic lease expiry, and unknown external side effects remain deliberately blocked and require a separate governed reconciliation design.
- This is **not** a measured 100-turn drift/hallucination reliability score or a production launch.
