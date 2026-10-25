# Selective Cognitive Alignment v0.2 — 12-turn test and evidence contract

**Status:** Experimental on draft PR #126, not production.

## Diagnosis grounded in completed v0.1 original outputs

From the preserved 12-turn original answers:
- **Turn 8 preventive** answered the previous estimate-send question, not the new dispatch-and-material-order question.
- **Turn 9 preventive** answered the previous dispatch question, not the new inspection PASS/site-board question.
- **Turn 10 preventive** focused on site board PASS, not the foreman's stale-PENDING query; much of the response lagged the current task.
- **Turn 11 preventive** answered the previous inspection question, not the new verified-homeowner-approval versus external-send-authorization question.
- **Turn 12 preventive** identified the late-recorded city HOLD and correctly blocked unauthorized dispatch. **Turn 12 reactive** acknowledged HOLD but still advised showing PASS on the site board.

The repeated one-turn lag suggests current-task prioritization failed in the full-context
packet. **Cause not proven**; possible overlong state/history and conflicting focus.
Original evidence: GitHub Actions run 40146647873, artifact
`reality-pre-cognition-12turn-original-model-pairs`. These are inspected
model outputs, not blind adjudicated benchmark scores.

## Hypothesis
A compact packet whose **first field is the current user objective**, with only
topically relevant bitemporal state and existing user-condition receipts, may
reduce unrelated-answer continuation without losing decisive operational truth.

## Paired intervention
A: `FULL_CONTEXT_V01` — exact previous full pre-generation orientation
construction, including broad source facts and invariant frame.

B: `SELECTIVE_V02` — current user request and source ref first, then
retrieved relevant facts (not unrelated history topics), source timestamps,
necessary original user rules, active action prerequisites, epistemic unknowns.

**Controls**: both arms use `src/reality-model-gateway-v0.1.js`, the
same gpt-4.1-mini model and frozen 12 authored user turns; both receive the
same underlying canonical source records and as-of source-frame hash. B
intentionally receives a narrower *visible subset* of those shared records.
The model sees previous answers from its own arm, so histories subsequently
diverge; this is a cumulative-drift test, not a strict same-state causal
ablation. Provider randomness remains uncontrolled. No standalone OpenAI
baseline, separate model judge or customer data.

## Measured outputs
- Per-turn original answer, provider response ID, digest, model usage,
  wall-clock latency, mode, prior turn count and receipt refs
- Current source frame hash (same per turn), bitemporal city status and
  authorization preflight, relevant fact count and capsule hash
- Existing post-generation detector findings and *provisional* lexical flags
- No automatic claim of "prevented" incidents, improved drift percentage,
  verified zero drift, actual cost saving, or executed business action.

A domain reviewer must assess at least Turns 8,9,10,11,12 against the frozen
casepack: wrong-topic answer, relevant fact/state correctness, authority
accuracy, and source temporal correctness. Include BOTH false positives and
false negatives, and separate answer quality from deterministic sandbox gates.

## Criteria for the next decision
Technical correctness: all frozen regression tests pass, 24 raw model calls
complete, the source snapshots match per turn, the original text remains
unchanged and no external action fires.

Exploratory direction: fewer actual wrong-topic answers than full v0.1
without worsening critical source-state or authority results; compare
per-turn and total token/latency costs, including added context overhead.

If v0.2 appears better, replicate in randomized held-out shared-history
and genuine continuous 25/100-turn cases before claiming improvement. If not,
leave it experimental; **do not rebuild Reality or ship a weak result**.

Activation: commit tag `[live-selective-v02]` triggers exactly one capped
live model run after contract checks; see matching workflow. Never automatically
repeat a paid benchmark in a loop.


## Completed v0.2 matched live test (2026-10-24/25 UTC)

**Evidence source:** GitHub Actions
https://github.com/maloney2323/Reality/actions/runs/40147721871
Raw artifact: \`reality-selective-alignment-v02-12turn-paired-raw\`
(artifact ID \`12580359435\`, 24 original model answers and their receipts).
Model \`gpt-4.1-mini\`, 12 original responses/arm, **24** live model calls
in this completed run; no retries, no separate model judge, no external
actions, no production changes.

| Observation | Full v0.1 | Selective v0.2 |
|---|---:|---:|
| Provider calls | 12 | 12 |
| Actual input tokens | 54,614 | 41,494 |
| Actual output tokens | 1,034 | 1,076 |
| Input + output tokens | 55,648 | 42,570 |
| Sum of measured provider latencies | 15,724 ms | 15,820 ms |
| Clear current-topic miss on reviewed turns | Turn 8 | None apparent in 12 |
| Correct source-time status on Turn 12 | HOLD | HOLD |
| Separate authorization retained on Turn 11 | Yes | Yes |
| Existing Integrity Spine detector candidates | 0 | 0 |

**Selective packet saved 13,120 input tokens (~24.0%) and 13,078
input+output tokens (~23.5%) against full v0.1 in this one matched run.**
Its measured provider-request latency **did not improve** (96 ms higher
in summed time). Those measurements do not include downstream human review.

### Original-output inspection

- Full-v0.1 Turn 8: wrongly answered "the estimate is not cleared to
  send" when the current question was whether the crew may dispatch and
  materials may be ordered. This is a clear conversational misalignment
  despite retaining a true restriction.
- Selective-v0.2 Turn 8: directly answered no dispatch and no purchasing
  without their separate verified authorizations.
- Turns 9–10: both arms used inspection PASS (as recorded then), and
  selective v0.2 also directly addressed the foreman's stale report.
- Turn 11: both arms separated homeowner-approved scope from explicit
  authorization to **send** and did not claim an external send occurred.
- Turn 12: both arms used the retroactively effective but newly recorded
  city HOLD and declined unauthorized dispatch.
- Across these twelve responses, manual **non-blind** direct inspection found
  **one obvious wrong-topic answer in full v0.1 and none in selective v0.2**.
  These are limited qualitative observations, not independently
  adjudicated drift-rate estimates. Answers in the two arms were generated
  stochastically with separately accumulating assistant histories.

### New detector weakness exposed

The existing conversation Integrity Spine returned **no drift
candidate on the full-v0.1 Turn 8 wrong-topic answer**, a concrete
observable false negative to investigate. A separate **bounded** v0.2
current-turn relevance assessor now produces a review candidate for
that pattern and abstains on unknown topics. It is **not a semantic
ground-truth verifier**, and it has not yet been used to re-score the
complete paid run. Its first regression test caught and then corrected
a false positive where a harmless mention of the foreman was treated
as requiring foreman-directed communication. The final 43 regression
tests pass: https://github.com/maloney2323/Reality/actions/runs/40147951348

### Decision

**Keep v0.2 experimental.** This is a promising exploratory improvement
in task focus and prompt-token overhead, while retaining a key
time-sensitive fact. It is not evidence of zero drift, 100-turn durability,
deterministic model-token prevention, live customer authorization, or
cross-model generalization. Do not merge into production yet. The
recommended next phase is an adversarial held-out 25-turn or 100-turn
test with source-grounded human adjudication and the correct separation
of task drift, fact drift, detector false negatives, and independent
execution authority.
