-- Keep the exact owner's requalification receipt while advancing the
-- SAME signed maintenance incident into its already-authorized CI stage.
-- This corrects a one-row-per-maintenance state machine dead end.
alter table reality_internal.signed_maintenance_executor_claims_v1
 add column if not exists requalification_worker_run_id uuid;
update reality_internal.signed_maintenance_executor_claims_v1
set requalification_worker_run_id=worker_run_id
where action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
 and state='COMPLETED'
 and requalification_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 and requalification_worker_run_id is null;
alter table reality_internal.signed_maintenance_executor_claims_v1
 drop constraint signed_maintenance_executor_requalification_proof_v1;
alter table reality_internal.signed_maintenance_executor_claims_v1
 add constraint signed_maintenance_executor_requalification_proof_v1 check(
 requalification_receipt_sha256 is null or(
  requalified_provider_sha256~'^sha256:[a-f0-9]{64}$'
  and requalification_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and requalified_source_checked_at is not null
  and requalified_at is not null
  and requalification_worker_run_id is not null
  and ((action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
    and state='COMPLETED') or
   (action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
    and state in('CLAIMED','FAILED_RETRYABLE','COMPLETED')))));

-- Read-only, active signed worker preflight. Never lease or spend attempts.
create or replace function public.reality_read_requalified_maintenance_ci_preflight_v1(
 p_shift_id uuid,p_worker_run_id uuid)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare c record;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'MAINTENANCE_CI_REQUALIFIED_SERVICE_WORKER_REQUIRED';end if;
 if not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
    and r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes')
 then raise exception 'MAINTENANCE_CI_REQUALIFIED_SIGNED_RUN_REQUIRED';end if;
 select x.* into c
 from reality_internal.signed_maintenance_executor_claims_v1 x
 join reality_internal.signed_maintenance_ci_source_epochs_v1 e
   on e.maintenance_id=x.maintenance_id and e.owner_id=x.owner_id
   and e.shift_id=x.shift_id and e.source_ref=x.source_ref
   and e.receipt_sha256=x.source_epoch_receipt_sha256
   and e.epoch_status='SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED'
 join reality_internal.owner_internal_maintenance_jobs_v1 m
   on m.incident_id=x.maintenance_id and m.owner_id=x.owner_id
   and m.claimed_shift_id=x.shift_id and m.source_ref=x.source_ref
   and m.independent_review_receipt_sha256=e.independent_review_receipt_sha256
   and m.independent_failure_baseline_receipt_sha256=e.baseline_receipt_sha256
 join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=x.shift_id and s.owner_id=x.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
   and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 where x.shift_id=p_shift_id
   and x.action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
   and x.state='COMPLETED' and x.worker_run_id<>p_worker_run_id
   and x.requalification_worker_run_id=x.worker_run_id
   and x.requalification_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and x.requalified_provider_sha256~'^sha256:[a-f0-9]{64}$'
   and x.requalified_at is not null
   and x.ci_trigger_receipt_sha256 is null
   and x.ci_independent_diagnostic_receipt_sha256 is null
   and m.independent_frozen_test_receipt_sha256 is null
   and m.original_job_completed=false and m.production_changed=false
   and s.closed_at is null and s.authorized_at is not null
   and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_start_at<=pg_catalog.clock_timestamp()
   and (s.planned_end_at='infinity'::timestamptz
    or s.planned_end_at>pg_catalog.clock_timestamp())
   and exists(select 1 from pg_catalog.jsonb_array_elements(
    case when pg_catalog.jsonb_typeof(w.source_scope)='array'
     then w.source_scope else '[]'::jsonb end) sc
    where sc->>'maintenance_id'=m.incident_id::text
      and sc->>'origin_shift_id'=m.origin_shift_id::text
      and sc->>'source_ref'=m.source_ref
      and sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 order by x.requalified_at,x.maintenance_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_REQUALIFIED_MAINTENANCE_CI_READY',
  'claim_consumed',false,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_REQUALIFIED_MAINTENANCE_CI_NEEDS_FRESH_SOURCE',
  'shift_id',c.shift_id,'owner_id',c.owner_id,
  'maintenance_id',c.maintenance_id,
  'source_ref',c.source_ref,
  'source_epoch_receipt_sha256',c.source_epoch_receipt_sha256,
  'source_requalification_receipt_sha256',c.requalification_receipt_sha256,
  'requalified_provider_sha256',c.requalified_provider_sha256,
  'original_requalification_worker_run_id',c.requalification_worker_run_id,
  'claim_consumed',false,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

-- Advance the exact same incident only if a second fresh GitHub read
-- matches the independently verified requalified source. Preservation of
-- the prior receipt and separate attempt count is mandatory.
create or replace function public.reality_promote_requalified_maintenance_to_ci_claim_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_provider_sha256 text,p_checked_at timestamptz)
 returns jsonb language plpgsql set search_path to '' as $fn$
