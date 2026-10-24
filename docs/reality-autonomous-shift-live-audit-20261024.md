# Reality autonomous shift — observed-runtime handoff audit and guarded repair

Date: October 24, 2026

## What is proven

- Vercel production alias `reality-blond.vercel.app` currently serves commit `af3a6a5f534591ffe26eee16eb31d70db4620179` from `feat/continuity-spine-v2`. The default GitHub branch `main` is different. This patch branches from the **actual production source branch**; it does not silently merge into main or change production.
- Production-source `vercel.json` defines `/api/reality/shift` every 15 minutes and hourly stewardship, but a schedule definition is not evidence that it fired.
- The connected Supabase `reality-universe` project had **11 total** rows in `public.universe_events`: **3 shift configuration rows**, **0 shift ticks**, **0 shift results**, **0 shadow activity observations**, and **0 recurring-work candidates** at audit time.
- Latest saved shift config was **enabled** as of October 18, 2026: readiness **16:30 ET**, start **17:00 ET**, eight-hour shift.
- The connected Vercel environment listing showed `CRON_SECRET` for **preview**, but did not show a corresponding **production** `CRON_SECRET`. The actual secret values were neither queried nor exposed.
- No recent production runtime error cluster was returned for the relevant routes; **absence of errors is not proof that cron ran**. A per-route log lookup showed no relevant records.
- Base44's historical autonomous work-cycle receipts exist, but they **do not prove** this newer Vercel scheduled shift is running.
- The Vercel-shipped Home HTML displayed persisted shifts only when the user explicitly clicked "Find work"; that button called read-only GitHub stewardship instead of reconstructing the autonomous shift result stream.

## Root cause(s) found in source

1. `api/reality/shift.js` originally passed `systemContext: JSON.stringify(...)` into `runLiveIntelligenceOrchestration`. The native Universe context reader explicitly treats non-object system contexts as empty. This discards structured discovery context, even if the LLM later reasons over the mission text.
2. The shift trigger previously accepted **any** request beginning with `Authorization: Bearer ` or with a spoofable `vercel-cron/` user agent. That was insufficient authorization for initiating model calls.
3. The shift only entered readiness/start on the exact configured minute; timing jitter could silently skip a phase, especially for non-quarter-hour settings.
4. There was no read-only persisted `shift_result` projection into the deployed Home work UI. Its static work queue started at zero until a button-triggered separate stewardship GET.

## Patch implemented and CI verified

- `src/reality-autonomous-shift-control-v1.0.js`: strict constant-time matching against at least 32-character production `CRON_SECRET`, 15-minute normalized slots, explicit owner-scoped read-only projection of persisted `shift_result` records with work items marked **DISCOVERED**, never executed or verified just by a saved result.
- `api/reality/shift.js`: structured `systemContext` and connected world observations; secured cron-only branch; read-only GET returns `home` to the exact signed session principal matching the persisted shift configuration.
- `index.html`: reads saved shift discovery automatically on load and every five minutes, separate from manual "Find work" functionality; reflects actual server-saved shift times; does not call execution routes from automatic refresh.
- `test/reality-autonomous-shift-handoff-v1.0.test.js`: ten checks for secret identity/forgery, scheduling delay, off-slot configurations, disabled schedule, scope and ownership, deduplication, correct Home portrayal, actual structured context wiring, and zero automatic work-authority issuance.
- Existing recurring-work scorer test had a stale numerical expectation: two recurrences out of five contribute 40 **priority points**, not 20. The test expectation was corrected to the actual defined formula without fabricating dollars or changing ranking behavior.
- [Zero-cost GitHub CI](https://github.com/maloney2323/Reality/actions/runs/40101211963): **16 of 16 tests pass** (10 new + 6 regression). No paid provider calls, database writes, production routes triggered, or business actions.

## Remaining live promotion blockers

1. Provision `CRON_SECRET` as a secure **production** environment variable and redeploy from the correct source branch. The new security logic deliberately fails closed without it.
2. Confirm Vercel cron service actually sends an authenticated request on the 15-minute schedule; capture its production request ID/status without exposing the secret.
3. Confirm the selected production Supabase project and `SUPABASE_URL`/service-role configuration match the audited `reality-universe` project; audit did not decrypt production secret values.
4. Confirm a real shift invocation writes `shift_tick`, emits a nonempty eligible `shift_result` payload, and reads the exact row back. Avoid attributing general model "answer" to autonomous discovery without evidence.
5. Confirm that the signed session principal used for Home matches the one that saved the shift config. Cross-device sign-in and durable account-identity mapping remain future product work.
6. Verify the shift result and attendance receipts appear in Home without prompting, no false "completed" status, and no unauthorized external tool effects.
7. Current shift discovers/prioritizes work but calls LLM cognition and creates proposals only; **actual independent execution and verified external business outcomes are not yet demonstrated** by this repair.
8. The current scheduler has a single shared shift config, not a customer-isolated multitenant schedule. It must not be sold as per-customer autonomous work until account and tenancy boundaries are implemented.

## Scope and truthfulness

This draft is a code and regression-test repair, NOT proof of a **fresh, unattended production autonomous cycle**. It is not deployed. Production remains unchanged. The current completed shift count in the connected audited Universe table remains zero until independent runtime observations show otherwise.
