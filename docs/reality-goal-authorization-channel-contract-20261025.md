# Reality's authenticated goal-transition channel — implementation contract

**Status:** proposed implementation contract for draft PR #140, 2026-10-25. **Not deployed, not yet coded as a granting endpoint, not tested.** The founder's no-more-tests hold remains in effect. No new Supabase goal tables and no customer/production mutations.

## Decision: build authenticated authorization boundary before tweaking the drift streak counter

Actual source inspection at PR #140:

- `src/reality-goal-authority-contracts-v0.1.js` already constructs `GoalState`, `GoalTransition` and `AssistantProposal` **candidates** and fails closed on all untrusted goal mutations. `src/reality-goal-governance-contract-v0.1.js` correctly has no route to `GRANTED`.
- `src/reality-user-goal-continuity-state-v0.1.js` replays original and provisional active/paused user goals from the existing append-only Continuity.
- `api/reality/personal-chat.js` has `authenticatedChatSession`, `assertSameOrigin`, a server-scoped user/conversation ID, and a preview-isolated Supabase boundary.
- **Do not reuse `api/reality/authority.js` as proof of a goal-change approval.** That route uses `getOrCreateSessionPrincipal` and saves general action policy; it is not the dedicated, source/goal/hash-bound confirmation mechanism described here.
- `src/reality-universe-postgres-persistence-v0.1.js` performs read-before-write and checks event IDs and ledger tails. This by itself is **not** an atomic compare-and-append guarantee against two concurrent confirmations. No such security property should be claimed until the storage operation is made transactional/unique.

## Two kinds of change (avoid excessive clicks)

**Ordinary user conversational steering:** A newly authenticated user turn can authorize a low-risk working-focus change or short detour in conversation. The Signal Cleaner and Continuity project it as source evidence. If its target is ambiguous, ask a normal clarification. Do not require a cryptographic approval button for every harmless topic change.

**Durable/consequential goal mutation:** Explicitly replacing, abandoning or permanently superseding a governed objective, removing a locked user instruction, modifying an automated workflow's governing intent, or granting an enduring agent goal **requires dedicated approval**. It never grants connector execution; execution has a separate approval boundary.

## Immutable contract (types shown for design; no new tables)

```typescript
type GoalMutation = 'REPLACE' | 'ABANDON' | 'COMPLETE_INTENT' | 'LOCK_CONSTRAINT';
type GoalAuthorizationStatus =
  | 'PROPOSED_UNAUTHORIZED' | 'PENDING_EXPLICIT_USER_APPROVAL'
  | 'GRANTED' | 'DECLINED' | 'EXPIRED' | 'STALE_SCOPE' | 'UNRESOLVED';

interface GoalAuthorizationChallenge {
  version: 'reality-goal-authorization-v0.1';
  challenge_id: string; // cryptographically random, high-entropy, one-use
  proposal_receipt_id: string; // append-only blocked AssistantProposal receipt
  canonical_frame_receipt_id: string;
  source_frame_hash: string;
  goal_id: string;
  old_goal_state_hash: string;
  proposed_new_goal_hash: string;
  proposed_new_goal_text: string; // shown to user unambiguously
  operation: GoalMutation;
  world_id: string;
  continuity_root_id: string;
  conversation_id: string;
  subject_user_id: string; // derived from verified server session only
  issued_at: string;
  expires_at: string; // short-lived
  key_id: string; // server-side signing-key identifier
  server_mac: string; // authenticates challenge contents, NOT user intent
  status: 'PENDING_EXPLICIT_USER_APPROVAL';
}
interface GoalAuthorizationReceipt {
  version: 'reality-goal-authorization-v0.1';
  receipt_id: string;
  challenge_id: string;
  subject_user_id: string;
  authenticated_session_evidence_ref: string;
  user_action: 'APPROVE' | 'DECLINE';
  confirmed_goal_id: string;
  confirmed_goal_state_hash: string;
  confirmed_new_goal_hash: string;
  confirmed_operation: GoalMutation;
  continuity_root_id: string;
  world_id: string;
  observed_at: string;
  status: 'GRANTED' | 'DECLINED';
  grants_external_execution: false;
}
```

