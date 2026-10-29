# Reality goal-state authority — existing runtime boundary

**Status:** experimental draft PR #140; not merged, not deployed to production; no paid benchmark/model runs and no new tests manually invoked.

## Existing contracts, rather than extra database tables

Reality already has partial projections of the user's objective and lifecycle in the append-only Continuity state:
- `src/reality-user-goal-continuity-state-v0.1.js`: preserves source-linked user goal evidence, detours, dormant goals and provisional lifecycle review, without granting authorizations.
- `src/reality-goal-authority-contracts-v0.1.js`: `projectGoalStateContract`, `projectGoalTransitionContract`, `projectAssistantGoalProposal`, `enforceGoalTransitionBoundary`; these explicitly keep assistant proposals unauthorized.
- `src/reality-goal-governance-contract-v0.1.js`: frame-hash-bound goal transition and proposed mutation contracts. All authorization claims are provisional or unauthorized until a *separately verified* user-authorization mechanism exists.
- `src/reality-live-intelligence-orchestration-v0.1.js`: existing prepublication review, limited repair, and proposal-blocking. A semantic reviewer is a fallible candidate judge, not authority, and cannot prove user intent by itself.

**Do not create a new independent goal truth store or normalize every conversational intent into a completed/authorized database transition.** The current source-backed Continuity ledger remains the canonical history. A SQL projection or cached state view might be appropriate later, once lifecycle authority and bitemporal scope are defined.

## Added this pass: independent external execution path

Previously, `api/reality/execute.js` could receive work items independently of the live chat's goal proposal boundary. Its normal authority policy and server connectors were separate from the conversation path. A generic Supabase connector could potentially be directed at the existing Continuity `universe_events` table.

Added `src/reality-goal-execution-boundary-v0.1.js`, invoked in BOTH:
1. `api/reality/execute.js`, **before** session authority lookup/auto-authorization and connector invocation; and
2. `src/reality-governed-execution-engine-v0.1.js`, immediately before its ordinary `canExecute` and independent connector path (prevents an alternate internal caller bypassing the API check).

The deterministic boundary checks structured goal mutation/transition contracts and assistant goal proposals anywhere in the work item/authorization object. It does not inspect ordinary conversational prose with brittle keyword scanning. Structured goal state mutation fields are rejected even if the client sets `authorized:true` or a scope matches a customer's auto-authority policy.

For a `supabase` insert/update/delete work item, the boundary also refuses write access through the *generic* connector to canonical Continuity, Universe, goal-state, transition and authority-policy tables. Those stores should be mutated only through separately verified Reality-native ledger/authority paths. The boundary rejects ambiguous or malformed Supabase write targets, deep/unscannable structured payloads and direct typed goal authorization artifacts.

The returned result is `BLOCKED`, with a reason and **no execution or outcome**. Normal non-goal work items still require their pre-existing, independent action authorization and connector readback. Passing the goal boundary **does not authorize executing anything**.

## Security distinctions and remaining work

- **This is a structural execution fence, not universal semantic drift prevention.** A model can still suggest a bad strategy in natural language if the fallible semantic reviewer misses it. That separate meaning-aware prepublication and long-term goal reconciliation work is unfinished.
- **No verified user-goal transition authorization issuer exists yet.** Until one can authenticate the actual user, bind an exact source turn/goal/mutation to the Continuity frame, check scope and anti-replay, and independently attest it, typed goal-state changes remain blocked. A text field saying `approved` is not proof.
- **Connector authorization is a separate risk surface.** Other privileged execution capabilities should be reviewed for resource scoping and validated server-side authentication. This patch restricts goal-state mutation; it is not a claim of cryptographic execution-proofing or legal SLAs.
- **No universal outcome verifier exists for all connectors.** A connector response is not proof a business action completed.
- **No synthetic SQL migrations were deployed.** Any future database schema should use an isolated migration and security review of RLS and service-account separation. Do not expose direct goal-state writes to browser clients.
- **No benchmark resumed or tests run at founder request.** Implementation requires later static review and testing before production merge. All old reliability improvement figures remain unproven.

**Invariant:** Assistant proposal ≠ user-origin goal transition ≠ independent execution authorization ≠ verified external outcome.
