-- Corrects the shadowed Postgres record w/table alias in live OIDC readback.
-- Preserves all original owner, goal, observed-run, no-replay and service-role gates.
create or replace function public.reality_read_genuine_worker_failure_scope_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_scope record;v_historical integer;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_FAILURE_READ_SERVICE_ONLY';end if;
 select w.original_work_id,w.owner_id,w.trigger_id,w.worker_run_id,
  w.wake_state,q.original_work_event_id,q.phase,
  q.goal_transition_event_id,q.conversation_id,
  e.payload->>'issue_number' as source_issue_number,
  c.state as continuation_state,a.consumed_at
 into v_scope
 from reality_internal.governed_execution_wake_outbox_v1 w
 join reality_internal.genuine_capability_queue_v1 q
  on q.trigger_id=w.trigger_id and q.owner_id=w.owner_id
    and q.original_work_id=w.original_work_id
    and q.phase='ISOLATED_INSTALLED_PROBATION'
 join reality_internal.genuine_preview_install_approvals_v1 a
  on a.trigger_id=q.trigger_id and a.owner_id=q.owner_id
    and a.original_work_id=q.original_work_id
    and a.consumed_at is not null and a.target_environment='ISOLATED_PREVIEW'
 join reality_internal.genuine_original_continuations_v1 c
  on c.trigger_id=q.trigger_id
   and c.owner_id=q.owner_id and c.original_work_id=q.original_work_id
   and c.approval_id=a.approval_id
   and c.state in ('ACCEPTED_FOR_ISOLATED_RESUMPTION','RESUMPTION_CLAIMED')
 join reality_internal.goal_publication_epochs g
  on g.user_id=q.owner_id and g.conversation_id=q.conversation_id
   and g.last_transition_event_id=q.goal_transition_event_id
 join public.universe_events e on e.event_id=q.original_work_event_id
   and e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'original_work_id'=q.original_work_id
   and e.payload->>'owner_id'=q.owner_id::text
   and e.provenance->>'principal_id'=q.owner_id::text
   and e.payload->>'owner_authorized_investigation'='true'
   and e.payload->>'owner_authorized_installation'='false'
   and e.payload->>'original_job_completed'='false'
   and e.payload->>'production_changed'='false'
 where w.wake_state='ESCALATED' and w.worker_run_id>0
   and w.target_environment='ISOLATED_PREVIEW'
   and not exists (
    select 1 from reality_internal.genuine_independent_final_receipts_v1 r
     where r.owner_id=w.owner_id and r.original_work_id=w.original_work_id)
 order by w.updated_at desc limit 1;
 if not found then
  return jsonb_build_object('status','NO_VERIFIED_ESCALATED_ORIGINAL_WORK',
   'record_allowed',false,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 select count(*)::integer into v_historical
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t on t.shift_id=s.shift_id
 where s.owner_id=v_scope.owner_id and t.step_index in (6,7)
  and t.state='BLOCKED_PROVIDER'
  and t.source_status='VERIFIED_HISTORICAL_NOOP'
  and t.proof->>'kind'='EXISTING_HISTORICAL_UNIVERSE_SATISFIED_NO_REPLAY'
  and t.proof->>'original_work_id'=v_scope.original_work_id
  and t.proof->>'original_queue_trigger_id'=v_scope.trigger_id::text
  and t.proof->>'independent_historical_readback_verified'='true'
  and t.proof->>'current_original_job_completed'='false'
  and t.proof->>'original_job_execution_replayed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(t.proof::text,'UTF8')),'hex');
 return jsonb_build_object(
   'status','ESCALATED_OWNER_ORIGINAL_WORK_VERIFIED',
   'owner_id',v_scope.owner_id,'original_work_id',v_scope.original_work_id,
   'trigger_id',v_scope.trigger_id,'original_work_event_id',v_scope.original_work_event_id,
   'failed_run_id',v_scope.worker_run_id,
   'queue_phase',v_scope.phase,'continuation_state',v_scope.continuation_state,
   'historical_noop_verified',v_historical=2,
   'verification_required_before_model',true,
   'record_allowed',true,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
end $fn$;
