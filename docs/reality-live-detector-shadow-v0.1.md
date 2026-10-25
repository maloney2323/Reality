# Live detector shadow integration — rollout contract

## Status
**Connected in experimental branch; NOT deployed or enabled for customer traffic.**
Stacked above experimental PR #128. No production merges, no paid model
generation, and no changes to existing execution authority or answer text.

## Actual live orchestration seam
Inside `runLiveIntelligenceOrchestration`, AFTER the underlying cognitive
runtime returns its **original model answer**, and AFTER the existing
`inspectConversationDrift` candidate pass, invoke
`inspectLiveDetectorShadow` under a preview-only flag.

The source boundary is the **existing durable Continuity runtime**:
`continuityRuntime.readback()` -> `readGroundedEvidence`, selecting only
source-attested observation receipts in the authenticated `world_id`.
The shadow refuses to form a source-derived policy assessment with no
trusted receipt, missing recorded/effective time, wrong world or disabled
persistence. An assistant answer is never authoritative source evidence.

For source-backed cases the shadow:
1. Builds an ephemeral scoped invariant frame from trusted, current,
   source-attested ledger facts — no new ledger or publication.
2. Uses the current user request and server-authenticated conversation
   history when available to create a **diagnostic** focus projection.
3. Runs **independent** policy/refusal and current-topic candidate checks.
   Correct refusal never short-circuits objective drift checks.
4. Runs a deliberately narrow explicit Turn-N temporal parser. Actual
   production prose without a trusted synthetic benchmark clock abstains;
   it cannot claim broad timestamp detection.
5. Attaches bounded, non-adjudicated shadow annotations to the EXISTING
   Continuity MODEL_OUTPUT_ASSESSMENT verification receipt, which is
   readback-checked by the existing reliability cycle.
6. Returns a `reliability.detector_shadow` summary. No customer-facing
   verified drift rate can be claimed from these candidates.

## Activation prerequisites
Feature is effectively disabled unless **all** apply:
- `VERCEL_ENV=preview`
- `REALITY_CONTINUOUS_RELIABILITY_ENABLED=true`
- `REALITY_DETECTOR_SHADOW_ENABLED=true`
- Existing durable Continuity readback enabled:
  `REALITY_UNIVERSE_PERSISTENCE_ENABLED=true`
- Server-sourced `systemContext.world_id` and source-attested ledger
  records available. If absent, status is unassessed.

The preview-only setting must be established as a controlled operator
action after reviewing the branch and deployment isolation. It is not
automatically enabled by GitHub commits. No status from this adapter can
enable sending, ordering, dispatch, publishing, or modifying customer state.

## Verification
- Source provenance, no-history fallback, future evidence exclusion,
  original detector finding preservation, correct-refusal annotation,
  temporal abstention and no action tests
- Existing live orchestration and full Continuity reliability regression
- An in-memory mock Supabase persistence test confirms that the exact
  shadow object survives **existing canonical verification receipt**
  append/readback without replacing the model output.
- GitHub Actions workflow:
  https://github.com/maloney2323/Reality/actions/runs/40151013624
  — **84 tests passed, 0 failed, zero paid provider requests**.

## What is NOT established
- No enabled Vercel preview was accessed; no production feature was changed.
- No real customer or independently authenticated city/owner live source
  was used in these tests.
- The returned alerts are not adjudicated facts; broad temporal and
  semantic detection recall are still unproven.
- Delta-packet compression and caching telemetry are **not injected into
  generation** as part of this shadow integration; the separate
  experimental context-efficiency work must be measured independently.
- No comparison against an underlying provider model was re-run; prior
  frozen raw model responses remain unchanged.

## Next hard gate
Review source adapter and test on a preview with source-attested fixtures
and protected persistence, enable only the shadow flag, inspect the
readback receipts, and verify no changes in customer-visible answers,
provider calls or execution. Then measure alert precision and timestamp
coverage against independently adjudicated cases. Promotion requires
explicit independent review; no automatic merge or production activation.
