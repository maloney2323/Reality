-- Reality continuous shift: exact, governed, read-only historical-no-op recovery.
-- Existing authorized original-job and independently settled historical target
-- must be proved by the existing constitutional reconciliation function.
-- A verified no-op means NO replay and NO new original-job completion.
-- It clears the shift's conditional execution gate, not the original job's
-- unclaimed continuation. No model, installation, or external work is created.
create or replace function public.reality_reconcile_employee_shift_historical_noop_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare
  v_link jsonb; v_target jsonb; s record;
  v_proof jsonb; v_digest text; v_at timestamptz:=clock_timestamp();
  v_step_count integer;
begin
  if current_user<>'service_role' then
    raise exception 'SHIFT_GOVERNED_NOOP_SERVICE_ROLE_ONLY';
  end if;
  v_link:=public.reality_reconcile_employee_shift_original_v1();
  if v_link->>'status'<>'EXACT_ORIGINAL_JOB_NOT_INDEPENDENTLY_SETTLED' or
     v_link->>'governed_existing_work_status'<>'EXISTING_AUTHORIZED_ORIGINAL_REUSED_READ_ONLY'
  then
    return jsonb_build_object('status','NO_ELIGIBLE_EXISTING_GOVERNED_NOOP',
      'original_job_completed',false,'installation_authorized',false,
      'production_changed',false);
  end if;
  if v_link->>'governed_cycle_dispatched_by_shift'<>'false' or
     v_link->>'model_invoked_by_shift'<>'false' or
     v_link->>'new_customer_job_created'<>'false' or
     v_link->>'installation_authorized'<>'false' or
     v_link->>'production_changed'<>'false' or
     v_link->>'governed_original_work_id' !~ '^work:[a-f0-9]{32}$' or
     v_link->>'shift_observation_proof_sha256' !~ '^sha256:[a-f0-9]{64}$' or
     v_link->>'governed_queue_phase'<>'ISOLATED_INSTALLED_PROBATION'
  then raise exception 'SHIFT_GOVERNED_NOOP_OWNER_SCOPE_NOT_VERIFIED';end if;
  -- Use the SAME existing independently gated original-job target readback.
  -- It inspects exactly one source-identical prior repair and two immutable
  -- VERIFIED Universe settlement events, without installing or claiming work.
  begin
    v_target:=public.reality_read_genuine_reconciliation_target_v1(
      (v_link->>'governed_trigger_id')::uuid);
  exception when raise_exception then
    return jsonb_build_object('status','GOVERNED_NOOP_HISTORICAL_PROOF_UNAVAILABLE',
      'original_job_completed',false,'installation_authorized',false,
      'production_changed',false);
  end;
  if v_target->>'status'<>'RECONCILIATION_ALREADY_SATISFIED_BY_VERIFIED_UNIVERSE' or
     v_target->>'repairing_original_work_id'<>v_link->>'governed_original_work_id' or
     v_target->>'independent_database_readback'<>'true' or
     v_target->>'unresolved_reconciliation_targets'<>'0' or
     v_target->>'new_reconciliation_proposed'<>'false' or
     v_target->>'original_job_completed'<>'false' or
     v_target->>'production_changed'<>'false' or
     v_target->>'previous_original_universe_event_id' !~
       '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' or
     v_target->>'previous_target_universe_event_id' !~
       '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' or
     v_target->>'previous_repairing_original_work_id' !~ '^work:[a-f0-9]{32}$' or
     v_target->>'previous_reconciliation_target_work_id' !~ '^work:[a-f0-9]{32}$'
  then
    return jsonb_build_object('status','GOVERNED_NOOP_HISTORICAL_PROOF_UNAVAILABLE',
      'original_job_completed',false,'installation_authorized',false,
      'production_changed',false);
  end if;
  select * into s from reality_internal.governed_employee_shifts_v1
   where shift_id=(v_link->>'shift_id')::uuid
    and status='AWAITING_EXACT_ORIGINAL_WORK'
    and planned_start_at<=v_at and planned_end_at>v_at
   for update skip locked;
  if not found then
    return jsonb_build_object('status','GOVERNED_NOOP_SHIFT_WINDOW_CHANGED',
      'original_job_completed',false,'installation_authorized',false,
      'production_changed',false);
  end if;
  select count(*)::integer into v_step_count
  from reality_internal.governed_employee_shift_steps_v1 t
  where t.shift_id=s.shift_id and t.step_index in (6,7)
    and t.state='AWAITING_EXACT_WORK';
  if v_step_count<>2 then
    return jsonb_build_object('status','GOVERNED_NOOP_STEP_STATE_CHANGED',
      'original_job_completed',false,'installation_authorized',false,
      'production_changed',false);
  end if;
  -- Preserve a typed no-execution proof with independent source reference.
  -- BLOCKED_PROVIDER is the existing terminal, *non-execution* step state.
  -- source_status and proof distinguish this verified historical no-op from
  -- a provider outage; Chat must report its real meaning.
  v_proof:=jsonb_build_object(
   'kind','EXISTING_HISTORICAL_UNIVERSE_SATISFIED_NO_REPLAY',
   'status','VERIFIED_HISTORICAL_NOOP',
   'shift_id',s.shift_id,
   'original_work_id',v_link->>'governed_original_work_id',
   'original_queue_trigger_id',v_link->>'governed_trigger_id',
   'source_ref',v_link->>'shift_observation_source_ref',
   'source_proof_sha256',v_link->>'shift_observation_proof_sha256',
   'previous_repairing_original_work_id',v_target->>'previous_repairing_original_work_id',
   'previous_reconciliation_target_work_id',v_target->>'previous_reconciliation_target_work_id',
   'previous_original_universe_event_id',v_target->>'previous_original_universe_event_id',
   'previous_target_universe_event_id',v_target->>'previous_target_universe_event_id',
   'independent_historical_readback_verified',true,
   'unresolved_historical_targets',0,
   'current_original_job_completed',false,
   'original_job_execution_replayed',false,
   'new_customer_job_created',false,
   'installation_authorized',false,
   'verified_human_hours_saved',null,
   'read_only',true,'production_changed',false,
   'recorded_at',v_at);
  v_digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
  update reality_internal.governed_employee_shift_steps_v1
   set state='BLOCKED_PROVIDER',source_status='VERIFIED_HISTORICAL_NOOP',
     proof=v_proof,proof_sha256=v_digest,completed_at=v_at,
     claim_id=null,claim_expires_at=null
   where shift_id=s.shift_id and step_index in (6,7)
     and state='AWAITING_EXACT_WORK';
  update reality_internal.governed_employee_shifts_v1
    set status='RUNNING',last_progress_at=v_at where shift_id=s.shift_id;
  return jsonb_build_object(
    'status','SHIFT_GOVERNED_HISTORICAL_NOOP_RECONCILED',
    'shift_id',s.shift_id,
    'original_work_id',v_link->>'governed_original_work_id',
    'source_proof_sha256',v_digest,
    'historical_reconciliation_verified',true,
    'original_job_completed',false,
    'original_job_execution_replayed',false,
    'new_customer_job_created',false,
    'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_reconcile_employee_shift_historical_noop_v1()
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_employee_shift_historical_noop_v1()
 to service_role;

-- Preserve all existing independent settlement checks. Only the final shift
-- categorization distinguishes verified read-only no-op from blocked failure.
create or replace function public.reality_close_employee_shift_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s record;v_now timestamptz:=clock_timestamp();v_report jsonb;
 v_historical_noop boolean;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into s from reality_internal.governed_employee_shifts_v1
 where status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED')
  and planned_end_at<=v_now
 order by planned_end_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_SHIFT_DUE_FOR_CLOSE');end if;
 select count(*)=2 into v_historical_noop
 from reality_internal.governed_employee_shift_steps_v1 t
 where t.shift_id=s.shift_id and t.step_index in (6,7)
  and t.state='BLOCKED_PROVIDER' and
   t.source_status='VERIFIED_HISTORICAL_NOOP'
  and t.proof->>'kind'='EXISTING_HISTORICAL_UNIVERSE_SATISFIED_NO_REPLAY'
  and t.proof->>'original_job_execution_replayed'='false'
  and t.proof->>'current_original_job_completed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(t.proof::text,'UTF8')),'hex');
 v_report:=jsonb_build_object(
   'status','EIGHT_HOUR_SHIFT_EVIDENCE_REPORT',
   'shift_id',s.shift_id,
   'source_checks_recorded',(select count(*) from
     reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.state='SOURCE_CHECKED'),
   'original_jobs_independently_settled_in_this_shift',(select count(*) from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
   'exact_original_job_binding_verified',(select count(*)=1 from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED'),
   'verified_historical_noop_without_new_execution',v_historical_noop,
   'new_original_job_completed_by_noop',false,
   'work_installation_authorized',false,
   'net_human_equivalent_hours_returned',null,
   'realized_cash_savings_usd',null,
   'ended_at',v_now,'production_changed',false,
   'blocked_work_included',not v_historical_noop);
 update reality_internal.governed_employee_shift_steps_v1
  set state='REPORTED',proof=v_report,
   proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_report::text,'UTF8')),'hex'),
   completed_at=v_now
  where shift_id=s.shift_id and step_index=8 and state='QUEUED';
 update reality_internal.governed_employee_shifts_v1
   set status=case when exists(select 1 from reality_internal.governed_employee_shift_steps_v1 t where t.shift_id=s.shift_id and t.step_index=6 and t.state='ORIGINAL_JOB_RECEIPT_VERIFIED') then 'ENDED_WITH_VERIFIED_JOB'
    when v_historical_noop then 'ENDED_READ_ONLY'
    else 'ENDED_WITH_BLOCKED_WORK' end,closed_at=v_now,
    close_report=v_report,last_progress_at=v_now where shift_id=s.shift_id;
 return v_report;
end $fn$;
revoke all on function public.reality_close_employee_shift_v1()
 from public,anon,authenticated;
grant execute on function public.reality_close_employee_shift_v1()
 to service_role;
