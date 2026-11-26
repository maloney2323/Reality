-- Existing canonical child record, not a new recovery ledger or authority.
-- Observations are immutable per existing fenced PREPARE/VERIFY invocation.
ALTER TABLE reality_internal.final_loop_child_review_work_v1
 ADD COLUMN IF NOT EXISTS advisory_rejection_receipts jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.reality_record_final_loop_child_rejection_v1(
 p_child_work_id text,p_worker_run_id uuid,p_mode text,p_evidence jsonb,p_canonical_handoff jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE c reality_internal.final_loop_child_review_work_v1%rowtype;
 a jsonb; receipt jsonb; fingerprint text; invocation uuid; n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_CHILD_REJECTION_SERVICE_ONLY'; END IF;
 IF p_mode IS NULL OR p_mode NOT IN ('PREPARE','VERIFY')
 OR pg_catalog.jsonb_typeof(p_evidence) IS DISTINCT FROM 'object'
 OR pg_catalog.length(p_evidence::text)>3500
 OR p_evidence->>'schema' IS DISTINCT FROM 'reality-final-loop-advisory-rejection-evidence-v1'
 OR p_evidence->>'child_work_id' IS DISTINCT FROM p_child_work_id
 OR p_evidence->>'worker_run_id' IS DISTINCT FROM p_worker_run_id::text
 OR p_evidence->>'mode' IS DISTINCT FROM p_mode
 OR p_evidence->>'accepted_artifact' IS DISTINCT FROM 'false'
 OR p_evidence->>'independent_verification_committed' IS DISTINCT FROM 'false'
 OR p_evidence->>'provider_effect_replay_authorized' IS DISTINCT FROM 'false'
 OR coalesce(p_evidence->>'reason','') NOT IN (
 'ORIGINAL_OR_CHILD_IDENTITY_MISMATCH','PROVIDER_RESPONSE_ID_INVALID',
 'PROVIDER_EVIDENCE_DIGEST_INVALID','ADVISORY_AUTHORITY_FLAGS_INVALID',
 'VERIFIER_REUSED_GENERATION_RESPONSE','ADVISORY_CONTENT_NOT_TEXT',
 'ADVISORY_CONTENT_OVER_CHARACTER_BUDGET','ADVISORY_CONTENT_TOO_SHORT',
 'REQUIRED_SOURCE_PATH_MISSING','REQUIRED_TEST_RECOMMENDATION_MISSING',
 'VERIFIER_VERDICT_NOT_JSON','VERIFIER_VERDICT_OR_SOURCE_COVERAGE_NOT_PASSED',
 'STRUCTURED_FILE_REVIEW_INVALID_OR_INCOMPLETE')
 OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_object_keys(p_evidence) k WHERE k NOT IN
 ('schema','child_work_id','parent_original_work_id','worker_run_id','mode','scope_sha256',
  'source_head_sha','source_manifest_sha256','reason','candidate_chars','candidate_sha256',
  'response_id_sha256','provider_evidence_sha256','accepted_artifact',
  'independent_verification_committed','provider_effect_replay_authorized'))
 OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_each_text(p_evidence) e WHERE e.key IN
 ('candidate_sha256','response_id_sha256','provider_evidence_sha256') AND e.value IS NOT NULL
 AND e.value !~ '^sha256:[a-f0-9]{64}$')
 OR (p_evidence->>'candidate_chars' IS NOT NULL AND p_evidence->>'candidate_chars' !~ '^[0-9]{1,7}$')
 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_EVIDENCE_INVALID'); END IF;
 a:=reality_internal.check_final_loop_canonical_child_scope_v1(
 (p_canonical_handoff->>'shift_id')::uuid,p_worker_run_id,p_canonical_handoff);
 IF a->>'status' IS DISTINCT FROM 'FINAL_LOOP_CANONICAL_CHILD_SCOPE_CURRENT'
 OR NOT reality_internal.final_loop_canonical_child_matches_v1(p_child_work_id,p_canonical_handoff)
 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_SCOPE_UNVERIFIED'); END IF;
 SELECT * INTO c FROM reality_internal.final_loop_child_review_work_v1 x WHERE x.child_work_id=p_child_work_id FOR UPDATE;
 IF NOT FOUND OR p_evidence->>'parent_original_work_id' IS DISTINCT FROM c.parent_original_work_id
 OR p_evidence->>'scope_sha256' IS DISTINCT FROM c.scope_sha256
 OR p_evidence->>'source_head_sha' IS DISTINCT FROM c.source_head_sha
 OR p_evidence->>'source_manifest_sha256' IS DISTINCT FROM c.source_manifest_sha256
 OR (p_mode='PREPARE' AND (c.phase<>'CLAIMED' OR c.claimant_worker_run_id IS DISTINCT FROM p_worker_run_id OR c.model_response_id IS NOT NULL))
 OR (p_mode='VERIFY' AND (c.phase<>'PREPARED' OR c.canonical_verify_invocation_run_id IS DISTINCT FROM p_worker_run_id OR c.independent_review_receipt_sha256 IS NOT NULL))
 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_CLAIM_UNVERIFIED'); END IF;
 invocation:=CASE WHEN p_mode='PREPARE' THEN c.canonical_prepare_invocation_id ELSE c.canonical_verify_invocation_id END;
 IF invocation IS NULL THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_INVOCATION_UNVERIFIED'); END IF;
 receipt:=p_evidence||pg_catalog.jsonb_build_object(
 'invocation_id',invocation,'owner_id',c.owner_id,'shift_id',c.shift_id,'plan_id',c.plan_id,'packet_id',c.packet_id,
 'continuity_root_id',p_canonical_handoff->'continuity_root_id',
 'continuity_head_sha256',p_canonical_handoff->'continuity_head_sha256',
 'continuity_revision',p_canonical_handoff->'revision',
 'owner_approval_receipt_sha256',p_canonical_handoff->'owner_approval_receipt_sha256',
 'observation_only',true,'independent_recovery_verified',false,'original_job_completed',false,'production_changed',false);
 fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(receipt::text,'UTF8')),'hex');
 receipt:=receipt||pg_catalog.jsonb_build_object('observation_receipt_sha256',fingerprint);
 IF c.advisory_rejection_receipts ? p_mode THEN
  IF c.advisory_rejection_receipts->p_mode IS DISTINCT FROM receipt THEN
   RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_RECEIPT_CONFLICT_NO_REPLAY');
  END IF;
 ELSE
  UPDATE reality_internal.final_loop_child_review_work_v1 SET advisory_rejection_receipts=advisory_rejection_receipts||pg_catalog.jsonb_build_object(p_mode,receipt)
  WHERE child_work_id=p_child_work_id AND NOT (advisory_rejection_receipts ? p_mode);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_WRITE_UNVERIFIED'); END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_CHILD_REJECTION_OBSERVATION_RECORDED',
 'child_work_id',p_child_work_id,'observation_receipt_sha256',fingerprint,'invocation_id',invocation,
 'provider_effect_replay_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_final_loop_child_rejection_v1(text,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_final_loop_child_rejection_v1(text,uuid,text,jsonb,jsonb) TO service_role;

