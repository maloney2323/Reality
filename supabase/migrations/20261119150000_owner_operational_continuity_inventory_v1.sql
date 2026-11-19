-- Reality: preserve complete owner shift/evidence visibility and return one authoritative work inventory.
-- Read-only; no new grants for execution, installations, or scheduler changes.
DO $guard$
BEGIN
 IF position('order by created_at desc limit 5)' in pg_get_functiondef('public.reality_read_owner_employee_shifts_v1(uuid)'::regprocedure))=0
 THEN RAISE EXCEPTION 'OWNER_SHIFT_READER_DRIFT_FAIL_CLOSED'; END IF;
 IF position('order by qualified_at desc limit 12' in pg_get_functiondef('public.reality_read_owner_qualified_employee_evidence_jobs_v1(uuid)'::regprocedure))=0
 THEN RAISE EXCEPTION 'EVIDENCE_JOB_READER_DRIFT_FAIL_CLOSED'; END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.reality_read_owner_employee_shifts_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 if p_owner_id is null then raise exception 'SHIFT_OWNER_REQUIRED';end if;
 return jsonb_build_object(
  'status','OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  'shifts',coalesce((
   select jsonb_agg(jsonb_build_object(
    'shift_id',s.shift_id,'status',s.status,
    'plan_fingerprint',s.plan_fingerprint,
    'planned_start_at',s.planned_start_at,
    'planned_end_at',s.planned_end_at,
    'authorized_at',s.authorized_at,'closed_at',s.closed_at,
    'close_report',s.close_report,
    'steps',coalesce((select jsonb_agg(jsonb_build_object(
     'step_index',t.step_index,'stage',t.stage,'state',t.state,
     'source_ref',t.source_ref,'duration_minutes',t.duration_minutes,
     'source_status',t.source_status,'proof_sha256',t.proof_sha256,
     'completed_at',t.completed_at,
     'role_handoff_status',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
       and (t.proof->>'source_url')=t.source_ref
       and (t.proof->'combined_role_handoff'->>'version')=
         'reality-one-openai-coordinated-role-handoff-v1'
       and (t.proof->'combined_role_handoff'->>'shift_id')=t.shift_id::text
       and (t.proof->'combined_role_handoff'->>'step_index')=t.step_index::text
       and (t.proof->'combined_role_handoff'->>'source_ref')=t.source_ref
       and (t.proof->'combined_role_handoff'->>'one_shared_openai_provider')='true'
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
       and (t.proof->'combined_role_handoff'->>'installation_authorized')='false'
       and (t.proof->'combined_role_handoff'->>'independent_verification_performed')='false'
       and t.proof->'combined_role_handoff'->>'status' in (
         'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK',
         'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM')
     then t.proof->'combined_role_handoff'->>'status' else null end,
     'role_handoff_reason',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
       and t.proof->>'source_url'=t.source_ref
       and t.proof->'combined_role_handoff'->>'version'=
         'reality-one-openai-coordinated-role-handoff-v1'
       and t.proof->'combined_role_handoff'->>'shift_id'=t.shift_id::text
       and t.proof->'combined_role_handoff'->>'step_index'=t.step_index::text
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and t.proof->'combined_role_handoff'->>'status'=
         'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM'
       and t.proof->'combined_role_handoff'->>'original_job_completed'='false'
       and t.proof->'combined_role_handoff'->>'installation_authorized'='false'
       and t.proof->'combined_role_handoff'->>'independent_verification_performed'='false'
       and t.proof->'combined_role_handoff'->>'reason' in (
         'OPENAI_RESPONSE_UNAVAILABLE','OPENAI_REQUEST_OPTIONS_REJECTED',
         'OPENAI_CREDENTIAL_OR_MODEL_ACCESS_REJECTED',
         'OPENAI_MODEL_OR_ENDPOINT_NOT_FOUND',
         'OPENAI_RATE_OR_QUOTA_LIMIT','OPENAI_PROVIDER_SERVER_FAILURE',
         'OPENAI_REQUEST_OR_TIMEOUT_UNVERIFIED',
         'SHARED_OPENAI_ADAPTER_NOT_CONFIGURED','PROVIDER_SOURCE_NO_LONGER_OPEN',
         'OPENAI_PROVIDER_RESULT_UNVERIFIED','OPENAI_EMPTY_FINAL_ADVISORY')
     then t.proof->'combined_role_handoff'->>'reason' else null end,
     'role_handoff_labels',case when
       t.step_index between 2 and 5
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
       and (t.proof->'combined_role_handoff'->>'installation_authorized')='false'
       and jsonb_typeof(t.proof->'combined_role_handoff'->'roles')='array'
     then t.proof->'combined_role_handoff'->'roles'
     else '[]'::jsonb end,
     'role_handoff_advisory',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->'combined_role_handoff'->>'status'=
        'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK'
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and (t.proof->'combined_role_handoff'->>'independent_verification_performed')='false'
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
     then left(t.proof->'combined_role_handoff'->>'model_advice',1200)
     else null end) order by t.step_index)
    from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id),'[]'::jsonb)) order by s.created_at desc)
   from (select * from reality_internal.governed_employee_shifts_v1
    where owner_id=p_owner_id order by created_at desc limit 25) s),'[]'::jsonb),
  'work_installation_authorized_by_read',false,
  'verified_human_hours_saved',null,'production_changed',false);
