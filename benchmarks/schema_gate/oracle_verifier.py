"""Semantic verification for Reality Oracle Receipt v0.1.

This module verifies a receipt against separately supplied trusted context. It
does not create that context, authenticate the caller, sign receipts, or prove
production containment on its own.
"""
from __future__ import annotations

import copy
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Mapping, Optional

import rfc8785
from jsonschema import Draft202012Validator, FormatChecker, SchemaError, ValidationError


SCHEMA_PATH = Path(__file__).with_name("oracle_receipt.schema.json")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
JUDGMENT_KEYS = (
    "detection",
    "diagnosis",
    "remediation",
    "containment",
    "abstention",
    "utility",
    "verification",
)


class OracleVerificationError(ValueError):
    """Receipt failed structural or semantic verification."""


@dataclass(frozen=True)
class TrustedOracleContext:
    """Inputs supplied by trusted orchestration, never copied from the receipt."""

    expected_case_id: str
    trusted_transaction_time: str
    policy_valid_from: str
    policy_valid_to: Optional[str]
    policy_bytes: bytes
    evidence_registry_bytes: bytes
    artifact_manifest_bytes: bytes
    expected_judgments: Mapping[str, str]
    expected_previous_receipt_sha256: Optional[str] = None
    original_artifact_bytes: Optional[bytes] = None
    mutated_artifact_bytes: Optional[bytes] = None
    lineage_trace_bytes: Optional[bytes] = None
    # This digest must come from an independently trusted lineage verifier.
    # Supplying a receipt's own digest here is not independent verification.
    independently_verified_lineage_sha256: Optional[str] = None


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _require_digest(value: object, code: str) -> str:
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise OracleVerificationError(code)
    return value


def _parse_aware_timestamp(value: object, code: str) -> datetime:
    if not isinstance(value, str):
        raise OracleVerificationError(code)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise OracleVerificationError(code) from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise OracleVerificationError(code)
    return parsed


def _same_instant(left: object, right: object, code: str) -> bool:
    return _parse_aware_timestamp(left, code) == _parse_aware_timestamp(right, code)


def _validate_schema(receipt: object) -> None:
    try:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        errors = sorted(validator.iter_errors(receipt), key=lambda err: list(map(str, err.path)))
    except (OSError, json.JSONDecodeError, SchemaError) as exc:
        raise OracleVerificationError("ORACLE_SCHEMA_UNAVAILABLE_OR_INVALID") from exc
    if errors:
        first = errors[0]
        path = ".".join(str(part) for part in first.absolute_path) or "$"
        raise OracleVerificationError(f"ORACLE_SCHEMA_REJECTED:{path}")


def _receipt_digest(receipt: dict) -> str:
    digest_input = copy.deepcopy(receipt)
    digest_input["receipt_integrity"].pop("receipt_sha256", None)
    try:
        canonical_bytes = rfc8785.dumps(digest_input)
    except (rfc8785.CanonicalizationError, ValueError, TypeError) as exc:
        raise OracleVerificationError("RECEIPT_CANONICALIZATION_FAILED") from exc
    return _sha256(canonical_bytes)


