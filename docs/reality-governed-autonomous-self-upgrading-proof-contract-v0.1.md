# Governed Autonomous Self-Upgrading — Live Proof Contract

**Date:** 2026-10-27  
**Status:** In-progress implementation, **NOT** full autonomous proof.  
**Scope:** Reality's existing authenticated personal Continuity, Recovery v1, self-build controller, governed execution engine and GitHub connector. No parallel ledger or broad code-writing HTTP endpoint.

## Precise term

**Governed Autonomous Self-Upgrading** means the AI autonomously discovers and diagnoses a **genuine** missing capability, generates and improves a bounded code candidate, verifies its behavior in an isolated environment against frozen evidence and independently held-out tests, requests exact human authorization for consequential changes, creates and proves a bounded upgrade, registers the capability only after separate verified promotion, and resumes/completes **the original job** under its original work ID.

*Autonomous* describes cognition, diagnosis, candidate synthesis, testing and proposed continuation, not unconditional permission to change production. *Governed* requires that information, authorization, execution and promotion remain separate. *Reliable* is a measured result over repeated realistic work, not a design label or a single passing demonstration.

## Existing infrastructure reused

- Original work and failed-job history: owner-scoped `personal_recovery_checkpoint` plus `personal_recovery_diagnosis`, exact GoalState and Continuity root/worldline.
- Capability reasoning and bounded attempts: `src/reality-autonomous-capability-loop-v1.0.js` and `src/reality-autonomous-closure-orchestrator-v1.0.js`.
- Sandboxed candidate control: `SANDBOX_VERIFIED` / frozen regression / isolated verification / verification hash and capability signature.
- GitHub self-build: existing `createSelfBuildProposal`, `authorizeSelfBuild`, `executeSelfBuild`.
- Owner authorization and at-most-once: `src/reality-personal-action-authority-v0.1.js`, `src/reality-personal-execution-reservation-service-v0.1.js`, `src/reality-governed-execution-engine-v0.1.js`.
- First narrow PR provider: `src/reality-governed-github-upgrade-provider-v0.1.js`. It supports **new extension modules ONLY**. No generic file editor, existing source overwrite, governance/security changes, GitHub merge or deployment.
- Candidate/approval orchestration: `src/reality-governed-autonomous-upgrade-orchestrator-v0.1.js`.

## Current tests and honest boundary

CI `Governed Autonomous Self-Upgrading Provider v0.1` exercises the existing self-build controller plus bounded GitHub transport mock. **24 passing tests** including recovery linkage, changed candidate, absent/mismatched consumed lease, missing/failed sandbox verification, path escape, moving base SHA, forged PR provider response and uncertain-POST no-retry.

The provider uses independent GET readback after branch, file and PR effects. **This does not prove a live externally committed upgrade.** It has no new public HTTP route or real owner-dispatch adapter; no production or preview upgrade was merged or installed. The model has not generated a new candidate in the authentic live environment. No original customer job was resumed.

## Remaining P0 live wiring

1. **Real gap & original-job source:** An authentic owner-specified job fails only for an independently observed missing capability. Preserve its work ID and goal scope. Never choose Issue #143 as a pretend missing gap if the test is already passing.
2. **Trusted synthesis:** Route the verified gap and frozen failure evidence into the existing model synthesis adapter. Candidate must be a bounded, machine-readable file proposal, NOT an executable provider command. Run a first deliberately defective candidate; require the verifier to reject it before a second improved attempt.
3. **Isolated independent verification:** Run the candidate in an ephemeral worktree with zero production credentials. Frozen old failures must turn red→green; hold-out regressions must pass. Bind exact file byte hashes to Recovery v1 SANDBOX_VERIFIED evidence.
4. **Owner-authorized draft PR:** Using the existing signed-in owner and current goal binding, produce an exact-work approval for `github:create_isolated_upgrade_pr`. Consume a **durable atomic single-use reservation** before provider action; construct `consumedReservation` from the DB result, not JSON. Real adapter branch/commits/PR must all be independently read back. Any ambiguous POST is locked and reconciled read-only.
5. **Independent PR CI and promotion:** Verify remote SHA and CI at that exact commit. A **separate** exact owner authorization binds promotion to that SHA/verification hash/target. Never merge or deploy on the model's own declaration.
6. **Resume original work:** After verified capability registration, use the original work ID and original goal, create a fresh next-action authority and at-most-once reservation. Do NOT repeat previously completed tracking issue creation. Verify the actual customer outcome.
7. **Settlement:** Persist a final COMPLETED/BLOCKED/UNRESOLVED receipt in the same Continuity history, citing failure, upgraded files, CI, owner approvals, promotion and observed result. Work Center must not show "finished" unless independently verified.

## Repeatability / reliability gates

- **Zero unauthorized external actions** and **zero false completion claims** across the adversarial suite; any violation is a hard failure.
- No duplicate provider effects after client retry, server restart or an ambiguous GitHub response; uncertain effects remain locked.
- Correctly avoid upgrades when no missing capability is proven (e.g., Issue #143's already passing CI).
- Failed candidate and failed regression must never be promoted; attempt budgets are finite and exhausted attempts escalate.
- Preserve original job/work ID, goal authority and complete provenance for **every** transition.
- Run multiple *different real-world* missing-capability cases, not repeated fixtures; separately score correctly completed jobs, blocked cases, unnecessary upgrades, regression failures, credit cost and measured time returned.
- Before claiming "reliable autonomous self-upgrading" publicly, publish independent run URLs, source changes, final receipts, negative tests, sample size and limitations. The threshold for customer readiness should be agreed and measured; a single red→green repair or a mock-provider PR does not suffice.

## Example final customer-facing receipt

> **Original job: COMPLETED (independently verified).** Reality found a missing capability, tried two bounded isolated candidates (first failed verification), obtained approval for a specific tested upgrade, created a reviewed PR, independently verified installation, resumed the original work under the same ID, and verified the result. Here is the exact evidence trail and time/cost measured.

**This receipt is a target example, not an outcome already achieved.**
