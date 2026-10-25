# Real model proof — Reality-internal side-by-side, no standalone baseline

**Run intended: one capped GitHub Actions execution, protected experimental branch only.**

## User-directed correction
The user explicitly does **not** want separate model-only benchmark spending. All model calls go through Reality's existing cognitive runtime. We compare:
- The ORIGINAL real model answer inside Reality, BEFORE Reality's verifier intervenes.
- Reality's actual final/displayed answer, AFTER source-backed contradiction detection, quarantine, and correction.
- Detection evidence, Continuity verification receipt, action authority, actual input/output tokens, and model latency.

The model is `gpt-4.1-mini` via the real OpenAI Responses API. Every step in the casepack is fictional construction-world data held in an isolated mocked Supabase-compatible event store. The data are not real homeowner/supplier/city records.

## Challenge and scoring contract
- 16 continuous authored construction turns with misleading rumors, stale city screenshots, late scope withdrawal, prompt injection, changed approval, city HOLD and coordinator approval conflict.
- A stable trusted synthetic source ledger advances as events occur.
- Exactly zero standalone baseline calls; actual real model generation and quote-extraction calls in the Reality path are measured, bounded at 70 provider calls.
- The original model answer is taken from provider transport BEFORE Reality quarantine; do not confuse a post-correction user-visible answer with the model's true first attempt.
- The existing detection and source-attested extraction remain in place, as do deterministic authority and receipt verification. No actions can execute.
- No raw model error rate, Reality error rate, percentage improvement, false-positive or recovery rate is asserted until the relevant turns have been independently reviewed against the frozen source timeline.
- Do not equate 0 detector alerts with 0 model errors.
- No external business action and no real customer database writes.
- No retry loop, no second model judge for grading, and no new architecture layer.

## Key evidence requirements
Every step records original model response, Reality displayed response, source receipt, detector codes, proposed correction, quarantine flag, score coverage status, call count and provider token use. Preserve partial results if a provider error interrupts the run.

## Current limitations
Even a passed run is only a **real-model, synthetic-source, mocked-durable-store** proof. It does not establish production source authenticity, authorized execution of external effects, or broad elimination of hallucination and conversational drift. The Proof Lab UI requires its own evidence presentation and should show these limitations visibly.

## Real model outcome — completed and preserved

GitHub run: https://github.com/maloney2323/Reality/actions/runs/40152303807
Artifact: `reality-real-model-full-loop-original-evidence` (ID 12583092453)
Exactly **16 real model generations** and **16 quote-extraction calls**, 32 provider requests, **0 standalone baseline calls**, total 61,699 input tokens and 4,433 output tokens, all with `gpt-4.1-mini`. Each original provider answer, Reality final answer, source-backed verification receipt and detector flags was preserved.

### Non-blind preliminary review — DO NOT market as verified rates
A manual examination of all 16 original-vs-final response pairs against the frozen fictional casepack observed:
- **Original model apparent error turns:** 9 (contradictory homeowner-approval reasoning), 14 (answered prior HOLD rumor instead of current email permission), 15 (answered prior estimate-send question instead of current dispatch request). Three apparent error turns in 16.
- **Reality final apparent error turns:** 1 and 5 (incorrectly quarantined correct original responses), 9 (a cabinet date source correction displaced the actual approval question), 14 and 15 (same wrong-topic responses were released). Five apparent error turns in 16.
- One Reality focus candidate flagged Turn 14 but **did not contain** the output; Turn 15 originally did not trigger a focus candidate despite answering the wrong action. The experimental focus matcher is now extended with a requested-action coverage review and exact original-response regression cases.
- Three total quarantines at Turns 1, 5, 9; **none establishes a verified corrected user objective** in this review. Quarantine count must NOT be marketed as “errors prevented.”
- Quote extraction failed its source-quote invariant on Turns 2, 6, 14, 16; the reliability receipt correctly marks those as **NOT_EVALUATED**. This makes broad error-rate claims inappropriate.
- No externally authorized business effects or real provider-connected source events took place. The source-ledger and Continuity DB are simulated. Provider inference was real.

These findings **do not support a reliability improvement in this run**. Initial observed error-turn counts (3 raw versus 5 final) are specifically labeled **non-blind provisional review**, not independent semantic adjudication or causal performance estimates.

### Correct development decision
Keep this PR draft and prevent production promotion. Improve the source-claim extraction false positives, stop inappropriate containment, enforce current requested action coverage, and separately verify corrections and publish-gate behavior. Rerun Reality-only on held-out turns only after source-backed regression acceptance. Do NOT waste budget on standalone model baselines or silently revise these original receipts.

The existing `full-loop-proof.html` Proof Lab UI now contains a Reality internal comparison section that accepts this experiment's JSON and shows the true original provider output versus the actual final response, its candidate findings and source receipts. It is preview-branch code, **not yet a verified customer-facing deployment**.


## Repair-first rerun — scope
Run a single opt-in real-model benchmark through the **existing Reality model gateway** with
pre-generation current-turn alignment, conservative source-backed quarantine and
a maximum of one current-action correction attempt when required.
Preserve first original model text, any retry, all receipts and released answers.
Prior 16-turn raw evidence is frozen and must not be overwritten.
No standalone model-only lane, no real customer actions, no production merge.
