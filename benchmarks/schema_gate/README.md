# Reality Schema Gate (isolated Python evaluator)

Status: integration candidate; not a production gate and not evidence of detector accuracy.

This package verifies a manifest and artifact bytes before any artifact is admitted to evaluation. It is deliberately isolated from Reality's Node.js runtime.

## Contract

Manifest JSON shape (frozen `reality-artifact-manifest-v1`; the alternate `evidence_registry` shape is not accepted):

```json
{
  "manifest_version": "reality-artifact-manifest-v1",
  "artifacts": [
    {
      "artifact_id": "example-case-001",
      "path": "artifacts/case-001.json",
      "sha256": "64 lowercase hexadecimal characters",
      "schema_path": "schemas/case.schema.json",
      "schema_sha256": "64 lowercase hexadecimal characters"
    }
  ]
}
```

The checked-in `manifest.schema.json` is compiled and applied before any artifact file is opened. Unexpected top-level or artifact fields, malformed or uppercase hashes, and paths outside the frozen relative JSON layout abort the manifest as a whole. All paths are relative to the supplied evidence root. Absolute paths, parent traversal, symlinks, missing files, duplicate IDs, malformed or uppercase hashes, digest mismatches, malformed JSON, and schema failures are rejected. Only accepted artifact records are returned to a caller; rejected records cannot be included in its score unless the caller ignores this contract.

## Oracle receipt contract

`oracle_receipt.schema.json` defines the proposed `reality-oracle-v0.1` receipt shape. See [ORACLE_CONTRACT_V0_1.md](ORACLE_CONTRACT_V0_1.md) for the semantics and verification boundaries.

The schema requires bitemporal stamps and trusted-input digests, keeps detection/diagnosis/remediation/containment/utility/verification distinct, and rejects `VERIFIED_DAG_HALT` unless a verified lineage digest and independent verification PASS are present. `BLOCKED_DRY_RUN` is explicitly not production containment.

Schema validity is only structural validation. The receipt producer, canonical digest calculator, trusted temporal policy resolution, lineage provenance verifier, signature and append-only persistence, mutation generator, and production interception are not implemented by this contract alone. Do not claim those capabilities based on these schema tests.

## Run

```sh
python -m pip install -r benchmarks/schema_gate/requirements.txt
python -m unittest discover -s benchmarks/schema_gate -p 'test_*.py' -v
python benchmarks/schema_gate/schema_gate.py --root benchmarks/schema_gate/fixtures --manifest manifest.json
```

The fixture command is a smoke test only. Do not report its fixture counts as Reality performance. Candidate archive provenance and its own original tests remain separate; this harness does not replace or silently rewrite them.
