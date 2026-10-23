# Reality Closed Loop V1 — Live Model, Evidence, Repair, Continuity

## Purpose
Demonstrate full **sandbox** control flow using real underlying OpenAI model responses across 25 construction-business turns. Not another fabricated-fault detector demo. The primary contract is `src/reality-universe-closed-loop-v1.0.js`.

## Execution
1. Generate the original answer with the real LLM using authenticated-message-format conversation history.
2. Preserve the original answer and provider response ID as an immutable Universe entry.
3. Ask the actual LLM to extract bounded verbatim typed claims. Extraction is **untrusted**. Validate exact answer spans and known kinds/scope. Treat explicit "unknown", "unsettled", "not sent", and attributed reports as distinct from asserted physical facts and executed actions.
4. Check claims against the Universe correction verifier's fixed, scoped benchmark policy, typed prerequisites, and independent proof requirements. A model's assertion does not satisfy a signed scope, inspector pass, owner authorization, or action-effect readback.
5. If a consequential defect is found, request at most one model correction. Reextract and reverify the actual generated correction, preserving the original answer unchanged.
6. Commit the selected sandbox response to the next conversation turn. If a significant unsupported action/fact persists, use an explicit fallback rather than publish a known-bad claim. A merely incomplete claim extraction cannot silently certify success, but shouldn't destroy a useful safe answer.
7. Append original, verification, repair, delivery decision and continuity records to an append-only Universe sandbox ledger with independent exact readback. Each commit includes source hashes and immutable IDs.
8. Report model-only and model+Reality on the same model/prompt set using separate conversations. Show all attempts, source receipts, changed answers, extra model tokens, and the five harmless-task controls.

## What this does *not* yet prove
- It does not establish that model + Reality outperforms the model alone. That requires independent, comprehensive blind adjudication of actual outputs, missed facts, false alarms and user experience.
- A typed-claim verifier can pass a reply while an unextracted hallucination remains.
- A working benchmark loop in **in-memory sandbox** is NOT production customer persistence or live business authorization.
- The benchmark policies are fictional, traced to the frozen user-turn scenario, not actual third-party e-signature, city inspection, inventory, or payment readbacks.
- Appended content hashes do not prove identity unless identity is verified upstream; source proof must be checked against authenticated adapters.
- Harmless-task controls must remain useful. Excess fallback and unnecessary repair count as failures, not successful governance.

## Required promotion criteria
Real-model loop completion, known-failure detection, held-out generalization, harmless-control preservation, source scope isolation, absence of unauthorized external work, bounded cost/latency, complete receipt readback, independently judged accuracy and beneficial residual error changes.

## Control section candidate fields
**Model / version**, supported core abilities, **Reality's verified added abilities**, observed original error classes, residual error classes, correct repairs, false-positive and overblocking rates, hidden coverage gaps, model calls and tokens, estimated total cost (when pricing verified), and receipt references. Any unmeasured metric stays `NOT_MEASURED`.

## Current evidence references
- PR #113: https://github.com/maloney2323/Reality/pull/113
- First full 25-turn experiment CI: https://github.com/maloney2323/Reality/actions/runs/40038552033 (70 tests, 25+25 real turns, 14 regeneration attempts, 4 accepted on typed checks, **10 unwanted generic fallbacks**, 128 in-memory receipts). Mechanical success, poor behavior.
- Refined epistemic-uncertainty version must be scored only after its separate GitHub Actions run finishes.
