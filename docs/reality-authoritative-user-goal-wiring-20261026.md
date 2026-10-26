# Reality: user-authored active-goal state in existing Continuity (October 26, 2026)

## Status

**Implemented in DRAFT PR #140; not independently tested or deployed to production.** The founder explicitly suspended tests pending architectural completion. No live LLM calls, benchmarks, migration, production changes, or external business actions were performed for this implementation.

## One source of goal authority

Reality already had a reducer at `src/reality-authoritative-user-goal-ledger-v0.1.js` that projects explicit, authenticated user goal commands from existing append-only `universe_events` / Continuity. Cognition reads this projection before answering; reviewer guesses and assistant proposals never change it. The earlier provisional goal trajectory remains separate and may help interpretation, but is **not** authorized user-goal state.

This implementation completes the missing authenticated-channel route using **the existing signed-in private-chat POST**:

1. The user deliberately selects **Set this message as my ongoing objective** (`SET_ACTIVE`) or **Temporarily detour** (`START_DETOUR`) using a new selector in the private-chat UI. Ordinary messages send no goal command.
2. `api/reality/personal-chat.js` checks the session, same-origin request, JSON shape, user-typed message, and goal-command selection. It writes the user message through the existing Supabase Auth/RLS adapter, then reads it back through the *same authenticated session*. The server refuses if exact `request_id`, source row, role or text cannot be recovered.
3. Before invoking Cognition, the server opens the existing Continuity runtime in the *same user+conversation-scoped root/world* and calls **the already present** `appendAuthenticatedUserGoalCommand` with the RLS-recovered user message reference. No client-supplied user ID, goal-source ID, assistant text or LLM review is accepted as source authority.
4. The existing ledger issues a stable, scoped goal ID. A temporary detour records the earlier goal as `PAUSED`; setting a new ongoing goal makes the previous one `DORMANT` and recoverable, rather than claiming it was completed or abandoned. The reducer does not grant business-action execution rights.
5. The ledger now records a **server-side HMAC over the canonical user command**, bound to principal, world, root, source row, request ID and text digest. The reducer rejects unsigned/altered authoritative goal events rather than trusting an event's `authorized_by` string alone. This is *server issuance integrity* tied to prior authenticated RLS readback; not a general-purpose customer execution warrant.
6. Continuity write/readback and the existing `projectAuthoritativeUserGoals` projection must recognize the new command. If a goal directive cannot be persisted/recovered, the private-chat route fails rather than telling the user it succeeded.
7. The next Reality Cognition turn loads this authorized active goal before generation, and the assistant proposal boundary uses its goal source rather than promoting a reviewer's inferred objective to authority. Private chat displays the pinned objective separately from provisional conversational focus.

## Invariants

- **Model suggestion ≠ user goal command**. Any assistant-generated alternative remains a proposal; it never writes `AUTHORIZED_USER_GOAL_DIRECTIVE` or `AUTHORITATIVE_USER_GOAL_TRANSITION`.
- **Changing conversational focus ≠ authorizing business action**. Sending emails, publishing, charging, ordering, executing code, changing production, or declaring outcomes done still requires distinct verified authority and outcome evidence.
- **User topic changes remain natural**. The current user request can authorize a harmless temporary conversation detour without forcing a permanent rewrite of an earlier pinned, ongoing objective.
- **No silent loss of historical goals**. Source-linked earlier goals remain in existing Continuity. `SET_ACTIVE` and `START_DETOUR` are the only newly exposed UI operations; completion, abandon, pausing and resumption must be wired via similarly verified explicit user actions, never inference.
- **No false assurance**. The latest goal relation carries a user source, but the LLM may still miss semantic drift in its prose. The active-goal state machine prevents unauthorized *state mutation*, not every bad answer.

## Important remaining implementation and security work

- **Concurrency and atomicity**: Existing Supabase persistence uses read-before-write, not an independently proven atomic compare-and-swap on active-goal hash. Two simultaneous goal-command requests need a transactional/unique commit mechanism and a stale-state rejection path before consequential irreversible transitions are enabled. The reducer explicitly discloses `atomic_compare_and_swap_proven:false`.
- **Coverage**: The user goal command UI currently exposes `SET_ACTIVE` and `START_DETOUR`; a source-bound confirmation/select experience for RESUME, PAUSE, COMPLETE/ABANDON is pending.
- **Semantics**: A user-pinned message is an authoritative *user-authored objective string*, not independently verified semantic meaning or a completed business task. A model can still misunderstand the current goal. The project needs stable semantic subgoal identity, active obligations, and meaning-aware prepublication trajectory reconciliation.
- **Privacy and scope**: This pathway is restricted to authenticated isolated Preview chat and its existing RLS-backed project; no new tables or production migrations were made.
- **Verification hold**: Code has been written and inspected, not run as a new test. Do not claim live reliability, green checks, valid auth issuance under real accounts, or drift reduction. Ask founder before resuming any tests.

## Change locations

- `src/reality-authoritative-user-goal-ledger-v0.1.js` — existing reducer; signed server issuer evidence and strict source digest checking.
- `api/reality/personal-chat.js` — explicit authenticated user-command ingress and durable readback before Cognition.
- `index.html` — user intent selector and distinct pinned goal status.
- `src/reality-live-intelligence-orchestration-v0.1.js` — exposes authoritative user-pinned goal source separately from provisional reviewer trajectory (pre-existing read path preserved).
- `src/reality-goal-execution-boundary-v0.1.js` — existing generic execution route blocks direct writes to Continuity and goal state (unchanged).

**No new standalone goal truth store, model-only authority pathway, or post-turn guardrail was created.**
