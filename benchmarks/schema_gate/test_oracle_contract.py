"""Structural contract tests for Reality Oracle Receipt v0.1.

These tests validate receipt shape and fail-closed semantics only. They do not
prove that any judgment is true or that production containment occurred.
"""
import copy
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


SCHEMA_PATH = Path(__file__).with_name("oracle_receipt.schema.json")
SHA_A = "a" * 64
SHA_B = "b" * 64
SHA_C = "c" * 64


def valid_receipt():
    return {
        "contract_version": "reality-oracle-v0.1",
        "evaluation_id": "eval-tc001-0001",
        "case_id": "TC-001-DRIFT",
        "bitemporal_stamp": {
            "transaction_time": "2026-10-17T14:22:00Z",
            "valid_time": {
                "from": "2026-10-01T00:00:00Z",
                "to": None,
            },
        },
        "trusted_inputs": {
            "policy_sha256": SHA_A,
            "evidence_registry_sha256": SHA_B,
            "artifact_manifest_sha256": SHA_C,
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
            "canonicalization_version": "reality-canonical-json-v0.1",
            "receipt_sha256": SHA_A,
            "previous_receipt_sha256": None,
        },
    }


class OracleReceiptContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(cls.schema)
        cls.validator = Draft202012Validator(
            cls.schema, format_checker=FormatChecker()
        )

    def errors(self, payload):
        return list(self.validator.iter_errors(payload))

    def test_valid_dry_run_receipt_is_structurally_accepted(self):
        self.assertEqual(self.errors(valid_receipt()), [])

    def test_unexpected_top_level_field_is_rejected(self):
        payload = valid_receipt()
        payload["model_self_attested_success"] = True
        self.assertTrue(self.errors(payload))

    def test_uppercase_digest_is_rejected(self):
        payload = valid_receipt()
        payload["trusted_inputs"]["policy_sha256"] = SHA_A.upper()
        self.assertTrue(self.errors(payload))

    def test_invalid_timestamp_is_rejected(self):
        payload = valid_receipt()
        payload["bitemporal_stamp"]["transaction_time"] = "yesterday"
        self.assertTrue(self.errors(payload))

    def test_verified_dag_halt_requires_verified_lineage_and_passed_verification(self):
        payload = valid_receipt()
        payload["judgments"]["containment"] = "VERIFIED_DAG_HALT"
        self.assertTrue(self.errors(payload))

    def test_verified_dag_halt_accepts_complete_verified_trace_shape(self):
        payload = valid_receipt()
        payload["judgments"]["containment"] = "VERIFIED_DAG_HALT"
        payload["judgments"]["verification"] = "PASS"
        payload["lineage"] = {
            "trace_status": "VERIFIED",
            "dag_sha256": SHA_B,
            "independent_verification": "PASS",
        }
        self.assertEqual(self.errors(payload), [])

    def test_missing_lineage_cannot_claim_independent_pass(self):
        payload = valid_receipt()
        payload["lineage"]["independent_verification"] = "PASS"
        self.assertTrue(self.errors(payload))

    def test_mutation_metadata_must_be_complete_when_mutation_id_exists(self):
        payload = valid_receipt()
        payload["fuzzing"]["mutation_id"] = "mutation-001"
        self.assertTrue(self.errors(payload))

    def test_complete_mutation_metadata_is_accepted(self):
        payload = valid_receipt()
        payload["fuzzing"] = {
            "mutation_id": "mutation-001",
            "seed": 42,
            "original_sha256": SHA_A,
            "mutated_sha256": SHA_B,
            "mutation_description": "Inject a contradictory timestamp",
        }
        self.assertEqual(self.errors(payload), [])

    def test_unknown_judgment_state_is_rejected(self):
        payload = valid_receipt()
        payload["judgments"]["detection"] = "PROBABLY_PASS"
        self.assertTrue(self.errors(payload))

    def test_schema_validity_does_not_promote_dry_run_to_containment(self):
        payload = valid_receipt()
        self.assertEqual(payload["judgments"]["containment"], "BLOCKED_DRY_RUN")
        self.assertNotEqual(payload["judgments"]["containment"], "VERIFIED_DAG_HALT")
        self.assertEqual(payload["lineage"]["trace_status"], "MISSING")


if __name__ == "__main__":
    unittest.main()
