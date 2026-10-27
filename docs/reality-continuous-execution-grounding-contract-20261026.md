# Reality — continuous goal grounding at the execution seam

Experimental PR #140 only · 2026-10-26 · No production promotion, paid model calls, benchmark restart, new Supabase goal table, or provider-side action.

## Foundational rule

A provider write cannot be considered reliably governed merely because the model remembered a past instruction, an assistant reviewer returned "aligned", or a signed action-approval HMAC is still valid. The **current verified user goal** and the **specific action approval** are distinct evidence streams. Both must be checked with the same authenticated principal and scoped Continuity before the provider is invoked. Confirmed external effects require a separate independent readback.

## What is implemented in this slice

`src/reality-execution-goal-grounding-v0.1.js` exports two pure deterministic contracts:

1. `bindWorkToAuthenticatedGoal`: snapshot an active, source-linked user-confirmed goal, its user-message source ref, last transition receipt and revision, world/root, verified principal and SHA-256 work-item fingerprint. Returned binding does **not** itself authorize anything.
2. `compareFreshAuthenticatedGoalForWork`: compare exact work fingerprint, principal, world/root, active goal/source, transition receipt and revision to a **newly** projected authoritative goal state. If anything is missing, stale, mismatched, paused, abandoned or reported complete, return `BLOCKED`. A matching result explicitly retains `grants_external_execution:false` and `semantic_alignment_independently_verified:false`.

Ten no-cost test cases exercise exact work, lost/changed authority, stale revisions, user/world crossing, unsupported state, and absence of verified readback.

These are **pure logic contracts**, not a live verifier, authentication endpoint or completion of the generic execution integration. A JavaScript object claiming `authority_source` has NO cryptographic meaning absent server-side authenticated Continuity readback. Do not accept client, assistant, reviewer, or generic-cookie-supplied goal state as trusted input.

## Remaining integration — necessary before live execution claim

1. On an authenticated preview execution path, obtain Supabase identity via the existing `authenticatedChatSession`, derive the same world/root from **server-authenticated** `user_id` + `conversation_id` as `api/reality/personal-goals.js`. Require Origin protection for state-changing requests.
2. Independently reconstruct Continuity from the isolated scoped database, then call `projectAuthoritativeUserGoals`; do not trust a supplied projected state, self-asserted user ID, client goal ID or saved assistant summary.
3. At the user's **separate exact-work action authorization** step, bind the approved immutable work fingerprint and source-attested goal snapshot under the same Supabase principal. The existing generic `reality_principal` cookie cannot be presumed to identify this user; policies relying only on that cookie are not an authenticated goal bridge. No automatic grant from a chat-goal command.
4. Immediately before the provider side effect, reconstruct the **fresh** scope's Continuity and call `compareFreshAuthenticatedGoalForWork`. Require BOTH a fresh matched goal binding and the previously hardened exact-work action proof. An assistant proposal does not become the user goal; a paused parent cannot silently replace the current active detour.
5. Fail closed for missing readback, invalid scope, changed work, stale revision, suspended goal, ambiguous identity and provider-unavailable states, with a source-linked `BLOCKED` receipt. Do not represent a zero-alert semantic reviewer as drift-free.
6. Preserve the independent post-action Verifier and append resulting observations to Continuity. Execution attempt, provider acknowledgment and independently verified business outcome remain different states.

## Concurrency and security limits

The contract compares *snapshots*. It does NOT provide an atomic transaction spanning a database goal change and an external GitHub/Vercel/Supabase write. A safe runtime still needs a serialized execution admission/reservation or a durable idempotency/lease and cancellation/reconciliation protocol; a 60-second signed approval proof is replayable without such a lease. Neither a goal hash nor a correct principal proves the *meaning* of proposed work. Inspect proposal alignment in the existing semantic/Integrity path, then independently grade held-out conversational drift before making reliability claims.

The frozen founder benchmark remains at 21 real-model turns and stays paused until separately authorized. PR stays DRAFT.
