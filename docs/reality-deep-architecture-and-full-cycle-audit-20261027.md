# Reality — deep architecture / full-cycle audit
Date: 2026-10-27. Source: `maloney2323/Reality`, experimental draft PR #140 HEAD `5a870d0c55c7a38fa59d621475c115edb2906197`; verified production alias, connected Vercel project and Supabase projects. Read-only audit: this document makes no app changes, no model calls, no live connector writes, no benchmark restart, no production promotion.

## Executive finding

Reality ALREADY HAS substantial real modules for discovery, observation, prioritization, typed Signal Cleaner, durable provenance and Continuity, owner-authoritative goals, structured proposals, work planning, action governance, connector execution, independent verification, outcome-sensitive learning, sandbox experiments, self-build PR preparation, cognitive evolution and iterative planning. A seven-stage loop actually runs in the synthetic in-memory sandbox. The foundation is **not** merely a post-hoc set of safety filters.

But no evidence supports a fully integrated, cross-request, provider-backed and customer-facing cycle with **one continuous work identity** from discovery through correction, real action, verified outcome, measured learning, tested upgrade and continuation. Real business autonomy is *not* one missing function call; it is a short, concentrated set of integration, security, semantic fidelity and deployment gates.

## Sources directly inspected

`src/reality-work-discovery-foundation-v1.0.js`, `src/reality-discovered-work-v0.1.js`, `src/reality-stewardship-pass-v1.0.js`, `src/reality-world-observation-fabric-v0.1.js`, `src/reality-shadow-observer-v0.1.js`, `api/reality/shift.js`, `index.html`, `src/reality-governed-work-runtime-v0.1.js`, `src/reality-governed-execution-engine-v0.1.js`, `api/reality/execute.js`, `api/reality/authority.js`, `api/reality/personal-chat.js`, `api/reality/personal-execution-admission.js`, `src/reality-personal-execution-reservation-service-v0.1.js`, `src/reality-single-use-execution-reservation-v0.1.js`, `src/reality-constitutional-learning-bridge-v1.0.js`, `src/reality-learning-chain-v0.1.js`, `src/reality-self-evolution-v0.1.js`, `src/reality-cognitive-evolution-v0.1.js`, `src/reality-autonomous-capability-loop-v0.1.js` / `v1.0.js`, `src/reality-autonomous-closure-orchestrator-v0.1.js` / `v1.0.js`, `src/reality-closed-loop-runtime-v0.1.js`, `src/reality-self-build-controller-v1.0.js`, `api/reality/self-build.js`, `api/reality/connectors/github.js`, `src/reality-full-loop-sandbox-proof-v0.1.js`, and multiple earlier live proof reports. Repository draft tree contained 473 tracked file blobs. Audit is a risk-based architecture / active-path review, NOT a statement that all 473 files received line-by-line security verification.

## State of the intended full loop

| Stage | What exists | Evidence level | Blocking seam |
|---|---|---|---|
| Observe business | Github commits/CI/PR steward, observation normalization for Github/Gmail/Calendar, source models | Concrete live GitHub adapter + typed contracts | Real customer-specific multi-system read access, account isolation, source freshness and reliability |
| Discover work | recurring/stalled/priority detectors; auto shift and Home `DISCOVERED` cards; GitHub stewardship | Real repository records read; production shift NOT observed running | Source-linked persistent work ID and goal/authority scope across stages |
| Ground goals | authenticated user goal commands, Continuity, typed Signal Cleaner, epistemic frame; final publication Integrity | Isolated preview implementation, durable readback and mock CI; partial real-model checks | Independently graded semantic drift/provenance extraction, full history coverage |
| Plan | structured Intent / WorkItem / preflight, success conditions, risk/authority requirements | Pure runtime contracts / work-plan route | Bind selected Home work candidate and current goal to exact verified scope |
| Authorize | explicit authenticated goal-bound action approval and HMAC, database single-use reservation | Installed isolated DB + no-cost tests + real competing DB requests | Replace older exposed weak-authorization routes; connect Home and signed-in session |
| Execute | Github issue, Vercel deploy, Supabase write provider bridges; governed execution engine with `begin` reservation | Code and simulated tests; NO external provider action on the new authenticated route | Trusted dispatch adapter and controlled real-life proof; provider timeouts/uncertainty |
| Independently verify | provider-owned GitHub readback, outcome verification, reconciliation, evidence warrant | Historical external GitHub CI regression verified; in-memory sandbox outcome reconstructed | Specific new action must have independent provider readback and persistent outcome receipt |
| Learn | `learnFromVerifiedExecution`, verified-outcome to candidate mutation, learning-chain and evolution ledger | Validated contracts; no live persisted customer improvement loop | Persist measured before/after learning from an actual work outcome and use it next cycle |
| Upgrade | capability-gap detector, sandbox experiment, self-evolution state machine, self-build GitHub branch/PR provider | Real source modules; synthetic capability adapter; no autonomous generated patch+verified GitHub repair | Repair orphan v1 module boundary, trusted goal-bound explicit promotion authority, real isolated PR/CI verification |
| Continue | closed-loop runtime and reactivation plan | Seven-stage synthetic in-memory sandbox proof | Rehydrate SAME original work ID across process restart and actually choose/do next authorized work |
| Report value | UI Past/Present/Future, work and attention queue; receipts/telemetry | UI/source present; a few historical external verification proofs | End-to-end customer-visible timeline and measured verified saved time/cost/quality |

