# Reality — adversarial 50-case / 100-turn test-readiness audit
**Audit date:** 2026-10-21  
**Working branch:** `fix/governed-verification-and-context-boundary-20261021`  
**Draft PR:** https://github.com/maloney2323/Reality/pull/75  
**Audit scope:** connected GitHub source and workflows, Base44 frozen benchmark source files, Vercel Preview evidence from prior build, no-cost regression suites. This is an architecture/integration audit, not a full penetration test or independently repeated paid model benchmark.

## Evidence-based verdict
`PREVIEW_BUILDABLE` and `CONTROL_BOUNDARY_CODE_UNDER_REVIEW`.
**Not** `REALITY_VS_BASELINE_MEASURED`, `HALLUCINATION_RATE_PROVEN`, `100_TURN_END_TO_END_PROVEN`, `AUTONOMOUS_WORK_LOOP_PROVEN`, or `PRODUCTION_RELEASE_APPROVED`.

## A. Preserved frozen corpora (do not rewrite test cases to improve score)

| Corpus | Current primary source | Frozen SHA-256 of source file |
|---|---|---|
| 50-case six-sector adversarial | Base44 `base44/shared/experiments/business-adversarial-50-six-sector-v0.1.js` | `a8a989203915d8614d73eda08ffe24e8cec040e19c6654cb83e6785ea5d3d81c` |
| 100-turn inputs | Base44 `base44/shared/reality-core/reliability-benchmark/openai-isolated-100-turn-inputs-v0.1.js` | `fe2b039e6ffbdc75a8a7a099590f3e49e62c7031e90315efb7522b68e1f26bc8` |
| 100-turn expected state | Base44 `base44/shared/reality-core/reliability-benchmark/openai-isolated-100-turn-expected-state-v0.1.js` | `0c7fd264eeca50e50ffe2f3109618bd4d22a1d790217a23753273bc10f2860f1` |
| 100-turn scorer | Base44 `base44/shared/reality-core/reliability-benchmark/openai-isolated-100-turn-scoring-rubric-v0.1.js` | `b36b822c6663ddf399c7c6f4f907dca6a3edc16995a5e4f9599f99db2e7be05b` |

The Base44 `reality-business-adversarial-50` endpoint explicitly states its `reality_lane: NOT_CONNECTED_IN_THIS_RUNNER` and labels post-hoc detector findings as diagnostics, **not** a governed-generation comparison. A historical standalone baseline score (36/50) must never be presented as a measured Reality treatment result.

The GitHub `api/reliability-benchmark-openai-standalone.js` is also an **OpenAI-only** drift/factual runner using an LLM judge; do not conflate that corpus/scorer with the frozen 50-case six-sector test or call its judge independently verified provider truth. The runner now has a credential-protected **dry-run preflight without model API keys**; paid calls remain unavailable when the key is not configured.

## B. Concrete findings and remediation

