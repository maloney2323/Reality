"""Compose and verify Oracle receipts from a bound run and trusted context.

No trusted values are inferred from the model response or adjudication. The
trusted context must be assembled by a separately controlled orchestrator.
"""
from __future__ import annotations

import copy
import hashlib
from typing import Any

import rfc8785

try:
    from .independent_adjudicator import validate_adjudication
    from .oracle_verifier import TrustedOracleContext, verify_receipt
except ImportError:
    from independent_adjudicator import validate_adjudication
    from oracle_verifier import TrustedOracleContext, verify_receipt


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def receipt_without_digest(receipt: dict[str, Any]) -> dict[str, Any]:
    payload = copy.deepcopy(receipt)
    payload["receipt_integrity"].pop("receipt_sha256", None)
    return payload


def build_and_verify_oracle_receipt(
    run_receipt: dict[str, Any],
    adjudication: dict[str, Any],
    trusted_context: TrustedOracleContext,
    *,
    evaluation_id: str,
) -> dict[str, Any]:
    """Build a receipt only when independent judgments match frozen trusted oracle.

    trusted_context.expected_judgments must not be populated from the
    adjudication being checked.
    """
    adjudicated = validate_adjudication(run_receipt, adjudication)
    if adjudicated["case_id"] != trusted_context.expected_case_id:
        raise ValueError("TRUSTED_CASE_ID_MISMATCH")
    if adjudicated["judgments"] != dict(trusted_context.expected_judgments):
        raise ValueError("ADJUDICATION_DIFFERS_FROM_TRUSTED_EXPECTED_JUDGMENTS")
    if not isinstance(evaluation_id, str) or not evaluation_id.strip():
        raise ValueError("EVALUATION_ID_REQUIRED")

    receipt: dict[str, Any] = {
        "contract_version": "reality-oracle-v0.1",
        "evaluation_id": evaluation_id,
        "case_id": trusted_context.expected_case_id,
        "bitemporal_stamp": {
            "transaction_time": trusted_context.trusted_transaction_time,
            "valid_time": {"from": trusted_context.policy_valid_from, "to": trusted_context.policy_valid_to},
        },
        "trusted_inputs": {
            "policy_sha256": _sha256(trusted_context.policy_bytes),
            "evidence_registry_sha256": _sha256(trusted_context.evidence_registry_bytes),
            "artifact_manifest_sha256": _sha256(trusted_context.artifact_manifest_bytes),
        },
        "judgments": dict(adjudicated["judgments"]),
        "lineage": {"trace_status": "MISSING", "dag_sha256": None, "independent_verification": "NOT_EVALUATED"},
        "fuzzing": {"mutation_id": None, "seed": None, "original_sha256": None, "mutated_sha256": None, "mutation_description": None},
        "receipt_integrity": {
            "canonicalization_version": "RFC8785-JCS-excluding-receipt-digest-v0.1",
            "receipt_sha256": "0" * 64,
            "previous_receipt_sha256": trusted_context.expected_previous_receipt_sha256,
        },
    }
    receipt["receipt_integrity"]["receipt_sha256"] = _sha256(rfc8785.dumps(receipt_without_digest(receipt)))
    verification = verify_receipt(receipt, trusted_context)
    return {
        "status": "ORACLE_RECEIPT_VERIFIED_AGAINST_TRUSTED_CONTEXT",
        "receipt": receipt,
        "verification": verification,
        "adjudication": {
            "adjudication_status": adjudicated["adjudication_status"],
            "adjudication_id": adjudicated["adjudication_id"],
            "response_sha256": adjudicated["response_sha256"],
        },
        "production_containment_verified": False,
        "limitations": [
            "Receipt verification does not authenticate evaluator identity or blindness.",
            "TrustedOracleContext must be constructed by a separately controlled orchestrator.",
            "This result does not attest deployment identity or production behavior.",
        ],
    }
