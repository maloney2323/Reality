CREATE OR REPLACE FUNCTION public.reality_read_owner_internal_maintenance_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare items jsonb; warrant jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MAINTENANCE_OWNER_READ_AUTHORITY_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'internal_work_id','maintenance:'||m.incident_id::text,
  'origin_incident_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
  'owner_id',m.owner_id,'kind',m.maintenance_kind,
  'assignee',m.assignee,'independent_reviewer',m.independent_reviewer,
  'phase',m.phase,'source_ref',m.source_ref,
  'independent_review_status',m.independent_review_status,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
  'worker_handling_state',m.handling_state,
  'worker_claim_attempts',m.claim_attempts,
  'worker_baseline_attempts',m.baseline_attempts,
  'independent_source_observation_receipt_sha256',
    m.independent_source_observation_receipt_sha256,
  'independent_failure_baseline_receipt_sha256',
    m.independent_failure_baseline_receipt_sha256,
  'independent_frozen_test_receipt_sha256',
    m.independent_frozen_test_receipt_sha256,
  'signed_executor_action',c.action,
  'signed_executor_state',c.state,
  'signed_executor_attempt_count',c.attempt_count,
  'source_requalification_receipt_sha256',c.requalification_receipt_sha256,
  'ci_dispatch_receipt_sha256',c.ci_trigger_receipt_sha256,
  'ci_github_trigger_commit_sha',c.ci_trigger_commit_sha,
  'ci_independent_diagnostic_receipt_sha256',
    c.ci_independent_diagnostic_receipt_sha256,
  'ci_independent_github_run_id',c.ci_independent_diagnostic_run_id,
  'ci_independent_artifact_digest',c.ci_independent_artifact_digest,
  'original_customer_work_id',m.original_customer_work_id,
  'frozen_reproduction_verified',
    m.independent_frozen_test_receipt_sha256 is not null,
  'repair_verified',m.repaired_capability_receipt_sha256 is not null,
  'original_customer_job_completed',false,
  'installation_authorized_by_read',false,
  'external_action_authorized_by_read',false,
  'production_changed',false,'created_at',m.created_at
 ) order by m.created_at desc),'[]'::jsonb) into items
 from (select * from reality_internal.owner_internal_maintenance_jobs_v1
       where owner_id=p_owner_id order by created_at desc limit 50) m
 left join reality_internal.signed_maintenance_executor_claims_v1 c
  on c.maintenance_id=m.incident_id and c.owner_id=m.owner_id;
 -- Narrow owner-signed completion-bound warrant. The worker may discover
 -- additional maintenance after authorization: those new incidents must
 -- NEVER inherit permission from the first warrant.
 select pg_catalog.jsonb_build_object(
  'status','VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE',
  'shift_id',w.shift_id,
  'mode',w.mode,'state',w.state,
  'plan_fingerprint',w.plan_fingerprint,
  'source_scope',w.source_scope)
 into warrant
 from reality_internal.governed_employee_completion_warrants_v1 w
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=w.shift_id and s.owner_id=w.owner_id
 where w.owner_id=p_owner_id
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and w.state='ACTIVE'
  and s.closed_at is null
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp()
  and (s.planned_end_at='infinity'::timestamptz
    or s.planned_end_at>clock_timestamp())
  and pg_catalog.jsonb_typeof(w.source_scope)='array'
  and pg_catalog.jsonb_array_length(w.source_scope) between 1 and 4
 order by w.authorized_at desc limit 1;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
  'active_maintenance_warrant',warrant,
  'owner_id',p_owner_id,'read_only',true,
  'count',pg_catalog.jsonb_array_length(items),'items',items,
  'shift_started_by_read',false,'owner_authority_granted_by_read',false,
  'customer_jobs_completed_by_read',0,'production_changed',false);
end $function$

