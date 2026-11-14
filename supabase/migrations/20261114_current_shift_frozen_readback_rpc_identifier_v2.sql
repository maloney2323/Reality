-- PostgreSQL identifiers are limited to 63 bytes. The earlier declared
-- service-only function name was truncated on creation, making the Vercel
-- worker request fail with PostgREST PGRST202 despite a correct warrant.
-- Rename that SAME function, without recreating or widening its authority.
do $fix$
begin
 if exists(select 1 from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='reality_read_current_shift_native_candidate_for_frozen_verifica')
  and not exists(select 1 from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='reality_read_shift_native_candidate_frozen_v1')
 then
  alter function public.reality_read_current_shift_native_candidate_for_frozen_verifica() rename to reality_read_shift_native_candidate_frozen_v1;
 end if;
 if not exists(select 1 from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='reality_read_shift_native_candidate_frozen_v1')
 then raise exception 'SIGNED_SHIFT_FROZEN_READBACK_RENAME_NOT_VERIFIED';end if;
end $fix$;
revoke all on function public.reality_read_shift_native_candidate_frozen_v1() from public,anon,authenticated;
grant execute on function public.reality_read_shift_native_candidate_frozen_v1() to service_role;
notify pgrst, 'reload schema';
