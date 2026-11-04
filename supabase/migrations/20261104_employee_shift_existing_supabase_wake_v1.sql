-- Existing Supabase cron + pg_net transport; no calls to protected Vercel.
-- A limited 64-hex delivery credential is stored in Supabase Vault.
-- This RPC is exclusively invokable by service_role in the Edge function.
create or replace function public.reality_authenticate_employee_shift_wake_v1(p_token text)
returns jsonb language plpgsql security invoker set search_path='' as $auth$
declare v_expected text;v_provided text;
begin
 if current_user<>'service_role' then raise exception 'SHIFT_WAKE_SERVICE_ONLY';end if;
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
  return pg_catalog.jsonb_build_object('status','WAKE_DENIED');
 end if;
 select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  decrypted_secret,'UTF8')),'hex') into v_expected
 from vault.decrypted_secrets where name='reality_employee_shift_worker_token_v1'
 limit 1;
 v_provided:=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(p_token,'UTF8')),'hex');
 if v_expected is null or v_expected<>v_provided then
  return pg_catalog.jsonb_build_object('status','WAKE_DENIED');
 end if;
 return pg_catalog.jsonb_build_object(
  'status','ISOLATED_SHIFT_WAKE_AUTHENTICATED',
  'permission_granted',false,'job_started',false,
  'installation_authorized',false,'production_changed',false);
end $auth$;
revoke all on function public.reality_authenticate_employee_shift_wake_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_authenticate_employee_shift_wake_v1(text)
 to service_role;

create or replace function public.reality_claim_employee_shift_step_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_shift record;v_step record;v_claim uuid;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 select * into v_shift from reality_internal.governed_employee_shifts_v1
  where status in ('QUEUED','RUNNING') and planned_start_at<=v_now
   and planned_end_at>v_now
  order by planned_start_at,created_at for update skip locked limit 1;
 if not found then return jsonb_build_object('status','NO_DUE_AUTHORIZED_SHIFT');end if;
 select * into v_step from reality_internal.governed_employee_shift_steps_v1
  where shift_id=v_shift.shift_id and state in ('QUEUED','CLAIMED')
  order by step_index for update limit 1;
 if not found then return jsonb_build_object('status','NO_CLAIMABLE_STEP');end if;
 -- Enforce the planned shift sequence rather than consuming all slots at once.
 -- The worker has NO authority to reschedule the owner-approved timebox.
 if v_now < v_shift.planned_start_at +
    pg_catalog.make_interval(mins => v_step.offset_start_minutes) then
  return pg_catalog.jsonb_build_object('status','SHIFT_STEP_NOT_YET_DUE',
   'shift_id',v_shift.shift_id,
   'step_index',v_step.step_index,
   'permission_granted',false);
 end if;
 if v_step.state='CLAIMED' and v_step.claim_expires_at>v_now
   then return jsonb_build_object('status','INFLIGHT_LEASE_UNEXPIRED');end if;
 if v_step.state='CLAIMED' and v_step.attempts>=3 then
  update reality_internal.governed_employee_shift_steps_v1
    set state='BLOCKED_PROVIDER',claim_id=null
   where shift_id=v_shift.shift_id and step_index=v_step.step_index;
  update reality_internal.governed_employee_shifts_v1
    set status='ESCALATED',last_progress_at=v_now where shift_id=v_shift.shift_id;
  return jsonb_build_object('status','LEASE_EXHAUSTED_ESCALATED');end if;
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

revoke all on function public.reality_claim_employee_shift_step_v1()
 from public,anon,authenticated;
grant execute on function public.reality_claim_employee_shift_step_v1()
 to service_role;
