\set ON_ERROR_STOP on
-- Disposable PostgreSQL only. Confirm the DB function and table privilege
-- boundary before testing an owner-authorized synthetic abandonment.
do $$
declare f oid;
begin
 if not (select relrowsecurity from pg_class where oid='public.reality_universe_entries'::regclass)
  or not (select relrowsecurity from pg_class where oid='public.reality_conversation_turn_fences'::regclass)
 then raise exception 'SECURITY_RLS_DISABLED'; end if;
 if not (select rolbypassrls from pg_roles where rolname='service_role')
 then raise exception 'SECURITY_SYNTHETIC_SERVICE_ROLE_NOT_PRIVILEGED';end if;
 if has_table_privilege('anon','public.reality_universe_entries','INSERT') or
    has_table_privilege('authenticated','public.reality_universe_entries','SELECT') or
    has_table_privilege('authenticated','public.reality_conversation_turn_fences','UPDATE') or
    has_table_privilege('anon','public.reality_conversation_turn_fences','SELECT')
 then raise exception 'SECURITY_BROWSER_TABLE_ACCESS_NOT_DENIED';end if;
 if not has_table_privilege('service_role','public.reality_universe_entries','INSERT') or
    not has_table_privilege('service_role','public.reality_conversation_turn_fences','UPDATE') or
    has_table_privilege('service_role','public.reality_universe_entries','DELETE')
 then raise exception 'SECURITY_SERVICE_TABLE_PRIVILEGE_INVALID';end if;
 select oid into strict f from pg_proc
  where oid='public.reality_abandon_incomplete_conversation_turn_v1(text,text,uuid,text,uuid,bigint,jsonb,jsonb)'::regprocedure;
 if has_function_privilege('anon',f,'EXECUTE') or
    has_function_privilege('authenticated',f,'EXECUTE') or
    not has_function_privilege('service_role',f,'EXECUTE')
 then raise exception 'SECURITY_RESOLUTION_RPC_EXECUTE_EXPOSED';end if;
 if (select prosecdef from pg_proc where oid=f)
 then raise exception 'SECURITY_RESOLUTION_RPC_IS_DEFINER';end if;
 if not exists(select 1 from pg_trigger
  where tgrelid='public.reality_universe_entries'::regclass
    and tgname='reality_reject_late_abandoned_turn_v1'
    and not tgisinternal)
 then raise exception 'SECURITY_LATE_RESPONSE_TRIGGER_MISSING';end if;
end $$;
select 'EPHEMERAL_PRIVILEGE_AUDIT_PASSED' as proof;
