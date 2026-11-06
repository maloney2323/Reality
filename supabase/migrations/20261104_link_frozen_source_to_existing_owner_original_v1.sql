-- The discovery observation and original customer work are already
-- source-identical; link them for review instead of manufacturing a new job.
-- Strictly service role and active owner goal; NO queue, ledger or consent writes.
create or replace function public.reality_read_owner_unbound_capability_sources_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_items jsonb:='[]'::jsonb;
 v_goal_confirmed boolean; v_discovery record; v_link record; v_match jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'UNBOUND_CAPABILITY_SOURCE_OWNER_SERVICE_ONLY';
 end if;
 select exists(select 1 from reality_internal.goal_publication_epochs g
  where g.user_id=p_owner_id and g.last_transition_event_id is not null)
 into v_goal_confirmed;
 if v_goal_confirmed then
  for v_discovery in
   select s.frozen_sha256,s.frozen_test_path,s.missing_module_path,
      s.status,s.observations,s.first_observed_sha,s.latest_observed_sha,
      s.last_observed_at
   from reality_internal.genuine_unbound_capability_discoveries_v1 s
   where s.status='AWAITING_OWNER_WORK_BINDING'
    and s.frozen_sha256 ~ '^[a-f0-9]{64}$'
    and s.first_observed_sha ~ '^[a-f0-9]{40}$'
    and s.latest_observed_sha ~ '^[a-f0-9]{40}$'
    and s.frozen_test_path ~ '^test/reality-frozen-regressions/[a-z0-9._-]+[.]test[.]js$'
    and s.missing_module_path ~ '^src/reality-extensions/[a-z0-9._-]+[.]mjs$'
    and s.observations between 1 and 100000
   order by s.last_observed_at desc limit 8
  loop
   v_match:=null;
   -- Exact original scope requires event-sourced owner authorization,
   -- active goal, matching test/module/hash, independently frozen RED,
   -- and an actually unsettled original. A model is not a source witness.
   select count(*) as matching_work_count,
          max(q.original_work_id) as original_work_id,
          max(q.phase) as queue_phase,
          max(c.state) as continuation_state,
          max(r.recovery_status) as recovery_status,
          max(r.next_evidence_action) as next_evidence_action
    into v_link
   from reality_internal.genuine_capability_queue_v1 q
   join reality_internal.goal_publication_epochs g
     on g.user_id=q.owner_id and g.conversation_id=q.conversation_id
     and g.last_transition_event_id=q.goal_transition_event_id
   join public.universe_events ev
     on ev.event_id=q.original_work_event_id
      and ev.entity_type='reality_original_source_backed_repair_work'
      and ev.epistemic_status='VERIFIED'
      and ev.payload->>'owner_id'=q.owner_id::text
      and ev.payload->>'original_work_id'=q.original_work_id
      and ev.payload->>'owner_authorized_investigation'='true'
      and ev.payload->>'owner_authorized_installation'='false'
      and ev.payload->>'original_job_completed'='false'
      and ev.payload->>'source_path'=v_discovery.missing_module_path
      and ev.payload->>'frozen_test_path'=v_discovery.frozen_test_path
      and ev.payload->>'frozen_test_sha256'=v_discovery.frozen_sha256
   join reality_internal.genuine_original_continuations_v1 c
     on c.trigger_id=q.trigger_id and c.original_work_id=q.original_work_id
      and c.owner_id=q.owner_id and c.settled_at is null
   left join reality_internal.genuine_original_recovery_commitments_v1 r
     on r.owner_id=q.owner_id and r.original_work_id=q.original_work_id
     and r.trigger_id=q.trigger_id and r.original_job_settled=false
   where q.owner_id=p_owner_id
    and q.frozen_suite_ref='github:frozen-regression:sha256:'||v_discovery.frozen_sha256
    and q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
    and q.verified_frozen_reproduction->>'frozen_sha256'=v_discovery.frozen_sha256
    and q.verified_frozen_reproduction->>'frozen_test_path'=v_discovery.frozen_test_path
    and q.phase in ('ISOLATED_INSTALLED_PROBATION',
       'FROZEN_REPRODUCED_AWAITING_CANDIDATE','AWAITING_OWNER_APPROVAL')
    and not exists(
      select 1 from reality_internal.genuine_independent_final_receipts_v1 fr
      where fr.owner_id=q.owner_id and fr.original_work_id=q.original_work_id);
   if v_link.matching_work_count=1 then
    v_match:=pg_catalog.jsonb_build_object(
      'status','EXISTING_UNSETTLED_OWNER_ORIGINAL_MATCHED',
      'original_work_id',v_link.original_work_id,
      'queue_phase',v_link.queue_phase,
      'continuation_state',v_link.continuation_state,
      'recovery_status',v_link.recovery_status,
      'next_evidence_action',v_link.next_evidence_action,
      'original_source_frozen_red_verified',true,
      'same_owner_active_goal_verified',true,
      'existing_original_reused',true,
      'fresh_job_required',false,
      'fresh_capability_generation_authorized',false,
      'replay_external_effects_authorized',false,
      'independent_final_receipt_recorded',false,
      'installation_authorized_by_discovery',false,
      'production_changed',false);
   end if;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
      'frozen_sha256',v_discovery.frozen_sha256,
      'frozen_test_path',v_discovery.frozen_test_path,
      'missing_module_path',v_discovery.missing_module_path,
      'status',v_discovery.status,
      'observations',v_discovery.observations,
      'first_observed_sha',v_discovery.first_observed_sha,
      'latest_observed_sha',v_discovery.latest_observed_sha,
      'last_observed_at',v_discovery.last_observed_at,
      'existing_original_match',v_match));
  end loop;
 end if;
 return pg_catalog.jsonb_build_object(
   'status','OWNER_UNBOUND_SOURCE_OBSERVATIONS_READ_ONLY',
   'source_basis','PERSISTED_SIGNED_DISCOVERY_NOT_EXECUTABLE',
   'owner_goal_present',v_goal_confirmed,
   'observations',v_items,
   'coverage_complete',v_goal_confirmed,
   'read_only',true,'source_reverified_now',false,
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