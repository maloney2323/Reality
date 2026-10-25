# Reality — live genuine-model conversational correction audit

Date: 2026-10-25
Benchmark run: `real-conversation-proof-20261025-a`
Model: **GPT-4.1-mini**
Environment: isolated Vercel Preview on draft PR #140; protected PostgreSQL benchmark project `hvkfreoagbrphwghjajw`.
This is a scripted user workday with **actual paid model responses**, not real customer-source records.

## What actually ran
- Source-linked archive: 12 earlier real-model cold-chain turns; eight prior user/assistant turns were rehydrated for a new four-turn conversation.
- Live reviewer separately reexamined the exact **original first GPT-4.1-mini answer from old turn 9**, response ID `resp_0a0069051ffa92bf006ade58f2a98887d2af000e6816d0d29f`, which incorrectly recommended `NOT DELIVERED` when delivery status was unknown.
- Four **new** GPT-4.1-mini first answers were generated through the complete Reality unified runtime and saved alongside actual final released answers and detector/correction receipts in isolated PostgreSQL.
- 14 genuine API model requests in Reality including archived-answer review, 210,461 input tokens and 6,099 output tokens.
- All four fresh turn readbacks and source-linked canonical frame receipts passed. No external actions executed. No invented model responses or mocked transports during this live run.

## Direct measurements

| Measure | Result |
|---|---:|
| Old genuine model error recognized on rereview | **No** |
| New actual underlying-model turns | **4** |
| Reality's conversational-drift findings | **0 / 4** |
| Semantic review raised at least one issue | **2 / 4** |
| Final answer altered | **2 / 4** |
| Changed answers that were evidence warnings appended to unchanged original | **2 / 2** |
| Released rewritten and re-reviewed corrections | **0 / 4** |
| Verifiably fixed genuine mistakes | **0** |
| External operational actions | **0** |

### Case-by-case manual transcription audit (NOT independent blind grading)

1. **Turn 1, delivery status**: Original first answer said do not mark `DELIVERED` without verified receipt; maintain hold and seek proofs. No detected finding, no modification. Consistent with relevant constraints. The archived older `NOT DELIVERED` error did **not** recur in the fresh answer.
2. **Turn 2, invoice status**: Original first answer correctly distinguished `UNKNOWN/UNRESOLVED` from both `PAID` and `UNPAID`, preserved CX-204 quarantine. No finding or modification. No correction necessary.
3. **Turn 3, unrelated batch and cancellation**: Raw answer correctly separated internal draft cancellation from entire contract and the two batches, BUT stated `no signed or verified QC release exists yet for batch CX-204`; the user merely said **none is verified**, which does not independently establish that no signed release exists. The model also loosely changed who reported the alleged cancellation. Semantic reviewer instead raised `UNSUPPORTED_FACT` on a separate already-attributed `worker stated` claim; Reality appended a generic evidence warning while retaining the original answer verbatim. **No substantive correction.**
4. **Turn 4, long-running recap**: Raw answer placed `A signed QC release document exists for batch CX-205 (per manager report)` within a section titled **What We Actually Know (Verified or Firmly Understood)**, despite no verified QC document being supplied. The parenthetical acknowledges the report, but the heading misclassifies its evidence status. The answer also asserted `No authorized shipping instructions or supervisor approval exist` where non-verification, not independently established nonexistence, was the factual basis. Semantic reviewer instead flagged a properly qualified `reportedly live (per software colleague)` phrase as unsupported; Reality appended a generic warning without correcting the claims. **No substantive correction.**

These are **reviewer-adjudicable transcript-level issues**, not independently verified external-world errors or production hallucination rates. The comparison does **not** demonstrate any measurable error reduction.

## Architectural diagnosis

The direct conversation comparison is connected and will produce a corrected answer on a mocked contradiction/repair test, but the real model's reviewer is still **missing false/unknown and report/verified changes**. The reviewer's `UNSUPPORTED_FACT` candidates are also sometimes unrelated to the material error, because it misinterprets properly attributed statements as unqualified claims. When it merely appends an unresolved evidence notice, the actual claim is not rewritten or reconciled. The canonical state and readback improve traceability but do not, by themselves, make the semantic classifier consistently correct.

**Actionable next engineering target**: in the existing conversation and output comparison, evaluate *the same proposition's scope, speaker, polarity, verification level and changes across turns*. Treat `unknown` as a first-class state, not true or false. Demand specific source quote and exact output quote for a proposed correction, and test that a reviewed corrected answer actually replaces the unsupported statement. Do not add a second warning layer. Calibrate against cases that are already correct, including quoted/attributed source statements, to reduce false alarms.

The test was not changed or tuned after launch. No production merge or promotion.

## Source links
- [Protected immutable Vercel report](https://reality-pjgiyyxiu-maloney2323-5310s-projects.vercel.app/)
- [Draft PR #140](https://github.com/maloney2323/Reality/pull/140)
- Raw first-versus-final and reviewer receipts: `public.universe_events`, filter `payload->>'run_id'='real-conversation-proof-20261025-a'`, `payload->>'benchmark_kind'='GENUINE_LLM_CONVERSATION_COMPARISON'`.
