-- Continue the EXISTING signed maintenance shift: exact owner decision,
-- one-use installation fence and independently verified postinstall receipt.
-- No new shift, no approval from model/CI, no production installation.
CREATE TABLE IF NOT EXISTS reality_internal.owner_signed_maintenance_install_decisions_v1 (
 maintenance_id uuid PRIMARY KEY REFERENCES reality_internal.owner_maintenance_verified_artifact_handoffs_v1(maintenance_id),
 owner_id uuid NOT NULL,shift_id uuid NOT NULL,
 approval_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 request_id uuid NOT NULL UNIQUE,
 target_review_receipt_sha256 text NOT NULL CHECK(target_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 artifact_receipt_sha256 text NOT NULL CHECK(artifact_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 candidate_commit_sha text NOT NULL CHECK(candidate_commit_sha~'^[a-f0-9]{40}$'),
 candidate_source_blob_sha text NOT NULL CHECK(candidate_source_blob_sha~'^[a-f0-9]{40}$'),
 target_branch text NOT NULL CHECK(target_branch='reality/chat-direct-work-handoff-20261115'),
 target_path text NOT NULL CHECK(target_path~'^src/[a-z0-9_./-]+\.js$' AND position('..' in target_path)=0),
 expected_parent_sha text NOT NULL CHECK(expected_parent_sha~'^[a-f0-9]{40}$'),
 expected_old_blob_sha text NOT NULL CHECK(expected_old_blob_sha~'^[a-f0-9]{40}$'),
 state text NOT NULL DEFAULT 'APPROVED' CHECK(state IN('APPROVED','FENCED','INSTALLED','VERIFIED')),
 approval_receipt_sha256 text NOT NULL UNIQUE CHECK(approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 approved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 fenced_at timestamptz,
 installed_commit_sha text CHECK(installed_commit_sha IS NULL OR installed_commit_sha~'^[a-f0-9]{40}$'),
 installed_at timestamptz,
 independent_postinstall_receipt_sha256 text CHECK(independent_postinstall_receipt_sha256 IS NULL OR independent_postinstall_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 independently_verified_at timestamptz,
 CHECK((state='APPROVED' AND fenced_at IS NULL AND installed_commit_sha IS NULL) OR
       (state='FENCED' AND fenced_at IS NOT NULL AND installed_commit_sha IS NULL) OR
       (state='INSTALLED' AND fenced_at IS NOT NULL AND installed_commit_sha IS NOT NULL AND installed_at IS NOT NULL) OR
       (state='VERIFIED' AND fenced_at IS NOT NULL AND installed_commit_sha IS NOT NULL AND installed_at IS NOT NULL AND independent_postinstall_receipt_sha256 IS NOT NULL AND independently_verified_at IS NOT NULL))
);
ALTER TABLE reality_internal.owner_signed_maintenance_install_decisions_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.owner_signed_maintenance_install_decisions_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.owner_signed_maintenance_install_decisions_v1 TO service_role;

-- This service-only card is never owner authority itself. The API derives
-- the authenticated owner before reading and accepts only a perfect match.
CREATE OR REPLACE FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(p_owner_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE a record;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'SIGNED_MAINTENANCE_OWNER_REVIEW_SERVICE_REQUIRED'; END IF;
 SELECT art.*,s.plan_fingerprint,m.independent_review_receipt_sha256,
  d.approval_id,d.state AS decision_state,d.approval_receipt_sha256
 INTO a
 FROM reality_internal.owner_maintenance_verified_artifact_handoffs_v1 art
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=art.maintenance_id AND m.owner_id=art.owner_id
  AND m.claimed_shift_id=art.shift_id AND m.source_ref=art.source_ref
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=art.shift_id AND s.owner_id=art.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.owner_maintenance_independent_case_ci_v1 ci
  ON ci.maintenance_id=art.maintenance_id AND ci.owner_id=art.owner_id
  AND ci.shift_id=art.shift_id AND ci.source_ref=art.source_ref
  AND ci.case_specific_ci_receipt_sha256=art.source_case_ci_receipt_sha256
 LEFT JOIN reality_internal.owner_signed_maintenance_install_decisions_v1 d
  ON d.maintenance_id=art.maintenance_id AND d.owner_id=art.owner_id
  AND d.shift_id=art.shift_id
 WHERE art.owner_id=p_owner_id AND art.target_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND art.target_review_worker_run_id<>art.observed_worker_run_id
  AND art.target_review_branch='reality/chat-direct-work-handoff-20261115'
  AND art.target_review_existing_blob_sha=art.historical_source_blob_sha
  AND art.target_review_head_sha~'^[a-f0-9]{40}$'
  AND art.candidate_source_blob_sha<>art.historical_source_blob_sha
  AND art.exact_candidate_commit_sha~'^[a-f0-9]{40}$'
  AND art.source_case_ci_receipt_sha256=m.independent_frozen_test_receipt_sha256
  AND ci.source_epoch_frozen_red_verified=true
  AND ci.code_correction_green_verified=true
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND w.state='ACTIVE' AND EXISTS (
   SELECT 1 FROM pg_catalog.jsonb_array_elements(
    CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
    THEN w.source_scope ELSE '[]'::jsonb END) e
   WHERE e->>'maintenance_id'=m.incident_id::text
    AND e->>'origin_shift_id'=m.origin_shift_id::text
    AND e->>'source_ref'=m.source_ref
    AND e->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.planned_start_at<=clock_timestamp()
  AND (s.planned_end_at='infinity'::timestamptz OR s.planned_end_at>clock_timestamp())
  AND m.original_job_completed=false AND m.production_changed=false
  AND m.installation_authorized_by_discovery=false
  AND (d.state IS NOT NULL OR (m.exact_install_approval_receipt_sha256 IS NULL
   AND m.repaired_capability_receipt_sha256 IS NULL))
 ORDER BY art.reviewed_at,art.maintenance_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY',
  'owner_approval_ready',false,'installation_authorized',false,
  'repair_installed',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status',CASE WHEN a.decision_state IS NOT NULL
   THEN 'EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED'
   ELSE 'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY' END,
  'owner_id',a.owner_id,'shift_id',a.shift_id,
  'maintenance_id',a.maintenance_id,'source_ref',a.source_ref,
  'target_path',a.source_path,'target_branch',a.target_review_branch,
  'target_head_sha',a.target_review_head_sha,
  'expected_old_blob_sha',a.historical_source_blob_sha,
  'candidate_commit_sha',a.exact_candidate_commit_sha,
  'candidate_source_blob_sha',a.candidate_source_blob_sha,
  'artifact_receipt_sha256',a.review_receipt_sha256,
  'case_ci_receipt_sha256',a.source_case_ci_receipt_sha256,
  'target_review_receipt_sha256',a.target_review_receipt_sha256,
  'decision_state',a.decision_state,'approval_id',a.approval_id,
  'approval_receipt_sha256',a.approval_receipt_sha256,
  'owner_approval_ready',(a.decision_state IS NULL),
  'installation_authorized',(a.decision_state IS NOT NULL),
  'repair_installed',(a.decision_state IN('INSTALLED','VERIFIED')),
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false,'exact_one_time_click_required',(a.decision_state IS NULL)
 );
END $fn$;

-- This cannot be called with an end-user JWT. Only the authenticated,
-- same-origin server endpoint can submit its owner-verified decision.
CREATE OR REPLACE FUNCTION public.reality_record_owner_signed_maintenance_install_decision_v1(
 p_owner_id uuid,p_shift_id uuid,p_maintenance_id uuid,p_request_id uuid,
 p_candidate_commit_sha text,p_target_review_receipt_sha256 text,p_intent text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE card jsonb; approval_hash text; approval uuid;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL OR p_shift_id IS NULL
  OR p_maintenance_id IS NULL OR p_request_id IS NULL OR
  p_candidate_commit_sha!~'^[a-f0-9]{40}$' OR
  p_target_review_receipt_sha256!~'^sha256:[a-f0-9]{64}$' OR
  p_intent<>'OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR'
 THEN RAISE EXCEPTION 'EXACT_OWNER_SIGNED_INSTALL_CONTRACT_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.owner_signed_maintenance_install_decisions_v1 d
  WHERE d.maintenance_id=p_maintenance_id OR d.request_id=p_request_id) THEN
  RETURN pg_catalog.jsonb_build_object('status','EXACT_OWNER_MAINTENANCE_INSTALL_ALREADY_DECIDED_NO_REPLAY',
   'installation_authorized',false,'repair_installed',false,'original_job_completed',false,'production_changed',false); END IF;
 card:=public.reality_read_owner_signed_maintenance_install_decision_v1(p_owner_id);
 IF card->>'status'<>'EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY'
  OR card->>'owner_id'<>p_owner_id::text
  OR card->>'shift_id'<>p_shift_id::text
  OR card->>'maintenance_id'<>p_maintenance_id::text
  OR card->>'candidate_commit_sha'<>p_candidate_commit_sha
  OR card->>'target_review_receipt_sha256'<>p_target_review_receipt_sha256
  OR card->>'owner_approval_ready'<>'true'
 THEN RETURN pg_catalog.jsonb_build_object('status','EXACT_OWNER_MAINTENANCE_INSTALL_SCOPE_CHANGED',
  'installation_authorized',false,'repair_installed',false,'original_job_completed',false,'production_changed',false); END IF;
 approval:=gen_random_uuid();
 approval_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'reality-exact-owner-maintenance-approval-v1|'||p_owner_id::text||'|'||
  p_shift_id::text||'|'||p_maintenance_id::text||'|'||p_request_id::text||'|'||
  p_candidate_commit_sha||'|'||p_target_review_receipt_sha256||'|'||
  card->>'target_head_sha'||'|'||card->>'artifact_receipt_sha256','UTF8')),'hex');
 INSERT INTO reality_internal.owner_signed_maintenance_install_decisions_v1(
  maintenance_id,owner_id,shift_id,approval_id,request_id,
  target_review_receipt_sha256,artifact_receipt_sha256,
  candidate_commit_sha,candidate_source_blob_sha,target_branch,target_path,
  expected_parent_sha,expected_old_blob_sha,approval_receipt_sha256
 ) VALUES (p_maintenance_id,p_owner_id,p_shift_id,approval,p_request_id,
  p_target_review_receipt_sha256,card->>'artifact_receipt_sha256',
  p_candidate_commit_sha,card->>'candidate_source_blob_sha',
  card->>'target_branch',card->>'target_path',
  card->>'target_head_sha',card->>'expected_old_blob_sha',approval_hash);
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1
 SET exact_install_approval_receipt_sha256=approval_hash,
     phase='AUTHORIZED_REPAIR_IN_PROGRESS'
 WHERE incident_id=p_maintenance_id AND owner_id=p_owner_id
  AND claimed_shift_id=p_shift_id AND exact_install_approval_receipt_sha256 IS NULL
  AND repaired_capability_receipt_sha256 IS NULL
  AND independent_frozen_test_receipt_sha256=card->>'case_ci_receipt_sha256'
  AND phase IN('FROZEN_FAILURE_VERIFIED','CANDIDATE_INDEPENDENTLY_TESTED','AWAITING_EXACT_APPROVAL');
 IF NOT FOUND THEN RAISE EXCEPTION 'EXACT_OWNER_MAINTENANCE_APPROVAL_STATE_DRIFT'; END IF;
 RETURN pg_catalog.jsonb_build_object('status','EXACT_OWNER_MAINTENANCE_INSTALL_APPROVED_FOR_AUTOMATIC_CONTINUATION',
  'owner_id',p_owner_id,'shift_id',p_shift_id,'maintenance_id',p_maintenance_id,
  'approval_id',approval,'approval_receipt_sha256',approval_hash,
  'candidate_commit_sha',p_candidate_commit_sha,
  'target_review_receipt_sha256',p_target_review_receipt_sha256,
  'owner_approval_recorded',true,'installation_authorized',true,
  'repair_installed',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false,
  'next_action','SIGNED_EXISTING_SHIFT_INSTALL_THEN_INDEPENDENT_POSTINSTALL');
END $fn$;

-- Read, claim and record all operate on the same immutable parent, exact
-- candidate and one-use owner approval. A fenced/uncertain provider write
-- is only ever reconciled by independent GET; never submitted twice.
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_approved_install_scope_v1()
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE d record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'MAINTENANCE_INSTALL_SERVICE_REQUIRED'; END IF;
 SELECT x.*,a.source_ref,a.source_case_ci_receipt_sha256
 INTO d FROM reality_internal.owner_signed_maintenance_install_decisions_v1 x
 JOIN reality_internal.owner_maintenance_verified_artifact_handoffs_v1 a
  ON a.maintenance_id=x.maintenance_id AND a.shift_id=x.shift_id
  AND a.owner_id=x.owner_id AND a.review_receipt_sha256=x.artifact_receipt_sha256
  AND a.target_review_receipt_sha256=x.target_review_receipt_sha256
  AND a.exact_candidate_commit_sha=x.candidate_commit_sha
  AND a.candidate_source_blob_sha=x.candidate_source_blob_sha
  AND a.target_review_head_sha=x.expected_parent_sha
  AND a.target_review_existing_blob_sha=x.expected_old_blob_sha
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=x.maintenance_id AND m.owner_id=x.owner_id
  AND m.claimed_shift_id=x.shift_id AND m.source_ref=a.source_ref
  AND m.exact_install_approval_receipt_sha256=x.approval_receipt_sha256
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=x.shift_id AND s.owner_id=x.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE x.state IN('APPROVED','FENCED','INSTALLED','VERIFIED')
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND w.state='ACTIVE' AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.planned_end_at='infinity'::timestamptz
  AND m.original_job_completed=false AND m.production_changed=false
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(
   CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
   THEN w.source_scope ELSE '[]'::jsonb END) e
   WHERE e->>'maintenance_id'=m.incident_id::text
    AND e->>'source_ref'=m.source_ref
    AND e->>'origin_shift_id'=m.origin_shift_id::text
    AND e->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 ORDER BY x.approved_at LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL',
  'installation_authorized',false,'repair_installed',false,
  'original_job_completed',false,'production_changed',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL_SCOPE',
  'maintenance_id',d.maintenance_id,'owner_id',d.owner_id,'shift_id',d.shift_id,
  'source_ref',d.source_ref,'source_path',d.target_path,
  'target_branch',d.target_branch,'expected_parent_sha',d.expected_parent_sha,
  'expected_old_blob_sha',d.expected_old_blob_sha,
  'candidate_commit_sha',d.candidate_commit_sha,
  'candidate_blob_sha',d.candidate_source_blob_sha,
  'approval_id',d.approval_id,'approval_receipt_sha256',d.approval_receipt_sha256,
  'artifact_receipt_sha256',d.artifact_receipt_sha256,
  'case_ci_receipt_sha256',d.source_case_ci_receipt_sha256,
  'target_review_receipt_sha256',d.target_review_receipt_sha256,
  'phase',d.state,'installed_commit_sha',d.installed_commit_sha,
  'independent_postinstall_receipt_sha256',d.independent_postinstall_receipt_sha256,
  'installation_authorized',true,
  'repair_installed',(d.state IN('INSTALLED','VERIFIED')),
  'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_claim_signed_maintenance_approved_install_v1(
 p_maintenance_id uuid,p_expected_parent_sha text,p_approval_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE x record;
BEGIN
 IF current_user<>'service_role' OR p_maintenance_id IS NULL OR
   p_approval_id IS NULL OR p_expected_parent_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'MAINTENANCE_INSTALL_SERVICE_EXACT_FENCE_REQUIRED'; END IF;
 SELECT * INTO x FROM reality_internal.owner_signed_maintenance_install_decisions_v1
 WHERE maintenance_id=p_maintenance_id FOR UPDATE;
 IF NOT FOUND OR x.state<>'APPROVED' OR x.approval_id<>p_approval_id
  OR x.expected_parent_sha<>p_expected_parent_sha
  OR (public.reality_read_signed_maintenance_approved_install_scope_v1()->>'maintenance_id')
    IS DISTINCT FROM p_maintenance_id::text
 THEN RETURN pg_catalog.jsonb_build_object('status','MAINTENANCE_INSTALL_ALREADY_FENCED_OR_SCOPE_DRIFT_NO_RETRY',
  'installation_authorized',false,'repair_installed',false,'original_job_completed',false); END IF;
 UPDATE reality_internal.owner_signed_maintenance_install_decisions_v1
 SET state='FENCED',fenced_at=clock_timestamp()
 WHERE maintenance_id=x.maintenance_id AND state='APPROVED';
 RETURN pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_EXACT_OWNER_APPROVED_SOURCE_WRITE_FENCED',
  'maintenance_id',x.maintenance_id,'owner_id',x.owner_id,'shift_id',x.shift_id,
  'approval_id',x.approval_id,'approval_receipt_sha256',x.approval_receipt_sha256,
  'target_branch',x.target_branch,'source_path',x.target_path,
  'expected_parent_sha',x.expected_parent_sha,
  'expected_old_blob_sha',x.expected_old_blob_sha,
  'candidate_commit_sha',x.candidate_commit_sha,
  'candidate_blob_sha',x.candidate_source_blob_sha,
  'installation_authorized',true,'repair_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_installed_source_v1(
 p_maintenance_id uuid,p_approval_id uuid,p_installed_commit_sha text,
 p_verified_source_blob_sha text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE x record;
BEGIN
 IF current_user<>'service_role' OR p_maintenance_id IS NULL OR
   p_approval_id IS NULL OR p_installed_commit_sha!~'^[a-f0-9]{40}$'
   OR p_verified_source_blob_sha!~'^[a-f0-9]{40}$'
 THEN RAISE EXCEPTION 'MAINTENANCE_POSTINSTALL_EXACT_SOURCE_REQUIRED'; END IF;
 SELECT * INTO x FROM reality_internal.owner_signed_maintenance_install_decisions_v1
 WHERE maintenance_id=p_maintenance_id FOR UPDATE;
 IF NOT FOUND OR x.approval_id<>p_approval_id OR x.state<>'FENCED'
  OR x.candidate_source_blob_sha<>p_verified_source_blob_sha
  OR x.expected_parent_sha=p_installed_commit_sha
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_INSTALL_UNVERIFIED_OR_ALREADY_RECORDED',
  'repair_installed',false,'original_job_completed',false); END IF;
 UPDATE reality_internal.owner_signed_maintenance_install_decisions_v1
 SET state='INSTALLED',installed_commit_sha=p_installed_commit_sha,
     installed_at=clock_timestamp()
 WHERE maintenance_id=p_maintenance_id AND state='FENCED';
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_OWNER_APPROVED_MAINTENANCE_SOURCE_INSTALLED_NEEDS_INDEPENDENT_ACCEPTANCE',
  'maintenance_id',x.maintenance_id,'owner_id',x.owner_id,
  'shift_id',x.shift_id,'installed_commit_sha',p_installed_commit_sha,
  'source_blob_sha',p_verified_source_blob_sha,
  'approval_id',x.approval_id,'installation_authorized',true,
  'repair_installed',true,'original_job_completed',false,
  'production_changed',false);
END $fn$;

DO $acl$ BEGIN
 EXECUTE 'REVOKE ALL ON FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(uuid) FROM PUBLIC,anon,authenticated';
 EXECUTE 'REVOKE ALL ON FUNCTION public.reality_record_owner_signed_maintenance_install_decision_v1(uuid,uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated';
 EXECUTE 'REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_approved_install_scope_v1() FROM PUBLIC,anon,authenticated';
 EXECUTE 'REVOKE ALL ON FUNCTION public.reality_claim_signed_maintenance_approved_install_v1(uuid,text,uuid) FROM PUBLIC,anon,authenticated';
 EXECUTE 'REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_installed_source_v1(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated';
END $acl$;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_signed_maintenance_install_decision_v1(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_owner_signed_maintenance_install_decision_v1(uuid,uuid,uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_approved_install_scope_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_claim_signed_maintenance_approved_install_v1(uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_installed_source_v1(uuid,uuid,text,text) TO service_role;
