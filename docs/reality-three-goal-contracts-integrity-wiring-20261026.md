# Reality foundational goal contracts — Integrity wiring checkpoint

Date: 2026-10-26. Draft PR #140 only. The founder has paused further test runs until conversational-drift detection is properly architected. This checkpoint reflects implementation, not independently established reliability.

## Decision: existing Continuity substrate, not duplicate Supabase tables

Reality already has the three typed contracts and supporting source-linked user-authority machinery. Adding separately mutable `goal_state` and `goal_transitions` tables now would create competing sources of truth and risk desynchronization.

- **Goal State:** `src/reality-goal-authority-contracts-v0.1.js` projects the provisional working goal, parent candidate and provenance from the canonical Continuity ledger. `src/reality-authoritative-user-goal-ledger-v0.1.js` separately projects explicitly user-confirmed goals from authenticated, server-issued and read-back ledger commands. Authenticated goal state outranks reviewer inference.
- **Goal Transition:** `src/reality-goal-governance-contract-v0.1.js` models proposals and records `PROVISIONAL`/`UNAUTHORIZED`, never granting authority because the language model says the user agreed. Explicit authorized commands remain subject to the dedicated authenticated-goal adapter; a goal change never grants connector execution.
- **Assistant Proposal:** `src/reality-goal-authority-contracts-v0.1.js` and `src/reality-goal-governance-contract-v0.1.js` build source/quote-bound proposals from the first model answer and the SAME existing semantic review. The Integrity contract verifies no assistant proposal can mutate user-owned goal state.
- **Execution:** `src/reality-goal-execution-boundary-v0.1.js` is called by `src/reality-governed-execution-engine-v0.1.js` ahead of connector invocation. Structural goal-state mutations and direct writes to reserved goal/Continuity tables are blocked; separate scoped action authority and verified outcomes remain requirements.

## Integration change in this pass

Previously the final `buildAssistantGoalGovernance` Integrity contract admitted direct `ASSISTANT_DRIFTED_OFF_OBJECTIVE` candidates but omitted the existing reviewer's `future_goal_proposals` list. Thus a later strategic objective change or future-work scheduling proposal might be identified by an earlier review path yet absent from the final Integrity mutation manifest.

That gap is now closed inside `src/reality-goal-governance-contract-v0.1.js`: all source-anchored `SHIFT_OBJECTIVE` and `SCHEDULE_FUTURE_WORK` reviewer candidates are converted to **UNAUTHORIZED assistant-owned goal mutations**, bounded to eight candidates, with exact original-answer quote, real user-goal source reference, and no execution grant. `verifyGoalGovernanceBeforeStateMutation` examines every mutation rather than only a single direct shift. The existing orchestration/Continuity governance receipt and authenticated chat API convey this decision; diagnostic fields now distinguish future-work proposals and whether the same prohibited wording still appears in the released conversational response.

Importantly, **blocking state mutation is not equal to removing a bad sentence**. The receipt discloses when a model-proposed redirection still appears in text. The existing one-revision semantic correction path may attempt removal, but the current work does not prove correction accuracy. The model may still propose harmless ideas within a conversation; proposing an alternative is not the same as being authorized to change user goals or execute it.

## What this does not establish

- The semantic reviewer may miss subtle cumulative drift or mistakenly flag user-approved detours; neither a regex nor a single reviewer constitutes independent ground truth.
- This change does not prove every legitimate user pivot is correctly modeled. Goal lifecycle and parent/subtask identity must be reconciled from actual user evidence.
- A hash binding protects referential consistency within Reality; it is not cryptographic proof of an external outcome or universally verified user intent.
- Production is unchanged, PR remains draft. No Supabase schema migration, model credits, benchmarks, deployment, or new user tests were initiated with this work.
- No 0% drift or measured improvement claims are supported.

Next architectural decision: continue hardening the user-owned goal lifecycle/obligation graph and exact proposed-answer correction in the existing Continuity projection, followed by independent evaluation **only when the founder chooses to resume testing**.


## Authenticated user-goal lifecycle controls added (Oct 26)

A further source inspection found that `api/reality/personal-goals.js` **already** supports the full `SET_ACTIVE / START_DETOUR / RESUME / PAUSE / ABANDON / REPORT_COMPLETE` command contract. These events are issued only after session authentication, same-origin verification and exact Supabase RLS-backed user-message readback, then appended to the **existing** Continuity ledger. The basic UI had only exposed `SET_ACTIVE` and `RESUME` through goal controls, plus `START_DETOUR` through the chat selector.

`index.html` now exposes three additional explicit, user-confirmed choices: **Pause active goal**, **Abandon active goal**, and **Report goal complete (unverified)**. They use the existing dedicated API, never infer commands from the model or reviewer, and check that a source-linked transition was recorded. Pausing or ending an active goal does not silently reactivate an older goal; a completion report cannot independently attest real-world completion and grants no external action authority. Draft PR only. There were **no manual tests or model calls** during this additional UI implementation, consistent with the founder's pause on testing.

Still pending: semantic lifecycle correctness on complex multi-goal conversations and atomic database publication across simultaneous authorized goal changes. A proposed isolated-preview-only SQL migration exists at `sql/reality-atomic-goal-publication-v0.1.sql` but this pass **did not apply it**. Do not imply that the existing optional publication RPC is deployed or that cross-request atomicity is established. Production remains unchanged.

