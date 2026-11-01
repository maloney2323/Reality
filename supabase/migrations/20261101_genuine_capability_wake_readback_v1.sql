-- Read-only, service-only wake inspection for the signed isolated worker.
-- A GitHub Actions wake file is inert. This function does NOT claim work,
-- approve installation, run models, mutate state or settle customer jobs.
create or replace function public.reality_read_genuine_capability_wake_v1(
 p_trigger_id uuid,p_source_event_id uuid)
returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
 t reality_internal.genuine_capability_queue_v1%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 g public.universe_events%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_WAKE_SERVICE_ROLE_REQUIRED'; end if;
 select * into t from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and gap_event_id=p_source_event_id;
 if t.trigger_id is null then
  raise exception 'GENUINE_WAKE_TRIGGER_NOT_FOUND'; end if;
 select * into e from reality_internal.goal_publication_epochs
 where user_id=t.owner_id and conversation_id=t.conversation_id;
 select * into g from public.universe_events where event_id=t.gap_event_id;
 if e.user_id is null or
    e.last_transition_event_id is distinct from t.goal_transition_event_id or
    g.event_id is null or
    g.entity_type<>'reality_genuine_capability_gap_v1' or
    g.epistemic_status<>'VERIFIED' or
    g.payload->>'provider_failure_hash' is distinct from t.provider_failure_hash or
    g.payload->>'original_work_id' is distinct from t.original_work_id or
    g.payload->>'owner_id' is distinct from t.owner_id::text or
    g.payload->>'installation_authorized' is distinct from 'false' or
    g.payload->>'original_job_completed' is distinct from 'false' or
    t.phase<>'PENDING_FROZEN_REPRODUCTION'
 then raise exception 'GENUINE_WAKE_ORIGINAL_OWNER_SOURCE_CHANGED'; end if;
 if exists (select 1 from public.universe_events done
   where done.continuity_root_id=g.continuity_root_id
    and done.worldline_id=g.worldline_id
    and done.payload->>'original_work_id'=t.original_work_id
    and done.epistemic_status='VERIFIED'
    and (done.payload->>'original_job_completed'='true'
      or done.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'GENUINE_WAKE_ORIGINAL_JOB_ALREADY_SETTLED'; end if;
 return pg_catalog.jsonb_build_object(
  'trigger_id',t.trigger_id,'source_event_id',t.gap_event_id,
  'original_work_id',t.original_work_id,'capability_id',t.capability_id,
  'source_ref',t.source_ref,'verification_suite_ref',t.frozen_suite_ref,
  'provider_failure_hash',t.provider_failure_hash,
  'phase',t.phase,
  'owner_goal_current',true,'source_readback_verified',true,
  'model_generated',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $$;
revoke all on function public.reality_read_genuine_capability_wake_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_capability_wake_v1(uuid,uuid)
 to service_role;