end $function$;

CREATE OR REPLACE FUNCTION public.reality_read_owner_qualified_employee_evidence_jobs_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare counts jsonb; items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'QUALIFIED_EVIDENCE_WORK_OWNER_SERVICE_REQUIRED';end if;
 select pg_catalog.jsonb_build_object(
  'qualified_executable',count(*) filter(where phase='QUALIFIED_EXECUTABLE'),
  'executing',count(*) filter(where phase in ('EXECUTION_CLAIMED','REVIEW_CLAIMED','REQUALIFICATION_CLAIMED')),
  'pending_independent_verification',count(*) filter(where phase='SUBMITTED_AWAITING_INDEPENDENT_RECHECK'),
  'independently_completed',count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED'),
  'blocked',count(*) filter(where phase like 'BLOCKED_%'),
  'total',count(*)
 ) into counts
 from reality_internal.owner_qualified_employee_evidence_jobs_v1
 where owner_id=p_owner_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'job_id',j.job_id,'shift_id',j.shift_id,'employee',j.employee,
  'job_type',j.job_type,'source_ref',j.source_ref,
  'objective',j.objective,'phase',j.phase,
  'qualification_receipt_sha256',j.qualification_receipt_sha256,
  'deliverable_receipt_sha256',j.deliverable_receipt_sha256,
  'recovery_attempts',j.recovery_attempts,
  'recovery_receipt_sha256',j.recovery_receipt_sha256,
  'last_failure_reason',j.last_failure_reason,
  'independent_receipt_sha256',j.independent_receipt_sha256,
  'deliverable',j.deliverable,'blocker',j.blocker,
  'execution_worker_run_id',j.execution_worker_run_id,
  'review_worker_run_id',j.review_worker_run_id,
  'qualified_at',j.qualified_at,'verified_at',j.verified_at,
  'evidence_job_completed',j.phase='COMPLETED_INDEPENDENTLY_VERIFIED',
  'original_customer_job_completed',false,
  'code_repair_installed',false,'production_changed',false
 ) order by j.qualified_at desc),'[]'::jsonb) into items from(
  select * from reality_internal.owner_qualified_employee_evidence_jobs_v1
  where owner_id=p_owner_id order by qualified_at desc limit 100
 ) j;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SOURCE_QUALIFIED_EMPLOYEE_WORK_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'counts',counts,'items',items,'installation_authorized_by_read',false,
  'original_customer_job_completed_by_read',false,'production_changed',false);
end $function$;


