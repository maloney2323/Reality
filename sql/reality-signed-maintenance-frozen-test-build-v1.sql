-- Extend the existing signed maintenance work order, not the Chat queue.
-- A test draft is inert candidate data; no provider write, execution or approval.
ALTER TABLE reality_internal.owner_internal_maintenance_jobs_v1
 ADD COLUMN IF NOT EXISTS frozen_test_build jsonb;
CREATE OR REPLACE FUNCTION reality_internal.signed_frozen_test_build_scope_v1(
 p_shift_id uuid,p_maintenance_id uuid,p_worker_run_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE m record;s record;h record;a record;i record;b record;r record;d record;
 health jsonb;basis jsonb;facts jsonb;failure_evidence jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 IF coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$' THEN RETURN NULL;END IF;
 SELECT sh.shift_id,sh.owner_id,w.source_scope INTO s
 FROM reality_internal.governed_employee_shifts_v1 sh
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse
 ON pulse.shift_id=sh.shift_id AND pulse.owner_id=sh.owner_id
 WHERE sh.shift_id=p_shift_id AND sh.closed_at IS NULL AND sh.authorized_at IS NOT NULL
 AND sh.planned_end_at>pg_catalog.clock_timestamp()
 AND sh.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND pulse.last_worker_status='WAKE_RECEIVED'
 AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
 WHERE r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO m FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE incident_id=p_maintenance_id AND owner_id=s.owner_id AND claimed_shift_id=p_shift_id
 AND phase IN ('OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE','OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION')
 AND independent_frozen_test_receipt_sha256 IS NULL AND repaired_capability_receipt_sha256 IS NULL
 AND exact_install_approval_receipt_sha256 IS NULL AND original_job_completed=false
 AND production_changed=false AND independent_failure_baseline_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$';
 IF NOT FOUND THEN RETURN NULL;END IF;
 health:=public.reality_read_owner_shift_handoff_health_v1(s.owner_id);
 IF health->>'status'<>'SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'
 OR health->>'shift_id'<>p_shift_id::text THEN RETURN NULL;END IF;
 SELECT * INTO a FROM reality_internal.owner_repair_scope_handoffs_v1
 WHERE shift_id=p_shift_id AND owner_id=s.owner_id AND source_ref=m.source_ref
 AND state='SOURCE_RECHECKED' AND approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 AND continued_at IS NOT NULL AND source_file ~ '^src/[A-Za-z0-9_./-]+[.]js$'
 AND candidate_commit_sha ~ '^[a-f0-9]{40}$'
 AND handoff_id::text=health->'repair_scope'->>'handoff_id'
 AND approval_receipt_sha256=health->'repair_scope'->>'owner_approval_receipt'
 AND health->'repair_scope'->>'next_action'='EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI'
 AND health->'repair_scope'->>'independent_frozen_ci_after_approval_verified'='false'
 AND health->'repair_scope'->>'work_scope_approved'='true';
 IF FOUND THEN
  basis:=pg_catalog.jsonb_build_object('action','EXECUTE_NEW_INDEPENDENT_CASE_SPECIFIC_FROZEN_CI',
   'authority_basis','APPROVED_EXACT_SOURCE_SCOPE','authority_receipt_sha256',a.approval_receipt_sha256,
   'source_revision',a.candidate_commit_sha,'approved_target_path',a.source_file,
   'approved_target_blob_sha',a.candidate_blob_sha,'baseline_run_id',a.baseline_run_id,
   'green_run_id',a.green_run_id,'prior_frozen_test_sha256',a.frozen_test_sha256,
   'work_order_fingerprint',a.work_order_fingerprint);
 ELSE
  SELECT * INTO h FROM reality_internal.owner_maintenance_signed_repair_handoffs_v1
  WHERE maintenance_id=m.incident_id AND owner_id=s.owner_id AND shift_id=p_shift_id
  AND source_ref=m.source_ref AND origin_shift_id=m.origin_shift_id
  AND work_phase='NEEDS_CASE_SPECIFIC_FROZEN_RED'
  AND independent_baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
  AND independent_diagnostic_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(s.source_scope) e
    WHERE e->>'maintenance_id'=m.incident_id::text AND e->>'source_ref'=m.source_ref
    AND e->>'origin_shift_id'=m.origin_shift_id::text
    AND e->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(health->'maintenance_handoffs') e
    WHERE e->>'source_ref'=m.source_ref
    AND e->>'next_action'='RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE'
    AND e->>'case_ci_artifact_recorded'='false');
  IF NOT FOUND THEN RETURN NULL;END IF;
  -- Resolve the existing receipt to its exact historical observation and
  -- investigation. A receipt label alone is not a concrete test input.
  SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1
   WHERE incident_id=m.incident_id AND owner_id=m.owner_id
    AND shift_id=m.origin_shift_id
    AND investigation_receipt_sha256=m.investigation_receipt_sha256
    AND investigation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}
   'authority_basis','SIGNED_EXISTING_WARRANT','authority_receipt_sha256',h.handoff_receipt_sha256,
   'source_revision',p_release_sha,'existing_original_work_id',h.existing_original_work_id,
   'source_epoch_receipt_sha256',h.source_epoch_receipt_sha256,
   'independent_diagnostic_receipt_sha256',h.independent_diagnostic_receipt_sha256,
   'failure_evidence',failure_evidence);
 END IF;
 RETURN basis||pg_catalog.jsonb_build_object('maintenance_id',m.incident_id,'owner_id',s.owner_id,
  'shift_id',p_shift_id,'source_ref',m.source_ref,'release_sha',p_release_sha,
  'historical_failure_kind',m.failure_baseline_kind,'maintenance_kind',m.maintenance_kind,
  'independent_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_frozen_test_draft_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE m record;v jsonb;lease jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 FOR m IN SELECT incident_id FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND frozen_test_build IS NULL AND original_job_completed=false
 ORDER BY created_at,incident_id FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,p_release_sha);
  IF v IS NULL THEN CONTINUE;END IF;
  lease:=pg_catalog.jsonb_build_object('state','CLAIMED','request_id',pg_catalog.gen_random_uuid(),
   'worker_run_id',p_worker_run_id,'scope',v,'claimed_at',pg_catalog.clock_timestamp());
  UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET frozen_test_build=lease WHERE incident_id=m.incident_id;
  RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_LEASED',
   'request_id',lease->>'request_id','model_invocation_authorized',true,
   'independent_ci_verified',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('status','NO_NEW_SIGNED_FROZEN_TEST_DRAFT_READY',
  'model_invocation_authorized',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1 WHERE incident_id=p_maintenance_id;
 IF l->>'state'='CLAIMED' AND l->>'request_id'=p_request_id::text
 AND l->'scope'->>'release_sha'=p_release_sha THEN
  v:=reality_internal.signed_frozen_test_build_scope_v1((l->'scope'->>'shift_id')::uuid,p_maintenance_id,(l->>'worker_run_id')::uuid,p_release_sha);
  IF v IS NOT NULL AND v=l->'scope' THEN
   RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED',
   'request_id',p_request_id,'source_read_authorized',true,'model_candidate_only',true,
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_SCOPE_UNAVAILABLE');
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_frozen_test_draft_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text,p_candidate jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;h text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE incident_id=p_maintenance_id FOR UPDATE;
 v:=public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(p_maintenance_id,p_request_id,p_release_sha);
 IF v->>'status' IS DISTINCT FROM 'SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED'
 THEN RETURN pg_catalog.jsonb_build_object('status','FROZEN_TEST_DRAFT_SCOPE_CHANGED_NO_WRITE');END IF;
 IF pg_catalog.jsonb_typeof(p_candidate) IS DISTINCT FROM 'object' OR length(p_candidate::text)>24000
 OR coalesce(p_candidate->>'state','') NOT IN ('DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE')
 OR (p_candidate->>'state'='DRAFT' AND (
 coalesce(p_candidate->>'model_response_id','') !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 OR coalesce(p_candidate->>'target_path','') !~ '^src/[A-Za-z0-9_./-]+[.]js$'
 OR p_candidate->>'target_path' LIKE '%..%'
 OR coalesce(p_candidate->>'target_blob_sha','') !~ '^[a-f0-9]{40}$'
 OR length(coalesce(p_candidate->>'test_source','')) NOT BETWEEN 100 AND 16000
 OR length(coalesce(p_candidate->>'expected_failure','')) NOT BETWEEN 20 AND 1000
 OR (v->>'approved_target_path' IS NOT NULL AND (v->>'approved_target_path'<>p_candidate->>'target_path'
 OR v->>'approved_target_blob_sha'<>p_candidate->>'target_blob_sha'))))
 THEN RAISE EXCEPTION 'FROZEN_TEST_DRAFT_INVALID';END IF;
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
 'scope',l->'scope','request_id',p_request_id,'candidate',p_candidate)::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1
 SET frozen_test_build=l||pg_catalog.jsonb_build_object('state',p_candidate->>'state',
 'candidate',p_candidate,'receipt_sha256',h,'recorded_at',pg_catalog.clock_timestamp())
 WHERE incident_id=p_maintenance_id;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_BUILD_RESULT_RECORDED',
  'maintenance_id',p_maintenance_id,'request_id',p_request_id,'draft_state',p_candidate->>'state',
  'receipt_sha256',h,'independent_ci_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) TO service_role;
    AND investigated_at IS NOT NULL;
  IF NOT FOUND THEN RETURN NULL;END IF;
  IF m.failure_baseline_kind='HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES' THEN
   SELECT * INTO b FROM reality_internal.shift_business_qualification_reviews_v1
    WHERE incident_id=m.incident_id AND owner_id=m.owner_id
     AND shift_id=m.origin_shift_id AND source_ref=m.source_ref
     AND investigation_receipt_sha256=m.investigation_receipt_sha256
     AND receipt_sha256=m.independent_review_receipt_sha256
     AND reviewer=m.independent_reviewer AND status='NO_ORIGINAL_ADMISSION_CONFIRMED'
     AND original_claim_count=0 AND prior_inquiry_count>=2
     AND original_job_completed=false AND repair_executed=false
     AND installation_authorized=false AND production_changed=false
     AND completed_at IS NOT NULL;
   IF NOT FOUND THEN RETURN NULL;END IF;
   facts:=pg_catalog.jsonb_build_object('review_status',b.status,
    'original_claim_count',b.original_claim_count,'prior_inquiry_count',b.prior_inquiry_count,
    'source_claim_id',b.source_claim_id,'source_provider_sha256',b.current_provider_sha256,
    'reviewed_at',b.completed_at);
  ELSIF m.failure_baseline_kind='HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED' THEN
   SELECT * INTO r FROM reality_internal.shift_continuity_independent_reviews_v1
    WHERE incident_id=m.incident_id AND owner_id=m.owner_id
     AND shift_id=m.origin_shift_id AND source_ref=m.source_ref
     AND investigation_receipt_sha256=m.investigation_receipt_sha256
     AND receipt_sha256=m.independent_review_receipt_sha256
     AND reviewer=m.independent_reviewer AND status='SOURCE_CHANGED_NEEDS_FROZEN_TEST'
     AND previously_reviewed_sha256<>current_provider_sha256
     AND original_job_completed=false AND installation_authorized=false
     AND production_changed=false AND completed_at IS NOT NULL;
   IF NOT FOUND THEN RETURN NULL;END IF;
   facts:=pg_catalog.jsonb_build_object('review_status',r.status,
    'previously_reviewed_sha256',r.previously_reviewed_sha256,
    'source_provider_sha256',r.current_provider_sha256,'reviewed_at',r.completed_at);
  ELSE RETURN NULL;END IF;
  SELECT * INTO d FROM reality_internal.signed_maintenance_executor_claims_v1
   WHERE maintenance_id=m.incident_id AND owner_id=m.owner_id
    AND shift_id=p_shift_id AND source_ref=m.source_ref
    AND source_epoch_receipt_sha256=h.source_epoch_receipt_sha256
    AND ci_independent_diagnostic_receipt_sha256=h.independent_diagnostic_receipt_sha256
    AND ci_independent_verified_at IS NOT NULL
    AND ci_independent_diagnostic_run_id>0 AND ci_independent_diagnostic_artifact_id>0
    AND ci_independent_artifact_digest ~ '^sha256:[a-f0-9]{64}
   'authority_basis','SIGNED_EXISTING_WARRANT','authority_receipt_sha256',h.handoff_receipt_sha256,
   'source_revision',p_release_sha,'existing_original_work_id',h.existing_original_work_id,
   'source_epoch_receipt_sha256',h.source_epoch_receipt_sha256,
   'independent_diagnostic_receipt_sha256',h.independent_diagnostic_receipt_sha256);
 END IF;
 RETURN basis||pg_catalog.jsonb_build_object('maintenance_id',m.incident_id,'owner_id',s.owner_id,
  'shift_id',p_shift_id,'source_ref',m.source_ref,'release_sha',p_release_sha,
  'historical_failure_kind',m.failure_baseline_kind,'maintenance_kind',m.maintenance_kind,
  'independent_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_frozen_test_draft_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE m record;v jsonb;lease jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 FOR m IN SELECT incident_id FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND frozen_test_build IS NULL AND original_job_completed=false
 ORDER BY created_at,incident_id FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,p_release_sha);
  IF v IS NULL THEN CONTINUE;END IF;
  lease:=pg_catalog.jsonb_build_object('state','CLAIMED','request_id',pg_catalog.gen_random_uuid(),
   'worker_run_id',p_worker_run_id,'scope',v,'claimed_at',pg_catalog.clock_timestamp());
  UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET frozen_test_build=lease WHERE incident_id=m.incident_id;
  RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_LEASED',
   'request_id',lease->>'request_id','model_invocation_authorized',true,
   'independent_ci_verified',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('status','NO_NEW_SIGNED_FROZEN_TEST_DRAFT_READY',
  'model_invocation_authorized',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1 WHERE incident_id=p_maintenance_id;
 IF l->>'state'='CLAIMED' AND l->>'request_id'=p_request_id::text
 AND l->'scope'->>'release_sha'=p_release_sha THEN
  v:=reality_internal.signed_frozen_test_build_scope_v1((l->'scope'->>'shift_id')::uuid,p_maintenance_id,(l->>'worker_run_id')::uuid,p_release_sha);
  IF v IS NOT NULL AND v=l->'scope' THEN
   RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED',
   'request_id',p_request_id,'source_read_authorized',true,'model_candidate_only',true,
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_SCOPE_UNAVAILABLE');
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_frozen_test_draft_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text,p_candidate jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;h text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE incident_id=p_maintenance_id FOR UPDATE;
 v:=public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(p_maintenance_id,p_request_id,p_release_sha);
 IF v->>'status' IS DISTINCT FROM 'SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED'
 THEN RETURN pg_catalog.jsonb_build_object('status','FROZEN_TEST_DRAFT_SCOPE_CHANGED_NO_WRITE');END IF;
 IF pg_catalog.jsonb_typeof(p_candidate) IS DISTINCT FROM 'object' OR length(p_candidate::text)>24000
 OR coalesce(p_candidate->>'state','') NOT IN ('DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE')
 OR (p_candidate->>'state'='DRAFT' AND (
 coalesce(p_candidate->>'model_response_id','') !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 OR coalesce(p_candidate->>'target_path','') !~ '^src/[A-Za-z0-9_./-]+[.]js$'
 OR p_candidate->>'target_path' LIKE '%..%'
 OR coalesce(p_candidate->>'target_blob_sha','') !~ '^[a-f0-9]{40}$'
 OR length(coalesce(p_candidate->>'test_source','')) NOT BETWEEN 100 AND 16000
 OR length(coalesce(p_candidate->>'expected_failure','')) NOT BETWEEN 20 AND 1000
 OR (v->>'approved_target_path' IS NOT NULL AND (v->>'approved_target_path'<>p_candidate->>'target_path'
 OR v->>'approved_target_blob_sha'<>p_candidate->>'target_blob_sha'))))
 THEN RAISE EXCEPTION 'FROZEN_TEST_DRAFT_INVALID';END IF;
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
 'scope',l->'scope','request_id',p_request_id,'candidate',p_candidate)::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1
 SET frozen_test_build=l||pg_catalog.jsonb_build_object('state',p_candidate->>'state',
 'candidate',p_candidate,'receipt_sha256',h,'recorded_at',pg_catalog.clock_timestamp())
 WHERE incident_id=p_maintenance_id;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_BUILD_RESULT_RECORDED',
  'maintenance_id',p_maintenance_id,'request_id',p_request_id,'draft_state',p_candidate->>'state',
  'receipt_sha256',h,'independent_ci_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) TO service_role;;
  IF NOT FOUND THEN RETURN NULL;END IF;
  failure_evidence:=pg_catalog.jsonb_build_object(
   'schema','reality-signed-frozen-test-observation-v1',
   'owner_id',m.owner_id,'shift_id',p_shift_id,'origin_shift_id',m.origin_shift_id,
   'maintenance_id',m.incident_id,'source_ref',m.source_ref,
   'existing_original_work_id',h.existing_original_work_id,
   'historical_failure_kind',m.failure_baseline_kind,
   'baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256,
   'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
   'investigation_receipt_sha256',m.investigation_receipt_sha256,
   'source_epoch_receipt_sha256',h.source_epoch_receipt_sha256,
   'diagnostic_receipt_sha256',h.independent_diagnostic_receipt_sha256,
   'diagnostic_run_id',d.ci_independent_diagnostic_run_id,
   'diagnostic_artifact_id',d.ci_independent_diagnostic_artifact_id,
   'diagnostic_artifact_digest',d.ci_independent_artifact_digest,
   'historical_observation',facts,
   'investigation_hypothesis',pg_catalog.jsonb_build_object(
    'diagnosis',pg_catalog.left(i.diagnosis,1500),
    'proposed_upgrade',pg_catalog.left(i.proposed_upgrade,1600),
    'independent_test_requirement',pg_catalog.left(i.independent_test_requirement,1600),
    'limitations',pg_catalog.left(i.limitations,1500)),
   'historical_observation_only',true,'root_cause_verified',false,
   'frozen_red_verified',false,'original_job_completed',false,'installation_authorized',false);
  basis:=pg_catalog.jsonb_build_object('action','RUN_CASE_SPECIFIC_FROZEN_RED_AND_RECHECK_SOURCE',
   'authority_basis','SIGNED_EXISTING_WARRANT','authority_receipt_sha256',h.handoff_receipt_sha256,
   'source_revision',p_release_sha,'existing_original_work_id',h.existing_original_work_id,
   'source_epoch_receipt_sha256',h.source_epoch_receipt_sha256,
   'independent_diagnostic_receipt_sha256',h.independent_diagnostic_receipt_sha256);
 END IF;
 RETURN basis||pg_catalog.jsonb_build_object('maintenance_id',m.incident_id,'owner_id',s.owner_id,
  'shift_id',p_shift_id,'source_ref',m.source_ref,'release_sha',p_release_sha,
  'historical_failure_kind',m.failure_baseline_kind,'maintenance_kind',m.maintenance_kind,
  'independent_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_frozen_test_draft_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE m record;v jsonb;lease jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 FOR m IN SELECT incident_id FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE claimed_shift_id=p_shift_id AND frozen_test_build IS NULL AND original_job_completed=false
 ORDER BY created_at,incident_id FOR UPDATE SKIP LOCKED LOOP
  v:=reality_internal.signed_frozen_test_build_scope_v1(p_shift_id,m.incident_id,p_worker_run_id,p_release_sha);
  IF v IS NULL THEN CONTINUE;END IF;
  lease:=pg_catalog.jsonb_build_object('state','CLAIMED','request_id',pg_catalog.gen_random_uuid(),
   'worker_run_id',p_worker_run_id,'scope',v,'claimed_at',pg_catalog.clock_timestamp());
  UPDATE reality_internal.owner_internal_maintenance_jobs_v1 SET frozen_test_build=lease WHERE incident_id=m.incident_id;
  RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_LEASED',
   'request_id',lease->>'request_id','model_invocation_authorized',true,
   'independent_ci_verified',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('status','NO_NEW_SIGNED_FROZEN_TEST_DRAFT_READY',
  'model_invocation_authorized',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1 WHERE incident_id=p_maintenance_id;
 IF l->>'state'='CLAIMED' AND l->>'request_id'=p_request_id::text
 AND l->'scope'->>'release_sha'=p_release_sha THEN
  v:=reality_internal.signed_frozen_test_build_scope_v1((l->'scope'->>'shift_id')::uuid,p_maintenance_id,(l->>'worker_run_id')::uuid,p_release_sha);
  IF v IS NOT NULL AND v=l->'scope' THEN
   RETURN v||pg_catalog.jsonb_build_object('status','SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED',
   'request_id',p_request_id,'source_read_authorized',true,'model_candidate_only',true,
   'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_DRAFT_SCOPE_UNAVAILABLE');
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_frozen_test_draft_v1(
 p_maintenance_id uuid,p_request_id uuid,p_release_sha text,p_candidate jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $fn$
DECLARE l jsonb;v jsonb;h text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FROZEN_TEST_BUILD_SERVICE_ONLY';END IF;
 SELECT frozen_test_build INTO l FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE incident_id=p_maintenance_id FOR UPDATE;
 v:=public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(p_maintenance_id,p_request_id,p_release_sha);
 IF v->>'status' IS DISTINCT FROM 'SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED'
 THEN RETURN pg_catalog.jsonb_build_object('status','FROZEN_TEST_DRAFT_SCOPE_CHANGED_NO_WRITE');END IF;
 IF pg_catalog.jsonb_typeof(p_candidate) IS DISTINCT FROM 'object' OR length(p_candidate::text)>24000
 OR coalesce(p_candidate->>'state','') NOT IN ('DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE')
 OR (p_candidate->>'state'='DRAFT' AND (
 coalesce(p_candidate->>'model_response_id','') !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 OR coalesce(p_candidate->>'target_path','') !~ '^src/[A-Za-z0-9_./-]+[.]js$'
 OR p_candidate->>'target_path' LIKE '%..%'
 OR coalesce(p_candidate->>'target_blob_sha','') !~ '^[a-f0-9]{40}$'
 OR length(coalesce(p_candidate->>'test_source','')) NOT BETWEEN 100 AND 16000
 OR length(coalesce(p_candidate->>'expected_failure','')) NOT BETWEEN 20 AND 1000
 OR (v->>'approved_target_path' IS NOT NULL AND (v->>'approved_target_path'<>p_candidate->>'target_path'
 OR v->>'approved_target_blob_sha'<>p_candidate->>'target_blob_sha'))))
 THEN RAISE EXCEPTION 'FROZEN_TEST_DRAFT_INVALID';END IF;
 h:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.jsonb_build_object(
 'scope',l->'scope','request_id',p_request_id,'candidate',p_candidate)::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1
 SET frozen_test_build=l||pg_catalog.jsonb_build_object('state',p_candidate->>'state',
 'candidate',p_candidate,'receipt_sha256',h,'recorded_at',pg_catalog.clock_timestamp())
 WHERE incident_id=p_maintenance_id;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_FROZEN_TEST_BUILD_RESULT_RECORDED',
  'maintenance_id',p_maintenance_id,'request_id',p_request_id,'draft_state',p_candidate->>'state',
  'receipt_sha256',h,'independent_ci_verified',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.signed_frozen_test_build_scope_v1(uuid,uuid,uuid,text),
 public.reality_claim_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text),
 public.reality_read_signed_maintenance_frozen_test_draft_scope_v1(uuid,uuid,text),
 public.reality_record_signed_maintenance_frozen_test_draft_v1(uuid,uuid,text,jsonb) TO service_role;