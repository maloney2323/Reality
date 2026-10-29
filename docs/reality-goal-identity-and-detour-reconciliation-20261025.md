# Goal identity before stack unwinding — Reality PR #140

Date: 2026-10-25. Experimental branch only. Founder hold: **no new benchmark, model-spending experiment, or claimed drift improvement** before foundational implementation is complete.

## Decision

**Meaning-aware, source-linked goal identity/reconciliation comes before stack replay.** A stack without identity can "return" to an unrelated earlier objective, assume a temporary detour is finished, or treat the assistant's own recommendation as the user's new plan. The existing append-only Continuity Ledger remains canonical; do **not** add parallel authoritative Supabase goal tables.

## Current source-backed transition contract

1. Every user-channel utterance is evidence of **what was said**. It is not automatically a new authoritative goal or execution authorization. Earlier assistant suggestions are never user-goal sources.
2. Stable goal-evidence identifiers are scoped to a Continuity root/world and source turn. The original user-goal **candidate** is preserved outside the recent-message window.
3. The existing semantic reviewer proposes a `CONTINUING_USER_OBJECTIVE`, `USER_AUTHORIZED_DETOUR`, `USER_AUTHORIZED_PIVOT`, `USER_RETURNED_TO_OBJECTIVE`, or `UNCLEAR` interpretation. It **cannot independently grant authorization, complete a goal, assert user intent with certainty, or execute actions**.
4. A pivot or detour candidate may update a provisional working focus **only if the reviewer cites the current user-turn source**. If it cites an old unrelated turn, the transition remains `UNRESOLVED_SOURCE_LINKAGE`; the earlier working goal remains unchanged.
5. A detour candidate receives a **provisional parent → child relationship** pointing to the previously active user goal. A pivot is an alternate working focus, not an inferred permanent abandonment of earlier objectives.
6. Returning to an earlier goal requires an exact source-linked earlier user goal reference that is still a known original/paused candidate. Do not blindly pop the newest paused task. If the target is unknown or missing, preserve the current focus and flag unresolved.
7. Returning to prior work does **not** prove the detour was completed or abandoned. Preserve that interrupted task as a recoverable, provisional candidate.
8. Earlier paused-goal source references reconstructed from the existing ledger are eligible for semantic review even when their raw chat messages are no longer among the last eight user directions.
9. Every such relation is a **reviewer interpretation** linked to a canonical pre-generation frame and Continuity verification receipt, and must remain provisional. **No reviewer finding can authorize a goal mutation in the authoritative sense or an external action.**

## What this implementation changed

- `src/reality-user-goal-continuity-state-v0.1.js`: goal focus transitions now require precise current-user and earlier-target source relationships; ambiguous changes are recorded as unresolved; detours are kept as provisional parent-child candidates; interrupted tasks aren't discarded after a return.
- `src/reality-goal-authority-contracts-v0.1.js`: the existing `GoalState` projection exposes source-linked provisional `parent_id`, with explicit nonverification, and never elevates it into authority.
- `src/reality-semantic-review-v0.1.js`: semantic reviewer gets stricter existing-call instructions on multiple goals, explicit current-user pivot sources, earlier-user resume targets, and the prohibition against treating assistant-proclaimed completions as completed user goals. Legitimate paused-goal source IDs from Continuity are added to reviewer reference validation.
- No new judge model, database, or API route; no changes to customer production.

## The next missing semantic contract (DO NOT claim completed)

The current reviewer output still does not provide an independently resolved *goal identity* or a safe `COMPLETED / ABANDONED / SUPERSEDED` lifecycle transition. Those must be explicit in the same underlying state model, with these meanings:

| User statement | Proposed relation | Acceptable state without additional evidence |
|---|---|---|
| "Keep working on the construction pilot" | CONTINUE, target previously identified pilot goal | Preserve prior active objective |
| "Check marketing briefly, then return" | TEMPORARY_CHILD, new task, parent pilot goal | Provisional detour; parent recoverable |
| "For now prioritize login recovery" | ALTERNATE_FOCUS, new task with source link | Prior objectives preserved; no abandonment |
| "Return to the paid pilot" | RESUME, referenced earlier pilot goal | Only resolve if source-linked target exists |
| "We're finished with the pilot" | POSSIBLE_USER_REPORTED_COMPLETION | User-reported status, not independent proof of completed customer work |
| "Stop that effort permanently" | POSSIBLE_USER_REPLACEMENT/ABANDONMENT | Requires exact target, scope, later correction checks; never infer external execution |
| Assistant: "Build a consumer product instead" | ASSISTANT_PROPOSAL | No user goal mutation; only a proposal requiring user decision |

The future semantic relation contract needs stable `target_goal_id`, `parent_goal_id`, `current_user_source_ref`, `relation_type`, `ambiguous_targets`, `completion_is_user_report_vs_verified_outcome`, and exact source frame hash and reviewer receipt. Deterministic code validates identities and allowed status transitions; probabilistic semantic interpretation must still be treated as provisional unless a separate actual user confirmation resolves ambiguity. Do not turn confidence scores into authorization.

**Important limitation:** evidence immutability, hashes, and strict state transitions prevent silent or unauthorized *mutations*; they do **not** mathematically guarantee correct understanding or zero conversational drift in fluent text. The assistant's longitudinal proposed work must still be checked against the user-goal graph, and corrected before release. No claims of "drift eliminated", guaranteed ROI, exponential token compression or enterprise SLAs follow from this architectural slice.

## Hold / release conditions

Do not resume the paused founder 50-turn test until the user authorizes tests again. Continue implementing source-linked goal/obligation identity, explicit completion and supersession semantics, outcome-reconciliation boundaries, and actual assistant-proposal-to-goal alignment before requesting renewed measurement. This changes neither production nor the historical benchmark evidence.
