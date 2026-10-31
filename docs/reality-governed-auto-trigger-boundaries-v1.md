# Reality governed auto-trigger boundaries — v1 (isolated preview)

A trigger wakes work. It never grants an owner permission, changes the active
goal, fabricates evidence, or claims an execution outcome.

## Current authorized execution path

1. **Evidence observed / gap confirmed:** a trusted original work event and
   current owner goal are required. Automated discovery and bounded proposal
   generation may proceed only within existing authorized investigation scope.
2. **Candidate sandbox verified:** independent original frozen tests and
   source/provenance readback are required. Stop at review; never install by inference.
3. **Exact owner installation approval:** save a one-use, exact original work ID,
   goal epoch, candidate hash and checkpoint. Then enqueue a durable worker wake.
4. **Wake-up:** prefer an authenticated GitHub dispatch if the already-scoped
   credential independently verifies access to the isolated worker branch. Keep
   signed OIDC GitHub scheduled polling as a fallback. A successful push CI check
   does not prove the scheduled poller is alive.
5. **Worker lease:** an authenticated worker must atomically consume the existing
   reservation for the same original work, exact candidate and approved branch.
   A wake request, scheduled tick, model output or assistant message is not a grant.
6. **Installed acceptance:** independently verify exact installed bytes and original
   frozen GitHub Actions acceptance before registry activation.
7. **Resume original job / settle:** re-run the same original work, record its real
   execution outcome and a separate constitutional settlement receipt; never
   substitute a new job or close the issue on an unverified result.
8. **Interruption:** reconcile exact existing receipts and lease status, not a new
   approval. Fail closed on ambiguous provider writes, stale goal, replay, budget
   exhaustion or unavailable credentials.

## Reuse across other workers

Eligible future wake sources: newly verified capability gap, new owner-approved
automation shift, installed capability awaiting original-job continuation,
verified outcome awaiting final settlement, scheduled follow-up of incomplete
authorized work. Every source requires its own persisted readiness record and
execution lease tied to that authorized goal.

**Never automatically trigger:** installation without owner approval; payment,
publishing or external customer communication without matching permission;
production changes from an isolated-preview grant; indefinite retries or model-
self-certified success.

## Live proof boundary, October 31 2026

Original GitHub issue #178 retains its existing original work ID and an owner-
authorized continuation in Supabase, but the worker has not leased it yet.
This draft changes preview code only; it is neither deployed to the customer's
current preview nor a proof of autonomous scheduled execution. Confirm a
real GitHub `schedule` run and a worker lease, followed by installed acceptance,
original-job resumption and independently read settlement before declaring
`LOOP COMPLETE`.
