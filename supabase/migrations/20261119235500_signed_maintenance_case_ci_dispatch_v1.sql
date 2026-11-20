-- A signed maintenance lease may enqueue independent GitHub CI execution.
-- Trigger publication is NOT a failing test, repaired code, installation,
-- or an original business receipt. Current shift and exact warrant are reused.
alter table reality_internal.signed_maintenance_executor_claims_v1
 add column if not exists ci_trigger_commit_sha text,
 add column if not exists ci_trigger_receipt_sha256 text,
 add column if not exists ci_dispatched_at timestamptz;
do $constraint$
begin
 if not exists(select 1 from pg_catalog.pg_constraint
   where conrelid='reality_internal.signed_maintenance_executor_claims_v1'::regclass
    and conname='signed_maintenance_ci_trigger_receipt_v1') then
  alter table reality_internal.signed_maintenance_executor_claims_v1
   add constraint signed_maintenance_ci_trigger_receipt_v1 check (
    ci_trigger_receipt_sha256 is null or (
      action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
      and state='COMPLETED'
      and ci_trigger_commit_sha~'^[a-f0-9]{40}$'
      and ci_trigger_receipt_sha256~'^sha256:[a-f0-9]{64}$'
      and ci_dispatched_at is not null));
 end if;
end $constraint$;
create or replace function public.reality_read_signed_maintenance_ci_dispatch_scope_v1(
 p_shift_id uuid,p_maintenance_id uuid,p_worker_run_id uuid)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;e record;m record;s record;
begin
 if current_user<>'service_role' or p_shift_id is null or
    p_maintenance_id is null or p_worker_run_id is null
 then raise exception 'MAINTENANCE_CASE_CI_SERVICE_WORKER_REQUIRED';end if;
 select * into c from reality_internal.signed_maintenance_executor_claims_v1
 where shift_id=p_shift_id and maintenance_id=p_maintenance_id
  and worker_run_id=p_worker_run_id
  and action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
  and state='CLAIMED' and lease_expires_at>pg_catalog.clock_timestamp();
 if not found then raise exception 'MAINTENANCE_CASE_CI_ACTIVE_SIGNED_LEASE_REQUIRED';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=c.worker_run_id and r.status='STARTED'
    and r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes')
 then raise exception 'MAINTENANCE_CASE_CI_ACTIVE_SIGNED_RUN_REQUIRED';end if;
 select * into e from reality_internal.signed_maintenance_ci_source_epochs_v1
 where maintenance_id=c.maintenance_id and owner_id=c.owner_id
   and shift_id=c.shift_id and source_ref=c.source_ref
   and receipt_sha256=c.source_epoch_receipt_sha256
   and epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED';
 if not found then raise exception 'MAINTENANCE_CASE_CI_CURRENT_SOURCE_EPOCH_REQUIRED';end if;
 select * into m from reality_internal.owner_internal_maintenance_jobs_v1
 where incident_id=c.maintenance_id and owner_id=c.owner_id
   and claimed_shift_id=c.shift_id and source_ref=c.source_ref
   and independent_review_receipt_sha256=e.independent_review_receipt_sha256
   and independent_failure_baseline_receipt_sha256=e.baseline_receipt_sha256
   and original_customer_work_id is null
   and independent_frozen_test_receipt_sha256 is null
   and original_job_completed=false and production_changed=false;
 if not found then raise exception 'MAINTENANCE_CASE_CI_EXACT_UNREPAIRED_INCIDENT_REQUIRED';end if;
 select sh.* into s from reality_internal.governed_employee_shifts_v1 sh
 join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
     and w.plan_fingerprint=sh.plan_fingerprint
     and w.state='ACTIVE'
     and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 where sh.shift_id=c.shift_id and sh.owner_id=c.owner_id
   and sh.closed_at is null and sh.authorized_at is not null
   and sh.planned_start_at<=pg_catalog.clock_timestamp()
   and (sh.planned_end_at='infinity'::timestamptz
     or sh.planned_end_at>pg_catalog.clock_timestamp())
   and sh.status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
   and exists(select 1 from pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(w.source_scope)='array'
       then w.source_scope else '[]'::jsonb end) sc
     where sc->>'maintenance_id'=m.incident_id::text
       and sc->>'origin_shift_id'=m.origin_shift_id::text
       and sc->>'source_ref'=m.source_ref
       and sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256);
 if not found then raise exception 'MAINTENANCE_CASE_CI_ACTIVE_OWNER_WARRANT_REQUIRED';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CASE_CI_DISPATCH_AUTHORIZED',
  'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
  'worker_run_id',c.worker_run_id,'source_ref',c.source_ref,
  'source_epoch_receipt_sha256',c.source_epoch_receipt_sha256,
  'historical_failure_kind',m.failure_baseline_kind,
  'dispatch_is_only_transport',true,
  'frozen_ci_red_verified',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
create or replace function public.reality_record_signed_maintenance_ci_dispatch_v1(
 p_shift_id uuid,p_maintenance_id uuid,p_worker_run_id uuid,
 p_github_commit_sha text)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;v_receipt text;v_time timestamptz;
begin
 v_time:=pg_catalog.clock_timestamp();
 if current_user<>'service_role' or p_shift_id is null
   or p_maintenance_id is null or p_worker_run_id is null
   or p_github_commit_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'MAINTENANCE_CASE_CI_DISPATCH_SIGNED_PROOF_REQUIRED';end if;
 select * into c from reality_internal.signed_maintenance_executor_claims_v1
 where shift_id=p_shift_id and maintenance_id=p_maintenance_id
  and worker_run_id=p_worker_run_id
  and action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
  and state='CLAIMED' and lease_expires_at>v_time for update;
 if not found then raise exception 'MAINTENANCE_CASE_CI_DISPATCH_LEASE_CHANGED';end if;
 -- A dispatch receipt is NOT evidence that CI ran or failed. The independent
 -- GitHub Actions verifier must separately inspect the test run and bytes.
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'maintenance-ci-dispatch-only-v1|'||c.maintenance_id::text||'|'||
  c.shift_id::text||'|'||c.worker_run_id::text||'|'||
  c.source_epoch_receipt_sha256||'|'||p_github_commit_sha,'UTF8')),'hex');
 update reality_internal.signed_maintenance_executor_claims_v1
 set state='COMPLETED',ci_trigger_commit_sha=p_github_commit_sha,
     ci_trigger_receipt_sha256=v_receipt,ci_dispatched_at=v_time
 where maintenance_id=c.maintenance_id and worker_run_id=c.worker_run_id
  and state='CLAIMED';
 if not found then raise exception 'MAINTENANCE_CASE_CI_DISPATCH_RECORD_NOT_COMMITTED';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED',
  'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
  'source_ref',c.source_ref,'github_trigger_commit_sha',p_github_commit_sha,
  'ci_dispatch_receipt_sha256',v_receipt,
  'github_test_run_verified',false,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_signed_maintenance_ci_dispatch_scope_v1(
 uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_signed_maintenance_ci_dispatch_v1(
 uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_signed_maintenance_ci_dispatch_scope_v1(
 uuid,uuid,uuid) to service_role;
grant execute on function public.reality_record_signed_maintenance_ci_dispatch_v1(
 uuid,uuid,uuid,text) to service_role;
