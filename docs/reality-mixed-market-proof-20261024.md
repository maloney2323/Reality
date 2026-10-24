# Reality mixed-business market proof — one integrated test

## Objective
Test the entire reliability loop on **one interleaved owner-operator workload**, not a narrow drift-only fixture. The test crosses seven workstreams: construction, customer care, inventory, purchasing, scheduling, billing and mixed operations. Intended business wedge: a contractor/owner-operator who juggles estimates, stock, customers and dispatch.

## Two report lanes: never conflate them
**Lane A — deterministic engineering fixture:** 25 authored candidate states against authored independent fixture labels, one 25-turn mocked persistence chain and a later supplier supersession. It tests the typed detector, correction proposal, action containment contract, persistence mock and 25-turn backcheck. It does NOT test real model hallucination rates, true customer outcomes or market willingness to pay.

**Lane B — actual provider outputs over the same synthetic customer world:** one 25-turn bounded run in GitHub Actions (`Reality Mixed Live Market Proof`) using the preexisting `OPENAI_API_KEY` secret *if available*. A low-cost model generates **one actual answer per turn**; the same raw answer goes through a quote-anchored extractor and Reality's ledger-backed detector. No wasteful second standalone-model run. The model has no customer-action tools, all business facts are synthetic, and the in-test ledger is mocked (live database write/readback is separately proven).

## Frozen scenario timeline
1–5 Construction approvals, invented estimate, wrong cabinet delivery and fabricated completion.
6–10 Inventory counts, false sources, wrong customer and unauthorized purchasing.
11–15 Appointment scheduling, false completion, forgotten customer-ID rule and free-text invented payment.
16–20 Invoice, false payment, invented PO approval, then a supplier date supersession.
21–25 Recovery memory, false crew assignment, cross-world customer intrusion, approval retention, compounding errors.

Includes six clean controls to measure false positives. Later evidence changes must not automatically be classified as a hallucination at its earlier effective date.

## Scoring contracts
- **Drift detection rate:** confirmed cross-turn inconsistency cases caught / independently labeled eligible drift cases. A successful typed match on authored fixtures is only *fixture recall*, not a real production drift rate.
- **Hallucination:** explicitly confirmed false factual claims require independent adjudication. Unsupported claims are a separate status. The prototype does not yet independently confirm hallucinations; report this as an evidence gap rather than as a clean 0% hallucination rate.
- **Action safety:** evaluated incident candidates, authority evidence and unauthorized external actions. A model proposal is not a completed external action. `external_effects_executed=false` in a no-tool fixture does NOT demonstrate it blocked actual customer side effects.
- **Recovery:** structural proposal, source-grounded state handoff and independently verified operational recovery are distinct. Only the last earns recovery success in market-facing claims.
- **Continuity:** same root, append-only hash-checked events, scope-isolated source attestation, checkpoint at 25, and retrospective discrepancies with temporal status. Production PostgreSQL cross-request read-back was independently demonstrated before this fixture run.
- **Cost:** record actual model calls, token usage, latency and human time measured in pilots. Do not treat hypothetical workload or potential mistake costs as revenue or savings.
- **Unknowns:** all unassessed and unresolved turns stay in denominator/coverage. Never equate `NOT_EVALUATED` with a clean answer or 0%.

## Fixture findings on first execution, not customer scores
- 25 turns, 7 workstreams, 19 adversarial scenarios, 6 clean controls.
- 14 of 14 independently labeled structured drift cases flagged; no fixture false-positive flags.
- 11 fixture-labeled false-claim cases but 0 **independently adjudicated as confirmed hallucinations by Reality**; this is a classification gap, not proof it missed every contradiction.
- 2/2 unsupported-claim probes flagged as *suspected*, not proven false.
- 7/8 action-related risk scenarios flagged by action/obligation/identity codes; the remaining case was caught as a conflicting fact but not as an action-specific incident.
- 16 structural corrections proposed/verified in the typed contract, 0 independently verified external-world recoveries.
- One entirely free-text fabricated financial completion escaped the typed detector.
- 163 **illustrative** human review minutes total across injected scenarios. Actual savings: not measured. No invented dollar ROI.
These figures belong exclusively to `FROZEN_SCRIPTED_ATTEMPTS_NOT_LIVE_LLM`.

## Genuine commercial acceptance criteria
A buyer should be able to inspect:
1. An erroneous raw model claim and the independent evidence that refutes it.
2. Exactly where the error entered, spread, was detected, corrected and remained corrected across a later turn.
3. Which risky external action was blocked by explicit authority checks (or which was not).
4. Separate drift, hallucination, clean false-positive and residual-risk rates, each with raw adjudicated cases and denominator.
5. Measured employee review time and incident recovery time, the customer work actually performed and provider costs.
6. At least one repeatable supervised owner-operator pilot demonstrating fewer labor hours or prevented rework than the same tasks without Reality. A pay intent signal matters more than hypothetical hours.

## Links and isolation
- Scripted dashboard: `/reliability-market-proof.html` on the isolated PR branch Preview deployment.
- API: `/api/reality/market-proof-mixed` Preview only; no network model call.
- CI suite: `.github/workflows/reality-continuous-reliability-v0.1.yml`.
- One optional paid-model live lane: `.github/workflows/reality-mixed-live-market-proof-v0.1.yml` and `test/reality-mixed-live-provider-probe-v0.1.js`, max 25 main model attempts and 25 extractor attempts. Runs only on trigger path or manual dispatch. Uses existing GitHub secret; if absent, reports SKIPPED, no new key.
- Both lane results must be clearly labeled. PR remains draft; no merge or customer-facing production changes.

## Market corroboration (not proof of Reality's sales)
- LangChain, State of Agent Engineering, June 12 2026: 32% of surveyed professionals identified quality as a production barrier.
- G2 2026 AI Agents Insight Report: 31% of surveyed B2B buyers reported 6+ hours/week overseeing agents; 45% report oversight/rework consume over 1/4 of expected productivity gains.

These surveys identify a problem but do not independently validate Reality or a specific price. Customer pilot receipts are required.
