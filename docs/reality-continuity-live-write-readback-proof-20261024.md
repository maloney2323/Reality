# Reality: isolated live cross-request continuity proof (2026-10-24)

## Result: PASS for durable storage and cross-request reconstruction
**Environment:** Vercel Preview branch `feature/reality-drift-live-continuity-v1-20261024` to isolated benchmark Supabase project `hvkfreoagbrphwghjajw`. No production release or customer-world action.

1. Connected Supabase wrote an explicitly synthetic storage canary; a separate SQL read retrieved the exact identifier and scope.
2. Vercel Preview's existing server credential independently read the canary and Reality's `createUniversePostgresPersistence().reconstruct()` recovered it.
3. In a temporary bounded Preview-only test, Reality's actual `startContinuityRuntime` and `runContinuousReliabilityCycle` persisted a synthetic chain across **two separate requests**:
   - First turn: RAW_SIGNAL, TRANSFORMATION, OBSERVATION, VERIFICATION (4 recorded events).
   - Second turn reloaded all four records, appended the next four and independently re-read the complete 8-event chain.
   - Phase two response: `PERSISTED_AND_INDEPENDENTLY_RECONSTRUCTED`, `prior_event_count=4`, `total_events=8`, `raw_turns=2`, `readback_verified=true`.
   - First turn's response was initially blocked by JSONB key-order comparison even though the event was durably written. After correction, the first receipt independently read back successfully.
4. Last tested GitHub CI: continuity, continuous reliability, model gateway and live orchestration workflows **PASS** on cleanup commit `17b1cf5c92e071a532904aef0e0f54842f64c166`.

## Real defects discovered and corrected
- **PostgreSQL timestamp normalization:** `timestamptz` round-tripping changes wire notation without changing an instant. Hash verifier now recognizes equivalent ISO representations rather than false-failing.
- **Cross-world event ID collision:** two identical packet IDs could produce the same global event identifier under different continuity roots. RAW_SIGNAL, TRANSFORMATION, OBSERVATION and reliability receipt event IDs are now scope-derived from root and worldline. Regression added.
- **JSONB object-key ordering:** persisted receipt equality now compares canonicalized content, not raw `JSON.stringify()` insertion order. Regression added.
- The code fails closed for genuine payload tampering, forks, and scope mismatches.

## Deliberate limitations
- All benchmark inputs in this storage test were **synthetic**; no paid LLM request or externally consequential operation was performed.
- Outputs were intentionally marked `NOT_EVALUATED`. This is not proof that Reality catches or corrects live-model drift or hallucinations.
- No live drift %, hallucination %, verified correction rate, or relative benefit can be inferred.
- The benchmark database contains synthetic proof rows, including an incomplete diagnostic root from the earliest pre-fix attempt. These rows must be excluded from scored benchmarks by their separate root/fixture scope.
- A temporary, bounded Preview write endpoint was used and then deleted from the current PR branch; the branch-specific test flag was changed to `false`. Earlier immutable Preview deployments may remain accessible subject to deployment protection; do not publish their temporary write URLs.
- Production remains unchanged. Do not merge PR #124 without an isolated real-model benchmark and identity/evidence verification.

## Next acceptance gate
1. Construct a fixture with genuinely source-grounded obligations and independently adjudicated correct outcomes. Store evidence in the isolated ledger.
2. Run a real provider model on one adversarial turn. Show original wrong output, distinct drift/hallucination classification, receipt, proposed correction, active-state handoff and subsequent turn verification.
3. Run 25 live model turns, then the overlap check from 25–50. Track denominators, uncovered turns, attempted vs verified recovery, token expenses, and post-correction regression.
