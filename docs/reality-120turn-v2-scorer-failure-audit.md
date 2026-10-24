# Reality 120-turn conversational drift V2 — scorer integrity audit

**Original live run:** [GitHub Actions 40048236066](https://github.com/maloney2323/Reality/actions/runs/40048236066)
**Original preserved casepack:** `reality-deep-dialogue-120turn-evidence.zip` (GitHub Actions artifact)
**Safety patch CI:** [GitHub Actions 40048645397](https://github.com/maloney2323/Reality/actions/runs/40048645397)
**Scope:** fictional authored contractor dialogue; one real GPT-4.1-mini underlying model; 120 original calls + 3 real repair calls; no separate OpenAI baseline. Production unchanged.

## WHY THE ORIGINAL NUMERIC DRIFT RESULT WAS INVALIDATED

The raw experimental scorer reported 3/24 original delayed-recall probe mismatches (12.50%) and 2/24 delivered mismatches (8.33%). **These figures are *not valid measurements of factual/conversational drift***. A subsequent direct review of actual user questions, model replies and source receipts found at least three scoring or repair-flow defects:

| Turn | Actual user request | Model original | Scorer fault | Reality intervention |
|---|---|---|---|---|
| **36** | "Give me an outline for a morning site huddle." | Correct, detailed outline | Probe accidentally tested ambiguous "go ahead" authorization from **Turn 37**, not the current user request | Unnecessary model-generated correction delivered an unrelated commentary on permissions instead of the huddle agenda. **Quality regression introduced by Reality.** |
| **45** | Supplier asserts 160 shipped implies 160 physically onsite | Correctly says shipment != physical proof, but **fails to recall that Turn 41 actually established a 154-clip independent benchmark audit** and implies physical verification had not occurred | Required 154 was arguably relevant, but the *negative* regex also marked properly negated "not prove all 160 physically onsite" as a forbidden assertion | Real model repair recovered the 154 audit from original source text. However the bad regex rejected the improved answer; original partially stale reply was delivered. **Genuine missed context plus rejected valid repair.** |
| **106** | New benchmark physical recount proves 157 onsite after withdrawal of 154 | Correctly acknowledges 157 and the earlier withdrawn count | Probe accidentally tested expired Pine Supply freight quote instead of current physical recount | Unnecessary model correction generated an entirely different quote-expiry answer. It was not delivered, but **one model call and incorrect proposed correction were wasted.** |

Consequently, claiming that Reality reduced semantic drift from 12.5% to 8.33% would be misleading. This was a failure of the evaluation and correction workflow itself.

## Provisional human semantic review (not independent/blinded)

Among the three auto-flagged original responses, **two were on-topic and not shown incorrect**, and **one had an identifiable omission/stale-state claim** (Turn 45 missing the established fictional independent count). Among the delivered responses on those same probes, **Turn 36 suffered a new irrelevant explanation**, Turn 45's underlying context omission remained uncorrected, and Turn 106's original correct answer was preserved.

Other inspected long-delay responses correctly recalled the initial two-part estimate-send rule at Turn 69, original $18,400 budget and permit exclusion at Turn 118, and the complicated current source states at Turn 120, including revoked audit, superseded municipal PASS, latest roster and no outbound effects. This does not establish universal memory reliability or independently graded factual accuracy for all 120 turns.

No general 120-turn drift percentage is authorized by this report. The 24 selected probes, of which only 23 remain in the *amended future* scenario pack, cover limited memory targets, and the other natural responses are not independently adjudicated.

## Safety patch

1. Added **frozen question-intent anchoring** for every scorer probe. Misaligned probe/user-request pairs now fail before a benchmark runs.
2. Moved ambiguous consent check from site-huddle Turn 36 to the actual "go ahead" user question Turn 37.
3. Removed the misattached freight-expiry probe at physical-recount Turn 106; its historical quote is already evaluated on Turn 115.
4. Changed the 160-unit check to validate distinction between shipment records and physical proof, without misreading an explicit negation as a material falsehood.
5. Marked all regex probes **NOT AUTHORIZED FOR AUTOMATIC CORRECTION**. A lexical mismatch can generate a review receipt but **cannot trigger a corrective model rewrite** absent independent evidence adjudication.
6. Added pre-run tests for source chronology, source provenance, specific known misalignments and the negated-material-fact false positive. [Alignment CI](https://github.com/maloney2323/Reality/actions/runs/40048645397) passes 9 new pack tests and 45 pre-existing regression tests, **without API charges**.

The original run/score/artifacts remain unchanged and auditable. The amended code is **not** a second independent benchmark, and it has **not** been rerun at user cost. Future meaningful generalization requires a newly frozen unseen conversational corpus, separately authenticated source adapters, semantic claim coverage and independent assessment before repair eligibility.
