-- Reality Universe is an append-only evidence ledger.
-- Apply to the isolated continuity benchmark project first; do not apply to production
-- until its privilege model and rollback plan have been separately reviewed.

CREATE OR REPLACE FUNCTION public.reality_universe_entries_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  RAISE EXCEPTION 'REALITY_UNIVERSE_APPEND_ONLY: % is not permitted on public.reality_universe_entries', TG_OP
    USING ERRCODE = '55000';
END;
$function$;

DROP TRIGGER IF EXISTS reality_universe_entries_reject_update_delete
  ON public.reality_universe_entries;
CREATE TRIGGER reality_universe_entries_reject_update_delete
  BEFORE UPDATE OR DELETE ON public.reality_universe_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.reality_universe_entries_reject_mutation();

DROP TRIGGER IF EXISTS reality_universe_entries_reject_truncate
  ON public.reality_universe_entries;
CREATE TRIGGER reality_universe_entries_reject_truncate
  BEFORE TRUNCATE ON public.reality_universe_entries
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.reality_universe_entries_reject_mutation();

-- The application only needs to read and append ledger entries.
REVOKE ALL PRIVILEGES ON TABLE public.reality_universe_entries FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON TABLE public.reality_universe_entries FROM service_role;
GRANT SELECT, INSERT ON TABLE public.reality_universe_entries TO service_role;
