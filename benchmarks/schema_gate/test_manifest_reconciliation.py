"""Manifest contract regressions: malformed structure aborts before artifact reads."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from schema_gate import GateError, verify_manifest


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


class ManifestReconciliationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "artifacts").mkdir()
        (self.root / "schemas").mkdir()
        self.payload = b'{"ok":true}'
        self.payload_schema = b'{"type":"object","required":["ok"],"properties":{"ok":{"type":"boolean"}},"additionalProperties":false}'
        (self.root / "artifacts" / "case.json").write_bytes(self.payload)
        (self.root / "schemas" / "case.schema.json").write_bytes(self.payload_schema)
        self.entry = {
            "artifact_id": "case-001",
            "path": "artifacts/case.json",
            "sha256": sha256(self.payload),
            "schema_path": "schemas/case.schema.json",
            "schema_sha256": sha256(self.payload_schema),
        }
        self.write_manifest()

    def tearDown(self):
        self.tmp.cleanup()

    def write_manifest(self, manifest=None):
        value = manifest if manifest is not None else {
            "manifest_version": "reality-artifact-manifest-v1",
            "artifacts": [self.entry],
        }
        (self.root / "manifest.json").write_text(json.dumps(value), encoding="utf-8")

    def test_valid_manifest_reconciles_exact_bytes(self):
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 1)
        self.assertEqual(result["rejected_count"], 0)
        self.assertFalse(result["scoring_performed"])

    def test_uppercase_hash_aborts_manifest(self):
        poisoned = dict(self.entry, sha256=self.entry["sha256"].upper())
        self.write_manifest({"manifest_version": "reality-artifact-manifest-v1", "artifacts": [poisoned]})
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_unexpected_top_level_field_aborts_manifest(self):
        self.write_manifest({
            "manifest_version": "reality-artifact-manifest-v1",
            "artifacts": [self.entry],
            "unauthorized_injection_payload": "reject",
        })
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_unexpected_artifact_field_aborts_manifest(self):
        poisoned = dict(self.entry, unexpected="reject")
        self.write_manifest({"manifest_version": "reality-artifact-manifest-v1", "artifacts": [poisoned]})
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)

    def test_path_traversal_aborts_manifest_structure_gate(self):
        poisoned = dict(self.entry, path="../outside.json")
        self.write_manifest({"manifest_version": "reality-artifact-manifest-v1", "artifacts": [poisoned]})
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)


    def test_artifact_byte_tampering_is_rejected(self):
        (self.root / "artifacts" / "case.json").write_bytes(b'{"ok":false}')
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 0)
        self.assertEqual(result["rejected_artifacts"][0]["reason"], "ARTIFACT_SHA256_MISMATCH")

    def test_schema_byte_tampering_is_rejected(self):
        (self.root / "schemas" / "case.schema.json").write_bytes(b'{"type":"string"}')
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 0)
        self.assertEqual(result["rejected_artifacts"][0]["reason"], "SCHEMA_SHA256_MISMATCH")

    def test_missing_artifact_is_rejected(self):
        poisoned = dict(self.entry, path="artifacts/missing.json")
        self.write_manifest({"manifest_version": "reality-artifact-manifest-v1", "artifacts": [poisoned]})
        result = verify_manifest(self.root)
        self.assertEqual(result["accepted_count"], 0)
        self.assertEqual(result["rejected_artifacts"][0]["reason"], "ARTIFACT_NOT_FOUND")

    def test_malformed_manifest_json_aborts(self):
        (self.root / "manifest.json").write_bytes(b'{"manifest_version":')
        with self.assertRaisesRegex(GateError, "MANIFEST_JSON_INVALID"):
            verify_manifest(self.root)

    def test_alternate_evidence_registry_contract_is_not_silently_accepted(self):
        self.write_manifest({
            "manifest_version": "reality-artifact-manifest-v1",
            "test_case_id": "TC-001-DRIFT",
            "target_workstream": "ledger_check",
            "evidence_registry": [],
        })
        with self.assertRaisesRegex(GateError, "MANIFEST_SCHEMA_VALIDATION_FAILED"):
            verify_manifest(self.root)


if __name__ == "__main__":
    unittest.main()
