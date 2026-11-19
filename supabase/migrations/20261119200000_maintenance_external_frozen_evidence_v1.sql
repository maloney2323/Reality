-- Reality continuity: stage ONE independently observed external GitHub
-- regression run as evidence under an EXISTING signed maintenance obligation.
-- Staging is not a self-repair, signed independent review, CI GREEN admission,
-- installation approval or original customer-job receipt.
CREATE TABLE IF NOT EXISTS reality_internal.owner_maintenance_external_regression_evidence_v1(
 maintenance_id uuid PRIMARY KEY REFERENCES reality_internal.owner_internal_maintenance_jobs_v1(incident_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 source_ref text NOT NULL,
 source_epoch_receipt_sha256 text NOT NULL CHECK(source_epoch_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 external_test_pr_number bigint NOT NULL CHECK(external_test_pr_number>0),
 github_run_id bigint NOT NULL UNIQUE CHECK(github_run_id>10000),
 github_run_url text NOT NULL,
 github_red_job_id bigint NOT NULL CHECK(github_red_job_id>10000),
 github_green_job_id bigint NOT NULL CHECK(github_green_job_id>10000),
 github_head_sha text NOT NULL CHECK(github_head_sha~'^[a-f0-9]{40}$'),
 historical_source_commit_sha text NOT NULL CHECK(historical_source_commit_sha~'^[a-f0-9]{40}$'),
 corrected_source_commit_sha text NOT NULL CHECK(corrected_source_commit_sha~'^[a-f0-9]{40}$'),
 frozen_test_blob_sha text NOT NULL CHECK(frozen_test_blob_sha~'^[a-f0-9]{40}$'),
 frozen_workflow_blob_sha text NOT NULL CHECK(frozen_workflow_blob_sha~'^[a-f0-9]{40}$'),
 evidence_stage text NOT NULL CHECK(evidence_stage='GITHUB_HISTORICAL_RED_GREEN_STAGED_AWAITING_SIGNED_REVIEW'),
 staging_receipt_sha256 text NOT NULL UNIQUE CHECK(staging_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 staged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(github_red_job_id<>github_green_job_id),
 CHECK(historical_source_commit_sha<>corrected_source_commit_sha)
);
REVOKE ALL ON TABLE reality_internal.owner_maintenance_external_regression_evidence_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.owner_maintenance_external_regression_evidence_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_stage_maintenance_external_regression_evidence_v1(
 p_maintenance_id uuid,p_shift_id uuid,p_source_epoch_receipt_sha256 text,
 p_test_pr_number bigint,p_run_id bigint,p_red_job_id bigint,p_green_job_id bigint,
 p_github_head_sha text,p_historical_commit_sha text,p_corrected_commit_sha text,
 p_test_blob_sha text,p_workflow_blob_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
DECLARE v record; existing record; v_sha text; v_status text;
BEGIN
 IF current_user<>'service_role' OR
  p_maintenance_id IS NULL OR p_shift_id IS NULL OR
  p_source_epoch_receipt_sha256 !~ '^sha256:[a-f0-9]{64}$' OR
  p_test_pr_number IS NULL OR p_test_pr_number<1 OR
  p_run_id IS NULL OR p_run_id<10000 OR
  p_red_job_id IS NULL OR p_red_job_id<10000 OR
  p_green_job_id IS NULL OR p_green_job_id<10000 OR
  p_red_job_id=p_green_job_id OR
  p_github_head_sha !~ '^[a-f0-9]{40}$' OR
  p_historical_commit_sha !~ '^[a-f0-9]{40}$' OR
  p_corrected_commit_sha !~ '^[a-f0-9]{40}$' OR
  p_historical_commit_sha=p_corrected_commit_sha OR
  p_test_blob_sha !~ '^[a-f0-9]{40}$' OR
  p_workflow_blob_sha !~ '^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'EXTERNAL_REGRESSION_OWNER_SCOPE_OR_SOURCE_INVALID'; END IF;

 SELECT m.owner_id,m.incident_id,m.source_ref,m.origin_shift_id,
   m.independent_review_receipt_sha256,
   m.independent_failure_baseline_receipt_sha256,
   e.receipt_sha256 epoch_receipt,e.current_provider_sha256,
   s.shift_id
 INTO v
 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
 JOIN reality_internal.signed_maintenance_ci_source_epochs_v1 e
  ON e.maintenance_id=m.incident_id AND e.owner_id=m.owner_id
  AND e.shift_id=p_shift_id
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=p_shift_id AND s.owner_id=m.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE m.incident_id=p_maintenance_id
  AND m.claimed_shift_id=p_shift_id AND m.baseline_claimed_shift_id=p_shift_id
  AND m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
  AND m.independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND m.independent_frozen_test_receipt_sha256 IS NULL
  AND m.exact_install_approval_receipt_sha256 IS NULL
  AND m.repaired_capability_receipt_sha256 IS NULL
  AND m.original_customer_work_id IS NULL
  AND m.original_job_completed IS FALSE
  AND m.production_changed IS FALSE
  AND m.installation_authorized_by_discovery IS FALSE
  AND m.external_action_authorized_by_discovery IS FALSE
  AND e.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
  AND e.receipt_sha256=p_source_epoch_receipt_sha256
  AND e.current_provider_sha256=e.historical_source_sha256
  AND e.current_provider_sha256=m.last_source_sha256
  AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_start_at<=clock_timestamp()
  AND s.planned_end_at>clock_timestamp()
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE'
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) scope
     WHERE scope->>'maintenance_id'=m.incident_id::text
       AND scope->>'origin_shift_id'=m.origin_shift_id::text
       AND scope->>'source_ref'=m.source_ref
       AND scope->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 LIMIT 1;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('status','NO_EXACT_WARRANTED_REGRESSION_SCOPE',
   'independent_ci_red_attested',false,'repair_executed',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 END IF;

 v_status:='GITHUB_HISTORICAL_RED_GREEN_STAGED_AWAITING_SIGNED_REVIEW';
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   v.owner_id::text||'|'||p_maintenance_id::text||'|'||p_shift_id::text||'|'||
   v.source_ref||'|'||p_source_epoch_receipt_sha256||'|'||
   v.independent_review_receipt_sha256||'|'||
   v.independent_failure_baseline_receipt_sha256||'|'||
   p_test_pr_number::text||'|'||p_run_id::text||'|'||
   p_red_job_id::text||'|'||p_green_job_id::text||'|'||
   p_github_head_sha||'|'||p_historical_commit_sha||'|'||
   p_corrected_commit_sha||'|'||p_test_blob_sha||'|'||
   p_workflow_blob_sha||'|'||v_status,'UTF8')),'hex');

 INSERT INTO reality_internal.owner_maintenance_external_regression_evidence_v1(
   maintenance_id,owner_id,shift_id,source_ref,source_epoch_receipt_sha256,
   external_test_pr_number,github_run_id,github_run_url,github_red_job_id,
   github_green_job_id,github_head_sha,historical_source_commit_sha,
   corrected_source_commit_sha,frozen_test_blob_sha,frozen_workflow_blob_sha,
   evidence_stage,staging_receipt_sha256)
 VALUES(p_maintenance_id,v.owner_id,p_shift_id,v.source_ref,p_source_epoch_receipt_sha256,
   p_test_pr_number,p_run_id,
   'https://github.com/maloney2323/Reality/actions/runs/'||p_run_id::text,
   p_red_job_id,p_green_job_id,p_github_head_sha,p_historical_commit_sha,
   p_corrected_commit_sha,p_test_blob_sha,p_workflow_blob_sha,v_status,v_sha)
 ON CONFLICT(maintenance_id) DO NOTHING;
 SELECT * INTO existing
 FROM reality_internal.owner_maintenance_external_regression_evidence_v1
 WHERE maintenance_id=p_maintenance_id;
 IF NOT FOUND OR existing.staging_receipt_sha256<>v_sha
 THEN RAISE EXCEPTION 'EXTERNAL_FROZEN_EVIDENCE_IMMUTABLE_CONFLICT'; END IF;
 RETURN pg_catalog.jsonb_build_object(
   'status','EXTERNAL_REGRESSION_STAGED_INDEPENDENT_SIGNED_REVIEW_REQUIRED',
   'owner_id',v.owner_id,'maintenance_id',p_maintenance_id,
   'shift_id',p_shift_id,'source_ref',v.source_ref,
   'source_epoch_receipt_sha256',p_source_epoch_receipt_sha256,
   'staging_receipt_sha256',v_sha,
   'independent_github_run_url',existing.github_run_url,
   'source_current_epoch_verified',true,
   'independent_ci_red_attested',false,
   'repair_executed',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_stage_maintenance_external_regression_evidence_v1(uuid,uuid,text,bigint,bigint,bigint,bigint,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_stage_maintenance_external_regression_evidence_v1(uuid,uuid,text,bigint,bigint,bigint,bigint,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_owner_maintenance_external_regression_evidence_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO ''
AS $fn$
DECLARE v_items jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL
 THEN RAISE EXCEPTION 'OWNER_MAINTENANCE_CI_EVIDENCE_SERVICE_REQUIRED'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'maintenance_id',e.maintenance_id,'shift_id',e.shift_id,
  'source_ref',e.source_ref,'source_epoch_receipt_sha256',e.source_epoch_receipt_sha256,
  'staging_receipt_sha256',e.staging_receipt_sha256,
  'github_run_id',e.github_run_id,'github_run_url',e.github_run_url,
  'red_job_id',e.github_red_job_id,'green_job_id',e.github_green_job_id,
  'evidence_stage',e.evidence_stage,'staged_at',e.staged_at,
  'independent_ci_red_attested',false,'original_job_completed',false)
  ORDER BY e.staged_at DESC),'[]'::jsonb)
 INTO v_items FROM reality_internal.owner_maintenance_external_regression_evidence_v1 e
 WHERE e.owner_id=p_owner_id;
 RETURN pg_catalog.jsonb_build_object('status','OWNER_MAINTENANCE_EXTERNAL_CI_EVIDENCE_READ_ONLY',
  'owner_id',p_owner_id,'items',v_items,'read_only',true,
  'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_maintenance_external_regression_evidence_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_maintenance_external_regression_evidence_v1(uuid) TO service_role;
