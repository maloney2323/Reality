-- Supabase defaults can directly grant function EXECUTE to anon/authenticated.
-- The service-only current_user fence is defense-in-depth, not the ACL.
DO $guard$ BEGIN
 IF to_regprocedure('public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid)') IS NULL
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_CI_PREFLIGHT_MISSING'; END IF;
END $guard$;
REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) FROM anon,authenticated,PUBLIC;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid) TO service_role;
DO $verify$ BEGIN
 IF has_function_privilege('anon','public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.reality_read_signed_maintenance_ci_preflight_v1(uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_CI_FUNCTION_ACL_INCORRECT';END IF;
END $verify$;
