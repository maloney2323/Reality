# Reality user-owned goal continuity — architecture implementation checkpoint

**Status:** EXPERIMENTAL DRAFT, NOT PRODUCTION. No live-model tests, benchmark reruns, or manually invoked test suites were performed in this implementation pass. Founder explicitly paused tests until the drift architecture is complete. This checkpoint is not a statement that drift detection is fixed.

## User's actual requirement

Conversational drift means the AI gradually abandons, dilutes or reinterprets the *user's purpose* across turns, despite sounding plausible. It is not interchangeable with hallucinations, source uncertainty, topic-keyword changes, or execution-policy violations. Authorized detours and legitimate changes of objective are not drift.

## What has been implemented in the existing path

**Signal Cleaner and authenticated conversation → persisted user-owned goal evidence → provisional goal lifecycle from existing Continuity verification receipts → Cognition + semantic review → existing correction/reliability receipt.**

- Added `src/reality-user-goal-continuity-state-v0.1.js`, not a new truth database. Stores source-linked user-channel evidence with stable goal-evidence IDs and one preserved earliest user-goal candidate. The source is an authenticated history adapter when available; otherwise the scope is explicitly incomplete. The current user turn has its own source ID.
- Reconstructs the most recent such projection from the *same* Continuity root and world, not from assistant-generated summaries. The original goal candidate survives loss of older turns from the bounded chat retrieval window; newer user statements cannot silently erase the original.
- Stores a bounded cache (original plus latest 23 goal-evidence records; maximum 700 characters each). Omitted history is disclosed. The full event history continues in the existing Continuity ledger.
- Replays prior `MODEL_OUTPUT_ASSESSMENT` events only if they link by source receipt and frame hash to a matching canonical frame. Reviewer classifications such as detour, pivot and return produce **PROVISIONAL** active/paused interpretations; permanent supersession and independent semantic correctness are never asserted.
- A return-to-goal proposal can resume an earlier user goal only when the review anchors the *earlier target user source*. Unknown targets stay unresolved instead of blindly popping the latest detour.
- Remembers reviewer-only assistant goal-alignment trajectory and consecutive off-goal candidates. Zero candidates remain inconclusive, not verified 0% drift.
- Feeds the reconstructed source-linked original and provisional working goal into pre-generation Cognition context; the existing semantic reviewer considers them with the **current user direction** taking precedence, and any correction remains in the existing once-only review/revision process.
- Extends the existing canonical epistemic frame and durable readback receipt to carry source-linked goal state and lifecycle projections. Explicit root/world and no-execution-authority checks prevent cross-world promotion or fabricated authorization.
- Authenticated chat API/preview UI surface the original and provisional working goal plus pending reconciliation. No additional standalone model-judge call was introduced.

## What is *not* solved

1. **Goal meaning and lifecycle are not independently verified.** The earliest turn is still a *candidate* for the original objective, not an automatically proved mission statement. Model reviewer interpretation can be wrong. A user may permanently replace, complete or pause a goal; authoritative lifecycle transitions remain intentionally unresolved until semantic identity and scope are properly reconciled to user evidence.
2. **Assistant-origin drift recall remains unmeasured.** The temporal review history preserves possible deviations, but cannot guarantee the reviewer detects gradual changes in recommendations or behavior.
3. **Typed obligations and specific work objectives need semantic identity links**, not only utterance-level goal evidence. The working-goal stack and original-goal anchor are a first foundation slice, not a fully reconciled active task/obligation graph.
4. **Source ownership and user authorization must be verified at the channel adapter**, not inferred from quoted speech, model text, or the reviewer alone. Provisional semantic classifications never authorize external execution.
5. **Historical coverage is bounded** in the pre-generation context. Original goal evidence survives via the ledger, but the 240-message handoff limit, selective relevance across multiple simultaneous projects, and reviewer false positives remain to resolve.
6. **No success claim or percentage.** No new tests were run at the founder's request. The experimental integration is not verified in a genuine new conversation, has not been merged, and must not be represented as fixed production behavior.

## Next implementation work, before testing is resumed

- Reconcile typed user instructions into first-class goal and obligation identities with explicit scope and target references, ensuring only user-origin evidence can authorize direction changes.
- Preserve multiple simultaneous project objectives with bitemporal active/suspended/completed/superseded user intent (with proper uncertain states) instead of treating the first user turn as universally governing.
- Model longitudinal assistant work proposals and actual work as a trajectory, compare changes to the user-owned objective **before release**, and repair the exact off-goal recommendation rather than appending evidence warnings.
- Maintain an audit receipt that links the user's controlling objective, deviation, attempted correction and final disposition without mistaking absence of reviewer alerts for a clean conversation.
- Only after implementation, separately establish long-run detection accuracy, false positives and actual corrections on held-out genuine model interactions.

**No production deployment, no benchmark continuation, no paid OpenAI runs, and no external customer actions were performed in this pass.**
