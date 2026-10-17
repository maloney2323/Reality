import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from run_adversarial_benchmark import RealityAdversarialRunner, verify_artifact_registry
from test_oracle_verifier import context_for, make_receipt, seal


class MockModelAdapter:
    def __init__(self, should_fail=False, response_text=""):
        self.should_fail = should_fail
        self.response_text = response_text
    def get_metadata(self):
        return {"provider": "MockFrontier", "model_version": "mock-v0"}
    def invoke_sequence(self, chat_input):
        if self.should_fail:
            raise RuntimeError("API Network Timeout")
        return self.response_text


class MockRealityGate:
    def __init__(self, result=None, should_fail=False):
        self.result = result or {
            "detection": "DETECTED",
            "gate_action_taken": "BLOCKED",
            "containment_status": "CONTAINED",
            "evidence": {"source": "TEST_MOCK_ONLY", "receipt_id": "mock-receipt-1"},
        }
        self.should_fail = should_fail
    def evaluate(self, *, test_case_id, raw_model_response):
        if self.should_fail:
            raise RuntimeError("gate unavailable")
        return self.result


class RunnerPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.runner = RealityAdversarialRunner(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def test_model_timeout_is_system_fault_and_not_pass(self):
        receipt = self.runner.execute_blind_model_test("TC-01", [], MockModelAdapter(should_fail=True))
        self.assertEqual(receipt["execution_status"], "SYSTEM_FAULT")
        self.assertIn("API Network Timeout", receipt["execution_error"])
        result = self.runner.evaluate_reality_containment_gate(receipt, MockRealityGate())
        self.assertEqual(result["containment_status"], "SYSTEM_FAULT")
        self.assertEqual(result["gate_action_taken"], "BLOCKED_NO_VALID_MODEL_OUTPUT")

    def test_empty_response_is_system_fault(self):
        receipt = self.runner.execute_blind_model_test("TC-EMPTY", [], MockModelAdapter(response_text=""))
        self.assertEqual(receipt["execution_status"], "SYSTEM_FAULT")
        self.assertEqual(receipt["execution_error"], "EMPTY_MODEL_RESPONSE")

    def test_missing_real_gate_adapter_is_not_evaluated(self):
        receipt = self.runner.execute_blind_model_test("TC-02", [], MockModelAdapter(response_text="some output"))
        result = self.runner.evaluate_reality_containment_gate(receipt, None)
        self.assertEqual(result["containment_status"], "NOT_EVALUATED")
        self.assertEqual(result["gate_action_taken"], "NOT_EVALUATED")

    def test_detection_alert_and_leak_outcome_are_separate(self):
        receipt = self.runner.execute_blind_model_test("TC-03", [], MockModelAdapter(response_text="sensitive snippet"))
        gate = MockRealityGate(result={
            "detection": "DETECTED",
            "gate_action_taken": "LEAKED_TO_USER",
            "containment_status": "FAILED",
            "evidence": {"source": "TEST_MOCK_ONLY"},
        })
        result = self.runner.evaluate_reality_containment_gate(receipt, gate)
        self.assertEqual(result["detection"], "DETECTED")
        self.assertEqual(result["gate_action_taken"], "LEAKED_TO_USER")
        self.assertEqual(result["containment_status"], "FAILED")

    def test_gate_exception_fails_closed(self):
        receipt = self.runner.execute_blind_model_test("TC-04", [], MockModelAdapter(response_text="output"))
        result = self.runner.evaluate_reality_containment_gate(receipt, MockRealityGate(should_fail=True))
        self.assertEqual(result["containment_status"], "SYSTEM_FAULT")
        self.assertEqual(result["gate_action_taken"], "BLOCKED_GATE_EVALUATION_ERROR")

    def test_frozen_case_catalog_keeps_oracle_out_of_model_input(self):
        case = self.runner.load_frozen_case("TC-001-DRIFT")
        self.assertIn("expected_judgments", case)
        receipt = self.runner.execute_frozen_case("TC-001-DRIFT", MockModelAdapter(response_text="I cannot establish the date from this evidence."))
        self.assertEqual(receipt["evaluation_status"], "NOT_EVALUATED")
        self.assertEqual(receipt["judgments"]["detection"], "NOT_EVALUATED")
        self.assertFalse(receipt["production_containment_verified"])
        self.assertNotIn("expected_judgments", receipt["execution"]["raw_model_response"] if isinstance(receipt["execution"]["raw_model_response"], dict) else {})
        self.assertEqual(receipt["stimulus_sha256"], hashlib.sha256(case["stimulus"].encode("utf-8")).hexdigest())

    def test_frozen_case_runner_appends_receipts_and_does_not_claim_success(self):
        path = self.root / "frozen-runs.jsonl"
        adapter = MockModelAdapter(response_text="I cannot verify that without evidence.")
        first = self.runner.execute_frozen_case("TC-003-FABRICATION", adapter, path)
        second = self.runner.execute_frozen_case("TC-003-FABRICATION", adapter, path)
        self.assertEqual(first["evaluation_status"], "NOT_EVALUATED")
        self.assertEqual(second["evaluation_status"], "NOT_EVALUATED")
        rows = [json.loads(line) for line in path.read_text().splitlines()]
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row["production_containment_verified"] is False for row in rows))

    def test_unknown_frozen_case_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "FROZEN_CASE_NOT_FOUND_OR_DUPLICATE"):
            self.runner.load_frozen_case("TC-UNKNOWN")

    def test_oracle_verification_without_trusted_context_stays_not_evaluated(self):
        result = self.runner.verify_oracle_receipt({"judgments": {"verification": "PASS"}})
        self.assertEqual(result["verification_status"], "NOT_EVALUATED")
        self.assertEqual(result["reason"], "TRUSTED_ORACLE_CONTEXT_NOT_SUPPLIED")
        self.assertFalse(result["production_containment_verified"])

    def test_oracle_verification_rejects_invalid_receipt_with_trusted_context(self):
        result = self.runner.verify_oracle_receipt({"case_id": "TC-001-DRIFT"}, context_for())
        self.assertEqual(result["verification_status"], "REJECTED")
        self.assertFalse(result["production_containment_verified"])

    def test_oracle_verification_accepts_consistent_receipt_but_not_production_containment(self):
        receipt = seal(make_receipt())
        result = self.runner.verify_oracle_receipt(receipt, context_for(receipt))
        self.assertEqual(result["verification_status"], "SEMANTICALLY_VERIFIED_AGAINST_TRUSTED_CONTEXT")
        self.assertFalse(result["production_containment_verified"])

    def test_hash_registry_requires_lowercase_digest_and_exact_bytes(self):
        (self.root / "artifact.txt").write_bytes(b"verified bytes")
        digest = hashlib.sha256(b"verified bytes").hexdigest()
        good = verify_artifact_registry(self.root, [{"artifact_id": "A1", "path": "artifact.txt", "sha256_hash": digest}])
        self.assertEqual(good["integrity_status"], "VERIFIED")
        bad = verify_artifact_registry(self.root, [{"artifact_id": "A1", "path": "artifact.txt", "sha256_hash": digest.upper()}])
        self.assertEqual(bad["integrity_status"], "REJECTED")
        self.assertEqual(bad["rejected_artifacts"][0]["reason"], "INVALID_SHA256_FORMAT")

    def test_registry_rejects_path_traversal(self):
        result = verify_artifact_registry(self.root, [{
            "artifact_id": "A1", "path": "../outside.txt", "sha256_hash": "a" * 64
        }])
        self.assertEqual(result["integrity_status"], "REJECTED")
        self.assertEqual(result["rejected_artifacts"][0]["reason"], "INVALID_ARTIFACT_PATH")

    def test_jsonl_receipts_append_without_overwrite(self):
        path = self.root / "evidence" / "runs.jsonl"
        self.runner.write_jsonl_receipt(path, {"run": 1})
        self.runner.write_jsonl_receipt(path, {"run": 2})
        rows = [json.loads(line) for line in path.read_text().splitlines()]
        self.assertEqual(rows, [{"run": 1}, {"run": 2}])


if __name__ == "__main__":
    unittest.main()
