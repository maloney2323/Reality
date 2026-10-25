# Reality: Zero detector alerts are not zero true conversational drift

Date: 2026-10-25. Protected experimental PR #140. No production changes or new paid model requests for this fix.

## Failure
Previous founder business benchmark `take-intelligence-founder-50-live-20261025-a`: **21 durably recorded real GPT-4.1-mini turns**, **0 goal drift reviewer candidates**, **2 answers changed by evidence warnings**, **0 rewritten corrections**. Direct independent readback of Supabase found **20 semantic-review attempts recorded as REVIEWED_*** and **1 UNASSESSED after model budget cap**. All 21 receipts predate this change; they have no new `goal_drift_coverage` marker. None has independent ground-truth grading. It is invalid to claim 0% drift or measured improvement.

## Architectural fix (no new model call)
The existing Signal Cleaner → canonical epistemic state → Cognition → semantic reviewer → existing Continuity verification receipt remains unchanged as a single path.

Added `assessGoalDriftCoverage` at the same pre-receipt seam:
- Explicit statuses: `NOT_SEMANTICALLY_ASSESSED`, `GOAL_ALIGNMENT_UNRESOLVED`, `LIMITED_REVIEW_NO_CANDIDATES`, `DRIFT_CANDIDATES_REQUIRE_ADJUDICATION`, `REVIEWED_NO_CANDIDATES_NOT_VALIDATED`.
- Uses **existing reviewer goal trajectory**, reviewer status, source-linked prior user/assistant projection, history truncation and existing findings; does not pretend reviewer agreement is independent accuracy.
- Where a conversation history is incomplete, old user directions are omitted, reviewer partial, or a model-token limit prevents review, coverage status cannot be reported as fully evaluated.
- Every assessment explicitly carries `candidate_count_zero_means_drift_free:false`, `independently_verified_drift_rate:null`, and `model_semantic_false_negative_possible:true`.
- This status is now persisted in the ordinary Continuity verification receipt, surfaced in the response, through authenticated private chat API and in the UI.

Added evidence-backed *independent* scorecard with `DRIFT / NO_DRIFT / UNRESOLVED / NOT_GRADED` original/final labels and separate source receipt IDs for labels. It calculates true positives, false negatives, false positives, recall and precision **only for independently graded turns**; it publishes whole-run original/final drift rates and measured reduction **only when all turns are graded**. An ungraded run with 0 alerts reports null drift rates. The founder benchmark runner uses this contract and discloses historic receipts where explicit coverage wasn't yet recorded, rather than retroactively changing their content.

## No-cost tests
- Reviewer missed or unavailable and no lexical flags → `NOT_SEMANTICALLY_ASSESSED`, not clean.
- Partially reviewed and no candidate → `LIMITED_REVIEW_NO_CANDIDATES`.
- Trusted history truncated or older assistant directions omitted → incomplete coverage.
- Valid reviewed alert → candidate requiring independent adjudication, not proved drift.
- Legitimate user-authorized detour → not automatically drift.
- False-negative case: independent human DRIFT + 0 detector alerts → false negative and 0% recall, **NOT** 0% drift.
- False positive case: authorized turn flagged by detector → precision/false-positive penalty.
- Missing evidence receipt or partial grading → no reported reduction.
- End-to-end existing semantic reviewer → Continuity readback test checks persisted coverage and source receipt.
- GitHub five no-cost checks passed (commit after this documentation).

## Still unsolved
The detection model itself may miss semantic or gradual objective drift and sometimes flag benign language. Tracking and grading coverage **fixes misleading observability and confidence claims**, not semantic recall. The next evidence-based improvement must independently grade saved underlying-model and released answers, examine missed goal deviations and legitimate topic switches, and calibrate the *existing* semantic comparison without another stack of guards. Do not claim a reduced drift rate until those labels exist and a distinct held-out run reproduces the gain.

No historical receipts were changed. Experimental preview only, no merge into production.
