"""Semantic verifier tests: trusted context is independent of receipt claims."""
import copy
import hashlib
import unittest

import rfc8785

from oracle_verifier import (
    OracleVerificationError,
    TrustedOracleContext,
    verify_receipt,
)


POLICY = b'{"policy":"frozen-test-policy"}'
REGISTRY = b'{"evidence":["evidence-1"]}'
MANIFEST = b'{"manifest_version":"reality-artifact-manifest-v1","artifacts":[]}'
TRACE = b'{"nodes":["input","gate","halt"],"edges":[["input","gate"],["gate","halt"]]}'
ORIGINAL = b'{"claim":"original"}'
MUTATED = b'{"claim":"contradictory"}'
SHA_A = "a" * 64


def sha(data):
    return hashlib.sha256(data).hexdigest()


def make_receipt():
    return {
        "contract_version": "reality-oracle-v0.1",
        "evaluation_id": "eval-tc001-0001",
        "case_id": "TC-001-DRIFT",
        "bitemporal_stamp": {
            "transaction_time": "2026-10-17T14:22:00Z",
            "valid_time": {"from": "2026-10-01T00:00:00Z", "to": None},
        },
        "trusted_inputs": {
            "policy_sha256": sha(POLICY),
            "evidence_registry_sha256": sha(REGISTRY),
            "artifact_manifest_sha256": sha(MANIFEST),
        },
        "judgments": {
            "detection": "PASS",
            "diagnosis": "NOT_EVALUATED",
            "remediation": "NOT_EVALUATED",
            "containment": "BLOCKED_DRY_RUN",
            "abstention": "NOT_APPLICABLE",
            "utility": "NOT_EVALUATED",
            "verification": "NOT_EVALUATED",
        },
        "lineage": {
            "trace_status": "MISSING",
            "dag_sha256": None,
            "independent_verification": "NOT_EVALUATED",
        },
        "fuzzing": {
            "mutation_id": None,
            "seed": None,
            "original_sha256": None,
            "mutated_sha256": None,
            "mutation_description": None,
        },
        "receipt_integrity": {
            "canonicalization_version": "RFC8785-JCS-excluding-receipt-digest-v0.1",
            "receipt_sha256": SHA_A,
            "previous_receipt_sha256": None,
        },
    }


def seal(receipt):
    receipt["receipt_integrity"]["receipt_sha256"] = "0" * 64
    payload = copy.deepcopy(receipt)
    payload["receipt_integrity"].pop("receipt_sha256")
    receipt["receipt_integrity"]["receipt_sha256"] = sha(rfc8785.dumps(payload))
    return receipt


def context_for(receipt=None, **overrides):
    receipt = receipt or make_receipt()
    values = dict(
        expected_case_id="TC-001-DRIFT",
        trusted_transaction_time="2026-10-17T14:22:00Z",
        policy_valid_from="2026-10-01T00:00:00Z",
        policy_valid_to=None,
        policy_bytes=POLICY,
        evidence_registry_bytes=REGISTRY,
        artifact_manifest_bytes=MANIFEST,
        expected_judgments=dict(receipt["judgments"]),
        expected_previous_receipt_sha256=None,
    )
    values.update(overrides)
    return TrustedOracleContext(**values)


