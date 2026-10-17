"""Blind model-run orchestration and separately attested Reality containment evaluation.

This module does not claim that a mock gate is production Reality. A production gate
adapter must be explicitly supplied by an integration harness. Errors and empty
responses are system faults, never model passes.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from typing import Any, Protocol

SHA256_RE = re.compile(r"^[a-f0-9]{64}$")


class ModelAdapter(Protocol):
    def get_metadata(self) -> dict[str, Any]: ...
    def invoke_sequence(self, conversation_input: list[dict[str, Any]]) -> Any: ...


class RealityGateAdapter(Protocol):
    def evaluate(self, *, test_case_id: str, raw_model_response: Any) -> dict[str, Any]: ...


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_artifact_registry(evidence_root: Path, registry: list[dict[str, Any]]) -> dict[str, Any]:
    """Verify lowercase SHA-256s and safe, regular files before any model invocation."""
    accepted: list[dict[str, str]] = []
    rejected: list[dict[str, str]] = []
    root = evidence_root.resolve(strict=True)
    seen: set[str] = set()

    for index, item in enumerate(registry):
        artifact_id = item.get("artifact_id") if isinstance(item, dict) else None
        try:
            if not isinstance(item, dict) or not isinstance(artifact_id, str) or not artifact_id.strip():
                raise ValueError("ARTIFACT_ENTRY_INVALID")
            if artifact_id in seen:
                raise ValueError("ARTIFACT_ID_DUPLICATE")
            seen.add(artifact_id)
            expected = item.get("sha256_hash")
            if not isinstance(expected, str) or SHA256_RE.fullmatch(expected) is None:
                raise ValueError("INVALID_SHA256_FORMAT")
            relative = item.get("path")
            if not isinstance(relative, str) or not relative or "\\" in relative:
                raise ValueError("INVALID_ARTIFACT_PATH")
            rel_path = Path(relative)
            if rel_path.is_absolute() or any(part in ("", ".", "..") for part in rel_path.parts):
                raise ValueError("INVALID_ARTIFACT_PATH")
            candidate = root / rel_path
            cursor = root
            for part in rel_path.parts:
                cursor = cursor / part
                if cursor.is_symlink():
                    raise ValueError("SYMLINK_PATH_REJECTED")
            resolved = candidate.resolve(strict=True)
            if not resolved.is_relative_to(root) or not resolved.is_file():
                raise ValueError("PATH_OUTSIDE_ROOT_OR_NOT_FILE")
            actual = sha256_file(resolved)
            if actual != expected:
                raise ValueError("ARTIFACT_SHA256_MISMATCH")
            accepted.append({"artifact_id": artifact_id, "sha256": actual, "path": relative})
        except (OSError, ValueError) as exc:
            reason = str(exc) or "ARTIFACT_INTEGRITY_ERROR"
            rejected.append({"artifact_id": str(artifact_id or f"index-{index}"), "reason": reason})

    return {
        "integrity_status": "VERIFIED" if not rejected else "REJECTED",
        "accepted_count": len(accepted),
        "rejected_count": len(rejected),
        "accepted_artifacts": accepted,
        "rejected_artifacts": rejected,
    }


class RealityAdversarialRunner:
    def __init__(self, base_dir: str | Path, benchmark_version: str = "0.1.0"):
        self.base_dir = Path(base_dir).resolve()
        self.benchmark_version = benchmark_version

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()

    def load_frozen_case(self, case_id: str, catalog_path: str | Path | None = None) -> dict[str, Any]:
        """Load a frozen case definition; never include oracle data in model input."""
        path = Path(catalog_path) if catalog_path is not None else Path(__file__).with_name("frozen_adversarial_cases.v0.1.json")
        try:
            catalog = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError("FROZEN_CASE_CATALOG_UNAVAILABLE_OR_INVALID") from exc
        if not isinstance(catalog, dict) or catalog.get("contract_version") != "reality-adversarial-cases-v0.1":
            raise ValueError("FROZEN_CASE_CATALOG_VERSION_MISMATCH")
        cases = catalog.get("cases")
        if not isinstance(cases, list):
            raise ValueError("FROZEN_CASE_CATALOG_CASES_INVALID")
        matches = [item for item in cases if isinstance(item, dict) and item.get("case_id") == case_id]
        if len(matches) != 1:
            raise ValueError("FROZEN_CASE_NOT_FOUND_OR_DUPLICATE")
        case = matches[0]
        if not isinstance(case.get("stimulus"), str) or not case["stimulus"].strip():
            raise ValueError("FROZEN_CASE_STIMULUS_INVALID")
        if not isinstance(case.get("expected_judgments"), dict) or not isinstance(case.get("ground_truth"), dict):
            raise ValueError("FROZEN_CASE_ORACLE_INVALID")
        return case

    def execute_frozen_case(
        self, case_id: str, model_adapter: ModelAdapter, receipt_path: str | Path | None = None
    ) -> dict[str, Any]:
        """Run only the frozen stimulus; keep ground truth and oracle out of model input.

        The returned evaluation remains NOT_EVALUATED until a separately trusted
        evaluator supplies independently grounded judgments and trusted context.
        No Reality action adapter is called here.
        """
        case = self.load_frozen_case(case_id)
        stimulus_bytes = case["stimulus"].encode("utf-8")
        model_input = [{"role": "user", "content": case["stimulus"]}]
        run_receipt = self.execute_blind_model_test(case_id, model_input, model_adapter)
        result: dict[str, Any] = {
            "receipt_version": "reality-frozen-case-run-v0.1",
            "case_id": case_id,
            "case_version": case.get("version"),
            "case_catalog_sha256": sha256_file(Path(__file__).with_name("frozen_adversarial_cases.v0.1.json")),
            "stimulus_sha256": hashlib.sha256(stimulus_bytes).hexdigest(),
            "execution": run_receipt,
            "judgments": {key: "NOT_EVALUATED" for key in ("detection", "diagnosis", "remediation", "containment", "abstention", "utility", "verification")},
            "evaluation_status": "NOT_EVALUATED",
            "production_containment_verified": False,
            "reason": "INDEPENDENT_EVALUATOR_AND_TRUSTED_ORACLE_CONTEXT_NOT_SUPPLIED",
        }
        if receipt_path is not None:
            self.write_jsonl_receipt(receipt_path, result)
        return result

    def execute_blind_model_test(
        self, test_case_id: str, conversation_input: list[dict[str, Any]], model_adapter: ModelAdapter
    ) -> dict[str, Any]:
        """The model adapter receives only the conversation, never evaluator labels."""
        receipt: dict[str, Any] = {
            "receipt_version": "reality-model-run-receipt-v0.1",
            "test_case_id": test_case_id,
            "benchmark_version": self.benchmark_version,
            "timestamp_utc": self._timestamp(),
            "model_metadata": None,
            "execution_status": "SYSTEM_FAULT",
            "raw_model_response": None,
            "response_sha256": None,
            "execution_error": None,
        }
        try:
            receipt["model_metadata"] = model_adapter.get_metadata()
            response = model_adapter.invoke_sequence(conversation_input)
            if response is None or response == "" or response == []:
                receipt["execution_error"] = "EMPTY_MODEL_RESPONSE"
                return receipt
            receipt["raw_model_response"] = response
            canonical = json.dumps(response, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            receipt["response_sha256"] = hashlib.sha256(canonical).hexdigest()
            receipt["execution_status"] = "COMPLETED"
        except Exception as exc:
            # Keep exception type/message for diagnosis; never convert it into a model failure/pass.
            receipt["execution_error"] = f"{type(exc).__name__}: {exc}"
        return receipt

    def evaluate_reality_containment_gate(
        self, run_receipt: dict[str, Any], reality_gate: RealityGateAdapter | None
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "receipt_version": "reality-containment-evaluation-v0.1",
            "test_case_id": run_receipt.get("test_case_id"),
            "benchmark_version": run_receipt.get("benchmark_version"),
            "model_execution_status": run_receipt.get("execution_status", "UNKNOWN"),
            "containment_status": "NOT_EVALUATED",
            "detection": "NOT_EVALUATED",
            "gate_action_taken": "NOT_EVALUATED",
            "evidence": None,
            "evaluation_error": None,
        }
        if run_receipt.get("execution_status") != "COMPLETED":
            result["containment_status"] = "SYSTEM_FAULT"
            result["gate_action_taken"] = "BLOCKED_NO_VALID_MODEL_OUTPUT"
            return result
        if reality_gate is None:
            result["evaluation_error"] = "REALITY_GATE_ADAPTER_NOT_CONFIGURED"
            return result
        try:
            # Adapter must return an auditable, structured decision from the actual gate under test.
            analysis = reality_gate.evaluate(
                test_case_id=run_receipt["test_case_id"],
                raw_model_response=run_receipt["raw_model_response"],
            )
            if not isinstance(analysis, dict) or not all(
                key in analysis for key in ("detection", "gate_action_taken", "containment_status", "evidence")
            ):
                result["evaluation_error"] = "INVALID_GATE_EVALUATION_SHAPE"
                return result
            result.update(analysis)
        except Exception as exc:
            result["containment_status"] = "SYSTEM_FAULT"
            result["gate_action_taken"] = "BLOCKED_GATE_EVALUATION_ERROR"
            result["evaluation_error"] = f"{type(exc).__name__}: {exc}"
        return result

    def verify_oracle_receipt(
        self, receipt: object, trusted_context: Any | None = None
    ) -> dict[str, Any]:
        """Verify an Oracle receipt only against separately supplied trusted context.

        This method is non-mutating. It never builds trusted context from receipt
        fields and never invokes a Reality action adapter. Missing trusted context
        remains NOT_EVALUATED; verifier rejection is recorded as REJECTED.
        Neither result asserts production containment.
        """
        result: dict[str, Any] = {
            "receipt_version": "reality-oracle-runner-evaluation-v0.1",
            "verification_status": "NOT_EVALUATED",
            "production_containment_verified": False,
            "reason": "TRUSTED_ORACLE_CONTEXT_NOT_SUPPLIED",
            "verification": None,
        }
        if trusted_context is None:
            return result
        try:
            # Local import keeps the existing runner usable without the optional
            # oracle dependency path and avoids any execution/action coupling.
            try:
                from .oracle_verifier import OracleVerificationError, verify_receipt
            except ImportError:
                from oracle_verifier import OracleVerificationError, verify_receipt
            verified = verify_receipt(receipt, trusted_context)
            result.update({
                "verification_status": "SEMANTICALLY_VERIFIED_AGAINST_TRUSTED_CONTEXT",
                "reason": None,
                "verification": verified,
            })
        except Exception as exc:
            # Fail closed and preserve a bounded, machine-readable error class.
            try:
                is_verification_error = isinstance(exc, OracleVerificationError)
            except UnboundLocalError:
                is_verification_error = False
            result["verification_status"] = "REJECTED" if is_verification_error else "SYSTEM_FAULT"
            result["reason"] = str(exc) if is_verification_error else f"{type(exc).__name__}: {exc}"
        return result

    @staticmethod
    def write_jsonl_receipt(path: str | Path, receipt: dict[str, Any]) -> None:
        """Append a receipt without silently overwriting prior run evidence."""
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps(receipt, ensure_ascii=False, sort_keys=True) + "\n")
