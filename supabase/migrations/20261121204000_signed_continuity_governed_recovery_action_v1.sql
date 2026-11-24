-- Signed Continuity diagnosis -> existing source requalification -> independent
-- later worker readback. No customer-original, approval, code installation or
-- generic execution authority is granted by this migration.
CREATE TABLE reality_internal.shift_continuity_recovery_actions_v1 (
 incident_id uuid PRIMARY KEY REFERENCES reality_internal.owner_shift_continuity_incidents_v1(incident_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL REFERENCES reality_internal.governed_employee_shifts_v1(shift_id),
 governed_action text NOT NULL,
 blocker_class text NOT NULL,
 investigation_receipt_sha256 text NOT NULL CHECK
  (investigation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 action_worker_run_id uuid NOT NULL,
 action_recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 source_requalification_receipt_sha256 text NOT NULL CHECK
  (source_requalification_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 baseline_qualified_originals integer NOT NULL DEFAULT 0,
 baseline_original_claims integer NOT NULL DEFAULT 0,
 baseline_final_receipts integer NOT NULL DEFAULT 0,
 baseline_source_bound_originals integer NOT NULL DEFAULT 0,
 current_warrant_mode text,
 admission_gate text NOT NULL,
 phase text NOT NULL DEFAULT 'ACTION_RECORDED_AWAITING_DISTINCT_WORKER',
 action_receipt_sha256 text NOT NULL CHECK
  (action_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 review_worker_run_id uuid,
 review_recorded_at timestamptz,
 independent_review_status text,
 independent_review_receipt_sha256 text CHECK
  (independent_review_receipt_sha256 IS NULL OR
   independent_review_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 CONSTRAINT recovery_review_distinct_worker CHECK
  (review_worker_run_id IS NULL OR
   review_worker_run_id <> action_worker_run_id)
);
ALTER TABLE reality_internal.shift_continuity_recovery_actions_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.shift_continuity_recovery_actions_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.shift_continuity_recovery_actions_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_execute_signed_continuity_recovery_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $execute$
DECLARE
 i reality_internal.owner_shift_continuity_incidents_v1%ROWTYPE;
 existing reality_internal.shift_continuity_recovery_actions_v1%ROWTYPE;
 v_owner uuid;v_action text;v_class text;v_routing jsonb;v_preflight jsonb;
 v_claims int;v_finals int;v_proof jsonb;v_hash text;v_gate text;v_route_hash text;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL THEN
  RAISE EXCEPTION 'SIGNED_RECOVERY_ACTION_SERVICE_SCOPE_REQUIRED'; END IF;
 SELECT s.owner_id INTO v_owner
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 wake
  ON wake.shift_id=s.shift_id AND wake.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.authorized_at IS NOT NULL AND s.planned_start_at<=clock_timestamp()
  AND s.planned_end_at>clock_timestamp()
  AND wake.last_worker_status='WAKE_RECEIVED'
  AND wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  AND run.started_at>clock_timestamp()-interval '3 minutes';
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RECOVERY_CURRENT_AUTHORIZED_WORKER_REQUIRED',
   'action_executed',false,'original_resumed',false,
   'execution_authorized',false,'installation_authorized',false,
   'production_changed',false); END IF;
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1
 WHERE owner_id=v_owner AND shift_id=p_shift_id
  AND kind='SIGNED_SHIFT_REPEATED_NO_PROGRESS'
  AND phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  AND investigated_at IS NOT NULL
  AND investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'
  AND assigned_function_id IS NOT NULL
  AND reviewer_function_id IS NOT NULL
  AND assigned_function_id<>reviewer_function_id
 ORDER BY investigated_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','NO_SOURCE_VERIFIED_SIGNED_RECOVERY_INCIDENT_READY',
   'action_executed',false,'original_resumed',false,
   'execution_authorized',false,'installation_authorized',false,
   'production_changed',false); END IF;

 SELECT * INTO existing FROM reality_internal.shift_continuity_recovery_actions_v1
 WHERE incident_id=i.incident_id;
 IF FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_RECOVERY_ACTION_ALREADY_RECORDED_NO_REPLAY',
  'incident_id',i.incident_id,'action_receipt_sha256',existing.action_receipt_sha256,
  'action_executed',false,'original_resumed',false,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false); END IF;
 -- Consume the model's exact bounded typed route from the SAVED investigation.
 -- NEVER evaluate free-text model instructions as a function or SQL command.
 v_action:=pg_catalog.split_part(pg_catalog.split_part(
  i.proposed_upgrade,'[GOVERNED_ACTION:',2),']',1);
 v_class:=pg_catalog.split_part(pg_catalog.split_part(
  i.proposed_upgrade,'[BLOCKER_CLASS:',2),']',1);
 IF i.proposed_upgrade NOT LIKE '[GOVERNED_ACTION:'||v_action||
   '][BLOCKER_CLASS:'||v_class||'] %' OR
   v_action<>'REQUALIFY_EXISTING_CONTINUITY_SOURCE' OR
   v_class NOT IN('MISSING_SOURCE_EVIDENCE','CONTINUITY_HANDOFF_DEFECT')
 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','GOVERNED_RECOVERY_ACTION_HAS_NO_PROVEN_INSTALLED_ADAPTER',
   'incident_id',i.incident_id,'action_executed',false,
   'original_resumed',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false); END IF;
 -- Real installed evidence-only action. This RPC independently rechecks the
 -- signed worker and owner-scoped sources. It creates no new original claim.
 v_routing:=public.reality_reconcile_continuity_qualification_routes_v1(p_worker_run_id);
 IF v_routing->>'status'<>'CONTINUITY_QUALIFICATION_ROUTES_RECONCILED'
  OR v_routing->>'worker_run_id'<>p_worker_run_id::text
  OR v_routing->>'new_original_admitted'<>'false'
  OR v_routing->>'model_execution_authorized'<>'false'
  OR v_routing->>'owner_approval_granted'<>'false'
  OR v_routing->>'installation_authorized'<>'false'
  OR v_routing->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'SIGNED_RECOVERY_SOURCE_REQUALIFICATION_PROOF_INVALID'; END IF;
 v_preflight:=public.reality_read_owner_multi_original_shift_preflight_v1(v_owner,2);
 IF v_preflight->>'status'<>'OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT'
  OR v_preflight->>'current_shift_id'<>p_shift_id::text
  OR v_preflight->>'owner_id'<>v_owner::text
  OR v_preflight->>'read_only'<>'true'
  OR v_preflight->>'owner_approval_granted'<>'false'
  OR v_preflight->>'model_execution_authorized'<>'false'
  OR v_preflight->>'production_changed'<>'false'
 THEN RAISE EXCEPTION 'SIGNED_RECOVERY_CURRENT_ORIGINAL_GATE_UNVERIFIED'; END IF;
 SELECT count(*)::int INTO v_claims
 FROM reality_internal.governed_employee_original_claims_v1
 WHERE owner_id=v_owner AND shift_id=p_shift_id;
 SELECT count(*)::int INTO v_finals
 FROM reality_internal.governed_original_independent_final_receipts_v1
 WHERE owner_id=v_owner AND shift_id=p_shift_id;
 v_gate:=CASE
  WHEN v_preflight->>'current_shift_warrant_mode'<>
   'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
    THEN 'EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED_NO_SCOPE_EXPANSION'
  WHEN (v_preflight->>'independently_qualified_originals_for_executor_preflight')::int=0
    THEN 'INDEPENDENT_SOURCE_GOAL_AND_CANONICAL_ORIGINAL_REQUIRED'
  ELSE 'EXACT_ITEMIZED_EXECUTOR_POLICY_AND_OWNER_APPROVAL_REQUIRED' END;
 v_route_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_routing::text,'UTF8')),'hex');
 v_proof:=pg_catalog.jsonb_build_object(
  'schema','reality-signed-governed-recovery-action-v1',
  'incident_id',i.incident_id,'owner_id',v_owner,'shift_id',p_shift_id,
  'worker_run_id',p_worker_run_id,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'governed_action',v_action,'blocker_class',v_class,
  'source_requalification_receipt_sha256',v_route_hash,
  'canonical_original_claim_count',v_claims,'independent_final_receipt_count',v_finals,
  'source_bound_originals',v_preflight->'source_bound_originals',
  'independently_qualified_originals',
   v_preflight->'independently_qualified_originals_for_executor_preflight',
  'admission_gate',v_gate,'new_shift_started',false,
  'original_resumed',false,'owner_approval_granted',false,
  'production_changed',false);
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_proof::text,'UTF8')),'hex');
 INSERT INTO reality_internal.shift_continuity_recovery_actions_v1(
  incident_id,owner_id,shift_id,governed_action,blocker_class,
  investigation_receipt_sha256,action_worker_run_id,
  source_requalification_receipt_sha256,baseline_qualified_originals,
  baseline_original_claims,baseline_final_receipts,
  baseline_source_bound_originals,current_warrant_mode,admission_gate,
  action_receipt_sha256)
 VALUES (i.incident_id,v_owner,p_shift_id,v_action,v_class,
  i.investigation_receipt_sha256,p_worker_run_id,v_route_hash,
  (v_preflight->>'independently_qualified_originals_for_executor_preflight')::int,
  v_claims,v_finals,(v_preflight->>'source_bound_originals')::int,
  v_preflight->>'current_shift_warrant_mode',v_gate,v_hash)
 ON CONFLICT(incident_id) DO NOTHING;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_RECOVERY_SOURCE_REQUALIFICATION_EXECUTED_AWAITING_INDEPENDENT_CHECK',
  'incident_id',i.incident_id,'shift_id',p_shift_id,'action_receipt_sha256',v_hash,
  'source_requalification_receipt_sha256',v_route_hash,
  'governed_action',v_action,'admission_gate',v_gate,
  'next_action',case when v_gate='EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED_NO_SCOPE_EXPANSION'
   then 'PRESENT_EXACT_SOURCE_AND_OWNER_BUSINESS_WARRANT_REQUEST_IN_REALITY_CHAT'
   else 'INDEPENDENTLY_VERIFY_EXACT_CANONICAL_ORIGINAL_AND_EXECUTOR_SCOPE' end,
  'action_executed',true,'original_resumed',false,'original_job_completed',false,
  'owner_approval_granted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
