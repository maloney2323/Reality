# Reality Epistemic Metabolism · Sandbox Repair Contract V1

**Status:** design/acceptance contract only. No autonomous repair workflow or deployment is implemented by this file.  
**Architectural home:** Universe + existing Continuity Ledger + Intelligence Spine + Verifier. **Not** a new independent model or guardrail subsystem.

## Non-negotiable invariants

- **Intelligence and execution are independent:** knowledge gaps do not suppress ordinary reasoning, drafting, creativity, calculations, alternative planning, or business recommendations. Action authority remains checked at the actual consequential tool boundary.
- **Observation is not truth:** a source-attested readback proves what a source record reported. It does not prove a payment occurred, an inspector approved work, or a business outcome is correct.
- **Immutable source history:** never rewrite the original model answer, claim, or recorded source. Correct through linked append-only revisions.
- **Self-assessment is not self-approval:** an LLM, detector, or repair generator cannot declare its own improvement independently verified; coverage gaps are *candidates* until reproduced and adjudicated.
- **No automatic authority expansion:** production policy and explicit customer/administrator scope govern tool actions. An improvement cannot grant new permissions or deploy itself.
- **No fabricated ROI:** time saved, money protected, error rate, defect reduction and autonomy earned remain unknown until independently measured.
- **No magic scalar provenance weights:** source authenticity, consistency, freshness, completeness, scope, authority and external-outcome verification are separate typed dimensions. A number such as 0.95 is not factual truth.

## Closed loop: evidence → competence → bounded autonomy

| Step | Event | Input and proof required | Output | Invariant |
| --- | --- | --- | --- | --- |
| 1 | **Detection/escape observed** | Frozen benchmark result or independently verified customer failure with original answer and exact origin | Source-bound failure candidate | A flagged error is not a correctly diagnosed error |
| 2 | **Ignorance admitted** | Bitemporal, worldline-scoped Universe evidence plus exact missing competence or source | Hashed Ignorance Manifest | Unknown and conflicting are not silently promoted to truth |
| 3 | **Root cause proposed** | Explicit expected behavior, model answer, missed detector class, causal hypotheses | Versioned capability gap contract | Hypothesis is not proven root cause |
| 4 | **Sandbox remedy proposed** | Existing module boundary, minimal change, predicted impact, affected scope | Candidate branch or policy/test proposal | No direct production mutation |
| 5 | **Reproduce and verify** | Original frozen failure, unrelated positive controls, newly held-out adversarial cases, cross-tenant evidence cases | Pass/fail receipts including false positive and missed error counts | A fixed historical case is not sufficient |
| 6 | **Bounded promotion decision** | Independent oracle/readback for factual claims; scope-specific technical review and applicable approvals | Proposed competence ledger transition | Only authorized production review/CI can approve change |
| 7 | **Observe after rollout** | Real effect receipts, customer outcomes, drift and false-alarm monitoring | New Universe evidence, regressions or reversion proposal | Any regression produces a new gap without rewriting history |

## Manifest contract: business vs. Reality-self gaps

**Business evidence gap** example: crew reports `inspection.status=PASSED`; city portal reports `PENDING`. A manifest names source records, required inspector approval, permitted non-execution intelligence and proposed restricted actions. The actual dispatch/send/payment gate must independently enforce authority; a manifest cannot enforce or dissolve itself.

**Internal competence gap** example: 25-turn frozen construction fault probe intentionally outputs a fabricated completed payment, yet the detector returns no matching classification. Log the expected failure class, actual detector classifications, preserved benchmark receipt and candidate gap. **Do not** claim a real OpenAI error from a synthetic probe.

The verified-competence record must track at least:
- Module and version; original escaped-case receipt(s) and independent factual oracle if present.
- In-sample detection recall and precision, *plus* withheld-case recall, positive-control false-alarm count and user-task usefulness.
- Full regression CI, scope-isolation tests, execution authority tests, and measured cost/latency.
- Human approval or pre-authorized rollout policy, eligible action scope, immutable merge/deploy receipt.
- Observed post-rollout outcomes; if none, `OUTCOME_NOT_YET_VERIFIED`.

## Correct-before-next-turn boundary

- **Before delivery:** if a consequential candidate is detected, retain original answer hash, propose bounded correction, verify against source-backed invariant, then deliver corrected answer *only if* checks substantiate it. Otherwise report uncertainty and prepare alternatives. Harmless requests should remain conversational and usable.
- **After delivery:** a newly discovered error must generate a linked correction and update the knowledge-state projection before the next dependent turn. Historical messages remain immutable.
- **Never claim a live repair passed** when only a synthetic detector test or a candidate re-generation occurred.

## First integration acceptance criteria

1. Tenant A's `job:WR-41` claim never influences tenant B or `job:OT-9`.
2. Original source records and conflicting statuses stay present after all replays.
3. Unverified inspector approval cannot dispatch crew; drafting, planning and math still work.
4. A known-bad synthetic fault missed by a detector creates a `DETECTOR_CAPABILITY_GAP` record tied to the benchmark; an unrelated alert does not count as success.
5. Repair passes original failure and **new, unseen** cases; no added false alarms on designated harmless controls.
6. Capability improvement and autonomy expansion are separately scored and separately approved.
7. Customer dashboard shows original model answer, diagnosed error, candidate correction, verification status and final answer *side by side*. Any unmeasured metric displays `NOT_MEASURED`.

## Current implementation boundary

`src/reality-universe-ignorance-manifest-v1.0.js` provides a scoped typed evidence comparator, hash-bound business manifests, a create-only immutable Universe entry projection, and candidate internal detector gap records. It currently **does not persist manifests to a customer ledger**, ingest unstructured claims automatically, trigger discovery connectors, run remediation branches, independently certify model accuracy, enforce tool permissions, or deploy/publish corrections.

The next executable seam is trusted server submission → Universe append/read-back → operation-specific policy gate → **isolated repair runner**. Progress should be reported as implementation coverage, not claimed autonomy or consciousness.
