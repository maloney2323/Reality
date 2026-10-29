# Reality — authenticated GoalState graph and Integrity wiring
Date: 2026-10-26. **Experimental draft PR #140 only.**
No new paid model calls or manually launched benchmarks/tests. Production remains untouched.

## Reuse the already installed authoritative substrate

The supplied suggestion to create separate mutable GoalState and GoalTransition tables would compete with Reality's *existing* authoritative, append-only `universe_events` Continuity chain. The three contracts and explicit authenticated user-goal command endpoint are already present in the draft. The active-goal ledger is projected by `projectAuthoritativeUserGoals` only from independently source-read-back and server-attested user directives; assistant text and a reviewer inference cannot change it.

Read-only isolated Supabase introspection on October 26 confirmed:
- private `reality_internal.goal_publication_epochs` revision-clock table present (1);
- `public.reality_publish_assistant_if_goal_current` transaction RPC present (1);
- both user-turn admission and authenticated goal-publication epoch triggers enabled (2).

That private table is a **derived concurrency clock**, not a parallel truth store. No schema change or migration was applied during this pass. It would be misleading to report these existing objects as newly installed now. Production DB was not accessed or changed.

## This pass: authenticated goal graph in the existing foundation

Created `src/reality-authoritative-goal-relationship-graph-v0.1.js`. It projects one **read-only** authenticated GoalState relationship graph from the already verified `projectAuthoritativeUserGoals` output, with:
- stable authenticated goal IDs; explicit parent/temporary-subgoal links; source-user-message IDs and goal-transition receipts;
- `ACTIVE`, `PAUSED`, `DORMANT`, `ABANDONED`, and `USER_REPORTED_COMPLETE_UNVERIFIED` states, without falsely treating reported completion as external work proof;
- active parent ancestry, recoverable paused/dormant goals and explicitly recorded incomplete parent relations;
- fixed world/root/principal scope; rejection of malformed goals, unauthorized state without a transition, duplicate IDs, missing active states and cycles;
- no authority for model/reviewer to mutate goals or execute business actions; no automatic semantic extraction of the exact user statement into invented constraints.

Integration:
- `src/reality-live-intelligence-orchestration-v0.1.js`: reconstructs authoritative graph alongside original user goal and provisional semantic goal stack, before Cognition. Passes a source-linked graph to the existing conversation handoff and the canonical state. No new judge request.
- `src/reality-canonical-epistemic-frame-v0.1.js`: hashes the same goal graph into the ordinary Continuity frame and enforces root/world, controlling goal and no-authority invariants.
- `src/reality-goal-governance-contract-v0.1.js`: AssistantProposal records the exact user-authenticated controlling goal, parent ancestry and recoverable paused goal IDs. Integrity independently compares that projection with the same canonical frame and refuses inconsistent or assistant-authorized graph mutations. The existing final answer release gate and external execution boundary remain in force.
- `src/reality-semantic-review-v0.1.js`: existing reviewer evaluates assistant strategy against current user direction and actual authenticated parent/subgoal relationships. Paused ancestors are context, **not mandatory current tasks**. The reviewer is still fallible.
- `src/reality-goal-drift-assessment-coverage-v0.1.js`: missing authenticated parent relationships downgrade the review's coverage instead of recording a false clean zero.
- Authenticated chat receipt/UI: makes verified parent counts and recoverable paused/dormant goal status distinguishable from provisional reviewer-only focus.

## What is already present (not newly invented here)

- **GoalState / GoalTransition:** explicit user-goal commands in `api/reality/personal-goals.js` and `src/reality-authoritative-user-goal-ledger-v0.1.js` (server authentication, source receipt, separate goal authority).
- **AssistantProposal:** `src/reality-goal-authority-contracts-v0.1.js` and `src/reality-goal-governance-contract-v0.1.js` (assistant direction and suggested future work never imply permission).
- **Execution Integrity:** `src/reality-goal-execution-boundary-v0.1.js` blocks goal-ledger mutation through generic connectors and `src/reality-governed-execution-engine-v0.1.js` invokes it before connector authority.
- **Race-resistant assistant publication:** the isolated-preview atomic RPC checks expected authenticated goal revision and latest admitted user request in a single transaction. This protects durable chat publication against known stale-goal races; it is not proof of general semantic correctness or a universal execution SLA.

## Outstanding blockers before any claim of completed drift elimination

- Long-term, meaning-aware goal identity and obligation inheritance from free-form user messages are still probabilistic. The new graph covers **explicit, authenticated** user-goal transitions, not all informal conversation intent.
- Existing reviewer can miss an assistant's gradual strategic redirection or incorrectly label optional advice as drift. No method establishes 100% semantic detection, and no fresh genuine-model evaluation was performed.
- Strict publication boundary only contains **recognized, source-linked unauthorized proposals**. A successful code path and configured database are not proof of correct intervention in every case.
- Current goal projection is bounded (last 50 authenticated goals), and references to older parents can be incomplete; that gap is explicitly exposed. Multi-project cross-world scope must remain isolated.
- Independent false negative/false positive grading, realistic concurrency race exercise, and live signed-in end-to-end verification are **not done**. The founder's pause on tests and the remaining 29 turns of the 50-turn benchmark still stands.

**No production deployment, database mutation, external work action, or paid model run performed.** PR #140 remains draft. The right goal is foundational **source-based control of user authority**, not an untrue blanket promise of zero model drift.
