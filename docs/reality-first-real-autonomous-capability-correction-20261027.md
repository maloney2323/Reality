# Reality — First Real Autonomous Capability Correction

**Proof date:** October 27–28, 2026 (GitHub Actions UTC dates cross midnight)  
**Proof class:** REAL_MODEL_GENERATION_AND_CORRECTION_WITH_INDEPENDENT_SANDBOX  
**Scope:** Controlled construction-operational-parser pilot, **not a live customer job**

## Original operational task and missing instrument

Original pilot work ID: `work:80f3f5a2891414a8742de7a4715b8575`.

Task: parse construction daily updates into typed, evidence-preserving operational signals from fields JOB, PHASE, STATUS, BLOCKER and OWNER. The required parser did not exist in the tested branch. Neither a replacement parser nor an authorized external write was hardcoded into the pilot.

This pilot work ID was defined inside the testing workflow, **not restored from the signed-in owner's durable Continuity**. It does not prove the real app has discovered a missing customer capability.

## Attempt 1 — actual OpenAI API model generation

GitHub Actions run [40617140163](https://github.com/maloney2323/Reality/actions/runs/40617140163).

- Model: `gpt-5.6-luna`.
- Real model response ID: `resp_0caa066cec78119d006ae15446059887d2a3be76a30ee344cd`.
- Generated candidate SHA-256: `ac6b3be4717b8bfdc6fc69935c26cf720497386f27565a87bb48a499ac232b81`.
- Independent sandbox verdict: **REJECTED — 10/15 passed, 5/15 failed**. Frozen 2/5; holdout 8/10.
- Root cause visible in generated source: `PHASE` was retained in original capitalization instead of normalized lowercase.
- Model-generated candidate was transferred as an artifact to a separate GitHub job; the test job had no model API secret or network access.

The rejection was evidence that the initial model output was not silently treated as a verified new capability.

## Attempt 2 — real model corrects its own failed candidate

GitHub Actions run [40618520058](https://github.com/maloney2323/Reality/actions/runs/40618520058).

- The generator recovered the **exact prior failed candidate** and first verifier's recorded failure results, with source hash checked.
- The correction prompt supplied requirements and failed **frozen** regression identifiers, **not the separate hidden holdout cases or their expected outputs**.
- Model: `gpt-5.6-luna`, one repair call in this job.
- Real correction response ID: `resp_099c5027975a173e006ae157abc24887d0a6b8031e6acf3802`.
- Newly generated corrected candidate SHA-256: `fc0fdf24a02666d843c404bccc09f591b1443df6021362e1b83a661484a64c66`.
- Source-level observable correction: now normalizes phase using `fields.PHASE.toLowerCase()`.
- Independent sandbox verdict: **VERIFIED — 15/15 passed (frozen 5/5, holdout 10/10)**.
- Independent evaluator result SHA-256: `48fbc0a91ca7968a8430026921545da4135973f163c71b84227e74ceba381f67`.
- Test environment: container with `--network none`, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, non-root user, no model credential; individual candidate invocations run in fresh bounded child processes.

GitHub Action artifact: [Independent repair verification](https://github.com/maloney2323/Reality/actions/runs/40618520058/artifacts/12786202361).

## What this proves

1. An authentic configured model generated JavaScript code for a bounded missing-instrument exercise.
2. The independent sandbox rejected the first candidate with specific correctness failures.
3. The model processed its own failed source and public failure evidence and produced **different** corrected source.
4. An independent test job verified the corrected candidate on frozen and held-out scenarios.
5. No GitHub upgrade code-write, PR promotion, customer-facing installation or original-job closure was performed.

**This is a genuine red → green autonomous coding-and-repair episode, not a mocked LLM response and not a complete Governed Autonomous Self-Upgrading loop.**

## What remains unproven

- A signed-in Reality customer job becoming genuinely blocked and saved with immutable original work and goal identity in live Continuity.
- A trusted verifier appending `personal_upgrade_sandbox_verified` and a cryptographically bound `personal_upgrade_evidence_warrant` under that original work/goal. The live DB had no such events at the time of the prior check.
- The existing authenticated owner approving the *specific candidate hash and warrant*, then an atomic single-use execution claim and a **real** GitHub PR created by Reality's governed runtime.
- Independent post-PR CI, a different approval to promote/install the exact commit, and registered capability version readback.
- Resumption from the original live job checkpoint and independently verified final business outcome; a full lineage-linked Continuity receipt.

**No owner approval is implied by these test runs; no production or customer-world mutation is authorized.**

## Reliability claim boundary

This is one correction scenario. The run provides objective 10/15 → 15/15 test evidence, not a statistically validated reliability rate, and not a proof that all kinds of autonomy or code generation are safe.

The next milestone is a live, owner-scoped warrant-to-GitHub draft PR, followed by independently approved promotion and real original-job resumption. No release, merge or PR write should be triggered from the model's declaration of test success alone.
