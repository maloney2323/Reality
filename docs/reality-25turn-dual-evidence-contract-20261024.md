# Reality 25-turn dual benchmark — execution contract

This experiment is **NOT production** and is based on a frozen, fictional
construction-business source ledger.

* Triggering commit contains `[live-25turn-dual]` to run once, cost-capped.
* Fifty actual model generations maximum, twenty-five per lane, with the
  same model and authored user-turn sequence. No separate judge model.
* Underlying model gets standard unmodified helpful-assistant system
  context plus all historic user messages and its own historic answers.
* Reality gets the same authored user-turn sequence and its own historic
  answers, the Reality gateway prompt, and the selectively retrieved
  source-linked orientation packet. That is a SYSTEM comparison, not a
  single-variable packet ablation.
* All original responses, source snapshots, receipt refs, candidate
  drift findings, provisional relevance findings, model tokens and
  measured provider times are exported before any reviewer interpretation.
* Human review must separately mark factual errors, wrong-topic answers,
  unsupported authority/completion claims, temporal-state errors,
  abstentions, and whether the existing detector recognized each.
  Do not treat a lexical flag as a proven model error.
* A frozen joint-condition case at Turn 23 intentionally checks whether
  the experimental sandbox action gate wrongly treats verified dispatch
  coordinator approval as sufficient when a city HOLD remains active.
  It MUST remain classified as an unverified policy-gap candidate until
  reviewed; no business action can occur through this runner.
* A self-contained HTML evidence explorer and JSON review data should
  accompany the results. Report only denominators that actually passed
  independent review; do not invent a zero-drift score.

PR #127 remains draft on top of draft PR #126. No production changes.