| Priority | Finding | Remedy in draft | What still needs proof |
|---|---|---|---|
| P0 | Public chat did not provide a durable authenticated per-conversation root. Cross-turn test could not bind prior state. | Added `reality-authenticated-conversation-v0.1.js`; route requires `conversation_id` and derives root from verified Base44 identity and opaque thread selector. Frontend supplies per-tab selector. | Positive Base44 login, live server-backed persistence and cross-process retrieval |
| P0 | Consequential request left continuity as `ACTIVE` on every new turn; unfinished action obligation was not retained. | Live orchestration now records server-owned `UNRESOLVED` pending obligations, persists them in continuity events, carries them forward, and stays `WAITING`; cannot close based on model claims. | Genuine 100-turn factual/semantic preservation, revocation/supersession contract, independent closure, durable receipt-backed external action |
| P0 | Cron runners accepted arbitrary `Bearer` or spoofable User-Agent. Shadow writes could run from an unauthenticated request. | Exact timing-safe `CRON_SECRET` check; no manual bypass. Shift route also removes anonymous principal and disables global config writes by default. | Preview cron-secret provisioning + observed genuine signed schedule tick; per-tenant shift configuration |
| P0 | Legacy public self-build accepted caller-supplied `authorization.authorized:true` and could open GitHub PRs. | Legacy endpoint now requires verified Base44 identity and is **unconditionally unreleased** until centralized approval/readback exists. | Human-signed capability approval and trusted executor implementation |
| P0 | System-access exposed direct GitHub writes, connector endpoints accepted caller-provided authorization, and model probe could spend API calls unauthenticated. | System-access POST now authenticates and direct writes are unreleased; connector HTTP routes require separately enabled internal keys; paid model probe gated/authenticated. | Positive server-to-server credential and independently verified provider outcomes before enabling write flags |
| P0 | Legacy world action envelope could return 202 "accepted" from body-asserted authorization. | World POST now authenticated and unreleased; GET plainly indicates no provider writes. | New single trusted action pipeline replacing legacy envelope |
| P0 | 50-case and 100-turn Realit**y** governed treatment lanes are not end-to-end measured on the same frozen cases. | No paid test was run or baseline modified. | Exact matched runner plus independent receipt-level grading and final-claim/unauthorized-action scorer |
| P1 | Chat publication regex only catches a narrow subset of unverified external-completion claims; historical CP-12 showed a fallback escape. | Last-mile egress checks in draft chat and Base44 drift runners; known denied snippets blocked after fallback. | Semantic factual/contradiction verifier with known false-positive rates and end-to-end final-output gate |
| P1 | Claim ledger exists as independent module but is not the mandatory live source of truth for corrections, facts, and revoked obligations. | Pending action conservation added; ledger module itself preserved. | Integrate fact/obligation events into live runtime, bitemporal replay, correction and revocation proof; avoid replacing prior truth silently |
| P1 | Model/provider access and independent action verification absent from restricted Preview. | Preview action flag explicitly OFF; provider write surfaces held closed. | Legitimate authenticated chat, dedicated scoped Preview key, trusted DB key/role, signer custody, provider readback |
| P1 | 100-turn tests supplied as histories are not equivalent to 100 independent requests against the same live session. | Added **100 simulated sequential orchestrator calls** with mocked persistence and model, one unfinished obligation preserved, second appended, account isolation verified. | Repeat as 100 real HTTP turns with restarts, injected contradictions, deliberate tool failures, changing policies; no conflation with synthetic test |
| P1 | No reliable evidence that approved upgrades restored the customer's original pending task. | Promotion paths fail closed and signed admission scaffolding exists. | Real scope-bound signed approval, durable nonce use, replay check, readback of deployed capability and original task outcome |

## C. No-cost regression scope and limitations

The new targeted test suite covers:
- a simulated 100-turn server persistence/rehydration path (mocked model and mock storage), preserving an unresolved customer email and appending another later obligation;
- principal isolation for the same caller-supplied thread selector;
- forged generic-Bearer / spoofed User-Agent cron requests and unauthenticated shift writes;
- legacy self-build, GitHub connector, system-access, world envelope and paid model-probe negative paths;
- final chat egress receipt checks and live HTTP route imports;
- access-controlled, zero-cost standalone-benchmark preflight.

These are **architectural tests**; they do not demonstrate that a real LLM maintains accurate facts/obligations across 100 turns. CI statuses and exact successful commit should be added after CI completes.

## D. Recommended matched experiment protocol (when deployment preflight is genuinely ready)

1. Freeze both original Base44 corpora, expected states and scorers at the hashes above. Create distinct test-run identity and record provider/model/settings, case IDs, branch SHA, Base44 checkpoint, operating lane, pricing/call budget, and receipt root.
2. **Baseline:** raw underlying agent only, same facts and opportunities for legitimate actions.
3. **Reality:** same underlying model, identical cases/tool privileges, real continuity + action gates + publication, with exact authorization and readback sourced outside model output.
4. Replay 100 turns **sequentially** through a single authenticated thread. Inject fact corrections, contradictions, competing obligations, authorization revocation, failed tool calls, provider outages and long pauses; capture every actual response and external effect.
5. Score **separately**: hallucination detected, escaped unsupported consequential claims after final publication, drift/obligation loss, unauthorized actions attempted and performed, wrong authorizations blocked, legitimate work falsely refused, independent verified task completion, recovery time, costs, receipts completeness.
6. Require fail-closed truthfulness of every missing evidence field. An unscored or failed provider call stays **UNSCORED/UNRESOLVED**, not PASS or 0% hallucination.
7. Compare rates only within matched denominators and identify severity. Do not infer enterprise reliability from small synthetic passes.
8. After verification and explicit owner approval, enable scoped Preview executor; never silently enable production actions for an audit.

## E. Production GO/NO-GO

- **GO:** automated deterministic tests, signed/isolated evidence receipt preflight, nonwriting Preview smoke, security-negative tests.
- **NO-GO:** production promotion, externally consequential writes, paid benchmark comparison, marketing "0 drift/hallucination", automatic capability activation.
- Require dedicated Base44 auth, a scoped Preview model key, backend persistence, verified identity-to-thread transport, fully wired signer/nonce, actual independent provider state readback, and same-commit deployment trace before any claimed live proof.

This audit is intentionally conservative. It documents both tested repairs and remaining integration weaknesses, not a blanket guarantee that all routes and data flows are free of defects.
