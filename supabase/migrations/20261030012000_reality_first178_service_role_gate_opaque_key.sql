-- Repair role gate for opaque Supabase secret API keys.
-- Live isolated proof demonstrated current_user='service_role' while
-- request.jwt.claim.role is NULL. This is NOT a permission relaxation:
-- the exact authenticated PostgreSQL effective role remains mandatory.
-- Preserve SECURITY INVOKER and existing service-role-only EXECUTE grants.
DO $migration$
DECLARE
  name text;
  prior text;
  revised text;
  fixed integer:=0;
  old_gate constant text := 'coalesce(current_setting(''request.jwt.claim.role'',true),'''')';
BEGIN
 FOREACH name IN ARRAY ARRAY[
  'reality_read_governed_build_v1',
  'reality_enqueue_governed_build_v1',
  'reality_claim_governed_build_178_v1',
  'reality_record_governed_build_178_v1'
 ] LOOP
  SELECT pg_catalog.pg_get_functiondef(p.oid) INTO prior
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=name;
  IF prior IS NULL OR pg_catalog.strpos(prior,old_gate)=0
  THEN RAISE EXCEPTION 'FIRST178_EXPECTED_OLD_ROLE_GATE_MISSING: %',name; END IF;
  revised:=pg_catalog.replace(prior,old_gate,'current_user');
  IF revised=prior
  THEN RAISE EXCEPTION 'FIRST178_ROLE_GATE_REWRITE_FAILED: %',name; END IF;
  EXECUTE revised;
  fixed:=fixed+1;
 END LOOP;
 IF fixed<>4 THEN RAISE EXCEPTION 'FIRST178_ROLE_GATE_MIGRATION_INCOMPLETE'; END IF;
END $migration$;
-- Assert all four remain invoker-only and unavailable to normal users.
DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace s ON s.oid=p.pronamespace
 WHERE s.nspname='public' AND p.proname IN (
  'reality_read_governed_build_v1',
  'reality_enqueue_governed_build_v1',
  'reality_claim_governed_build_178_v1',
  'reality_record_governed_build_178_v1')
 AND p.prosecdef=false
 AND pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
 AND pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'current_user')>0
 AND pg_catalog.strpos(pg_catalog.pg_get_functiondef(p.oid),'request.jwt.claim.role')=0;
 IF n<>4 THEN RAISE EXCEPTION 'FIRST178_SERVICE_ROLE_ONLY_INVARIANT_FAILED: %',n;END IF;
END $verify$;