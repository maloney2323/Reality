# Reality Drift, Detector and Customer ROI Audit — 2026-10-22

**Scope:** Source-level review of the draft stack through `eval/signal-cleaner-reference-audit-20261022`, and the separately inspected Vercel deployment behind `reality-blond.vercel.app`. This is **not** an end-to-end security review, a production penetration test, a live drift benchmark, or a certification.

## Deployment provenance / release blockers

- GitHub default branch is `main`. Newer source runs through draft PRs #77 (continuity repair) → #79 (authenticated continuity entrypoint) → #80 (Signal Cleaner v0.2) → #81 (adversarial reference audit); #78 is a separate 12-turn synthetic side branch.
- The observed Vercel production alias pointed to `feat/continuity-spine-v2`, commit `af3a6a5f534591ffe26eee16eb31d70db4620179` when inspected; it is **not** this development stack. A `READY` build is not proof of model correctness, authenticated state or verified business work.
- Vercel's project API returned `live:false` even as the aliased deployment was `READY`. Do not infer application functionality from either field alone.
- The web UI has no authenticated independently verified Impact event-feed integration; `Not measured` is correct. This branch adds meaningful measurement *slots* and a separate paired scorecard, not fabricated values.
- The server still lacks demonstrated durable authenticated business user identity and server-attested original work item lineage for one-click execution. Block production promotion of new execution paths until this is independently tested.
- Never merge stacked PRs blindly or turn on production deployment merely because CI is green. Confirm merge-base ancestry, preview provenance, readback and customer permission before promotion.

## Detector audit inventory

| Layer | What the reviewed source does | Limitation / severity | Required proof before claiming reliability |
| --- | --- | --- | --- |
| Signal Cleaner v0.1 → v0.2 draft | Immutable raw packet, spans, preliminary classifications, data-only receipts and replay | **HIGH** — v0.2 is not live; provisional adversarial audit met 17/28 expectations and missed negation and complex instructions | Independent frozen annotations; recall, false positives, unchanged raw source, quoted prompt injection and no authority promotion |
| Typed epistemic-difference detector | Detects same-effective-time field conflicts, legitimate later updates, speculative claims and unattested completion receipts | **HIGH** — only explicitly structured claims, observation-only; does **not** adjudicate natural-language hallucinations | Unseen structured+natural-text mix; evaluate class confusion and key/entity/time scopes; zero cross-customer leakage |
| Trusted observation admission | Server source readback and scoped receipt admission | **HIGH** — needs proven live connector source verification and restart persistence | Tampering, forged source IDs, replay, cross-tenant, restart readback |
| Discrepancy ledger / reconstruction | Append-only targeted discrepancy transport and unresolved state projection | **MEDIUM/HIGH** — independent resolution event and full lifecycle integration still unproven | Detection → receipt → unresolved pin → independently verified reconciliation → durable readback |
| Continuity and context selection | Persistent history / open state selection and pinned unresolved obligations | **HIGH** — session/authenticated root and real restart durability not yet demonstrated across the full live chain | 100-turn customer scenario; restart/reconnect; preserved obligations and deliberate change handling |
| Verification / layer handoff | Integrity checks and stored handoff receipts | **HIGH** — hash/integrity is **not** factual correctness; v0.1 verification has narrower scope than claimed by name | Source-bound independent readback, provenance and semantic outcome adjudication |
| Execution-state outcome verification | Server bridges invoke execution and check outcome | **CRITICAL** — previously accepted caller authority and browser-provided proof context; verifier could self-assert `verified:true` without `independent:true` | This branch rejects caller authority and client warrant context and requires independent verdict; separately establish authenticated business authorization, exact work identity and readback |
| Critique / friction | Challenges alternatives, computes evidence/risk friction | **MEDIUM** — heuristics are not calibrated truth probabilities | Reliability calibration and non-escalation of authority |
| Impact projection | Counts independently referenced catches, containment, fixes, promotions and realized benefits | **HIGH** — upstream authenticated receipt validation/feed absent; previously duplicated grades and benefit receipts could inflate totals | Deduplication tested; cryptographically/source-verified admission; customer attribution and measurement windows |
| Training ground / autonomous updates | Sandbox and human-approved promotion gate prototypes | **HIGH** — passing synthetic tests is not proof of deployed self-improvement | Held-out evaluation, no promotion without customer/owner consent, regression & rollback receipts |

## Required operational metrics (with denominators)

