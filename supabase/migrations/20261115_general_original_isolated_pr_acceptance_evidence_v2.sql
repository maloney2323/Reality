-- Isolated pull-request synchronization is a real provider-triggered
-- acceptance transport. Keep it distinct from a push event and from an
-- owner-approved installed-original acceptance/settlement receipt.
ALTER TABLE reality_internal.governed_original_acceptance_push_probes_v1
 ADD COLUMN IF NOT EXISTS accepted_event text
  CHECK(accepted_event IN ('pull_request')),
 ADD COLUMN IF NOT EXISTS acceptance_pr_number bigint
  CHECK(acceptance_pr_number>0);

CREATE OR REPLACE FUNCTION public.reality_record_general_original_pr_acceptance_v2(
 p_attempt_id uuid,p_commit_sha text,p_run_id bigint,p_pr_number bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
 r reality_internal.governed_original_install_reviews_v1%rowtype;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'PR_ACCEPTANCE_SERVICE_ROLE_REQUIRED'; END IF;
 IF p_commit_sha!~'^[a-f0-9]{40}$' OR p_run_id<=10000 OR
 p_pr_number<=0 THEN RAISE EXCEPTION 'PR_ACCEPTANCE_PROVIDER_IDENTITY_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1
 WHERE attempt_id=p_attempt_id FOR UPDATE;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p.original_work_id FOR UPDATE;
 IF p.phase='CI_PUSH_INDEPENDENTLY_VERIFIED' AND
 p.github_commit_sha=p_commit_sha AND p.push_ci_run_id=p_run_id
 AND p.accepted_event='pull_request' AND p.acceptance_pr_number=p_pr_number
 THEN RETURN jsonb_build_object(
  'status','EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED',
  'original_work_id',p.original_work_id,'github_commit_sha',p_commit_sha,
  'independent_run_id',p_run_id,'accepted_event','pull_request',
  'acceptance_pr_number',p_pr_number,'owner_approval_ready',false,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);END IF;
 IF p.phase<>'PUSH_VERIFIED_AWAITING_CI'
 OR p.github_commit_sha IS DISTINCT FROM p_commit_sha
 OR p.provider_receipt_at IS NULL OR p.fence_at IS NULL
 OR p.push_ci_run_id IS NOT NULL OR p.accepted_event IS NOT NULL
 OR p.acceptance_pr_number IS NOT NULL
 OR r.original_work_id IS DISTINCT FROM p.original_work_id
 OR r.owner_id IS DISTINCT FROM p.owner_id
 OR r.shift_id IS DISTINCT FROM p.shift_id
 OR r.attempt_id IS DISTINCT FROM p.attempt_id
 OR r.phase<>'REVIEW_STAGED_NOT_INSTALL_READY'
 OR r.approval_receipt_id IS NOT NULL
 OR r.installed_commit_sha IS NOT NULL
 OR r.original_final_receipt_id IS NOT NULL
 THEN RAISE EXCEPTION 'PR_ACCEPTANCE_OWNER_ORIGINAL_FENCE_DRIFT'; END IF;
 UPDATE reality_internal.governed_original_acceptance_push_probes_v1
 SET phase='CI_PUSH_INDEPENDENTLY_VERIFIED',push_ci_run_id=p_run_id,
 accepted_event='pull_request',acceptance_pr_number=p_pr_number,
 ci_receipt_at=clock_timestamp()
 WHERE attempt_id=p_attempt_id AND phase='PUSH_VERIFIED_AWAITING_CI';
 IF NOT FOUND THEN RAISE EXCEPTION 'PR_ACCEPTANCE_ATOMIC_RACE';END IF;
 RETURN jsonb_build_object(
  'status','EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED',
  'original_work_id',p.original_work_id,'github_commit_sha',p_commit_sha,
  'independent_run_id',p_run_id,'accepted_event','pull_request',
  'acceptance_pr_number',p_pr_number,'owner_approval_ready',false,
  'installation_authorized',false,'source_installed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_general_original_pr_acceptance_v2(
 uuid,text,bigint,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_general_original_pr_acceptance_v2(
 uuid,text,bigint,bigint) TO service_role;
