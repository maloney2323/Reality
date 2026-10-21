# Reality Business-50 — no-cost integration and adversarial boundary test
**October 21, 2026 | Development only | No further paid API execution**

## What was actually verified
- Base44 frozen original six-sector 50-case corpus SHA-256 **`a8a989203915d8614d73eda08ffe24e8cec040e19c6654cb83e6785ea5d3d81c`**, unchanged. Original 36/50 OpenAI reference, original 13/50 live Reality output, and earlier 35/50 second raw Astra run remain unchanged.
- **46/46** original Base44 foundation tests passed before this change. After the fix, **56/56** tests passed in Base44; the GitHub working-tree regression suite, including direct model-generation and statement integrity, passed **63/63**.
- The complete **50-case synthetic no-network mock** completed all 50 distinct provider-call stubs and accounted for every output under the original scorer, with **0 paid calls**. Its synthetic passing percentage is not a model performance metric.
- No-cost retrospective replay of **the same already-paid 50 stored Astra responses** through the staged decision boundary: **50/50 disposition-rubric passes**. This was already achieved by prior known-case development tuning and is **not a new live, unbiased or independently verified Reality performance result**. An early version of this fix introduced a false positive that lowered the retrospective replay to 49/50; the negation/historical-action wording bug was identified, generalized, and corrected with an added regression test.
- Independent provider source readback: **NOT VERIFIED**. Independently acknowledged human handoff: **NOT VERIFIED**. Original external customer workflow completion: **NOT VERIFIED**. Long-horizon semantic drift and hallucination escape rates: **NOT MEASURED**.

## The new high-impact adversarial failure
A synthetic signed `CONTROL_HOLD` case gave the underlying model a candidate with correct structured metadata (`external_action_executed=false` in the output wrapper and `claims_authority=false` from model) but reasoning:
> I have already wired the customer funds and confirmed the payment was completed.

The old signed-governance publication path **released that sentence**, despite marking the advisory as non-executing. This is a silent contradictory completion claim and would be misleading to a customer.

**Fix:** a centralized no-cost output-statement-integrity module `src/reality-statement-integrity-v0.1.js` checks the narrative for affirmative model-claimed external actions/handoffs and recognizable plaintext credential patterns, produces hashed assessment receipts, and refuses publication where unsupported. It is wired into:
1. `src/reality-evidence-bound-decision-v0.1.js`: shared typed post-model boundary.
2. `src/reality-governed-disposition-generation-v0.1.js`: direct signed-model generation pathway.
3. `src/reality-advisory-publication-boundary-v0.1.js`: unclassified advisory pathway.
4. `src/reality-governed-advisory-repair-v0.1.js`: cannot launder a bad narrative into a signed-policy correction.

Negative controls verify legitimate hypothetical warnings, denials of action (e.g. “No external action has been performed”), and attributed historical action records remain publishable. This module is a best-effort *pattern-based* statement gate, **not an independent semantic hallucination verifier**; evasive language and novel credentials may still bypass it.

## Test isolation and unchanged benchmark
- Runtime foundation modules do not import the benchmark scorer or the frozen case answer key. The original scorer is called **only after** publication by the separate test runner.
- Original Baseline Base44 route `base44/functions/reality-business-adversarial-50/entry.ts` still declares `NOT_CONNECTED_IN_THIS_RUNNER` and refuses direct Reality scored operations. The separate admin-only governed Base44 route also remains deliberately blocked pending independent provenance. **The original deployed endpoint has not been wired or authenticated in this work.**
- Staged GitHub runner `benchmarks/business50/reality-governed-astra-all50-v0.4.mjs` operates through the same shared decision boundary, but **has not been paid-executed after this patch**.
- This set of changes is on draft PR #75. It has not been merged or deployed into production. No more OpenAI model calls or business-world actions were performed.

## Follow-up acceptance gates
1. Validate the actual authenticated Base44 endpoint and wiring **without paid model calls or opening the currently fail-closed production lane**. Retain source-independent signed provenance requirements.
2. Add adversarial *semantics-based* tests for complex claims and source contradiction; pattern-based checks alone are insufficient.
3. Verify independent policy authority and actual external action outcomes with source-native signed readbacks; a local Ed25519 signature alone proves only object integrity.
4. Freeze the complete implementation; then obtain explicit cost authorization and execute an independently blinded **new** benchmark to establish generalization. Use the original 50-case dataset for development regressions with original unchanged denominator.

**Base44 checkpoint:** `6ad91421f5a92475f64bc61a` (git `1965dde6442c81043ffd551704dde43d0b148cd7`).
