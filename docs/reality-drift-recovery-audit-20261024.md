# Reality Drift Detection + Bounded Recovery — October 24, 2026

## Scope and live architectural audit

Production source checked: \`feature/reality-manual-shift-proof-20261024\`, commit \`9c5a5f2ae487df4b3fdef7eca4af57a846de2314\`.
The cognitive runtime has OBSERVER, VERIFIER, and ADVERSARY model lanes plus synthesis, but no independent typed, persistently scored drift monitor in the live shift path. Existing epistemic-friction, evidence-warrant, governed-claim, and learning components are useful foundations; their existence is not proof of deployed, recurrent drift recovery.

## New experimental contract (NOT deployed)

- \`src/reality-drift-recovery-v0.1.js\`: separately supplied trusted snapshot (facts, active obligations, scoped authorities, independent receipts) and typed candidate.
- Detects: wrong-world context, factual drift, missing/misleading evidence, unsupported claims, lost/fabricated obligations, authority escalation, and false completion.
- Recovery: preserve original, use supplied canonical evidence for typed fact restoration, quarantine unsupported claims, rehydrate obligations, block unverified or unauthorized actions. Cross-world scope conflicts must be blocked for reconciliation; do not silently swap accounts.
- Independent second pass: \`verifyDriftRecovery\` evaluates the *revised structured state*, not the original detection event. Independent truth/outcome verification is explicitly NOT supplied by this module.
- Append-only \`persistDriftRecoveryReceipt\` contract checks database read-back and records separate detection, correction, and limitations; NOT wired to production as part of this change.
- \`gradeDriftCases\` consumes independent case labels, reports TP/FP/TN/FN, recall, precision, false positives, confirmed structural corrections, unresolved drifts, and unsafe effects.
- No model call, no authority granting, no actual external business action. Free-form natural-language answer is NOT semantically scored by the typed module.

## Baseline fixture — deterministic / synthetic, NOT a live model benchmark

100-position construction sequence: 20 clean controls + 80 deliberately injected failure cases.

| Metric | Fixture result |
| --- | ---: |
| Drift-injected cases | 80 |
| Correct no-drift cases | 20 |
| True positives | 80 |
| False negatives | 0 |
| False positives | 0 |
| True negatives | 20 |
| Bounded structural corrections | 70 |
| Cross-world conflicts safely blocked | 10 |
| Residual unresolved injected drift | 10/80 = 12.5% |
| External actions authorized or performed by test | 0 |

These numbers only show *logic on handcrafted typed inputs*. Detection of actual model hallucination or conversational drift is **NOT** verified by this fixture. The 100-case sequence is not a real 100-turn model conversation. A blocked case is not a successful self-correction. The <5% live residual drift target is **NOT MET OR MEASURED**.

16 targeted node:test cases cover clean control, fact correction, missing obligation, fabricated evidence/price, unsupported action, false completion, valid independent receipt, cross-customer isolation, snapshot version conflict, missing evidence, stale recovery manifest, repeat error on later turn, persisted receipt, failed readback, and 100-position gauntlet.

## Needed before enabling production drift recovery

1. Adapt live model outputs into a typed candidate **without treating model-generated citations as trusted references**; preserve raw answer and evidence lineage. An untyped answer is UNSCORED, never silently PASS.
2. Build independent owner-/world-scoped fact and obligation snapshot from the Continuity Ledger/Universe; require trusted source version, effective time and provenance. Model output must not write trusted truth.
3. Run detector and recovery before any consequential action, persist detection + correction + reconciliation read-back, and rehydrate corrected state at the next turn.
4. Bind receipts and user-facing UI to exact case, turn, source, detector version, blocked action, correction, verification result and residual risk.
5. Run a *new*, sealed 100-turn live construction/business gauntlet with independent labels, hard distractors, delayed contradictions, identity changes and attack prompts, measuring false negatives, false positives, repeated drift, independent verified correction, and unauthorized effects. Keep baseline cost under control, without paying for a standalone provider run unless specifically authorized.

**Promotion gate:** The user target is <5% live residual drift on a prespecified independent scoring rubric. That is not equivalent to <5% errors on synthetic injected contracts, and is not satisfied by just detecting or blocking an error. Production execution permissions remain unchanged.
