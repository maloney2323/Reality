-- Hosted upgrade for the existing bounded model source recovery function.
-- The failed attempt is append-only and only one new pinned release may retry.
create or replace function public.reality_recover_signed_maintenance_repair_candidate_source_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_new record;
begin
 if current_user<>'service_role' or p_shift_id is null or
    p_worker_run_id is null or p_release_sha!~'^[a-f0-9]{40}$' then
  raise exception 'SIGNED_SOURCE_MODEL_RECOVERY_SERVICE_REQUIRED';
 end if;
 select c.*,h.existing_original_work_id,
  h.independent_baseline_receipt_sha256,
  h.independent_diagnostic_receipt_sha256,
  h.source_epoch_receipt_sha256,
  m.maintenance_kind,m.failure_baseline_kind
 into v
 from reality_internal.owner_maintenance_repair_candidates_v1 c
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=c.maintenance_id and h.owner_id=c.owner_id
  and h.shift_id=c.shift_id and h.source_ref=c.source_ref
  and h.handoff_receipt_sha256=c.source_handoff_sha256
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=c.maintenance_id and m.owner_id=c.owner_id
  and m.claimed_shift_id=c.shift_id and m.source_ref=c.source_ref
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=c.shift_id and s.owner_id=c.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where c.shift_id=p_shift_id and c.state='PROVIDER_UNVERIFIED'
  and c.failure_reason in ('SIGNED_MAINTENANCE_MODEL_GITHUB_SOURCE_UNVERIFIED',
   'MODEL_SOURCE_OR_TRANSPORT_UNVERIFIED')
  and c.recovery_attempts=0 and c.release_sha<>p_release_sha
  and c.claimed_at<clock_timestamp()-interval '1 minute'
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and w.state='ACTIVE' and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=c.maintenance_id::text
    and scope.entry->>'source_ref'=c.source_ref
    and scope.entry->>'origin_shift_id'=h.origin_shift_id::text
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED' and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.owner_maintenance_model_source_failed_attempts_v1 history
   where history.maintenance_id=c.maintenance_id)
 order by c.claimed_at,c.maintenance_id
 limit 1 for update of c skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_SOURCE_RECOVERY_READY',
  'model_invocation_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
 end if;
 insert into reality_internal.owner_maintenance_model_source_failed_attempts_v1(
  maintenance_id,owner_id,shift_id,source_ref,source_handoff_sha256,
  original_request_id,original_worker_run_id,original_release_sha,
  original_failure_reason,original_claimed_at,original_failed_at,
  recovery_worker_run_id,recovery_release_sha)
 values(v.maintenance_id,v.owner_id,v.shift_id,v.source_ref,
  v.source_handoff_sha256,v.request_id,v.signed_worker_run_id,
  v.release_sha,v.failure_reason,v.claimed_at,v.recorded_at,
  p_worker_run_id,p_release_sha);
 update reality_internal.owner_maintenance_repair_candidates_v1 c
 set state='CLAIMED',request_id=pg_catalog.gen_random_uuid(),
  signed_worker_run_id=p_worker_run_id,release_sha=p_release_sha,
  recovery_attempts=1,source_path=null,source_blob_sha=null,
  source_file_sha256=null,provider_observation_sha256=null,
  model_response_id=null,candidate_patch=null,proposed_source_sha256=null,
  candidate_receipt_sha256=null,failure_reason=null,
  claimed_at=clock_timestamp(),recorded_at=null
 where maintenance_id=v.maintenance_id and request_id=v.request_id
  and state='PROVIDER_UNVERIFIED' and recovery_attempts=0
 returning * into v_new;
 if not found then raise exception 'SIGNED_SOURCE_RECOVERY_CONCURRENT_CLAIM_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_SIGNED_MAINTENANCE_MODEL_CANDIDATE_LEASED',
  'maintenance_id',v_new.maintenance_id,'shift_id',v_new.shift_id,
  'owner_id',v_new.owner_id,'source_ref',v_new.source_ref,
  'source_handoff_sha256',v_new.source_handoff_sha256,
  'original_work_id',v.existing_original_work_id,
  'maintenance_kind',v.maintenance_kind,
  'historical_failure_kind',v.failure_baseline_kind,
  'independent_baseline_receipt_sha256',v.independent_baseline_receipt_sha256,
  'independent_diagnostic_receipt_sha256',v.independent_diagnostic_receipt_sha256,
  'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
  'request_id',v_new.request_id,'release_sha',v_new.release_sha,
  'recovery_attempts',1,'old_failed_attempt_preserved',true,
  'model_invocation_authorized',true,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
