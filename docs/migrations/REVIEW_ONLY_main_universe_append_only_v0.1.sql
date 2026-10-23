-- REALITY MAIN UNIVERSE IMMUTABILITY ALIGNMENT v0.1
-- STATUS: REVIEW-ONLY; DO NOT APPLY AUTOMATICALLY.
-- Scope: ONLY the explicitly authorized main Reality Supabase project.
-- This file intentionally lives in docs/, NOT supabase/migrations/.
-- Baseline Oct 22 2026: main table has 2 valid entries, RLS enabled,
-- service_role ALL policy and ALL table grants, no rejecting triggers;
-- benchmark has rejecting triggers and service_role SELECT/INSERT only.
-- Applying this to production changes database permissions. Explicit
-- release/rollback authorization and read-only preflight are required.
--
-- DB owner/admin can still modify table or drop triggers: immutability here
-- protects runtime service credentials, not from a database superuser.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
DECLARE bad integer;
BEGIN
 IF to_regclass('public.reality_universe_entries') IS NULL THEN
  RAISE EXCEPTION 'REALITY_UNIVERSE_TABLE_ABSENT';
 END IF;
 SELECT count(*) INTO bad FROM public.reality_universe_entries
 WHERE jsonb_typeof(provenance) IS DISTINCT FROM 'object'
    OR jsonb_typeof(evidence_references) IS DISTINCT FROM 'array'
    OR ledger_entry_hash !~ '^[0-9a-f]{64}$'
    OR trim(continuity_root_id)='';
 IF bad<>0 THEN
  RAISE EXCEPTION 'REALITY_UNIVERSE_PREEXISTING_DATA_INVALID: %',bad;
 END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.reality_universe_entries_reject_mutation_v1()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
 RAISE EXCEPTION USING
  ERRCODE='55000',
  MESSAGE='REALITY_UNIVERSE_APPEND_ONLY_REJECTED';
 RETURN NULL;
END $fn$;

DO $triggers$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
  WHERE tgrelid='public.reality_universe_entries'::regclass
    AND tgname='reality_universe_entries_no_update_delete_v1') THEN
  CREATE TRIGGER reality_universe_entries_no_update_delete_v1
  BEFORE UPDATE OR DELETE ON public.reality_universe_entries
  FOR EACH ROW EXECUTE FUNCTION public.reality_universe_entries_reject_mutation_v1();
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_trigger
  WHERE tgrelid='public.reality_universe_entries'::regclass
    AND tgname='reality_universe_entries_no_truncate_v1') THEN
  CREATE TRIGGER reality_universe_entries_no_truncate_v1
  BEFORE TRUNCATE ON public.reality_universe_entries
  FOR EACH STATEMENT EXECUTE FUNCTION public.reality_universe_entries_reject_mutation_v1();
 END IF;
END $triggers$;

-- Default Supabase service-role BYPASSRLS means a service-only RLS policy
-- does not itself make rows immutable. Explicit table grants are required.
REVOKE ALL PRIVILEGES ON TABLE public.reality_universe_entries
 FROM anon,authenticated,service_role;
GRANT SELECT,INSERT ON TABLE public.reality_universe_entries TO service_role;

-- Keep RLS on for non-service roles and future privilege changes.
ALTER TABLE public.reality_universe_entries ENABLE ROW LEVEL SECURITY;

-- Shape checks mirror the benchmark table. Separate idempotent guards
-- avoid weakening or overwriting an existing constraint by the same name.
DO $checks$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
  WHERE conrelid='public.reality_universe_entries'::regclass
    AND conname='reality_universe_entries_evidence_references_array') THEN
  ALTER TABLE public.reality_universe_entries
    ADD CONSTRAINT reality_universe_entries_evidence_references_array
    CHECK (jsonb_typeof(evidence_references)='array');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint
  WHERE conrelid='public.reality_universe_entries'::regclass
    AND conname='reality_universe_entries_provenance_object') THEN
  ALTER TABLE public.reality_universe_entries
    ADD CONSTRAINT reality_universe_entries_provenance_object
    CHECK (jsonb_typeof(provenance)='object');
 END IF;
END $checks$;
COMMIT;

-- POST-MIGRATION READ-ONLY CHECKS (run separately; not a proof of runtime):
-- SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE
-- tgrelid='public.reality_universe_entries'::regclass AND NOT tgisinternal;
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND table_name='reality_universe_entries'
-- AND grantee IN ('anon','authenticated','service_role');
-- Must still run controlled INSERT/readback and intentional UPDATE/DELETE/
-- TRUNCATE denial in a non-production clone before approving production.
