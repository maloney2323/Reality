-- Permit the existing trusted database trigger owner to read the SAME
-- canonical evidence as the service worker. No grants or ownership changes.
-- Refuse unexpected definitions; do not relax any write/execution fence.
DO $repair$
DECLARE f record; d text; fixed text; sig regprocedure;
BEGIN
 FOR f IN SELECT * FROM (VALUES
 ('public.reality_read_final_loop_shared_continuity_guard_v1(uuid)','IF current_user<>''service_role'' THEN','IF current_user NOT IN (''service_role'',''postgres'') THEN'),
 ('public.reality_read_current_final_loop_proof_envelope_v1(uuid)','IF current_user <> ''service_role'' THEN','IF current_user NOT IN (''service_role'',''postgres'') THEN'),
 ('public.reality_read_owner_shift_execution_graph_v1(uuid,uuid)','if current_user<>''service_role'' then','if current_user NOT IN (''service_role'',''postgres'') then')
 ) AS x(signature,old_fence,new_fence)
 LOOP
  sig:=pg_catalog.to_regprocedure(f.signature);
  IF sig IS NULL OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=sig
    AND pg_catalog.pg_get_userbyid(p.proowner)='postgres' AND NOT p.prosecdef
    AND p.prorettype='jsonb'::regtype
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE a.privilege_type='EXECUTE' AND a.grantee NOT IN (p.proowner,(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='service_role'))))
   OR NOT pg_catalog.has_function_privilege('service_role',sig,'EXECUTE')
   OR pg_catalog.has_function_privilege('anon',sig,'EXECUTE')
   OR pg_catalog.has_function_privilege('authenticated',sig,'EXECUTE')
  THEN RAISE EXCEPTION 'CONTINUITY_READER_IDENTITY_OR_ACL_UNEXPECTED: %',f.signature; END IF;
  d:=pg_catalog.pg_get_functiondef(sig);
  IF strpos(d,f.new_fence)>0 AND strpos(d,f.old_fence)=0 THEN CONTINUE;END IF;
  IF (length(d)-length(replace(d,f.old_fence,'')))/length(f.old_fence)<>1
  THEN RAISE EXCEPTION 'CONTINUITY_READER_FENCE_UNEXPECTED: %',f.signature;END IF;
  fixed:=replace(d,f.old_fence,f.new_fence);
  EXECUTE fixed;
 END LOOP;
END $repair$;
