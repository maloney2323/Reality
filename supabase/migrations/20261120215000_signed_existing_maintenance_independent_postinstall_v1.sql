-- Signed internal maintenance: independent installed-source, CI and Vercel
-- acceptance. Only internal capability repair can close; original business
-- job remains separately governed. The SAME signed shift continues.
ALTER TABLE reality_internal.owner_signed_maintenance_install_decisions_v1
 ADD COLUMN IF NOT EXISTS independent_ci_run_id bigint,
 ADD COLUMN IF NOT EXISTS independent_vercel_check_id bigint;
CREATE OR REPLACE FUNCTION public.reality_read_signed_maintenance_postinstall_scope_v1()
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v record;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'MAINTENANCE_POSTINSTALL_SERVICE_REQUIRED'; END IF;
 SELECT d.*,a.source_ref,a.source_case_ci_receipt_sha256
 INTO v FROM reality_internal.owner_signed_maintenance_install_decisions_v1 d
 JOIN reality_internal.owner_maintenance_verified_artifact_handoffs_v1 a
  ON a.maintenance_id=d.maintenance_id AND a.owner_id=d.owner_id
  AND a.shift_id=d.shift_id AND a.review_receipt_sha256=d.artifact_receipt_sha256
  AND a.target_review_receipt_sha256=d.target_review_receipt_sha256
 JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
  ON m.incident_id=d.maintenance_id AND m.owner_id=d.owner_id
  AND m.claimed_shift_id=d.shift_id AND m.source_ref=a.source_ref
  AND m.exact_install_approval_receipt_sha256=d.approval_receipt_sha256
  AND m.independent_frozen_test_receipt_sha256=a.source_case_ci_receipt_sha256
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=d.shift_id AND s.owner_id=d.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE d.state='INSTALLED' AND d.installed_commit_sha~'^[a-f0-9]{40}$'
  AND m.phase='AUTHORIZED_REPAIR_IN_PROGRESS'
  AND m.repaired_capability_receipt_sha256 IS NULL
  AND m.original_job_completed=false AND m.production_changed=false
  AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS' AND w.state='ACTIVE'
  AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(
   CASE WHEN pg_catalog.jsonb_typeof(w.source_scope)='array'
   THEN w.source_scope ELSE '[]'::jsonb END) sc
   WHERE sc->>'maintenance_id'=m.incident_id::text
    AND sc->>'source_ref'=m.source_ref
    AND sc->>'origin_shift_id'=m.origin_shift_id::text
    AND sc->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
 ORDER BY d.installed_at LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_OWNER_APPROVED_MAINTENANCE_POSTINSTALL_ACCEPTANCE_DUE',
  'original_job_completed',false,'production_changed',false); END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_DUE',
  'maintenance_id',v.maintenance_id,'owner_id',v.owner_id,
  'shift_id',v.shift_id,'source_ref',v.source_ref,
  'source_path',v.target_path,'target_branch',v.target_branch,
  'expected_parent_sha',v.expected_parent_sha,
  'installed_commit_sha',v.installed_commit_sha,
  'candidate_source_blob_sha',v.candidate_source_blob_sha,
  'case_ci_receipt_sha256',v.source_case_ci_receipt_sha256,
  'approval_receipt_sha256',v.approval_receipt_sha256,
  'target_review_receipt_sha256',v.target_review_receipt_sha256,
  'original_job_completed',false,'production_changed',false
 );