## High-priority defects and gaps

### P0 — independently unsecured write routes (source-level risk; no exploitation attempted)
**`api/reality/self-build.js`** treats incoming `body.authorization?.authorized` as authorization, optionally compares a caller-supplied principal ID to a generic signed session cookie, and then calls the GitHub-writing self-build provider. **`api/reality/connectors/github.js`** similarly treats `authorization.authorized` and `execution.execution_id` from client JSON as sufficient to call GitHub issue creation. Both files exist unchanged in the production deployment commit `9c5a5f2`. This is an architectural authorization bypass of the new goal-bound engine if those routes can access the relevant tokens. No requests were sent and no current credential availability was tested. Until this is remediated, DO NOT advertise complete execution governance. Route all external writes through one authenticated, source-bound, persisted exact-work approval + reserved execution boundary; deny direct anonymous/opaque client claims. Consider disabling risky entry points until wired.

### P0 — deployment and runtime evidence mismatch
Vercel production alias `reality-blond.vercel.app` points to deployment `dpl_DVSiQvjc4YFnq4w5kYFutRGui2QE`, commit `9c5a5f2`, branch `feature/reality-manual-shift-proof-20261024`. The draft PR #140 is neither merged nor production. The latest listed protected preview for this draft branch was READY at `73e874e`, which *predates* the Oct-27 atomic execution code. Connected production Supabase `qkzvjfiegihyaoabiniy` currently held **11** `universe_events`: 0 `shift_tick`, 0 `shift_result`, 0 `customer_authority_policy`. The isolated benchmark DB `hvkfreoagbrphwghjajw` contains the private chat + execution reservation tables, but production does not. No unattended shift execution can be claimed from those source events.

### P1 — UI still uses obsolete action path
Draft `index.html` Home "found work" action posts to generic `/api/reality/authority` and then generic `/api/reality/execute`; it does not perform authenticated Goal PREPARE -> explicit exact-work approval -> reservation -> trusted dispatch. The generic route was intentionally made fail-closed for ungrounded connector writes. Therefore the new infrastructure and customer work UI are not yet a working same-work path. Resolve while preserving verified source work ID and deliberate human action confirmation.

### P1 — demonstrably invalid autonomous v1 module wiring
`src/reality-autonomous-closure-orchestrator-v1.0.js` imports `authorizeWorldlineMerge`, `registerVerifiedCapability`, `reactivationPlan`, `handleSynthesisFailure` from `src/reality-autonomous-capability-loop-v1.0.js`; these four symbols are **not exported** by that selected file (the v0.1 module does export them). This v1 orchestrator cannot be reliably imported as written. `api/reality/capability-gap-runtime.js` uses the distinct v0.1 orchestrator with entirely in-memory adapters. The audit confirms earlier finding in `docs/reality-discovery-to-self-upgrade-end-to-end-gap-map-20261026.md`, not an already-shipped fix.

### P1 — semantic correctness still unproven and prior negative evidence
`docs/reality-authentic-12turn-continuity-detection-audit-20261025.md`: real GPT-4.1-mini 12-turn synthetic construction/EDI case had 0 detector findings, 0 repairs, 12/12 partial reviewer coverage; unverified reported payer acknowledgment was later asserted as payer fact without correction. Another `docs/reality-real-model-full-loop-v0.1.md` 16-turn study's **non-blind preliminary** original/final review identified 3 apparent raw-error turns and 5 Reality-final-error turns, with false quarantines and missed wrong-topic turns. These runs precede some later source repair code, and the newer repairs have NOT yet earned independent held-out accuracy proof. Do not claim a drift reduction, much less zero error.

### P1 — live self-improvement is a contract, not an end-to-end autonomous upgrade
`src/reality-self-evolution-v0.1.js` describes detect -> rank -> propose -> sandbox -> verify -> promote -> learn -> replan with 13 status transitions, but these are pure state functions. `src/reality-self-build-controller-v1.0.js` and the GitHub provider CAN write a branch and open a PR with caller-supplied code; that is NOT proof the system diagnosed a limitation and independently generated/fixed/tested the code from its own Continuity evidence. Synthetic full-loop code explicitly uses an EXISTING sandbox adapter, no model-generated patch, no real PR merge, and only ephemeral sandbox state. Promotion approval must be separate from goal authorization and the one-time business-action approval.

