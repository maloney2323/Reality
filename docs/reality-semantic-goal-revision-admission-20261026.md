# Reality: source-anchored semantic goal revision admission

**Checkpoint:** 2026-10-26. Draft PR #140 only. Not merged, deployed to production, or declared drift-free. **No benchmark runs, no manually initiated offline test suites, and no paid model calls were run during this implementation.**

## Architectural issue

Reality already has:
- An authoritative goal ledger that accepts only explicitly attested user-origin goal commands within the existing Continuity chain;
- Source-linked, provisional goal/trajectory state used for contextual reasoning;
- Typed assistant goal proposals and an existing Verifier/Integrity state-mutation boundary;
- One semantic review and an optional bounded correction / re-review.

The missing seam: the existing correction admission considered a second review successful when its issue list was empty. That did **not** require the revised answer's **goal trajectory** to be explicitly aligned to any source-linked user-owned objective. A reviewer could omit the old finding while admitting a still-off-goal answer. Separately, an acknowledged wrong-task original could survive if no replacement cleared and no explicit goal-mutation candidate was extracted.

## Changes in this checkpoint

**Same existing contracts, no parallel guardrail service or new database.**

1. New exported pure admission projection `adjudicateRevisedGoalAlignment` inside `src/reality-goal-authority-contracts-v0.1.js`. Requires that the second review anchors its user-goal source to the current user or a known goal evidence source, marks the *actual revised answer* as `ON_USER_DIRECTED_OBJECTIVE`, provides a nonambiguous user-direction classification, leaves no flagged off-goal quote, and reports no unresolved future work shift or wrong-task obligation issue. This only asserts **reviewer candidate clearance**; it does not independently prove semantic correctness or authorize state mutation.
2. Existing orchestration invokes that contract when the initial reviewer found an assistant-led goal redirect or `WRONG_TASK`. A fixed-looking second review **cannot silently release** an answer without explicit user-goal reconciliation. The result is appended into the **existing semantic repair Continuity receipt** and exposed as a structured `revised_goal_alignment` status. It does not create a separate state store.
3. If the first review specifically identified an unanswered current request with an anchored `WRONG_TASK` issue and the bounded correction did not clear, Reality withholds that original answer instead of publishing the known off-task draft. Stronger source-evidence quarantine and external-action withholding take priority.
4. Authenticated preview chat now includes the revised-answer goal-alignment disposition. All scores remain unverified.

## Limits and safety

- The model can still **miss** subtle drift in the first semantic review. This change improves **admission of detected corrections**, not detection recall. The reviewer is not independent ground truth.
- A wrong reviewer classification may cause a needless hold. A current user-authorized pivot or detour is not intrinsically drift. Scope is checked against the current user source and prior authenticated goal evidence, but semantic accuracy remains to be established later.
- No assistant proposal creates an authoritative goal, permissions, purchase, message send, or completed business outcome. Consequential actions still require independent approval and evidence.
- The user's explicit hold on further benchmarks remains in force. This is a code-review/implementation checkpoint only, not a performance result.
- The next foundation work should make the assistant's evolving planned **work direction** first-class in the existing proposal/Continuity contract, so gradual goal displacement is visible before an obviously wrong final response. That is different from merely adding more post-turn warning phrases.

**Production remains unchanged, PR stays draft, and the 50-turn founder business benchmark remains paused.**
