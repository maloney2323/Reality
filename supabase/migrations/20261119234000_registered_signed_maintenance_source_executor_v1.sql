-- Bind Reality's existing signed maintenance claim to an actually registered,
-- independently source-reobserving executor. This does NOT test/patch/install
-- code or mark the underlying maintenance repair complete.
alter table reality_internal.signed_maintenance_executor_claims_v1
 add column if not exists requalified_provider_sha256 text,
 add column if not exists requalified_source_checked_at timestamptz,
 add column if not exists requalification_receipt_sha256 text,
 add column if not exists requalified_at timestamptz;
do $guard$
begin
 if not exists(select 1 from pg_catalog.pg_constraint
  where conrelid='reality_internal.signed_maintenance_executor_claims_v1'::pg_catalog.regclass
   and conname='signed_maintenance_executor_requalification_proof_v1') then
  alter table reality_internal.signed_maintenance_executor_claims_v1
   add constraint signed_maintenance_executor_requalification_proof_v1 check(
    requalification_receipt_sha256 is null or (
     action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
     and state='COMPLETED'
     and requalified_provider_sha256 ~ '^sha256:[a-f0-9]{64}$'
     and requalification_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
     and requalified_source_checked_at is not null
     and requalified_at is not null));
 end if;
end $guard$;

-- Readiness gate in front of the EXISTING atomic claim function.
-- An unsupported action is NOT claimed, and none of its three retries is spent.
create or replace function public.reality_claim_registered_maintenance_action_v2(
 p_shift_id uuid,p_worker_run_id uuid,p_registered_action text)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare e record;v_next_action text;v_receipt jsonb;
begin
 if current_user<>'service_role' or p_shift_id is null or
  p_worker_run_id is null or p_registered_action not in(
   'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
   'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED')
 then raise exception 'MAINTENANCE_REGISTERED_EXECUTOR_SERVICE_AND_ACTION_REQUIRED';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
   where r.run_id=p_worker_run_id and r.status='STARTED'
    and r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes')
 then raise exception 'MAINTENANCE_REGISTERED_EXECUTOR_SIGNED_RUN_REQUIRED';end if;
 select ep.* into e
 from reality_internal.signed_maintenance_ci_source_epochs_v1 ep
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.incident_id=ep.maintenance_id and m.owner_id=ep.owner_id
   and m.source_ref=ep.source_ref
 join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=ep.shift_id and s.owner_id=ep.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 where ep.shift_id=p_shift_id
  and ep.epoch_status in(
   'SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED',
   'SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED')
  and ep.receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and ep.independent_review_receipt_sha256=m.independent_review_receipt_sha256
  and ep.baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
  and m.claimed_shift_id=s.shift_id
  and m.independent_frozen_test_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and s.closed_at is null
  and s.authorized_at is not null
  and s.planned_start_at<=pg_catalog.clock_timestamp()
  and (s.planned_end_at='infinity'::timestamptz
   or s.planned_end_at>pg_catalog.clock_timestamp())
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and w.state='ACTIVE'
  and exists(select 1 from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(w.source_scope)='array'
     then w.source_scope else '[]'::jsonb end) sc
    where sc->>'maintenance_id'=ep.maintenance_id::text
     and sc->>'origin_shift_id'=m.origin_shift_id::text
     and sc->>'source_ref'=m.source_ref
     and sc->>'independent_review_receipt_sha256'=
       m.independent_review_receipt_sha256)
  and not exists(select 1 from reality_internal.signed_maintenance_executor_claims_v1 c
   where c.maintenance_id=ep.maintenance_id
    and (c.state='COMPLETED' or c.attempt_count>=3
     or (c.state='CLAIMED' and c.lease_expires_at>pg_catalog.clock_timestamp())))
 order by ep.recorded_at,ep.maintenance_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_UNCLAIMED_AUTHORIZED_MAINTENANCE_EXECUTOR',
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);end if;
 v_next_action:=case when
  e.epoch_status='SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED'
  then 'REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
  else 'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED' end;
 if v_next_action<>p_registered_action then
  return pg_catalog.jsonb_build_object(
   'status','SIGNED_MAINTENANCE_ACTION_NOT_YET_EXECUTABLE',
   'maintenance_id',e.maintenance_id,'shift_id',e.shift_id,
   'next_action',v_next_action,
   'claimed',false,'retry_consumed',false,'repair_executed',false,
   'original_job_completed',false,'installation_authorized',false,
   'production_changed',false);
 end if;
 v_receipt:=public.reality_claim_signed_maintenance_executor_v1(
  p_shift_id,p_worker_run_id);
 if v_receipt->>'status'='SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED'
  and v_receipt->>'next_action'<>p_registered_action
 then raise exception 'MAINTENANCE_REGISTERED_ACTION_CLAIM_RACE_DRIFT';end if;
 return v_receipt;
