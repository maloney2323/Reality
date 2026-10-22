# Reality Continuous Integrity Spine v0.1 — foundation contract

**Decision:** A single *logical* continuity-aware diagnostic process accompanies relevant evidence references through each Reality layer; **the authoritative Continuity Ledger stays durable and independent**, not repeatedly copied across stages.

**Status:** DRAFT SOURCE CONTRACT / SYNTHETIC TESTS ONLY. Not deployed. Not a new standalone hallucination detector. No evidence of a sub-5% drift rate, automatic semantic correction or customer ROI.

## Responsibilities
- **Signal Cleaner:** preserve original message / uncertainty / attribution; no authority promotion.
- **Universe:** retrieve source observations with owner, worldline and evidence lineage, not assume claims are verified.
- **Continuity Ledger:** own lifecycle transitions and original approvals, open obligations, historical revisions. Detector cannot change ledger.
- **Cognition:** model proposes claims, plans and candidate actions. Claims are untrusted.
- **Shared Epistemic Difference Engine:** reused `inspectEpistemicDifferences` at meaningful stage checkpoints; classifies structured same-effective-time conflicts, later deltas, unsupported completion and speculation. The existing engine compares typed claims, *not unstructured language*.
- **Verifier:** evaluate independent source evidence / customer authority. This v0.1 contract records that independent truth adjudication **has not occurred**.
- **Publication / execution:** existing authorization, original-intent and external-readback rules must make the actual consequential decision; v0.1 trace is **not wired to enforce** any action.
- **Outcome:** confirmed readback and eventual benefit evidence goes to existing durable ledgers and reporting, not a new truth database.

## Concrete v0.1 interface
- `createIntegritySpine({continuityRootId, worldlineId, runId, ledgerAnchorRef, requiredOpenObligationIds, openedAt})` — creates a scoped immutable trace referencing the existing durable ledger.
- `advanceIntegritySpine({trace, stage, observedAt, sourceReceiptRefs, typedObservations, presentOpenObligationIds})` — append one ordered evidence-linked checkpoint; call the **existing** typed epistemic detector if structured observations are supplied; create observation-only findings; carry unresolved finding IDs forward.
- `verifyIntegritySpine(trace)` — check content hashes, stage order, fixed root, immutable ledger anchor, previous checkpoint linkage and unprivileged flags. **Hash linkage proves representation integrity only, not source authenticity**; no signing/durable readback is performed.
- `summarizeIntegritySpine(trace)` — expose first-seen stage, open findings and deliberately null unmeasured rates.

## Sequence / boundaries
`SIGNAL_CLEANER → UNIVERSE → CONTINUITY → COGNITION → VERIFIER → PUBLICATION → EXECUTION → OUTCOME`.

The stage sequence is deliberately strict for this first full-cycle exercise. Later, an explicit and validated "not applicable" checkpoint can represent conversational sessions without external actions. Do not bypass a required stage silently.

## Meaning of findings
| Existing detector result | Spine observation status | Required next step |
| --- | --- | --- |
| E_FACT_CONFLICT | CONFLICT_NEEDS_ADJUDICATION | Compare independently sourced claims; avoid silent promotion |
| E_DELTA | REVISION_REQUIRES_EVIDENCE | Later event time **alone** does not prove legitimate authorized change |
| E_UNATTESTED | UNVERIFIED_COMPLETION_OR_CLAIM | Obtain independently confirmed external result |
| E_HYPOTHESIS | SPECULATION_NOT_ESTABLISHED_FACT | May remain a hypothesis; does not become authoritative state |
| Open obligation not present in a supplied working view | OPEN_OBLIGATION_ABSENT_FROM_WORKING_VIEW | Restore relevant obligation to cognitive context, investigate scope |

No assessed typed input ⇒ no semantic detector recall claim; absent working-view input ⇒ coverage NOT_EVALUATED, **not** "0 forgotten tasks". Unresolved findings carry forward; they are not silently cleared when the next layer does not repeat the finding. A closure must eventually point to an independently verified reconciliation event in the existing Continuity Ledger.

## Invariants
1. Original source remains immutable and independently referenced.
2. One root/worldline identity per trace; reject cross-scope typed observations.
3. Every stage has an evidence receipt *reference*. References require external admission/readback before source authenticity can be claimed.
4. Per-stage hashes and parent links make changes to the trace detectable; they do not validate factual truth.
5. Findings preserve origin stage and remain unresolved until a separate authoritative resolution exists.
6. Detector recommendations do not mutate lifecycle states, authorize actions, certify success or affect customer-visible ROI.
7. The **existing** Verifier and publication/authority boundaries—not this trace—must own enforcement.
8. Underlying-model error rate, Reality escape rate, false positives, missed errors, recovered mistakes and cost are always distinct measurements.
9. Production readiness requires independent semantic grounding, authenticated data, fail-closed action gates and durable state readback.

## Follow-on integration — not claimed by this PR
1. Pin source admission and canonical continuity snapshot; attach verified ledger anchor (not just free-form ID).
2. Supply stage checkpoints from the actual production signal, Universe, continuity, model, verifier, publication and external outcome boundaries using a **single** chain.
3. Add source-bound independent verdict references, appended reconciliation events and readback to close findings. Never allow model/browser self-attestation.
4. Wire a read-only telemetry feed into the existing **Reality Impact** UI, showing origin → detection → containment/correction → final outcome and missing coverage.
5. Have the independent testing ground replay identical frozen construction cases with model-only, model+Cleaner and full Reality. Count first-seen and escaped consequential failures from final external evidence, not from detector labels.
6. Benchmark drift precision/recall, false positives, false negatives, time to correction, task completion and realized attributable savings; report unknowns as unknown.

## Test instructions
`node --test test/reality-continuous-integrity-spine-v0.1.test.js`

CI also runs existing typed epistemic comparison, continuation-state, Signal Cleaner and source integrity tests. Tests are deterministic/synthetic; not live production or paid model calls.

**No production code path was changed by this branch.** This is the first reviewable contract to prevent new detector proliferation before plugging a single shared mechanism into the authoritative execution flow.
