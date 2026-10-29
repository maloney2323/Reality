# Reality — one user-goal authority contract, not another guardrail stack

Date: 2026-10-25. Experimental **draft PR #140**. No benchmark/test execution, paid LLM requests, Supabase schema changes, production deployments, or customer actions initiated with this implementation.

## Engineering decision: Node.js + existing Continuity first; no new goal tables yet

Reality already has an append-only, source-linked Universe / Continuity ledger. Duplicating `GoalState` and `GoalTransition` into new writable Supabase tables now would create conflicting authority and temporal semantics. First define the canonical runtime contracts and persist them as **typed events in the existing Continuity chain**. Only consider a normalized SQL projection or indexed view after lifecycle reconciliation is correct and storage/query requirements are demonstrated. Authentication/RLS must stay server-scoped.

## Three contracts implemented

`src/reality-goal-authority-contracts-v0.1.js` provides:

1. **`projectGoalStateContract`**: goal ID and user-source receipt from the *already persisted and recovered* working-goal projection; status `UNRESOLVED`, not falsely `ACTIVE`. Unknown boundaries/semantics stay uncertain. Bounded earlier evidence can remain recoverable via canonical ledger provenance.
2. **`projectGoalTransitionContract`**: records a transition proposal and source/user/reviewer refs, but **only** `PROVISIONAL`. A semantic review describing a user-authorized pivot is **not** an independently verified authorization. There is no `GRANTED` path from an assistant or a reviewer.
3. **`projectAssistantGoalProposal` and `enforceGoalTransitionBoundary`**: original Cognition response is an assistant proposal. A source-anchored reviewer-detected drift quote becomes typed `SHIFT_OBJECTIVE` with `authorized_by:ASSISTANT_PROPOSAL` and `authorization_state:UNAUTHORIZED`. The deterministic gate prohibits goal mutation and external execution. An absent or invalid semantic review means `NOT_SEMANTICALLY_ASSESSED`, never inferred alignment.

These types intentionally differ from a suggested interface using `USER` as an automatically approved transition: **the distinction between user-authored text and authenticated, semantically resolved authorization is essential.**

## Existing runtime integration

- **Before cognition:** `src/reality-live-intelligence-orchestration-v0.1.js` derives the working-goal contract from the same source-linked Universe/Continuity projection, embeds it in the existing *hashed canonical epistemic frame*, and gives Cognition that identical contract. `src/reality-canonical-epistemic-frame-v0.1.js` validates the goal/source/authority linkage.
- **After cognition but before release or execution:** existing semantic review provides a source-linked goal-direction **candidate**, from which the runtime builds a typed AssistantProposal, provisional GoalTransition and deterministic decision. This is **not** an additional LLM request or a detached post-display guardrail.
- **Pre-publication:** if the reviewer identified an unauthorized assistant-led shift, the existing bounded correction/re-review path can clear a corrected answer. If no corrected answer was cleared, a conservative, explicit request for user direction replaces the off-goal proposal. This does **not** mutate the user's active objective, send a message, or grant action rights.
- **Durable receipt:** the same append-only Continuity runtime records `ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION`, including model source, reviewer source, original goal evidence, typed transition/proposal/decision, and a readback check. No writable secondary user-goal authority table is introduced.
- **Inspectable UI:** authenticated personal chat and the preview UI surface the proposal gate's decision and source receipt. No reviewer result is presented as independent ground truth.

## Important engineering limitations

- **Detection is probabilistic, enforcement is deterministic.** Deterministic authorization checks can prevent **detected** model-origin goal changes from altering user-goal state. They **cannot** guarantee discovery of every implicit or gradual semantic drift. If the semantic review misses the deviation, the state remains protected from model-controlled mutations but the answer may still drift.
- Goal lifecycle is still **provisional**. The earliest user statement is an *original objective candidate*, not necessarily the real governing goal. Completion, abandonment, true supersession, multiple concurrent goals, and explicit signed user approvals require a further reconciled goal/obligation graph.
- The runtime path currently uses experimental/reliability configuration for semantic review. **Not all deployed chat/API pathways are proven to enforce the same semantic release boundary**.
- An LLM saying `USER_AUTHORIZED_PIVOT` is a hypothesis, not authorization; even an authentic user's quoted third-party statement cannot confer permissions.
- No external actions are authorized by the AssistantProposal and no outcome is marked completed without independent evidence.
- New Supabase SQL tables, optimistic token savings, enterprise SLAs and guaranteed drift elimination should not be claimed on this implementation alone.
- The user has explicitly paused new tests and benchmarks. **Code is intentionally not empirically verified in this pass**. Production is unchanged; the PR remains draft.

## Next architecture step, before lifting test hold

Resolve true user-objective identities and lifecycle operations (`ACTIVE/PAUSED/COMPLETED/SUPERSEDED/UNRESOLVED`) using authenticated source references rather than reviewer labels; represent simultaneous goals and obligations in the existing ledger; then make every consequential execution route independently check those authority receipts. Only after architectural completion should held-out genuine conversation grading establish true drift detection recall and false-positive rates.

