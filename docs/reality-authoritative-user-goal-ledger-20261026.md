# Reality: user-authoritative goal relationship in the existing Continuity Ledger

Date: 2026-10-26. Draft PR #140. This is an architecture implementation, **not a tested accuracy improvement**.

## What is authoritative now

A new `USER_AUTHORIZED_GOAL_TRANSITION` event is appended to **the existing append-only `universe_events`/Continuity chain**, scoped by verified session principal, conversation-derived root, and world. The ledger projection recomputes and checks the existing Continuity lineage, matches the authenticated user source, and reconstructs **active/paused/dormant/abandoned/user-reported-complete-unverified** goal relationships. No new goal database or table has been created.

**Only an explicit user-issued goal command on the authenticated private-chat preview** can create one of these records. The server persists the actual user message via Supabase RLS, reads it back to verify the owner, request ID, source ref and exact text, then appends a separately source-linked goal event. Model answer text, reviewer semantic labels and earlier assistant suggestions have **no API path or authority** to record these events.

Supported authenticated commands:
- `SET_ACTIVE`: user explicitly confirms a new controlling goal; prior active focus becomes **DORMANT**, not silently abandoned.
- `START_DETOUR`: user explicitly starts a subordinate goal while the prior active goal becomes **PAUSED** and retains its parent identity.
- `RESUME`: user selects an existing goal ID; the prior active focus becomes DORMANT without presumed completion.
- `PAUSE`: user pauses their active goal.
- `ABANDON`: user explicitly stops tracking a goal.
- `REPORT_COMPLETE`: stores a **user-reported** completion only; **does not** prove any external business outcome.

All of these commands are **conversation-goal administration**, not authorization to email, purchase, publish, deploy or make financial transactions.

## Wiring into one Reality system

The pre-generation orchestration recovers the verified goal projection from the existing Continuity root **before** Cognition. It is placed into the same canonical epistemic frame and same source-linked conversation context as the provisional goal trajectory.

When a user-authenticated active goal exists, the cognitive goal-state contract prioritizes that **explicitly confirmed user goal** over the provisional goal inferred by the LLM reviewer. The assistant-goal-proposal Verifier, pre-publication boundary, blocked-shift message and final Continuity goal receipt use that same controlling goal.

The most recent user request may still authorize a harmless immediate detour; this **does not silently mutate** the persisted active-goal relationship. The user can deliberately change their active goal through the authenticated control. The existing provisional semantic lifecycle is still useful for interpretation, but it has no goal-write authority.

The authenticated preview UI now provides **Confirm this goal** and **Resume selected goal** controls. The goal entry, its source-linked readback and active goal are visible. These controls do not invoke a model, execute tools or create customer business actions.

## Validation/safety distinctions

- Authorization is based on an explicit authenticated account action and RLS-readback proof of the user-authored message, **not** on a judge/model asserting the user approved something.
- The projection accepts only matching root/world/principal source records, recomputes ledger lineage, rejects duplicate source request IDs and fail-closes on mismatches.
- The user can make a goal *authoritative for the conversation* without proving a business outcome. User-reported task completion stays unverified.
- Ordinary chat still produces uncertain, source-linked interpretation candidates; unconfirmed goal phrases are not silently elevated to authoritative state.
- Each event keeps the original source-reference, principal and source-message digest. `source_user_message_ref` points to the RLS-authenticated message; full private text is not required inside a transition for non-creation operations.
- Model proposals can remain creative and are evaluated before publishing, but do not change the canonical goal state.

## Important limitations — do not overstate

1. **No model tests or benchmarks were run for this work**, at the founder's explicit request. Automatic repository checks, if triggered by commits, are not a demonstrated end-to-end authorization verification.
2. **No live authenticated goal-command flow has been independently executed or verified** in this change. Integration, client behavior, source attestation, concurrency and persistence error handling still require later validation when the founder resumes tests.
3. This is an **explicitly confirmed-goal authority contract**. It does not automatically infer every user's changing intention from natural conversation; ordinary conversation remains an interpretive, revisable trajectory.
4. Subtle assistant-originated goal drift can still be missed by semantic review. A correct ledger goal by itself does not establish drift detection recall, false-positive control, or verified correction.
5. Concurrent edits and very long event histories need additional production-grade transaction/rehydration engineering. The current design fails closed on invalid or incomplete Continuity lineage; it is not a proven transactional SLA.
6. Preview only, draft PR #140, no new Supabase schema, no production deployment, no customer action, and the frozen 50-turn benchmark remains paused.

**Architecture result:** Cognition has no authorized path to rewrite the ledger's user-governed active-goal relationship. **Reliability result:** still not demonstrated; do not market it as drift eliminated.
