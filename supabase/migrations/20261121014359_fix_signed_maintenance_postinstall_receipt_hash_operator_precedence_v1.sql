-- Preserve existing service-only and installed-source fences; repair only
-- SQL operator precedence in independent post-installation receipt digest.
-- The migration changes function source, NOT a decision, shift or receipt row.
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_independent_postinstall_v1(p_maintenance_id uuid, p_installed_commit_sha text, p_verified_source_blob_sha text, p_github_acceptance_run_id bigint, p_vercel_check_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  (s->>'shift_id')||'|'||(s->>'approval_receipt_sha256')||'|'||
  (s->>'target_review_receipt_sha256')||'|'||(s->>'case_ci_receipt_sha256')||'|'||
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
END $function$;
