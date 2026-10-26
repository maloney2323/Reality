# Reality: Assistant proposal posture and atomic publication — October 26, 2026

**Branch:** draft PR #140, isolated experimental preview. **Production untouched.** The founder’s pause on paid long-run drift benchmarks remains in force.

## 1. Assistant suggestions are NOT objective changes

The existing semantic reviewer now gives each source-linked future-work quote a `direction_effect`:
- `OPTIONAL_SUGGESTION_ONLY`: advice offered as an option, no user-goal mutation
- `USER_REQUESTED_PROPOSAL`: a proposed plan asked for by the user, no user-goal mutation
- `ASSISTANT_DIRECTED_OBJECTIVE_SHIFT`: assistant unilaterally pursues a new controlling objective
- `ASSISTANT_DIRECTED_FUTURE_COMMITMENT`: assistant declares unapproved future execution
- `UNRESOLVED`: unclear posture, retained as uncertainty and **never** treated as authority

Every proposal still requires an exact quote in the original answer and a source-linked user goal. The same existing reviewer is used; no separate detector or new model request. In `reality-goal-governance-contract` and `reality-goal-authority-contracts`, only assistant-directed changes are potential mutations. Optional advice survives as a non-authorizing suggestion, not a user state transition. It can still be marked `WRONG_TASK` independently if it displaces the user's requested deliverable.

The existing `ASSISTANT_GOAL_PROPOSAL_AND_AUTHORITY_DECISION` Continuity receipts now preserve optional suggestion posture and unauthorized mutations separately. The existing assistant trajectory projects both types across preceding turns with exact source citations. Only source-linked unauthorized direction shifts can enter the blocked/off-goal trajectory; repeated optional suggestions remain evidence for the semantic reviewer, **not** authorization to replace an active goal.

**Limitation:** semantic classification is probabilistic. The reviewer can still mistake persuasive drift for harmless advice, or flag a benign proposal. This change makes the correct distinction representable and enforces the distinction when detected; it does **not** prove reliable detection recall or no drift.

## 2. Atomic database publication actually installed — isolated preview ONLY

**Supabase project:** `hvkfreoagbrphwghjajw` (`reality-continuity-benchmark`). **Migration:** `reality_atomic_goal_and_user_turn_publication_v01`, applied successfully on October 26, 2026. Source: `sql/reality-atomic-goal-publication-v0.1.sql`.

**Three competing operations are serialized on the same per-user/conversation transaction advisory lock:**
1. An authenticated user-message admission (trigger on `reality_chat_messages` for `role=user`) advances a **derived last-user-request marker**.
2. A source-attested user-goal transition (trigger on `universe_events`) advances the **derived goal revision epoch and transition ID**.
3. Assistant publication occurs via `public.reality_publish_assistant_if_goal_current` in one SQL transaction and holds the same lock while checking expected goal epoch/last transition, the existence of the matching saved user message, and whether that request is still the latest admitted user turn, *before* inserting the assistant row.

The internal epoch table is only a derived concurrency clock; existing append-only Continuity events and authenticated chat messages remain the authoritative histories. This intentionally avoids creating a second `GoalState` truth table. The signed-in Vercel server uses a server-only credential; the RPC is **executable by `service_role` only**, not `anon` or `authenticated`. The old authenticated `assistant` direct-insert policy is replaced with a `user`-only RLS INSERT policy, so a browser cannot bypass publication checks. Stale goal changes, newer user turns and duplicate assistant publication fail closed (409 for recognized conflicts, otherwise 503). There is no automatic legacy fallback when atomic publication is selected.

**Verified with read-only database metadata (no concurrency/behavioral benchmark):** both triggers enabled; RPC installed; only service role has EXECUTE; RLS INSERT policy permits authenticated users to insert only their own `role=user` records; migration recorded in Supabase history. The experimental PR branch now has `REALITY_ATOMIC_GOAL_PUBLICATION_ENABLED=true` scoped to that Vercel preview. This flag and database change were NOT applied to production.

**Operational warning:** that RLS restriction applies to the whole isolated Supabase **project**. Any older preview using the same project and still directly inserting authenticated assistant messages will fail safely until migrated to RPC. It must not be relaxed to make an obsolete client work.

## 3. What this guarantees and does not

The database-level conditional write is designed to serialize a committed authoritative user-goal change or newly admitted user turn against final assistant publication within the same conversation. It does **not** ensure all general `universe_events` append-only lineage updates have race-free parents (separate ledger-wide concurrency issue), nor guarantee every in-flight response is semantically aligned. It does not make model proposals executable, prove business outcomes, or eliminate all model drift.

**Not yet proven:** simultaneous-request contention behavior in a live signed-in session, semantic review precision/recall on gradual drift, and full reliability under a long real workday. The founder explicitly paused those tests. A READY preview and introspected schema are not a verified concurrency SLA.

No paid model benchmarks or external business actions were initiated during this implementation.
