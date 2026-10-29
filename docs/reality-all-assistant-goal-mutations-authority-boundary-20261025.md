# Reality Integrity: all proposed goal mutations are untrusted

Date: 2026-10-25. Experimental branch for draft PR #140 only. User explicitly asked to keep tests and paid benchmarks paused; **no manual test commands or paid model requests were invoked for this change**. No production deployment or database migration.

## Decision: Node.js contract enforcement before new Supabase tables

Reality already has a source-linked goal evidence projection, typed GoalState / GoalTransition / AssistantProposal contracts and append-only Continuity verification receipts. A second SQL "truth" store would duplicate status ownership. The current missing integrity piece was to examine **every proposed mutation**, not just the first assistant-drift candidate.

## Implemented

- `src/reality-goal-authority-contracts-v0.1.js` now requires a valid proposal, zero resource mutations, at most 20 typed proposed goal mutations, matching goal identity, allowed mutations (`SHIFT_OBJECTIVE`, `SCHEDULE_FUTURE_WORK`, `CLAIM_BUSINESS_COMPLETION`), assistant-only provenance, explicit `UNAUTHORIZED` status, exact proposed-change quote, and explicit `no_external_execution_grant:true` on *every* item. Unknown / extra / promoted mutations throw rather than being silently ignored. All flagged quotes/types are returned as one atomic decision. A claimed completed business task may not smuggle an independent outcome receipt into a proposal.
- `src/reality-live-intelligence-orchestration-v0.1.js` uses the entire blocked mutation set before releasing a response, even if an assistant simultaneously suggests a new workstream and falsely asserts completed work. An attempted correction must remove all blocked quotes before being eligible for release; no reviewer can grant a goal change or a real-world action. The same existing Continuity receipt records the complete blocked-mutation set with the original first-model text.
- `src/reality-goal-governance-contract-v0.1.js` independently validates the full typed goal-mutation array and source identity before permitting state mutation. A forged `authorized_by`, cross-goal target, unknown proposed change, or execution-authority claim is rejected. There is still no `GRANTED` transition solely from assistant text or an LLM judge.

## Invariants

1. An assistant's recommendation is **a proposal**, not a user-owned active goal.
2. A model review is **evidence of a possible meaning**, not an authorization receipt.
3. A user-sourced instruction and verified user authorization are separate facts.
4. A conversation goal transition and connector/execution permission require **separate proof**.
5. Every blocked mutation is represented; a correctly blocked first item cannot conceal a second attempted change.
6. Missing/partial semantic coverage must not be described as drift-free.

## Remaining blockers before any testing is resumed

- The semantic reviewer can miss gradual drift or flag a benign direction as a candidate. Multi-mutation blocking cannot solve reviewer recall.
- An independently authenticated, source-specific user authorization receipt for durable goal-state mutation is not yet implemented; all assistant-origin proposals continue to be blocked. The user must be able to review and explicitly authorize a new goal without an AI inventing that approval.
- Distinct legacy action entry points and real connector execution boundaries still require authorization-scope inspection.
- User goal identity and scope across multiple active parent/child workflows remain provisional; missing reviews and bounded history can cause incorrect or unresolved projections.
- **No tests run here** by user request. Source edits are not proven functional or a measured reduction in conversational drift. Keep PR draft; keep production unchanged.

This hardens the native foundation but does not establish a 0% goal-drift rate or validated real-world reliability.
