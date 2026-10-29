# Reality: explicit user NO ACTIVE goal outranks provisional reviewer focus

Date: 2026-10-26. Draft PR #140; experimental branch only. No paid model calls, benchmark runs, manually invoked tests, or customer production changes in this implementation pass.

## Why this was a foundational gap

Reality already has three relevant contracts and the append-only Continuity authority ledger. An authenticated user can `PAUSE`, `ABANDON`, or `REPORT_COMPLETE` a pinned objective. The ledger correctly returns `active_goal_id:null` after such an explicit user command, but Cognition was selecting its earlier reviewer-derived provisional working goal whenever there was no positive `active_goal`. That silently promoted an *interpretation* above an authenticated negative user decision.

`No authenticated goal commands ever recorded` and `authenticated user explicitly cleared the active goal` are **different states**. Both can have `active_goal_id:null`, but only the latter must prevent resurrecting an old inferred objective.

## Native Node / Continuity implementation

- `src/reality-goal-authority-contracts-v0.1.js` adds `projectExplicitNoActiveGoalBoundary`: an internal **sentinel**, explicitly `represents_user_goal:false`. It requires the same authoritative projected root, world and server user-principal state; at least one transition; no active goal; and a source-linked latest **PAUSE / ABANDON / REPORT_COMPLETE** command with the authorized user receipt. It cannot confer resource or execution privileges.
- `src/reality-live-intelligence-orchestration-v0.1.js` prioritizes the authoritative *negative* state before pre-generation Cognition. A positive authenticated `active_goal` still wins; a verified **no-active** state becomes a non-goal governance sentinel; with no user goal commands at all, the earlier provisional user text remains explicitly **unconfirmed**. The current user message always governs immediate conversational direction.
- `src/reality-canonical-epistemic-frame-v0.1.js` checks the *same* negative state when assembling the hashed frame: assistant/reviewer provisional goals cannot be promoted to controlling authority; the sentinel must match the exact latest user transition's source message and ledger receipt.
- `src/reality-goal-governance-contract-v0.1.js` rejects a post-generation Integrity contract that tries to use an earlier inferred goal after a user cleared it; distinguishes a verified user-confirmed **NO ACTIVE** state from both a confirmed active objective and unresolved prior interpretation.
- `src/reality-semantic-review-v0.1.js` gives the same existing reviewer an explicit interpretation rule: no pinned active objective after the user's command means previous goals are recoverable context, not mandatory instructions. A new user task can be handled normally.
- `pendingGoalAuthorizationResponse` and the preview `index.html` now say no ongoing objective is pinned rather than telling the user the original goal is still active.

No new Supabase `GoalState` or `GoalTransition` tables were created. The existing HMAC-attested, RLS-backed signed user-command events remain the one authoritative source; the provisional goal projection and existing Cognition/Verifier/Integrity Spine consume that source. This is **not** a separate post-turn guardrail or another LLM pass.

## What has not been proved

- No new tests were run: the founder explicitly paused tests and benchmark continuation until the architectural drift system works as intended. Existing automatic GitHub checks (if any) do not imply the full behavior has been verified in a genuine signed-in conversation.
- The current no-active sentinel is a **negative authority marker**, not a true user goal or a cryptographic customer execution warrant.
- A current user question can still be misunderstood. The semantic reviewer may miss gradual assistant-led drift or incorrectly flag a legitimate user pivot.
- **Atomic concurrency** across concurrent authenticated goal writes and in-flight answer publication remains an open project risk; an existing SQL atomic publication draft should not be represented as deployed or sufficient until deliberately applied and independently validated.
- Full multi-goal source-linked semantic identity, scope inheritance, constraint persistence, and precise pre-release correction remain unfinished.
- No claim of zero drift, verified reduction, newly enabled external autonomous execution, or production readiness is justified.

Next engineering focus: user-authorized simultaneous objective hierarchy and source-linked obligation relationships across active, paused and dormant states; meaning-aware assistant action/recommendation comparison against those constraints, using the same existing Continuity/Verifier/Integrity runtime. Keep PR #140 draft and the no-testing hold in place.