END $execute$;

CREATE OR REPLACE FUNCTION public.reality_verify_signed_continuity_recovery_v1(
 p_shift_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $verify$
DECLARE a reality_internal.shift_continuity_recovery_actions_v1%ROWTYPE;
 v_owner uuid;v_preflight jsonb;v_claims int;v_finals int;v_status text;
 v_evidence jsonb;v_hash text;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR p_worker_run_id IS NULL
 THEN RAISE EXCEPTION 'SIGNED_RECOVERY_INDEPENDENT_WORKER_REQUIRED'; END IF;
 SELECT s.owner_id INTO v_owner
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 wake
  ON wake.shift_id=s.shift_id AND wake.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r
  ON r.run_id=p_worker_run_id AND r.status='STARTED'
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.authorized_at IS NOT NULL
  AND wake.last_worker_status='WAKE_RECEIVED'
  AND wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  AND r.started_at>clock_timestamp()-interval '3 minutes';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_INDEPENDENT_SIGNED_REVIEW_SCOPE',
  'original_resumed',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false); END IF;
 SELECT * INTO a FROM reality_internal.shift_continuity_recovery_actions_v1
 WHERE shift_id=p_shift_id AND owner_id=v_owner
  AND phase='ACTION_RECORDED_AWAITING_DISTINCT_WORKER'
  AND action_worker_run_id<>p_worker_run_id
  AND action_recorded_at<(
   SELECT r.started_at FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id)
 ORDER BY action_recorded_at LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_DISTINCT_WORKER_RECOVERY_REVIEW_READY',
  'original_resumed',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false); END IF;
 v_preflight:=public.reality_read_owner_multi_original_shift_preflight_v1(v_owner,2);
 IF v_preflight->>'status'<>'OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT'
  OR v_preflight->>'current_shift_id'<>p_shift_id::text
  OR v_preflight->>'owner_id'<>v_owner::text
  OR v_preflight->>'read_only'<>'true'
  OR v_preflight->>'owner_approval_granted'<>'false'
  OR v_preflight->>'model_execution_authorized'<>'false'
 THEN RAISE EXCEPTION 'INDEPENDENT_ORIGINAL_READBACK_UNVERIFIED'; END IF;
 SELECT count(*)::int INTO v_claims
 FROM reality_internal.governed_employee_original_claims_v1
 WHERE owner_id=v_owner AND shift_id=p_shift_id;
 SELECT count(*)::int INTO v_finals
 FROM reality_internal.governed_original_independent_final_receipts_v1
 WHERE owner_id=v_owner AND shift_id=p_shift_id AND outcome='SUCCEEDED'
  AND final_evidence_sha256~'^sha256:[a-f0-9]{64}$';
 v_status:=CASE
  WHEN v_claims>a.baseline_original_claims AND
   (v_preflight->>'independently_qualified_originals_for_executor_preflight')::int>
    a.baseline_qualified_originals
    THEN 'SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED'
  WHEN v_preflight->>'current_shift_warrant_mode'<>
   'UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
    THEN 'SOURCE_REQUALIFICATION_VERIFIED_BUSINESS_WARRANT_STILL_MISSING'
  ELSE 'SOURCE_REQUALIFICATION_VERIFIED_ORIGINAL_STILL_UNQUALIFIED' END;
 v_evidence:=pg_catalog.jsonb_build_object(
  'schema','reality-signed-recovery-independent-review-v1',
  'incident_id',a.incident_id,'owner_id',v_owner,'shift_id',p_shift_id,
  'diagnostic_action_receipt_sha256',a.action_receipt_sha256,
  'action_worker_run_id',a.action_worker_run_id,
  'review_worker_run_id',p_worker_run_id,
  'source_bound_originals',v_preflight->'source_bound_originals',
  'qualified_originals',v_preflight->'independently_qualified_originals_for_executor_preflight',
  'original_claim_count',v_claims,'independent_final_count',v_finals,
  'verification_status',v_status,
  'original_job_completed_by_review',false,'new_shift_started',false,
  'owner_approval_granted_by_review',false,'production_changed',false);
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v_evidence::text,'UTF8')),'hex');
 UPDATE reality_internal.shift_continuity_recovery_actions_v1
 SET phase='INDEPENDENT_REVIEW_RECORDED',review_worker_run_id=p_worker_run_id,
  review_recorded_at=clock_timestamp(),independent_review_status=v_status,
  independent_review_receipt_sha256=v_hash
 WHERE incident_id=a.incident_id;
 RETURN pg_catalog.jsonb_build_object(
  'status',v_status,'incident_id',a.incident_id,'shift_id',p_shift_id,
  'independent_review_receipt_sha256',v_hash,
  'action_receipt_sha256',a.action_receipt_sha256,
  'source_requalification_action_verified',true,
  'original_admission_advanced',v_status=
   'SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED',
  'original_resumed',false,'original_job_completed',false,
  'next_action',case
   when v_status='SOURCE_REQUALIFICATION_VERIFIED_BUSINESS_WARRANT_STILL_MISSING'
    then 'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT'
   when v_status='SIGNED_SOURCE_REQUALIFICATION_VERIFIED_NEW_ORIGINAL_ADMITTED'
    then 'RECHECK_APPROVED_EXECUTOR_AND_INDEPENDENT_ORIGINAL_ACCEPTANCE'
   else 'EXACT_CURRENT_SOURCE_GOAL_ACCEPTANCE_AND_ORIGINAL_ADMISSION_REQUIRED' end,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
END $verify$;
REVOKE ALL ON FUNCTION public.reality_execute_signed_continuity_recovery_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_execute_signed_continuity_recovery_v1(uuid,uuid)
 TO service_role;
REVOKE ALL ON FUNCTION public.reality_verify_signed_continuity_recovery_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_verify_signed_continuity_recovery_v1(uuid,uuid)
 TO service_role;
