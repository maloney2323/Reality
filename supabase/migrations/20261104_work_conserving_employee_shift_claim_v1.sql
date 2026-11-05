-- Work-conserving Reality employee shift (isolated Supabase only).
-- No arbitrary 45/60/90-minute pacing. Worker wakes at trusted cron cadence,
-- immediately claims the next eligible already-authorized source-readback step.
-- Does NOT extend eight-hour shift, create jobs, auto-install, or bypass owner gates.
-- When one shift has no claimable work, another due shift may progress.
-- Non-blocking recovery for the already-authorized isolated employee shift.
-- No extension of planned timebox or of execution/install authority.
-- After three failed provider readbacks, record a truthful blocked observation,
-- continue later authorized source checks and keep final-report reconciliation.
-- At the exact-original-work gate, continue evaluating the later acceptance
-- window without fabricating an original job or granting install authority.
create or replace function public.reality_claim_employee_shift_step_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift record;v_step record;v_claim uuid;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select s.* into v_shift from reality_internal.governed_employee_shifts_v1 s
  where s.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ESCALATED')
   and s.planned_start_at<=v_now
   and s.planned_end_at>v_now
   and exists (select 1 from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id and t.state in ('QUEUED','CLAIMED'))
  order by s.planned_start_at,s.created_at for update of s skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_DUE_AUTHORIZED_SHIFT');end if;
 select * into v_step from reality_internal.governed_employee_shift_steps_v1
  where shift_id=v_shift.shift_id and state in ('QUEUED','CLAIMED')
  order by step_index for update limit 1;
 if not found then return jsonb_build_object('status','NO_CLAIMABLE_STEP');end if;
 -- Work-conserving shift: claim the next authorized step immediately.
 -- Legacy per-step planning offsets are NOT required worker wait times.
 -- The approved start/end timebox and exact source allowlist remain binding.
 if v_step.state='CLAIMED' and v_step.claim_expires_at>v_now
   then return jsonb_build_object('status','INFLIGHT_LEASE_UNEXPIRED');end if;
 if v_step.state='CLAIMED' and v_step.attempts>=3 then
  update reality_internal.governed_employee_shift_steps_v1
    set state='BLOCKED_PROVIDER',claim_id=null,claim_expires_at=null,
     source_status='RETRY_EXHAUSTED_UNVERIFIED',completed_at=v_now,
     proof=pg_catalog.jsonb_build_object(
       'kind','PROVIDER_EVIDENCE_UNAVAILABLE','status','BLOCKED_READBACK_ONLY',
       'source_ref',v_step.source_ref,'attempts',v_step.attempts,
       'read_only',true,'provider_checked',false,'original_job_completed',false,
       'installation_authorized',false,'production_changed',false)
   where shift_id=v_shift.shift_id and step_index=v_step.step_index;
  update reality_internal.governed_employee_shifts_v1
    set status='RUNNING',last_progress_at=v_now where shift_id=v_shift.shift_id;
  return pg_catalog.jsonb_build_object('status','STEP_BLOCKED_SHIFT_CONTINUES',
   'shift_id',v_shift.shift_id,'step_index',v_step.step_index,
   'no_external_write_authority',true,'installation_authorized',false,
   'production_changed',false);end if;
 if v_step.step_index=8 then
  return jsonb_build_object('status','SHIFT_FINAL_REPORT_NOT_DUE',
   'shift_id',v_shift.shift_id);
 end if;
 if v_step.step_index>=6 then
  update reality_internal.governed_employee_shift_steps_v1
    set state='AWAITING_EXACT_WORK'
   where shift_id=v_shift.shift_id and step_index=v_step.step_index;
  update reality_internal.governed_employee_shifts_v1
    set status='AWAITING_EXACT_ORIGINAL_WORK',last_progress_at=v_now
   where shift_id=v_shift.shift_id;
  return jsonb_build_object('status','EXACT_ORIGINAL_JOB_AUTHORITY_REQUIRED',
    'shift_id',v_shift.shift_id,'installation_authorized',false);
 end if;
 v_claim:=gen_random_uuid();
 update reality_internal.governed_employee_shift_steps_v1
  set state='CLAIMED',claim_id=v_claim,claimed_at=v_now,
   claim_expires_at=v_now+interval '3 minutes',attempts=attempts+1
  where shift_id=v_shift.shift_id and step_index=v_step.step_index;
 update reality_internal.governed_employee_shifts_v1
  set status='RUNNING',last_progress_at=v_now where shift_id=v_shift.shift_id;
 return jsonb_build_object('status','READ_ONLY_STEP_CLAIMED',
  'shift_id',v_shift.shift_id,'step_index',v_step.step_index,
  'stage',v_step.stage,'source_ref',v_step.source_ref,
  'claim_id',v_claim,'owner_id',v_shift.owner_id,
  'no_external_write_authority',true);
end $fn$;

revoke all on function public.reality_claim_employee_shift_step_v1() from public,anon,authenticated;
grant execute on function public.reality_claim_employee_shift_step_v1() to service_role;
