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
