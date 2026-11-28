-- Return from the independently verified technical recovery observation to
-- the existing exact owner-approved READ_ONLY_INTERNAL_PR_REVIEW route.
-- No retry of a fenced invocation, no new business warrant, no publication.
CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_verified_review_return_v1(p_worker_run_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a record; ev record; u record; s record; g jsonb; p jsonb; pre jsonb; scope jsonb; q record; sub record;
 observation_receipt text; checkpoint jsonb; causal text; result uuid; current_rev bigint; current_head text;
BEGIN
 IF current_user<>'postgres' OR p_worker_run_id IS NULL THEN RETURN NULL; END IF;
 SELECT x.* INTO ev FROM reality_internal.final_loop_resume_events_v1 x
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=x.governed_wake_worker_run_id
 WHERE r.run_id=p_worker_run_id AND r.status='COMPLETED' AND r.finished_at IS NOT NULL
 AND r.worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION'
 AND x.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND x.state='SHADOW_OBSERVED'
 AND x.observed_at IS NOT NULL AND x.governed_wake_nonce IS NOT NULL;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.release_claim_id=r.claim_id
 WHERE r.claim_id=ev.release_continuation_claim_id AND w.worker_run_id=p_worker_run_id
 AND w.owner_id=ev.owner_id AND w.shift_id=ev.shift_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
 AND w.running_release_sha=r.release_sha AND w.running_release_ref=r.release_ref
 AND r.owner_id=ev.owner_id AND r.shift_id=ev.shift_id AND r.state='CLAIMED_ONCE'
 AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 AND r.provider_alias_observed_at>=r.claimed_at
 AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
 AND r.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
 AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND r.runtime_scope->>'independent_gateway_ci_verified'='true'
 AND r.runtime_scope->>'independent_qualification_branch_verified'='true'
 AND r.independent_isolation_proof_sha256~'^sha256:[a-f0-9]{64}$'
 AND r.runtime_scope->>'child_execution_enabled'='false'
 AND r.runtime_scope->>'parent_delivery_enabled'='false'
 AND r.runtime_scope->>'production_changed'='false'
 AND r.runtime_scope->>'original_work_id'=ev.original_work_id
 AND r.runtime_scope->>'source_ref'=ev.source_ref
 AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
 WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id AND newer.capability_key=r.capability_key
 AND newer.state='CLAIMED_ONCE' AND newer.provider_alias_observed_at>r.provider_alias_observed_at);
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT sh.* INTO s FROM reality_internal.governed_employee_shifts_v1 sh
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=sh.shift_id
 AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
 WHERE sh.shift_id=ev.shift_id AND sh.owner_id=ev.owner_id
 AND sh.plan_fingerprint=a.runtime_scope->>'plan_fingerprint' AND sh.authorized_at IS NOT NULL
 AND sh.closed_at IS NULL AND sh.planned_start_at<=pg_catalog.clock_timestamp() AND sh.planned_end_at>pg_catalog.clock_timestamp()
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) z WHERE z->>'source_ref'=ev.source_ref)
 FOR UPDATE OF sh,w;
 IF NOT FOUND THEN RETURN NULL;END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(ev.shift_id);
 p:=public.reality_read_current_final_loop_proof_envelope_v1(ev.shift_id);
 current_rev:=ev.continuity_revision+1;current_head:=g->>'continuity_head_sha256';
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR g->>'owner_id' IS DISTINCT FROM ev.owner_id::text OR g->>'shift_id' IS DISTINCT FROM ev.shift_id::text
 OR g->>'continuity_root_id' IS DISTINCT FROM a.runtime_scope->>'continuity_root_id'
 OR g->>'revision' IS DISTINCT FROM current_rev::text OR current_head IS NULL
 OR g->>'no_new_executable_authority' IS DISTINCT FROM 'true' OR g->>'unverified_handoffs' IS DISTINCT FROM '0'
 OR g->>'worldline_parent_links_verified' IS DISTINCT FROM 'true'
 OR g->>'execution_authorized' IS DISTINCT FROM 'false' OR g->>'original_job_completed' IS DISTINCT FROM 'false'
 OR g->>'production_changed' IS DISTINCT FROM 'false'
 OR p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
 OR p->>'continuity_head_sha256' IS DISTINCT FROM current_head OR p->>'revision' IS DISTINCT FROM current_rev::text
 OR p->>'plan_fingerprint' IS DISTINCT FROM s.plan_fingerprint
 OR p->>'frozen_shift_scope_sha256' IS DISTINCT FROM g->>'frozen_shift_scope_sha256'
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'obligations') o
 WHERE o->>'original_work_id'=ev.original_work_id AND o->>'source_ref'=ev.source_ref
 AND o->>'continuity_identity_verified'='true' AND o->>'qualifier_digest_verified'='true'
 AND o->>'source_proof_verified'='true' AND o->>'independent_original_outcome_verified'='false'
 AND o->>'next_qualified_action'='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM')
 THEN RETURN NULL;END IF;
 SELECT e.* INTO u FROM public.universe_events e
 JOIN public.universe_events prior ON prior.event_id=e.parent_event_id AND prior.continuity_root_id=e.continuity_root_id
 AND prior.worldline_id=e.worldline_id AND 'sha256:'||prior.lineage_hash=ev.continuity_head_sha256
 WHERE e.continuity_root_id::text=g->>'continuity_root_id' AND 'sha256:'||e.lineage_hash=current_head
 AND e.entity_type='reality_final_loop_terminal_technical_observation_v1' AND e.epistemic_status='OBSERVED'
 AND e.provenance->>'worker_run_id'=p_worker_run_id::text
 AND e.payload->>'owner_id'=ev.owner_id::text AND e.payload->>'shift_id'=ev.shift_id::text
 AND e.payload->>'original_work_id'=ev.original_work_id AND e.payload->>'source_ref'=ev.source_ref
 AND e.payload->>'prior_revision'=ev.continuity_revision::text AND e.payload->>'prior_head_sha256'=ev.continuity_head_sha256
 AND e.payload->>'review_receipt_sha256'=ev.source_receipt_sha256 AND e.payload->>'investigation_receipt_sha256'=ev.previous_receipt_sha256
 AND e.payload->>'previous_attempt_budget_preserved'='true' AND e.payload->'terminal_recovery_history'->>'remaining_attempts'='0'
 AND e.payload->>'technical_evidence_only'='true' AND e.payload->>'new_attempt_authorized'='false'
 AND e.payload->>'original_business_red_verified'='false' AND e.payload->>'original_job_completed'='false'
 AND e.payload->>'execution_authorized'='false' AND e.payload->>'replay_authorized'='false' AND e.payload->>'production_changed'='false'
 AND e.payload->'technical_provider_proof'->>'independent_technical_ci_verified'='true'
 AND e.payload->'technical_provider_proof'->>'github_release_sha'=a.release_sha
 AND e.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(e.payload),'UTF8')),'hex');
 IF NOT FOUND THEN RETURN NULL;END IF;
 observation_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(u.payload::text,'UTF8')),'hex');
 IF NOT u.evidence_refs ? observation_receipt THEN RETURN NULL;END IF;
 checkpoint:=pg_catalog.jsonb_build_object('shift_id',ev.shift_id,'owner_id',ev.owner_id,'original_work_id',ev.original_work_id,
 'source_ref',ev.source_ref,'plan_fingerprint',s.plan_fingerprint,'frozen_shift_scope_sha256',p->>'frozen_shift_scope_sha256',
 'continuity_root_id',u.continuity_root_id,'continuity_head_sha256',ev.continuity_head_sha256,
 'expected_revision',ev.continuity_revision,'worker_run_id',p_worker_run_id,'decision','REFRESH','reason_code','BLOCKER_ATTESTATION_PENDING');
 IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t
 WHERE t.owner_id=ev.owner_id AND t.shift_id=ev.shift_id AND t.original_work_id=ev.original_work_id
 AND t.source_ref=ev.source_ref AND t.worker_run_id=p_worker_run_id AND t.expected_revision=ev.continuity_revision
 AND t.continuity_head_sha256=ev.continuity_head_sha256 AND t.continuity_root_id=u.continuity_root_id
 AND t.decision='REFRESH' AND t.reason_code='BLOCKER_ATTESTATION_PENDING'
 AND t.receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(checkpoint::text,'UTF8')),'hex'))
 THEN RETURN NULL;END IF;
 SELECT * INTO q FROM reality_internal.owner_continuity_qualification_routes_v1 r
 WHERE r.owner_id=ev.owner_id AND r.source_ref=ev.source_ref
 AND r.reconciliation_snapshot->>'shift_id'=ev.shift_id::text
 AND r.reconciliation_snapshot->>'original_candidate_work_id'=ev.original_work_id
 AND r.reconciliation_receipt_sha256=u.payload->>'qualifier_receipt_sha256'
 AND r.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.reconciliation_snapshot::text,'UTF8')),'hex')
 AND r.reconciliation_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.reconciliation_snapshot->>'review_scope_qualified'='true'
 AND r.reconciliation_snapshot->>'exact_goal_event_verified'='true'
 AND r.reconciliation_snapshot->>'exact_acceptance_approval_verified'='true'
 AND r.reconciliation_checked_at>pg_catalog.clock_timestamp()-interval '10 minutes';
 IF NOT FOUND THEN RETURN NULL;END IF;
 pre:=reality_internal.read_final_loop_child_approval_preflight_v1(ev.shift_id);
 SELECT x->'canonical_review_handoff' INTO scope FROM pg_catalog.jsonb_array_elements(pre->'plans') x
 WHERE x->>'parent_original_work_id'=ev.original_work_id AND x->>'source_ref'=ev.source_ref
 AND x->>'independent_goal_acceptance_verified'='true' AND x->>'owner_approval_claim_window_current'='true'
 AND x->'canonical_review_handoff'->>'effect_type'='READ_ONLY_INTERNAL_PR_REVIEW'
 AND x->'canonical_review_handoff'->>'execution_authorized'='false';
 IF scope IS NULL OR scope IS DISTINCT FROM q.reconciliation_snapshot->'accepted_review_scope' THEN RETURN NULL;END IF;
 -- The completed recovery is not permission to retry any uncertain scope.
 -- At least one never-invoked child must exist in the exact approved packet.
 IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
 WHERE c.packet_id::text=scope->>'packet_id' AND c.owner_id=ev.owner_id AND c.shift_id=ev.shift_id
 AND c.parent_original_work_id=ev.original_work_id AND c.phase='ADMITTED'
 AND c.canonical_prepare_invocation_id IS NULL AND c.canonical_verify_invocation_id IS NULL
 AND c.model_response_id IS NULL AND c.claimant_worker_run_id IS NULL
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(scope->'scope_fingerprints') x WHERE x->>'scope_sha256'=c.scope_sha256))
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e WHERE e.shift_id=ev.shift_id
 AND e.original_work_id=ev.original_work_id AND (e.state='SHADOW_PENDING' OR
 (e.continuity_revision=current_rev AND e.signal_kind='QUALIFIER_PROOF_CHANGED')))
 THEN RETURN NULL;END IF;
 SELECT * INTO sub FROM reality_internal.final_loop_resume_conditions_v1 c WHERE c.shift_id=ev.shift_id
 AND c.owner_id=ev.owner_id AND c.original_work_id=ev.original_work_id AND c.source_ref=ev.source_ref
 AND c.condition_kind='QUALIFIER_PROOF_CHANGED' AND c.continuity_revision=current_rev
 AND c.continuity_head_sha256=current_head AND c.state='SUSPENDED'
 AND c.subscribed_receipt_sha256=q.reconciliation_receipt_sha256 FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL;END IF;
 -- Existing inbox compares current qualifier against the independently
 -- observed causal return receipt, not an invented qualifier delta.
 UPDATE reality_internal.final_loop_resume_conditions_v1 SET subscribed_receipt_sha256=observation_receipt,
 updated_at=pg_catalog.clock_timestamp() WHERE shift_id=ev.shift_id AND original_work_id=ev.original_work_id
 AND condition_kind='QUALIFIER_PROOF_CHANGED';
 causal:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(ev.shift_id::text||'|'||ev.original_work_id||'|'||
 current_head||'|'||current_rev::text||'|'||observation_receipt||'|'||q.reconciliation_receipt_sha256,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_resume_events_v1(shift_id,owner_id,original_work_id,source_ref,signal_kind,source_receipt_sha256,
 previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,release_continuation_claim_id)
 VALUES(ev.shift_id,ev.owner_id,ev.original_work_id,ev.source_ref,'QUALIFIER_PROOF_CHANGED',q.reconciliation_receipt_sha256,
 observation_receipt,causal,current_head,current_rev,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',a.claim_id)
 ON CONFLICT DO NOTHING RETURNING event_id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'VERIFIED_REVIEW_RETURN_EVENT_NOT_STAGED'; END IF;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.stage_final_loop_verified_review_return_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE ledger_stage jsonb; demand record;
BEGIN
 -- Reuse the existing governed qualifier on receipt of a saved continuation.
 -- This is not a second executor, a direct HTTP wake, or an authority grant.
 IF TG_TABLE_NAME='owner_chat_existing_shift_wakes_v1' THEN
  BEGIN
   PERFORM reality_internal.reconcile_current_qualification_proofs_v1(NEW.shift_id);
  EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'CHAT_CONTINUATION_QUALIFICATION_PENDING_DURABLE_INTENT_RETAINED';
  END;
  RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_worker_release_approvals_v1' THEN
   -- A verified release observation is a concrete proof demand. Recompute the
   -- existing source inventory for this shift before either continuation path.
   PERFORM reality_internal.reconcile_current_qualification_proofs_v1(NEW.shift_id);
   IF NEW.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM' THEN
    ledger_stage:=public.reality_stage_final_loop_ledger_return_v1(NEW.shift_id,NEW.claim_id);
   END IF;
   -- The qualified evidence-return route takes precedence. Never create an
   -- ordinary continuation alongside the distinct evidence-only event.
   IF coalesce(ledger_stage->>'status','') NOT IN
    ('LEDGER_RETURN_EVENT_STAGED','LEDGER_RETURN_CONDITION_ALREADY_STAGED_NO_REPLAY') THEN
    PERFORM reality_internal.stage_final_loop_release_continuation_v1(NEW.request_id);
   END IF;
   PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NEW.shift_id);
  ELSIF TG_TABLE_NAME='signed_worker_actual_runs_v1' THEN
   IF NEW.status='COMPLETED' AND OLD.status='STARTED' AND NEW.worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION' THEN
    PERFORM reality_internal.reconcile_current_qualification_proofs_v1(w.shift_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
    PERFORM reality_internal.stage_final_loop_verified_review_return_v1(NEW.run_id);
   END IF;
   -- A completed signed worker with an unobserved qualifier event is a
   -- proof demand, not permission to rerun that worker or its provider effect.
   -- Recompute for the exact witnessed shift before trying the existing
   -- evidence-only stage. Its verifier independently checks the complete scope.
   IF NEW.status='COMPLETED' AND OLD.status='STARTED'
    AND NEW.worker_stage IN ('SHARED_CONTINUITY_VERIFIER_RETURN_FENCE','WORKER_RESPONSE_PUBLICATION') THEN
    FOR demand IN
     SELECT DISTINCT e.shift_id,a.claim_id
     FROM reality_internal.final_loop_resume_events_v1 e
     JOIN reality_internal.governed_signed_worker_release_wakes_v1 w
      ON w.worker_run_id=NEW.run_id AND w.owner_id=e.owner_id AND w.shift_id=e.shift_id
     JOIN reality_internal.governed_worker_release_approvals_v1 a
      ON a.claim_id=w.release_claim_id AND a.claim_id=e.release_continuation_claim_id
       AND a.owner_id=e.owner_id AND a.shift_id=e.shift_id AND a.release_sha=w.running_release_sha
     WHERE e.governed_wake_worker_run_id=NEW.run_id AND e.state='SHADOW_PENDING'
      AND e.signal_kind='QUALIFIER_PROOF_CHANGED'
      AND e.ledger_return_condition_sha256 IS NULL
      AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
      AND w.operating_lane='NORMAL_SIGNED_SHIFT'
      AND a.state='CLAIMED_ONCE' AND a.provider_alias_observed_at IS NOT NULL
      AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
    LOOP
     PERFORM reality_internal.reconcile_current_qualification_proofs_v1(demand.shift_id);
     PERFORM public.reality_stage_final_loop_ledger_return_v1(demand.shift_id,demand.claim_id);
    END LOOP;
   END IF;
   -- A completed independently returned ledger observation is the causal demand
   -- for the next evidence-only investigation under the existing release.
   IF NEW.status='COMPLETED' AND OLD.status='STARTED' AND NEW.worker_stage='LEDGER_RETURN_RESPONSE_PUBLICATION' THEN
    PERFORM reality_internal.reconcile_current_qualification_proofs_v1(w.shift_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
    PERFORM reality_internal.stage_final_loop_release_continuation_v1(a.request_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w
    JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
     AND reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id) IS NOT NULL;
   END IF;
   -- Only a completed investigation may request a distinct review run.
   IF NEW.status='COMPLETED' AND OLD.status='STARTED'
    AND (NEW.worker_stage='SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION'
     OR (NEW.worker_stage='WORKER_RESPONSE_PUBLICATION' AND EXISTS(
       SELECT 1 FROM reality_internal.owner_shift_continuity_incidents_v1 i
        WHERE i.source_evidence->>'worker_run_id'=NEW.run_id::text
         AND i.source_evidence->>'blocker_code'='FINAL_LOOP_UNRESOLVED_INVOCATION_INVESTIGATION_REQUIRED'
         AND i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'))) THEN
    PERFORM reality_internal.stage_final_loop_independent_investigation_review_v1(a.request_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w
    JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
   ELSIF NEW.status='COMPLETED' AND OLD.status='STARTED'
    AND NEW.worker_stage='INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION' THEN
    PERFORM reality_internal.stage_final_loop_terminal_technical_evidence_v1(a.request_id)
    FROM reality_internal.governed_signed_worker_release_wakes_v1 w
    JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    WHERE w.worker_run_id=NEW.run_id AND w.operating_lane='NORMAL_SIGNED_SHIFT';
   END IF;
  ELSIF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
   IF NEW.released_at IS NOT NULL AND OLD.released_at IS DISTINCT FROM NEW.released_at THEN
    PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NULL);
   END IF;
  ELSE
   PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NEW.shift_id);
  END IF;
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'GOVERNED_WAKE_NOT_QUEUED_DURABLE_STATE_RETAINED';
 END;
 RETURN NEW;
END $function$;
DROP TRIGGER IF EXISTS final_loop_completed_investigation_wake_v1 ON reality_internal.signed_worker_actual_runs_v1;
CREATE TRIGGER final_loop_completed_investigation_wake_v1 AFTER UPDATE OF status ON reality_internal.signed_worker_actual_runs_v1
 FOR EACH ROW WHEN (OLD.status='STARTED' AND NEW.status='COMPLETED' AND NEW.worker_stage IN
 ('SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION','INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION',
 'WORKER_RESPONSE_PUBLICATION','SHARED_CONTINUITY_VERIFIER_RETURN_FENCE','LEDGER_RETURN_RESPONSE_PUBLICATION',
 'TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION'))
 EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();