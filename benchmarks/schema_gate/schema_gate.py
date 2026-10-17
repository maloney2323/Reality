"""Fail-closed artifact integrity and JSON Schema gate; no scoring is performed here."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, SchemaError, ValidationError

SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
MANIFEST_VERSION = "reality-artifact-manifest-v1"
MANIFEST_SCHEMA_PATH = Path(__file__).with_name("manifest.schema.json")


class GateError(ValueError):
    """An input was not admitted by the integrity gate."""


def _read_regular_file(root: Path, relative: str) -> bytes:
    if not isinstance(relative, str) or not relative or "\\" in relative:
        raise GateError("INVALID_ARTIFACT_PATH")
    candidate_rel = Path(relative)
    if candidate_rel.is_absolute() or any(part in ("", ".", "..") for part in candidate_rel.parts):
        raise GateError("INVALID_ARTIFACT_PATH")
    root_resolved = root.resolve(strict=True)
    candidate = root_resolved.joinpath(candidate_rel)
    # Reject symlinks in any path component, including the final file.
    cursor = root_resolved
    for part in candidate_rel.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise GateError("SYMLINK_PATH_REJECTED")
    try:
        resolved = candidate.resolve(strict=True)
    except FileNotFoundError as exc:
        raise GateError("ARTIFACT_NOT_FOUND") from exc
    if not resolved.is_relative_to(root_resolved) or not resolved.is_file():
        raise GateError("PATH_OUTSIDE_ROOT_OR_NOT_FILE")
    return resolved.read_bytes()


def _require_sha256(value: Any, code: str = "INVALID_SHA256_FORMAT") -> str:
    if not isinstance(value, str) or SHA256_RE.fullmatch(value) is None:
        raise GateError(code)
    return value


def _parse_json(raw: bytes, code: str) -> Any:
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError(code) from exc


def _validate_manifest_shape(manifest: Any) -> None:
    """Compile and apply the checked-in manifest contract before reading any artifact."""
    try:
        schema = _parse_json(MANIFEST_SCHEMA_PATH.read_bytes(), "MANIFEST_SCHEMA_INVALID")
        Draft202012Validator.check_schema(schema)
        Draft202012Validator(schema).validate(manifest)
    except GateError:
        raise
    except (OSError, ValidationError, SchemaError) as exc:
        raise GateError("MANIFEST_SCHEMA_VALIDATION_FAILED") from exc


def verify_manifest(root: Path, manifest_path: str = "manifest.json") -> dict[str, Any]:
    raw = _read_regular_file(root, manifest_path)
    manifest = _parse_json(raw, "MANIFEST_JSON_INVALID")
    _validate_manifest_shape(manifest)
    artifacts = manifest["artifacts"]

    seen_ids: set[str] = set()
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, str]] = []
    for index, entry in enumerate(artifacts):
        artifact_id = entry.get("artifact_id") if isinstance(entry, dict) else None
        try:
            if not isinstance(entry, dict):
                raise GateError("ARTIFACT_ENTRY_INVALID")
            if not isinstance(artifact_id, str) or not artifact_id.strip() or artifact_id in seen_ids:
                raise GateError("ARTIFACT_ID_INVALID_OR_DUPLICATE")
            seen_ids.add(artifact_id)
            expected_hash = _require_sha256(entry.get("sha256"))
            schema_hash = _require_sha256(entry.get("schema_sha256"))
            artifact_bytes = _read_regular_file(root, entry.get("path"))
            if hashlib.sha256(artifact_bytes).hexdigest() != expected_hash:
                raise GateError("ARTIFACT_SHA256_MISMATCH")
            schema_bytes = _read_regular_file(root, entry.get("schema_path"))
            if hashlib.sha256(schema_bytes).hexdigest() != schema_hash:
                raise GateError("SCHEMA_SHA256_MISMATCH")
            schema = _parse_json(schema_bytes, "SCHEMA_JSON_INVALID")
            payload = _parse_json(artifact_bytes, "ARTIFACT_JSON_INVALID")
            try:
                Draft202012Validator.check_schema(schema)
                Draft202012Validator(schema).validate(payload)
            except Exception as exc:
                raise GateError("SCHEMA_VALIDATION_FAILED") from exc
            accepted.append({"artifact_id": artifact_id, "payload": payload})
        except GateError as exc:
            rejected.append({"artifact_id": str(artifact_id or f"index-{index}"), "reason": str(exc)})

    return {
        "manifest_version": MANIFEST_VERSION,
        "accepted_count": len(accepted),
        "rejected_count": len(rejected),
        "accepted_artifacts": accepted,
        "rejected_artifacts": rejected,
        "scoring_performed": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True, help="Evidence root directory")
    parser.add_argument("--manifest", default="manifest.json", help="Manifest path relative to root")
    args = parser.parse_args()
    try:
        result = verify_manifest(args.root, args.manifest)
    except (GateError, OSError) as exc:
        print(json.dumps({"gate_status": "REJECTED", "reason": str(exc), "scoring_performed": False}, indent=2))
        return 2
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["rejected_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
