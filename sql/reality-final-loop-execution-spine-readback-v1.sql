-- Existing shared guard extension; read-only operational-to-Spine proof input.
-- Install only in canonical benchmark under governed upgrade.
-- Reuse Reality's existing Continuity Ledger + independently verified Universe workline.
-- No new authority, model claim, new job, replay or production deployment.
-- This migration is repeatable from the installed, independently read function.

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 p jsonb; j jsonb; v_items jsonb:='[]'::jsonb; v_owner uuid; v_root uuid;
 v_head text; v_scope text; v_revision bigint;
 q reality_internal.owner_continuity_qualification_routes_v1%rowtype;
 qualifier_ok boolean; has_ci boolean; has_original boolean; has_final boolean;
 has_universe boolean; has_pending_event boolean; has_checkpoint boolean;
 v_action text;v_verifier_receipt text;v_qualifier_receipt text;v_gates jsonb;
 v_observation jsonb;v_fingerprint text;v_mismatches integer:=0;

 v_signal_count integer;v_verification_count integer;v_authority_count integer;
 v_broken_links integer;v_worldline_count integer;v_work_event boolean;
 v_work text;v_source text;v_qual_next text;
 v_fenced_count integer;v_observations jsonb;v_observation_count integer;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_SHARED_CONTINUITY_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL THEN RETURN pg_catalog.jsonb_build_object(
  'status','FINAL_LOOP_SHARED_CONTINUITY_SHIFT_REQUIRED',
  'read_only',true,'execution_authorized',false);END IF;
 p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF p->>'schema'<>'reality-final-loop-canonical-proof-readback-v1'
   OR p->>'status'<>'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
   OR p->>'read_only'<>'true' OR p->>'independent_owner_scope_verified'<>'true'
   OR p->>'shift_id'<>p_shift_id::text OR p->>'execution_authorized'<>'false'
   OR p->>'installation_authorized'<>'false' OR p->>'original_job_completed'<>'false'
   OR p->>'production_changed'<>'false'
   OR (p->>'owner_id') IS NULL
   OR (p->>'continuity_root_id') IS NULL
   OR (p->>'continuity_head_sha256') !~ '^sha256:[a-f0-9]{64}$'
   OR (p->>'frozen_shift_scope_sha256') !~ '^sha256:[a-f0-9]{64}$'
   OR (p->>'revision')::bigint<1
   OR pg_catalog.jsonb_typeof(p->'jobs')<>'array'
 THEN RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_CANONICAL_SCOPE_UNVERIFIED',
   'read_only',true,'execution_authorized',false,
   'original_job_completed',false); END IF;
 v_owner:=(p->>'owner_id')::uuid;v_root:=(p->>'continuity_root_id')::uuid;
 v_head:=p->>'continuity_head_sha256';
 v_scope:=p->>'frozen_shift_scope_sha256';
 v_revision:=(p->>'revision')::bigint;

 -- The first Signal Cleaner/qualification input must anchor ONE coherent
 -- parent-linked Universe worldline for the exact signed shift. A valid
 -- hash alone cannot substitute for an unbroken event chain.
 SELECT
  count(*) FILTER(WHERE e.event_kind='RAW_SIGNAL'
    AND e.parent_event_id IS NULL AND e.epistemic_status='OBSERVED'),
  count(*) FILTER(WHERE e.event_kind='VERIFICATION'
    AND e.epistemic_status='VERIFIED'
    AND pg_catalog.jsonb_typeof(e.evidence_refs)='array'
    AND pg_catalog.jsonb_array_length(e.evidence_refs)>0),
  count(*) FILTER(WHERE e.event_kind='AUTHORITY'
    AND e.epistemic_status='VERIFIED'),
  count(*) FILTER(WHERE e.parent_event_id IS NOT NULL AND (
      prior.event_id IS NULL
      OR prior.continuity_root_id IS DISTINCT FROM e.continuity_root_id
      OR prior.worldline_id IS DISTINCT FROM e.worldline_id
      OR prior.created_at>e.created_at
    )),
  count(DISTINCT e.worldline_id)
 INTO v_signal_count,v_verification_count,v_authority_count,
      v_broken_links,v_worldline_count
 FROM public.universe_events e
 LEFT JOIN public.universe_events prior ON prior.event_id=e.parent_event_id
 WHERE e.continuity_root_id=v_root
   AND e.payload->>'owner_id'=v_owner::text
   AND e.payload->>'shift_id'=p_shift_id::text;
 IF v_signal_count<>1 OR v_verification_count<1
   OR v_authority_count<1 OR v_broken_links<>0 OR v_worldline_count<>1
 THEN RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_FIRST_SIGNAL_OR_WORLDLINE_UNVERIFIED',
   'shift_id',p_shift_id,'owner_id',v_owner,
   'first_signal_count',v_signal_count,
   'verified_evidence_event_count',v_verification_count,
   'authority_scope_event_count',v_authority_count,
   'broken_parent_link_count',v_broken_links,
   'worldline_count',v_worldline_count,
   'read_only',true,'execution_authorized',false,
   'transition_committed',false,'original_job_completed',false);
 END IF;
 FOR j IN SELECT value FROM pg_catalog.jsonb_array_elements(p->'jobs') LOOP
   v_work:=j->>'original_work_id';v_source:=j->>'source_ref';
   IF v_work IS NULL OR v_work !~ '^work:[a-f0-9]{32}$' THEN
    v_items:=v_items||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
     'source_ref',v_source,'original_work_id',null,
     'status','SOURCE_NOT_ADMITTED','source_proof_verified',
       j->>'independent_source_proof_verified'='true',
     'continuity_identity_verified',true,
     'independent_outcome_verified',false,'universe_return_verified',false,
     'execution_permitted_by_handoff',false,'next_action','QUALIFY_ORIGINAL_SOURCE'));
    CONTINUE;
   END IF;
   SELECT r.* INTO q
   FROM reality_internal.owner_continuity_qualification_routes_v1 r
   WHERE r.owner_id=v_owner AND r.intake_family='SIGNED_SHIFT_SOURCE'
    AND r.source_ref=v_source
    AND r.reconciliation_snapshot->>'shift_id'=p_shift_id::text
    AND r.reconciliation_snapshot->>'owner_id'=v_owner::text
    AND r.reconciliation_snapshot->>'original_candidate_work_id'=v_work
   ORDER BY r.reconciliation_checked_at DESC NULLS LAST,r.intake_key
   LIMIT 1;
   qualifier_ok:=FOUND;
   qualifier_ok:=qualifier_ok
    AND q.reconciliation_checked_at>=pg_catalog.clock_timestamp()-interval '30 minutes'
    AND q.reconciliation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    AND q.reconciliation_receipt_sha256=
      'sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    AND q.reconciliation_snapshot->>'schema'=
      'reality-governed-qualifier-cross-layer-proof-v1'
    AND q.reconciliation_snapshot->>'source_ref'=v_source
    AND q.reconciliation_snapshot->>'next_action'=q.reconciliation_next_action
    AND q.reconciliation_snapshot->>'source_proof_bound'='true'
    AND q.reconciliation_snapshot->>'lineage_packet_found'='true';
   qualifier_ok:=coalesce(qualifier_ok,false);
   v_action:=CASE WHEN qualifier_ok THEN q.reconciliation_next_action ELSE null END;
   v_qualifier_receipt:=CASE WHEN qualifier_ok THEN q.reconciliation_receipt_sha256 ELSE null END;
   v_gates:=CASE WHEN qualifier_ok THEN
    coalesce(q.reconciliation_snapshot->'unsatisfied_gates','[]'::jsonb)
    ELSE '["QUALIFIER_PROOF_UNVERIFIED"]'::jsonb END;
   SELECT EXISTS(
      SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
      JOIN reality_internal.owner_internal_maintenance_jobs_v1 m
       ON m.incident_id=ci.maintenance_id AND m.owner_id=ci.owner_id
        AND m.claimed_shift_id=ci.shift_id AND m.source_ref=ci.source_ref
      WHERE ci.shift_id=p_shift_id AND ci.owner_id=v_owner AND ci.source_ref=v_source
        AND ci.source_epoch_frozen_red_verified=true
        AND ci.code_correction_green_verified=true
        AND ci.original_customer_job_completed=false
        AND ci.artifact_installation_authorized=false
        AND ci.production_changed=false
        AND ci.case_specific_ci_receipt_sha256~'^sha256:[a-f0-9]{64}$'
        AND ci.github_artifact_digest~'^sha256:[a-f0-9]{64}$'
        AND ci.independently_reviewing_worker_run_id IS DISTINCT FROM
          (SELECT c.worker_run_id
           FROM reality_internal.signed_maintenance_executor_claims_v1 c
           WHERE c.maintenance_id=ci.maintenance_id LIMIT 1)
   ) INTO has_ci;
   SELECT ci.case_specific_ci_receipt_sha256 INTO v_verifier_receipt
   FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
   WHERE has_ci=true AND ci.shift_id=p_shift_id AND ci.owner_id=v_owner
    AND ci.source_ref=v_source AND ci.source_epoch_frozen_red_verified=true
    AND ci.code_correction_green_verified=true
    AND ci.original_customer_job_completed=false
    AND ci.artifact_installation_authorized=false
    AND ci.production_changed=false
   ORDER BY ci.reviewed_at DESC LIMIT 1;

   SELECT EXISTS(
    SELECT 1 FROM public.universe_events ev
     WHERE ev.continuity_root_id=v_root AND ev.event_kind='WORK'
       AND ev.epistemic_status='VERIFIED'
       AND ev.payload->>'owner_id'=v_owner::text
       AND ev.payload->>'shift_id'=p_shift_id::text
       AND ev.payload->>'original_work_id'=v_work
       AND ev.payload->>'original_source_ref'=v_source
       AND ev.payload->>'original_job_completed'='false'
       AND ev.payload->>'next_external_action_authorized_by_classification'='false'
       AND ev.provenance->>'authoritative_source'='service_role_existing_signed_shift'
       AND EXISTS(
         SELECT 1 FROM reality_internal.owner_internal_maintenance_jobs_v1 m
         WHERE m.incident_id::text=ev.payload->>'maintenance_id'
           AND m.owner_id=v_owner AND m.claimed_shift_id=p_shift_id)
       AND pg_catalog.jsonb_typeof(ev.evidence_refs)='array'
       AND pg_catalog.jsonb_array_length(ev.evidence_refs)>0
   ) INTO v_work_event;
   SELECT EXISTS(
     SELECT 1 FROM reality_internal.governed_employee_original_claims_v1 c
     WHERE c.shift_id=p_shift_id AND c.owner_id=v_owner
      AND c.source_ref=v_source AND c.original_work_id=v_work
   ) INTO has_original;
   SELECT EXISTS(
     SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 f
     WHERE f.shift_id=p_shift_id AND f.owner_id=v_owner AND f.source_ref=v_source
      AND f.original_work_id=v_work AND f.outcome='SUCCEEDED'
      AND f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   ) INTO has_final;
   -- Parent goal/outcome is independently verified on its owner-approved
   -- workline. Completion only returns to this exact signed original after
   -- an independently reconciled, parent-linked OUTCOME on the existing
   -- canonical shift worldline. A parent receipt alone is never the return.
   SELECT EXISTS(
    SELECT 1 FROM reality_internal.final_loop_parent_deliveries_v1 d
    JOIN public.universe_events isolated
      ON isolated.event_id=d.universe_outcome_event_id
     AND isolated.continuity_root_id=d.shift_id
     AND isolated.worldline_id=d.plan_id
     AND isolated.parent_event_id=d.universe_goal_event_id
     AND isolated.event_kind='OUTCOME'
     AND isolated.entity_type='reality_final_loop_verified_original_outcome_v1'
     AND isolated.epistemic_status='VERIFIED'
     AND isolated.payload->>'schema'=
       'reality-final-loop-verified-pr-review-outcome-v1'
     AND isolated.payload->>'owner_id'=d.owner_id::text
     AND isolated.payload->>'shift_id'=d.shift_id::text
     AND isolated.payload->>'original_work_id'=d.parent_original_work_id
     AND isolated.payload->>'source_ref'=d.source_ref
     AND isolated.payload->>'source_manifest_sha256'=d.source_manifest_sha256
     AND isolated.payload->>'acceptance_contract_sha256'=d.acceptance_contract_sha256
     AND isolated.payload->>'independent_verifier_worker_run_id'=
       d.independent_verifier_worker_run_id::text
     AND isolated.payload->>'independent_outcome_verified'='true'
     AND isolated.payload->>'original_job_completed'='true'
     AND isolated.payload->>'production_changed'='false'
     AND isolated.content_hash=pg_catalog.encode(pg_catalog.sha256(
       pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
         isolated.payload),'UTF8')),'hex')
    JOIN public.universe_events returned
      ON returned.continuity_root_id=v_root
     AND returned.worldline_id=(
       SELECT signal.worldline_id FROM public.universe_events signal
        WHERE signal.continuity_root_id=v_root
          AND signal.event_kind='RAW_SIGNAL'
          AND signal.parent_event_id IS NULL
          AND signal.payload->>'owner_id'=v_owner::text
          AND signal.payload->>'shift_id'=p_shift_id::text
        LIMIT 1)
     AND returned.event_kind='OUTCOME'
     AND returned.entity_type='reality_final_loop_verified_cross_worldline_return_v1'
     AND returned.epistemic_status='VERIFIED'
     AND returned.payload->>'schema'=
       'reality-final-loop-cross-worldline-verified-return-v1'
     AND returned.payload->>'owner_id'=d.owner_id::text
     AND returned.payload->>'shift_id'=d.shift_id::text
     AND returned.payload->>'source_ref'=d.source_ref
     AND returned.payload->>'original_work_id'=d.parent_original_work_id
     AND returned.payload->>'delivery_id'=d.delivery_id::text
     AND returned.payload->>'source_universe_outcome_event_id'=
       d.universe_outcome_event_id::text
     AND returned.payload->>'independent_parent_settlement_receipt_id'=
       d.original_settlement_receipt_id::text
     AND returned.payload->>'independent_verifier_worker_run_id'=
       d.independent_verifier_worker_run_id::text
     AND returned.payload->>'cross_scope_receipt_sha256'=d.cross_scope_receipt_sha256
     AND returned.payload->>'independent_outcome_verified'='true'
     AND returned.payload->>'original_job_completed'='true'
     AND returned.payload->>'production_changed'='false'
     AND returned.payload->>'new_authority_granted'='false'
     AND returned.payload->>'effect_executed_by_this_return'='false'
     AND returned.parent_event_id IS NOT NULL
     AND returned.content_hash=pg_catalog.encode(pg_catalog.sha256(
       pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
         returned.payload),'UTF8')),'hex')
    WHERE d.shift_id=p_shift_id AND d.owner_id=v_owner
      AND d.source_ref=v_source AND d.parent_original_work_id=v_work
      AND d.status='SETTLED' AND d.settled_at IS NOT NULL
      AND d.original_settlement_receipt_id IS NOT NULL
      AND d.universe_goal_event_id IS NOT NULL
      AND d.universe_outcome_event_id IS NOT NULL
      AND d.independent_verifier_worker_run_id IS NOT NULL
      AND d.independent_verifier_worker_run_id IS DISTINCT FROM
        d.publisher_worker_run_id
      AND d.owner_approved_at IS NOT NULL
      AND d.owner_publication_receipt_sha256~'^sha256:[a-f0-9]{64}$'
      AND d.cross_scope_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   ) INTO has_universe;
   -- A properly settled native parent is independently verified original
   -- work. Never infer original completion from a maintenance diagnostic.
   has_final:=has_final OR has_universe;
   SELECT EXISTS(
     SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
      JOIN reality_internal.final_loop_resume_conditions_v1 s
      ON s.shift_id=e.shift_id AND s.original_work_id=e.original_work_id
       AND s.condition_kind=e.signal_kind
     WHERE e.shift_id=p_shift_id AND e.owner_id=v_owner
      AND e.original_work_id=v_work AND e.source_ref=v_source
      AND e.continuity_revision=v_revision AND e.continuity_head_sha256=v_head
      AND e.state='SHADOW_PENDING'
      AND s.owner_id=v_owner AND s.source_ref=v_source
      AND s.continuity_revision=v_revision AND s.continuity_head_sha256=v_head
   ) INTO has_pending_event;
   SELECT EXISTS(
     SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t
     WHERE t.shift_id=p_shift_id AND t.owner_id=v_owner
       AND t.original_work_id=v_work AND t.source_ref=v_source
       AND t.continuity_root_id=v_root AND t.continuity_head_sha256=v_head
       AND t.expected_revision<v_revision
   ) INTO has_checkpoint;

   -- Read existing immutable invocation fences, signed worker completions,
   -- exact wake events and approved releases. No provider outcome inferred.
   SELECT count(*) INTO v_fenced_count
   FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.owner_id=v_owner AND c.shift_id=p_shift_id
     AND c.parent_original_work_id=v_work AND c.canonical_prepare_invocation_id IS NOT NULL;
   SELECT count(*),coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'child_work_id',c.child_work_id,'scope_sha256',c.scope_sha256,
     'invocation_id',c.canonical_prepare_invocation_id,
     'worker_run_id',c.claimant_worker_run_id,'event_id',e.event_id,
     'event_head_sha256',e.continuity_head_sha256,'event_revision',e.continuity_revision,
     'release_sha',w.running_release_sha,'release_receipt_sha256',w.release_receipt_sha256,
     'worker_completed',true,'model_artifact_recorded',c.model_response_id IS NOT NULL,
     'provider_outcome_verified',false,'replay_authorized',false
   ) ORDER BY c.scope_index,c.child_work_id),'[]'::jsonb)
   INTO v_observation_count,v_observations
   FROM reality_internal.final_loop_child_review_work_v1 c
   JOIN reality_internal.final_loop_pr_source_plans_v1 cp ON cp.plan_id=c.plan_id
    AND cp.owner_id=c.owner_id AND cp.shift_id=c.shift_id
    AND cp.parent_original_work_id=c.parent_original_work_id AND cp.source_ref=v_source
    AND cp.source_head_sha=c.source_head_sha AND cp.source_manifest_sha256=c.source_manifest_sha256
   JOIN reality_internal.final_loop_child_approval_packets_v1 ca ON ca.packet_id=c.packet_id
    AND ca.owner_id=c.owner_id AND ca.shift_id=c.shift_id AND ca.plan_id=c.plan_id
    AND ca.parent_original_work_id=c.parent_original_work_id
    AND ca.acceptance_contract_sha256=c.acceptance_contract_sha256
    AND ca.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
    AND ca.owner_approval_receipt_sha256~'^sha256:[a-f0-9]{64}
   THEN v_mismatches:=v_mismatches+1;END IF;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
     'original_work_id',v_work,'source_ref',v_source,
     'status',CASE WHEN NOT qualifier_ok THEN 'QUALIFIER_CHAIN_UNVERIFIED'
      WHEN j->>'independent_source_proof_verified'<>'true' THEN 'SOURCE_UNVERIFIED'
      WHEN NOT v_work_event THEN 'FIRST_LAYER_ORIGINAL_CONTINUITY_NOT_PROVEN'
      WHEN has_final AND has_universe THEN 'INDEPENDENTLY_SETTLED_WITH_UNIVERSE'
      ELSE 'CONTINUITY_OPEN_PENDING_PROOFS' END,
     'source_proof_verified',j->>'independent_source_proof_verified'='true',
     'original_work_universe_event_verified',v_work_event,
     'continuity_identity_verified',true,
     'qualifier_digest_verified',qualifier_ok,
     'qualifier_receipt_sha256',v_qualifier_receipt,
     'next_qualified_action',v_action,
     'unresolved_proof_gates',v_gates,
     'internal_maintenance_independent_frozen_ci_verified',has_ci,
     'internal_maintenance_verifier_receipt_sha256',v_verifier_receipt,
     'original_claim_admitted',has_original,
     'independent_original_outcome_verified',has_final,
     'universe_return_verified',has_universe,
     'same_head_evidence_checkpoint_observed',has_checkpoint,
     'matching_event_in_shadow',has_pending_event,
     'executor_authorized_by_observation',false,
     'execution_permitted_by_handoff',false,
     'independent_verification_does_not_grant_owner_authority',true
    ));
 END LOOP;
 v_observation:=pg_catalog.jsonb_build_object(
   'schema','reality-shared-cross-layer-continuity-handoff-v1',
   'shift_id',p_shift_id,'owner_id',v_owner,
   'continuity_root_id',v_root,'continuity_head_sha256',v_head,
   'frozen_shift_scope_sha256',v_scope,'revision',v_revision,
   'obligations',v_items,'unverified_handoffs',v_mismatches,
   'first_signal_anchor_verified',true,
   'verified_evidence_event_count',v_verification_count,
   'shift_scope_authority_event_present',true,
   'worldline_parent_links_verified',true);
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v_observation::text,'UTF8')),'hex');
 RETURN v_observation||pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_mismatches>0 THEN
    'FINAL_LOOP_SHARED_CONTINUITY_HANDOFF_PROOF_GAP'
    ELSE 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' END,
  'handoff_observation_sha256',v_fingerprint,
  'same_state_same_digest_until_receipt_changes',true,
  'digest_is_not_independent_factual_proof',true,
  'read_only',true,'no_new_executable_authority',true,
  'transition_committed',false,'executor_invoked',false,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) TO service_role;

   JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=c.claimant_worker_run_id
    AND r.status='COMPLETED' AND r.finished_at IS NOT NULL AND r.started_at IS NOT NULL
   JOIN reality_internal.final_loop_resume_events_v1 e ON e.governed_wake_worker_run_id=r.run_id
    AND e.shift_id=c.shift_id AND e.owner_id=c.owner_id
    AND e.original_work_id=c.parent_original_work_id AND e.source_ref=v_source
    AND e.governed_wake_queued_at IS NOT NULL
   JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
    AND w.owner_id=c.owner_id AND w.shift_id=c.shift_id
    AND w.operating_lane='NORMAL_SIGNED_SHIFT'
    AND w.release_receipt_sha256~'^sha256:[a-f0-9]{64}
   THEN v_mismatches:=v_mismatches+1;END IF;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
     'original_work_id',v_work,'source_ref',v_source,
     'status',CASE WHEN NOT qualifier_ok THEN 'QUALIFIER_CHAIN_UNVERIFIED'
      WHEN j->>'independent_source_proof_verified'<>'true' THEN 'SOURCE_UNVERIFIED'
      WHEN NOT v_work_event THEN 'FIRST_LAYER_ORIGINAL_CONTINUITY_NOT_PROVEN'
      WHEN has_final AND has_universe THEN 'INDEPENDENTLY_SETTLED_WITH_UNIVERSE'
      ELSE 'CONTINUITY_OPEN_PENDING_PROOFS' END,
     'source_proof_verified',j->>'independent_source_proof_verified'='true',
     'original_work_universe_event_verified',v_work_event,
     'continuity_identity_verified',true,
     'qualifier_digest_verified',qualifier_ok,
     'qualifier_receipt_sha256',v_qualifier_receipt,
     'next_qualified_action',v_action,
     'unresolved_proof_gates',v_gates,
     'internal_maintenance_independent_frozen_ci_verified',has_ci,
     'internal_maintenance_verifier_receipt_sha256',v_verifier_receipt,
     'original_claim_admitted',has_original,
     'independent_original_outcome_verified',has_final,
     'universe_return_verified',has_universe,
     'same_head_evidence_checkpoint_observed',has_checkpoint,
     'matching_event_in_shadow',has_pending_event,
     'executor_authorized_by_observation',false,
     'execution_permitted_by_handoff',false,
     'independent_verification_does_not_grant_owner_authority',true
    ));
 END LOOP;
 v_observation:=pg_catalog.jsonb_build_object(
   'schema','reality-shared-cross-layer-continuity-handoff-v1',
   'shift_id',p_shift_id,'owner_id',v_owner,
   'continuity_root_id',v_root,'continuity_head_sha256',v_head,
   'frozen_shift_scope_sha256',v_scope,'revision',v_revision,
   'obligations',v_items,'unverified_handoffs',v_mismatches,
   'first_signal_anchor_verified',true,
   'verified_evidence_event_count',v_verification_count,
   'shift_scope_authority_event_present',true,
   'worldline_parent_links_verified',true);
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v_observation::text,'UTF8')),'hex');
 RETURN v_observation||pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_mismatches>0 THEN
    'FINAL_LOOP_SHARED_CONTINUITY_HANDOFF_PROOF_GAP'
    ELSE 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' END,
  'handoff_observation_sha256',v_fingerprint,
  'same_state_same_digest_until_receipt_changes',true,
  'digest_is_not_independent_factual_proof',true,
  'read_only',true,'no_new_executable_authority',true,
  'transition_committed',false,'executor_invoked',false,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) TO service_role;

   JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    AND a.owner_id=c.owner_id AND a.shift_id=c.shift_id AND a.release_sha=w.running_release_sha
    AND a.approval_receipt_sha256~'^sha256:[a-f0-9]{64}
   THEN v_mismatches:=v_mismatches+1;END IF;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
     'original_work_id',v_work,'source_ref',v_source,
     'status',CASE WHEN NOT qualifier_ok THEN 'QUALIFIER_CHAIN_UNVERIFIED'
      WHEN j->>'independent_source_proof_verified'<>'true' THEN 'SOURCE_UNVERIFIED'
      WHEN NOT v_work_event THEN 'FIRST_LAYER_ORIGINAL_CONTINUITY_NOT_PROVEN'
      WHEN has_final AND has_universe THEN 'INDEPENDENTLY_SETTLED_WITH_UNIVERSE'
      ELSE 'CONTINUITY_OPEN_PENDING_PROOFS' END,
     'source_proof_verified',j->>'independent_source_proof_verified'='true',
     'original_work_universe_event_verified',v_work_event,
     'continuity_identity_verified',true,
     'qualifier_digest_verified',qualifier_ok,
     'qualifier_receipt_sha256',v_qualifier_receipt,
     'next_qualified_action',v_action,
     'unresolved_proof_gates',v_gates,
     'internal_maintenance_independent_frozen_ci_verified',has_ci,
     'internal_maintenance_verifier_receipt_sha256',v_verifier_receipt,
     'original_claim_admitted',has_original,
     'independent_original_outcome_verified',has_final,
     'universe_return_verified',has_universe,
     'same_head_evidence_checkpoint_observed',has_checkpoint,
     'matching_event_in_shadow',has_pending_event,
     'executor_authorized_by_observation',false,
     'execution_permitted_by_handoff',false,
     'independent_verification_does_not_grant_owner_authority',true
    ));
 END LOOP;
 v_observation:=pg_catalog.jsonb_build_object(
   'schema','reality-shared-cross-layer-continuity-handoff-v1',
   'shift_id',p_shift_id,'owner_id',v_owner,
   'continuity_root_id',v_root,'continuity_head_sha256',v_head,
   'frozen_shift_scope_sha256',v_scope,'revision',v_revision,
   'obligations',v_items,'unverified_handoffs',v_mismatches,
   'first_signal_anchor_verified',true,
   'verified_evidence_event_count',v_verification_count,
   'shift_scope_authority_event_present',true,
   'worldline_parent_links_verified',true);
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v_observation::text,'UTF8')),'hex');
 RETURN v_observation||pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_mismatches>0 THEN
    'FINAL_LOOP_SHARED_CONTINUITY_HANDOFF_PROOF_GAP'
    ELSE 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' END,
  'handoff_observation_sha256',v_fingerprint,
  'same_state_same_digest_until_receipt_changes',true,
  'digest_is_not_independent_factual_proof',true,
  'read_only',true,'no_new_executable_authority',true,
  'transition_committed',false,'executor_invoked',false,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) TO service_role;

   WHERE c.owner_id=v_owner AND c.shift_id=p_shift_id
    AND c.parent_original_work_id=v_work AND c.canonical_prepare_invocation_id IS NOT NULL;
   IF NOT qualifier_ok OR NOT v_work_event OR j->>'independent_source_proof_verified'<>'true'
   THEN v_mismatches:=v_mismatches+1;END IF;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
     'original_work_id',v_work,'source_ref',v_source,
     'status',CASE WHEN NOT qualifier_ok THEN 'QUALIFIER_CHAIN_UNVERIFIED'
      WHEN j->>'independent_source_proof_verified'<>'true' THEN 'SOURCE_UNVERIFIED'
      WHEN NOT v_work_event THEN 'FIRST_LAYER_ORIGINAL_CONTINUITY_NOT_PROVEN'
      WHEN has_final AND has_universe THEN 'INDEPENDENTLY_SETTLED_WITH_UNIVERSE'
      ELSE 'CONTINUITY_OPEN_PENDING_PROOFS' END,
     'source_proof_verified',j->>'independent_source_proof_verified'='true',
     'original_work_universe_event_verified',v_work_event,
     'continuity_identity_verified',true,
     'qualifier_digest_verified',qualifier_ok,
     'qualifier_receipt_sha256',v_qualifier_receipt,
     'next_qualified_action',v_action,
     'unresolved_proof_gates',v_gates,
     'internal_maintenance_independent_frozen_ci_verified',has_ci,
     'internal_maintenance_verifier_receipt_sha256',v_verifier_receipt,
     'original_claim_admitted',has_original,
     'independent_original_outcome_verified',has_final,
     'universe_return_verified',has_universe,
     'execution_spine_readback',pg_catalog.jsonb_build_object(
       'status',CASE WHEN v_fenced_count=0 THEN 'NO_FENCED_CHILD_INVOCATION_OBSERVED'
        WHEN v_fenced_count<>v_observation_count THEN 'SIGNED_INVOCATION_EVIDENCE_RECONCILIATION_REQUIRED'
        ELSE 'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN' END,
       'fenced_count',v_fenced_count,'signed_observation_count',v_observation_count,
       'observations',v_observations,'canonical_return_committed',false,
       'execution_authorized',false,'provider_outcome_verified',false,
       'original_job_completed',false,'replay_authorized',false),
     'same_head_evidence_checkpoint_observed',has_checkpoint,
     'matching_event_in_shadow',has_pending_event,
     'executor_authorized_by_observation',false,
     'execution_permitted_by_handoff',false,
     'independent_verification_does_not_grant_owner_authority',true
    ));
 END LOOP;
 v_observation:=pg_catalog.jsonb_build_object(
   'schema','reality-shared-cross-layer-continuity-handoff-v1',
   'shift_id',p_shift_id,'owner_id',v_owner,
   'continuity_root_id',v_root,'continuity_head_sha256',v_head,
   'frozen_shift_scope_sha256',v_scope,'revision',v_revision,
   'obligations',v_items,'unverified_handoffs',v_mismatches,
   'first_signal_anchor_verified',true,
   'verified_evidence_event_count',v_verification_count,
   'shift_scope_authority_event_present',true,
   'worldline_parent_links_verified',true);
 v_fingerprint:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(v_observation::text,'UTF8')),'hex');
 RETURN v_observation||pg_catalog.jsonb_build_object(
  'status',CASE WHEN v_mismatches>0 THEN
    'FINAL_LOOP_SHARED_CONTINUITY_HANDOFF_PROOF_GAP'
    ELSE 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED' END,
  'handoff_observation_sha256',v_fingerprint,
  'same_state_same_digest_until_receipt_changes',true,
  'digest_is_not_independent_factual_proof',true,
  'read_only',true,'no_new_executable_authority',true,
  'transition_committed',false,'executor_invoked',false,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_shared_continuity_guard_v1(uuid) TO service_role;
