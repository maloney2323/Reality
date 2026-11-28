-- Extend the existing child recovery readback. No new executor, work admission, authority, invocation or budget mutation.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_child_recovery_v1(p_shift_id uuid, p_plan_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_plan record;v_packet record;v_children jsonb;v_count integer;
 v_capacity boolean:=false;v_run_count integer:=0;
 v_capacity_receipt text;
 v_integration_count integer:=0;v_integration_verified integer:=0;
 v_integration_receipt text;
 v_guard jsonb;v_obligation jsonb;v_spine jsonb;v_candidates jsonb:='[]'::jsonb;
 v_missing int:=0;v_uncertain int:=0;v_recovery_proposal jsonb;v_proposal_sha256 text;
 v_budget jsonb;v_recovery_status text:='NO_UNFINISHED_SCOPES';
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
    WHEN c.phase='EFFECT_UNCERTAIN' OR disposition.state IN
     ('TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN','TERMINAL_VERIFY_PROVIDER_OUTCOME_UNKNOWN')
    THEN 'EFFECT_UNCERTAIN'
    ELSE 'ADMITTED' END,
   'invocation_disposition',disposition.state,
   'canonical_prepare_invocation_id',c.canonical_prepare_invocation_id,
   'canonical_verify_invocation_id',c.canonical_verify_invocation_id,
   'preparation_worker_run_id',c.claimant_worker_run_id,
   'verification_worker_run_id',c.canonical_verify_invocation_run_id,
   'prepared_artifact_available',c.model_response_id IS NOT NULL AND c.review_body IS NOT NULL
      AND c.review_sha256 IS NOT NULL,
   'provider_effect_replay_authorized',false,
   'new_attempt_authorized',false,
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
 CROSS JOIN LATERAL (SELECT CASE
   WHEN c.phase='INDEPENDENTLY_VERIFIED' THEN 'INDEPENDENTLY_VERIFIED'
   WHEN c.canonical_verify_invocation_id IS NOT NULL AND c.independent_review_receipt_sha256 IS NULL
    AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
      WHERE r.run_id=c.canonical_verify_invocation_run_id AND r.status IN ('COMPLETED','FAILED')
      AND r.finished_at IS NOT NULL)
    THEN 'TERMINAL_VERIFY_PROVIDER_OUTCOME_UNKNOWN'
   WHEN c.canonical_verify_invocation_id IS NOT NULL THEN 'VERIFY_INVOCATION_FENCED_AWAITING_EVIDENCE'
   WHEN c.phase IN ('PREPARED','SOURCE_ARTIFACT_CHECKED') AND c.model_response_id IS NOT NULL
    AND c.review_body IS NOT NULL AND c.review_sha256 IS NOT NULL THEN 'PREPARED_ARTIFACT_AVAILABLE'
   WHEN c.canonical_prepare_invocation_id IS NOT NULL AND c.model_response_id IS NULL
    AND c.review_body IS NULL AND c.review_sha256 IS NULL
    AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
      WHERE r.run_id=c.claimant_worker_run_id AND r.status IN ('COMPLETED','FAILED')
      AND r.finished_at IS NOT NULL)
    THEN 'TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN'
   WHEN c.canonical_prepare_invocation_id IS NOT NULL THEN 'PREPARE_INVOCATION_FENCED_AWAITING_EVIDENCE'
   WHEN c.phase='EFFECT_UNCERTAIN' THEN 'LEGACY_EFFECT_UNCERTAIN'
   WHEN c.phase='CLAIMED' THEN 'CLAIMED_NO_CANONICAL_INVOCATION_OBSERVED'
   ELSE 'NO_CANONICAL_INVOCATION_OBSERVED' END AS state) disposition
 WHERE c.plan_id=v_plan.plan_id AND c.packet_id=v_packet.packet_id
  AND c.owner_id=v_plan.owner_id AND c.shift_id=v_plan.shift_id
  AND c.parent_original_work_id=v_plan.parent_original_work_id
  AND c.source_manifest_sha256=v_plan.source_manifest_sha256;
 IF v_count<>v_plan.proposed_scope_count THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_CHILDREN_NOT_ATOMICALLY_ADMITTED',
   'independent_service_readback_verified',false);END IF;
 -- An interrupted invocation is an evidence disposition, not a new
 -- original or an authorization to erase the original invocation fence.
 SELECT count(*) FILTER(WHERE x->>'independently_verified'<>'true'),
        count(*) FILTER(WHERE x->>'phase'='EFFECT_UNCERTAIN')
 INTO v_missing,v_uncertain FROM pg_catalog.jsonb_array_elements(v_children) x;
 IF v_missing>0 THEN v_recovery_status:='UNFINISHED_SCOPES_EXIST'; END IF;
 IF v_uncertain>0 THEN
  v_recovery_status:='HISTORICAL_INVOCATIONS_REQUIRE_EVIDENCE_RECONCILIATION_NO_REPLAY';
  -- Use the existing independently returned invocation observations and
  -- exact current Continuity identity; missing artifacts alone prove no
  -- provider outcome. This reader cannot reset a budget or allocate work.
  v_guard:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
  SELECT x INTO v_obligation FROM pg_catalog.jsonb_array_elements(v_guard->'obligations') x
  WHERE x->>'original_work_id'=v_plan.parent_original_work_id AND x->>'source_ref'=v_plan.source_ref
    AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
    AND x->>'source_proof_verified'='true' AND x->>'independent_original_outcome_verified'='false';
  v_spine:=v_obligation->'execution_spine_readback';
  SELECT q.reconciliation_snapshot->'recovery_terminal_history' INTO v_budget
  FROM reality_internal.owner_continuity_qualification_routes_v1 q
  WHERE q.owner_id=v_plan.owner_id AND q.source_ref=v_plan.source_ref AND q.intake_family='SIGNED_SHIFT_SOURCE'
   AND q.reconciliation_snapshot->>'shift_id'=p_shift_id::text
   AND q.reconciliation_snapshot->>'original_candidate_work_id'=v_plan.parent_original_work_id
   AND q.reconciliation_receipt_sha256=v_obligation->>'qualifier_receipt_sha256'
   AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
  ORDER BY q.reconciliation_checked_at DESC LIMIT 1;
  IF v_guard->>'status'='FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
    AND v_guard->>'owner_id'=v_plan.owner_id::text AND v_guard->>'shift_id'=p_shift_id::text
    AND v_guard->>'no_new_executable_authority'='true' AND v_guard->>'execution_authorized'='false'
    AND v_guard->>'original_job_completed'='false' AND v_guard->>'production_changed'='false'
    AND v_guard->>'worldline_parent_links_verified'='true' AND v_guard->>'unverified_handoffs'='0'
    AND v_spine->>'status'='SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
    AND v_spine->>'canonical_return_committed'='true'
    AND v_spine->>'replay_authorized'='false' AND v_spine->>'provider_outcome_verified'='false'
    AND v_budget->>'remaining_attempts'='0' AND v_budget->>'new_attempt_authorized'='false'
    AND v_budget->>'replay_permitted'='false'
    AND v_packet.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
    AND v_packet.source_manifest_sha256=v_plan.source_manifest_sha256
    AND v_packet.owner_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 ev
      WHERE ev.shift_id=p_shift_id AND ev.state='SHADOW_PENDING')
  THEN
   SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'child_work_id',x->>'child_original_work_id','scope_index',x->'index',
     'scope_sha256',x->>'scope_sha256','file_count',scope->'file_count',
     'historical_invocation_id',x->>'canonical_prepare_invocation_id',
     'historical_worker_run_id',x->>'preparation_worker_run_id',
     'historical_worker_status',CASE WHEN obs->>'worker_completed'='true' THEN 'COMPLETED' ELSE 'FAILED' END,
     'historical_event_id',obs->>'event_id','historical_release_sha',obs->>'release_sha',
     'historical_provider_outcome','UNKNOWN','historical_invocation_replay_authorized',false,
     'new_work_required','PREPARE_AND_INDEPENDENTLY_VERIFY_MISSING_SCOPE',
     'new_attempt_authorized',false,'fresh_exact_source_readback_required',true)
      ORDER BY (x->>'index')::int),'[]'::jsonb) INTO v_candidates
   FROM pg_catalog.jsonb_array_elements(v_children) x
   JOIN LATERAL pg_catalog.jsonb_array_elements(v_spine->'observations') obs
    ON obs->>'child_work_id'=x->>'child_original_work_id' AND obs->>'scope_sha256'=x->>'scope_sha256'
    AND obs->>'invocation_id'=x->>'canonical_prepare_invocation_id'
    AND obs->>'worker_run_id'=x->>'preparation_worker_run_id'
    AND obs->>'model_artifact_recorded'='false' AND obs->>'provider_outcome_verified'='false'
    AND obs->>'replay_authorized'='false'
    AND (obs->>'worker_completed'='true' OR (obs->>'worker_terminal_status'='FAILED'
      AND obs->>'worker_failure_attested'='true' AND obs->>'provider_outcome_unknown'='true'))
   JOIN LATERAL pg_catalog.jsonb_array_elements(v_plan.source_plan->'bounded_scopes') scope
    ON scope->>'index'=x->>'index' AND scope->>'proposed_scope_sha256'=x->>'scope_sha256'
   WHERE x->>'invocation_disposition'='TERMINAL_PREPARE_PROVIDER_OUTCOME_UNKNOWN'
    AND x->>'canonical_verify_invocation_id' IS NULL;
   IF pg_catalog.jsonb_array_length(v_candidates)=v_missing
    AND (SELECT count(DISTINCT x->>'child_work_id') FROM pg_catalog.jsonb_array_elements(v_candidates) x)=v_missing
   THEN
    v_recovery_status:='SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION';
    v_recovery_proposal:=pg_catalog.jsonb_build_object(
     'schema','reality-final-loop-same-obligation-recovery-qualification-v1',
     'owner_id',v_plan.owner_id,'shift_id',p_shift_id,'original_work_id',v_plan.parent_original_work_id,
     'source_ref',v_plan.source_ref,'source_head_sha',v_plan.source_head_sha,
     'source_manifest_sha256',v_plan.source_manifest_sha256,'plan_id',p_plan_id,'packet_id',v_packet.packet_id,
     'acceptance_contract_sha256',v_packet.acceptance_contract_sha256,
     'prior_owner_approval_receipt_sha256',v_packet.owner_approval_receipt_sha256,
     'continuity_root_id',v_guard->'continuity_root_id','continuity_head_sha256',v_guard->'continuity_head_sha256',
     'continuity_revision',v_guard->'revision','historical_observation_sha256',v_spine->'observation_sha256',
     'historical_return_event_id',v_spine->'canonical_return_event_id',
     'terminal_recovery_history',v_budget,'unfinished_scopes',v_candidates,
     'missing_scope_count',v_missing,'preserved_verified_scope_count',v_count-v_missing,
     'proposed_max_new_prepare_calls',v_missing,'proposed_max_new_independent_verify_calls',v_missing,
     'proposed_max_new_provider_calls',2*v_missing,
     'prior_budget_preserved',true,'fresh_source_readback_required',true,
     'distinct_invocation_ids_required',true,'historical_invocation_replay_authorized',false,
     'new_attempt_authorized',false,'new_budget_authorized',false,'execution_authorized',false,
     'original_job_completed',false,'production_changed',false,
     'requires_exact_owner_authority_and_existing_executor_acceptance',true);
    v_proposal_sha256:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_recovery_proposal::text,'UTF8')),'hex');
   END IF;
  END IF;
 END IF;
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
  'provider_effect_uncertain',v_uncertain>0,
  'recovery_qualification',pg_catalog.jsonb_build_object(
   'status',v_recovery_status,'unfinished_scope_count',v_missing,'uncertain_scope_count',v_uncertain,
   'proposal',v_recovery_proposal,'proposal_sha256',v_proposal_sha256,
   'execution_authorized',false,'new_attempt_authorized',false,'replay_authorized',false),
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
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_child_recovery_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_child_recovery_v1(uuid,uuid) TO service_role;

