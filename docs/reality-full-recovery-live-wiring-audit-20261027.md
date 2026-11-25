# Reality Full Recovery Loop — Live Wiring Audit

**Date:** 2026-10-27  
**Scope:** configured protected preview branch `experiment/reality-live-durable-adversarial-20261025` and the connected isolated personal Continuity project. Read-only source and DB audit; this document is isolated on an audit branch. No production deployment, code promotion, or new execution authorization.

## Executive answer

**The foundational components already exist. The full autonomous customer-job recovery path is NOT connected yet.** The missing work is a narrow sequence of runtime adapters and durable transitions, not a new recovery engine or a new guardrail stack. No negative assertion is made about unknown deployments or other apps: the findings below are confined to the inspected configured preview and persisted work evidence.

## Actual live call graph

1. **Work and goal:** signed-in Work Center `index.html` uses the real owner-scoped Continuity/GoalState and presents unfinished jobs through `GET /api/reality/personal-unfinished-work`. The visible cards are not execution authority; the projection sets `can_resume_execution: false`.
2. **Original job preservation:** owner `POST /api/reality/personal-recovery` with exact CHECKPOINT validates existing issue outcome and writes `personal_recovery_checkpoint` in the same Continuity root/worldline. Account-wide readback verified this across a refresh.
3. **Investigate:** `GET /api/reality/personal-recovery-evidence` reads the existing checkpoint, re-observes original failed GitHub runs and a later passing run, and intentionally returns `original_job_completed: false`.
4. **STOP — there is no current call from these live recovery endpoints to `runAutonomousClosurePass`, `executeSelfBuild`, independently verified PR promotion, or the governed executor for the original **remaining** work.**

## Existing building blocks to REUSE

| Block | Exact current implementation | Audit |
| --- | --- | --- |
| Self-evolution | `src/reality-self-evolution-v0.1.js` | detect, rank, propose, sandbox, verify, promote, learn, replan pure functions; not connected from owner recovery route |
| Capability recovery | `src/reality-autonomous-capability-loop-v1.0.js`, `src/reality-autonomous-closure-orchestrator-v1.0.js` | Missing four v1 exports repaired on preview; same-root/workline tests pass. Orchestrator accepts injected `synthesis.run`, `sandboxVerifier.verify`, `mergeVerifier.merge`, `capabilityRegistry.register`; no live credentialed adapter supplied by owner recovery path |
| Self-build | `src/reality-self-build-controller-v1.0.js` | accepts already provided code files and adapter `createBranch`, `writeFiles`, `openPullRequest`; state `PR_OPENED` does not independently verify tests or complete original work |
| Legacy self-build ingress | `api/reality/self-build.js` | intentionally responds 403, `LEGACY_SELF_BUILD_DIRECT_WRITE_DISABLED`; correct: untrusted client `authorization:true` cannot mint GitHub write authority |
| Governed external executor | `src/reality-governed-execution-engine-v0.1.js` with authenticated goal admission and single-use reservation | live `api/reality/personal-issue-dispatch.js` has proven only exact GitHub `create_issue`. `src/reality-personal-github-execution-bridge-v0.1.js` explicitly rejects operations other than `create_issue`; no code-edit/PR capability wired. `api/reality/execute.js` deliberately disabled (403) |
| Shift | `api/reality/shift.js` | discovery/operating-cycle projection, not autonomous code repair and not a complete multi-job settlement |
| Reactivation | v1 `reactivationPlan` and `runAutonomousClosurePass` | return `REACTIVATION_READY`, `execution_authorized:false`, `original_work_executed:false`, `job_completed:false`; no real resumed connector call |
| Customer completion | `src/reality-completion-report-v0.1.js`, `src/reality-personal-unfinished-work-v0.1.js` | honest separate action-versus-job receipts; no durable original-repair closure event was found in the inspected historical event types |

## Independent evidence

- The isolated Continuity project showed `personal_issue_execution_outcome = 4`, `personal_recovery_checkpoint = 1`, `personal_verified_improvement_proposal = 1` at audit time; no matching live capability-promotion, actual self-build, or original-job settlement entity type appeared in the filtered source inspection.
- Actual Issue #143 work ID: `work:24cda9611404e9bcb47909976067605c`. The recovery checkpoint is saved; its later passing GitHub run is real evidence of a newer CI success, NOT proof that Reality authored a new capability or completed the repair.
- Real-source and red/green isolated GitHub Actions proof: https://github.com/maloney2323/Reality/actions/runs/40605639502. The proof uses a **separate synthetic identity**, `work:fee35be7fe8ecf7e0d4374badebbfe10`. A real Git checkout reproduced the missing v1 import failure; a known verified patch repaired it; the 9 targeted tests and 40-test combined suite passed. **Not** an authenticated original customer-job continuation or novel model-authored self-upgrade.
- Current recovery and original-issue routes are grounded in actual owner-scoped Continuity; do not replace these with a synthetic state database.

## The exact integration work left

**P0 — Same-work recovery-to-capability diagnosis.** Add a trusted server-side continuation coordinator that reconstructs the blocked **original work ID**, current user goal, and checkpoint. Distinguish a legitimate missing capability from a permissions failure, temporary provider failure, outdated test, or already corrected problem. Derive capability gap only from verified observation. Persist a typed proposal and approved experiment; never silently change the user's objective.

**P0 — Governed, isolated code/PR execution.** Connect existing self-build controller to the **existing authenticated exact-work, goal-bound authority + atomic single-use reservation**; use an allowlisted GitHub branch/commit/PR connector with exact content/path diff, durable at-most-once reservation, provider independent readback, and reconcile ambiguous writes instead of replay. Do not revive generic `/api/reality/self-build` or broaden issue-creation approval into code editing. The model may propose edits, not authorize them.

**P0 — Independently verify and authorize promotion.** Validate frozen regression, generated patch/diff, GitHub CI status and provider readback. A separate owner-authenticated approval must bind the **specific work ID, candidate hash, target branch, and consequential operation**. A passing sandbox test is not promotion authority. Start with PR creation; merge/deployment are independently gated, never assumed.

**P0 — Resume and settle ORIGINAL remaining task.** After verified capability registration, translate `REACTIVATION_READY` into the next **distinct authorized** step of the ORIGINAL job, with prior completed issue creation excluded. Verify actual external outcome and persist immutable `COMPLETED`, `UNRESOLVED`, or `BLOCKED` settlement into same root/worldline. Only a verified job outcome may remove the Unfinished Work card or show `I finished your job`.

**P1 — Proof UX.** One job card `Diagnose → Prepare safe upgrade → Authorize sandbox execution → Verify → (separately authorize promotion) → Resume → Final receipt`; surface source links, actor, evidence, authority, cost, exact work ID and unresolved steps. Avoid four unrelated dashboards and manual conversation hunting.

## Minimal no-hype acceptance test

Use a newly discovered, **actually unsupported** bounded GitHub repair under a fresh owner-approved original goal. On the authentic account: exact work identity survives a new request and restarted process; a failed candidate remains isolated and unpromoted; candidate two is independently CI-verified; the owner approves the exact candidate; a real GitHub PR is independently read back; after the appropriate separate promotion, Reality itself resumes the original job; original acceptance outcome is read back; the same Continuity ledger shows verified settlement and a customer-readable ending receipt. Every sensitive consequence uses its own scoped approval; no model/UI claim is accepted as its own proof.

**Go/no-go:** Only claim full self-upgrading automation if the authenticated Reality runtime actually dispatches all allowed upgrade operations and the original business task completes under the original work ID without developers manually substituting those stages. A branch PR or simulation alone is not the full loop.
