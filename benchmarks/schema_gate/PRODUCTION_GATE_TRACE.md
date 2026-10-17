# Production Gate Trace — Evaluation Bridge Integration

Status: DISCOVERY ONLY — no production adapter is connected.

Branch: `integration/schema-gate-python-v0.1`

## Located source modules

| Boundary | Source | Observed interface / responsibility |
|---|---|---|
| Authority policy | `src/reality-authority-v1.0.js` | `createAuthorityPolicy`, `scopeMatches`, `autoAuthorize`, `saveAuthorityPolicy`, `getAuthorityPolicy`. Scope checks bind connector, operation, work item/resource and policy expiry. |
| Evidence warrant | `src/reality-evidence-warrant-v1.0.js` | `createEvidenceWarrant`, `verifyEvidenceWarrant`, `verifyWarrantChain`. Requires observation/evidence references and epistemic/friction assessments. Warrant explicitly cannot grant authority or mutate policy. |
| Execution engine | `src/reality-governed-execution-engine-v0.1.js` | `executeAuthorizedWork`; checks work item/workflow match and required connector/verifier, invokes `canExecute`, executes via injected connector, then asks independent verifier. |
| Work runtime | `src/reality-governed-work-runtime-v0.1.js` | Workflow and work-item primitives, authorization/execution contracts, and `canExecute`. |
| Server connector boundary | `src/reality-server-execution-bridge-v0.1.js` | `getServerExecutionBridges`; dispatches supported GitHub/Vercel/Supabase operations and implements selected read-back verifiers. |
| Operation ledger | `src/reality-operation-ledger-v1.0.js` | Deterministic operation events, strict authority scope validation, replay checks and outcome classification; does not itself grant authority or claim an outcome verified. |
| Reconciliation | `src/reality-governed-work-reconciliation-v0.1.js` | Plan artifacts, authority decisions/diffs and reconciled successor/lineage. This is not the same as post-provider execution verification. |
| API execution route | `api/reality/execute.js` | Connects session principal, explicit/customer authority, server execution bridges, execution engine, verification, and optional evidence-warrant/learning steps. Rejects client-supplied connector/verifier bridges. |
| Authority API route | `api/reality/authority.js` | Reads/creates the session principal's authority policy. |
| Intelligence API route | `api/reality/intelligence.js` | Orchestrates live intelligence and connected-world observation; not itself an authorization or execution gate. |

## Integration conclusions

1. The proposed `src/core/governance_gateway.js` and its placeholder imports are not the repository's actual module paths.
2. There is no located exported function that directly accepts an arbitrary model assertion and returns a benchmark verdict. The benchmark adapter therefore cannot honestly treat model text as a production work item or infer detection from booleans.
3. Calling `executeAuthorizedWork` as part of a benchmark would be unsafe: it can invoke external connector mutations. The adapter must not run real execution side effects for adversarial text.
4. The safe adapter boundary should use non-mutating validation/evaluation functions, or a separately isolated dry-run seam that is implemented and tested in the actual production path. Any mock or dry-run must be labeled as such, not counted as production containment.
5. Authority decision, evidence support, execution attempt, independent post-execution verification, and benchmark containment are distinct states. A clean/allowed path is not automatically `CONTAINED`; if the benchmark cannot observe the relevant enforcement, return `NOT_EVALUATED` or `INDETERMINATE`.
6. Before corpus fixtures, freeze one manifest contract and make each case reference immutable input/evidence artifacts by digest. Keep the existing Python manifest contract and the proposed `test_case_id/evidence_registry` format separate until an explicit versioned migration is approved.

## Verification status

- Source paths were inspected on `integration/schema-gate-python-v0.1`.
- This document is a source-level map, not proof of deployed-source identity or live production behavior.
- No production adapter has been added or configured.
- No production action was executed.
- No merge or deployment was performed.
