# Proof 1 — real GitHub failure-to-passing regression verification

Date: 2026-10-24
Repository: maloney2323/Reality
Scope: read-only external provider verification on draft branch. NO deployment promotion, model API call, production mutation or customer effect.

## External evidence
- Historical failing run: [40120398452](https://github.com/maloney2323/Reality/actions/runs/40120398452), same Github workflow id 395257693, SHA `18a74fe51bab49131e257c4c7871a672345d7b7e`, failed. Contract test **real orchestration path sees prior ledger evidence and detects model contradiction via quote extraction** failed because output included `FACT_DRIFT` and `EVIDENCE_PROVENANCE_DRIFT` but assertion expected only `FACT_DRIFT`. The job showed 46 passes and 1 fail.
- Later passing run: [40140138344](https://github.com/maloney2323/Reality/actions/runs/40140138344), SAME workflow id 395257693, SHA `731c40581afa70b6b2a3eae38f2c9e6ca9ac10b3`, succeeded. The EXACT same named test passed; the larger suite showed 72 passes and zero failures.
- Reality's source-owned read-only verifier retrieved *both* historical run metadata, their run job lists, and job log text directly from authenticated GitHub Actions APIs. It refused claims when repository, run ID, workflow ID, test name, SHA, status or log results did not match.
- New [External GitHub Regression Proof workflow run #40142557814](https://github.com/maloney2323/Reality/actions/runs/40142557814) succeeded: 6/6 scorer/adversarial tests, provider API read-back succeeded, machine-readable JSON receipt uploaded as artifact `reality-github-historical-regression-evidence`.
- SHA-256 of the factual receipt in that workflow's log: `26f0eafbdd5f5648c14229ab72c35775bcf2ed6b32d3b356a5916927926dbe5c`. This is integrity metadata **not** an external timestamp anchor or signature.

## Important claim limits
- `verified_historical_regression: true` — GitHub attested that the original test failed, while a later commit's same test passed.
- `independently_observed_external_workflow_results: true` — a read-only GitHub API adapter re-read actual remote status and logs.
- `autonomously_discovered_or_repaired_by_reality: false` — no autonomous model agent was observed diagnosing, editing or testing that earlier fix; the after commit came from pre-existing development work.
- `independent_proof_of_causal_fix: false` — the test result changed; full attribution of cause to a particular code change is a separate forensic analysis.
- `model_vs_reality_comparison_complete: false`; `number_of_measured_human_interventions: null`; `supervision_minutes_saved: null`; `actual_model_tokens: null`. Do not advertise agentic hallucination reduction, supervisory ROI or competitor superiority from this record.
- This proof was **not a new failing operation that Reality repaired**. It verified an actual prior failure-to-pass evolution from real external evidence. This is narrower than complete autonomous recovery.

## Next acceptance gate
Bind an actual *current* GitHub failure to a frozen work item and success predicate. Let Reality's own runtime discover, plan and propose the repair on a non-production branch, observe its action, verify the changed remote source and GitHub Actions result via independent source-owned read-back, preserve continuity across restarts, and count real human review minutes and paid model usage. No merge/deploy without explicit scoped approval. Only after this should competitor comparison be undertaken on identical tasks with matched tools and budgets.

Implementation: `src/reality-github-regression-evidence-v0.1.js`, unit tests `test/reality-github-regression-evidence-v0.1.test.js`, live CLI `test/run-reality-github-regression-evidence-v0.1.mjs`, and `.github/workflows/reality-github-external-regression-proof-v0.1.yml`.
