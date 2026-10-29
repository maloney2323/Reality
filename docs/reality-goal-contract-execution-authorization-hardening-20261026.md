# Reality: Goal contract → execution boundary hardening

Date: October 26, 2026. **Draft PR #140 ONLY**. No production merge, deployment, new Supabase tables, paid LLM calls or manually invoked benchmarks/tests.

## Why this work (and why no new Supabase GoalState tables)

Reality's current draft already includes source-linked authoritative user goal commands, a provisional Goal State / Transition / Assistant Proposal contract, original-versus-final semantic direction review, Continuity evidence receipts, and a generic execution boundary. Adding another independent database of goal truth would risk divergent truth sources.

The remaining execution seam was a separate, practical authorization weakness:

1. The governed work runtime could treat `consequential:false` / `operation:create_deployment` as nonconsequential because it relied on the work item's self-declared `consequential` flag or a list that did not include connector-specific write operations.
2. The HTTP `execute` endpoint used to accept a caller-supplied JSON `authorization` with `authorized:true`. It was not cryptographically tied to a persisted user approval in that route.
3. An approval scope with only the work item ID, connector and operation could be reused with changed inputs, such as a different target repository, deployment payload or database mutation.
4. The generic execution engine is exported for internal callers. Securing only the HTTP endpoint would not protect internal invocations.

## Implemented in the EXISTING Node runtime

- `src/reality-governed-work-runtime-v0.1.js`: server derives consequentiality from the actual connector write operations (GitHub `create_issue`, Vercel `create_deployment`, Supabase `insert/update/delete`). It never lets `consequential:false` bypass approval on a real connector write, and rejects unsupported connector operations rather than treating them as safe internal work.
- `src/reality-goal-execution-boundary-v0.1.js`: uses the same classification before policy lookup or provider interaction and retains hard denial of direct goal/Continuity/claim-ledger mutations via generic Supabase writes.
- `src/reality-authority-v1.0.js`: a persisted auto-authorization policy must include a **specific work_item_id and SHA-256 fingerprint** over its workflow, connector, operation, inputs, resource, consequential flag and work-item action. Caller input cannot change target while reusing approval. New `issueBoundExecutionApproval` and `verifyBoundExecutionApproval` HMAC-bind exact work and authorization to the existing server-side `REALITY_CHAT_RECEIPT_HMAC_KEY`, with a **60-second maximum** expiry.
- `api/reality/authority.js`: exact-work auto policies derive their scope/fingerprint from the user-presented `work_item` on the server; generic client-provided `scopes` do not get applied to automatic writes.
- `api/reality/execute.js`: declines raw client JSON authorization objects; loads the existing persisted user's policy, derives the grant on the server, issues the short-lived proof, and passes it to the work engine.
- `src/reality-governed-execution-engine-v0.1.js`: enforces the HMAC proof before invoking any actual connector write, including internal callers which bypass HTTP.

**No GoalState/GoalTransition table migrations**: the authoritative user-goal ledger remains the existing append-only Continuity source. Assistant suggestions remain proposals and cannot mutate it. This patch closes a *provider-action authorization* seam; it does not by itself prove Reality detects every semantic goal deviation.

## Deliberate fail-closed compatibility change

- Existing un-fingerprinted or broad automatic-authority policies do **not** qualify for new connector writes. A user must reapprove each exact intended work item.
- Client-supplied explicit authorization objects will be blocked until a separate persisted, verified manual-grant flow exists; client JSON alone is insufficient proof.
- Generic connector execution does not automatically inherit conversational goal alignment from a chat response. Linking each work item to the controlling user goal/turn and checking goal state at execution time is still needed.
- The HMAC proof is short-lived, but not a one-time, database-atomic nonce: preventing provider retries/replays requires a separate durable idempotency/execution lease.
- This is a *source authorization* boundary, not proof that the authorized operation is safe, that the user approved a novel goal, or that external effects were independently verified.

## Verification status

**NOT TESTED IN THIS PASS.** The founder requested a stop to further tests until foundational drift detection is architecturally complete. No local tests, benchmark harnesses, paid live model calls, or production deployments were invoked. Existing CI workflows may independently react to repository commits; that is not evidence of validated behavior.

Next architectural work should bind connector work proposals to the **current verified user-goal ID**, with a fresh state read at the execution boundary. That must preserve the distinction between optional advice, a new user-authorized direction, and an external action requiring a separate scoped grant.

The PR must remain draft; do not claim this closes all authorization or drift failure modes.
