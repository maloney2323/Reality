# Universe-backed Correction Verifier V1 — implementation boundary

This module is the first typed correction verifier. It does **not** replace the LLM; it separates free cognition from downstream claims about consequential business actions and independently verified outcomes.

## Original observed failure
During the **real** live Oct 23 25-turn OpenAI construction test (run [40034886368](https://github.com/maloney2323/Reality/actions/runs/40034886368)), OpenAI said it would send a final estimate without a signed homeowner scope (turn 5) and confirm a crew schedule without an official inspector PASS (turn 22). It stated a minimum onsite inventory count as certain despite unverified discrepancies (turn 6).

OpenAI then generated sensible replacement drafts for turns 5 and 22, but the same-provider model reviewer **rejected both**, treating the user's immediate action request as a reason to ignore missing third-party proof. Zero proposed repairs were accepted into continuity.

## Implemented separation

1. **User requests and policy requirements**: server-owned immutable Universe entries `CORRECTION_CONSEQUENCE_REQUIREMENT` express action/resource scopes and typed mandatory evidence conditions, linked to authenticated owner-source records. Source validation enforces exact continuity root, worldline, owner, work item and assertion-time bounds. An instruction to "send now" is not a signature or a receipt. The policy projection is hash-bound.
2. **Proof of a prerequisite**: typed `CORRECTION_INDEPENDENT_EVIDENCE` entries must be re-verified by a **trusted server-held** independent source adapter against exact record ID/hash, receipt ref, root, owner, work item and worldline. The model may name a source but cannot grant it validity. `INDEPENDENT_SOURCE_REPORT` is different from `INDEPENDENT_MATERIAL_STATE`; two foremen's counts cannot prove exact physical stock.
3. **Proof of owner authority**: `INDEPENDENT_AUTHORIZATION` is separate from a customer request or third-party prerequisite. An authenticated user message may indicate intent, but never independently satisfies another party's signed approval.
4. **Proof of completed effect**: `OUTCOME_COMPLETED` requires a distinct independently verified `INDEPENDENT_EFFECT` receipt. Passing approval/precondition checks alone cannot prove an email, payment, or dispatch occurred.
5. **Safe intelligence**: `DRAFT_ONLY`, `DENIAL_OF_ACTION`, `ATTRIBUTED_REPORT`, and `HYPOTHETICAL` claims remain usable without fabricated authority. Proposals are checked only to the extent that typed spans were actually extracted from the answer; extraction omission means **unknown**, not verified correct.
6. **Action enforcement not delegated to text verifier**: a no-contradiction result does not authorize a connector, extend autonomy, publish a business message, or demonstrate the whole answer is semantically correct. Existing execution gates remain separately responsible.

## Actual model case regression

The CI test imports the immutable run artifact itself—not synthetically generated bad answers—and binds exact textual spans from OpenAI turns 5, 6, 22 and the real model-generated replacement drafts. It checks that the bad original statements fail the typed evidence requirements and the safe replacement statements survive the checked boundaries.

These spans are annotated as test evaluator cases; **they are not proof of automated claim extraction**. A separate optional GitHub Actions runner uses a live OpenAI structured-output extraction call for every one of 25 genuine original responses and two generated replacement drafts; all extracted spans must appear verbatim in the actual response.

## Current limits
- Policy and supporting source entries in CI are **frozen synthetic construction fixtures** derived from the authenticated benchmark prompt, not live records from Juan or any customer.
- The independent source verifier is a **server-supplied adapter contract** tested with mock readbacks, not yet connected to homeowner e-signature or municipal inspection systems.
- The LLM extraction stage can miss actions or misclassify text. Zero findings on extracted claims does not prove zero drift.
- A SHA-256 hash is an integrity check over candidate records, **not proof that the claimed principal or external record was authenticated**.
- No production installation, external send, business purchase, customer-world write, or live autonomous repair was performed.
- Real customer workflow integration, coverage measurement, verified effect readbacks, bounded regeneration and end-to-end repair-to-next-turn remain open.

## Next integration seam

The trusted server resolves exact owner-scoped Universe policies and source observations, invokes independent proof adapters, extracts bounded model candidate claims, verifies the before-delivery response, and only then accepts a corrected response into continuity. Repeat with new, unseen real-model drift examples plus harmless controls. Score **OpenAI original**, **Reality detection**, **Reality correction**, **Reality final answer**, and **residual error** separately.