declare pre jsonb;c record;v_now timestamptz;
begin
 v_now:=pg_catalog.clock_timestamp();
 if current_user<>'service_role' or p_shift_id is null or
    p_worker_run_id is null or p_maintenance_id is null or
    p_provider_sha256 !~ '^sha256:[a-f0-9]{64}$' or
    p_checked_at is null or p_checked_at<v_now-interval '3 minutes'
    or p_checked_at>v_now+interval '30 seconds'
 then raise exception 'MAINTENANCE_CI_REQUALIFIED_PROMOTION_FRESH_PROOF_REQUIRED';end if;
 -- Revalidate current owner warrant, original maintenance source and
 -- signed worker at the point of update; no second shift or owner scope.
 pre:=public.reality_read_requalified_maintenance_ci_preflight_v1(
  p_shift_id,p_worker_run_id);
 if pre->>'status'<>'SIGNED_REQUALIFIED_MAINTENANCE_CI_NEEDS_FRESH_SOURCE' or
    pre->>'maintenance_id'<>p_maintenance_id::text
 then return pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_REQUALIFIED_CI_PROMOTION_SCOPE_CHANGED',
  'claim_consumed',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 if p_provider_sha256<>pre->>'requalified_provider_sha256'
 then return pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_SOURCE_CHANGED_AFTER_REQUALIFICATION',
  'shift_id',p_shift_id,'maintenance_id',p_maintenance_id,
  'claim_consumed',false,'fresh_requalification_required',true,
  'frozen_ci_red_verified',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);end if;
 update reality_internal.signed_maintenance_executor_claims_v1
 set action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
    state='CLAIMED',worker_run_id=p_worker_run_id,attempt_count=1,
    claimed_at=v_now,lease_expires_at=v_now+interval '10 minutes',
    last_error_code=null,last_error_at=null
 where maintenance_id=p_maintenance_id and shift_id=p_shift_id
   and owner_id=(pre->>'owner_id')::uuid
   and worker_run_id=(pre->>'original_requalification_worker_run_id')::uuid
   and requalification_worker_run_id=worker_run_id
   and action='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'
   and state='COMPLETED'
   and source_epoch_receipt_sha256=pre->>'source_epoch_receipt_sha256'
   and requalification_receipt_sha256=
      pre->>'source_requalification_receipt_sha256'
   and requalified_provider_sha256=p_provider_sha256
   and ci_trigger_receipt_sha256 is null
 returning * into c;
 if not found then raise exception 'MAINTENANCE_CI_REQUALIFIED_ATOMIC_PROMOTION_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_EXECUTOR_DURABLY_CLAIMED',
  'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
  'worker_run_id',c.worker_run_id,'source_ref',c.source_ref,
  'source_epoch_receipt_sha256',c.source_epoch_receipt_sha256,
  'source_requalification_receipt_sha256',c.requalification_receipt_sha256,
  'requalified_provider_sha256',c.requalified_provider_sha256,
  'next_action',c.action,'claim_attempt',c.attempt_count,
  'lease_expires_at',c.lease_expires_at,
  'handoff_executed',false,'independent_frozen_ci_red_verified',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

revoke all on function public.reality_read_requalified_maintenance_ci_preflight_v1(uuid,uuid)
 from public,anon,authenticated;
revoke all on function public.reality_promote_requalified_maintenance_to_ci_claim_v1(
 uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.reality_read_requalified_maintenance_ci_preflight_v1(uuid,uuid)
 to service_role;
grant execute on function public.reality_promote_requalified_maintenance_to_ci_claim_v1(
 uuid,uuid,uuid,text,timestamptz) to service_role;
