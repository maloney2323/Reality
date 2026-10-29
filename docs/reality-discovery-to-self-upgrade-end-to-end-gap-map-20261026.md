# Reality — real work discovery to verified closure and self-upgrade

**Date:** 2026-10-26. **Scope:** experimental draft PR #140. This is a read-only source audit and integration plan. The founder's hold on additional tests/benchmarks remains in force. No executions, paid model calls, GitHub merges, production deploys, or database migrations were made.

## Product intent

Reality already shows the operator work it has found. The demonstration should follow **the SAME discovered work item** through real authorization, execution, external source readback, outcome reconciliation, evidence-backed learning, and (only if necessary) a proposed bounded capability upgrade that is independently verified and human-approved. It should not make the operator re-prompt an AI to discover the next step; continuation comes from state. It must never advertise discovery, a model assertion, a sandbox state, or suggested ROI as an actual customer outcome.

## Observed source inventory (not production proof)

| Stage | Existing source | Observed contract | Remaining operational seam |
| --- | --- | --- | --- |
| Discover work | `src/reality-discovered-work-v0.1.js`, `src/reality-work-discovery-foundation-v1.0.js`, `api/reality/shift.js`, `index.html` | Evidence-linked discovery and prioritization; Home projection marks saved shift work `DISCOVERED` and explicitly not executed | Bind Home discovery ID to a durable governed work/workflow identity; don't mint execution authority from a displayed card |
| Plan and preflight | `src/reality-governed-work-runtime-v0.1.js` | Work item, preconditions, material assumptions, authorization requests | Materialize a work plan for a chosen exact discovery ID with source and goal scope |
| Authorize and execute | `api/reality/execute.js`, `src/reality-governed-execution-engine-v0.1.js` | Checks goal execution boundary, server connector and authority; returns `BLOCKED` or provider execution with independent verifier | Link the exact discovered work ID, authorization scope and immutable objective/plan receipt to an authenticated server-side work execution; verify bridge isolation |
| Verify outcome | `src/reality-governed-execution-engine-v0.1.js`, `src/reality-governed-work-reconciliation-v0.1.js` | Can distinguish `VERIFIED_OUTCOME` and `UNRESOLVED` based on independent verifier | Independent external readback for the chosen actual task, not just an LLM self-report or same in-memory sandbox |
| Learn from result | `src/reality-constitutional-learning-bridge-v1.0.js`, `src/reality-capability-evolution-ledger-v0.1.js` | Learning/policy-mutation candidates derived from verified execution only | Persist immutable learning and link proposed correction to observed failure and work objective, not an unverified score |
| Acquire missing capability | `src/reality-autonomous-capability-loop-v0.1.js`, `src/reality-autonomous-capability-loop-v1.0.js`, `src/reality-autonomous-closure-orchestrator-v1.0.js` | Gap detection, sandbox and verification contracts exist | Create real isolated edit/PR/suite adapters; require separate HUMAN approval before merging any upgrade |
| Resume original work | `src/reality-closed-loop-runtime-v0.1.js`, `src/reality-autonomous-closure-orchestrator-v1.0.js` | Closed-loop adapter state machine exists; orchestrator returns a `reactivationPlan` on success | Actually schedule/retry the **same original work ID** through the governed executor, independently read back completion, persist continuity and dashboard status |
| Visible customer value | `index.html`, `src/reality-proof-telemetry-v0.1.js` | Discovered-work UI, Past/Present/Future categories, sandbox proof telemetry | One per-work receipt timeline from discovery to verified closure, clear owner attention requests, verified costs/time savings only |

## Specific nontrivial source finding

`src/reality-autonomous-closure-orchestrator-v1.0.js` imports `authorizeWorldlineMerge`, `registerVerifiedCapability`, `reactivationPlan`, and `handleSynthesisFailure` from `src/reality-autonomous-capability-loop-v1.0.js`, but that selected `v1.0` source **does not export those four names**. They exist in `src/reality-autonomous-capability-loop-v0.1.js`. Until the module boundary is reconciled and validated later, do not claim that `runAutonomousClosurePass` can instantiate successfully on that path.

Additionally, the current orchestrator requires `authorization` before sandbox synthesis and checks a `mergeVerifier` response. This is **not proof of a separately authenticated, source-bound founder approval to promote an upgrade**. The `reactivationPlan` it returns is a plan, not actual execution of the originally blocked task.

## Honest scope of the existing proof

The repository's `docs/reality-full-loop-e2e-proof-20261024.md` documents **seven verified steps in a synthetic in-memory sandbox**: found work, blocked original attempt, capability gap, verified existing sandbox capability, retry, independent reconstruction of sandbox task state, and next cognition. It expressly says **no new LLM-generated code was synthesized**, **no production upgrade was merged**, and **no real customer outcome or money saved was proven**. Preserve and reuse that successful architecture; do not relabel it as a production self-upgrade demonstration.

## First customer-visible demonstration: one REAL Reality engineering work item

Start with one actual GitHub engineering issue or failing workflow that Reality discovered, whose state can be read back independently from GitHub. Every stage must link a single immutable `work_id`, `continuity_root_id`, `goal_id`, source evidence and temporal scope:

1. **Found:** UI displays source GitHub issue/CI status, exact time and reason it is valuable. It is `DISCOVERED`, not `COMPLETED`.
2. **Plan:** Reality produces a bounded internal repair proposal linked to user-owned objective. A model's preferred new strategy remains a proposal, never an authorized goal transition.
3. **Authorize:** owner explicitly approves exact sandbox repair scope; external changes and production merges remain unapproved by default.
4. **Correct/upgrade:** in isolated branch, propose a narrowly scoped code repair. Only consider a new capability if the current work is genuinely blocked by a demonstrated missing capability.
5. **Verify candidate:** independent GitHub checks and source readback confirm changed files, regression result and branch identity. Failed or ambiguous check leaves the candidate blocked and may propose a bounded second attempt.
6. **Promote:** a **separate authenticated owner merge approval** binds exact patch hash, work ID, target and scope; no auto-promotion from sandbox success.
7. **Retry original work:** re-run the same original issue/workflow task; independent provider readback establishes actual changed external state. If not verified, keep it `UNRESOLVED`, never label done.
8. **Learn:** source-linked failure -> adjustment -> outcome receipt becomes an eligible learning/evolution record. Return to the original objective and choose the next authorized work.
9. **Show impact:** compare earlier failure and independently verified new outcome. Track measured human minutes, actual charges and work avoided *only where evidence exists*. Otherwise show `ROI NOT VERIFIED`.

Use the same Home work card rather than a separate synthetic proof dashboard. Expose actor, source, timestamp, authority, current status, blocker, correction, upgrade version, independent verifier and successor action. One chronological ledger powers both UI and system state.

## Architecture and prioritization

This is **connection work**, not additional guardrail layers or duplicate Supabase tables. Reuse `Continuity`, `Universe`, `Verifier`, `Integrity Spine`, `governed-work`, capability-loop and existing connectors. Preserve three distinct permissions: the user's **active objective**, authorization to perform a **specific business action**, and approval to **promote a code upgrade**. None implies the others.

Fix the broken v1.0 capability-loop import and implement the above bounded same-`work_id` handoff in an isolated draft branch before any new proof run. The founder has explicitly paused tests until the conversational goal-drift foundation is functioning; leave live deployment, execution and benchmarks on hold unless separately authorized.

**Status: design and read-only source audit only. No working real-world self-upgrade loop established.**
