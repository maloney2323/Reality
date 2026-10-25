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
