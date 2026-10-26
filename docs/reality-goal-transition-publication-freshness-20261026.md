> **October 26 update:** The isolated benchmark Supabase migration has since been applied and the experimental preview atomic publication flag enabled. The statements below about SQL being *not yet applied* describe an earlier checkpoint, not the current configuration. See [current verified rollout checkpoint](./reality-assistant-posture-and-atomic-publication-installed-20261026.md). No concurrent-request behavior or semantic drift improvement has been independently tested.

# Reality user-goal transition freshness at publication (Oct 26, 2026)

**Experimental, unmerged draft PR #140. Do not confuse this with proven drift-detection performance.** The founder has paused further benchmarks; this change was an architectural implementation without intentionally triggering any paid model run or manual benchmark.

## Existing architecture already contains the three proposed contracts

1. **GoalState** — `src/reality-authoritative-user-goal-ledger-v0.1.js` projects the user-confirmed active goal and paused/dormant/other user-owned goal states from HMAC-attested, RLS-source-readback goal-command events in the **existing append-only Continuity**. `src/reality-goal-authority-contracts-v0.1.js` supplies a separate source-linked, explicitly *provisional* `GoalState` for ordinary conversation when no authenticated goal command exists.
2. **GoalTransition** — `appendAuthenticatedUserGoalCommand` adds transitions only from explicit user-goal API commands after an authenticated, RLS-scoped user message has been persisted and read back. Authenticated conversation focus changes are distinct from independently verified business completion and from external action execution authority. Reviewer-inferred transitions remain provisional.
3. **AssistantProposal** — `projectAssistantGoalProposal` records candidate shifts, future work commitments and unverified completion assertions from actual first-pass model text, with exact proposed quote, source goal and source-linked reviewer evidence. `enforceGoalTransitionBoundary` refuses state changes from assistant proposals; the existing semantic correction path may repair the answer once, otherwise withholds flagged content. `ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION` is persisted as an existing Continuity verification receipt.

**Do not introduce duplicate Supabase GoalState/GoalTransition tables** unless the canonical existing Continuity event model demonstrably needs a distinct transactional projection. New tables could make concurrent 'truth' representations disagree. No DB migration was run.

## New implementation: source-verified freshness between generation and publication

- Added `compareAuthenticatedGoalSnapshots` to the existing `reality-authoritative-user-goal-ledger-v0.1.js`. Given two independently authenticated projections of the same principal, root and world, the deterministic admission check compares transition count, active goal ID, and last transition receipt ID. A different scope, missing required authority flags, or ledger history rollback is rejected.
- In `runLiveIntelligenceOrchestration`: project goal authority before cognition as before; after model and semantic-review work, reconstruct the authenticated ledger again and compare. A new authorized user goal means the generated answer is stale and is **replaced with a neutral no-action notice**, not released as if it still serves the current objective. The comparison goes into the existing `ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION` verification event and `goal_authority.publication_goal_freshness`.
- In the signed-in `api/reality/personal-chat.js` publication route: reconstruct the same scoped canonical Continuity ledger **again immediately before saving the assistant message**. If the snapshot changed, refuse the save with `409 CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN`. No assistant answer is promoted into authenticated conversation persistence. A new authenticated request is required, preserving any earlier human-written message.
- These are **source-ledger freshness checks, not keyword detection**. The model, reviewer or its own suggestions cannot authorize a goal mutation. Both levels require existing authenticated user-goal receipts and operate within the isolated preview deployment.

## Limits and unfinished architecture

- **Not a database compare-and-swap.** There is still a possible race between the final readback and the subsequent message insert if another authorized goal transition commits concurrently. True atomic publication needs a single transaction / DB-side conditional write or equivalent serializable mechanism before making an unconditional guarantee.
- **Not a solution to all conversational drift.** A model can drift while the authorized goal remains unchanged; the separate reviewer and goal trajectory need meaning-aware improvement, independent grading and reliable pre-release correction.
- **Not a user-command parser.** Ordinary chat text doesn't automatically mutate user goal state. Only explicit authenticated commands do; general chat instructions can change immediate conversational focus without creating a durable user-authority event.
- **No external actions authorized.** An approved conversational objective does not grant permission to send estimates, perform purchases, publish content, charge customers, or claim real business completion.
- **Tests remain paused by user request.** No new paid model tests or benchmarks were intentionally invoked for this work. These code changes are not yet empirically validated. Production remains unchanged.

Next before any claims: finish semantic active-goal reconciliation without granting authority to the reviewer; implement true transactional freshness for concurrent publication if required; inspect first/final output and receipts, and only resume held-out tests with user approval.