-- A read-only lens over existing ledger, calendar, and maintenance tables.
-- It is not a second planner/dispatcher, approval system, or job queue.
CREATE OR REPLACE FUNCTION public.reality_read_owner_operational_continuity_v1(p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
 v_shifts jsonb; v_roles jsonb; v_due jsonb; v_maint jsonb;
 v_total_shifts integer; v_active_shifts integer; v_calendar_count integer;
 v_planned integer; v_verified integer; v_evidence_total integer;
 v_evidence_verified integer; v_evidence_blocked integer;
 v_maintenance_ci_red integer; v_checked timestamptz:=clock_timestamp();
 v_business_date date:=timezone('America/New_York',clock_timestamp())::date;
BEGIN
 IF current_user <> 'service_role' OR p_owner_id IS NULL
 THEN RAISE EXCEPTION 'OPERATIONAL_CONTINUITY_OWNER_SERVICE_REQUIRED'; END IF;
 SELECT count(*)::int,count(*) filter(where closed_at is null)::int
 INTO v_total_shifts,v_active_shifts
 FROM reality_internal.governed_employee_shifts_v1
 WHERE owner_id=p_owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'shift_id',s.shift_id,'status',s.status,'created_at',s.created_at,
    'closed_at',s.closed_at,'last_progress_at',s.last_progress_at)
    ORDER BY s.created_at DESC),'[]'::jsonb)
 INTO v_shifts
 FROM (SELECT shift_id,status,created_at,closed_at,last_progress_at
   FROM reality_internal.governed_employee_shifts_v1
   WHERE owner_id=p_owner_id ORDER BY created_at DESC LIMIT 25) s;
 SELECT count(*)::int,
    count(*) filter(where planned_business_date is not null)::int,
    count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED')::int
 INTO v_calendar_count,v_planned,v_verified
 FROM reality_internal.owner_employee_operating_schedule_v1
 WHERE owner_id=p_owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'employee',r.employee,'total_entries',r.total_entries,
    'scheduled_entries',r.scheduled_entries,
    'verified_evidence_entries',r.verified_evidence_entries,
    'maintenance_entries',r.maintenance_entries)
    ORDER BY r.employee),'[]'::jsonb)
 INTO v_roles
 FROM (SELECT employee,count(*)::int total_entries,
    count(*) filter(where planned_business_date is not null)::int scheduled_entries,
    count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED')::int verified_evidence_entries,
    count(*) filter(where work_kind='INTERNAL_MAINTENANCE')::int maintenance_entries
   FROM reality_internal.owner_employee_operating_schedule_v1
   WHERE owner_id=p_owner_id GROUP BY employee) r;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'work_key',s.work_key,'employee',s.employee,'work_kind',s.work_kind,
    'source_ref',s.source_ref,'title',s.title,'work_state',s.work_state,
    'planned_business_date',s.planned_business_date,
    'evidence_job_id',s.evidence_job_id,
    'independently_verified_current_evidence',s.independently_verified_current_evidence,
    'next_gate',CASE
      WHEN s.work_kind='INTERNAL_MAINTENANCE' AND
           s.work_state='MAINTENANCE_IN_SIGNED_SHIFT'
        THEN 'SIGNED_MAINTENANCE_NEXT_PROOF_REQUIRED'
      WHEN s.work_kind='INTERNAL_MAINTENANCE'
        THEN 'MAINTENANCE_EXACT_SHIFT_SCOPE_REQUIRED'
      WHEN s.work_state='SOURCE_EPOCH_REVIEW_REQUIRED'
        THEN 'FRESH_SOURCE_EPOCH_RECHECK_REQUIRED'
      WHEN s.work_state='CURRENT_SOURCE_REVIEW_REQUIRED'
        THEN 'CURRENT_SOURCE_EVIDENCE_QUALIFICATION_REQUIRED'
      WHEN s.work_state='HISTORICAL_REVALIDATION_REQUIRED'
        THEN 'CURRENT_PROVIDER_REVALIDATION_REQUIRED'
      WHEN s.work_state='SOURCE_NO_LONGER_CURRENT'
        THEN 'NO_REPLAY_HISTORICAL_SOURCE'
      ELSE 'READ_ONLY_STATUS_RECONCILIATION_REQUIRED' END)
    ORDER BY s.planned_business_date,s.priority,s.daily_order,s.employee),
    '[]'::jsonb)
 INTO v_due
 FROM reality_internal.owner_employee_operating_schedule_v1 s
 WHERE s.owner_id=p_owner_id
   AND s.planned_business_date BETWEEN v_business_date AND v_business_date+7;
 SELECT count(*)::int,
  count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED')::int,
  count(*) filter(where phase like 'BLOCKED_%')::int
 INTO v_evidence_total,v_evidence_verified,v_evidence_blocked
 FROM reality_internal.owner_qualified_employee_evidence_jobs_v1
 WHERE owner_id=p_owner_id;
 SELECT count(*)::int INTO v_maintenance_ci_red
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 WHERE m.owner_id=p_owner_id AND
   m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED';
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'maintenance_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
   'claim_shift_id',m.claimed_shift_id,'source_ref',m.source_ref,
   'employee',m.assignee,'reviewer',m.independent_reviewer,
   'handling_state',m.handling_state,'phase',m.phase,
   'failure_baseline_sha256',m.independent_failure_baseline_receipt_sha256,
   'independent_frozen_ci_sha256',m.independent_frozen_test_receipt_sha256,
   'original_work_id',m.original_customer_work_id,
   'in_active_exact_warrant',EXISTS(
     SELECT 1 FROM reality_internal.governed_employee_completion_warrants_v1 w
     JOIN reality_internal.governed_employee_shifts_v1 sh
       ON sh.shift_id=w.shift_id AND sh.owner_id=w.owner_id
     WHERE w.owner_id=m.owner_id AND w.state='ACTIVE'
       AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
       AND sh.closed_at IS NULL
       AND sh.planned_end_at>v_checked
       AND EXISTS(SELECT 1 FROM jsonb_array_elements(w.source_scope) scope
         WHERE scope->>'maintenance_id'=m.incident_id::text)),
   'next_gate',CASE WHEN m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
     THEN 'EXECUTABLE_INDEPENDENT_FROZEN_CI_RED_REQUIRED'
     ELSE 'MAINTENANCE_EVIDENCE_RECHECK_REQUIRED' END)
   ORDER BY m.created_at,m.incident_id),'[]'::jsonb)
 INTO v_maint
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 WHERE m.owner_id=p_owner_id
   AND m.original_job_completed IS FALSE
   AND m.production_changed IS FALSE;
 RETURN jsonb_build_object(
   'status','OWNER_OPERATIONAL_CONTINUITY_INVENTORY_READ_ONLY',
   'owner_id',p_owner_id,'owner_scope_verified',true,'checked_at',v_checked,
   'total_shift_records',v_total_shifts,'open_shift_records',v_active_shifts,
   'shift_history',v_shifts,'shift_history_bounded_to',25,
   'calendar_entries',v_calendar_count,'dated_calendar_entries',v_planned,
   'calendar_verified_evidence_entries',v_verified,
   'employee_responsibilities',v_roles,
   'next_seven_day_calendar',v_due,
   'qualified_evidence_jobs',v_evidence_total,
   'independently_verified_evidence_jobs',v_evidence_verified,
   'blocked_evidence_jobs',v_evidence_blocked,
   'maintenance_needs_executable_ci_red',v_maintenance_ci_red,
   'maintenance_obligations',v_maint,
   'evidence_work_does_not_imply_customer_original_completed',true,
   'calendar_does_not_grant_execution',true,
   'read_only',true,'created_new_work',false,'installation_authorized',false,
   'original_customer_job_completed',false,'production_changed',false);
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_owner_operational_continuity_v1(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_operational_continuity_v1(uuid) TO service_role;
