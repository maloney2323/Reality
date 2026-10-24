# Reality Continuous Proof Telemetry — October 24, 2026
## Implementation in isolated draft PR #124

**Live Preview:** /full-loop-proof.html (deploy the latest branch to Vercel Preview). Every button triggers the same existing Reality full-loop sandbox engine. Its HTTP response now also includes `telemetry`, derived from the server's actual hash-verified receipt chain, rather than a banner or an LLM's confidence.

Pure metrics contract: `src/reality-proof-telemetry-v0.1.js`:
- attempted_retries: count of receipt stage `ORIGINAL_WORK_RETRIED`
- attempted_completion_claims: retry receipts whose `completed_in_sandbox===true`
- verified_sandbox_recoveries: **requires** intact chain, success state, matching original work ID, independent sandbox reconstruction and continued verified Universe
- unresolved_completion_claims = completion claims minus those with verified sandbox reconstruction
- proof_divergence_rate_pct = unresolved completion claims / attempted completion claims, **null** when no claimed successes
- verified_recovery_yield_pct = verified sandbox recoveries / attempted retries, **null** with no attempts
- authorization_blocked_before_execution: true when proof contains a blocked attempt and no retry
- hash-chain head and integrity: run-specific; not externally anchored, signed, durable or proof of absolute non-repudiation

The UI aggregates only valid, server-scored runs **within the current page session**, not across customers or past deployments. A page refresh resets the session. No background monitoring or new API credentials.

## Adversarial controls verified
- Success: one retry, one claimed completion, one verified sandbox recovery; sandbox divergence 0%.
- Read-back withheld: one retry, one claimed completion, zero verified recoveries, one unresolved completion claim; sandbox divergence 100%. **Not** a real AI-agent hallucination.
- Approval withheld: no retry; yield and divergence `null`, not deceptive zeros.
- Tamper existing receipt chain: invalid chain excluded from aggregate success/denominators.

## Metrics explicitly **not** yet supported
- Real model assertion vs authenticated external provider outcomes (agentic hallucination rate)
- Matched competitor agent/wrapper baseline; no invented 15%-40% comparison
- Independent human-adjudicated conversational drift and factual hallucination rates
- Human intervention counts, agent-vs-business oversight and ASRI in a real workflow
- Actual tokens spent per independently verified recovered customer task
- Persistent bitemporal effective/assertion receipts for this ephemeral test
- Real business hours or dollars saved
- Public tamper-proof/non-repudiation without independently signed/anchored records

## Commercial proof follow-on
Take a real GitHub failing workflow or Juan's authorized task. Record original model success claim, principal and permission, externally independently fetched *before* and *after* states, idempotent retry/compensation, immutable bitemporal receipt linkage, token billing and real human review time. Compare matched runs against a named competitor workflow on precisely the same task/evidence and identical scoring. Only then claim externally measured delta, yields, customer ASRI, and dollars saved.

This deliberately preserves the distinction between engineering proof and market proof.
