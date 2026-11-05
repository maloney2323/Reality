-- Preview-only read-only source observations for an authenticated owner.
-- These are NOT customer jobs, verified missing capabilities or install warrants.
create or replace function public.reality_read_owner_unbound_capability_sources_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_items jsonb := '[]'::jsonb; v_goal_confirmed boolean;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'UNBOUND_CAPABILITY_SOURCE_OWNER_SERVICE_ONLY';
 end if;
 select exists(
  select 1 from reality_internal.goal_publication_epochs g
  where g.user_id=p_owner_id and g.last_transition_event_id is not null)
 into v_goal_confirmed;
 if v_goal_confirmed then
  select coalesce(pg_catalog.jsonb_agg(
     pg_catalog.jsonb_build_object(
       'frozen_sha256',s.frozen_sha256,
       'frozen_test_path',s.frozen_test_path,
       'missing_module_path',s.missing_module_path,
       'status',s.status,
       'observations',s.observations,
       'first_observed_sha',s.first_observed_sha,
       'latest_observed_sha',s.latest_observed_sha,
       'last_observed_at',s.last_observed_at)
     order by s.last_observed_at desc), '[]'::jsonb)
  into v_items from (
    select * from reality_internal.genuine_unbound_capability_discoveries_v1
    where status='AWAITING_OWNER_WORK_BINDING'
      and frozen_sha256 ~ '^[a-f0-9]{64}$'
      and first_observed_sha ~ '^[a-f0-9]{40}$'
      and latest_observed_sha ~ '^[a-f0-9]{40}$'
      and frozen_test_path ~ '^test/reality-frozen-regressions/[a-z0-9._-]+[.]test[.]js$'
      and missing_module_path ~ '^src/reality-extensions/[a-z0-9._-]+[.]mjs$'
      and observations between 1 and 100000
    order by last_observed_at desc limit 8
   ) s;
 end if;
 return pg_catalog.jsonb_build_object(
   'status','OWNER_UNBOUND_SOURCE_OBSERVATIONS_READ_ONLY',
   'source_basis','PERSISTED_SIGNED_DISCOVERY_NOT_EXECUTABLE',
   'owner_goal_present',v_goal_confirmed,
   'observations',v_items,
   'coverage_complete',v_goal_confirmed,
   'read_only',true,
   'source_reverified_now',false,
   'owner_authorized_new_job',false,
   'verified_missing_capability',false,
   'installation_authorized',false,
   'original_job_completed',false,
   'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_unbound_capability_sources_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_unbound_capability_sources_v1(uuid)
 to service_role;
