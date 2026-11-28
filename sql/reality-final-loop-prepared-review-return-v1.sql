-- Preserve signed historical preclaim observation across independently verified technical return.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_invocation_return_pending_v1(
 p_shift_id uuid,p_owner_id uuid,p_original_work_id text,p_source_ref text,
 p_expected_head_sha256 text,p_expected_revision bigint,qualifier_digest text,
 qualifier jsonb,p_execution_readback jsonb,p_current_event_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $read$
DECLARE prior_preclaim_events jsonb;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'FINAL_LOOP_RETURN_PREFLIGHT_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_owner_id IS NULL OR p_original_work_id IS NULL OR p_source_ref IS NULL
  OR p_expected_head_sha256 IS NULL OR p_expected_revision IS NULL OR qualifier_digest IS NULL
  OR pg_catalog.jsonb_typeof(qualifier) IS DISTINCT FROM 'object'
  OR pg_catalog.jsonb_typeof(p_execution_readback->'observations') IS DISTINCT FROM 'array'
  OR (p_current_event_id IS NULL)<>(p_worker_run_id IS NULL)
 THEN RETURN pg_catalog.jsonb_build_object('ready',false,'prior_preclaim_events','[]'::jsonb);END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',v.event_id,'worker_run_id',r.run_id,
  'release_sha',w.running_release_sha,'release_receipt_sha256',w.release_receipt_sha256,
  'observed_worker_stage',r.worker_stage,
  'canonical_child_claim_observed',false,'provider_outcome_verified',false,
  'replay_authorized',false) ORDER BY v.event_id),'[]'::jsonb)
 INTO prior_preclaim_events
 FROM reality_internal.final_loop_resume_events_v1 v
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=v.governed_wake_worker_run_id
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
  AND w.owner_id=v.owner_id AND w.shift_id=v.shift_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
  AND a.claim_id=v.release_continuation_claim_id AND a.owner_id=v.owner_id AND a.shift_id=v.shift_id
  AND a.release_sha=w.running_release_sha AND a.state='CLAIMED_ONCE'
  AND a.provider_alias_observed_at IS NOT NULL
  AND a.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND a.runtime_scope->>'original_work_id'=v.original_work_id
  AND a.runtime_scope->>'source_ref'=v.source_ref
  AND ((a.runtime_scope->>'continuity_head_sha256'=v.continuity_head_sha256
    AND a.runtime_scope->>'continuity_revision'=v.continuity_revision::text)
   OR EXISTS(
    -- A completed signed technical return may advance the same obligation
    -- beyond the immutable release approval's initial revision.
    SELECT 1 FROM public.universe_events u
    JOIN public.universe_events par ON par.event_id=u.parent_event_id
      AND par.continuity_root_id=u.continuity_root_id AND par.worldline_id=u.worldline_id
    JOIN reality_internal.signed_worker_actual_runs_v1 t ON t.run_id::text=u.provenance->>'worker_run_id'
    JOIN reality_internal.governed_signed_worker_release_wakes_v1 tw
      ON tw.worker_run_id=t.run_id AND tw.release_claim_id=a.claim_id
      AND tw.owner_id=v.owner_id AND tw.shift_id=v.shift_id
      AND tw.running_release_sha=a.release_sha AND tw.running_release_ref=a.release_ref
      AND tw.operating_lane='NORMAL_SIGNED_SHIFT' AND tw.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
    JOIN reality_internal.final_loop_resume_events_v1 te
      ON te.governed_wake_worker_run_id=t.run_id AND te.release_continuation_claim_id=a.claim_id
      AND te.owner_id=v.owner_id AND te.shift_id=v.shift_id
      AND te.original_work_id=v.original_work_id AND te.source_ref=v.source_ref
    WHERE u.continuity_root_id::text=a.runtime_scope->>'continuity_root_id'
      AND 'sha256:'||u.lineage_hash=v.continuity_head_sha256
      AND u.entity_type='reality_final_loop_terminal_technical_observation_v1'
      AND u.epistemic_status='OBSERVED'
      AND u.payload->>'owner_id'=v.owner_id::text AND u.payload->>'shift_id'=v.shift_id::text
      AND u.payload->>'original_work_id'=v.original_work_id AND u.payload->>'source_ref'=v.source_ref
      AND u.payload->>'prior_revision'=(v.continuity_revision-1)::text
      AND u.payload->>'prior_head_sha256'='sha256:'||par.lineage_hash
      AND u.payload->>'qualifier_receipt_sha256'=v.source_receipt_sha256
      AND u.payload->>'previous_attempt_budget_preserved'='true'
      AND u.payload->'terminal_recovery_history'->>'remaining_attempts'='0'
      AND u.payload->>'technical_evidence_only'='true'
      AND u.payload->>'new_attempt_authorized'='false'
      AND u.payload->>'original_job_completed'='false'
      AND u.payload->>'execution_authorized'='false' AND u.payload->>'replay_authorized'='false'
      AND u.payload->>'production_changed'='false'
      AND u.payload->'technical_provider_proof'->>'independent_technical_ci_verified'='true'
      AND u.payload->'technical_provider_proof'->>'github_release_sha'=a.release_sha
      AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
         public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
      AND v.previous_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(u.payload::text,'UTF8')),'hex')
      AND u.evidence_refs ? v.previous_receipt_sha256
      AND t.status='COMPLETED' AND t.worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION'
      AND t.finished_at IS NOT NULL AND t.finished_at<=r.started_at
      AND te.state='SHADOW_OBSERVED' AND te.observed_at IS NOT NULL
      AND te.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
      AND te.continuity_revision=v.continuity_revision-1
      AND te.continuity_head_sha256=u.payload->>'prior_head_sha256'
      AND te.source_receipt_sha256=u.payload->>'review_receipt_sha256'
      AND te.previous_receipt_sha256=u.payload->>'investigation_receipt_sha256'
   ))
  AND a.runtime_scope->>'qualifier_receipt_sha256'=v.source_receipt_sha256
 WHERE v.shift_id=p_shift_id AND v.owner_id=p_owner_id AND v.original_work_id=p_original_work_id
  AND v.source_ref=p_source_ref AND v.state='SHADOW_PENDING'
  AND v.continuity_head_sha256=p_expected_head_sha256 AND v.continuity_revision=p_expected_revision
  AND v.signal_kind='QUALIFIER_PROOF_CHANGED'
  AND v.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND v.source_receipt_sha256=qualifier_digest AND v.governed_wake_queued_at IS NOT NULL
  AND v.governed_wake_request_id IS NOT NULL AND (p_worker_run_id IS NULL OR r.run_id<>p_worker_run_id)
  AND r.status='COMPLETED' AND r.finished_at IS NOT NULL
  AND r.worker_stage IN ('WORKER_RESPONSE_PUBLICATION','SHARED_CONTINUITY_VERIFIER_RETURN_FENCE')
  -- A historical worker could finish at its verifier return fence when
  -- response publication failed after the durable pulse. Accept only the
  -- signed observation of that run, never an assertion of provider success.
  AND v.governed_wake_nonce IS NOT NULL
  AND v.governed_wake_requested_at<=v.governed_wake_queued_at
  AND v.governed_wake_queued_at<=r.started_at AND r.started_at<=r.finished_at
  AND a.provider_alias_observed_at>=a.claimed_at AND a.provider_alias_observed_at<=r.started_at
  AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
  AND a.release_ref=w.running_release_ref
  AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND a.runtime_scope->>'child_execution_enabled'='false'
  AND a.runtime_scope->>'parent_delivery_enabled'='false'
  AND a.runtime_scope->>'production_changed'='false'
  AND w.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
    WHERE c.claimant_worker_run_id=r.run_id OR c.canonical_verify_invocation_run_id=r.run_id);
 -- An old unissued signal may be marked stale ONLY if its obligations
 -- survive explicitly in the newer verified qualifier. Never erase it,
 -- treat it as completed, or discard a dispatched/unconfirmed request.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 v
  WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING'
   AND (v.owner_id<>p_owner_id OR v.original_work_id<>p_original_work_id
    OR v.source_ref IS DISTINCT FROM p_source_ref
    OR v.continuity_head_sha256<>p_expected_head_sha256 OR v.continuity_revision<>p_expected_revision
    OR NOT (v.event_id IS NOT DISTINCT FROM p_current_event_id OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(p_execution_readback->'observations') x
      WHERE x.value->>'event_id'=v.event_id::text)
      OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(prior_preclaim_events) x
        WHERE x.value->>'event_id'=v.event_id::text)
      OR (v.signal_kind='QUALIFIER_PROOF_CHANGED' AND v.governed_wake_worker_run_id IS NULL
       AND v.governed_wake_request_id IS NULL AND v.governed_wake_queued_at IS NULL
       AND v.source_receipt_sha256<>qualifier_digest
       AND ((v.signal_next_action='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'
        AND qualifier->'unsatisfied_gates' ? 'CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED')
        OR (v.signal_next_action='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
        AND qualifier->'unsatisfied_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'
        AND qualifier->'recovery_terminal_history'->>'remaining_attempts'='0'
        AND qualifier->'recovery_terminal_history'->>'replay_permitted'='false'))))))
 THEN RETURN pg_catalog.jsonb_build_object('ready',false,'prior_preclaim_events',prior_preclaim_events);END IF;

 RETURN pg_catalog.jsonb_build_object('ready',true,'prior_preclaim_events',prior_preclaim_events);
END $read$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_invocation_return_pending_v1(uuid,uuid,text,text,text,bigint,text,jsonb,jsonb,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_invocation_return_pending_v1(uuid,uuid,text,text,text,bigint,text,jsonb,jsonb,uuid,uuid) TO service_role;
