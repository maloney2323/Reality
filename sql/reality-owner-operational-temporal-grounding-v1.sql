CREATE OR REPLACE FUNCTION public.reality_read_owner_shift_handoff_health_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shift reality_internal.governed_employee_shifts_v1%rowtype;
 v_worker reality_internal.governed_employee_shift_worker_pulses_v1%rowtype;
 v_scope reality_internal.owner_repair_scope_handoffs_v1%rowtype;
 v_employee_verified integer:=0;
 v_employee_pending integer:=0;
 v_original_claims integer:=0;
 v_original_final integer:=0;
 v_verified_universe integer:=0;
 v_maint jsonb:='[]'::jsonb;
 v_temporal jsonb:='[]'::jsonb;
 v_checked timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'HANDOFF_HEALTH_OWNER_SERVICE_ROLE_ONLY';
 END IF;
 SELECT s.* INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
 WHERE s.owner_id=p_owner_id AND s.closed_at IS NULL
 AND s.authorized_at IS NOT NULL AND
 s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.state='ACTIVE' AND
 w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 ORDER BY s.authorized_at DESC LIMIT 1;
 IF NOT FOUND THEN
  RETURN jsonb_build_object(
   'status','NO_CURRENT_SIGNED_MAINTENANCE_SHIFT_HANDOFF',
   'owner_id',p_owner_id,'checked_at',v_checked,
   'read_only',true,'installation_authorized',false,
   'production_changed',false,'original_job_completed',false,
   'new_shift_started',false,'handoffs','[]'::jsonb);
 END IF;
 SELECT * INTO v_worker
 FROM reality_internal.governed_employee_shift_worker_pulses_v1 p
 WHERE p.shift_id=v_shift.shift_id;
 SELECT count(*) filter(where phase='COMPLETED_INDEPENDENTLY_VERIFIED')::int,
  count(*) filter(where phase<>'COMPLETED_INDEPENDENTLY_VERIFIED')::int
 INTO v_employee_verified,v_employee_pending
 FROM reality_internal.owner_qualified_employee_evidence_jobs_v1 j
 WHERE j.owner_id=p_owner_id AND j.shift_id=v_shift.shift_id;
 SELECT count(*)::int INTO v_original_claims
 FROM reality_internal.governed_employee_original_claims_v1 c
 WHERE c.owner_id=p_owner_id AND c.shift_id=v_shift.shift_id;
 SELECT count(*)::int INTO v_original_final
 FROM reality_internal.governed_original_independent_final_receipts_v1 f
 WHERE f.owner_id=p_owner_id AND f.shift_id=v_shift.shift_id;
 SELECT h.* INTO v_scope FROM reality_internal.owner_repair_scope_handoffs_v1 h
 WHERE h.owner_id=p_owner_id AND h.shift_id=v_shift.shift_id
 ORDER BY h.approved_at DESC NULLS LAST,h.created_at DESC LIMIT 1;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'source_ref',t.source_ref,
  'older_handoff_phase',t.work_phase,
  'case_ci_artifact_recorded',t.github_run_id IS NOT NULL,
  'independent_artifact_review_recorded',t.review_receipt_sha256 IS NOT NULL,
  'exact_target_review_recorded',t.target_review_receipt_sha256 IS NOT NULL,
  'installation_state',t.install_state,
  'independent_install_verified_at',t.independently_verified_at,
  'status',CASE
   WHEN t.install_state='VERIFIED' AND t.independently_verified_at IS NOT NULL
    THEN 'REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY'
   WHEN t.install_state IN ('APPROVED','FENCED','INSTALLED')
    THEN 'REPAIR_INSTALLATION_OR_VERIFICATION_NOT_SETTLED'
   WHEN t.target_review_receipt_sha256 IS NOT NULL
    THEN 'REPAIR_INDEPENDENT_TARGET_REVIEW_RECORDED_INSTALL_NOT_AUTHORIZED'
   WHEN t.review_receipt_sha256 IS NOT NULL
    THEN 'REPAIR_ARTIFACT_REVIEW_RECORDED_TARGET_NOT_READY'
   ELSE 'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION' END,
  'next_action',CASE
   WHEN t.install_state='VERIFIED' AND t.independently_verified_at IS NOT NULL
    THEN 'RECONCILE_SEPARATE_ORIGINAL_JOB_ACCEPTANCE'
   WHEN t.install_state IN ('APPROVED','FENCED','INSTALLED')
    THEN 'INDEPENDENT_INSTALL_OR_POSTINSTALL_RECONCILIATION'
   WHEN t.target_review_receipt_sha256 IS NOT NULL
    THEN 'CHECK_EXACT_OWNER_INSTALL_AUTHORIZATION'
   WHEN t.review_receipt_sha256 IS NOT NULL
    THEN 'INDEPENDENT_INSTALL_TARGET_REVIEW'
   ELSE 'RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE' END
 ) ORDER BY t.source_ref),'[]'::jsonb)
 INTO v_maint
 FROM (
  SELECT h.source_ref,h.work_phase,a.github_run_id,
   a.review_receipt_sha256,a.target_review_receipt_sha256,
   d.state as install_state,d.independently_verified_at
  FROM reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  LEFT JOIN reality_internal.owner_maintenance_verified_artifact_handoffs_v1 a
   ON a.maintenance_id=h.maintenance_id AND a.owner_id=h.owner_id
    AND a.shift_id=h.shift_id
  LEFT JOIN reality_internal.owner_signed_maintenance_install_decisions_v1 d
   ON d.maintenance_id=h.maintenance_id AND d.owner_id=h.owner_id
    AND d.shift_id=h.shift_id
  WHERE h.owner_id=p_owner_id AND h.shift_id=v_shift.shift_id
  ORDER BY h.source_ref LIMIT 8
 ) t;
 -- Temporal grounding reads the same owner-scoped ledger.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'source_ref',m.source_ref,'maintenance_id',m.incident_id,
   'past',jsonb_build_object(
    'independent_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256,
    'last_builder_receipt_sha256',m.frozen_test_build->>'receipt_sha256',
    'last_builder_outcome',m.frozen_test_build->>'state',
    'last_builder_recorded_at',m.frozen_test_build->>'recorded_at',
    'independent_repair_receipt_sha256',m.repaired_capability_receipt_sha256),
   'present',jsonb_build_object(
    'phase',m.phase,'handling_state',m.handling_state,
    'builder_state',m.frozen_test_build->>'state',
    'independent_frozen_red_verified',m.independent_frozen_test_receipt_sha256 IS NOT NULL,
    'original_job_completed',m.original_job_completed,
    'repair_independently_verified',m.repaired_capability_receipt_sha256 IS NOT NULL),
   'future',jsonb_build_object(
    'next_required_action',CASE
     WHEN m.original_job_completed THEN 'RECONCILE_EXISTING_FINAL_RECEIPT_NO_REPLAY'
     WHEN m.repaired_capability_receipt_sha256 IS NOT NULL THEN 'RECONCILE_SEPARATE_ORIGINAL_JOB_ACCEPTANCE'
     WHEN m.frozen_test_build->>'state' IN ('PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE') THEN 'INVESTIGATE_NEW_EVIDENCE_BEFORE_REENTRY'
     WHEN m.frozen_test_build->>'state'='DRAFT' THEN 'INDEPENDENTLY_QUALIFY_AND_RUN_INERT_FROZEN_TEST_CANDIDATE'
     WHEN m.frozen_test_build->>'state'='CLAIMED' THEN 'RECONCILE_ACTIVE_BUILDER_LEASE'
     ELSE 'QUALIFY_REQUIRED_SOURCE_EVIDENCE' END,
    'expected_outcome_verified',false,'execution_authorized',false,
    'installation_authorized',false)
 ) ORDER BY m.source_ref,m.incident_id),'[]'::jsonb)
 INTO v_temporal
 FROM (SELECT j.* FROM reality_internal.owner_internal_maintenance_jobs_v1 j
 WHERE j.owner_id=p_owner_id AND j.claimed_shift_id=v_shift.shift_id
 AND (j.source_ref=v_scope.source_ref OR EXISTS (
   SELECT 1 FROM jsonb_array_elements(v_maint) h
   WHERE h->>'source_ref'=j.source_ref))
 ORDER BY j.source_ref,j.incident_id LIMIT 8) m;
 -- The stored Universe facts are owner- and shift-bound. This is a count
 -- of events marked VERIFIED, NOT a new cryptographic verification or a
 -- customer-original settlement.
 SELECT count(*)::int INTO v_verified_universe
 FROM public.universe_events e
 WHERE e.epistemic_status='VERIFIED'
 AND e.payload->>'owner_id'=p_owner_id::text
 AND e.payload->>'shift_id'=v_shift.shift_id::text
 AND e.event_kind IN ('VERIFICATION','AUTHORITY','WORK');
 RETURN jsonb_build_object(
  'status','SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY',
  'owner_id',p_owner_id,'checked_at',v_checked,
  'shift_id',v_shift.shift_id,'shift_status',v_shift.status,
  'worker_status',CASE
    WHEN v_worker.last_worker_seen_at IS NOT NULL AND
     v_worker.last_worker_seen_at>v_checked-interval '15 minutes'
     AND v_worker.last_worker_status='WAKE_COMPLETED'
    THEN 'SCHEDULED_WORKER_RECENT_WAKE_COMPLETED'
    ELSE 'SCHEDULED_WORKER_WAKE_STALE_OR_UNVERIFIED' END,
  'last_worker_seen_at',v_worker.last_worker_seen_at,
  'last_worker_completed_at',v_worker.last_worker_completed_at,
  'worker_wake_count',v_worker.wake_count,
  'worker_safe_result',v_worker.last_worker_safe_result,
  'employee_independently_verified_evidence_jobs',v_employee_verified,
  'employee_evidence_jobs_unsettled',v_employee_pending,
  'employee_evidence_is_not_customer_completion',true,
  'repair_scope',CASE WHEN v_scope.handoff_id IS NULL THEN NULL ELSE
   jsonb_build_object(
    'handoff_id',v_scope.handoff_id,
    'source_ref',v_scope.source_ref,
    'state',v_scope.state,
    'work_scope_approved',v_scope.state IN ('APPROVED','SOURCE_RECHECKED'),
    'owner_approval_receipt',v_scope.approval_receipt_sha256,
    'owner_approved_at',v_scope.approved_at,
    'source_rechecked_at',v_scope.continued_at,
    'independent_frozen_ci_after_approval_verified',false,
    'status',CASE v_scope.state
      WHEN 'SOURCE_RECHECKED' THEN 'APPROVED_SOURCE_RECHECKED_NEXT_INDEPENDENT_CI'
      WHEN 'APPROVED' THEN 'APPROVED_AWAITING_SIGNED_SOURCE_RECHECK'
      ELSE 'AWAITING_EXACT_OWNER_WORK_SCOPE_DECISION' END,
    'next_action',CASE v_scope.state
      WHEN 'SOURCE_RECHECKED' THEN 'EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI'
      WHEN 'APPROVED' THEN 'SIGNED_WORKER_RECHECK_CURRENT_APPROVED_SOURCE'
      ELSE 'OWNER_APPROVE_EXACT_INVESTIGATION_AND_TESTING' END
   ) END,
  'maintenance_handoffs',v_maint,
  'operational_temporal_evidence',v_temporal,
  'operational_temporal_coverage','BOUNDED_CURRENT_SIGNED_MAINTENANCE_SOURCES',
  'original_claim_count',v_original_claims,
  'original_independent_final_receipt_count',v_original_final,
  'original_work_status',CASE
    WHEN v_original_final>0 THEN 'AT_LEAST_ONE_ORIGINAL_FINAL_RECEIPT_RECORDED'
    WHEN v_original_claims>0 THEN 'ORIGINAL_ADMITTED_FINAL_VERIFICATION_PENDING'
    ELSE 'CANONICAL_OWNER_BUSINESS_ORIGINAL_NOT_ADMITTED' END,
  'original_next_action',CASE
    WHEN v_original_final>0 THEN 'VERIFY_ALL_CURRENT_SHIFT_ORIGINALS_SETTLED'
    WHEN v_original_claims>0 THEN 'EXECUTE_AND_INDEPENDENTLY_VERIFY_EXACT_ORIGINAL'
    ELSE 'QUALIFY_SOURCE_BACKED_OWNER_BUSINESS_WORK_WITHOUT_WIDENING_WARRANT' END,
  'universe_verified_event_rows',v_verified_universe,
  'universe_status',CASE
    WHEN v_verified_universe>0 THEN 'OWNER_SHIFT_VERIFIED_REPAIR_EVENTS_STORED_NOT_ORIGINAL_SETTLEMENT'
    ELSE 'NO_CURRENT_OWNER_SHIFT_VERIFIED_UNIVERSE_REPAIR_EVENTS' END,
  'ceo_operational_decision_handoff','NOT_INDEPENDENTLY_ATTESTED_BY_THIS_READ',
  'past_present_future_handoff','SEPARATE_OWNER_TIME_HORIZON_READ_ONLY',
  'next_actor','REALITY',
  'owner_install_approval_required_later',true,
  'owner_work_scope_approval_required_now',
    coalesce(v_scope.state='PREPARED',false),
  'read_only',true,'installation_authorized',false,
  'production_changed',false,'original_job_completed',false,
  'new_shift_started',false
 );
END $function$;