### Endpoint: `POST /api/reality/goal-authorize` — not yet implemented

A two-stage operation on the *same dedicated route* with an authenticated Supabase session. Both requests enforce same-origin, content type, CSRF protection, exact user/world/conversation scope, rate limits and no-store. Do not accept user ID, hashes or grants directly from JSON body.

1. **Issue** `{ "operation": "ISSUE", "proposal_receipt_id": "..." }`: read the blocked proposal and canonical-frame receipt from server-side Continuity; verify chain, scope, exact target goal and fully recorded proposed mutation; compare with current authoritative goal projection; generate server-side challenge with expiry, nonce and MAC; append a pending challenge to **existing** Continuity and verify readback. Return only a display-safe summary, challenge ID, hashes and expiry; never return the secret MAC key. If the original proposal cannot be reconstructed, fail closed.
2. **Approve/decline** `{ "operation": "APPROVE" | "DECLINE", "challenge_id": "..." }`: refresh and independently verify `authenticatedChatSession`; read immutable challenge server-side; verify MAC, expiry, current user, root/world/conversation, old-goal hash and proposal-receipt binding. Check for any approved or conflicting transition since issue. **Append a one-use receipt with an atomic uniqueness and expected-state condition** on existing Continuity storage. If this atomic operation is not available, return `503 AUTHORIZATION_ATOMIC_COMMIT_UNAVAILABLE` and grant nothing. A server-only HMAC is not evidence of the user's click: the authenticated user session + explicit UI interaction is the authorization event.
3. **Readback before applying**: The goal reducer recognizes only a GRANTED receipt produced by this dedicated handler, with valid authorization lineage and current state hash. The model's own `authorization_state`, prior reviewer classification or a normal assistant reply can **never** produce one. If the state changed concurrently, mark `STALE_SCOPE` and ask for a new confirmation.
4. **No action permission transfer**: A GRANTED goal revision updates only the allowed goal relationship. It does not authorize emailing, purchases, estimate sends, deploying code, changes to billing or any other connector operation. Those remain separately governed and outcome-reconciled.

### UI behavior

- Display **Original user-owned goal** → **Assistant proposed change** → **Proposed scope/duration and affected constraints** → explicit **Approve goal change** / **Keep current goal**.
- Explain the effect on active and paused goals. Never imply a proposed change was approved because the assistant recommended it.
- An ambiguous “go back” with multiple plausible goals should show the candidate goal choices or ask a direct clarification. **Block uncertain goal mutation**, not the ability to have a safe conversation or ask questions.
- Show receipts and permission status in Reality's existing conversation/Continuity view. Keep raw source and counterfactual candidate, but do not duplicate the source of truth.

## Why this precedes the "Goal Deflection Vector"

The drift streak counter currently measures reviewer *candidates*, which can miss semantic objective displacement and can falsely flag legitimate detours. Giving that counter a stronger output disposition before authentic goal authority exists would only increase confidence in a potentially wrong target. First complete the user-authorized lifecycle contract; then calculate a semantic trajectory of assistant proposals against the **currently authorized** user goal graph, with a separate obligation/constraint matrix and explicit unknown/false-positive status.

**Important:** authorization security and drift *detection recall* are separate claims. A correct warrant mechanism prevents unauthorized goal **state mutation**; it does not guarantee that the semantic reviewer catches every implicit drift in the text it releases, or eliminate model hallucinations.

## Release gates (no tests authorized yet)

- Implement server-only issue/approve/decline with verified identity and CSRF, short expiry, replay protection and atomic append.
- Enforce one-use transition and current state hash at reducer; prove duplicate/concurrent requests cannot both grant.
- Establish source-linked object/constraint identity for completion, pivot and permanent abandonment.
- Make ordinary user detours remain fluid and safe; independent action authority stays unaffected.
- Only after implementation is structurally complete, ask the founder before resuming the paused 50-turn or other benchmarks.

**No production deployment, SQL migration, model call, benchmark, or live user authorization has been attempted by this document.**
