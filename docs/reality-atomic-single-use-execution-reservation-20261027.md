# Reality — atomic single-use execution reservation: implemented checkpoint
Date 2026-10-27; PR #140 experimental draft only.

## Installed in isolated benchmark DB
Project: `hvkfreoagbrphwghjajw` (reality-continuity-benchmark); **NOT** the production Reality database.

Migration `sql/reality-execution-single-use-reservation-v0.1.sql` was applied to the isolated project and the installation read back. Private RLS-enabled `reality_internal.execution_reservations` has a UNIQUE constraint over principal + conversation + goal-bound policy ID + immutable work fingerprint. Four RPCs are service-role-only, not granted to `anon` or `authenticated`:
- `reality_read_execution_epoch`: read current goal and latest admitted user-message revision clock.
- `reality_claim_execution_once`: under the **same** per-user/conversation `pg_advisory_xact_lock` used by chat publication and goal transitions, compare goal revision/event and user-message revision/latest request ID, insert exactly one reservation.
- `reality_begin_reserved_execution`: reacquire that lock, compare revisions again, transition `RESERVED -> DISPATCHING` exactly once.
- `reality_settle_execution_reservation`: transition `DISPATCHING -> VERIFIED | UNRESOLVED | UNCERTAIN`, with receipt reference. Never rearm a dispatched claim or auto-retry an uncertain effect.

The data table is a private execution claim journal, **not** a second user-goal database. The authoritative user goals still come only from authenticated Continuity.

## Runtime code and boundary
`src/reality-single-use-execution-reservation-v0.1.js` creates the server-only RPC adapter with strict isolated project, exact signed-in user/conversation scope and secret-key handling. No fallback credential or alternate project.
`src/reality-personal-execution-reservation-service-v0.1.js` combines earlier verified goal/approved work admission with the database epoch and claims one reservation.
`POST /api/reality/personal-execution-admission` supports authenticated, same-origin `intent:'RESERVE'` and `confirmation:'RESERVE_THIS_APPROVED_ACTION'`. It returns a reservation ID, not a provider action or server signing capability.

`src/reality-governed-execution-engine-v0.1.js` refuses a consequential connector write unless the existing server-signed exact-work approval, server-signed fresh-goal admission, **and** a scoped reservation backed by a trusted server DB adapter agree. It consumes the reservation through the atomic `begin` RPC immediately before provider invocation. If the connector/Verifier throws, the result is `UNRESOLVED` and the claimed action is never blindly retried. A failed DB settlement can never be promoted into a verified durable outcome.

## Evidence collected this pass
- Installation inspection confirmed private table, four RPCs and service-only EXECUTE privileges.
- A real isolated-Postgres rollback smoke test passed: duplicate claim blocked, stale goal blocked, newer message blocked, redispatch blocked, settled claim cannot be reopened. The transaction rolled back.
- Two concurrent real isolated-Postgres requests using the **same** policy/fingerprint resulted in exactly one successful reservation and one `EXECUTION_ALREADY_RESERVED_NO_AUTOMATIC_RETRY`. Database count confirmed **one** reservation. Synthetic rows were explicitly removed afterward.
- GitHub Actions no-cost unit/integration simulations cover scoped identity, tampered approval/proof, missing ledger, duplicate and racing dispatch, provider timeout, failed verification, post-dispatch uncertainty, and engine fail-closed paths.

## Remaining limits and controls
- The **authenticated public route only reserves**; it does not yet invoke real external providers. The engine has a DB-consumption boundary for trusted internal callers, but no customer-facing provider dispatch was enabled.
- A database cannot atomically commit an external provider API call. Crashes/timeouts after `DISPATCHING` leave uncertainty; reconcile independently, ideally with provider-level idempotency before deciding any manual retry.
- A new user instruction can arrive immediately **after** DB dispatch admission but before an HTTP provider call. The lock eliminates stale admission *inside* its transaction, not all outside-world races.
- Epoch checks ensure explicit goal and new-message freshness, **not** that every new user's natural-language intention has been semantically interpreted or independently adjudicated.
- No live Supabase-authenticated browser-to-PostgREST round trip or real business provider effect was executed. Tests cannot establish zero drift, zero hallucinations or a commercial ROI figure.
- Paid benchmark remains frozen at 21 genuine model turns. Production remains unchanged, PR #140 remains DRAFT and unmerged.

Next: independent live authenticated preview integration check without external writes, provider-specific idempotency/reconciliation design, and then controlled explicitly authorized action testing before returning to adversarial semantic drift benchmarking.