-- Expose the existing exact recovery proposal to the authenticated owner-scoped approval readback.
CREATE OR REPLACE FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(p_owner_id uuid, p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_plans jsonb;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL
  OR p_shift_id IS NULL THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHILD_OWNER_READBACK_SERVICE_ONLY'; END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'packet_id',a.packet_id,'source_ref',a.source_ref,
   'source_manifest_sha256',a.source_manifest_sha256,
   'parent_original_work_id',a.parent_original_work_id,
   'approval_fingerprint',a.proposal_fingerprint,
   'acceptance_contract_sha256',a.acceptance_contract_sha256,
   'effect_type',a.authority_effect,
   'file_count',p.file_count,
   'proposed_scope_count',p.proposed_scope_count,
   'state',a.state,
   'approved',a.state<>'AWAITING_EXACT_OWNER_APPROVAL',
   'recovery_qualification',CASE WHEN a.state='EFFECT_RESERVED_RECONCILE_ONLY'
    AND EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
       JOIN reality_internal.signed_worker_actual_runs_v1 r
        ON r.run_id=CASE WHEN c.canonical_verify_invocation_id IS NOT NULL
             THEN c.canonical_verify_invocation_run_id ELSE c.claimant_worker_run_id END
       WHERE c.plan_id=a.plan_id AND c.packet_id=a.packet_id AND c.owner_id=a.owner_id
        AND c.shift_id=a.shift_id AND c.phase<>'INDEPENDENTLY_VERIFIED'
        AND (c.canonical_prepare_invocation_id IS NOT NULL OR c.canonical_verify_invocation_id IS NOT NULL)
        AND r.status IN ('COMPLETED','FAILED') AND r.finished_at IS NOT NULL)
    THEN public.reality_read_final_loop_child_recovery_v1(a.shift_id,a.plan_id)->'recovery_qualification'
    ELSE NULL END,
   'original_job_completed',false
  ) ORDER BY a.created_at),'[]'::jsonb) INTO v_plans
 FROM reality_internal.final_loop_child_approval_packets_v1 a
 JOIN reality_internal.final_loop_pr_source_plans_v1 p
  ON p.plan_id=a.plan_id AND p.shift_id=a.shift_id
  AND p.owner_id=a.owner_id
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=a.shift_id AND s.owner_id=a.owner_id
 WHERE a.owner_id=p_owner_id AND a.shift_id=p_shift_id
  AND s.closed_at IS NULL;
 RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
  'owner_id',p_owner_id,'shift_id',p_shift_id,
  'packets',v_plans,'read_only',true,
  'execution_authorized',false,'original_job_completed',false);
END $function$;
REVOKE ALL ON FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_final_loop_child_approvals_v1(uuid,uuid) TO service_role;
