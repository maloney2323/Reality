# Reality Intent Continuity Contract v0.1
**Scope:** Isolated candidate; no runtime wiring, production release, paid model calls, state mutation, or authorization.

## Goal
Allow a human to switch topics, interrupt work, or introduce an urgent idea without silently erasing prior goals and obligations. A change of subject is not itself a human error. The model's guess about user intent is not authoritative.

## Boundary
1. **Verified intake** supplies a signed-in principal, current continuity root, work-item identity, original objective, and an immutable user-signal reference. All are derived outside the LLM.
2. **Signal Cleaner / interpreter** can propose an intent relation: `SAME_OBJECTIVE`, `RELATED_IDEA`, `POSSIBLE_DETOUR`, `PRIORITY_CHANGE_REQUEST`, or `UNCERTAIN`. Each classification is tentative. No fixed drift rate is inferred.
3. **Universe** receives an append-only `INTENT_CONTINUITY_OBSERVATION` linked to the original user signal, and optionally to a verified checkpoint. Its receipt has immutable identity and hash.
4. **Continuity Ledger** owns lifecycle state. An observation never completes, pauses, overwrites, or deprioritizes an objective; it never authorizes a business action.
5. **Verifier** reconciles receipt integrity and, if a material priority change is sought, checks a distinct user-confirmed authority event before a lifecycle transition.
6. **UI** quietly files related ideas. For consequential conflicts, offer **Continue current work**, **Save idea for later**, or **Switch priorities**; do not prompt on every topic change. Restoring a work item requires a separately verified continuity reconstruction.

## Example: long construction conversation
Turn 677: homeowner approval for an estimate remains outstanding; the verified checkpoint is saved.
Turn 678: the person proposes a new AI receipt dashboard.
Reality stores the new idea as linked work, leaves the estimate's approval requirement untouched, and can resume it from its last verified checkpoint.
An emergency request could genuinely take priority, but requires a distinct confirmed transition rather than an automatic guess.

## Verification and metrics
- Pass criteria: zero lost open obligations across context changes, no false completion, proper tenant isolation, deterministic duplicate/conflict behavior, correct retrieval on restart.
- Human topic switches are counted as *topic transitions*, not mistakes. Count `unintended_work_loss`, `wrong_workstream_resume`, and `clarification_interruption` separately.
- Differentiate *candidate detection*, *user-confirmed pivot*, and *verified outcome*. Never claim an error prevention or time savings without evidence.

## Current stage
The pure event builder and read-only projector are implemented with unit tests. Not yet integrated with actual Signal Cleaner inference, authenticated streaming conversation ingestion, database persistence, a customer-facing UI, or restart-proof retrieval. These require separate verification.
