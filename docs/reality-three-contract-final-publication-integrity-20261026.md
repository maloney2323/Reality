# Reality — Three goal contracts bound at final conversational publication

**Date:** 2026-10-26. **Scope:** experimental draft PR #140, Node.js integration only. No new Supabase tables, manually executed tests, paid model runs, or production rollout in this change.

## Selection and rationale

The three structures proposed by the founder's architecture discussion already exist in this repository:

1. **GoalState** is projected from canonical Continuity by `projectGoalStateContract`; explicit user-authorized goals use the distinct `projectAuthoritativeUserGoals` HMAC-attested RLS-message source path, with an authoritative source-linked relationship graph. Reviewer-inferred working goals are separately provisional.
2. **GoalTransition** is projected by `projectGoalTransitionContract`, and actual authenticated commands are persisted via `appendAuthenticatedUserGoalCommand`. User-controlled conversation goal changes never grant connector execution authority. The existing SQL atomic-publication migration is **not** equivalent to separate GoalState or GoalTransition tables.
3. **AssistantProposal** is generated from the first untrusted model answer and its existing semantic review by `projectAssistantGoalProposal`, then the deterministic `enforceGoalTransitionBoundary` refuses assistant-origin goal mutations. The existing `adjudicateFinalAssistantGoalRelease` checks source-linked off-goal quotes against the final answer and withholds unresolved known violations.

Creating new independently writable Supabase tables for these contracts would risk two competing authoritative goal histories. The canonical source remains Reality's append-only Continuity/Universe events and user-command authority adapter.

## Added precise integration

Added `compileGoalPublicationIntegrityProof` in the **existing** `src/reality-goal-governance-contract-v0.1.js`, called in `src/reality-live-intelligence-orchestration-v0.1.js` **after** choosing the actual final response and **before** persisting or returning that final response. It checks:

- The controlling user-goal contract exactly matches the goal in the canonical frame and world.
- The goal-transition contract belongs to the current user turn and cannot assert `GRANTED` authority.
- The assistant proposal and deterministic mutation rejection refer to the SAME goal ID and turn, and neither may authorize goal mutation or external execution.
- Any assistant-origin goal mutation remains typed `UNAUTHORIZED`.
- The final direction gate binds to the exact original model answer hash and canonical frame.
- A rejected final answer is replaced by the **exact source-linked deterministic withholding notice**, not a new free-form model claim dressed as a notice.
- A mid-generation explicit user-goal transition must result in a stale-goal withholding answer; otherwise the final content is refused.
- The resulting proof binds the original and released answer hashes, user goal source/receipt (if available), assistant proposal ID, rejected mutation count, and final decision hash.

The `ASSISTANT_FINAL_DIRECTION_PUBLICATION_DECISION` event now retains this **three-contract proof** as part of its existing durable Continuity receipt; readback checks match its proof hash and actual published answer hash. The authenticated private-chat route and its UI disclose whether the three contracts were structurally bound, always stating that model semantics are not independently proved. No second semantic reviewer call or new database was introduced.

## Non-claims and unresolved work

- A SHA-256 hash binds recorded content to the server-generated contract; it does **not** constitute an independently attested user signature or cryptographic proof of external customer action. The existing authenticated user-command HMAC and RLS verification are distinct.
- Deterministic enforcement can reject known, classified, quoted unauthorized goal proposals. It cannot prove absence of goal drift the semantic reviewer **failed to identify**. A zero-alert turn remains unvalidated.
- A recorded user objective is not a verified task completion. Sending estimates, payments, email, deployments and other consequential business actions still need separate independently verified authorization.
- The user suspended further tests until foundational conversational drift works. This implementation was authored without running a new benchmark or test suite. **No success rate or runtime verification is claimed.**
- Final readiness still depends on meaning-aware user-goal reconciliation and reliable detection of subtle multi-turn assistant-led divergence before release; this contract strengthens *structural containment and auditability* rather than semantic recall.

**No production changes. PR #140 remains a draft.**
