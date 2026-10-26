# Reality — conversation exit is not business completion

**2026-10-25. Draft PR #140 only.** Founder-directed **NO MORE BENCHMARKS OR TEST RUNS** remains active. This change was written without triggering paid model requests, manual test execution, production database migrations, or production releases.

## Why this is part of the foundation

Language like “we're done discussing the pilot” can affect **conversation focus**, but cannot establish the pilot was actually delivered or sold. “I completed the pilot” establishes a **user report** of an outside event, not the event itself. Likewise an LLM asserting “pilot complete” is a **model proposal**, not an authenticated user command or independent completion receipt. Conflating these silently causes factual and goal drift.

## Typed reviewer proposal (existing semantic review call, not new judge)

The `goal_lifecycle_review` output uses a closed relation vocabulary:

| Relation | Speaker | Deterministic interpretation |
|---|---|---|
| `CONVERSATIONAL_EXIT` | CURRENT_USER | The user may change conversation focus; **does not** close the business goal |
| `USER_REPORTED_BUSINESS_COMPLETION` | CURRENT_USER | Records a source-linked `USER_REPORTED_OUTCOME_UNVERIFIED` candidate; **does not** mark external work complete |
| `USER_REQUESTED_ABANDONMENT` | CURRENT_USER | Records `USER_REQUESTED_STOP_PENDING_RECONCILIATION`; requires exact target identity and scope; not a verified executed outcome |
| `ASSISTANT_PROPOSED_COMPLETION` | ASSISTANT | Untrusted model-origin claim; **never** grants goal mutation, authority, or outcome verification |
| `NO_LIFECYCLE_CHANGE` / `UNCLEAR` | NONE / UNCLEAR | No goal closure; unresolved source or meaning means no authoritative transition |

The existing reviewer must supply an exact quote from the **current user's text** for user-origin events or an exact quote from the **proposed model answer** for assistant-origin events. A consequential candidate must name an **existing source-linked earlier user goal** in the canonical user-goal trajectory. Invalid quotes, mismatched target refs, or unclear speakers remain unassessed. This is **semantic reviewer interpretation**, never an independent ground-truth adjudication.

## Existing Continuity and Integrity integration

- `src/reality-semantic-review-v0.1.js`: extends the **same semantic review request** with a structured, source-checked lifecycle relation. Distinguishes conversational exit, a user's completion report, stop intent, and assistant-proposed completion without using keyword substring rules as the semantic engine.
- `src/reality-user-goal-continuity-state-v0.1.js`: replays prior source-linked `MODEL_OUTPUT_ASSESSMENT` receipts **only** when linked by exact canonical frame receipt and hash in the same root/world. Maintains separate, bounded evidence sets for conversation exit, reported completion, stop requests, and assistant completion candidates. Externally verified completed goals remain an **empty list**, because no independent outcome admission is implemented here.
- `src/reality-goal-authority-contracts-v0.1.js`: exposes `business_completion_verified:false`. When an assistant claims that business work is complete, a `CLAIM_BUSINESS_COMPLETION` candidate has `authorized_by:'ASSISTANT_PROPOSAL'`, `authorization_state:'UNAUTHORIZED'`, and no independent outcome receipt. The existing goal-authority boundary blocks that claim from mutating state or granting execution.
- `src/reality-live-intelligence-orchestration-v0.1.js`: where the completion claim remains in the proposed released answer, publication substitutes a transparent, unverified-completion explanation instead of preserving the unsupported completion as a factual statement with a cosmetic appendix. If a re-reviewed correction has already removed the quote, the corrected answer is retained.
- `index.html`: private-chat preview distinguishes “discussion finished” vs “user reports work done” vs “stop requested” vs “assistant completion claim blocked”. The prior `user_goal_continuity` receipt exposes how many historical proposals are linked and confirms outcomes remain unverified.

These changes use the existing ledger and Verifier/Integrity controls rather than creating additional Supabase tables, model providers, or new action permissions.

## Boundaries that remain

1. **Source != semantic truth**: The model could misclassify a quote despite valid source linkage. The structured contract prevents its interpretation from silently becoming an authoritative business completion.
2. **No independent external completion proof path wired here**: verified business closure requires an independently attested, goal-matched, scope/time-matched external outcome receipt, reconciled into the existing Continuity state. No assistant or user report substitutes for that.
3. **No permanent abandonment authority conferred by this reviewer**: an exact, authenticated user-origin target/intent transition must be reconciled separately. An assistant proposal cannot abandon a goal.
4. **No validated drift recall or correction accuracy**: the next architectural step is longitudinal assistant-proposal evaluation against simultaneous active user goal identities and obligations. Do not claim 0% drift, exponential token savings, enterprise execution SLAs, or verified ROI from this design.
5. **Backward-compatibility verification remains pending**: the structured reviewer schema now requires a typed lifecycle result. Existing offline fixture responses must be updated before the frozen test suite is resumed, and the preview runtime must be verified then. No tests were executed in this change at the user's instruction.

**Decision:** continue with longitudinal assistant-goal/obligation reconciliation after the source-linked completion distinction is stable. Keep draft PR #140 separate from production and do not restart the 50-turn benchmark without renewed permission.
