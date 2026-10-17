import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from run_adversarial_benchmark import RealityAdversarialRunner, verify_artifact_registry


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
