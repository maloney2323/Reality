# Reality — Base44 governed business-50 integration checkpoint

**Date:** 2026-10-21  
**Base44 app:** `6a7bd610756b32bc21c39ad0`  
**Base44 checkpoint:** `6ad8f5b705cf158fc16d7f27` (commit `4a7c4036e31297133b96d3f771fc24fd05201204`)  
**GitHub draft branch:** `fix/governed-verification-and-context-boundary-20261021` (PR #75)  
**Production:** no promotion or paid model calls.

## Real implementation completed
Source copied at an exact pinned GitHub commit, then tested in Base44:

- `base44/shared/reality-core/reality-disposition-escalation-contract-v0.1.js` — validates externally signed policy facts and distinct `ESCALATE`, `BLOCK`, `REQUEST_EVIDENCE`, `BRANCH_HISTORY` requirements.
- `base44/shared/reality-core/reality-governed-disposition-generation-v0.1.js` — trusted policy/signature check before model generation and publication. A model-proposed `BLOCK` is withheld when an authenticated control finding requires `ESCALATE`.
- `base44/shared/experiments/business50-governed-lane-adapter-v0.1.js` — constructs only public frozen-case evidence; independently verifies the case-specific signature against an injected **server-owned public key**; passes only public evidence to a model gateway. Runs the unchanged frozen `scoreDecision` oracle **after** proposal evaluation/publication. Records disposition grade separately from operational completion.
- `base44/functions/reality-business-adversarial-50-governed/entry.ts` — NEW admin-only Base44 function with `preflight`, `verify_case_preflight`, and `run_case`. Each real case is one provider call maximum, never a self-running batch. `run_case` is guarded by (a) server-side signed policy attestation, (b) configured server-owned signer public key, (c) server model key, (d) `REALITY_BUSINESS50_GOVERNED_PAID_ENABLED=true`, and (e) per-request explicit paid-call confirmation. The client cannot supply signer key, policy attestation, model API key, expected disposition, or authorization objects.
- `base44/shared/experiments/business50-governed-lane-adapter-v0.1.test.js` — 6 adapter tests; 18 inherited contract/answer tests; 4 prior archived replay tests; **28/28 no-cost tests passed**.
- All 50 original public packets built and inspected for leaked `expected_disposition` or `oracle_rationale`: **0 leaks detected**. The frozen six-sector corpus SHA-256 remains `a8a989203915d8614d73eda08ffe24e8cec040e19c6654cb83e6785ea5d3d81c`.

## Honest preflight status

```json
{
  "frozen_cases": 50,
  "public_packets": 50,
  "oracle_leaks_detected": 0,
  "paid_calls": 0,
  "ready_for_paid_run": false,
  "policy_entries": 0,
  "independent_source_readback_verified": false
}
```

**No positive authenticated HTTP request through this NEW Base44 function was performed**, because an admin Base44 session for the function endpoint is not available through current tools. The Deno formatter parsed the source, but local `deno check` cannot resolve the Base44-specific SDK package from the sandbox; the Base44 platform's own runtime bundling/admission after editing did not return a syntax error. This does not constitute a verified live endpoint invocation.

**Not measured:** Reality-vs-OpenAI governed pass rate, actual independently interpreted authority, external human handoff, operational task completion, escaped hallucinations, or long-horizon factual drift.

## Why the signer's provenance matters

The frozen cases are synthetic. A signed policy attestation may bind an integrity or escalation finding to source evidence, but **a cryptographic signature alone cannot prove that the signer classified evidence independently or without consulting the hidden answer key**. Before meaningful A/B evaluation, create an independent, answer-key-blinded classification process, record a reproducible policy digest and attest the exact public evidence, source provenance and evaluator identity. The new runner deliberately reports `policy_source_independence_verified:false` even when a signed policy document is present.

## Next acceptance sequence

1. Establish and inspect a legitimate admin-authenticated call to the NEW Base44 function's `preflight`, ensuring it returns zero paid calls and no signature/key values.
2. Produce independent, blinded source-to-policy findings for the synthetic cases without using `expected_disposition` or `scoreDecision`. Validate exact case/evidence digest, source provenance and signer custody; register server-side.
3. Call `verify_case_preflight` for representative cases across escalation, hold, missing evidence, history preservation and unknown policy. Ensure invalid case/signature/evidence is rejected before spending.
4. Only after explicit separate paid-test cost approval, configure a scoped model key and `REALITY_BUSINESS50_GOVERNED_PAID_ENABLED`; execute one deliberately capped case with real model gateway. The output still cannot claim real handoff or task completion.
5. Save complete real provider response/receipt hashes, then extend to the frozen 50 with the unchanged scorer and full matched-model metadata. Keep all errors/unscored attempts in the denominator; do not run all 50 merely because one passed.
6. Independently test hallucinations and factual/obligation drift using the distinct 100-turn corpus and after-publication receipts.

**Verdict:** `BASE44_GOVERNED_CODE_WIRED_AND_UNIT_TESTED`; `SIGNED_POLICY_SOURCE_NOT_YET_ESTABLISHED`; `AUTHENTICATED_ENDPOINT_UNTESTED`; `PAID_MODEL_RUN_NOT_AUTHORIZED`; `GOVERNED_COMPARATIVE_SCORE_UNMEASURED`.
