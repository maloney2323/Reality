# Reality Continuous Integrity Spine — live model-output upgrade (v0.2 draft)

**Review status:** OPEN DRAFT. **Production:** not deployed. **Scope:** source-based diagnostic comparisons on live-model answers in the draft orchestration path; not complete semantic drift detection.

## What changed compared with the trace-only v0.1

| Before v0.1 | Now in this draft |
| --- | --- |
| Checkpoint chain only; detector ran on observations if explicitly supplied | Actual answer from `runRealityCognitiveRuntime` is inspected after generation |
| No trusted material-claim reference in model result | Explicit amount/color assertions compared against scoped, *durably retrieved and source-attested* Universe observations |
| Unsupported "I sent" could be shown as if completed | First-person external-action completion wording marked UNVERIFIED_EXECUTION_CLAIM |
| Error receipt could be attached manually in tests | Cognition checkpoint carries model-output finding with source receipts; on durable handoff, the chain is attached to existing Continuity Ledger event |
| Existing Brief showed only passive source-to-source diagnostics | Brief displays model-output warning, source keys and receipt references |
| No review required on synthetic failed model claim | When confidence-limited warning exists, original model answer is preserved and a review notice is appended; draft consequential work proposal is held (no authorization granted) |
| Client could try to supply pretend source observations | Source references used for this comparison come only from `persisted_attested_entries` returned by the durable Universe retrieval path |

## The one shared mechanism

**No separate detector architecture was created.** `reality-model-output-integrity-v0.1.js` is an *adapter* that turns narrowly matched claims in a model answer into transient structured observations and calls the existing `inspectEpistemicDifferences` for the comparison. It does not insert the model claims into the canonical Universe. The Continuous Integrity Spine records origin at **COGNITION**, maintains unresolved findings, and remains unprivileged.

### Current supported output assertions (limited scope)
- An explicit `invoice` or `estimate` amount expressed with a dollar sign, for a uniquely identifiable scoped field `invoice.amount` or `estimate.amount`.
- An explicit cabinet color assertion for `cabinet.color` or `cabinets.color` from a limited color vocabulary.
- Direct first-person model claims of completed sends/emails/payments/orders/publications/deployments/deletions/transfers. These are **unverified action claims**, not independently confirmed hallucinations.
- If admitted source observations for a key disagree across effective times or equal-time values, the key is **CONTESTED_SOURCE_REFERENCE**, not approved because the newest observation appears later.
- Quotations, fenced examples, conditionals, tentative suggestions and negations are deliberately excluded from affirmative-claim matching. They remain outside this module's detection coverage.

### Source admission requirements
- Existing durable `SOURCE_OBSERVATION` ledger entry, exact tenant continuity root and worldline.
- Source provenance equals `reality-trusted-observation-admission-v0.1`.
- Attestation claims an independent source read with a matching source observation hash.
- The observation envelope passes its existing structural integrity contract.
- **Additional limitation:** this new adapter doesn't itself perform another independent live fetch to the external source, nor does a source record's attestation prove its contents represent the customer's currently approved decision. Higher-confidence semantic adjudication requires the Verifier and customer-approved revisions.
- Browser/request-supplied context is never admitted as the reference set for this comparison.

### Resolution behavior
A mismatch is labeled **POTENTIAL_MATERIAL_DRIFT** and is not automatically corrected. A disputed source history becomes **CONTESTED_SOURCE_REFERENCE** and needs independent resolution. A self-reported external completion is **UNVERIFIED_EXECUTION_CLAIM**.

For any of these, the model's original answer stays available as `raw_model_answer`; customer-visible answer gets an explicit notice; affected consequential work proposal is withheld rather than authorized. The Spine cannot rewrite the authoritative Continuity Ledger, approve changes, or execute anything.

### What is durably recorded?
When real Universe persistence is enabled and the Signal Cleaner handoff is durably written/read back, the Spine advances through **SIGNAL_CLEANER → UNIVERSE → CONTINUITY → COGNITION**, preserving the original ledger anchor, source references, model response identifier, observed issue identity and original detection stage. Existing continuity event persists an integrity summary with readback checks. The remaining stages (VERIFIER → PUBLICATION → EXECUTION → OUTCOME) are intentionally **not marked completed**, because those actions or checks have not happened.

For an ephemeral chat without a valid continuity root, an answer may still carry an unverified-execution warning, but it **must not claim a persisted source check or durable trace**.

## Visible UI

The existing Reality Brief's work-state panel now includes:
- Model-output integrity status (`REVIEW_REQUIRED`, `LIMITED_CHECK_NO_FLAG`, or `NO_TRUSTED_REFERENCE`).
- Review finding classification, model excerpt, typed state key, evidence references and recommended independent confirmation.
- Existing source-to-source discrepancy panel stays separate; an attested source conflict isn't automatically the underlying model's fault.

**Important:** the 11 customer Impact dashboard measures are **not populated by this upgrade**. No customer savings, drift-escape percentage, detector recall, confirmed hallucinations or false-negative rate is claimed.

## What this does NOT yet solve

1. **General free-text hallucinations** such as invented business people, unsupported dates, paraphrases, unstated totals or claims not expressed in the supported grammar.
2. **Semantic omission** of an obligation in fluent model prose. Source-to-context coverage remains bounded; the absence of a matching phrase is not proof a commitment was forgotten.
3. **Entity disambiguation** among multiple invoices/estimates and complex anaphora, which is deliberately excluded.
4. **Independent factual truth / verifier adjudication** of a disputed business update or source authenticity beyond the previously persisted attestation.
5. **Missed-error measurement**. The model may make many other mistakes that this adapter cannot extract; `LIMITED_CHECK_NO_FLAG` is explicitly not a detector pass rate.
6. **Production authority enforcement**. The separate execution API remains an independent boundary. The draft work-proposal hold supplements it, not replaces it.
7. **Full durable multi-stage outcome closure**. Post-cognition verifier and publication/action checkpoints need real authorized events and external receipts.
8. **True model-vs-Reality uplift**. An independently frozen, blinded benchmark is required.

## Verification sequence

`node --test test/reality-model-output-integrity-v0.1.test.js test/reality-live-model-output-integrity-v0.1.test.js`

The branch CI workflow also exercises continuity, epistemic difference, Signal Cleaner and preexisting live-orchestration tests with stubbed OpenAI and stubbed Universe persistence. No paid model calls were needed to run these tests. These are deterministic **engineering regressions, not independent hallucination recall measurements**.

## Follow-up after owner review

1. Add a **schema-bound claim extraction contract** for all material model claims and plan deltas; record extraction coverage and abstentions. Prefer independent adjudication and confidence calibration on held-out cases to unreviewed LLM self-grading.
2. Supply the actual source-bound Verifier findings to the same Spine and append an independently verified discrepancy resolution to the canonical ledger, preserving source changes rather than rewriting history.
3. Complete the post-cognition handoffs only on real events; verify publication and authorized execution with external readback.
4. Connect authenticated, source-verified outcome events to the 11 Impact metrics.
5. Run the same 100-turn construction challenge on an underlying model baseline and Reality, report missed and escaped drift separately, and do not declare the under-5% target passed before external scoring.

**Design invariant:** one existing epistemic comparison engine + one continuous trace + one authoritative Continuity Ledger. No detector proliferation.