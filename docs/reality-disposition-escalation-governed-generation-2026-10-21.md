# Escalation distinction — governed model proposal contract v0.1
**Date:** 2026-10-21  
**Goal:** Repair the class of failure observed in the archived GPT-6 Astra 50-case baseline where a safe `BLOCK` was used instead of the operationally required `ESCALATE`.

## Evidence and scope
Historical unchanged baseline: 36/50 pass, 14/50 fail. Among the 14 failures, 12 were `BLOCK` for cases whose frozen oracle required `ESCALATE`. Actual Reality no-model post-hoc detector replay flagged only 2/14 original failures as a strict `FAILED`, while flagging 12/36 originally passing decisions as `FAILED`. Semantic hallucination and drift evaluations remained NOT_EVALUATED on all 50. [Full diagnostic report](./reality-business50-original-openai-diagnostic-replay-2026-10-21.md).

## New architecture
- `src/reality-disposition-escalation-contract-v0.1.js` separates a declared control hold, missing mandatory evidence, historical supersession, and explicit review/escalation needs. An externally signed, case/evidence-bound policy finding and fixed policy vocabulary are required; model prose/JSON cannot self-attest escalation duty.
- `src/reality-governed-disposition-generation-v0.1.js` first verifies this evidence-bound policy document, then passes **only the admitted work item, question, evidence and instructions** to an injected model gateway. Hidden answer keys, expected dispositions, labels and scoring oracles are not forwarded.
- Raw model output cannot be published directly. If the candidate disposition does not match a signed policy duty, the answer is **WITHHELD_PENDING_GOVERNED_REVIEW**. A mere `BLOCK` cannot satisfy `ESCALATE`.
- If `ESCALATE` is admitted as a proposed response, the public result still says a verified human handoff is **required but not completed**. No action executed, no original customer task completed and no authorization is inferred.
- A signed policy attestation proves the signer authenticated a specific claimed set of findings. **It does not prove the signer actually read external provider truth.** Trusted source provenance and externally verified handoff remain required.
- Without a real independently custodied signing key, positive Base44 identity, source-state verifier, and real model-gateway binding, this contract fails closed and is **NOT A PRODUCTION GOVERNED BENCHMARK LANE**.

## Development checks only — not the frozen 50 answers
The new test suite contains twelve separate synthetic cross-industry policy fixtures that are NOT copied from the frozen benchmark. It tests both under-escalation and over-escalation, source evidence tampering, fake approval, cross-case policy replay, expired signer statements, reference integrity, missing source states, and candidate publication. Those fixtures **supply their own signed policy findings**: test success does **not** establish that a real evidence interpreter can infer the correct duty from unfamiliar business documents, nor that any LLM spontaneously improved.

**GitHub CI:** `.github/workflows/reality-disposition-escalation-integrity.yml` runs 18 non-benchmark paid-free contract/generation tests. The initial full suite passed.

## Next integration release gates
1. Admit case evidence through real isolated provider or escrow readback; independently classify authority/integrity findings and bind them to an externally controlled signing key.
2. Bind the real provider/model gateway (same underlying model and settings as the Astra baseline, if a matched comparison is intended) to this response path. No secret credentials in client-provided context.
3. Integrate this gate into the actual Base44 50-case runner/production-safe Preview HTTP path, refusing all ungoverned legacy bypasses.
4. For the original 50, run the exact frozen public packets and original scorer without exposing `expected_disposition` to candidate model/policy interpreter. Use additional unseen cases for generalization. A hard-coded policy label from the 50-case oracle invalidates comparison.
5. For `ESCALATE` or other governed actions, distinguish recommendation `HANDOFF_REQUIRED` from actual provider-backed handoff `HANDOFF_VERIFIED`. Do not mark original customer outcome verified without independent provider readback.
6. For hallucinations and drift: grade published unsupported consequential claims and measured obligation/fact loss **separately**, preferably with 100 sequential authenticated turns on the distinct frozen long-horizon corpus.
7. Establish a capped explicit-call budget before executing paid provider comparisons. Preserve original historical score/receipts intact.

**Release status:** CODE CONTRACT IMPLEMENTED + SYNTHETIC CI PASS; REAL GOVERNED PROVIDER TEST NOT PERFORMED; PRODUCTION UNCHANGED.
