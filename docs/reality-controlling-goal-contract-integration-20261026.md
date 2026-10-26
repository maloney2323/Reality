# Reality: one controlling user-goal contract through Cognition and Integrity

Date: 2026-10-26. Draft PR #140, experimental only. No paid benchmark or production deployment performed as part of this integration.

## Architectural issue

Reality already has explicit, HMAC-attested, RLS-backed user-goal commands in the existing Continuity event stream, and separately has a reviewer-derived provisional goal projection. The pre-generation Cognition payload preferred the explicitly authenticated user-goal record, but the later `buildAssistantGoalGovernance` integrity receipt read only the provisional projection from the canonical epistemic frame. This could produce two *different* reference goals in a single turn.

That violates the user's requirement that assistant proposals never silently override a user-authorized objective, and that the same controlling state drives the entire conversation/execution boundary.

## Code change

- `src/reality-canonical-epistemic-frame-v0.1.js`: includes `controlling_user_goal_state_contract` in the **existing** canonical frame. If authenticated user-goal state has an active goal, the contract must match its exact goal ID, original user-message reference, last authorized transition receipt, world and no-execution authority; otherwise the provisional goal must remain clearly unauthenticated. The existing `user_goal_state_contract` remains visible *as provisional evidence only*.
- `src/reality-live-intelligence-orchestration-v0.1.js`: passes the same `controllingGoalStateContract` into the persisted canonical frame that Cognition and the pre-output assistant proposal verifier already use.
- `src/reality-goal-governance-contract-v0.1.js`: the post-output Integrity contract now rejects any fallback to a reviewer-derived goal when an independently authenticated active user-goal record exists. Its goal ID, source attribution and status refer to the same controlling goal used pre-generation.
- `src/reality-semantic-review-v0.1.js`: source validation now accepts references from independently authenticated user-goal commands even when the originating user statement is no longer in the bounded chat window. It still rejects assistant-authored goal authority.

## Separation of concerns

- Authenticated **user action** can create a conversational goal command; source must come from server RLS message readback + existing signature/integrity checks.
- Semantic reviewer and Cognition may **propose** a new objective; they never grant authorization or perform an external action.
- Append-only Continuity is the one source of state; no new Supabase goal tables were created.
- No keyword filter or second reviewer was added. No externally consequential action was enabled.

## Honest acceptance status

No new paid or live-model test was performed. GitHub automated checks on this draft branch continue to show four passing jobs and two failing offline suites. The same two offline suites **were already failing at parent SHA `bd16f38cb94172b2e59d72d0f7b502428911d741`**, before this particular integration. This patch is NOT established to have fixed those failures, nor is it established to improve drift recall.

**Remaining substantive gaps:** handling an authenticated ledger explicitly containing *no* active goal (pause/abandon) without promoting a provisional goal; meaning-aware lifecycle reconciliation across simultaneous projects; authoritative user goal scope and publication race coverage; actual pre-release correction of gradual drift; and human-established false-negative/false-positive rates. These are separate from the completed controlling-contract consistency patch. The PR remains draft; continue the founder's explicit pause on benchmarks and avoid production changes.
