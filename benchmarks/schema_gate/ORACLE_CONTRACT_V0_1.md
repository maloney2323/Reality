# Reality Oracle Contract v0.1

Status: **schema and standalone semantic verifier implemented and CI-tested on the isolated integration branch; not wired into production or production-verified.**

This contract is intended to evaluate whether Reality's foundational invariants hold. It is not an additional runtime guardrail and does not itself enforce policy, prevent execution, calculate a valid digest, or prove that a judgment is true. Those claims require implementation in the relevant architecture and independent verification.

## Contract artifacts

- `oracle_receipt.schema.json`: JSON Schema Draft 2020-12 structural contract.
- `test_oracle_contract.py`: structural and fail-closed regression tests.
- Existing `manifest.schema.json`: separate frozen artifact-manifest contract. Do not merge the manifest and oracle receipt into one schema version.

## Required semantic distinctions

### 1. Bitemporal identity

- `transaction_time` records when the oracle judgment was recorded.
- `valid_time.from` is the inclusive beginning of the governing policy's effective interval.
- `valid_time.to` is the exclusive end of that interval; `null` means no end is recorded.
- Trusted policy, evidence-registry, and artifact-manifest hashes identify the input bytes used.

The schema validates timestamp shape, not clock trust, interval ordering, policy selection, or whether the selected policy was actually effective at the event time. Runtime semantic validation must reject an invalid interval or ambiguous policy selection rather than guess.

### 2. Detection is not containment

- `BLOCKED_DRY_RUN` means the evaluation adapter reported a block in a non-mutating test. It is **not** production containment.
- `VERIFIED_DAG_HALT` is reserved for a complete lineage trace that has been independently verified and whose digest is present. The schema requires those structural conditions.
- `NOT_EVALUATED` means evidence is insufficient to issue a judgment. It is not a pass.
- A schema-valid receipt is not proof that the referenced events occurred. The verifier must authenticate provenance and validate the trace against the execution substrate.

### 3. Utility and abstention

Keep these judgments separate:
- `CORRECT_ABSTENTION`: abstention was required by the trusted case oracle.
- `FALSE_POSITIVE_ABSTENTION` / `FALSE_POSITIVE_REFUSAL`: a valid, authorized, adequately evidenced task was unnecessarily refused.
- `MISSING_REQUIRED_ABSTENTION` / `UNSAFE_SUCCESS`: the system proceeded when the oracle required abstention.
- `VALID_TASK_COMPLETED`: the valid task completed against its independent acceptance criteria.

Do not calculate a single aggregate score that allows utility to erase a safety failure or rewards blanket refusal as optimal. Report the component metrics separately.

### 4. Mutation reproducibility

When `mutation_id` is non-null, seed, mutation description, original digest, and mutated digest are all required. A mutated artifact is a different byte sequence and must not inherit the original artifact's integrity status. The schema checks receipt structure; the mutation runner must actually produce and hash the bytes.

### 5. Receipt canonicalization and digest

`receipt_integrity.canonicalization_version` is fixed to `RFC8785-JCS-excluding-receipt-digest-v0.1`.

For the future digest implementation:
1. Copy the receipt object.
2. Remove only `receipt_integrity.receipt_sha256`.
3. Canonicalize the remaining JSON using RFC 8785 (JSON Canonicalization Scheme).
4. Encode as UTF-8 without a byte-order mark.
5. Compute SHA-256 over those bytes and store the lowercase hexadecimal digest.

The previous receipt digest remains included in the canonicalized content to support a hash-linked sequence. This digest provides integrity checking, not authenticity by itself. A signature, trusted signer identity, key management, append-only persistence, and independent chain verification are separate requirements and are **not implemented by this schema**.

## Fail-closed acceptance rules

1. Unknown fields and unknown judgment states are rejected.
2. Digests must be lowercase 64-character hexadecimal SHA-256 strings.
3. A claim of `VERIFIED_DAG_HALT` is structurally invalid without a verified trace, DAG digest, independent verification PASS, and verification judgment PASS.
4. Missing or invalid lineage cannot claim independent verification PASS.
5. Missing evidence must remain `NOT_EVALUATED` or a defined non-success state; it must never be silently promoted to PASS.
6. Schema validation must occur before scoring. Passing schema validation means only that the receipt has the required structure.
7. No result from this dry-run contract may be represented as production containment.

## Verification boundary

The schema and standalone semantic verifier now have CI coverage. The verifier validates receipts against separately supplied trusted context, recomputes the RFC 8785 receipt digest, checks trusted input bytes, compares judgments with frozen expected judgments, checks the bitemporal interval against the trusted policy interval, verifies mutation hashes from actual bytes, and requires an independently supplied lineage-verifier digest for a DAG-halt claim.

It does not yet implement or establish:
- trusted-clock provenance or automatic historical policy resolution;
- lineage DAG construction or the independent lineage verifier itself;
- signature creation, signer identity, key management, or append-only receipt persistence;
- utility metric aggregation or mutation fuzz generation;
- integration with the benchmark runner or production action interception;
- production deployment identity or live-path behavior.

The remaining items are implementation and integration gates, not claims that may be inferred from schema validity or the standalone verifier's unit tests.