-- Existing independently read child recovery projection; all original proof
-- gates remain unchanged. Observation is NOT independent repair evidence.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_recovery_v1(
 p_shift_id uuid,p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE v_plan record;v_packet record;v_children jsonb;v_count integer;
 v_capacity boolean:=false;v_run_count integer:=0;
 v_capacity_receipt text;
 v_integration_count integer:=0;v_integration_verified integer:=0;
 v_integration_receipt text;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_RECOVERY_SERVICE_ONLY'; END IF;
 SELECT p.* INTO v_plan FROM reality_internal.final_loop_pr_source_plans_v1 p
 WHERE p.shift_id=p_shift_id AND p.plan_id=p_plan_id
  AND p.parent_original_work_id IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_SOURCE_PLAN_NOT_ADMITTED',
  'independent_service_readback_verified',false);END IF;
 SELECT a.* INTO v_packet FROM
  reality_internal.final_loop_child_approval_packets_v1 a
 WHERE a.plan_id=p_plan_id AND a.shift_id=p_shift_id
  AND a.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND a.owner_approval_receipt_sha256 IS NOT NULL;
 IF NOT FOUND OR v_packet.acceptance_contract_sha256 IS DISTINCT FROM
  reality_internal.final_loop_pr_review_acceptance_digest_v1(v_plan.plan_id)
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_PARENT_CHILD_ACCEPTANCE_NOT_VERIFIED',
  'independent_service_readback_verified',false); END IF;
 SELECT pg_catalog.count(*),coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'index',c.scope_index,'scope_sha256',c.scope_sha256,
   'parent_original_work_id',c.parent_original_work_id,
   'source_manifest_sha256',c.source_manifest_sha256,
   'acceptance_contract_sha256',c.acceptance_contract_sha256,
   'phase',CASE
    WHEN c.phase='INDEPENDENTLY_VERIFIED' THEN 'VERIFIED'
    WHEN c.phase='EFFECT_UNCERTAIN' THEN 'EFFECT_UNCERTAIN'
    ELSE 'ADMITTED' END,
   'child_original_work_id',c.child_work_id,
   'independently_verified',c.phase='INDEPENDENTLY_VERIFIED',
   'verifier_independent',c.phase='INDEPENDENTLY_VERIFIED'
    AND c.independent_verifier_run_id<>c.claimant_worker_run_id,
   'independent_receipt_sha256',c.independent_review_receipt_sha256,
   'advisory_rejection_receipts',c.advisory_rejection_receipts,
   'canonical_continuity_binding',CASE WHEN c.phase='INDEPENDENTLY_VERIFIED'
    AND c.verifier_evidence ? 'canonical_continuity_root_id'
    THEN pg_catalog.jsonb_build_object(
     'continuity_root_id',c.verifier_evidence->'canonical_continuity_root_id',
     'continuity_head_sha256',c.verifier_evidence->'canonical_continuity_head_sha256',
     'revision',c.verifier_evidence->'canonical_continuity_revision',
     'owner_approval_receipt_sha256',c.verifier_evidence->'canonical_owner_approval_receipt_sha256')
    ELSE NULL END
  ) ORDER BY c.scope_index),'[]'::jsonb)
 INTO v_count,v_children FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id AND c.packet_id=v_packet.packet_id
  AND c.owner_id=v_plan.owner_id AND c.shift_id=v_plan.shift_id
  AND c.parent_original_work_id=v_plan.parent_original_work_id
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256;
 IF v_count<>v_plan.proposed_scope_count THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILDREN_NOT_ATOMICALLY_ADMITTED',
   'independent_service_readback_verified',false);END IF;
 -- Capacity is witnessed by actual separate signed worker records,
 -- not inferred from an owner approval receipt or proposed scope count.
 SELECT count(*) INTO v_run_count FROM
  reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id AND c.claimant_worker_run_id IS NOT NULL;
 v_capacity:=v_run_count=v_plan.proposed_scope_count AND NOT EXISTS(
  SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
  WHERE c.plan_id=v_plan.plan_id AND
   (NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
     WHERE r.run_id=c.claimant_worker_run_id AND r.started_at IS NOT NULL)
    OR (c.phase='INDEPENDENTLY_VERIFIED' AND
      (c.independent_verifier_run_id=c.claimant_worker_run_id OR
       NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 vr
        WHERE vr.run_id=c.independent_verifier_run_id
         AND vr.started_at IS NOT NULL)))));
 SELECT CASE WHEN v_capacity THEN
  'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'scope_index',c.scope_index,'run_id',c.claimant_worker_run_id,
    'verifier_run_id',c.independent_verifier_run_id,
    'phase',c.phase) ORDER BY c.scope_index)::text,'UTF8')),'hex')
  ELSE null END INTO v_capacity_receipt
 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.plan_id=v_plan.plan_id;
 -- Full nonoverlapping integration batches are proof obligations of this
 -- same parent. Their receipts are not final customer outcome receipts.
 SELECT pg_catalog.count(*),
  pg_catalog.count(*) FILTER (WHERE
   i.phase='VERIFIED'
   AND i.cross_scope_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   AND i.evidence->>'independent_provider_readback'='true'
   AND i.evidence->>'all_child_receipts_verified'='true'
   AND i.first_scope_index=i.batch_index*6
   AND i.last_scope_index=least(
    v_plan.proposed_scope_count-1,i.batch_index*6+5)
   AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
    WHERE r.run_id=i.verifier_worker_run_id AND r.started_at IS NOT NULL)
   AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
    WHERE c.plan_id=v_plan.plan_id
     AND c.scope_index BETWEEN i.first_scope_index AND i.last_scope_index
     AND (c.claimant_worker_run_id=i.verifier_worker_run_id
      OR c.independent_verifier_run_id=i.verifier_worker_run_id))
  )
 INTO v_integration_count,v_integration_verified
 FROM reality_internal.final_loop_parent_integration_batches_v1 i
 WHERE i.plan_id=v_plan.plan_id AND i.packet_id=v_packet.packet_id
  AND i.owner_id=v_plan.owner_id AND i.shift_id=v_plan.shift_id
  AND i.parent_original_work_id=v_plan.parent_original_work_id
  AND i.source_manifest_sha256=v_plan.source_manifest_sha256
  AND i.source_head_sha=v_plan.source_head_sha
  AND i.acceptance_contract_sha256=v_packet.acceptance_contract_sha256;
 IF v_capacity AND v_integration_count=(v_plan.proposed_scope_count+5)/6
  AND v_integration_verified=v_integration_count
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=v_plan.plan_id
    AND c.phase<>'INDEPENDENTLY_VERIFIED') THEN
  SELECT 'sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'batch_index',i.batch_index,
    'receipt_sha256',i.cross_scope_receipt_sha256,
    'verified_child_receipts_sha256',i.verified_child_receipts_sha256
   ) ORDER BY i.batch_index)::text,'UTF8')),'hex')
  INTO v_integration_receipt
  FROM reality_internal.final_loop_parent_integration_batches_v1 i
  WHERE i.plan_id=v_plan.plan_id AND i.packet_id=v_packet.packet_id;
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-independent-child-readback-v1',
  'status','FINAL_LOOP_CANONICAL_CHILD_RECOVERY_PROOF_NOT_PARENT_SETTLEMENT',
  'owner_id',v_plan.owner_id,'shift_id',v_plan.shift_id,
  'parent_original_work_id',v_plan.parent_original_work_id,
  'parent_source_ref',v_plan.source_ref,
  'source_manifest_sha256',v_plan.source_manifest_sha256,
  'source_head_sha',v_plan.source_head_sha,
  'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
  'independent_service_readback_verified',true,
  'authority',pg_catalog.jsonb_build_object(
   'owner_id',v_plan.owner_id,
   'parent_original_work_id',v_plan.parent_original_work_id,
   'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
   'independently_verified',true,
   'receipt_sha256',v_packet.owner_approval_receipt_sha256,
   'permitted_effects',pg_catalog.jsonb_build_array('READ','PREPARE'),
   'requested_effects',pg_catalog.jsonb_build_array('READ')),
  'capacity',pg_catalog.jsonb_build_object(
   'independently_attested',v_capacity,
   'signed_worker_observed',v_capacity,
   'scheduled_worker_observed',v_capacity,
   'receipt_sha256',v_capacity_receipt),
  'provider_effect_uncertain',EXISTS(SELECT 1 FROM
   reality_internal.final_loop_child_review_work_v1 c
   WHERE c.plan_id=v_plan.plan_id AND c.phase='EFFECT_UNCERTAIN'),
  'children',v_children,
  'cross_scope',pg_catalog.jsonb_build_object(
   'independently_verified',v_integration_receipt IS NOT NULL,
   'receipt_sha256',v_integration_receipt,
   'verified_batch_count',v_integration_verified,
   'required_batch_count',(v_plan.proposed_scope_count+5)/6),
  'parent_obligation_remains_open',true,
  'parent_outcome_verified',false,
  'universe_reconciled',false,'parent_settlement_committed',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_child_recovery_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_child_recovery_v1(uuid,uuid) TO service_role;
