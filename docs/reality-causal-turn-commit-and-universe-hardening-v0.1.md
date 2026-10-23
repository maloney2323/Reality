# Reality Causal Turn Commit v0.1 + Main Universe Hardening Gate

**Status:** draft PR #87 only. No production deployment, no paid model calls, no database migration executed.

## Causal Turn Commit v0.1
- Every new standalone turn begins with a server-verified Supabase principal and root; the customer input is durably stored before cognition.
- A hashed append-only PROCESSING receipt links to the exact original user message identity and hash before starting cognition.
- The assistant text and the model cognition event must independently read back and match the owner root.
- A distinct COMMITTED receipt binds user entry+hash, PROCESSING receipt+hash, assistant entry+hash and cognition entry+hash.
- Only a fully re-verified COMMITTED receipt allows a successful customer reply, including any idempotent replay; mismatched content on the same turn ID returns a conflict.
- Failures produce an INTERRUPTED receipt when possible; sudden process crashes are still visible as RECEIVED, PROCESSING or RESPONSE_STORED_UNCOMMITTED from the surviving immutable records.
- Existing replies missing a COMMITTED receipt are withheld from the history UI. The customer message remains visible as unresolved evidence.
- Client records the pending turn ID in session storage (no password or text) and offers an explicit Check interrupted turn action instead of blindly issuing a new turn ID.

**Explicit limitations:** A stalled turn currently requires manual reconciliation; automatically resuming an in-flight model call cannot be proven safe from a simple timeout. Per-conversation linearizable sequencing across two distinct turn IDs is not yet implemented. Scanning a bounded last-60-message history is not a complete active obligation index. There is no independently verified live-auth and live-database test while Supabase email login remains unresolved.

## Main Universe schema comparison (read only)
- Main project qkzvjfiegihyaoabiniy: service_role BYPASSRLS and broad table grants; no row or truncate mutation-reject triggers. Has RLS with service-only policy, which does not make service_role immutable.
- Main Universe had 2 rows at inspection; no invalid provenance shapes, evidence array shapes, SHA-256 digest formats or empty roots.
- Benchmark project hvkfreoagbrphwghjajw: service_role table permissions SELECT/INSERT, triggers denying UPDATE/DELETE/TRUNCATE, RLS on. Had 17 valid rows.
- Review-only alignment SQL: docs/migrations/REVIEW_ONLY_main_universe_append_only_v0.1.sql. This file is intentionally NOT in an auto-applied migration directory.

## Required release protocol for #2
1. Explicitly review and authorize any production DB permission change. No user input is needed to maintain the current isolated migration draft.
2. Stage the SQL in a disposable/controlled copy and verify old production read+append behaviors. Verify forbidden UPDATE/DELETE/TRUNCATE are denied, including service_role, and verify existing rows remain intact.
3. Run a preflight audit and record existing grants, RLS, triggers, row counts, hashes and point-in-time backup. Audit integrations expecting UPDATE/DELETE first.
4. Apply in a short controlled window only after approval. Independently read back the triggers/grants/check constraints and re-run append/readback on a synthetic entry. Do not touch current customer rows.
5. Watch errors and provide an explicitly authorized rollback if needed; rollback would weaken immutability and must never silently happen.

## Pre-live adversarial recovery suite (#3)
- Simulated interrupted model: user and PROCESSING receipts survive, repeated turn does not re-run model.
- Simulated failed final commit: response exists internally but is not published, visible history shows only user intent.
- Simulated interruption logging failure: PROCESSING state remains independently discoverable.
- Tampered/missing cognition and orphaned processing receipts fail closed.
- Same turn_id concurrency: only one contender may reach model cognition.
- Cross-user identity collision: same conversation and turn IDs remain isolated.
- All tests use stubs; long-horizon commitments beyond the 60-message window and distinct-turn concurrency still need architectural work before a 100-turn accuracy claim.

**No measured production drift or hallucination rate has been established by these synthetic checks.**