1. **Measurement coverage:** independently graded turns / all eligible turns. Include unknowns/abstentions and sample size, never claim 0% drift from zero grade receipts.
2. **Native model drift escape:** graded material divergences still present in output or persisted state / graded eligible opportunities; distinguish factual drift, intent drift, continuity, execution state, and completion assertions.
3. **Detector performance:** precision = independently confirmed true alerts / independently graded alerts; recall = independently confirmed detected failures / all independently graded failures. Count false positives and unobserved coverage separately. An alert by itself does not prove a catch.
4. **Reality containment:** independently confirmed model errors blocked before customer-visible/external effects / independently confirmed model errors. A caught error is not necessarily repaired.
5. **Verified completion:** customer outcomes externally read back and independently verified / all assigned comparable workflows. Exclude blocked, proposed and merely executed work from numerator.
6. **Paired improvement:** *same* frozen case digest, model/configuration, grading contract and external verification in model-only, model+Cleaner, and full Reality lanes. Show sample size and missing pairs. Never compare incomparable jobs.
7. **Time and cost:** observed human review minutes, tool/API cost, retry cost, and verified cost per completed workflow per lane. Report increases as well as decreases.
8. **Realized customer ROI:** (customer-confirmed attributable measured benefit − attributable operating cost) / attributable operating cost. If cost is zero or the evidence isn't available, percentage is **Not measured**, never infinity or a vendor estimate. Forecast avoided damage belongs in a distinctly labeled **scenario** panel, not verified savings.
9. **Continuous integrity:** uptime, ingestion latency, source freshness, missing evidence, pending obligations, receipt readbacks, duplicate/conflicting grades and source-to-UI provenance.

Each customer card needs **time window, scope/tenant, case count/denominator, underlying model/version, grading method, detector/parser version, verified receipt links, freshness, and measurement limitations**. Show a delta when evidence changes; preserve historical reports without rewriting older evaluations.

## Fixes staged on audit branch

- `src/reality-value-scorecard-v0.1.js`: paired model-only/model+Cleaner/model+Reality cost, human review, completion, drift escapes, precision/recall with explicit NOT_MEASURED and no financial ROI inference.
- `src/reality-impact-evidence-v0.1.js`: exclude duplicate/ambiguous drift grades, duplicate correction/release/outcome receipts; expose a realized ROI percentage only for a positive verified cost denominator.
- `api/reality/execute.js`: reject browser-supplied authorization and evidence/learning context; derive executable authorization solely from server-persisted policy. Independent source observation provenance for warrants is **not yet built**, so the handler must report `PROVENANCE_INPUT_REQUIRED` rather than invent a warrant.
- `src/reality-governed-execution-engine-v0.1.js`: require `verified:true` AND `independent:true` for `VERIFIED` status.
- `index.html`: remove browser-generated support/friction evidence claims, temper health readiness language, add clear unmeasured value metrics (completed work, lift, coverage, rework minutes, cost per verified outcome).
- Corrected a malformed URL trimming expression in `src/reality-connector-supabase-v1.0.js` that prevented importing the connector in Node (found by cross-layer CI).
- Corrected the signed principal cookie parser to accept the Reality cookie in any position among ordinary browser cookies; added continuity regression.
- Changed the work-runtime execution gate so `nonconsequential` caller metadata cannot bypass explicit authority.
- Changed initial customer work counts to an em dash until an actual query returns a count; unavailable telemetry is not automatically zero.
- Added deterministic regression suites and a dedicated GitHub Actions workflow. They prove these code contracts only; they do not perform paid model comparisons or customer integrations.
- Latest targeted audit run at https://github.com/maloney2323/Reality/actions/runs/39858837012 passed **43/43 deterministic tests** in two test groups; related targeted continuity, live orchestration, authenticated entrypoint and governed execution workflows also passed at the audited commit. These do **not** establish semantic detector recall, autonomous task completion, verified customer ROI, or deployed production correctness.

## Exit gates before the 100-turn construction test

1. Audit-stack PR merge dependencies and CI with no unreviewed changes; preview-only source/commit verified.
2. Source principal authenticated; tenant/worldline scoped; external connector readbacks and persistence proved including after restart.
3. Independently adjudicated, sealed held-out corpus with no training/evaluation leakage; fixed test plan for all three lanes.
4. Detector coverage/FN/FP reported, null coverage not silently zero; no consumer-facing model-error claims without grader receipts.
5. External execution blocks caller-fabricated authorities and warrants; customer authorization explicit, bounded, non-replayable and linked to authenticated work.
6. Customer UI renders actual authenticated event feeds with evidence references and correct freshness; otherwise stays `Not measured`.
7. ROI counted only from measured, customer-attributable benefits and costs; run-cost and review-cost comparison independently scored.
8. Then run escalating tests: independent semantic parser corpus → 12-turn integration → 50-case business workflow → 100-turn continuity/drift/consequence benchmark.

**Disposition:** **NOT READY for truthful customer ROI or autonomous execution claims**. Source controls are improving; production, semantic coverage and customer impact require separate evidence.
