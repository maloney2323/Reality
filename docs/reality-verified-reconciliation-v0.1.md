# Reality verified causal-turn reconciliation v0.1

**Status:** DRAFT / REVIEW ONLY. Tested with synthetic providers and in-memory persisted receipts. The SQL migration has **not** been applied to Supabase. No Vercel preview redeployment, production release, Base44 change, or paid model invocation.

## Recovery is not replay
A lost network response or process termination can leave the conversation fence BUSY after the customer's assistant response, continuity event and COMMITTED receipt are durably stored. The operator can retry *confirmation of the existing result* using the new authenticated `POST /api/reality/standalone-reconcile` endpoint.

The server derives principal/root from verified Supabase Auth and accepts **only** `conversation_id`, optional `thought_id`, and `turn_id`. It never accepts caller-provided authority, original text, model answer, database hash or recovery override.

1. Validate the existing customer message, PROCESSING receipt, assistant message, cognition event and COMMITTED receipt, including the predecessor chain and hashes.
2. Check the root-scoped atomic fence. Another active turn, absent fence or older historical turn is a hard conflict.
3. Run `reality_reconcile_committed_conversation_turn` only for a valid COMMITTED turn. The SQL locks the row, revalidates principal, current active turn, stored COMMITTED, all four evidence rows, sequence and predecessor, and atomically transitions the fence to IDLE.
4. Read the fence back and re-check the COMMITTED evidence. Return the **already persisted reply** without generating a second model response, repeating an external action, or modifying the original response.
5. An immediately repeated recovery request is idempotent only if it refers to the *current most recent* commit. Old turns cannot reset a later fence.

## Incomplete work stays visible and blocked
If only RECEIVED, PROCESSING, INTERRUPTED, or RESPONSE_STORED_UNCOMMITTED survives, reconciliation returns `REVIEW_REQUIRED`, **does not release** the fence, and never invokes cognition or execution. A separate controlled policy for abandoned/in-flight work and external side-effect reconciliation is still required. The new UI shows a recovery control after the user checks an unresolved fence; it cannot silently turn a partial response into COMMITTED.

## Release gates
- Review the **unapplied** `docs/migrations/REVIEW_ONLY_benchmark_conversation_sequencer_v0.1.sql` and independently prove RPC/table role grants and transaction isolation on the separate benchmark Supabase project.
- Keep `REALITY_CAUSAL_SEQUENCE_ENABLED` absent or false until staging verification. The recovery endpoint refuses invocation while disabled.
- Exercise verified COMMITTED-but-fence-busy, interrupted-before-cognition, missed finish-RPC acknowledgement, forged principal/root/hash, concurrent same-turn recovery, next-turn conflicts, and cross-user isolation against real staging data.
- Only enable Preview branch after separate authorization and after checking the existing email-confirmation blocker; never enable production implicitly.

**Not yet proven:** real Supabase transactional recovery, safe release of incomplete/abandoned work, real external side-effect idempotency, or long-horizon obligation persistence. Synthetic green checks must never be advertised as a live reliability benchmark.
