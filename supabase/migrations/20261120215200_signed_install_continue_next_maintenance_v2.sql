-- Once one exact source repair is independently VERIFIED, the existing signed worker
-- must advance to the next owner-approved repair, not repeatedly re-read the settled one.
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
 WHERE x.state IN('APPROVED','FENCED','INSTALLED')
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
REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_approved_install_scope_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_approved_install_scope_v1() TO service_role;
