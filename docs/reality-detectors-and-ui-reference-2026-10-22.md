# Reality Detector & UI Catalog
**Source inventory and customer-display documentation — October 22, 2026**

**Review state:** FOR OWNER REVIEW. **No runtime changes, merges, or deployments were performed for this document.**

**Source reviewed:** GitHub repository [maloney2323/Reality](https://github.com/maloney2323/Reality), branch [audit/detectors-roi-proof-20261022](https://github.com/maloney2323/Reality/tree/audit/detectors-roi-proof-20261022), building on draft PRs #77, #79, #80, #81 and #82. This inventory describes the inspected code, **not an independently certified production system**.

**Production snapshot:** Vercel alias [reality-blond.vercel.app](https://reality-blond.vercel.app) was independently inspected via deployment metadata. Its READY production deployment is from branch **feat/continuity-spine-v2**, commit **af3a6a5f534591ffe26eee16eb31d70db4620179**, not this draft audit stack. Consequently, a feature present in this document or the GitHub UI source is **not automatically available in the production UI**.

**Base44 scope:** Two Base44 apps named Reality are listed under the connection. Source inspection was blocked by exhausted integration credits, so the Base44 builder/mobile UI and its exact screens are **NOT AUDITED** here. This catalog covers the version-controlled GitHub/Vercel UI and its associated service modules. No claim is made that Base44 is identical.

## 1. How to read the statuses

- **CODE EXISTS:** function or contract is present on the audited GitHub branch; does not prove it is invoked.
- **SOURCE-WIRED:** caller/import/route linking modules was found in audited source; does not prove persistence, live data, uptime or semantic correctness.
- **UI DISPLAYED:** a named DOM element exists, or JavaScript sets a value from a route; not necessarily verified operational data.
- **PLACEHOLDER:** shown as "Not measured", "Awaiting ..." or a static description without an authenticated event feed.
- **CONDITIONAL / DISABLED:** a capability has a guard, missing prerequisite, or explicitly disabled path.
- **NOT PROVEN LIVE:** no successful evidence-backed production exercise was produced for this audit.
- **VERIFIED IN CI:** a targeted deterministic or mocked test passed; it does not equal a full production outcome.

A detector flag is not the same thing as a confirmed underlying-model mistake. A hash-integrity verification is not a factual-truth verification. A completed API request is not proof of a completed customer project.

## 2. Architecture and where detection occurs

Human / source / connector → source identity and scope → **Signal Cleaner** → stored source and continuity context → **typed discrepancies / continuity diagnostics** → model interpretation → independent verification of consequential claims → authorization → execution and external readback → outcomes and receipt-ledger → **Impact / training ground / UI**.

This is the intended layered flow. The live implementation remains partial: the Cleaner v0.1 and passive typed diagnostics have a source-level path into live orchestration; Cleaner v0.2, independent semantic model-output grading, paired benchmark scorecards and the Impact customer-feed are not demonstrated end-to-end in the deployed application.

## 3. Detector inventory — what each consists of and actually detects

### D01. Signal Cleaner v0.1: source-preserving fragmentation
**Source:** [reality-governed-fragmented-signal-cleaner-v0.1.js](../src/reality-governed-fragmented-signal-cleaner-v0.1.js)

**Inputs:** raw customer message, source label, observed timestamp. **Mechanism:** constructs raw-signal packet ID/digest; splits at selected newlines and sentence boundaries; normalizes whitespace in derived fragments; records transformation receipts, fragment digests and lineage.

**Can detect/verify:** whether raw packet and deterministic fragment transformation can be reconstructed and checked. **Cannot:** decide whether a claim is true, detect ordinary hallucinations in an LLM's answer, or reliably distinguish the scopes of nested prohibitions. Its OBSERVED status refers to source capture, not external truth.

**Wiring:** imported and used by [live orchestration](../src/reality-live-intelligence-orchestration-v0.1.js) and source-to-model transport on the inspected branch. **UI:** not an independent Signal Cleaner card; a Brief may report admission or proof-plan context. **Live proof:** not separately established by this review.

### D02. Signal Cleaner v0.2: versioned interpretation candidate and replay
**Source:** [reality-signal-interpretation-v0.2.js](../src/reality-signal-interpretation-v0.2.js), [receipt schema](../schemas/reality-interpretation-receipt-v0.2.schema.json).

**Inputs:** original message, time, untrusted source identity claims, parser/version context. **Mechanism:** preserves raw digest, UTF-16/UTF-8 exact spans, parser/schema hashes, source/provenance references, unverified classifications and tentative relationships. Output classifications: QUESTION, REPORTED_CLAIM, REQUEST, PROHIBITION, POSSIBLE_CORRECTION, CONDITIONAL_REQUEST, HYPOTHETICAL, QUOTED_DATA and UNKNOWN. Polarity labels POSITIVE / NEGATED / UNKNOWN. Replay comparison returns parity/refinement-candidate/correction-candidate without rewriting historical receipts.

**Detects/proposes:** candidate negations, possible corrections, quoted instructions, requests and ambiguity; integrity changes to the source/receipt. **Cannot:** certify truth, determine if a reported approval was actually granted, infer authority, establish correct interpretation in all compound or indirect sentences. All extracted candidates are OBSERVED_UNVERIFIED and do not grant authorization.

**Tests:** 50 deterministic regression vectors are design-contract checks. Separate 28-case provisional adversarial evaluation met **17/28 expectations** (and **13/22 critical**); 11 cases failed at least one expectation. This is **not an independently adjudicated accuracy score**, and failed cases include indirect commands, passive prohibitions, negation, quote attribution and compound clauses. See [reference cases](../benchmarks/signal-cleaner-reference-audit-v0.1.json) and [audit tests](../test/reality-signal-reference-audit-v0.1.test.js).

**Wiring:** draft component, **not wired into production chat**. **UI:** no separate version display, source-span inspector, interpretation diff or replay timeline currently connected. **Live proof:** not established.

### D03. Typed epistemic difference detector
**Source:** [reality-epistemic-difference-detector-v0.1.js](../src/reality-epistemic-difference-detector-v0.1.js).

**Inputs:** observations containing explicit typed epistemic_claims, continuity root, entity reference, target state key, effective time, observation time and optional independently verified receipt IDs.

**Actual classifications:**

| Code | What triggers it | Example | What it does NOT prove |
| --- | --- | --- | --- |
| **E_FACT_CONFLICT** | Same scoped entity/key and effective time with conflicting typed values | Two sources assert $90 vs $100 for the same invoice state | Which source is factually correct |
| **E_DELTA** | Later effective state or supported explicit goal revision changes a value | Job status PENDING → COMPLETED at a later effective time | Whether the new fact is independently true |
| **E_UNATTESTED** | Execution-completion claim lacks a recognized verification receipt, or required evidence refs are absent | Assistant says email sent without receipt | That an action did or did not occur |
| **E_HYPOTHESIS** | Explicitly typed hypothetical/counterfactual/speculative claim | "What if the budget doubles?" | A business-world fact |

**Mechanism:** deduplicates event fingerprints, preserves prior/incoming values, source IDs, valid vs assertion times and proposed reconciliation; skips unscoped or invalid typed claims; does not accept natural-language output as verified structured evidence. Scope includes root/entity/field. Matching values do not generate a conflict event.

**Wiring:** source-wired to Universe reconstruction and live persisted epistemic diagnostics. **UI:** the per-turn Brief can show total passive discrepancies, conflict count, affected keys, values, receipts/observation IDs, times and proposed reconciliation. **Critical limit:** **observation only**, no independent semantic judge, automatic correction, blocked model output, or measured false-negative rate.

### D04. Live persisted-source diagnostics: source-window coverage
**Source:** [reality-live-epistemic-diagnostics-v0.1.js](../src/reality-live-epistemic-diagnostics-v0.1.js).

**Inputs:** retrieved scoped source-observation ledger entries. **Mechanism:** accepts source envelopes matching trusted admission provenance and continuity/worldline, removes duplicates, runs D03 against valid entries, records ignored entries and read-window limitations.

**Detects:** typed discrepancies present **in the retrieved working window**. **Does not detect:** all model hallucinations, all historical problems, or all problems across unobserved external systems. Explicit coverage value: RETRIEVED_WORKING_WINDOW_ONLY; semantic_truth_established=false; complete_universe_coverage=false.

**Wiring:** called in [live orchestration](../src/reality-live-intelligence-orchestration-v0.1.js). **UI:** per-turn discrepancy count and list, at most first 20 detail rows. Do not equate "0 discrepancies returned" with "0 drift".

### D05. Discrepancy ledger: durable provenance of detected problems
**Source:** [reality-epistemic-discrepancy-ledger-v0.1.js](../src/reality-epistemic-discrepancy-ledger-v0.1.js).

**Mechanism:** reconstructs original typed observations and discrepancy, checks root/worldline/entity/key consistency, re-reads exact source ledger entries, appends immutable DISCREPANCY_DETECTED records and projects targeted contested/unattested state. Resolution is reserved for independently verified DISCREPANCY_RESOLVED events.

**Detects/guards:** forged or mismatched provenance, attempted scope crossing, unsupported discrepancy assertions, unresolved contested keys. **Does not:** establish factual truth or itself resolve a conflict.

**Wiring:** source module and test support, end-to-end live durable resolution unproven. **UI:** no dedicated discrepancy lifecycle, closure age, resolution receipt or reconciliation-history panel connected.

### D06. Trusted observation admission / source-integrity detector
**Source:** [reality-trusted-observation-admission-v0.1.js](../src/reality-trusted-observation-admission-v0.1.js).

**Mechanism:** verifies observation envelope and expects an independent trusted source verifier with matching principal, root, worldline, observation ID/hash, source record and verification reference; persists and reads back admitted entry.

**Detects/guards:** tampering, forged readback claims, cross-scope source mismatches, unsigned/unreadback observations. **Does not:** prove what a customer meant or that a source's contents are objectively true.

**Wiring:** required for trustworthy source diagnostics; authenticated live connector-admission coverage not proven across all providers. **UI:** no individual admission coverage percentage or failed-source-readback counter surfaced.

### D07. Continuity states and lineage integrity
**Sources:** [continuous continuity](../src/reality-continuous-continuity-v1.0.js), [continuity seam repair](../src/reality-continuity-seam-repair-v0.1.js), [context selector](../src/reality-cognition-context-selection-v0.1.js).

**Mechanism:** formal work states ACTIVE, WAITING, BLOCKED, DEFERRED, SUSPENDED, COMPLETED, REOPENED, RECURRING; validates transitions, roots and parents. The bounded cognition selector prioritizes unresolved obligations, recovery gaps, layer handoffs and other pinned entries rather than silently discarding the entire ledger.

**Detects/guards:** missing parents, invalid scope/lineage, malformed transitions, omitted high-priority context in a bounded view. **Does not:** automatically notice every *semantically forgotten obligation* in a model's answer; ledger completeness also depends on what was correctly admitted.

**Wiring:** source-wired in draft live orchestration. **UI:** continuity mode and latest work status in the Brief; Past/Present/Future is a simpler work-item status count, **not a complete verified continuity-history viewer**. **Live cross-session/restart proof:** not established on current production deployment.

### D08. Dormant continuity discovery
**Source:** [reality-continuity-discovery-v1.0.js](../src/reality-continuity-discovery-v1.0.js).

**Mechanism:** scores resemblance of new evidence to old, dormant continuity summaries and proposes likely roots. **Detects:** potential orphaned or unfinished work to resume. **Does not:** safely establish identity from vague similarity; ambiguity must be preserved.

**Wiring:** in the inspected live-orchestration source, automatic root-independent dormant discovery is behind an explicit false condition (disabled). **UI:** no verified "recovered dormant commitments" count. Do not advertise automatic dormant-project recovery as proven.

### D09. Continuity recovery / outbox integrity
**Source:** [reality-continuity-recovery-outbox-v0.1.js](../src/reality-continuity-recovery-outbox-v0.1.js).

**Mechanism:** stores append intent in an independent durable outbox, verifies primary ledger readback, records recovery/replay and prevents invalid replay of continuity events.

**Detects/guards:** interrupted writes, mismatched readbacks, invalid recovery records. **Does not:** repair semantic model beliefs or guarantee outage recovery in deployed infrastructure without proving durable backing and replay.

**Wiring:** source and tests; production recovery drill not confirmed. **UI:** no connected outbox backlog, oldest gap age, recovered event total or failed retry trend.

### D10. Outcome / execution-state verifier
**Sources:** [governed execution engine](../src/reality-governed-execution-engine-v0.1.js), [work runtime](../src/reality-governed-work-runtime-v0.1.js), [operation ledger](../src/reality-operation-ledger-v1.0.js).

**Mechanism:** checks exact workflow/work item, authorization scope and expiry, external execution receipt, independently verified bridge response, replay conditions and verified outcome status. The draft audit fix requires both verified=true and independent=true and no unapproved execution regardless of a caller-supplied "nonconsequential" label.

**Detects/guards:** unapproved or mismatched action, executor-only success masquerading as a verified outcome, stale authorizations, duplicate operations and unverified outcomes. **Does not:** certify business success unless the external observed state is genuinely compared with the customer's approved success conditions. Authentication, nonce/replay and trusted work-item admission are still release gates.

**Wiring:** [execution API](../api/reality/execute.js) has source-level path. **UI:** Authorization button; shows "Authorized & verified" only if server reports VERIFIED. No complete external receipt/attempt audit UI. **Production:** no new draft fix is deployed.

### D11. Evidence warrant / signed-link integrity
**Source:** [reality-evidence-warrant-v1.0.js](../src/reality-evidence-warrant-v1.0.js).

**Mechanism:** binds observation IDs, evidence refs, friction/epistemic assessment, work proposal, authorization, execution, verification and outcome into a hash-linked warrant; checks chain integrity and refuses authority or policy mutation from a warrant.

**Detects/guards:** altered warrant content and broken parent hash linkage. **Does not:** independently check the *truth* of warrant contents; a consistent hash can cover false input. The audit removed a browser-supplied proof path in execution; trusted server-side warrant generation remains unfinished. **UI:** no human-readable linked warrant card.

### D12. Capability gap detector, v0.1 / v0.2 / v1.0
**Sources:** [v0.1](../src/reality-capability-gap-detector-v0.1.js), [v0.2](../src/reality-capability-gap-detector-v0.2.js), [v1.0](../src/reality-capability-gap-detector-v1.0.js), [gap projection](../src/reality-capability-gap-projection-v1.js).

**Mechanism:** groups capability observations, calculates observed failure rates, applies a sample minimum and failure threshold, and builds research problems. Later versions can exclude already present capabilities and connect to recurring work discovery. Gap projection marks proposals as pending/non-authoritative.

**Detects:** repeatedly observed inability or missing capability, when evidence is supplied. **Does not:** establish that a proposed upgrade works, prove market demand, or automatically grant source-code write/production execution authority.

**Wiring:** training/capability prototype modules and API paths exist; not verified as continuously detecting live customer-specific skill gaps. **UI:** shift mission lists "Evaluate capabilities and gaps", but no connected per-capability failure trend/upgrade-success panel.

### D13. Intelligence training-loop input adequacy checks
**Source:** [reality-intelligence-training-loop-v0.1.js](../src/reality-intelligence-training-loop-v0.1.js).

**Mechanism:** checks whether a turn returned an answer, had a governed signal packet/transform receipt, and had system context. Labels RESPONSE_GENERATION, EVIDENCE_GROUNDING, WORLD_CONTEXT_ACQUISITION gaps as appropriate, then proposes evaluation.

**Detects:** missing answer or minimum structured inputs. **Does not:** measure actual answer correctness, hallucination or 100-turn drift. "NO_MATERIAL_GAP_DETECTED" is a narrow input-presence check, not a quality certificate. **UI:** no dedicated live gap counts.

### D14. Epistemic friction / risk gate
**Source:** [reality-epistemic-friction-v1.0.js](../src/reality-epistemic-friction-v1.0.js).

**Mechanism:** scores evidence references, corroboration, temporal consistency, source reliability, precedent and contradiction penalty; assigns INSUFFICIENT_EVIDENCE / CONTESTED / SUPPORTED / STRONGLY_SUPPORTED and MAXIMUM/HIGH/STANDARD/LOW friction.

**Detects/flags:** need for greater verification effort, contradictory or weak evidence. **Does not:** output calibrated probability of factual truth; the numeric score is explicitly deterministic policy strength. Friction does not grant authority. **UI:** no connected risk calibration or error-bar display.

### D15. Adversarial critique and investigator
**Sources:** [adversarial critique](../src/reality-adversarial-critique-v0.1.js), [investigator](../src/reality-investigator.js), [evidence acquisition](../src/reality-evidence-acquisition-engine-v1.0.js).

**Mechanism:** records absent proposal evidence, missing alternative explanations, authority restrictions, unavailable investigation sources, and contradictions between supplied evidence receipts; proposes follow-up evidence acquisition.

**Detects/flags:** insufficient challenge, unsupported proposal basis and unresolved evidence conflict. **Does not:** function as a validated model hallucination classifier or establish ground truth from copied claims. **UI:** normal Brief can give proof plan, but no independent case-by-case critique/confidence view.

### D16. Work/attention, recurring-work and self-inspection signals
**Sources:** [attention stewardship](../src/reality-attention-stewardship-v0.1.js), [Shadow observer](../src/reality-shadow-observer-v0.1.js), [system discovery](../src/reality-system-discovery-v0.1.js), [Universe reconstruction](../src/reality-universe-reconstruction-v0.1.js).

**Mechanism:** ranks evidence-backed work, priorities, unresolved commitments, recurring patterns; Shadow module categorizes GitHub commit-history observations into recurring work; system discovery checks expected repository components and snapshots; Universe reconstruction can surface tentative obligations from source events.

**Detects:** candidate work, missing required system components, repeated observed GitHub activity, some inferred unfinished obligations. **Does not:** demonstrate Android app-usage capture, fully autonomous debugging, comprehensive security scanning, or actual hours saved from recurrence alone. GitHub Shadow observations are not equivalent to verified phone activity.

**Wiring:** some work discovery is source-wired through [stewardship endpoint](../api/reality/stewardship.js). **UI:** Work Reality Found, Attention queue and Past/Present/Future. These are candidate/operational-state views, not detector accuracy or ROI receipts.

### D17. Model benchmark / training-ground evaluators
**Sources:** [GSI training ground](../src/reality-gsi-training-ground-v0.1.js), [intelligence gain](../src/reality-intelligence-gain-v2.0.js), [value scorecard](../src/reality-value-scorecard-v0.1.js).

**Mechanism:** frozen benchmark versions, visible vs held-out case IDs, candidate evaluation and regression gates, training evidence lineage, paired lanes and basic truth/error labels supplied by an external grader. The value scorecard expects MODEL_ONLY, MODEL_PLUS_CLEANER and MODEL_PLUS_REALITY matching case digests, model IDs and grading contracts; measures completion, drift escapes, human review, cost and detector true/false positives/negatives.

**Detects/measures only when graded data is supplied:** differences between matched experimental arms, candidate regression and measured model-error detection. **Does not:** itself generate independent semantic gold answers, call models, supply production telemetry, establish commercial ROI or guarantee fair benchmarks.

**Wiring:** source/test scorecard is present; **no authenticated route populates the customer Impact UI from this scorecard**. For unrun lanes the only truthful status is NOT_RUN / NOT_MEASURED.

### D18. Reality Impact receipt filter (measurement validator, not a detector)
**Source:** [reality-impact-evidence-v0.1.js](../src/reality-impact-evidence-v0.1.js).

**Mechanism:** checks record tenant equality and required independent grade/catch/correction/release/customer-benefit receipt reference fields; excludes ambiguous duplicate grades and repeated outcome receipts; counts only eligibility-qualified records; produces drift numerator/denominator and realized ROI fields where supplied.

**Detects/guards:** ungraded records, missing receipt references, some duplicates and cross-tenant input. **Does not:** perform authenticated source readback on receipt contents, verify that the named grader was really independent, detect missed errors, or create customer savings. Its output explicitly says receipt readback is still required.

**Wiring:** calculation module exists, but **not connected to a production customer Impact feed**. **UI:** the 11 metric boxes are placeholders until that feed is built and verified.

## 4. Most important missing or incomplete detectors

| Desired detector | Existing related ingredients | Unproven piece |
| --- | --- | --- |
| **Free-text hallucination detector** | Signal interpretation, typed discrepancies, critique, warrant | Independent evaluation of model answer claims against reliable outside evidence, with precision/recall |
| **Cross-turn factual drift** | Continuous ledger, state-key comparisons, context selector | Detecting when a model answer contradicts earlier verified customer facts and tracing escaped turns |
| **Intent / scope drift** | Signal Cleaner requests/corrections, work-intent and approval contracts | Comparing every revised plan/action with immutable original customer goal and explicit authorized revisions |
| **Forgotten obligation / task drift** | WAITING/BLOCKED continuity states, pinned obligations | Live auditing of omitted obligations after 100 turns, restart, reconnection and task handoff |
| **Execution hallucination** | Execution engine, operation ledger and independent bridge API | Full external outcome readback for all consequential connector operations, including unknowns/retries |
| **True positive / false positive drift detection** | Independent grading fields in the scorecard | Actual unbiased graded set, detector false-negative sampling, threshold selection and uncertainty intervals |
| **Automatic discrepancy recovery** | Recovery outbox, append-only discrepancy ledger | Safe semantic reconciliation, independent resolution proof and next-turn repaired-state validation |
| **Customer-specific savings detector** | Impact receipt filter, paired cost data | Authenticated work, actual recorded review time, baseline and realized cost/benefit attribution |
| **Detector health / blind-spot monitoring** | Source observation counts, ignored entries, context coverage | Freshness, connector coverage, missed data, detector version, latency and denominator shown in UI |

These are **gaps**, not proof that the architectural goal is impossible. They matter because the intended benchmark should measure what the system genuinely did—not what a label claims.

## 5. The UI: exactly what the inspected GitHub/Vercel page presents

**Source of UI truth:** [index.html](../index.html) on this audit branch. This is the code in the draft source, **not** verification that those changes are on the public Vercel deployment. An inspected DOM placeholder is not a functioning data feed.

### U01. Header, status and chat entry
- Headline "Tell Reality what you need", free-form request box, **Show my plan**.
- GET /api/health updates the page to **API REACHABLE** and displays basic service reachability; not proof a worker is ready, any detector evaluated a case, or work is verified.
- POST /api/reality/intelligence sends the message and renders the cognitive answer, model, intended steps and provenance-adjacent status. It does **not** itself execute external work from this button.
- Read-aloud text-to-speech exists in the browser; it is a usability feature, not a detector.

### U02. "Tonight's Reality Shift" and shift mission
- Visible defaults: engineering readiness **8:00 PM**, autonomous shift **9:00 PM**; enabled checkbox and **8/12-hour** duration choice.
- Display text advertises: bug discovery, unfinished work, recurring work, research upgrades, competition, governed execution and end-of-shift reporting.
- Saving stores local settings and attempts POST /api/reality/shift; UI distinguishes "Saved to Reality" from "Saved locally · server save failed".
- The mission text is a **capability aspiration**, not verified proof the system independently runs every listed kind of work nightly. No verified shift-completion ledger or per-shift ROI counter is rendered in this section.

### U03. Past / Present / Future work timeline
- Three cards show counts derived from the **currently returned work items**:
  - Past: statuses COMPLETED, VERIFIED, CLOSED.
  - Present: WORKING, IN_PROGRESS, VERIFYING, AWAITING_VERIFICATION, NEEDS_AUTHORIZATION, AUTHORIZED.
  - Future: DISCOVERED, READY, PROPOSED, EVIDENCE_NEEDED, QUALIFIED.
- Initial counts show **—** (unknown) until work is retrieved; after retrieving, counts reflect status categories. Status tags are **not independently regraded outcome proofs**.
- Not a complete historical ledger browser; does not yet show *when* each past status became valid or a verified receipt link for each job.

### U04. Work Reality Found + Attention / authorization
- **Find work** / **Put Reality to work** retrieves GET /api/reality/stewardship.
- For each work candidate, UI shows title, reason, status, recurring flag, **evidence reference count**, and optional **expected_revenue** displayed as "Value $". That figure is **not a verified realized saving**.
- Attention queue is derived from work marked consequential/authority-required, with **Authorize this work**.
- Button attempts POST /api/reality/authority then POST /api/reality/execute; success text depends on the server reporting VERIFIED, not simply HTTP success.
- Limitations: work-item identity/approval and independent external readback require runtime proof. The draft UI does not show all scope/expiry details, independent evidence quality, retries, or exact receipts in a customer-friendly way.

### U05. Reality Impact: 11 customer metric tiles

The page contains **all eleven** elements below. In the inspected source, each initially says **Not measured**, and there are **no JavaScript assignments** updating the eleven outputs from authenticated telemetry. These are currently **placeholders**, not populated results.

| Label shown on UI | HTML output ID | What it would need to mean | Current display |
| --- | --- | --- | --- |
| Measured Model Drift | impactDriftRate | Independently graded drifting turns / independently graded turns; include type and coverage | Not measured |
| Verified Errors Caught | impactCaughtCount | Independently proven model error with matching detector receipt | Not measured |
| Contained Before Action | impactContainedCount | Independently proven blocked effect before execution | Not measured |
| Verified Corrections | impactCorrectionCount | Independently confirmed corrected outcome with source-to-result receipts | Not measured |
| Authorized Upgrades | impactUpgradeCount | Owner-approved released change, regression and release receipts | Not measured |
| Verified Customer ROI | impactROI | Realized net benefit / attributable costs with measured baseline and customer confirmation | Not measured |
| Verified Task Completion | impactTaskCompletion | Externally verified completed tasks / all eligible assigned tasks | Not measured |
| Reality Completion Lift | impactModelLift | Paired improvement with same frozen cases, model and grader | Not measured |
| Detector Coverage | impactDetectorCoverage | Graded coverage plus separate false positives, false negatives, precision and recall | Not measured |
| Human Rework Time | impactReworkMinutes | Recorded correction/review time under each model configuration | Not measured |
| Cost per Verified Outcome | impactCostPerOutcome | Total model/tool/review cost / independently verified completions | Not measured |

The Impact header badge says **Awaiting verified telemetry**. Expanded section "**Inspect drift, corrections, and upgrade evidence**" gives five *conceptual* milestones: error confirmed → caught → contained/corrected → benefit measured → owner-approved upgrade. It presently states that **no authenticated, independently verified event feed is connected**, so there is no real event timeline or claim-specific drilldown.

### U06. Reality Brief and work-state inspector
After a successful intelligence response, the Brief can display:
1. **Understood:** message interpretation / answer.
2. **Intended plan:** generated steps or cognitive lanes.
3. **Authority map:** whether external authority was granted (standard cognitive path explicitly says no).
4. **Expected effect:** text describing consequence or noting no external effect.
5. **Proof plan:** evidence instructions or structural context, not a verified external outcome by itself.
6. **Change history:** a static "No revisions yet" message in the inspected template, **not a connected versioned revision-history viewer**.
7. **Show work state**: continuity mode, explanation of ephemeral vs unverified vs durably readback scope, passive discrepancy summary, and execution / verification status.

The Brief's **Inspect source discrepancies and evidence** panel currently exposes:
- Discrepancy code and affected typed state key.
- Previous value and incoming value.
- Proposed reconciliation (not an applied fix).
- Source observation / ledger IDs.
- Effective time and assertion/recorded time.
- Explicit **OBSERVATION_ONLY / Truth not adjudicated** status.
- At most **20** detail entries from the retrieved window, with a notice if more exist.

It **does not** currently show independent model-error adjudication, true-false-positive labels, confidence calibration, correction latency, missed-error sampling, per-turn monetary consequence or whether the corrected result was successfully used on the next turn.

### U07. Areas the inspected UI does NOT have as a working verified feed
- Per-detector operating status, version, uptime, input count, and data freshness.
- Model-alone vs Cleaner-only vs full Reality results chart with same-case evidence and independent grades.
- Persistent 100-turn drift-escape timeline, categorized by cause.
- Open vs resolved discrepancy counts, time-to-correct and false-negative sample results.
- Full original message → cleaned span → selected facts → ledger event → model claim → verifier decision → action/outcome chain.
- Source-proof drilldown with actual readbacks, checksum/signature verification and customer authorization history.
- Verified cost of retries, model usage fees, hours returned and net financial ROI by customer or job.
- Tested and promoted capability-upgrade history with proof of no regression.
- Android Shadow daily usage report proven from device permissions (different from GitHub commit Shadow observations).

## 6. Measurement dictionary: exact customer-proof criteria

**Drift rate:** qualifying model turns with independently graded material divergence / all independently graded eligible turns in the window. Always state graded sample size, eligible total/coverage, drift definition, model/version, evaluator and time range. No evaluated cases means **Not measured**, not 0%.

**Detected vs contained vs corrected:** separate the three: true mistake identified with an independent grade; prevented from reaching a consequential external action with an independent containment receipt; fully corrected and verified with result readback. Do not add them together as the number of different errors without deduplication.

**Detector precision:** true confirmed positive detections / all independently graded positive detections. **Detector recall:** true positive detections / all independently graded actual errors. Show false positives, false negatives and "unknown/ungraded" separately. A single alert is not proof the detector worked.

**Verified completion rate:** independently readback-confirmed customer-defined results / comparable assigned workflows; include blocked, failed and unresolved assignments in the appropriate denominator. Distinguish "execution request acknowledged" from actual outcome.

**Relative improvement:** compare frozen same-case model-only, model+Cleaner, model+Reality arms with fixed underlying model/version, comparable context, grading rubric, work scope, allowed tools and budget. Report percentage-point differences; no score if cases or standards are not comparable.

**Human time returned:** observe review/rework timestamps, actual duration and responsible worker. Difference between matched workflows is observed *time difference*, not automatically dollars saved.

**Financial ROI:** verified gross realized benefit − all attributable cost = verified net benefit; ROI % = 100 × verified net benefit / attributable cost where total cost is positive. Costs need model/tool fees, human review/corrections and Reality fees/operating costs under a defensible attribution policy. Avoided-catastrophe scenarios are **forecasts**, never counted as verified savings.

**Per-workflow receipts:** customer/tenant + task ID, source records, original intent and changes, signal and parser versions, model version, decision/authorization, attempted execution, independent readback, final result, times, cost, verifier identity, correction/containment and a link to immutable evidence. Otherwise the UI should use "Not measured", "Pending evidence" or "Unverified".

## 7. Current evidence and explicit no-go claims

- Signal Cleaner v0.2 50-case deterministic source-contract suite: passed as a design regression, **not a free-text hallucination accuracy score**.
- Additional 28-case provisional source-reference evaluation: **17/28** met all provisional expectations. No independent gold reviewer; therefore **no defensible 60.7% real-world accuracy claim**.
- Audit branch detector/ROI security and compatibility CI: targeted **43/43 tests passed**; multiple other relevant workflows passed. These are synthetic/source checks, not an end-to-end real-world reliability test.
- No defensible claim from this audit of **under 5% drift**, **zero hallucinations**, **continuous autonomous customer completion**, **verified realized customer ROI**, or **cross-device/production continuity**.
- No basis to advertise that the customer-facing Impact UI is collecting and displaying independently verified live statistics.
- No basis to imply Vercel READY equals completion or that all Base44 screens were inspected.

## 8. Owner review checklist — approve before next changes

- [ ] Confirm every detector above has the correct name and responsibility (one owner per capability; do not pile on duplicate guardrails).
- [ ] Decide which distinctions should appear to customers by default: **model errors**, **Reality catches**, **escapes**, **corrections**, **work completed**, **human time**, **net benefit**.
- [ ] Confirm the full source→interpretation→continuity→verifier→action→outcome receipt path belongs in expandable per-event detail, not a confusing dashboard.
- [ ] Decide which operational measurements belong only on a developer view: raw hashes, source keys, classifier confusion matrix, verifier versions, false negatives, calibration and recovery queues.
- [ ] Mark UI mission statements as aspirations until live-run receipts exist.
- [ ] Review security/authentication, source admission, semantic grading and source-to-UI integration before any public ROI claims.
- [ ] Only after owner review and all critical fixes: independently adjudicate benchmark answers; test 12/50/100 turns; report matched model-only and Reality results with cost.

## 9. Technical reference links

- [Live orchestration and real imports](../src/reality-live-intelligence-orchestration-v0.1.js)
- [Customer page source](../index.html)
- [Intelligence route](../api/reality/intelligence.js)
- [Stewardship route](../api/reality/stewardship.js)
- [Execution route](../api/reality/execute.js)
- [Signal Cleaner reference audit](../test/reality-signal-reference-audit-v0.1.test.js)
- [Impact projection tests](../test/reality-impact-evidence-v0.1.test.js)
- [Paired scorecard tests](../test/reality-value-scorecard-v0.1.test.js)
- [Detector + ROI CI workflow](../.github/workflows/reality-detector-roi-audit-v0.1.yml)
- [Earlier architecture/audit findings](./reality-drift-detector-roi-audit-2026-10-22.md)

**Bottom line:** Reality has a promising collection of scoped interpretation, typed discrepancy, continuity, execution and measurement components. Some code paths are already joined in the draft source, but **independent semantic drift/hallucination grading and authenticated customer-proof telemetry are not yet shown to be operating live**. The existing UI is mainly a conversation/work console plus an honest but currently unpopulated Impact panel.
