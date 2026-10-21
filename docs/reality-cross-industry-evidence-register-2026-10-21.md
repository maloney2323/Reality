# Reality — Cross-Industry Evidence Register (2026-10-21)

**Interpretation:** Historical model and architecture evaluations, synthetic exercises and actual production integration are **not interchangeable**. All results below are bounded by their specific corpus, revision, scorer and environment. Preserve failures and passes, never aggregate percentages across unrelated runs.

## Primary reports inspected in connected Base44 source

| Evidence | Result recorded in original report | Base44 source locator | Qualification |
| --- | --- | --- | --- |
| Synthetic workers' compensation EDI consequence control | 15/15 final hard-pass invariants | `benchmarks/reality/epistemic-warrant-workcomp-edi-v0.1/results/run-001/{report.md,receipt.json}` | Synthetic only, no EDI filings; first two harness-modeling mismatches were corrected before final report |
| Workers' compensation four-lane comparison v0.1 | Reality PASS, OpenAI PASS, Gemini FAIL, deterministic consequence-disabled control FAIL | `benchmarks/reality/workcomp-edi-model-comparison-v0.1/{comparison-report.md,comparison-receipt.json,frozen-manifest.json}` | Reality used deterministic kernel (0 LLM calls). OpenAI standalone also passed; cannot claim this demonstrates standalone OpenAI is inherently unsafe |
| Distributed workers' compensation v0.2 | Reality PASS, OpenAI PASS, Gemini FAIL, deterministic control FAIL | `src/benchmarks/reality/workcomp-edi-architecture-v0.2/{comparison-report.md,comparison-receipt.json,frozen-manifest.json}` | Synthetic fragmented multi-agent control plane and history replay; no live external EDI |
| Long-conversation CP-12 forensic | Historical fabricated detail escaped via downstream fallback after detection | `base44/functions/reality-long-conversation-drift-test/entry.ts`; `base44/shared/reality-core/reliability-benchmark/long-conversation-drift-stress-test-001.js` | On 2026-10-21 final post-repair/post-completeness release gate implemented in Base44 with 11 deterministic no-model tests. Historical claim is not a fresh replay |
| Ungoverned OpenAI 50-case Astra baseline | 36/50 reported verified from preceding GitHub workflow | GitHub Actions [39593046811](https://github.com/maloney2323/Reality/actions/runs/39593046811), case IDs B01-B50 | Baseline-only. No legitimate Reality-vs-baseline outcome until exact real operating lane, scorer, evidence and version are bound |

## Historical secondary report (other ChatGPT audit, archived primary receipts still to bind)

- Governance: **24/24**; comparisons reported OpenAI **18/24** and Gemini **20/24**.
- Critical governance: **19/19**; reported zero unsafe authorizations.
- Capability comparison: **24/24**, two reported improvements.
- Epistemic repair: **0/8 → 8/8** after an architectural correction; maintain separate pre/post evidence.
- Construction: **6/6** office tasks, **3/3** combined workday tasks (~19 seconds reported), **16/16** synthetic readiness gates.
- Student workload: Reality **8/8**, GPT-4o mini **5/8**; separate v0.3 student execution positive outcome reported.
- Historical small-sample drift: baseline **2/12** = 16.7%, governed **1/12** = 8.3%; **not** a general hallucination probability.
- Generalization gauntlet: **failed acceptance**; reported unsafe permissions reduced **2 → 1**, unsupported consequential claims and temporal-state mistakes remained.

**Provenance status for these secondary entries:** `HISTORICAL_REPORTED_UNVERIFIED_PRIMARY_RECEIPT`. Model-summarized scores are not directly vouched for until corpus ID/hash, scorer, run receipt, branch/commit, runtime and model identity are linked.

## New code evidence in progress (not live production verification)
- Base44 checkpoint `6ad8c390bbd55e29c93a7567` adds a final known-denied-claim gate in **both** long-conversation and multi-conversation runners *after* completeness recovery, with **11/11 no-cost tests**.
- GitHub [PR #75](https://github.com/maloney2323/Reality/pull/75) is a **draft** for independent outcome checks, signed upgrade consent and replay protection, and mandatory final HTTP chat egress recheck; **11/11 CI workflows passed** on commit `c565e0271d0c2d2d0527f4ac118c53fe22e57637`.
- These checks catch specified false external-completion claims and known denied text spans. They do not prove general factual correctness, all paraphrase escapes, long-term drift elimination or live provider execution.

## Rules before a customer-facing superiority claim
1. Bind each score to immutable corpus hash, scorer version, provider/model, frozen conditions, code revision, execution receipt, detection and correct refusal/allowance semantics.
2. Report false positives, missed escalations, unsupported claims that escaped, wrongful actions, and successfully completed legitimate tasks.
3. Verify exact deployment parity and trusted provider readback before counting a production success.
4. Treat results as domain-specific. Do not market `0% hallucination`, universal error reduction, or full human-approved self-upgrade completion without independent end-to-end proof.

**Current status: promising historical source record; full present-day operating-loop integration and deployment proof remain open.**
