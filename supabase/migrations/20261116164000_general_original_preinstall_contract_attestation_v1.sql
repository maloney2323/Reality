-- Reality: govern the final PRE-INSTALL contract gate using existing independently
-- recorded provider receipts. This does not execute source, authorize an install,
-- change production, settle an original, or create another shift.
-- Only the preexisting server-role actor may attest; a model/browser cannot call it.
CREATE TABLE IF NOT EXISTS reality_internal.governed_original_preinstall_contract_attestations_v1 (
 original_work_id text PRIMARY KEY REFERENCES reality_internal.governed_original_install_reviews_v1(original_work_id),
 attempt_id uuid NOT NULL,
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 frozen_run_id bigint NOT NULL CHECK(frozen_run_id>10000),
 integrated_run_id bigint NOT NULL CHECK(integrated_run_id>10000),
 integrated_pr_number bigint NOT NULL CHECK(integrated_pr_number>0),
 postinstall_contract_run_id bigint NOT NULL CHECK(postinstall_contract_run_id>10000),
 postinstall_contract_pr_number bigint NOT NULL CHECK(postinstall_contract_pr_number>0),
 provider_vercel_app_check_run_id bigint NOT NULL CHECK(provider_vercel_app_check_run_id>0),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^sha256:[a-f0-9]{64}$'),
 verified_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 owner_approval_recorded boolean NOT NULL DEFAULT false CHECK(owner_approval_recorded=false),
 source_installed boolean NOT NULL DEFAULT false CHECK(source_installed=false),
 original_job_completed boolean NOT NULL DEFAULT false CHECK(original_job_completed=false),
 production_changed boolean NOT NULL DEFAULT false CHECK(production_changed=false)
);
ALTER TABLE reality_internal.governed_original_preinstall_contract_attestations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_original_preinstall_contract_attestations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON reality_internal.governed_original_preinstall_contract_attestations_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_attest_general_original_preinstall_contract_v1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
 g jsonb;
 r reality_internal.governed_original_install_reviews_v1%rowtype;
 j reality_internal.riley_unattended_repair_originals_v1%rowtype;
 a reality_internal.riley_same_original_recovery_attempts_v2%rowtype;
 f reality_internal.riley_same_original_frozen_ci_attestations_v1%rowtype;
 w reality_internal.governed_original_source_write_probes_v1%rowtype;
 d reality_internal.governed_original_preview_deploy_receipts_v1%rowtype;
 p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
 receipt reality_internal.governed_original_preinstall_contract_attestations_v1%rowtype;
 n integer;
 hash_value text;
 BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_SERVICE_ROLE_REQUIRED';
 END IF;
 g:=public.reality_read_current_shift_execution_graph_v1();
 IF g->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR g->>'installation_authorized'<>'false'
  OR g->>'production_changed'<>'false'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','GENERAL_PREINSTALL_CONTRACT_CURRENT_OWNER_SHIFT_UNVERIFIED',
  'owner_approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 END IF;
 SELECT count(*) INTO n FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
  AND phase IN ('REVIEW_STAGED_NOT_INSTALL_READY','READY_FOR_EXACT_OWNER_APPROVAL');
 IF n=0 THEN RETURN pg_catalog.jsonb_build_object(
  'status','GENERAL_PREINSTALL_CONTRACT_NO_UNAPPROVED_REVIEW',
  'owner_approval_ready',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 END IF;
 IF n<>1 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_AMBIGUOUS_ORIGINAL'; END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE owner_id=(g->>'owner_id')::uuid AND shift_id=(g->>'shift_id')::uuid
 AND phase IN ('REVIEW_STAGED_NOT_INSTALL_READY','READY_FOR_EXACT_OWNER_APPROVAL')
 FOR UPDATE;
 IF r.isolated_github_write_verified IS DISTINCT FROM true OR
    r.preview_auto_deploy_verified IS DISTINCT FROM true OR
    r.approval_receipt_id IS NOT NULL OR r.approved_at IS NOT NULL OR
    r.installation_fenced_at IS NOT NULL OR
    r.installed_commit_sha IS NOT NULL OR r.original_final_receipt_id IS NOT NULL OR
    r.integrated_test_run_id<=10000 OR r.independent_frozen_run_id<=10000 OR
    r.integrated_test_pr<=0 OR r.independent_frozen_attestation_pr<=0 OR
    r.expected_preinstall_blob_sha=r.expected_installed_blob_sha OR
    r.candidate_commit_sha!~'^[a-f0-9]{40}$' OR
    r.expected_installed_blob_sha!~'^[a-f0-9]{40}$' OR
    r.exact_install_target_branch!~'^reality/[A-Za-z0-9/_-]{10,135}$'
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_SOURCE_OR_RELEASE_GATE_UNVERIFIED';
 END IF;
 IF NOT EXISTS(SELECT 1
  FROM reality_internal.governed_employee_shifts_v1 s
  JOIN reality_internal.governed_employee_completion_warrants_v1 warrant
   ON warrant.shift_id=s.shift_id AND warrant.owner_id=s.owner_id
   AND warrant.plan_fingerprint=s.plan_fingerprint
  WHERE s.shift_id=r.shift_id AND s.owner_id=r.owner_id
   AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
   AND s.planned_end_at='infinity'::timestamptz
   AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND warrant.state='ACTIVE')
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_OWNER_WARRANT_UNVERIFIED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'jobs') x
  WHERE x->>'original_work_id'=r.original_work_id
   AND x->>'source_ref'=r.source_ref
   AND x->>'source_proof_sha256'=r.source_proof_sha256
   AND x->>'phase'='SOURCE_ADMITTED'
   AND x->>'independent_source_proof_verified'='true'
   AND x->>'original_kind'='REAL_ENGINEERING_REPAIR_ORIGINAL')
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_EXACT_ORIGINAL_GRAPH_UNVERIFIED';
 END IF;
 SELECT * INTO j FROM reality_internal.riley_unattended_repair_originals_v1
 WHERE original_work_id=r.original_work_id AND shift_id=r.shift_id
  AND owner_id=r.owner_id AND issue_url=r.source_ref
  AND shift_source_proof_sha256=r.source_proof_sha256;
 IF NOT FOUND OR j.phase<>'SOURCE_ADMITTED' OR j.installed IS DISTINCT FROM false
  OR j.production_changed IS DISTINCT FROM false
  OR j.exact_approval_receipt_ref IS NOT NULL OR j.original_settlement_receipt_ref IS NOT NULL
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_ORIGINAL_ALREADY_CHANGED';
 END IF;
 SELECT * INTO a FROM reality_internal.riley_same_original_recovery_attempts_v2
 WHERE attempt_id=r.attempt_id AND original_work_id=r.original_work_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR a.phase<>'CI_PASSED' OR a.ci_conclusion<>'success'
  OR a.ci_run_id<>r.independent_frozen_run_id
  OR a.ci_commit_sha<>r.candidate_commit_sha
  OR a.candidate_staged_commit_sha<>r.candidate_commit_sha
  OR a.proposed_source_sha256<>r.candidate_artifact_sha256
  OR a.source_path<>r.source_file_path
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_FROZEN_MODEL_PROOF_UNVERIFIED';
 END IF;
 SELECT * INTO f FROM reality_internal.riley_same_original_frozen_ci_attestations_v1
 WHERE attempt_id=r.attempt_id AND original_work_id=r.original_work_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR f.independent_run_conclusion<>'success'
  OR f.independent_run_id<>r.independent_frozen_run_id
  OR f.verification_pr_number<>r.independent_frozen_attestation_pr
  OR f.candidate_commit_sha<>r.candidate_commit_sha
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_FROZEN_ATTESTATION_UNVERIFIED';
 END IF;
 SELECT * INTO w FROM reality_internal.governed_original_source_write_probes_v1
 WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
  AND owner_id=r.owner_id AND shift_id=r.shift_id;
 IF NOT FOUND OR w.result_status<>'GITHUB_WRITE_AND_ORIGINAL_SOURCE_READBACK_VERIFIED'
  OR w.github_http_status<>201 OR w.receipt_at IS NULL
  OR w.provider_commit_sha!~'^[a-f0-9]{40}$'
  OR w.exact_source_blob_sha<>r.expected_preinstall_blob_sha
  OR w.original_source_path<>r.source_file_path
  OR w.target_branch<>r.exact_install_target_branch
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_GITHUB_WRITE_PROOF_UNVERIFIED';
 END IF;
 SELECT * INTO d FROM reality_internal.governed_original_preview_deploy_receipts_v1
 WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
  AND shift_id=r.shift_id AND owner_id=r.owner_id;
 IF NOT FOUND OR d.github_commit_sha<>w.provider_commit_sha OR
  d.github_vercel_status_creator<>'vercel-app:vercel' OR
  d.evidence_kind<>'GITHUB_VERIFIED_VERCEL_APP_AND_STATUS_SUCCESS_EXACT_CANARY_SHA' OR
  d.official_vercel_app_check_run_id<=0 OR d.official_vercel_app_id<=0 OR
  d.github_vercel_status_id<=0 OR d.vercel_deployment_url IS NULL
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_PROVIDER_DEPLOY_PROOF_UNVERIFIED';
 END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1
 WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
  AND shift_id=r.shift_id AND owner_id=r.owner_id;
 IF NOT FOUND OR p.phase<>'CI_PUSH_INDEPENDENTLY_VERIFIED'
  OR p.accepted_event<>'pull_request' OR p.production_changed IS DISTINCT FROM false
  OR p.push_ci_run_id<=10000 OR p.acceptance_pr_number<=0
  OR p.github_commit_sha!~'^[a-f0-9]{40}$'
  OR p.fence_at IS NULL OR p.provider_receipt_at IS NULL OR p.ci_receipt_at IS NULL
  OR p.original_source_path<>r.source_file_path OR
  p.preflight_branch=r.exact_install_target_branch
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_INDEPENDENT_ACCEPTANCE_UNVERIFIED';
 END IF;
 -- This proves only a PRE-INSTALL verification contract, not a running,
 -- installed, functional or settled customer job. The exact owner must still
 -- authorize the independently evidenced source artifact separately.
 hash_value:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(pg_catalog.jsonb_build_object(
   'original',r.original_work_id,'attempt',r.attempt_id,
   'source_proof',r.source_proof_sha256,
   'frozen_source',r.candidate_commit_sha,'frozen_run',r.independent_frozen_run_id,
   'integration_source',r.integrated_test_commit_sha,
   'integration_run',r.integrated_test_run_id,'integration_pr',r.integrated_test_pr,
   'preinstall_blob',r.expected_preinstall_blob_sha,
   'postinstall_contract_ci_sha',p.github_commit_sha,
   'postinstall_contract_ci_run',p.push_ci_run_id,
   'postinstall_contract_pr',p.acceptance_pr_number,
   'source_write_sha',w.provider_commit_sha,
   'vercel_app_check',d.official_vercel_app_check_run_id
  )::text,'UTF8')),'hex');
 INSERT INTO reality_internal.governed_original_preinstall_contract_attestations_v1(
  original_work_id,attempt_id,owner_id,shift_id,frozen_run_id,
  integrated_run_id,integrated_pr_number,postinstall_contract_run_id,
  postinstall_contract_pr_number,provider_vercel_app_check_run_id,evidence_sha256)
 VALUES(r.original_work_id,r.attempt_id,r.owner_id,r.shift_id,
  r.independent_frozen_run_id,r.integrated_test_run_id,r.integrated_test_pr,
  p.push_ci_run_id,p.acceptance_pr_number,
  d.official_vercel_app_check_run_id,hash_value)
 ON CONFLICT(original_work_id) DO NOTHING;
 SELECT * INTO receipt FROM reality_internal.governed_original_preinstall_contract_attestations_v1
 WHERE original_work_id=r.original_work_id;
 IF NOT FOUND OR receipt.attempt_id<>r.attempt_id OR
  receipt.owner_id<>r.owner_id OR receipt.shift_id<>r.shift_id OR
  receipt.frozen_run_id<>r.independent_frozen_run_id OR
  receipt.integrated_run_id<>r.integrated_test_run_id OR
  receipt.integrated_pr_number<>r.integrated_test_pr OR
  receipt.postinstall_contract_run_id<>p.push_ci_run_id OR
  receipt.postinstall_contract_pr_number<>p.acceptance_pr_number OR
  receipt.provider_vercel_app_check_run_id<>d.official_vercel_app_check_run_id OR
  receipt.evidence_sha256<>hash_value
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_DUPLICATE_PROOF_MISMATCH';
 END IF;
 IF r.phase='REVIEW_STAGED_NOT_INSTALL_READY' THEN
  UPDATE reality_internal.governed_original_install_reviews_v1 SET
   phase='READY_FOR_EXACT_OWNER_APPROVAL',
   same_original_execution_and_settlement_contract_verified=true,
   updated_at=clock_timestamp()
  WHERE original_work_id=r.original_work_id AND attempt_id=r.attempt_id
   AND owner_id=r.owner_id AND shift_id=r.shift_id
   AND phase='REVIEW_STAGED_NOT_INSTALL_READY'
   AND isolated_github_write_verified=true AND preview_auto_deploy_verified=true
   AND approval_receipt_id IS NULL AND installed_commit_sha IS NULL
   AND original_final_receipt_id IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_ATOMIC_REVIEW_RACE'; END IF;
 ELSIF r.phase='READY_FOR_EXACT_OWNER_APPROVAL' AND
       r.same_original_execution_and_settlement_contract_verified IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'GENERAL_PREINSTALL_CONTRACT_READY_PHASE_DRIFT';
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','GENERAL_ORIGINAL_PREINSTALL_CONTRACT_INDEPENDENTLY_ATTESTED',
  'original_work_id',r.original_work_id,'attempt_id',r.attempt_id,
  'shift_id',r.shift_id,'evidence_sha256',hash_value,
  'owner_approval_ready',true,'owner_approval_recorded',false,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_attest_general_original_preinstall_contract_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_attest_general_original_preinstall_contract_v1()
 TO service_role;