END $fn$;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_independent_postinstall_v1(
 p_maintenance_id uuid,p_installed_commit_sha text,
 p_verified_source_blob_sha text,p_github_acceptance_run_id bigint,
 p_vercel_check_id bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE s jsonb; result_hash text; m record;
BEGIN
 IF current_user<>'service_role' OR p_maintenance_id IS NULL
  OR p_installed_commit_sha!~'^[a-f0-9]{40}$'
  OR p_verified_source_blob_sha!~'^[a-f0-9]{40}$'
  OR p_github_acceptance_run_id<10000 OR p_vercel_check_id<10000
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_POSTINSTALL_PROVIDER_PROOF_REQUIRED'; END IF;
 s:=public.reality_read_signed_maintenance_postinstall_scope_v1();
 IF s->>'status'<>'EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_DUE'
  OR s->>'maintenance_id'<>p_maintenance_id::text
  OR s->>'installed_commit_sha'<>p_installed_commit_sha
  OR s->>'candidate_source_blob_sha'<>p_verified_source_blob_sha
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_POSTINSTALL_SCOPE_UNVERIFIED',
  'repair_verified',false,'original_job_completed',false,'production_changed',false); END IF;
 SELECT * INTO m FROM reality_internal.owner_internal_maintenance_jobs_v1
 WHERE incident_id=p_maintenance_id AND claimed_shift_id=(s->>'shift_id')::uuid
  AND repaired_capability_receipt_sha256 IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_POSTINSTALL_CLAIM_REPLAY_REJECTED'; END IF;
 result_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'independent-signed-maintenance-postinstall-v1|'||p_maintenance_id::text||'|'||
  s->>'shift_id'||'|'||s->>'approval_receipt_sha256'||'|'||
  s->>'target_review_receipt_sha256'||'|'||s->>'case_ci_receipt_sha256'||'|'||
  p_installed_commit_sha||'|'||p_verified_source_blob_sha||'|'||
  p_github_acceptance_run_id::text||'|'||p_vercel_check_id::text,'UTF8')),'hex');
 UPDATE reality_internal.owner_signed_maintenance_install_decisions_v1
 SET state='VERIFIED',independent_postinstall_receipt_sha256=result_hash,
  independent_ci_run_id=p_github_acceptance_run_id,
  independent_vercel_check_id=p_vercel_check_id,
  independently_verified_at=clock_timestamp()
 WHERE maintenance_id=p_maintenance_id AND state='INSTALLED'
  AND installed_commit_sha=p_installed_commit_sha;
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_POSTINSTALL_FENCE_CONFLICT'; END IF;
 UPDATE reality_internal.owner_internal_maintenance_jobs_v1
 SET phase='INTERNAL_REPAIR_VERIFIED_CLOSED',
  repaired_capability_receipt_sha256=result_hash
 WHERE incident_id=p_maintenance_id AND owner_id=(s->>'owner_id')::uuid
  AND claimed_shift_id=(s->>'shift_id')::uuid
  AND phase='AUTHORIZED_REPAIR_IN_PROGRESS'
  AND repaired_capability_receipt_sha256 IS NULL
  AND exact_install_approval_receipt_sha256=s->>'approval_receipt_sha256'
  AND independent_frozen_test_receipt_sha256=s->>'case_ci_receipt_sha256';
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_POSTINSTALL_ORIGINAL_LINEAGE_CONFLICT'; END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SAME_SIGNED_SHIFT_INTERNAL_MAINTENANCE_INDEPENDENTLY_VERIFIED',
  'maintenance_id',p_maintenance_id,'shift_id',s->>'shift_id',
  'owner_id',s->>'owner_id','source_ref',s->>'source_ref',
  'installed_commit_sha',p_installed_commit_sha,
  'github_acceptance_run_id',p_github_acceptance_run_id,
  'vercel_check_id',p_vercel_check_id,
  'independent_postinstall_receipt_sha256',result_hash,
  'repair_verified',true,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false,
  'next_action','CONTINUE_OTHER_ORIGINAL_SIGNED_WORK_AND_VERIFY_FINAL_SETTLEMENT');
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_signed_maintenance_postinstall_scope_v1()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_independent_postinstall_v1(uuid,text,text,bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_signed_maintenance_postinstall_scope_v1() TO service_role;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_independent_postinstall_v1(uuid,text,text,bigint,bigint)
 TO service_role;