class OracleSemanticVerifierTests(unittest.TestCase):
    def test_valid_dry_run_receipt_verifies_without_claiming_production_containment(self):
        receipt = seal(make_receipt())
        result = verify_receipt(receipt, context_for(receipt))
        self.assertEqual(result["verification_status"], "SEMANTICALLY_VERIFIED_AGAINST_TRUSTED_CONTEXT")
        self.assertFalse(result["production_containment_verified"])

    def test_receipt_digest_tampering_is_rejected(self):
        receipt = seal(make_receipt())
        receipt["judgments"]["detection"] = "FAIL"
        with self.assertRaisesRegex(OracleVerificationError, "RECEIPT_DIGEST_MISMATCH"):
            verify_receipt(receipt, context_for(receipt))

    def test_wrong_trusted_policy_bytes_are_rejected(self):
        receipt = seal(make_receipt())
        with self.assertRaisesRegex(OracleVerificationError, "POLICY_SHA256_MISMATCH"):
            verify_receipt(receipt, context_for(receipt, policy_bytes=b"wrong policy"))

    def test_wrong_transaction_time_is_rejected(self):
        receipt = seal(make_receipt())
        with self.assertRaisesRegex(OracleVerificationError, "TRANSACTION_TIME_NOT_TRUSTED"):
            verify_receipt(receipt, context_for(receipt, trusted_transaction_time="2026-10-17T14:23:00Z"))

    def test_policy_interval_mismatch_is_rejected(self):
        receipt = seal(make_receipt())
        with self.assertRaisesRegex(OracleVerificationError, "POLICY_VALID_FROM_MISMATCH"):
            verify_receipt(receipt, context_for(receipt, policy_valid_from="2026-09-01T00:00:00Z"))

    def test_judgment_must_match_independent_expected_oracle(self):
        receipt = seal(make_receipt())
        expected = dict(receipt["judgments"])
        expected["detection"] = "FAIL"
        with self.assertRaisesRegex(OracleVerificationError, "JUDGMENT_MISMATCH:detection"):
            verify_receipt(receipt, context_for(receipt, expected_judgments=expected))

    def test_previous_receipt_link_must_match_trusted_chain_head(self):
        receipt = make_receipt()
        receipt["receipt_integrity"]["previous_receipt_sha256"] = "b" * 64
        seal(receipt)
        with self.assertRaisesRegex(OracleVerificationError, "PREVIOUS_RECEIPT_DIGEST_MISMATCH"):
            verify_receipt(receipt, context_for(receipt, expected_previous_receipt_sha256="c" * 64))

    def test_dag_halt_requires_external_lineage_verification(self):
        receipt = make_receipt()
        receipt["judgments"]["containment"] = "VERIFIED_DAG_HALT"
        receipt["judgments"]["verification"] = "PASS"
        receipt["lineage"] = {
            "trace_status": "VERIFIED",
            "dag_sha256": sha(TRACE),
            "independent_verification": "PASS",
        }
        seal(receipt)
        with self.assertRaisesRegex(OracleVerificationError, "LINEAGE_INDEPENDENT_PROOF_MISSING"):
            verify_receipt(receipt, context_for(receipt))

    def test_dag_halt_requires_trace_bytes_to_match_verified_digest(self):
        receipt = make_receipt()
        receipt["judgments"]["containment"] = "VERIFIED_DAG_HALT"
        receipt["judgments"]["verification"] = "PASS"
        receipt["lineage"] = {
            "trace_status": "VERIFIED",
            "dag_sha256": sha(TRACE),
            "independent_verification": "PASS",
        }
        seal(receipt)
        ctx = context_for(
            receipt,
            lineage_trace_bytes=TRACE,
            independently_verified_lineage_sha256=sha(TRACE),
        )
        result = verify_receipt(receipt, ctx)
        self.assertFalse(result["production_containment_verified"])

    def test_wrong_trace_bytes_are_rejected(self):
        receipt = make_receipt()
        receipt["judgments"]["containment"] = "VERIFIED_DAG_HALT"
        receipt["judgments"]["verification"] = "PASS"
        receipt["lineage"] = {
            "trace_status": "VERIFIED",
            "dag_sha256": sha(TRACE),
            "independent_verification": "PASS",
        }
        seal(receipt)
        ctx = context_for(
            receipt,
            lineage_trace_bytes=b"other trace",
            independently_verified_lineage_sha256=sha(TRACE),
        )
        with self.assertRaisesRegex(OracleVerificationError, "LINEAGE_TRACE_DIGEST_MISMATCH"):
            verify_receipt(receipt, ctx)

    def test_mutation_hashes_are_recomputed_from_bytes(self):
        receipt = make_receipt()
        receipt["fuzzing"] = {
            "mutation_id": "mutation-1",
            "seed": 7,
            "original_sha256": sha(ORIGINAL),
            "mutated_sha256": sha(MUTATED),
            "mutation_description": "Alter a claim byte sequence",
        }
        seal(receipt)
        ctx = context_for(receipt, original_artifact_bytes=ORIGINAL, mutated_artifact_bytes=MUTATED)
        self.assertEqual(verify_receipt(receipt, ctx)["case_id"], "TC-001-DRIFT")

    def test_mutation_digest_cannot_be_asserted_without_actual_mutated_bytes(self):
        receipt = make_receipt()
        receipt["fuzzing"] = {
            "mutation_id": "mutation-1",
            "seed": 7,
            "original_sha256": sha(ORIGINAL),
            "mutated_sha256": sha(MUTATED),
            "mutation_description": "Alter a claim byte sequence",
        }
        seal(receipt)
        with self.assertRaisesRegex(OracleVerificationError, "MUTATION_BYTES_MISSING"):
            verify_receipt(receipt, context_for(receipt, original_artifact_bytes=ORIGINAL))

    def test_identical_original_and_mutated_bytes_are_rejected(self):
        receipt = make_receipt()
        receipt["fuzzing"] = {
            "mutation_id": "mutation-1",
            "seed": 7,
            "original_sha256": sha(ORIGINAL),
            "mutated_sha256": sha(ORIGINAL),
            "mutation_description": "Claimed mutation",
        }
        seal(receipt)
        ctx = context_for(receipt, original_artifact_bytes=ORIGINAL, mutated_artifact_bytes=ORIGINAL)
        with self.assertRaisesRegex(OracleVerificationError, "MUTATION_DID_NOT_CHANGE_BYTES"):
            verify_receipt(receipt, ctx)


if __name__ == "__main__":
    unittest.main()
