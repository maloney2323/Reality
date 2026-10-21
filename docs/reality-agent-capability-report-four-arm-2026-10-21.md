# Reality Agent Capability Report — four-condition comparison
**Version:** 2026-10-21 draft.
**Evidence rule:** No customer-facing metric is populated without independent provider readback and accepted work receipts.

## Why the standard-guardrails comparator matters

| Condition | Controlled agent | Test purpose |
| --- | --- | --- |
| **A. Agent alone** | Identical model/provider/version/config/tool manifest | Underlying capability and failure baseline |
| **B. Agent + standard guardrails** | Same agent, fixed independent guardrail policy (hash-bound) | Improvements available without Reality |
| **C. Agent + Reality** | Same agent and tools as A/B, fixed Reality governance policy (hash-bound) | Reality's incremental governance/continuity/evidence value **over standard guardrails** |
| **D. Agent + Reality + candidate upgrade** | Same underlying model, declared capability/tool manifest delta in sandbox | Improvements attributable to the proposed upgrade, pending verified ownership and activation |

The comparator **does not** assert Reality is superior to any named vendor. It measures the chosen documented guardrail policy under the same tasks and tool budget. For D, a sandbox candidate is not described as *actually approved, deployed or successful in customer production* until separate owner approval and provider readback are proven.

## The evaluation contract now present in GitHub
`src/reality-gsi-four-arm-capability-report-v0.1.js`:

- Freezes exact model identity, decoding/config digest, case IDs, held-out IDs, seed, scorer hash, policy hashes and tool manifests.
- Rejects undeclared tool changes (including B receiving more tools), alternate models, missing/duplicate case receipts, case/task swaps, or training access to held-out IDs.
- Preserves independently traceable per-case references as **claims**, not proofs.
- Separately counts completion, post-publication hallucination escapes, obligation drift, unsafe action escapes, legitimate false blocks, recovery, human-review minutes and run costs (missing values remain `null`).
- Separates delta A→B (standard guardrails), B→C (Reality governance), C→D (candidate capability); retains failures rather than hiding them in a blended score.
- Rejects candidate admission under regression, false-block increase, hidden-set failure or lack of newly completed work.
- Requires a pinned external evaluator Ed25519 signature on the exact report hash and evidence reference for documentary attestation. Even a valid signature is **NOT independent provider-readback proof** by itself.
- Produces `Reality Agent Capability Report` customer-facing placeholders with **no invented rates, ROI, savings or completion numbers**. They remain blank until a trusted server-side verification service actually corroborates the original task and external result.

## Distinct gates and remaining work

A report scores the agent; the independent evaluator corroborates source events; the owner approves the exact change; the mutation executor consumes the single-use approval; a trusted provider readback confirms what actually changed; and the original customer's outstanding task is independently completed and verified. None of those obligations can be substituted for another.

The previously implemented three-arm signed-admission prototype remains active as a pending-only training promotion boundary. This four-arm report is a **separate additional evaluator interface**: it is not yet enforced by *every* capability creation, sandbox, worldline merge and live promotion entry point. Unifying all those mutation paths to a single admission and execution boundary remains required before production.

**No live underlying AI agent A/B/C/D runs, model-weight changes, real customer task completions, signed live owner approvals or verified business-value calculations have been performed here.** Tests use synthetic agents and fixtures; the only valid claim is successful contract-level regression testing.

## Next integration order

1. Establish legitimate Base44 sign-in on Preview. Preserve production isolation and execution-off default.
2. Connect genuine per-task work receipts and independent evaluator readback without sharing owner credentials or secrets in prompts.
3. Run controlled A/B/C/D *no-external-write* pilot across a fixed subset of construction workflow cases and withheld variants, including a clearly identified standard guardrail comparator.
4. Bind promotion and sandbox admission to four-arm independent evidence and owner-signed approval, with durable nonce consumption.
5. After an authorized Preview upgrade, follow the original pending task to outcome verification and calculate real business minutes/rework/cost; never impute unmeasured savings.
