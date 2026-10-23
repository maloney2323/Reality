# Reality causal sequencing v0.1 — review gate

**State:** coded and simulated in draft PR #87. Not enabled in Vercel Preview or production. No database migration was applied. Existing Base44 remains untouched.

## Why a distinct-turn sequence fence is required
The original immutable Causal Turn Commit prevents duplicate execution with the **same** `turn_id`, but does not prevent two different `turn_id` values from reading the same continuity state concurrently. Process-local mutexes do not help across serverless instances.

## Implementation
- `src/reality-conversation-sequencer-v0.1.js`: server-side RPC adapter for the benchmark Supabase project. Authentication and owner-root derivation are still performed before calling this adapter. Dedicated preview secret required. A production runtime is rejected.
- `docs/migrations/REVIEW_ONLY_benchmark_conversation_sequencer_v0.1.sql`: **unapplied** database table and two SECURITY INVOKER RPC functions. `claim` serializes on a row-level lock, verifies owner and worldline, increments the per-root monotonic sequence and reserves one turn ID. `finish` requires an immutable COMMITTED Universe receipt with exact root, user, sequence and previous commit identity/hash.
- `src/reality-causal-turn-commit-v0.1.js`: when explicitly activated, claims before writing a user message and finalizes only after user, processing, assistant, cognition and COMMITTED receipts independently read back. Every new sequenced COMMITTED receipt includes the preceding committed receipt ID/hash and strictly increasing sequence number; readbacks verify the predecessor.
- An interrupted active slot never auto-expires. A timeout could hide model work that did execute. Every other turn for that owner-root gets a conflict until verified reconciliation; no automatic rerun or silent replacement.
- `GET /api/reality/standalone-turn-status` and authenticated history withhold a seemingly committed answer if the atomic fence for that turn is still unresolved.

## Deliberate activation barrier
`REALITY_CAUSAL_SEQUENCE_ENABLED` must be `true` for this new mechanism to run. It is **unset** for the existing preview. Current behavior therefore retains its previous distinct-turn concurrency limitation until this SQL is independently verified and the flag is scoped to the dedicated preview branch. Production mode is denied inside the adapter.

## Before enabling, verify in the ISOLATED benchmark only
1. Review and apply the SQL migration to the benchmark project, not the main Universe.
2. Check API function EXECUTE privileges: only `service_role`. Ensure `anon` and `authenticated` cannot directly access the fence table or RPCs.
3. Validate the pinned project and Vercel branch key. Never copy a production secret or create a generic all-preview key.
4. Test distinct-turn simultaneous claims from independent runtime instances. Only one can succeed; the other must see BUSY before user write/model call. Verify commits link to the predecessor with exact hash.
5. Test crash after claim, after user message, after cognition, after COMMITTED, and lost finish-RPC response. Fences remain blocked until a separately designed human-authorized reconciliation routine repairs them.
6. Test identity-swapped root and owner, forged COMMITTED hash, missing predecessor, and duplicate exact turn. Zero access or publication on mismatch.
7. Only after real database tests, consider enabling the Preview-only flag. Never set the flag in Production.
8. Leave the existing Supabase email-login issue independent of sequencing; no live chat end-to-end proof is claimed by synthetic tests.

## Remaining limitations
- The database schema and REST RPC behavior have **not** been exercised against live Supabase in this phase.
- A crashed claim is deliberately fail-closed; a durable manual reconciliation procedure is not implemented. This prevents silent drift but could block the conversation until repaired.
- Long-horizon user commitments still need a persistent active-obligations index; reconstructing 60 messages is insufficient for the 100-turn drift target.
- Sequence receipt history is not a substitute for independent verification of real-world consequential actions.
