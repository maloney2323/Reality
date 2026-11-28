CREATE OR REPLACE FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_proof jsonb;v_subs jsonb;v_events jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_EVENT_SHADOW_SERVICE_ONLY';END IF;
 v_proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF v_proof->>'shift_id'<>p_shift_id::text OR
    v_proof->>'independent_owner_scope_verified'<>'true' THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EVENT_SHADOW_SCOPE_UNVERIFIED',
   'event_dispatch_enabled',false,'execution_authorized',false);END IF;
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'original_work_id',s.original_work_id,'source_ref',s.source_ref,
  'condition_kind',s.condition_kind,'subscribed_receipt_sha256',s.subscribed_receipt_sha256,
  'unresolved_proof_gates',s.unresolved_proof_gates,
  'next_qualified_action',s.next_qualified_action,
  'state',s.state,'continuity_revision',s.continuity_revision
 ) ORDER BY s.original_work_id),'[]'::jsonb) INTO v_subs
 FROM reality_internal.final_loop_resume_conditions_v1 s
 WHERE s.shift_id=p_shift_id AND s.owner_id=(v_proof->>'owner_id')::uuid;
 WITH event_scope AS MATERIALIZED (
  SELECT e.* FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.shift_id=p_shift_id AND e.owner_id=(v_proof->>'owner_id')::uuid
 ), proof_keys AS MATERIALIZED (
  SELECT DISTINCT owner_id,shift_id,original_work_id,source_ref,continuity_head_sha256,continuity_revision,
   signal_kind,source_receipt_sha256 FROM event_scope
 ), proofs AS MATERIALIZED (
  SELECT e.*,case
   -- Historical current-head-only proof readers cannot qualify a new head.
   -- Preserve every event and its receipts without recomputing stale proofs.
   when e.signal_kind in ('VERIFIED_REVIEW_TECHNICAL_EVIDENCE','VERIFIED_INVESTIGATION_REVIEW','VERIFIED_SUSPENSION_INVESTIGATION')
    and (e.continuity_revision is distinct from (v_proof->>'revision')::bigint
     or e.continuity_head_sha256 is distinct from v_proof->>'continuity_head_sha256') then false
   when e.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_terminal_review_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'review_receipt_sha256'),false)
   when e.signal_kind='VERIFIED_INVESTIGATION_REVIEW' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_investigation_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'investigation_receipt_sha256'),false)
   when e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' then coalesce(
    e.source_receipt_sha256=(reality_internal.read_final_loop_verified_suspension_v1(
      e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision)->>'receipt_sha256'),false)
   when e.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' then exists(
    select 1 from reality_internal.owner_maintenance_independent_case_ci_v1 ci
    where ci.shift_id=e.shift_id and ci.owner_id=e.owner_id
      and ci.source_ref=e.source_ref
      and ci.case_specific_ci_receipt_sha256=e.source_receipt_sha256
      and ci.source_epoch_frozen_red_verified=true
      and ci.code_correction_green_verified=true
      and ci.original_customer_job_completed=false
      and ci.artifact_installation_authorized=false
      and ci.production_changed=false)
   else exists(
    select 1 from pg_catalog.jsonb_array_elements(
      coalesce(v_proof->'governed_qualification_handoffs','[]'::jsonb)) h
    where h->>'source_ref'=e.source_ref
      and h->>'original_work_id'=e.original_work_id
      and h->>'qualifier_receipt_sha256'=e.source_receipt_sha256)
   end AS source_current
  FROM proof_keys e
 )
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',e.event_id,'original_work_id',e.original_work_id,
  'source_ref',e.source_ref,'event_kind',e.signal_kind,
  'source_receipt_sha256',e.source_receipt_sha256,
  'event_causality_sha256',e.event_causality_sha256,
  'event_state',e.state,
  'continuity_revision',e.continuity_revision,
  'signal_next_action',e.signal_next_action,

  'source_current',p.source_current,

  'would_resume_suspended_obligation',e.state='SHADOW_PENDING' AND
   e.continuity_revision=(v_proof->>'revision')::bigint AND
   e.continuity_head_sha256=v_proof->>'continuity_head_sha256' AND p.source_current
 ) ORDER BY e.created_at),'[]'::jsonb) INTO v_events
 FROM event_scope e
 JOIN proofs p ON p.owner_id IS NOT DISTINCT FROM e.owner_id
  AND p.shift_id IS NOT DISTINCT FROM e.shift_id
  AND p.original_work_id IS NOT DISTINCT FROM e.original_work_id
  AND p.source_ref IS NOT DISTINCT FROM e.source_ref
  AND p.continuity_head_sha256 IS NOT DISTINCT FROM e.continuity_head_sha256
  AND p.continuity_revision IS NOT DISTINCT FROM e.continuity_revision
  AND p.signal_kind IS NOT DISTINCT FROM e.signal_kind
  AND p.source_receipt_sha256 IS NOT DISTINCT FROM e.source_receipt_sha256;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-event-resume-shadow-v1',
  'status','FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',
  'shift_id',p_shift_id,'subscriptions',v_subs,'events',v_events,
  'event_dispatch_enabled',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $function$
