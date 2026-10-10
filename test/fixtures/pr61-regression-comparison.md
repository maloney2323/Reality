# PR #61 Regression Comparison — Durable Artifact

**Date:** 2026-10-10
**PR branch:** `fix/continuity-stage-gate-v1` (HEAD: `72df26e4e2acfda17aa8d04a1a1ba5a7bbb589d1`)
**Base commit:** `af3a6a5f534591ffe26eee16eb31d70db4620179`
**Command:** `npm test` (full repository regression)

## Summary

| Metric | PR branch (`72df26e`) | Base (`af3a6a5`) | Delta |
|---|---|---|---|
| Total tests | 169 | 137 | +32 |
| Pass | 154 | 119 | +35 |
| Fail | 15 | 18 | -3 |

The PR fixed 3 failures, introduced 0 new failures, and added 32 new tests (all passing).

## Failures Fixed by PR (present in base, absent in PR)

1. `live continuity runtime persists RAW -> TRANSFORMATION -> OBSERVATION on one UUID spine`
   - File: `test/reality-continuity-runtime-v0.1.test.js`
   - Base error: test failed (continuity runtime)
   - PR status: PASS

2. `enabled continuity fails closed when durable persistence is unavailable`
   - File: `test/reality-continuity-runtime-v0.1.test.js`
   - Base error: test failed (fail-closed behavior)
   - PR status: PASS

3. `consequential intelligence produces a governed work proposal but cannot authorize execution`
   - File: `test/reality-live-intelligence-orchestration-v0.1.test.js`
   - Base error: test failed (governance boundary)
   - PR status: PASS

## Pre-Existing Failures (present in BOTH branches, not caused by PR)

1. `capability-gap runtime closure reaches reactivation without external execution`
   - File: `test/capability-gap-runtime-v1.test.js`
   - Error: `Error: WORKFLOW_PREFLIGHT_REQUIRED` (in PR) / same error type (in base)
   - Classification: PRE-EXISTING — identical failure on both branches

2. `test/reality-autonomous-v1.0.test.js` (whole file)
   - Error: File-level failure (module/timing)
   - Classification: PRE-EXISTING — fails on both branches

3. `test/reality-cognitive-evolution-v0.1.test.js` (whole file)
   - Error: File-level failure
   - Classification: PRE-EXISTING — fails on both branches

4. `test/reality-connector-layer-v1.test.js` (whole file)
   - Error: File-level failure
   - Classification: PRE-EXISTING — fails on both branches

5. `test/reality-evidence-warrant-v1.0.test.js` (whole file)
   - Error: File-level failure
   - Classification: PRE-EXISTING — fails on both branches

6. `test/reality-governed-execution-warrant-learning-integration-v1.0.test.js` (whole file)
   - Error: File-level failure
   - Classification: PRE-EXISTING — fails on both branches

7. `test/reality-gsi-training-ground-v0.1.test.js` (whole file)
   - Error: File-level failure
   - Classification: PRE-EXISTING — fails on both branches

8. `hidden-world benchmark is deterministic and ground-truth bounded`
   - File: `test/reality-hidden-world-benchmark-v0.1.test.js`
   - Error: Assertion failure
   - Classification: PRE-EXISTING — fails on both branches

9. `experience-enabled reasoning improves transfer without treating prior knowledge as authority`
   - File: `test/reality-hidden-world-benchmark-v0.1.test.js`
   - Error: Assertion failure
   - Classification: PRE-EXISTING — fails on both branches

10. `benchmark reports the baseline and experience delta explicitly`
    - File: `test/reality-hidden-world-benchmark-v0.1.test.js`
    - Error: Assertion failure
    - Classification: PRE-EXISTING — fails on both branches

11. `round-trips a Universe entry through the persistence adapter`
    - File: `test/reality-native-universe-persistence-v1.0.test.js`
    - Error: `Error: UNIVERSE_PERSISTENCE_UNAVAILABLE` (needs Supabase environment)
    - Classification: PRE-EXISTING — environment/dependency-dependent, fails on both branches

12. `rejects a conflicting retry for an immutable entry id`
    - File: `test/reality-native-universe-persistence-v1.0.test.js`
    - Error: `Error: UNIVERSE_PERSISTENCE_UNAVAILABLE` (needs Supabase environment)
    - Classification: PRE-EXISTING — environment/dependency-dependent, fails on both branches

13. `one-click found-work authorization creates scoped auto authority`
    - File: `test/reality-one-click-work-authorization-v1.test.js`
    - Error: `Error: WORKFLOW_PREFLIGHT_REQUIRED`
    - Classification: PRE-EXISTING — fails on both branches

14. `rejects replay and duplicate execution IDs`
    - File: `test/reality-operation-ledger-v1.0.test.js`
    - Error: `AssertionError: 'EXECUTION_REPLAY_OR_DUPLICATE' !== 'EXECUTION_ID_BOUND_TO_DIFFERENT_OPERATION'`
    - Classification: PRE-EXISTING — fails on both branches

15. `money priority cannot create a revenue claim`
    - File: `test/reality-work-discovery-foundation-v1.0.test.js`
    - Error: `AssertionError: 40 !== 20`
    - Classification: PRE-EXISTING — fails on both branches

## New Failures Introduced by PR

**None.** Zero new failures were introduced.

## Conclusion

PR #61 is a net improvement: it fixes 3 continuity-related failures, adds 32 new passing tests, and introduces 0 regressions. All 15 remaining failures are pre-existing and reproduce identically on the base commit.
