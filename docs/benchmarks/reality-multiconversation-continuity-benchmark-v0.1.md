# Reality Multi-Conversation Continuity Benchmark v0.1

**Status:** Harness specification prepared; runtime execution not yet verified.
**Target base:** `af3a6a5f534591ffe26eee16eb31d70db4620179` (`feat/continuity-spine-v2`).
**Purpose:** Detect long-conversation forgetting, cross-conversation contamination, contradiction loss, and false claims of verified execution without weakening the frozen scorer or changing production behavior.

## Test matrix

Each case must run with a fresh conversation/session identifier. Repeat at 5, 10, 30, 50, and 100 user turns where the API permits. Include interleaved conversations A/B/C and then resume each in a different order.

1. **Longitudinal recall:** Seed a unique fact early; ask for it after increasing turn counts. Record the first turn at which it is omitted or altered.
2. **Contradiction preservation:** Seed claim X, later provide explicit correction/not-X; ask for current status and history. Require both evidence events to remain visible with chronology, not silent overwrite.
3. **Conversation isolation:** Put distinct nonce facts in A/B/C. Query each conversation after interleaving. Any cross-conversation fact leakage is a hard failure.
4. **Scope/authority separation:** State a requirement, a proposal, a test result, and a production-verified result in separate turns. The recap must not promote a requirement/proposal/test into production verification.
5. **Missing-context fail-closed:** Simulate unavailable history/context. Output must disclose unavailable context or return an explicit degraded status; it must not imply full continuity.
6. **Paraphrase resilience:** Ask for a grounded recap with paraphrased evidence. Evaluate semantic support against source turn IDs, not literal word overlap alone.
7. **Repeated-run stability:** Run each frozen case at least 3 times; preserve all raw outputs and per-run scores. Do not cherry-pick the best result.
8. **Cross-session isolation:** Start a new authenticated session and ensure no private prior conversation is silently treated as current-thread evidence unless explicitly authorized durable memory supplies it with provenance.

## Required evidence per run

- repository SHA, branch, runner version, protocol/scorer hash, fixture hash
- API origin, model identifier, prompt/context token usage when available, latency, HTTP status
- generated conversation/session IDs (redact secrets and personal data)
- every input turn and raw response, source-turn references, expected labels, scored output
- earliest failure turn, failure family, severity, whether it is Reality logic, context-store, provider, deployment, or infrastructure
- context-loaded / degraded-context indicator, continuity root, and persisted receipt/ledger references when available

## Frozen interpretation rules

- Requirements, proposals, tests, and production-verified outcomes are distinct claim types.
- A test passing is not evidence of production deployment identity.
- Missing evidence is not a pass. Infrastructure failure is reported separately from a Reality behavior failure.
- Never weaken thresholds, modify gold labels, or use test answers as prompt examples during a scored run.
- Do not send build/fix commands to the production chat path; this benchmark is read-only with respect to production actions.
- No run is called a pass until the complete matrix, repeated runs, raw evidence, and scorer outputs are present.

## Current source-level risks to test first

- The inspected API source loads at most 80 stored messages and then retains at most 60 role-filtered messages, which is roughly 30 user/assistant exchanges. Older facts can fall outside the current prompt.
- Context loading can return no context on some upstream errors; confirm the response visibly marks degraded context and that downstream answers do not claim complete continuity.
- Deep-reasoning requests use multiple model calls with packed context. Measure latency and token growth across long histories.
- The model gateway uses the OpenAI Responses API, but the application constructs context for each call rather than relying on native multi-turn response chaining.
- The inspected deployment source still uses Base44 for auth/profile/conversation persistence even though OpenAI is the model transport. Verify the intended current architecture before treating Base44 removal as complete.

## Execution gates

1. Run the deterministic unit/source-contract checks in CI.
2. Run the live multi-conversation suite only against a dedicated test deployment and test account with explicit credentials stored as CI secrets.
3. Require the API to return observable conversation/session IDs and a machine-readable context status; do not guess payload shape.
4. Capture raw evidence and publish the result as **UNVERIFIED** until independently read back from Reality's persistence layer.
5. Do not write benchmark outcomes only to GitHub artifacts: the user's standing requirement is for benchmark records to be persisted in Reality/Postgres and exposed read-only, with infrastructure failures separated from Reality failures.

## Current blocker

Vercel returned `402 DEPLOYMENT_DISABLED` and sandbox creation returned `402 resource_creation_blocked` due an overdue team balance. Therefore no live end-to-end run can currently be represented as completed. The CI/source-contract checks are a preparation step, not a substitute for live multi-conversation testing.
