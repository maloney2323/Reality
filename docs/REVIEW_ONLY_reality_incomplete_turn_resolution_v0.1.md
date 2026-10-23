# REVIEW ONLY — Reality Incomplete Turn Resolution v0.1

**Scope:** isolated Reality Preview only. **No SQL migration applied. No API mutation endpoint deployed. No processing fence released.** This contract describes a proposed reviewed, explicitly authorized workflow.

## Proven starting state (2026-10-23)

- The authenticated chat recovered its saved construction intent, including the homeowner approval requirement.
- The current Preview owner-authenticated recovery review returned `INCOMPLETE_TURN_REVIEW_REQUIRED` with saved user + processing + interruption receipts and NO verified assistant completion. Provider outcome cannot be established.
- A separate earlier interrupted turn has a saved user message but no processing or interruption receipt, and **must NOT** automatically enter the abandonment workflow.
- The isolated database had two active processing fences. Neither is evidence of a verified completed model response.

## Lifecycle separation

1. **OBSERVED**: The Universe preserves the original user assertion and immutable, individually hash-validated receipts.
2. **INTERRUPTED**: The causal-turn monitor identifies incomplete processing; never presents generated output as COMMITTED.
3. **REVIEW_ELIGIBLE_NOT_AUTHORIZED**: A pure deterministic proof checks durable user and INTERRUPTED receipt, absence of assistant/COMMITTED receipt, and exact owner-root active fence. This **does not** grant release authority.
4. **OWNER_APPROVAL_REQUIRED**: A signed-in owner reviews the original message, last known stage, and uncertainty. Confirmation text must explicitly state model execution may have happened and costs may have occurred. The authorization is a new intentional action; neither "Send" nor "Retry" implies it.
5. **ATOMIC_ABANDONMENT_PROPOSAL**: A separately reviewed server-only transaction must append an immutable `REALITY_TURN_RESOLUTION_RECEIPT` (`ABANDONED`, never `COMMITTED`) and clear exactly the matching active fence. A single transaction must check the exact owner, root, turn, original claim sequence, saved user hash, INTERRUPTION receipt hash, and **absence of assistant or COMMITTED receipts** while holding a row lock. If anything changes, roll back all changes.
6. **SEQUENCE CORRECTION**: The current SQL increments `sequence_num` during claim, BEFORE a COMMITTED entry exists. On explicitly abandoned uncommitted claim N, set the fence sequence number back to the last committed index N-1 in the SAME atomic transaction. Keep the last committed pointer and its hash unchanged. For genesis N=1, the resulting index must be 0. On the next claim it increments to N and can pass the existing predecessor contract. Do not fake a COMMITTED receipt for an abandoned turn.
7. **INDEPENDENT READBACK**: The server must independently verify the immutable resolution receipt hash, exact-fence IDLE status, unchanged last-committed pointer/hash, expected sequence index and NO assistant publishing before acknowledging success. A crash before the post-transaction HTTP response must be resolved by readback, not a second resolution write.
8. **PERSISTENT HISTORY**: Read-only history and the Continuity Ledger must report the original user instruction with `ABANDONED_AFTER_REVIEW` status; it is no longer an active unresolved processing slot. The system should preserve the original instruction's content and its safety conditions. Do not rewrite or delete the earlier message.
9. **NEXT NEW TURN**: Only after all above checks pass may a separate NEW turn ID be created. Never retry the abandoned turn ID, and never silently reuse a possibly billed call.

## Hard blocks

- Production or any application with outside-world action capabilities.
- No durable INTERRUPTED receipt; older first failure remains manual investigation only.
- Existing assistant message but no final receipt; review for verified completion instead.
- Existing COMMITTED causal receipt; run the existing strict reconciliation contract instead.
- Wrong owner, wrong root, changed fence, missing predecessor proof, unverifiable ledger hash, any different-turn active fence, or unknown provider side effects outside the isolated Preview.
- Automatic lease expiry, generic timeout, or direct manual `UPDATE ... active_turn_id=NULL`.

## Required implementation before enabling

- A preview-only, owner-authenticated, CSRF-resistant approve endpoint with fresh session validation and an explicit second confirmation, never authority from arbitrary client IDs.
- A reviewed SQL migration with a SECURITY INVOKER, `service_role`-only RPC and transactional receipt + fence update; enable RLS/privileges appropriate for the isolated schema. Client browsers never receive the service key.
- Server and SQL enforce the exact same predicates and hash references independently. The database transaction is authoritative.
- New `ABANDONED_AFTER_REVIEW` lifecycle in status/history and the persistent Continuity Ledger. No fake completion.
- Idempotent responses to network replay, concurrency race tests, cross-account tests, stale review and changed evidence tests, exact predecessor chain tests and rollback tests.
- Controlled Preview authorization, independently checked pre/post database counts, then one NEW construction test turn. Separate explicit approval for any actual change to the two existing locked turns.

## Release evidence

A passing pure plan test is **not** a SQL transaction, not a recovery receipt and not permission to clear a fence. The preview's existing two busy locks remain until the transaction, security boundaries, and owner decision are independently verified.