;
-- Repair only a signed failure before capability dispatch. Retain the exact
-- event, original approval, release, continuity identity and historical run.
ALTER TABLE reality_internal.final_loop_resume_events_v1
 ADD COLUMN IF NOT EXISTS predispatch_delivery_recovery_receipt jsonb;

CREATE OR REPLACE FUNCTION reality_internal.freeze_final_loop_predispatch_recovery_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $fn$
BEGIN
 IF OLD.predispatch_delivery_recovery_receipt IS NULL AND NEW.predispatch_delivery_recovery_receipt IS NOT NULL AND current_user<>'postgres'
 THEN RAISE EXCEPTION 'FINAL_LOOP_PREDISPATCH_RECOVERY_ADMIN_ONLY'; END IF;
 IF OLD.predispatch_delivery_recovery_receipt IS NOT NULL
  AND NEW.predispatch_delivery_recovery_receipt IS DISTINCT FROM OLD.predispatch_delivery_recovery_receipt
 THEN RAISE EXCEPTION 'FINAL_LOOP_PREDISPATCH_RECOVERY_RECEIPT_IMMUTABLE'; END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.freeze_final_loop_predispatch_recovery_v1() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS freeze_final_loop_predispatch_recovery_v1 ON reality_internal.final_loop_resume_events_v1;
CREATE TRIGGER freeze_final_loop_predispatch_recovery_v1 BEFORE UPDATE ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.freeze_final_loop_predispatch_recovery_v1();

