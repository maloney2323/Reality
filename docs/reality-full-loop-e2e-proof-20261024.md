# Reality Full Loop — executable sandbox proof

Date: 2026-10-24
Scope: draft PR #124 / isolated Preview only. **Do not represent this as verified production autonomous action or a paying customer's result.**

## The test that failed previously
Earlier closed-loop runtime tests supplied preconstructed adapter receipts claiming successful independent verification, learning and state updates. Those were useful state-machine contract tests but did not independently reconstruct an outcome or retry the same work item after a blocked attempt.

## Executed new cross-component proof
The composed runner `src/reality-full-loop-sandbox-proof-v0.1.js` uses Reality's *existing* foundation:
- `reality-work-discovery-foundation-v1.0.js` identifies an unprompted recurring work item from synthetic observations, qualifies its evidence and fixes the original work ID.
- `reality-sandbox-governed-work-world-v0.1.js` rejects an attempt to perform the task without exact authority.
- `reality-autonomous-capability-loop-v1.0.js` confirms that the missing sandbox writer capability is relevant to that same work, sets up an ephemeral experiment, and validates the *existing* sandbox writer by running its preflight in a separate sandbox with read-back. **No AI-generated code** was acquired or merged.
- The test issues **synthetic, same-principal sandbox-only** authorization. It does not authorize any real owner action, email, purchase, schedule, deployment, or customer communication.
- `reality-closed-loop-runtime-v0.1.js` then prepares the exact scoped action, retries the same original work task, receives a real in-process sandbox execution/outcome/reconciliation event, and uses `store.reconstruct()` to independently re-derive the task's final state.
- Only when the event ID, operation ID, reconstructed task state, receipt chain and reconciliation all agree does the ephemeral Universe projection advance, the learning receipt become eligible, and a successor cognition state resume.

## Evidence generated in GitHub CI
[Continuous Reliability run #40138194245](https://github.com/maloney2323/Reality/actions/runs/40138194245): 63/63 passed. Positive outcome `CLOSED_LOOP_VERIFIED_SANDBOX`, seven hash-linked stages:
1. WORK_DISCOVERED
2. ORIGINAL_WORK_BLOCKED
3. CAPABILITY_GAP_CONFIRMED
4. SANDBOX_CAPABILITY_VERIFIED
5. ORIGINAL_WORK_RETRIED
6. INDEPENDENT_SANDBOX_RECONSTRUCTION
7. CONTINUED_FROM_VERIFIED_UNIVERSE

Negative controls also passed: no approval returns `AWAITING_OWNER_APPROVAL`; missing independent readback returns `BLOCKED_UNVERIFIED` and never advances Universe/cognition; tampered receipts fail integrity checking.
[Updated Preview-route regression suite](https://github.com/maloney2323/Reality/actions/runs/40138404922) included positive, unapproved, verification failure, wrong branch, production denial and malformed requests. CI gate passed.

## Preview UI
`/full-loop-proof.html` on isolated Preview. Three buttons:
- Run full recovery loop
- Withhold authorization
- Force verification failure

The route is Preview branch-only, POST-only, in-memory sandbox-only, and has no external business effects or paid model calls. It does not expose external secrets.

## What remains unproven
- Authentic independent external connector/source evidence, beyond independent reconstruction of the *same sandbox ledger*.
- Actual missing code synthesized, tested, and merged as an eligible capability; sandbox capability used an *already implemented* tested adapter.
- Durable cross-request persistence for the entire end-to-end objective state (earlier isolated Vercel/Supabase test proved 2-turn ledger persistence separately).
- A real failing GitHub issue/PR or Juan's real construction work recovered, with read-back from the external provider.
- Corrected drift/hallucination claim fed into actual later turn with zero regressions, independently labeled by a separate assessor.
- Human minutes saved and net operational ROI in Reality or Juan's business.

**Next acceptance gate:** choose one bounded, externally observable Reality engineering work item: discover it from actual GitHub CI; snapshot failure+evidence; propose a patch on an isolated branch; run frozen regression + CI; verify changed file and observed test via independent GitHub readback; require owner approval to merge/execute; retry the original operation and compare original failure with new independently verified outcome. Do not promote production changes until approved. Then apply the identical authority/readback cycle to Juan's six construction work categories with real authorized business data.
