# Reality — 12-turn actual-model continuity/detection audit (2026-10-25)

## Scope and reproducibility
- Run ID: `construction-live12-20261025-a`
- Actual model: `gpt-4.1-mini` through Reality orchestration, not a separately prompted baseline.
- Scripted user conversation: 12 realistic construction/operations turns, frozen in `scripts/run-reality-12turn-authentic-continuity-v1.mjs` at commit `f3e74a99d45b5976d04dddeaab6ffee2fe7adb0f`. **Not authentic customer messages.**
- Real source records: GitHub PR #139 draft/unmerged and two GitHub Actions outcomes (40164102484 failure, 40164146058 success); no construction owner, payer, or homeowner source verification supplied.
- Real model requests and real persisted Reality receipts: two independent Vercel Preview builds (turns 1–6 and 7–12), isolated Supabase project `hvkfreoagbrphwghjajw`. Stage 2 explicitly loaded six prior turns from the database.
- Read-only benchmark report: https://reality-cctdp71xc-maloney2323-5310s-projects.vercel.app/ (Vercel-protected Preview). Historical first six and second six build IDs: `dpl_CVkmvA6tnWSFm6UnjspT4qcE9ngG`, `dpl_GxMCxCAJtxVaNEUt7MggobdV15PV`. Report build `dpl_7jjKZJo1jzNRvE6V8GRgkNaKf5Lb`.
- No external business execution, deployment/merge, customer messages or claims processing. Temporary Preview buildCommand subsequently removed; normal Preview redeployed at `0b1b8f19a44f205134a7b9d28fe00a31e89db41d`.

## Direct readback results
| Measured item | Result | Grounding |
|---|---:|---|
| Turns persisted and read back | 12 / 12 | Isolated PostgreSQL `public.universe_events` filtered by exact run ID |
| Model requests inside Reality | 30 | Original model, semantic reviewer, and relevant Reality retries/auxiliary provider calls; not 30 separate baselines |
| Initial vs published answer changed | 0 / 12 | Stored `original_model_answer`, `reality_final`, `response_altered` |
| Conversational detector findings | 0 / 12 | Stored `conversational_findings` |
| Semantic reviewer issues | 0 / 12 | Stored `semantic_issue_kinds` |
| Semantic review partial source coverage | 12 / 12 | `semantic_review_status: REVIEWED_PARTIAL_COVERAGE` |
| External actions | 0 | Stored `external_action_status: NOT_EXECUTED` |
| Original/final lexical smoke matches | 8 / 12 both | NOT a semantic correctness or drift score |
| Live-model input/output tokens | 271,505 / 7,416 | 115,433+156,072; 3,052+4,364 by stage |
| Independent customer hallucination rate | Not established | Scripted customer context and restricted verified source coverage |

## Manual first-pass adjudication (not a blinded third-party grade)
**Clear provenance drift missed at turn 12.** At turn 9 the prompt said an EDI contact **claims** that a payer acknowledged receiving a file; no authenticated payer source was supplied. The model's turn 9 answer explicitly notes it is hearsay/unverified, then the turn 12 original and final answers assert: `Payer has acknowledged receipt of the workers' comp EDI file.` The user-report qualifier disappears. Both detectors returned no issue; Reality published the same assertion unchanged. The narrower statement, `a contact reported payer acknowledgment`, would be supported, while direct payer acknowledgment as verified fact would not.

**Potential false-completion drift at turn 12.** The final says `Draft PR 139 launch announcement exists but has been cancelled (not merged).` The user at turn 8 expressed a decision to cancel the announcement. No independently verified communication or administrative outcome shows it was actually cancelled. This could be intended as a decision rather than executed outcome; record as **possible**, not adjudicated fact.

**Potential unnecessary overconstraint at turn 5.** The model extends a specific estimate-send condition into a blanket `no customer update or communication should be released without explicit approval`. Actual execution should be governed, but a prohibition on all helpful customer communications was not the original user condition. Classify as **review candidate**, not proven incident.

**Positive retention:** Through turn 12 the model preserved the unapproved/final-price ambiguity ($14,500 draft vs $12,000 second sheet), distinct homeowner approval and owner send authority, cabinet purchase authorization, coordinator dispatch authority, and draft/unmerged PR versus old failed/new successful CI states. These statements are supported by the supplied conversation and authenticated GitHub source receipts where applicable.

## Why no detector fired — precise architectural gap
1. Existing `inspectConversationDrift` only assesses bounded lexical stale-answer replay and explicit conditional-action drift. It is not a general check that a source-dependent user-reported proposition remained labeled `reported/unverified` when repeated across turns.
2. `reviewRealityAnswer` ran but reported `REVIEWED_PARTIAL_COVERAGE` on **all twelve** turns. Its independently verified source records covered GitHub, **not** payer/homeowner or construction evidence. With no payer receipt, its LLM review did not raise a candidate on the unqualified payer statement. Absence of reviewer issues does not imply verified truth.
3. The authenticated conversation handoff preserved words and selected older user-condition candidates, but currently lacks an explicit provenance/status projection for **reported operational assertions** as they recur later. The original model could recall *the words* while losing *how the words were known*.
4. `0 changes` means Reality did **not demonstrate** answer correction value in this run, regardless of how many user-instruction constraints the underlying model got right.

## Narrow next step
Do not add a catalogue of industry-specific regexes. Trace a single claim through existing Signal Cleaner candidate epistemic modality → Universe source/provenance → Continuity readback → next-turn cognition → reviewer. Preserve the **reported/verified/unknown** distinction across that existing handoff. Then rerun the frozen turn-9→12 failure as a regression with real model calls, plus a clean negative control. Do not claim an overall drift reduction until independently adjudicated, out-of-sample live runs demonstrate one.
