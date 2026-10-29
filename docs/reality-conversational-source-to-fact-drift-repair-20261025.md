# Reality conversational source-to-fact drift: trace, experimental repairs, real-model evidence

Date: 2026-10-25
Branch: `experiment/reality-live-durable-adversarial-20261025` (draft PR #140, unmerged)
Production: unchanged; external effects forbidden

## Original reproduced defect

The real, archived 12-turn GPT-4.1-mini construction/operations model output at turn 12 stated that a payer acknowledged receipt of a workers-compensation EDI file. At turn 9 the source was **only the user's report of what a contact said**, with no authenticated payer receipt. It is an evidentiary-status escalation, not proof that the payer did or did not receive anything. Reality's original conversational detector and general semantic reviewer produced zero issues and made zero answer corrections.

Source run: `construction-live12-20261025-a`; preserved isolated PostgreSQL `public.universe_events`, verified in the prior 12-turn audit.

## Exact structural cause

The typed Signal Cleaner marks hearsay and uncertainty on historical user messages. The cognition history handoff previously projected older user obligations, not a separately source-linked history of reported external assertions. The existing semantic reviewer received a large history and general suggestions to flag errors, but no mandatory per-claim provenance relationship verdict; empty issues were treated as though nothing noteworthy had occurred.

## Changes in the existing architecture

1. `src/reality-cognition-continuity-handoff-v0.1.js`: project historical and current typed user-report/uncertainty clauses (not assistant content) with source refs, clause IDs and original modalities into bounded `conversation_evidence`. This is NOT external fact verification or a new persistent store.
2. `src/reality-live-intelligence-orchestration-v0.1.js`: provide the same authenticated typed evidence candidates both to the original LLM and both passes of the existing semantic reviewer.
3. `src/reality-semantic-review-v0.1.js`: require an explicit source-ref- and clause-ID-linked `provenance_checks` comparison for each supplied report. Enforce answer-quote anchoring and receipt-ID existence, record unassessed coverage, avoid treating source reports as provider events.
4. Reuse the SAME Signal Cleaner on exact quoted answer snippets to catch when a reviewer labels a bare external factual assertion `REPORTED_WITH_UNCERTAINTY` despite no visible report/uncertainty marker in that quote; mark `UNSUPPORTED_FACT` as a reviewer-supported **candidate** (not independently proven hallucination).
5. Final offline-only refinement: treat a prospective internal directive such as `Hold all purchases until approved` as an instruction, not proof an external action occurred. Existing typed Cleaner classification is reused; no business-specific detection dictionary was added.

All five latest no-cost checks pass; tests cover original source provenance, an unrelated delivery claim, exact answer quotes, omitted assessments, forged receipts, qualified statements and internal hold instructions.

## Actual paid test evidence (no synthetic LLM output)

| Test | Real calls inside Reality/reviewer | Findings |
|---|---:|---|
| Initial provenance handoff retest `provenance-replay-20261025-a` | 12 GPT-4.1-mini requests | Original saved bad answer still missed; fresh 4-turn equipment delivery/payment dialogue was appropriately qualified and had no corrections |
| Mandatory structured reviewer `provenance-contract-20261025-b` | 2 GPT-4.1-mini reviews | Reviewer explicitly assessed 10/10 reports but incorrectly classified the unqualified payer sentence as `REPORTED_WITH_UNCERTAINTY`; 0 issue candidates; clean turn-9 control assessed only 2/8 candidates |
| Cleaner/reviewer consistency `provenance-contract-20261025-c` | 2 GPT-4.1-mini reviews | The original payer sentence **was flagged** as `UNSUPPORTED_FACT`; qualified control was not flagged, but coverage remained incomplete (original 6/10; control 1/8) |
| Latest prospective-advice false-positive refinement | 0 additional paid calls | Offline passing only, **not yet proven live** |

### Serious caveats

The final live checker with unqualified payer claim produced **five** `UNSUPPORTED_FACT` candidates, including commands to hold purchases and dispatch, which are likely false positives. The final offline-only refinement addresses that specific classification using existing typed intake, but has not yet been proven out of sample. Other flagged statements may be claims about user-reported internal events, not independently verified provider facts. No true error precision/recall or drift-reduction rate has been independently established. No end-to-end corrected published response was demonstrated. The result is therefore **candidate detection improvement, not proven reliable automation or verified repair**.

Permanent, Vercel-protected immutable Preview reports:
- Initial handoff replay and fresh responses: https://reality-16m8d44hx-maloney2323-5310s-projects.vercel.app/
- Mandatory structured reviewer replay: https://reality-ms8plljsm-maloney2323-5310s-projects.vercel.app/
- Final Cleaner/reviewer consistency replay: https://reality-e9nkakwhg-maloney2323-5310s-projects.vercel.app/

These are scripted conversation situations with *actual model calls and actual isolated Supabase PostgreSQL readbacks*. They are not verified customer interaction transcripts.

## Next proof criterion

Freeze a new set of unrelated, previously unseen dialogues with precise independently adjudicated ground truth. Require Reality to show original answer, source-labeled claim, exact issue, where detected, corrected release, and independent review without unrelated false alarms. Validate separately that execution authority remains fail-closed. Only then report drift reduction or business ROI. Do not stack thousands of specific phrase rules on Reality.
