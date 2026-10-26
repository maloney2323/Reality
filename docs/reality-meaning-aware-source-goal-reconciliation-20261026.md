# Reality — meaning-aware, source-bound goal reconciliation

**Date:** 2026-10-26. **Scope:** experimental PR #140, existing Node.js / Continuity / semantic-review architecture. No new database or LLM reviewer. Do not promote the experimental branch to production. The founder's pause on paid and long-running benchmarks remains active.

## Existing foundations reused

- Authenticated, explicit **user goal commands** already project authoritative active/pinned goals from signed Continuity evidence in `reality-authoritative-user-goal-ledger-v0.1.js`. A reviewer or assistant cannot issue those commands. Chat conversation text is not sufficient to grant external execution authority.
- Ordinary user directions remain **semantically provisional** in `reality-user-goal-continuity-state-v0.1.js` and are recovered from the existing append-only Continuity evidence.
- The same pre-generation canonical goal evidence and existing semantic reviewer provide a `goal_trajectory_review` with user-direction classification, source ref, explicit return-intent classification, and exact current-user return phrase.
- Existing Integrity and publication boundaries already block specific recognized, quoted unauthorized assistant direction shifts. They are not guaranteed to recognize every semantic error.

## Changes in this implementation pass

**1. No silent return to a previous goal from a review label alone.** In the existing provisional lifecycle replay, `USER_RETURNED_TO_OBJECTIVE` now requires ALL: an explicit reviewer `EXPLICIT_TARGET_RETURN` classification, an exact return quote contained in the current **user** utterance, and exactly one earlier source-linked goal matching the proposed target. Otherwise the state remains unresolved and the earlier goal focus is not silently replaced. Reviewers and model messages cannot prove approval.

**2. Semantic reviewer input and normalization constrained by user provenance.** `USER_AUTHORIZED_PIVOT` and `USER_AUTHORIZED_DETOUR` may only cite the **current user turn** as direction evidence. A claimed return must cite an **earlier, known user goal source**, carry `EXPLICIT_TARGET_RETURN` with an exact substring from the current user turn, and never point at the current turn as its target. Unanchored or contradictory proposals are marked `INVALID_OR_UNANCHORED_GOAL_ASSESSMENT`; no source-authenticated lifecycle authorization is created.

**3. Meaning-aware GoalTransition projection enriched in place.** Existing `projectGoalTransitionContract` consumes the same reviewer candidate, current user text, source-linked prior goal candidates, and independently attested user-goal-ledger state. It records `SOURCE_LINKED_PROVISIONAL_USER_DIRECTION`, `SOURCE_LINKED_PROVISIONAL_RETURN`, `PIVOT_SOURCE_UNRESOLVED`, `RETURN_TARGET_UNRESOLVED`, or `NOT_MEANINGFULLY_RECONCILED` along with the exact user source, earlier target when available, and whether a verified user goal remains active. All such semantic results explicitly retain `grants_goal_mutation:false`, `grants_external_execution:false`, and `semantic_confidence_independently_verified:false`.

**4. One existing audit and UI path.** The enriched transition contract is included in the existing `goal_transition` Continuity receipt. `user_goal_continuity.current_turn_meaning_reconciliation` exposes the status through the already-connected authenticated chat API into its preview UI. It tells the operator whether the goal link was source-bound but provisional, or unresolved; it never displays a drift-free guarantee.

## Why this matters, and what it does NOT establish

The previous reviewer could cite an old user turn as a newly authorized pivot, or cite an earlier goal as an alleged return even without a matching return request. That allowed a *model interpretation* to alter Reality's **provisional working focus**, even though the authoritative user-goal ledger was unchanged. Source and relation checks now reject those unsupported reconstructions.

This is **not full semantic reliability**. An LLM can still plausibly misclassify ambiguous current-user language as a pivot, omit off-goal recommendations, or fail to identify two goals that mean the same thing. The current user's new topic remains valid without a formal goal-command event; an independently pinned ongoing objective never changes without verified command authority. The provisional projection is not the same as authoritative active-goal state. The 50-turn Reality-founder benchmark remains stopped at 21 genuine-model turns; no test-driven drift reduction is claimed.

**Next architectural work, before the founder authorizes testing:** explicitly reconcile multi-goal identity and constraints across paraphrases and concurrent work using typed source-linked relations, and apply semantic conflict review to the assistant's evolving *planned work* before admitting the final response. Continue using the existing Integrity Spine, not an independent detector.

**Verification status:** Changes committed in draft PR #140. No paid requests or tests were manually run as part of this pass. Existing CI may run automatically on pushes; do not claim green checks without inspection.