CREATE OR REPLACE FUNCTION reality_internal.rearm_final_loop_predispatch_event_v1(p_event_id uuid,p_failed_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $fn$
DECLARE e record; r record; a record; packet record; g jsonb; ob jsonb; candidate jsonb; history jsonb; receipt text; l record;
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'FINAL_LOOP_PREDISPATCH_RECOVERY_ADMIN_ONLY';END IF;
 -- Lock the same lease the existing notifier owns. No overlapping execution.
 SELECT * INTO l FROM reality_internal.governed_preview_shift_worker_leases_v1
 WHERE worker_key='preview-governed-employee-shift-worker' FOR UPDATE;
 IF NOT FOUND OR l.released_at IS NULL OR l.lease_expires_at>pg_catalog.clock_timestamp()
 THEN RETURN pg_catalog.jsonb_build_object('status','WORKER_LEASE_NOT_RELEASED','rearmed',false);END IF;
 SELECT * INTO e FROM reality_internal.final_loop_resume_events_v1
 WHERE event_id=p_event_id FOR UPDATE;
 IF NOT FOUND OR e.state<>'SHADOW_PENDING' OR e.observed_at IS NOT NULL
  OR e.governed_wake_worker_run_id IS DISTINCT FROM p_failed_run_id
  OR e.predispatch_delivery_recovery_receipt IS NOT NULL
  OR e.signal_kind<>'QUALIFIER_PROOF_CHANGED'
  OR e.signal_next_action<>'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  OR e.ledger_return_condition_sha256 IS NOT NULL
  OR e.governed_wake_request_id IS NULL OR e.governed_wake_nonce IS NULL
  OR e.governed_wake_queued_at IS NULL OR e.release_continuation_claim_id IS NULL
 THEN RETURN pg_catalog.jsonb_build_object('status','EXACT_UNCONSUMED_RECOVERY_EVENT_NOT_VERIFIED','rearmed',false);END IF;
 SELECT * INTO r FROM reality_internal.signed_worker_actual_runs_v1 WHERE run_id=p_failed_run_id;
 IF NOT FOUND OR r.status<>'FAILED' OR r.worker_stage<>'EXACT_CLAIMED_EVENT_CAPABILITY_SELECTION'
  OR r.finished_at IS NULL OR r.started_at<e.governed_wake_queued_at OR l.released_at<r.finished_at
  OR EXISTS(SELECT 1 FROM reality_internal.governed_signed_worker_release_wakes_v1 w WHERE w.worker_run_id=p_failed_run_id)
  OR EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
   WHERE c.claimant_worker_run_id=p_failed_run_id OR c.canonical_verify_invocation_run_id=p_failed_run_id OR c.independent_verifier_run_id=p_failed_run_id)
  OR EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t WHERE t.worker_run_id=p_failed_run_id)
  OR EXISTS(SELECT 1 FROM reality_internal.final_loop_parent_integration_batches_v1 b WHERE b.verifier_worker_run_id=p_failed_run_id)
  OR EXISTS(SELECT 1 FROM reality_internal.final_loop_parent_deliveries_v1 d
    WHERE d.publisher_worker_run_id=p_failed_run_id OR d.independent_verifier_worker_run_id=p_failed_run_id)
 THEN RETURN pg_catalog.jsonb_build_object('status','PRE_DISPATCH_FAILURE_NOT_PROVEN_NO_REPLAY','rearmed',false);END IF;
 SELECT * INTO a FROM reality_internal.governed_worker_release_approvals_v1
 WHERE claim_id=e.release_continuation_claim_id AND owner_id=e.owner_id AND shift_id=e.shift_id
 AND state='CLAIMED_ONCE' AND capability_key=e.signal_next_action AND provider_alias_observed_at>=claimed_at
 AND runtime_scope->>'original_work_id'=e.original_work_id AND runtime_scope->>'source_ref'=e.source_ref
 AND provider_alias_observed_deployment_id=runtime_scope->>'target_deployment_id'
 AND runtime_scope->>'continuity_revision'=e.continuity_revision::text
 AND runtime_scope->>'continuity_head_sha256'=e.continuity_head_sha256
 AND runtime_scope->>'child_execution_enabled'='false' AND runtime_scope->>'parent_delivery_enabled'='false';
 IF NOT FOUND OR EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
 WHERE newer.owner_id=e.owner_id AND newer.shift_id=e.shift_id AND newer.state='CLAIMED_ONCE'
 AND newer.capability_key=e.signal_next_action AND newer.provider_alias_observed_at>a.provider_alias_observed_at)
 THEN RETURN pg_catalog.jsonb_build_object('status','ACTIVE_EXACT_RELEASE_NOT_VERIFIED','rearmed',false);END IF;
 SELECT * INTO packet FROM reality_internal.final_loop_child_approval_packets_v1
 WHERE shift_id=e.shift_id AND owner_id=e.owner_id AND parent_original_work_id=e.original_work_id
 AND source_ref=e.source_ref AND state='EFFECT_RESERVED_RECONCILE_ONLY'
 AND same_obligation_recovery_approval->>'approval_receipt_sha256'=e.previous_receipt_sha256;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
 AND w.plan_fingerprint=s.plan_fingerprint WHERE s.shift_id=e.shift_id AND s.owner_id=e.owner_id
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_end_at>pg_catalog.clock_timestamp()
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
 THEN RETURN pg_catalog.jsonb_build_object('status','EXISTING_OWNER_AUTHORITY_NOT_VERIFIED','rearmed',false);END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(e.shift_id);
 SELECT x INTO ob FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x->>'original_work_id'=e.original_work_id AND x->>'source_ref'=e.source_ref
 AND x->>'qualifier_receipt_sha256'=e.source_receipt_sha256 AND x->>'next_qualified_action'=e.signal_next_action
 AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
 AND x->>'source_proof_verified'='true' AND x->>'independent_original_outcome_verified'='false';
 IF NOT FOUND OR g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR g->>'continuity_head_sha256' IS DISTINCT FROM e.continuity_head_sha256
 OR g->>'revision' IS DISTINCT FROM e.continuity_revision::text
 OR g->>'execution_authorized' IS DISTINCT FROM 'false' OR g->>'no_new_executable_authority' IS DISTINCT FROM 'true'
 OR g->>'original_job_completed' IS DISTINCT FROM 'false' OR g->>'production_changed' IS DISTINCT FROM 'false'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
 WHERE c.shift_id=e.shift_id AND c.owner_id=e.owner_id AND c.original_work_id=e.original_work_id
 AND c.source_ref=e.source_ref AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
 AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256)
 THEN RETURN pg_catalog.jsonb_build_object('status','CURRENT_CONTINUITY_EVENT_NOT_VERIFIED','rearmed',false);END IF;
 candidate:=reality_internal.read_final_loop_approved_recovery_candidate_v1(e.shift_id,packet.plan_id);
 IF candidate IS NULL OR candidate->>'approval_receipt_sha256' IS DISTINCT FROM e.previous_receipt_sha256
 OR candidate->>'continuity_head_sha256' IS DISTINCT FROM e.continuity_head_sha256
 OR candidate->>'continuity_revision' IS DISTINCT FROM e.continuity_revision::text
 OR candidate->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
 THEN RETURN pg_catalog.jsonb_build_object('status','EXACT_APPROVED_CANDIDATE_NOT_VERIFIED','rearmed',false);END IF;
 history:=pg_catalog.jsonb_build_object('schema','reality-final-loop-predispatch-delivery-recovery-v1',
 'event_id',e.event_id,'shift_id',e.shift_id,'original_work_id',e.original_work_id,'event_causality_sha256',e.event_causality_sha256,
 'failed_run_id',r.run_id,'failed_stage',r.worker_stage,'failed_finished_at',r.finished_at,
 'previous_request_id',e.governed_wake_request_id,'previous_nonce',e.governed_wake_nonce,'previous_queued_at',e.governed_wake_queued_at,
 'release_claim_id',e.release_continuation_claim_id,'approval_receipt_sha256',e.previous_receipt_sha256,
 'continuity_head_sha256',e.continuity_head_sha256,'continuity_revision',e.continuity_revision,
 'model_invocation_replay_authorized',false,'new_owner_authority',false,'new_original_admitted',false);
 receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(history::text,'UTF8')),'hex');
 UPDATE reality_internal.final_loop_resume_events_v1 SET
 predispatch_delivery_recovery_receipt=history||pg_catalog.jsonb_build_object('receipt_sha256',receipt),
 governed_wake_request_id=NULL,governed_wake_worker_run_id=NULL,governed_wake_nonce=NULL,governed_wake_queued_at=NULL,
 governed_wake_requested_at=pg_catalog.clock_timestamp()
 WHERE event_id=e.event_id AND governed_wake_worker_run_id=p_failed_run_id AND predispatch_delivery_recovery_receipt IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_LOOP_PREDISPATCH_RECOVERY_RACE';END IF;
 RETURN pg_catalog.jsonb_build_object('status','EXACT_EVENT_REARMED_FOR_EXISTING_NOTIFIER','event_id',e.event_id,'receipt_sha256',receipt,
 'rearmed',true,'model_invocation_replay_authorized',false,'new_owner_authority',false,'execution_authorized',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.rearm_final_loop_predispatch_event_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
