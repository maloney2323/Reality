# Reality: First Live LLM-Generated Self-Correction Proof

**Date:** 2026-10-27 Eastern / 2026-10-28 UTC  
**Status:** Genuine model synthesis and isolated correction *proved*. Governed installation, signed owner authority and full job completion *not yet proved*.

## Exact pilot

- Operational task: normalize a construction daily update into typed job, phase, status, blocker and owner signals.
- Verified missing source at pilot baseline: `src/reality-extensions/construction-update-parser.mjs` was not present in the test checkout.
- Pilot original work ID: `work:80f3f5a2891414a8742de7a4715b8575`. **This is a bounded first-pilot identity, not a customer-owned Continuity checkpoint.**
- Configured model: `gpt-5.6-luna`, real OpenAI Responses API, one call per candidate; no fallback source, and no code executed in the generator process.
- Model-generated candidate files transferred as GitHub Actions artifacts to **separate test runner**; model credentials not passed to verifier. Docker `--network none --read-only --cap-drop ALL --security-opt no-new-privileges`, 384 MiB RAM / 1 CPU, unprivileged UID, read-only input mounts. Each test runs candidate in a fresh separate Node process, not in the trusted parent grader.

## First candidate (failed verification, no upgrade)

- GitHub run: https://github.com/maloney2323/Reality/actions/runs/40617140163
- OpenAI response ID: `resp_0caa066cec78119d006ae15446059887d2a3be76a30ee344cd`
- Exact generated source SHA-256: `ac6b3be4717b8bfdc6fc69935c26cf720497386f27565a87bb48a499ac232b81`
- Independent verifier: **10/15 passed**, 5 failed; frozen **2/5**, holdout **8/10**.
- Source-level defect: phase output retained capitalized source text rather than normalizing to lowercase. Several failures carried identical `OUTPUT_CONTRACT_OR_CONTENT_MISMATCH` reasons.
- Explicit outcome: `SANDBOX_REJECTED`, no PR, no install, no promoted capability, no job-completion claim.

## Model-generated correction (independently verified)

- GitHub run: https://github.com/maloney2323/Reality/actions/runs/40617479444
- New OpenAI response ID: `resp_0708a3a4eca57fef006ae1551afd4487d090ffdcedce9b4cce`
- New generated source SHA-256: `1f59e7b74217526225b6283d79d107456c5ab8ce9beffee9328bbed3f6893bf1`
- The second model call received its **previous model-produced source** and the verifier's **failed-case IDs/reasons**, but no holdout expected outputs. No human code patch was injected into the candidate artifact.
- The second source differs in hash from the first; independent runner verdict **`INDEPENDENT_SANDBOX_VERIFIED` — 15/15 passed**, 0 failed; frozen **5/5**, holdout **10/10**.
- Holdout result SHA-256: `1ed5ed0ec1239663acb16c195336fac1f8851d9fe95ac507ec55e04b7808be22`
- Independent grader artifact SHA-256: `48fbc0a91ca7968a8430026921545da4135973f163c71b84227e74ceba381f67`
- Artifact ZIP uploaded by verifier: `reality-model-self-correction-independent-proof` (run #40617479444).

## What this proves

An actual configured model **generated a capability, failed independent sandbox verification, used the reported failures to create different source, and passed independent frozen + holdout verification**. The orchestration and bounded retry were built/triggered by the developer in GitHub Actions; Reality did not yet independently decide to start the correction process while operating a customer task.

## What this DOES NOT prove

- Model autonomous discovery of an actual paying customer's missing job instrument (pilot target was chosen and bound by the developer).
- Immutable original customer job and verified sandbox events appended in the signed-in Reality Continuity ledger.
- A warrant signed by Reality's server-side verifier linked to the persisted original user goal and checkpoint.
- Owner-authorized single-use execution of Reality's real GitHub provider, draft PR, separately authorized promotion/deployment, or capability registration.
- Reactivation and independent completion of the original job.
- General reliability beyond this **one** deliberately bounded parser (15 cases, 10 holdouts).

These remain blocked by design. The secure next engineering step is to **verify and import the immutable GitHub Actions proof into the owner-scoped Continuity ledger and issue the existing payload-tied signed warrant**, then present the exact candidate hash for owner authorization. Neither GitHub artifacts nor model text may mint their own authority.

**Do not mark the original job COMPLETE, auto-merge, or silently authorize any GitHub write.**
