# Reality | Final conversational-direction release boundary

**Date:** October 26, 2026  
**Status:** Implemented on unmerged draft PR #140 for the isolated semantic-review preview. Production untouched. The founder's instruction to pause further paid/long-running benchmarks remains in force.

## User problem

An assistant can suggest an unauthorized direction in its own answer without changing the stored GoalState. Preventing goal-ledger mutation **does not** prevent a persuasive off-goal recommendation from appearing in the final chat response, where it might steer the user or corrupt future conversational history.

## Existing architecture; no extra guardrail service

The existing **Signal Cleaner → canonical epistemic state / Continuity → Cognition → semantic review → Integrity Spine → Publication** path now includes a final, source-linked publication gate:

- `src/reality-goal-governance-contract-v0.1.js`: `adjudicateFinalAssistantGoalRelease` reuses the existing immutable canonical frame and `buildAssistantGoalGovernance`. It builds and verifies one governance projection for the **original** LLM answer and one for the **actual candidate final** answer.
- Every specifically quoted `SHIFT_OBJECTIVE`, `SCHEDULE_FUTURE_WORK`, or `WRONG_TASK` candidate identified in the original review remains blocked until its exact wording is removed and the modified answer has a corresponding second review. A reviewer approving different text is not evidence.
- A second review that discovers an **additional unauthorized change in the rewrite** also blocks publication. A reviewed answer that explicitly fails the current user request is not treated as successfully aligned.
- A blocked candidate is **replaced** with a deterministic, user-source-linked explanation. The original off-goal answer does not survive with an appended cosmetic warning.
- Missing or incomplete goal review **is not reported as a pass**. When no *specific* unauthorized shift is supported by a source-linked review, a useful answer is preserved with an explicit `UNASSESSED`/`NOT_CERTIFIED` disposition, rather than being incorrectly classified as drift and suppressed.
- `src/reality-live-intelligence-orchestration-v0.1.js` checks release **after** the existing repair, completion/authority checks, ambiguous goal return and last-minute authenticated-goal freshness comparison. It writes `ASSISTANT_FINAL_DIRECTION_PUBLICATION_DECISION` into the same append-only Continuity spine, linking source-frame hash, original and final answer hashes, reviewer IDs, disposition and no execution. It verifies durable readback and checks the exact output hash at the common conversational/work return point.
- `api/reality/personal-chat.js` and the existing preview UI expose the release gate's decision and uncertainty, without claiming a measured drift reduction. Execution authorization remains separate.

## Decision contract

| Situation | Publication behavior |
|---|---|
| First answer contains a source-linked, quoted unauthorized goal change still present in final | **Block** and release deterministic explanation |
| Original off-goal quote removed, but revised answer has no review bound to exact revised text | **Block**; no cosmetic-warning pass |
| Revised text has a newly flagged unauthorized goal mutation | **Block** |
| Reviewer explicitly concludes final reply did not answer current user objective | **Block** |
| Recognized off-goal reply rewritten and the exact revision rereviewed without further goal conflict | Candidate release, **not independent proof of semantic correctness** |
| No identified off-goal proposal, but semantic review unavailable/partial | Preserve conversational answer, mark **unassessed/not certified**, never claim drift-free |
| Explicit user-owned detour or pivot followed by a relevant response | No automatic suppression merely because the topic changed |

## Limits and CI state

This enforces **detected, source-anchored** unauthorized redirection. It cannot guarantee that all off-goal meaning is recognized: the current semantic reviewer may miss a gradual diversion or overflag a legitimate recommendation, and its judgments are not independent accuracy measurements.

No new paid model calls or long-run benchmarks were launched in this implementation pass. Repository pushes automatically launched GitHub CI. At the time of checkpoint, the core contract checks passed, but the broader `offline` and `no-cost-contract` suites were still reporting failures. Several concern expectations for corrected or properly qualified semantic outputs. These need reconciliation before any merge or user-facing claims. Do **not** promote this branch or mark the drift detector ready.

Do not resume the paused 50-turn business benchmark until the remaining semantic detection/repair issues are addressed and the user explicitly requests testing again.
