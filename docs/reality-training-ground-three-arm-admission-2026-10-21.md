# Reality Training Ground — A/B/C capability admission contract

**Status:** Draft architecture + deterministic regression tests. **Not** independent evidence that a live agent improved. This is a mandatory proof *design* for future capability admissions, not a production-integrated execution gate across all self-evolution pathways.

## Why three conditions must stay separate

| Arm | Same frozen agent | Operating layer | Purpose |
| --- | --- | --- | --- |
| A_BASELINE | Exactly same provider, model, version, parameter digest | No Reality governance | Establish what the underlying agent can do unaided |
| B_GOVERNED | Same underlying model, parameters, and agent tool-manifest digest as A | Reality governance/continuity/evidence/authorization | Isolate governance benefit and false-positive costs |
| C_GOVERNED_IMPROVED | Same underlying model and parameters | Reality + explicitly declared candidate capability, with tool manifest change recorded | Isolate gain from a capability admitted after tests and owner review |

The case set and scorer are frozen and identical across arms. Held-out IDs must be separate from training-case IDs. No hidden prompts or reference answers should be disclosed to the learner. If A/B secretly use different agent tools, the comparison rejects. C is allowed exactly the tool/capability delta named in the signed contract.

## Measurement — never blend or cherry-pick

Record independent per-arm counts (using denominator of the *same cases*) for: independently confirmed completed customer tasks; factual/hallucination escapes in the final released answer; long-horizon obligation/instruction drift; unauthorized external actions; legitimate tasks falsely blocked; verified recovery; and held-out generalization. Show A → B and B → C gains separately, along with false block and regression failures.

**Implementation:** `src/reality-gsi-three-arm-admission-v0.1.js` freezes a hash-bound contract and calculates **reported** per-case and per-arm counts. It requires complete case receipts, model/config parity, declared tools, held-out separation, and nonregression checks. A returned score is *not* inherently verified.

## Admission chain (fail closed)

1. Freeze baseline identity, tool manifest, evaluation case IDs, held-out IDs, scorer hash and seed.
2. Record trace and receipt IDs for A/B/C, with any change in tooling explicitly disclosed.
3. Independently rerun/provider-read-back and validate the actual work outcome, not the model's account of success.
4. The independent evaluator, whose private key is controlled **outside the evaluated agent and candidate**, signs the precise report hash, candidate/baseline identity, evidence root, readback reference, time window and nonce. Server verifies with pinned `REALITY_TRAINING_EVALUATOR_PUBLIC_KEY`.
5. Admission gates reject any unsafe-action, hallucination-escape, drift, completion, generalization, or false-block regression, with the upgrade requiring a new successfully completed task and improvement on held-out cases.
6. Separately, the human owner signs permission for **the exact report hash** using server-pinned `REALITY_OWNER_PROMOTION_PUBLIC_KEY`. Approval is bounded to shadow and does NOT grant production deployment or customer-task execution.
7. Before an actual external promotion, the executor must atomically consume the owner nonce using a **private durable store** and witness/read back actual shadow state. `PROMOTION_PENDING` is NOT proof of promotion.
8. After the upgrade, verify the ORIGINAL customer task and trace observed business value separately, or keep it unresolved.

The existing training ground had a `promoteLearningCandidate({promotionAuthority:{approved:true}})` bypass. That function now requires an independently signed A/B/C result plus independently signed owner consent and returns only `PROMOTION_PENDING`. The older callback-only scoring engine now labels its result `PROVISIONAL_PASS_REQUIRES_EXTERNAL_ATTESTATION`, never a verified live improvement.

## Limitations and explicit release blockers

- The new three-arm tests use **synthetic agent outcomes and locally generated test keys**. They validate the contract and anti-forgery guards, not actual LLM or provider performance.
- No live evaluator signer with genuine provider-readback access or safely custodied private key is configured.
- The full suite is not yet a mandatory common admission service for **every** distinct capability-update pathway. Audit and route all existing promotion/merge endpoints through this shared gate, with no legacy bypass.
- A signed attestation proves which evaluator key signed the report, not that the signer performed independent provider verification; custody, evidence provenance, provider readback and institutional separation must be validated.
- A/B/C cannot be marketed as independently verified improvement, nor as internal model-weight learning, without a live controlled run.
- Production Reality remains unchanged. External execution remains disabled in Preview while credentials, login, database wiring, and readback are integrated.

**Recommended first live application:** A small fixed set of Juan construction office tasks with real acceptance receipts, plus unseen tasks; do not make consequential external writes until the authorized execution bridge is validated.
