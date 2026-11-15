-- Exact actual provider event and PR metadata surfaced read-only; never a push fiction.
CREATE OR REPLACE FUNCTION public.reality_read_general_original_push_probe_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE p reality_internal.governed_original_acceptance_push_probes_v1%rowtype;
r reality_internal.governed_original_install_reviews_v1%rowtype; s record;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'PUSH_PROBE_SERVICE_ROLE_REQUIRED';END IF;
 SELECT * INTO p FROM reality_internal.governed_original_acceptance_push_probes_v1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','NO_CURRENT_AUTHORIZED_PUSH_PROBE');END IF;
 IF (SELECT count(*) FROM reality_internal.governed_original_acceptance_push_probes_v1)<>1
 THEN RAISE EXCEPTION 'PUSH_PROBE_EXACT_SCOPE_NOT_UNIQUE';END IF;
 SELECT * INTO r FROM reality_internal.governed_original_install_reviews_v1
 WHERE original_work_id=p.original_work_id;
 SELECT s0.* INTO s FROM reality_internal.governed_employee_shifts_v1 s0
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s0.shift_id AND w.owner_id=s0.owner_id AND w.plan_fingerprint=s0.plan_fingerprint
 WHERE s0.shift_id=p.shift_id AND w.state='ACTIVE' AND s0.closed_at IS NULL
 AND s0.planned_end_at='infinity'::timestamptz AND s0.authorized_at IS NOT NULL
 AND s0.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK');
 IF NOT FOUND OR r.original_work_id IS NULL OR r.original_work_id<>p.original_work_id
 OR r.owner_id<>p.owner_id OR r.shift_id<>p.shift_id
 OR r.attempt_id<>p.attempt_id OR s.owner_id<>p.owner_id
 OR r.phase<>'REVIEW_STAGED_NOT_INSTALL_READY'
 OR r.approval_receipt_id IS NOT NULL OR r.installed_commit_sha IS NOT NULL
 OR r.original_final_receipt_id IS NOT NULL
 OR r.isolated_github_write_verified IS DISTINCT FROM true
 OR r.preview_auto_deploy_verified IS DISTINCT FROM true
 OR r.source_file_path<>p.original_source_path
 OR r.exact_install_target_branch=p.preflight_branch
 OR p.original_work_id IS NULL OR p.production_changed IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'PUSH_PROBE_ORIGINAL_OR_CURRENT_OWNER_WARRANT_DRIFT';END IF;
 RETURN jsonb_build_object(
 'status',CASE p.phase
   WHEN 'STAGED' THEN 'EXACT_ISOLATED_PUSH_PROBE_STAGED'
   WHEN 'PUSH_VERIFIED_AWAITING_CI' THEN 'EXACT_ISOLATED_PUSH_CI_READBACK_PENDING'
   WHEN 'CI_PUSH_INDEPENDENTLY_VERIFIED' THEN 'EXACT_ISOLATED_PR_SYNC_INDEPENDENTLY_VERIFIED'
   ELSE 'EXACT_ISOLATED_PUSH_FENCED_OR_UNVERIFIED' END,
 'phase',p.phase,'original_work_id',p.original_work_id,'attempt_id',p.attempt_id,
 'owner_id',p.owner_id,'shift_id',p.shift_id,'preflight_branch',p.preflight_branch,'install_target_branch',r.exact_install_target_branch,
 'original_source_path',p.original_source_path,'original_source_blob_sha',p.original_source_blob_sha,
 'expected_preflight_parent_sha',p.expected_preflight_parent_sha,
 'inert_path',p.inert_path,'github_commit_sha',p.github_commit_sha,
 'inert_blob_sha',p.inert_blob_sha,'push_ci_run_id',p.push_ci_run_id,
 'accepted_event',p.accepted_event,'acceptance_pr_number',p.acceptance_pr_number,
 'installation_authorized',false,'source_installed',false,
 'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_general_original_push_probe_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_general_original_push_probe_v1() TO service_role;
