-- Apply the minimal claim correction to existing hosted database. The
-- unique insert still enforces one-use model attempts per maintenance order;
-- the immutable handoff row requires SELECT only, not UPDATE privilege.
create or replace function public.reality_claim_signed_maintenance_repair_candidate_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_claim record;
begin
 if current_user<>'service_role' or p_shift_id is null or
   p_worker_run_id is null or p_release_sha!~'^[a-f0-9]{40}$' then
   raise exception 'MAINTENANCE_CANDIDATE_SIGNED_WORKER_REQUIRED';
 end if;
 select h.*,m.maintenance_kind,m.failure_baseline_kind
 into v from reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=h.maintenance_id and m.owner_id=h.owner_id
  and m.claimed_shift_id=h.shift_id and m.source_ref=h.source_ref
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=h.shift_id and s.owner_id=h.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where h.shift_id=p_shift_id and h.work_phase='NEEDS_CASE_SPECIFIC_FROZEN_RED'
  and h.independent_baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1
   from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=m.incident_id::text
    and scope.entry->>'source_ref'=h.source_ref
    and scope.entry->>'origin_shift_id'=h.origin_shift_id::text
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.owner_maintenance_repair_candidates_v1 prior where prior.maintenance_id=h.maintenance_id)
 order by h.recorded_at,h.maintenance_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_REPAIR_CANDIDATE_READY',
  'model_invocation_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
 end if;
 insert into reality_internal.owner_maintenance_repair_candidates_v1(
 maintenance_id,owner_id,shift_id,source_ref,source_handoff_sha256,
 signed_worker_run_id,release_sha)
 values(v.maintenance_id,v.owner_id,p_shift_id,v.source_ref,
  v.handoff_receipt_sha256,p_worker_run_id,p_release_sha)
 on conflict(maintenance_id) do nothing
 returning * into v_claim;
 if not found then return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_MODEL_CANDIDATE_ALREADY_CLAIMED_NO_REPLAY',
  'maintenance_id',v.maintenance_id,'model_invocation_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_SIGNED_MAINTENANCE_MODEL_CANDIDATE_LEASED',
  'maintenance_id',v.maintenance_id,'shift_id',p_shift_id,
  'owner_id',v.owner_id,'source_ref',v.source_ref,
  'source_handoff_sha256',v.handoff_receipt_sha256,
  'original_work_id',v.existing_original_work_id,
  'maintenance_kind',v.maintenance_kind,
  'historical_failure_kind',v.failure_baseline_kind,
  'independent_baseline_receipt_sha256',v.independent_baseline_receipt_sha256,
  'independent_diagnostic_receipt_sha256',v.independent_diagnostic_receipt_sha256,
  'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
  'request_id',v_claim.request_id,'release_sha',p_release_sha,
  'model_invocation_authorized',true,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