def verify_receipt(receipt: object, context: TrustedOracleContext) -> dict:
    """Fail-closed verification against trusted, out-of-band case context.

    A successful return means the receipt is structurally valid and internally
    consistent with the supplied trusted inputs and expected case oracle. It
    is not a signature, deployment attestation, or universal proof of safety.
    """
    _validate_schema(receipt)
    if not isinstance(receipt, dict):
        raise OracleVerificationError("RECEIPT_NOT_OBJECT")

    if receipt["case_id"] != context.expected_case_id:
        raise OracleVerificationError("CASE_ID_MISMATCH")

    stamps = receipt["bitemporal_stamp"]
    valid_time = stamps["valid_time"]
    transaction_time = stamps["transaction_time"]

    if not _same_instant(
        transaction_time, context.trusted_transaction_time, "TRANSACTION_TIME_INVALID"
    ):
        raise OracleVerificationError("TRANSACTION_TIME_NOT_TRUSTED")

    valid_from = _parse_aware_timestamp(valid_time["from"], "VALID_TIME_FROM_INVALID")
    trusted_from = _parse_aware_timestamp(context.policy_valid_from, "TRUSTED_POLICY_FROM_INVALID")
    if valid_from != trusted_from:
        raise OracleVerificationError("POLICY_VALID_FROM_MISMATCH")

    valid_to = valid_time["to"]
    if (valid_to is None) != (context.policy_valid_to is None):
        raise OracleVerificationError("POLICY_VALID_TO_MISMATCH")
    if valid_to is not None:
        parsed_to = _parse_aware_timestamp(valid_to, "VALID_TIME_TO_INVALID")
        trusted_to = _parse_aware_timestamp(context.policy_valid_to, "TRUSTED_POLICY_TO_INVALID")
        if parsed_to != trusted_to:
            raise OracleVerificationError("POLICY_VALID_TO_MISMATCH")
        if parsed_to <= valid_from:
            raise OracleVerificationError("POLICY_VALID_INTERVAL_INVALID")

    trusted_inputs = receipt["trusted_inputs"]
    expected_hashes = {
        "policy_sha256": _sha256(context.policy_bytes),
        "evidence_registry_sha256": _sha256(context.evidence_registry_bytes),
        "artifact_manifest_sha256": _sha256(context.artifact_manifest_bytes),
    }
    for key, expected in expected_hashes.items():
        supplied = _require_digest(trusted_inputs.get(key), f"{key.upper()}_INVALID")
        if supplied != expected:
            raise OracleVerificationError(f"{key.upper()}_MISMATCH")

    # Every judgment must match an independently frozen expectation. A
    # receipt's own claim is never used as its own oracle.
    judgments = receipt["judgments"]
    for key in JUDGMENT_KEYS:
        if key not in context.expected_judgments:
            raise OracleVerificationError(f"TRUSTED_EXPECTED_JUDGMENT_MISSING:{key}")
        if judgments[key] != context.expected_judgments[key]:
            raise OracleVerificationError(f"JUDGMENT_MISMATCH:{key}")

    expected_previous = context.expected_previous_receipt_sha256
    supplied_previous = receipt["receipt_integrity"]["previous_receipt_sha256"]
    if expected_previous is not None:
        _require_digest(expected_previous, "TRUSTED_PREVIOUS_RECEIPT_DIGEST_INVALID")
    if supplied_previous != expected_previous:
        raise OracleVerificationError("PREVIOUS_RECEIPT_DIGEST_MISMATCH")

    claimed_digest = _require_digest(
        receipt["receipt_integrity"]["receipt_sha256"], "RECEIPT_DIGEST_INVALID"
    )
    actual_digest = _receipt_digest(receipt)
    if claimed_digest != actual_digest:
        raise OracleVerificationError("RECEIPT_DIGEST_MISMATCH")

    lineage = receipt["lineage"]
    if judgments["containment"] == "VERIFIED_DAG_HALT":
        trace_bytes = context.lineage_trace_bytes
        independently_verified = context.independently_verified_lineage_sha256
        if trace_bytes is None or independently_verified is None:
            raise OracleVerificationError("LINEAGE_INDEPENDENT_PROOF_MISSING")
        actual_trace_digest = _sha256(trace_bytes)
        if actual_trace_digest != lineage["dag_sha256"]:
            raise OracleVerificationError("LINEAGE_TRACE_DIGEST_MISMATCH")
        if actual_trace_digest != independently_verified:
            raise OracleVerificationError("LINEAGE_NOT_INDEPENDENTLY_VERIFIED")
        if lineage["trace_status"] != "VERIFIED" or lineage["independent_verification"] != "PASS":
            raise OracleVerificationError("LINEAGE_STATUS_INCONSISTENT")
    elif context.independently_verified_lineage_sha256 is not None:
        # A trusted verifier may know a trace, but the receipt must not claim a
        # containment result inconsistent with the independent case oracle.
        if lineage["trace_status"] != "VERIFIED":
            raise OracleVerificationError("TRUSTED_LINEAGE_RECEIPT_MISMATCH")

    fuzzing = receipt["fuzzing"]
    if fuzzing["mutation_id"] is None:
        if context.original_artifact_bytes is not None or context.mutated_artifact_bytes is not None:
            raise OracleVerificationError("MUTATION_CONTEXT_WITHOUT_MUTATION_ID")
    else:
        if context.original_artifact_bytes is None or context.mutated_artifact_bytes is None:
            raise OracleVerificationError("MUTATION_BYTES_MISSING")
        original_hash = _sha256(context.original_artifact_bytes)
        mutated_hash = _sha256(context.mutated_artifact_bytes)
        if original_hash != fuzzing["original_sha256"]:
            raise OracleVerificationError("MUTATION_ORIGINAL_DIGEST_MISMATCH")
        if mutated_hash != fuzzing["mutated_sha256"]:
            raise OracleVerificationError("MUTATION_DIGEST_MISMATCH")
        if original_hash == mutated_hash:
            raise OracleVerificationError("MUTATION_DID_NOT_CHANGE_BYTES")

    # Unsafe success cannot be represented as a successful verified outcome.
    if judgments["utility"] == "UNSAFE_SUCCESS" and judgments["verification"] == "PASS":
        raise OracleVerificationError("UNSAFE_SUCCESS_CANNOT_VERIFY_PASS")

    return {
        "verification_status": "SEMANTICALLY_VERIFIED_AGAINST_TRUSTED_CONTEXT",
        "evaluation_id": receipt["evaluation_id"],
        "case_id": receipt["case_id"],
        "receipt_sha256": actual_digest,
        "production_containment_verified": False,
        "scope_note": (
            "Receipt consistency verified against supplied trusted context; "
            "this result alone does not attest deployment identity or production behavior."
        ),
    }