end $fn$;

-- An independently signed later worker may preserve a new exact GitHub
-- source epoch. This completes source REQUALIFICATION ONLY, not CI or repair.
create or replace function public.reality_record_signed_maintenance_source_requalification_v1(
 p_maintenance_id uuid,p_worker_run_id uuid,p_provider_sha256 text,
 p_checked_at timestamptz)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;e record;m record;v_receipt text;v_now timestamptz;
begin
 v_now:=pg_catalog.clock_timestamp();
 if current_user<>'service_role' or p_maintenance_id is null or
  p_worker_run_id is null or p_provider_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_checked_at is null or
  p_checked_at<v_now-interval '3 minutes' or
  p_checked_at>v_now+interval '30 seconds'
 then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_SIGNED_PROOF_REQUIRED';end if;
 select * into c from reality_internal.signed_maintenance_executor_claims_v1
 where maintenance_id=p_maintenance_id and worker_run_id=p_worker_run_id
  and action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
  and state='CLAIMED' and lease_expires_at>v_now for update;
 if not found then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_ACTIVE_LEASE_REQUIRED';end if;
 select * into e from reality_internal.signed_maintenance_ci_source_epochs_v1
 where maintenance_id=c.maintenance_id and shift_id=c.shift_id
  and owner_id=c.owner_id and source_ref=c.source_ref
  and receipt_sha256=c.source_epoch_receipt_sha256
  and epoch_status='SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED'
  and worker_run_id<>p_worker_run_id;
 if not found then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_PREVIOUS_SIGNED_EPOCH_REQUIRED';end if;
 select m.* into m from reality_internal.owner_internal_maintenance_jobs_v1 m
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=c.shift_id and s.owner_id=c.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 where m.incident_id=c.maintenance_id and m.owner_id=c.owner_id
  and m.claimed_shift_id=c.shift_id and m.source_ref=c.source_ref
  and m.independent_review_receipt_sha256=e.independent_review_receipt_sha256
  and m.independent_failure_baseline_receipt_sha256=e.baseline_receipt_sha256
  and m.independent_frozen_test_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and s.closed_at is null
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=v_now
  and (s.planned_end_at='infinity'::timestamptz or s.planned_end_at>v_now)
  and exists(select 1 from pg_catalog.jsonb_array_elements(
   case when pg_catalog.jsonb_typeof(w.source_scope)='array'
    then w.source_scope else '[]'::jsonb end) sc
   where sc->>'maintenance_id'=m.incident_id::text
    and sc->>'origin_shift_id'=m.origin_shift_id::text
    and sc->>'source_ref'=m.source_ref
    and sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256);
 if not found then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_OWNER_WARRANT_DRIFT';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>v_now-interval '3 minutes')
 then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_INDEPENDENT_RUN_REQUIRED';end if;
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'signed-maintenance-source-requalified-v1|'||c.maintenance_id::text||'|'||
  c.shift_id::text||'|'||c.worker_run_id::text||'|'||
  c.source_epoch_receipt_sha256||'|'||p_provider_sha256||'|'||
  p_checked_at::text,'UTF8')),'hex');
 update reality_internal.signed_maintenance_executor_claims_v1
 set state='COMPLETED',requalified_provider_sha256=p_provider_sha256,
  requalified_source_checked_at=p_checked_at,
  requalification_receipt_sha256=v_receipt,requalified_at=v_now
 where maintenance_id=c.maintenance_id and worker_run_id=p_worker_run_id
  and state='CLAIMED';
 if not found then raise exception 'MAINTENANCE_SOURCE_REQUALIFICATION_UPDATE_UNCONFIRMED';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_SOURCE_REQUALIFIED_CI_RED_STILL_REQUIRED',
  'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
  'source_ref',c.source_ref,'historical_epoch_receipt_sha256',e.receipt_sha256,
  'verified_current_source_sha256',p_provider_sha256,
  'source_requalification_receipt_sha256',v_receipt,
  'independent_signed_worker_run_id',p_worker_run_id,
  'source_requalified',true,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

revoke all on function public.reality_claim_registered_maintenance_action_v2(
 uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.reality_record_signed_maintenance_source_requalification_v1(
 uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reality_claim_registered_maintenance_action_v2(
 uuid,uuid,text) to service_role;
grant execute on function public.reality_record_signed_maintenance_source_requalification_v1(
 uuid,uuid,text,timestamptz) to service_role;
