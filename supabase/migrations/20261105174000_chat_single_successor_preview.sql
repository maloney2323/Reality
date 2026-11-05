-- Reality private Chat continuity: prevent future sibling or duplicate-genesis
-- append races in the isolated preview ledger.
-- Historical forked events remain immutable and independently auditable.
-- The 2026-11-05T16:00Z cutoff excludes the known, already-forked history;
-- all new preview events are protected. No historic event is rewritten.
CREATE UNIQUE INDEX IF NOT EXISTS reality_universe_single_successor_preview_v1
 ON public.universe_events(parent_event_id)
 WHERE parent_event_id IS NOT NULL
   AND created_at >= TIMESTAMPTZ '2026-11-05 16:00:00+00';

CREATE UNIQUE INDEX IF NOT EXISTS reality_universe_single_genesis_preview_v1
 ON public.universe_events(continuity_root_id,worldline_id)
 WHERE parent_event_id IS NULL
   AND created_at >= TIMESTAMPTZ '2026-11-05 16:00:00+00';
