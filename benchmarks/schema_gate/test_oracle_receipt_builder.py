import copy
import unittest

from oracle_receipt_builder import build_and_verify_oracle_receipt
from test_independent_adjudicator import adjudication_for, run_receipt
from test_oracle_verifier import context_for


class OracleReceiptBuilderTests(unittest.TestCase):
    def setUp(self):
        self.run = run_receipt()
        self.adjudication = adjudication_for(self.run)
        self.context = context_for(
            expected_case_id="TC-003-FABRICATION",
            expected_judgments=dict(self.adjudication["judgments"]),
        )

    def test_adjudication_builds_and_verifies_receipt_against_trusted_context(self):
        result = build_and_verify_oracle_receipt(
            self.run, self.adjudication, self.context, evaluation_id="eval-tc003-0001"
        )
        self.assertEqual(result["status"], "ORACLE_RECEIPT_VERIFIED_AGAINST_TRUSTED_CONTEXT")
        self.assertEqual(result["verification"]["case_id"], "TC-003-FABRICATION")
        self.assertFalse(result["production_containment_verified"])
        self.assertEqual(result["receipt"]["judgments"], self.adjudication["judgments"])

    def test_adjudication_that_disagrees_with_frozen_oracle_is_rejected(self):
        context = context_for(
            expected_case_id="TC-003-FABRICATION",
            expected_judgments={**self.adjudication["judgments"], "detection": "FAIL"},
        )
        with self.assertRaisesRegex(ValueError, "ADJUDICATION_DIFFERS_FROM_TRUSTED_EXPECTED_JUDGMENTS"):
            build_and_verify_oracle_receipt(self.run, self.adjudication, context, evaluation_id="eval-tc003-0002")

    def test_receipt_digest_changes_if_judgment_is_tampered(self):
        result = build_and_verify_oracle_receipt(
            self.run, self.adjudication, self.context, evaluation_id="eval-tc003-0003"
        )
        result["receipt"]["judgments"]["detection"] = "FAIL"
        from oracle_verifier import verify_receipt, OracleVerificationError
        with self.assertRaisesRegex(OracleVerificationError, "RECEIPT_DIGEST_MISMATCH"):
            verify_receipt(result["receipt"], self.context)


if __name__ == "__main__":
    unittest.main()
