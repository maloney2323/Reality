# Reality's native Goal, Transition and Assistant Proposal contracts

**Experimental architecture checkpoint — Oct 25, 2026.** Branch `experiment/reality-live-durable-adversarial-20261025`, draft PR #140. **No new paid model calls, user business actions, Supabase schema changes, test runs or production release** as part of this checkpoint.

## Decision: Node.js state/authority contract first; no competing Supabase tables

Reality already has an append-only, provenance-linked Supabase Continuity ledger and a canonical epistemic frame. The proposal to add separate GoalState and GoalTransition tables should **not** be implemented until an identity, reconciliation and authorization contract is stable. Otherwise an assistant's speculative goals can turn into an accidentally independent source of truth.

Reality's current `user_goal_continuity_state` and `user_goal_lifecycle_projection` serve as the **Goal State** evidence projection. This is not yet a fully reconciled multi-goal graph: initial objective, relevant newer user turns, and paused/working states remain source-linked and explicitly provisional.

## Implemented: GoalTransition contract

Added `src/reality-goal-governance-contract-v0.1.js` with `createGoalTransitionContract`:

- Stable transition digest, goal, root/world, originating canonical-frame hash, proposed source, source user ref, from/to state, detour/permanent/unresolved context, duration candidate and assertion time.
- The source may be `USER` or `ASSISTANT_PROPOSAL` but source identity alone **never establishes authorization**.
- **Assistant proposals are always UNAUTHORIZED to mutate goals**; user-sourced proposed transitions remain **PROVISIONAL**. Even a hypothetical future goal authorization would not grant a separate connector or customer-action authorization.
- User-supplied `verified:true` or `issuer:'AUTHENTICATED_USER_INTENT_VERIFIER'` are not credentials. The runtime intentionally has **no path to GRANTED** before a separate user-sourced, scope-bound, independently authenticated and anti-replay transition authorization mechanism is implemented.
- Model-detected suggested goal changes use `UNRESOLVED` from/to state. They never silently pause or replace an active goal.

## Implemented: AssistantProposal + deterministic invariant

`buildAssistantGoalGovernance` derives a typed, untrusted proposal from the original model response, existing structured semantic review and **same canonical frame used for cognition**:

- Source-bound working user goal (provisional), current user source and model-output proposal.
- `SHIFT_OBJECTIVE` **candidate** with verbatim model quote only when the current semantic reviewer reports `ASSISTANT_DRIFTED_OFF_OBJECTIVE`, the quote actually occurs in the answer, and its linked goal source exists in the canonical user-goal evidence; user-authorized detours/pivots are not automatically flagged.
- A model's suggested or reviewer-identified shift is evidence of a **possible** assistant goal proposal, **not** semantic proof that the user drifted or that permission exists.
- `verifyGoalGovernanceBeforeStateMutation` checks canonical root/world and full contract digest, plus the proposal frame binding; rejects any claimed mutation or execution authority. No string-based or LLM-based flag can grant execution.
- `state_mutation_allowed:false` and `external_execution_authorized:false` are asserted by this read-only path; **it does not call any executor or mutate the canonical state**.

## In-context runtime integration

The existing `runLiveIntelligenceOrchestration` now:

1. Captures the original model response before existing semantic correction.
2. After the original reviewer and bounded correction, materializes this one goal-governance contract, with both raw and final output disposition. No additional LLM call.
3. Deterministically denies assistant-origin goal mutations; links proposal to canonical frame and exact source hashes.
4. Appends a `MODEL_GOAL_PROPOSAL_GOVERNANCE` **verification** event to the same Continuity spine with proposal, blocked mutation, original source frame, reviewer receipt and correction disposition, and requires matching database readback in durable Preview. The event is **not** a GoalState transition, and does not authorize any action.
5. Returns the contract status through the existing authenticated chat API, displaying a distinct **goal transition blocked / no proposal / not assessed** status in the preview UI, without conflating it with semantic goal-alignment confidence.

Existing execution bridge still separately requires governed action authorization and independent outcome verification. The new contract is integrated in the current orchestration route **only**; it is not proof every legacy API entry point is wired identically.

## Critical caveats and next implementation work

1. **Meaning detection remains probabilistic.** This deterministic boundary can prevent assistant proposals from *changing stored authoritative goals*, but cannot mathematically guarantee catching all subtle conversational drift or output misinformation.
2. **Goal lifecycle authorization is not finished.** Build real source-bound authorization at the server channel boundary, with immutable scope and a confirmed target goal ID; do not treat a semantic reviewer label as user authorization. The provisional goal lifecycle is for context, not authority.
3. **No contract for independent automatic execution authorization was added.** Model cognition can propose, user must explicitly authorize a matched consequential action through the existing execution bridge.
4. **A candidate may still appear in conversational text.** The existing semantic revision/re-review can rewrite a flagged proposal, but a failed/partial reviewer cannot establish semantic correctness. Further source-backed pre-release reconciliation is required before claiming conversational drift elimination.
5. **Avoid an additional Supabase goal table until contracts stabilize.** Later, if operational query requirements justify materialized goal views, project them from the same append-only ledger with proper RLS/user scope, never as separately writable model-owned truth.
6. **Testing remains paused per founder instruction.** No new benchmark, no manual CI/test invocation, and no production deployment. The code is an **unverified draft implementation**.

## Suggested final contract relationship

`Signal Cleaner source receipt → canonical goal evidence / lifecycle projection in Continuity → LLM AssistantProposal (untrusted) → Verifier & Integrity GoalTransition evaluation (read-only, no authority) → bounded semantic repair and re-review → same Continuity governance receipt → separately authenticated action authorizer and independently verified executor.`

**No success, competitive, ROI, cost compression or hallucination/drift-reduction claims are supported by this architecture change alone.**
