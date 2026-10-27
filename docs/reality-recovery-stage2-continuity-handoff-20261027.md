# Reality Recovery Loop — Stage 2 Continuity Handoff (draft)

Date: October 27, 2026. Scope: PR #144, branch `fix/recovery-loop-v1-linkage-and-resumption-20261027`. NOT a production deployment or proof of autonomous code repair.

## What is now connected

- Existing `reality-autonomous-capability-loop-v1.0.js` and `reality-autonomous-closure-orchestrator-v1.0.js` have repaired module exports. Sandbox authorization is distinct from promotion authorization, and an adapter-declared merge is not the original job's completion.
- New `reality-personal-recovery-checkpoint-v0.1.js` rehydrates the **existing** authenticated personal Continuity worldline, validates the hash-linked handoff and separately verified outcome of an original `work:<hash>`, and optionally records a durable blocked-original-work checkpoint.
- The checkpoint is appended to the existing `universe_events` history using canonical Spine UUID mapping, verified tail lineage, deterministic event identity, and post-write full-history readback. A duplicate check is idempotent. On conflict, storage loss, changed goal, missing source, unknown provider outcome, or tampered chain, fail closed.
- New preview-only `api/reality/personal-recovery.js`: authenticated GET reads the existing checkpoint; same-origin POST with exactly `intent`, `conversation_id`, and `work_id` stores a **non-authorizing** checkpoint. No arbitrary work or authority may be supplied by the browser.
- The Work Center's verified tracking-issue receipt now offers **Record original job for recovery**. It displays the durable checkpoint receipt and original work identity. It does NOT retry the already-created GitHub issue, dispatch a model, create a pull request, or deploy an upgrade.

## What is intentionally NOT established

A verified GitHub tracking issue does not prove a repaired workflow or a missing capability. The blocker remains `CAPABILITY_GAP_NOT_YET_PROVEN`; the repair remains `BLOCKED_UNFINISHED`. No external action authorization is minted by this checkpoint. The v1 orchestrator returns `REACTIVATION_READY`, not a completed job. A server-backed, independently verified capability registration and a separately authorized code-repair / PR operation are still needed before the **same original work** can be resumed through the governed executor. The legacy `/api/reality/self-build` write route remains disabled.

## Acceptance proof before live claims

1. No-cost tests pass: source-bound checkpoint, idempotent readback, scope/goal mismatch denial, rejection of tampered outcomes, canonical lineage, and UI/route denial of arbitrary writes.
2. From a signed-in preview, use an actual already-verified work ID such as the one underlying issue #143. Test GET, POST, fresh GET and cross-request receipt persistence on the isolated authorized user's Continuity worldline. Do **not** repeat issue creation.
3. Only once the exact authenticated repair bridge, isolated CI regression and independent PR readback exist: confirm an upgrade after separate owner approval, register the capability with verified source receipts, and resume the *same* work ID under a new bounded action policy and single-use reservation.
4. Verify the original failure's successful repaired outcome; otherwise retain `UNRESOLVED` and display an honest final receipt. Only then calculate measured ROI.

No benchmark OpenAI calls, connector POSTs, background automation, database schema changes, merge, or production deploy are required by this PR. All automatic tests operate on in-memory fixtures.
