-- Same-release preclaim investigation interruption recovery. All old records retained.
-- Keep one live/observed event per suspension and at most one historical supersession.
DROP INDEX IF EXISTS reality_internal.final_loop_suspension_investigation_once_v1;
CREATE UNIQUE INDEX final_loop_suspension_investigation_once_v1
 ON reality_internal.final_loop_resume_events_v1(shift_id,original_work_id,source_receipt_sha256)
 WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND state<>'SHADOW_STALE';
CREATE UNIQUE INDEX IF NOT EXISTS final_loop_suspension_interruption_once_v1
 ON reality_internal.final_loop_resume_events_v1(shift_id,original_work_id,source_receipt_sha256)
 WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND state='SHADOW_STALE';
DROP INDEX IF EXISTS reality_internal.final_loop_release_continuation_once_v1;
CREATE UNIQUE INDEX final_loop_release_continuation_once_v1
 ON reality_internal.final_loop_resume_events_v1(release_continuation_claim_id,continuity_revision)
 WHERE release_continuation_claim_id IS NOT NULL AND ledger_return_condition_sha256 IS NULL
 AND signal_kind NOT IN ('VERIFIED_INVESTIGATION_REVIEW','VERIFIED_REVIEW_TECHNICAL_EVIDENCE')
 AND NOT (signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND state='SHADOW_STALE');
CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_release_continuation_v1(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE successor jsonb; a record; old_event record; fresh_id uuid; suspension jsonb; qsub record; causal text;
 lease_row record; interrupted record; interruption jsonb; reconciled_at timestamptz;
BEGIN
 -- Prefer the next existing verified investigation over any old review attempt.
 fresh_id:=reality_internal.stage_final_loop_terminal_technical_evidence_v1(p_request_id);
 IF fresh_id IS NOT NULL THEN RETURN fresh_id;END IF;
 fresh_id:=reality_internal.stage_final_loop_independent_investigation_review_v1(p_request_id);
 IF fresh_id IS NOT NULL THEN RETURN fresh_id;END IF;
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 WHERE r.request_id=p_request_id AND r.state='CLAIMED_ONCE' AND r.claim_id IS NOT NULL
 AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 AND r.provider_alias_observed_at>=r.claimed_at
 AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
 AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND r.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
 AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND r.runtime_scope->>'independent_gateway_ci_verified'='true'
 AND r.runtime_scope->>'independent_qualification_branch_verified'='true'
 AND r.runtime_scope->>'independent_transport_proof_sha256' ~ '^sha256:[a-f0-9]{64}$'
 AND r.runtime_scope->>'child_execution_enabled'='false'
 AND r.runtime_scope->>'parent_delivery_enabled'='false'
 AND r.runtime_scope->>'production_changed'='false'
 AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
  WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id
   AND newer.capability_key=r.capability_key AND newer.state='CLAIMED_ONCE'
   AND newer.provider_alias_observed_at>r.provider_alias_observed_at)
 AND (NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.release_continuation_claim_id=r.claim_id)
  OR reality_internal.read_final_loop_release_successor_scope_v1(r.claim_id) IS NOT NULL)
 AND EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
  JOIN reality_internal.governed_employee_completion_warrants_v1 w
   ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
  WHERE s.owner_id=r.owner_id AND s.shift_id=r.shift_id AND s.plan_fingerprint=r.runtime_scope->>'plan_fingerprint'
   AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
   AND s.planned_start_at<=pg_catalog.clock_timestamp() AND s.planned_end_at>pg_catalog.clock_timestamp()
   AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) z WHERE z->>'source_ref'=r.runtime_scope->>'source_ref'))
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
  JOIN reality_internal.final_loop_child_approval_packets_v1 p ON p.packet_id=c.packet_id
  WHERE c.owner_id=r.owner_id AND c.shift_id=r.shift_id AND c.parent_original_work_id=r.runtime_scope->>'original_work_id'
   AND p.source_ref=r.runtime_scope->>'source_ref' AND p.state='EFFECT_RESERVED_RECONCILE_ONLY'
   AND ((c.phase='ADMITTED' AND c.canonical_prepare_invocation_id IS NULL AND c.model_response_id IS NULL)
     OR (c.phase='PREPARED' AND c.canonical_verify_invocation_id IS NULL AND c.independent_review_receipt_sha256 IS NULL)));
 IF NOT FOUND THEN RETURN NULL; END IF;
 successor:=reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id);
 IF successor IS NOT NULL THEN a.runtime_scope:=a.runtime_scope||pg_catalog.jsonb_build_object('continuity_head_sha256',successor->>'continuity_head_sha256','continuity_revision',(successor->>'continuity_revision')::bigint); END IF;
 -- Catch up from the independently observed current successor only after
 -- exact release approval and provider readback; never fake a qualifier delta.
 suspension:=reality_internal.read_final_loop_verified_suspension_v1(a.owner_id,a.shift_id,
  a.runtime_scope->>'original_work_id',a.runtime_scope->>'source_ref',
  a.runtime_scope->>'continuity_head_sha256',(a.runtime_scope->>'continuity_revision')::bigint);
 IF suspension IS NOT NULL AND (suspension->>'prior_release_sha'<>a.release_sha OR successor IS NOT NULL) THEN
  SELECT * INTO qsub FROM reality_internal.final_loop_resume_conditions_v1 sub
   WHERE sub.owner_id=a.owner_id AND sub.shift_id=a.shift_id AND sub.original_work_id=a.runtime_scope->>'original_work_id'
    AND sub.source_ref=a.runtime_scope->>'source_ref' AND sub.condition_kind='QUALIFIER_PROOF_CHANGED'
    AND sub.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
    AND sub.continuity_revision::text=a.runtime_scope->>'continuity_revision'
    AND sub.subscribed_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
    AND sub.state='SUSPENDED' FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL;END IF;
  -- Reuse the same release and suspension only after a terminal HTTP failure,
  -- expired singleton lease, and negative claim/receipt readback. Never replay
  -- a claimed investigation or any original provider invocation.
  IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 prior
   WHERE prior.shift_id=a.shift_id AND prior.original_work_id=qsub.original_work_id
    AND (prior.state='SHADOW_PENDING' OR (prior.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
     AND prior.source_receipt_sha256=suspension->>'receipt_sha256'))) THEN
   SELECT * INTO lease_row FROM reality_internal.governed_preview_shift_worker_leases_v1
    WHERE worker_key='preview-governed-employee-shift-worker'
     AND released_at IS NULL AND lease_expires_at<pg_catalog.clock_timestamp()
    FOR UPDATE SKIP LOCKED;
   IF NOT FOUND THEN RETURN NULL;END IF;
   SELECT e.*,run.run_id AS interrupted_run,run.worker_stage AS interrupted_stage,
    http.status_code AS http_status,http.created AS http_created,
    'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(http.content,'UTF8')),'hex') AS http_sha
   INTO interrupted
   FROM reality_internal.final_loop_resume_events_v1 e
   JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=e.governed_wake_worker_run_id
   JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
    AND wake.release_claim_id=a.claim_id AND wake.running_release_sha=a.release_sha
    AND wake.running_release_ref=a.release_ref AND wake.owner_id=e.owner_id AND wake.shift_id=e.shift_id
    AND wake.operating_lane='NORMAL_SIGNED_SHIFT' AND wake.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse ON pulse.owner_id=e.owner_id AND pulse.shift_id=e.shift_id
   JOIN net._http_response http ON http.id=e.governed_wake_request_id
   WHERE successor IS NOT NULL AND e.owner_id=a.owner_id AND e.shift_id=a.shift_id
    AND e.original_work_id=qsub.original_work_id AND e.source_ref=qsub.source_ref
    AND e.release_continuation_claim_id=a.claim_id
    AND e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
    AND e.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
    AND e.source_receipt_sha256=suspension->>'receipt_sha256'
    AND e.previous_receipt_sha256=qsub.subscribed_receipt_sha256
    AND e.continuity_head_sha256=qsub.continuity_head_sha256 AND e.continuity_revision=qsub.continuity_revision
    AND e.state='SHADOW_PENDING' AND e.observed_at IS NULL AND e.governed_wake_nonce IS NOT NULL
    AND e.governed_wake_requested_at<=e.governed_wake_queued_at
    AND run.status='STARTED' AND run.finished_at IS NULL AND run.worker_stage='SHIFT_DB_BOUNDARY'
    AND run.interrupted_evidence_failure_v1 IS NULL
    AND lease_row.claimed_at>=e.governed_wake_queued_at AND run.started_at>=lease_row.claimed_at
    AND run.started_at<lease_row.lease_expires_at
    AND pulse.last_worker_status='WAKE_RECEIVED' AND pulse.last_worker_seen_at BETWEEN run.started_at AND lease_row.lease_expires_at
    AND (pulse.last_worker_completed_at IS NULL OR pulse.last_worker_completed_at<run.started_at)
    AND http.status_code=503 AND http.timed_out IS FALSE AND http.content_type ILIKE 'application/json%'
    AND http.created BETWEEN e.governed_wake_queued_at AND lease_row.lease_expires_at
    AND (CASE WHEN http.content IS JSON OBJECT THEN http.content::jsonb ELSE '{}'::jsonb END)
      @> '{"ok":false,"error":"SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED","registered_capability_checkpoint":null,"work_completed":false,"installation_authorized":false,"production_changed":false}'::jsonb
    AND (SELECT count(*) FROM net._http_response h WHERE h.id=e.governed_wake_request_id)=1
    AND NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 newer WHERE newer.run_id<>run.run_id AND newer.started_at>=run.started_at)
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 other WHERE other.shift_id=e.shift_id
     AND other.original_work_id=e.original_work_id AND other.event_id<>e.event_id AND
     (other.state='SHADOW_PENDING' OR (other.signal_kind=e.signal_kind AND other.source_receipt_sha256=e.source_receipt_sha256)))
    AND NOT EXISTS(SELECT 1 FROM reality_internal.owner_shift_continuity_incidents_v1 i WHERE i.owner_id=e.owner_id AND i.shift_id=e.shift_id
      AND (i.source_evidence->>'event_id'=e.event_id::text OR i.source_evidence->>'worker_run_id'=run.run_id::text
       OR (i.source_evidence->>'original_work_id'=e.original_work_id AND i.source_evidence->>'verified_suspension_receipt_sha256'=e.source_receipt_sha256)))
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c WHERE c.claimant_worker_run_id=run.run_id OR c.canonical_verify_invocation_run_id=run.run_id)
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t WHERE t.worker_run_id=run.run_id)
    AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 t WHERE t.owner_id=e.owner_id AND t.shift_id=e.shift_id AND t.original_work_id=e.original_work_id)
   FOR UPDATE OF e,run;
   IF NOT FOUND THEN RETURN NULL;END IF;
   reconciled_at:=pg_catalog.clock_timestamp();
   interruption:=pg_catalog.jsonb_build_object('schema','reality-interrupted-evidence-failure-v1',
    'owner_id',interrupted.owner_id,'shift_id',interrupted.shift_id,'original_work_id',interrupted.original_work_id,
    'source_ref',interrupted.source_ref,'continuity_head_sha256',interrupted.continuity_head_sha256,
    'continuity_revision',interrupted.continuity_revision,'event_id',interrupted.event_id,'run_id',interrupted.interrupted_run,
    'request_id',interrupted.governed_wake_request_id,'nonce',interrupted.governed_wake_nonce,'release_claim_id',a.claim_id,
    'release_sha',a.release_sha,'lease_claim_id',lease_row.claim_id,'lease_expires_at',lease_row.lease_expires_at,
    'recorded_worker_stage',interrupted.interrupted_stage,'provider_response_status',interrupted.http_status,
    'provider_response_recorded_at',interrupted.http_created,'provider_response_sha256',interrupted.http_sha,
    'reconciled_at',reconciled_at,'investigation_claim_observed',false,'original_job_completed',false,
    'provider_outcome_verified',false,'replay_authorized',false,'new_attempt_authorized',false,
    'previous_attempt_budget_preserved',true,'installation_authorized',false,'production_changed',false);
   UPDATE reality_internal.signed_worker_actual_runs_v1 SET status='FAILED',finished_at=reconciled_at,
    interrupted_evidence_failure_v1=interruption||pg_catalog.jsonb_build_object('receipt_sha256','sha256:'||
     pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(interruption::text,'UTF8')),'hex'))
    WHERE run_id=interrupted.interrupted_run AND status='STARTED' AND finished_at IS NULL AND interrupted_evidence_failure_v1 IS NULL;
   IF NOT FOUND THEN RAISE EXCEPTION 'INVESTIGATION_INTERRUPTION_RUN_RACE';END IF;
   UPDATE reality_internal.final_loop_resume_events_v1 SET state='SHADOW_STALE'
    WHERE event_id=interrupted.event_id AND state='SHADOW_PENDING' AND observed_at IS NULL;
   IF NOT FOUND THEN RAISE EXCEPTION 'INVESTIGATION_INTERRUPTION_EVENT_RACE';END IF;
   INSERT INTO reality_internal.final_loop_resume_events_v1(shift_id,owner_id,original_work_id,source_ref,signal_kind,
    source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,
    signal_next_action,release_continuation_claim_id)
   VALUES(interrupted.shift_id,interrupted.owner_id,interrupted.original_work_id,interrupted.source_ref,interrupted.signal_kind,
    interrupted.source_receipt_sha256,interrupted.previous_receipt_sha256,interrupted.event_causality_sha256,
    interrupted.continuity_head_sha256,interrupted.continuity_revision,interrupted.signal_next_action,a.claim_id)
   ON CONFLICT DO NOTHING RETURNING event_id INTO fresh_id;
   IF fresh_id IS NULL THEN RAISE EXCEPTION 'INVESTIGATION_INTERRUPTION_CONTINUATION_NOT_STAGED';END IF;
   RETURN fresh_id;
  END IF;
  INSERT INTO reality_internal.final_loop_resume_conditions_v1(
   shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,
   continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
  VALUES(a.shift_id,a.owner_id,qsub.original_work_id,qsub.source_ref,'VERIFIED_SUSPENSION_INVESTIGATION',
   qsub.subscribed_receipt_sha256,qsub.continuity_head_sha256,qsub.continuity_revision,
   'INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY',suspension->'unresolved_proof_gates','RECOVER','SUSPENDED')
  ON CONFLICT(shift_id,original_work_id,condition_kind) DO UPDATE SET subscribed_receipt_sha256=EXCLUDED.subscribed_receipt_sha256,updated_at=pg_catalog.clock_timestamp()
 WHERE successor IS NOT NULL AND final_loop_resume_conditions_v1.owner_id=EXCLUDED.owner_id
 AND final_loop_resume_conditions_v1.source_ref=EXCLUDED.source_ref
 AND final_loop_resume_conditions_v1.continuity_head_sha256=EXCLUDED.continuity_head_sha256
 AND final_loop_resume_conditions_v1.continuity_revision=EXCLUDED.continuity_revision
 AND final_loop_resume_conditions_v1.state='SUSPENDED'
 AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e WHERE e.shift_id=EXCLUDED.shift_id
 AND e.original_work_id=EXCLUDED.original_work_id AND e.signal_kind=EXCLUDED.condition_kind
 AND e.continuity_revision=EXCLUDED.continuity_revision);
  IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 sub
    WHERE sub.shift_id=a.shift_id AND sub.owner_id=a.owner_id AND sub.original_work_id=qsub.original_work_id
     AND sub.condition_kind='VERIFIED_SUSPENSION_INVESTIGATION'
     AND sub.continuity_head_sha256=qsub.continuity_head_sha256 AND sub.continuity_revision=qsub.continuity_revision
     AND sub.subscribed_receipt_sha256=qsub.subscribed_receipt_sha256) THEN RETURN NULL;END IF;
  causal:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   a.shift_id::text||'|'||qsub.original_work_id||'|'||qsub.continuity_head_sha256||'|'||
   qsub.continuity_revision::text||'|'||qsub.subscribed_receipt_sha256||'|'||(suspension->>'receipt_sha256'),'UTF8')),'hex');
  INSERT INTO reality_internal.final_loop_resume_events_v1(
   shift_id,owner_id,original_work_id,source_ref,signal_kind,source_receipt_sha256,previous_receipt_sha256,
   event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,release_continuation_claim_id)
  VALUES(a.shift_id,a.owner_id,qsub.original_work_id,qsub.source_ref,'VERIFIED_SUSPENSION_INVESTIGATION',
   suspension->>'receipt_sha256',qsub.subscribed_receipt_sha256,causal,qsub.continuity_head_sha256,
   qsub.continuity_revision,'INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY',a.claim_id)
  ON CONFLICT DO NOTHING RETURNING event_id INTO fresh_id;
  RETURN fresh_id;
 END IF;
 IF successor IS NOT NULL THEN RETURN NULL; END IF;
 SELECT e.*,run.status AS prior_run_status INTO old_event FROM reality_internal.final_loop_resume_events_v1 e
 JOIN reality_internal.final_loop_resume_conditions_v1 c
  ON c.shift_id=e.shift_id AND c.owner_id=e.owner_id AND c.original_work_id=e.original_work_id
   AND c.condition_kind=e.signal_kind AND c.source_ref=e.source_ref
   AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.continuity_revision=e.continuity_revision
   AND c.subscribed_receipt_sha256=e.previous_receipt_sha256
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=e.governed_wake_worker_run_id
 LEFT JOIN reality_internal.governed_signed_worker_release_wakes_v1 prev ON prev.worker_run_id=run.run_id
 WHERE e.shift_id=a.shift_id AND e.owner_id=a.owner_id AND e.original_work_id=a.runtime_scope->>'original_work_id'
  AND e.source_ref=a.runtime_scope->>'source_ref' AND e.signal_kind='QUALIFIER_PROOF_CHANGED'
  AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND e.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
  AND e.continuity_revision::text=a.runtime_scope->>'continuity_revision'
  AND e.source_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
  AND e.governed_wake_request_id IS NOT NULL AND run.finished_at IS NOT NULL
  AND (
   (run.status='COMPLETED' AND prev.running_release_sha<>a.release_sha
    AND prev.owner_id=a.owner_id AND prev.shift_id=a.shift_id)
   OR (
    -- A durably claimed wake may fail before its release witness and before
    -- any business/model executor. Never infer successful provider effects.
    run.status='FAILED'
    AND run.worker_stage='SHARED_CONTINUITY_VERIFIER_PREEXECUTION_FENCE'
    AND e.state='SHADOW_PENDING' AND e.observed_at IS NULL
    AND e.governed_wake_nonce IS NOT NULL AND e.governed_wake_queued_at IS NOT NULL
    AND run.started_at>=e.governed_wake_queued_at
    AND run.started_at<e.governed_wake_queued_at+interval '5 minutes'
    AND run.finished_at>=run.started_at AND run.finished_at<a.claimed_at
    AND (prev.worker_run_id IS NULL OR (prev.owner_id=a.owner_id
     AND prev.shift_id=a.shift_id AND prev.running_release_sha<>a.release_sha))
    AND (e.release_continuation_claim_id IS NULL OR EXISTS(
      SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 prior
      WHERE prior.claim_id=e.release_continuation_claim_id AND prior.owner_id=a.owner_id
      AND prior.shift_id=a.shift_id AND prior.state='CLAIMED_ONCE'
      AND prior.release_sha<>a.release_sha AND prior.provider_alias_observed_at<=run.started_at
      AND prior.runtime_scope->>'original_work_id'=e.original_work_id
      AND prior.runtime_scope->>'source_ref'=e.source_ref))
    AND c.state IN ('SUSPENDED','SHADOW_SIGNALED')
    AND c.next_qualified_action=e.signal_next_action
    AND e.event_causality_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
      e.shift_id::text||'|'||e.original_work_id||'|'||e.continuity_head_sha256||'|'||
      e.continuity_revision::text||'|'||e.previous_receipt_sha256||'|'||e.source_receipt_sha256,'UTF8')),'hex')
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 child
      WHERE child.claimant_worker_run_id=run.run_id OR child.canonical_verify_invocation_run_id=run.run_id)
    AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 receipt
      WHERE receipt.worker_run_id=run.run_id)
   ))
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 pending
   WHERE pending.shift_id=e.shift_id AND pending.original_work_id=e.original_work_id
    AND pending.signal_kind=e.signal_kind AND pending.source_receipt_sha256=e.source_receipt_sha256
    AND pending.state='SHADOW_PENDING' AND pending.governed_wake_worker_run_id IS NULL)
  AND EXISTS(SELECT 1 FROM reality_internal.owner_continuity_qualification_routes_v1 q
   WHERE q.owner_id=e.owner_id AND q.source_ref=e.source_ref
    AND q.reconciliation_receipt_sha256=e.source_receipt_sha256
    AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    AND q.reconciliation_next_action=e.signal_next_action
    AND q.reconciliation_snapshot->>'review_scope_qualified'='true'
    AND q.reconciliation_snapshot->>'exact_goal_event_verified'='true'
    AND q.reconciliation_snapshot->>'exact_acceptance_approval_verified'='true'
    AND q.reconciliation_snapshot->>'shift_id'=e.shift_id::text
    AND q.reconciliation_snapshot->>'original_candidate_work_id'=e.original_work_id
    AND q.reconciliation_checked_at>=pg_catalog.clock_timestamp()-interval '10 minutes')
 ORDER BY run.finished_at DESC LIMIT 1 FOR UPDATE OF e;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- The source digest and causality still identify the exact independently
 -- qualified obligation. The additional FK is the distinct operational condition.
 INSERT INTO reality_internal.final_loop_resume_events_v1(
  shift_id,owner_id,original_work_id,source_ref,signal_kind,source_receipt_sha256,
  previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,
  signal_next_action,release_continuation_claim_id)
 VALUES(old_event.shift_id,old_event.owner_id,old_event.original_work_id,old_event.source_ref,
  old_event.signal_kind,old_event.source_receipt_sha256,old_event.previous_receipt_sha256,
  old_event.event_causality_sha256,old_event.continuity_head_sha256,old_event.continuity_revision,
  old_event.signal_next_action,a.claim_id)
 ON CONFLICT DO NOTHING RETURNING event_id INTO fresh_id;
 IF fresh_id IS NOT NULL AND old_event.prior_run_status='FAILED' THEN
  -- The old request, consumed nonce, run and proof remain historical.
  UPDATE reality_internal.final_loop_resume_events_v1
  SET state='SHADOW_STALE' WHERE event_id=old_event.event_id
   AND state='SHADOW_PENDING' AND governed_wake_worker_run_id=old_event.governed_wake_worker_run_id;
 END IF;
 RETURN fresh_id;
END $function$;
REVOKE ALL ON FUNCTION reality_internal.stage_final_loop_release_continuation_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
