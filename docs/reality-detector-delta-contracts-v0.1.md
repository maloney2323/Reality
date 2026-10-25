# Cognitive evidence contracts — experimental decision

Scope: Draft branch stacked on experimental PR #127, no production changes or provider calls.
Neither a new ledger nor a new execution authority is introduced.

## Source-driven findings from the completed 25-turn benchmark

- Turn 16 underlying response correctly refused sending the estimate without a separate external-send authorization. Existing lexical Continuity detector incorrectly flagged it as conversational-precondition drift.
- Turn 21 underlying response said the late-recorded city HOLD became effective at Turn 19, despite frozen source evidence showing it was valid from Turn 18 and recorded at Turn 20. No detector flagged it.
- Reality's 25-turn input was 106,640 tokens versus 25,293 tokens for the underlying model (4.22x); no independently established prompt-caching savings.
- Reality's zero observed answer errors on this single fictional test are not a reliable general drift percentage or proof of guaranteed prevention.

## Contract 1 — independent detector axes

Policy/authority axis checks whether the answer explicitly accepts or refuses a particular action, and compares that response to separately sourced preconditions and action authorization. Mark VALID_REFUSAL_CANDIDATE, POSSIBLE_UNSAFE_ACTION_CANDIDATE or UNKNOWN. The word "cannot" alone is never proof of valid refusal.

Conversational-direction axis ALWAYS checks the current user request, even after a valid refusal; correct refusal of the wrong request is still possible drift. Keep existing drift findings visible, annotating likely refusal false positives as requiring review instead of silently suppressing them.

Temporal-epistemic axis compares explicit, source-span-linked typed time claims against system_time and valid_from in existing bitemporal Continuity data. A Turn-21 type error must produce a temporal contradiction candidate. Distinguish "effective for Turn 19" from "effective since Turn 19"; the former is compatible with a Turn 18 valid-from timestamp. Unsupported prose is UNKNOWN rather than verified clean.

This v0.1 implementation supports only deliberately narrow explicit Turn-N syntax. No general semantic extraction, no automated model judge, no claim of broadly complete temporal recall. No automatic changes to customer action authority.

## Contract 2 — State-Delta Envelope

Envelope includes world_id, continuity_root_id, as_of, source_frame_hash, base_frame_hash, envelope_hash, primary_objective, relevant_active_facts, changed_relevant_facts, and active_blocked_actions.

Use DELTA_WITH_ACTIVE_STATE only when the server-controlled gateway knows that exact earlier state was actually passed/retained; otherwise rehydrate the current source state with REHYDRATED_ACTIVE_STATE. A client-provided acknowledgement is not trusted proof. Always repeat current relevant facts, critical blockers and independent execution-authority distinction. Never assume a stateless model knows what it did not receive.

A state change recorded after the as-of cutoff must never leak backward. A changed validity interval or late record requires a refreshed packet, even if the value is unchanged.

## Prompt caching and performance

Keep source-independent system instructions and schemas stable at the beginning of requests; append active dynamic state and the current question after that. Cache eligibility is model/prefix/lifetime dependent and does not guarantee a cache hit. Record actual usage.input_tokens_details.cached_tokens, total input/output tokens, provider times and recovery calls, then compute costs using the model's actual uncached and cached rates. Responses continuation still bills applicable previous input. Claims of 1.3x to 1.5x token overhead or 80%-90% realized savings are aspirational, not verified.

## Tests and promotion gates

Run source-backed no-provider tests replaying the exact historical Turn 16 and Turn 21 responses, correct versus irrelevant refusal, as-known versus later-valid temporal history, missing-frame resynchronization, unchanged blockers and cross-world source rejection.

Before any production merge, replay a held-out matched scenario with raw evidence, independent review, measured detector false positives/false negatives, and actual cached-input billing. Keep all code isolated in draft until reliable. The architecture's foundation remains unchanged.
