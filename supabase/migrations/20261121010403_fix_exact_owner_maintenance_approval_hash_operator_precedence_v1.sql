-- Correct unparenthesized JSONB extraction in one-use maintenance owner approval hash.
-- SECURITY INVOKER and service-role permission boundary unchanged.
-- This migration neither approves nor installs a repair.
CREATE OR REPLACE FUNCTION public.reality_record_owner_signed_maintenance_install_decision_v1(p_owner_id uuid, p_shift_id uuid, p_maintenance_id uuid, p_request_id uuid, p_candidate_commit_sha text, p_target_review_receipt_sha256 text, p_intent text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  (card->>'target_head_sha')||'|'||(card->>'artifact_receipt_sha256'),'UTF8')),'hex');
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
END $function$;
