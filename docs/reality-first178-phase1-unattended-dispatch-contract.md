# Reality #178 — Phase 1 trusted server dispatch (isolated preview)

## Frozen scope
- Exact original work: `work:9b9578b3c65427589c4c6da68fe0fc87`
- Existing owner authorization and constitutional checkpoint; no new job
- Never install candidate source, settle original job, change production, or infer Approval 1/2
- One background delegation per queue; nonce hashed in internal DB, consumed only by service role

## Data and control path
```
Trusted preview-only server webhook / platform cron (authenticated)
 -> api/reality/personal-first-upgrade-178-dispatch.js
 -> reality_mint_first178_background_handoff_v1()  [Postgres, service_role]
 -> runOriginal178DelegatedWorker()                  [same Vercel process]
 -> reality_consume_first178_background_handoff_v1() [Postgres, single-use]
 -> runFirst178SingleAction()
 -> original constitutional runner; independent sandbox results
 -> AWAITING_OWNER_APPROVAL or preserved ESCALATED state
```

The existing background worker no longer requires an HTTP self-call through
Vercel Deployment Protection. A rejected/ambiguous dispatch is *not* retried
automatically, because it may already have consumed a single-use claim.
Manual operator intervention is limited to inspecting receipts; never
duplicate the original work.

## Preview scheduling caveat — read before declaring Phase 1 operational
Vercel's `vercel.json` cron schedules are run **only on Production
deployments**, not Preview. This isolated branch intentionally blocks
production execution. The cron declaration is a routing contract and CI
artifact, **not evidence that unattended preview execution has occurred**.

Actual unattended execution in Preview still requires a trusted external
scheduler capable of calling the protected Preview URL with the
branch-scoped, encrypted `REALITY_FIRST178_DISPATCH_SECRET`, **and** a
Vercel-approved protected-deployment access method. Do not disable Vercel
Deployment Protection or treat a shareable link as the job authority. The
webhook cannot rely on browser cookies, query-string secrets, or a spoofable
cron user-agent. Any scheduler must invoke the exact POST route with no
work-selection or approval fields.

The `GET` handler accepts `CRON_SECRET` but fails closed outside Preview.
Deploying a different branch or production cannot execute #178.
A live test must prove a one-use database reservation was minted and consumed,
the exact original journal advanced, and no production write/installation
was granted before calling this handoff operational.

## UI and remaining gates
Opening or refreshing the #178 Work Center is read-only. The explicit
*Approve verified upgrade* button (Approval 1) is separate from dispatch.
A future **Accept independently verified completion receipt** action
(Approval 2) remains Phase 3 and is not implemented by this change.

## Acceptance
1. Provider scope and original owner/goal/claim independently reverified.
2. Two concurrent dispatch calls cannot mint more than one delegation.
3. No browser session, wrong branch, wrong origin, absent/mismatched secret,
   forged work target, or model text can dispatch.
4. Original seven-failure checkpoint preserved.
5. Candidate generation and independent sandbox drive must stop at genuine
   owner installation approval or evidenced escalation.
6. No upgrade installation, final settlement, or Approval 2 is silently inferred.