### P1 — cross-business generality is architectural, not validated deployment
`src/reality-world-observation-fabric-v0.1.js` has normalized Gmail/Calendar/GitHub evidence interfaces, but the live autonomous shift mainly examines Reality GitHub observations; actionable built-in connector writes cover Github `create_issue`, Vercel `create_deployment`, Supabase `insert/update/delete`. No end-to-end verified customer construction, claims/EDI, or multi-tenant business connection was observed. Multi-tenant scheduling and service account isolation remain separate requirements.

## Existing proofs that must NOT be discarded

1. **Synthetic full loop** `src/reality-full-loop-sandbox-proof-v0.1.js`: seven hash-linked steps and independent reconstruction of an in-memory sandbox task; authoritative path for integrating identity/receipts. See `docs/reality-full-loop-e2e-proof-20261024.md`.
2. **External historical regression evidence** `docs/reality-first-external-proof-20261024.md`: read-only GitHub verification of previously failed then passed real CI; does not establish autonomous cause or repair.
3. **Real LLM continuity evidence**, including missed source-to-fact drift and false-positive repair: retain originals and test fixes on held-out cases rather than rewriting benchmark history.
4. **Authenticated Continuity/persistent chat and goal controls** on isolated Preview, with private RLS and bitemporal source-linked projection. Check current server-to-browser round trip, not just mock tests.
5. **Atomic reserved execution**: Oct-27 installed isolated table/RPC; real competing claims yielded 1 admitted, 1 rejected; clean-up verified. Targeted no-cost 57/57 suite and four reported CI workflows passed. These do not constitute whole-repository CI or live business execution.

## Fastest honest path to first COMPLETE cycle

**Stage 0 — contain bypasses before real connector writes.** Disable or harden older client-authorized `self-build` and direct connector issue endpoints; verify against deployed production source, plus regressions for forged/anonymous requests. No weakening of current limits.

**Stage 1 — one canonical work ID.** Reuse the Home discovered GitHub CI failure/issue (actual provider event, not a synthetic sandbox scenario). Persist `work_id`, `goal_id`, source event refs, success predicate, timeline and current status in existing Continuity. No second goal DB. Bind progress to the original source and same authenticated owner.

**Stage 2 — one real governed work action.** Wire that card to Supabase private PREPARE -> explicit exact-work approval -> single-use RESERVE -> trusted internal dispatch -> fresh GitHub issue readback -> durable settlement and Continuity. Cap scope to one harmless preapproved issue in Reality's repo, and forbid merges/deploys. Verify actual signed-in preview against the installed isolated DB before first external action.

**Stage 3 — learning and next work.** After independently verified issue creation, write a source-linked learning/outcome delta, reproject the same work and show the NEXT real investigation/repair task, not a fabricated "completed bug fix". Use a fresh next-step authorization if consequential.

**Stage 4 — real repair/self-upgrade.** Select one demonstrated failing regression or business workflow. Reality reads failing source/log, proposes bounded patch, creates isolated branch/PR under separate approval, runs frozen + independent CI, confirms GitHub changed source and pass, and asks explicit merge/promotion permission. Continue the ORIGINAL task, prove changed outcome, persist before/after metrics and show learning affecting next plan. Never infer promotion from a passing sandbox.

**Stage 5 — cross-business repeat.** Take same proof protocol to Juan's real construction task with real source systems (inspection, vendor, homeowner approval), then workers comp/EDI. Each industry needs source adapters and scope-specific action semantics; retain universal governing primitives. Track real minutes, dollars, cost per action, corrections and customer impact. No performance or ROI claim without supporting receipts.

## Exact end-state contract

`Source observation → governed opportunity/work discovery → user-owned GoalState → evidenced plan/preflight → exact action authority → single-use atomic dispatch → external provider observation → independent verification & reconciliation → durable learning → tested bounded improvement proposal → separate promotion authority → return to SAME objective → next work automatically discovered`.

Continuous signal cleaning, independent epistemic status and source provenance are required throughout. A model's suggestion is **never** a user goal, a saved action is **never** a verified business outcome, and an upgrade candidate is **never** authorized production code. The user should not have to re-prompt work already established in Continuity; the system can continuously discover and prepare it while reserving consequential authority for the user.

## Acceptance criteria, with no arbitrary optimism

A single frozen real work ID carries a validated provenance/authority/observation chain across browser, server restart and authenticated DB; one authorized action executed exactly once by Reality (or marked uncertain with no retry); independent provider readback and persisted receipt; credible before/after effects; verified learning actually changes subsequent plan; an optional isolated upgrade passes known+held-out regression tests and is never promoted without separate approval; dashboard honestly shows all stages including incomplete and blocked. Then test held-out multi-turn semantic drift and failure recovery. Until this is observed, claim **architectural building blocks and sandbox capability**, not an autonomous production business operator.
