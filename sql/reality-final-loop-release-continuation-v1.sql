-- Incremental canonical benchmark correction. No new job, approval, scheduler,
-- provider invocation or settlement. Preserve historical events and child fences.
-- Install only through the independently qualified database change path.
ALTER TABLE reality_internal.final_loop_resume_events_v1
 ADD COLUMN IF NOT EXISTS release_continuation_claim_id uuid
 REFERENCES reality_internal.governed_worker_release_approvals_v1(claim_id);
ALTER TABLE reality_internal.final_loop_resume_events_v1
 DROP CONSTRAINT IF EXISTS final_loop_resume_events_v1_shift_id_original_work_id_signa_key;
CREATE UNIQUE INDEX IF NOT EXISTS final_loop_original_signal_once_v1
 ON reality_internal.final_loop_resume_events_v1(shift_id,original_work_id,signal_kind,source_receipt_sha256)
 WHERE release_continuation_claim_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS final_loop_release_continuation_once_v1
 ON reality_internal.final_loop_resume_events_v1(release_continuation_claim_id)
 WHERE release_continuation_claim_id IS NOT NULL;

-- A verified suspension is a causal source distinct from a changed qualifier.
ALTER TABLE reality_internal.final_loop_resume_conditions_v1 DROP CONSTRAINT final_loop_resume_conditions_v1_condition_kind_check;
ALTER TABLE reality_internal.final_loop_resume_conditions_v1 ADD CONSTRAINT final_loop_resume_conditions_v1_condition_kind_check CHECK (condition_kind IN ('QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT','VERIFIED_SUSPENSION_INVESTIGATION'));
ALTER TABLE reality_internal.final_loop_resume_events_v1 DROP CONSTRAINT final_loop_resume_events_v1_signal_kind_check;
ALTER TABLE reality_internal.final_loop_resume_events_v1 ADD CONSTRAINT final_loop_resume_events_v1_signal_kind_check CHECK (signal_kind IN ('QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT','VERIFIED_SUSPENSION_INVESTIGATION'));
CREATE UNIQUE INDEX IF NOT EXISTS final_loop_suspension_investigation_once_v1 ON reality_internal.final_loop_resume_events_v1(shift_id,original_work_id,source_receipt_sha256) WHERE signal_kind='VERIFIED_SUSPENSION_INVESTIGATION';
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_verified_suspension_v1(
 p_owner_id uuid,p_shift_id uuid,p_original_work_id text,p_source_ref text,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $fn$
 SELECT pg_catalog.jsonb_build_object(
  'event_id',u.event_id,'receipt_id',tr.receipt_id,'receipt_sha256',tr.receipt_sha256,
  'prior_head_sha256',tr.continuity_head_sha256,'prior_worker_run_id',run.run_id,
  'prior_event_id',ev.event_id,'prior_release_sha',wake.running_release_sha,
  'prior_release_receipt_sha256',wake.release_receipt_sha256,
  'root_id',u.continuity_root_id,'unresolved_proof_gates',u.payload->'unresolved_proof_gates')
 FROM public.universe_events u
 JOIN public.universe_events prior ON prior.event_id=u.parent_event_id
  AND prior.continuity_root_id=u.continuity_root_id AND prior.worldline_id=u.worldline_id
 JOIN reality_internal.final_loop_transition_receipts_v1 tr
  ON tr.owner_id=p_owner_id AND tr.shift_id=p_shift_id AND tr.original_work_id=p_original_work_id
  AND tr.source_ref=p_source_ref AND tr.continuity_root_id=u.continuity_root_id
  AND tr.continuity_head_sha256='sha256:'||prior.lineage_hash
  AND tr.expected_revision=p_revision-1 AND tr.decision='SUSPEND'
  AND tr.reason_code='PROVIDER_EFFECT_UNCERTAIN'
  AND tr.worker_run_id::text=u.provenance->>'worker_run_id'
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=tr.worker_run_id
  AND run.status='COMPLETED' AND run.finished_at IS NOT NULL
 JOIN reality_internal.final_loop_resume_events_v1 ev ON ev.governed_wake_worker_run_id=run.run_id
  AND ev.owner_id=p_owner_id AND ev.shift_id=p_shift_id AND ev.original_work_id=p_original_work_id
  AND ev.source_ref=p_source_ref AND ev.continuity_head_sha256=tr.continuity_head_sha256
  AND ev.continuity_revision=tr.expected_revision AND ev.state='SHADOW_OBSERVED'
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
  AND wake.owner_id=p_owner_id AND wake.shift_id=p_shift_id AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_worker_release_approvals_v1 old ON old.claim_id=wake.release_claim_id
  AND old.owner_id=p_owner_id AND old.shift_id=p_shift_id AND old.release_sha=wake.running_release_sha
  AND old.state='CLAIMED_ONCE' AND old.provider_alias_observed_at IS NOT NULL
 WHERE u.entity_type='reality_final_loop_invocation_observation_v1' AND u.epistemic_status='OBSERVED'
  AND 'sha256:'||u.lineage_hash=p_head AND p_revision>1
  AND u.payload->>'owner_id'=p_owner_id::text AND u.payload->>'shift_id'=p_shift_id::text
  AND u.payload->>'original_work_id'=p_original_work_id AND u.payload->>'source_ref'=p_source_ref
  AND u.payload->>'provider_outcome_verified'='false' AND u.payload->>'original_job_completed'='false'
  AND u.payload->>'execution_authorized'='false' AND u.payload->>'replay_authorized'='false'
  AND u.payload->>'production_changed'='false'
  AND u.payload->'unresolved_proof_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'
  AND u.payload->'terminal_recovery_history'->>'remaining_attempts'='0'
  AND u.payload->'terminal_recovery_history'->>'replay_permitted'='false'
  AND tr.receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND wake.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
     public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
  AND u.provenance->'continuity_spine'->>'prior_lineage_hash'=prior.lineage_hash
  AND u.provenance->'continuity_spine'->>'source_event_id'=prior.event_id::text
  AND NOT EXISTS(SELECT 1 FROM public.universe_events newer
    WHERE newer.continuity_root_id=u.continuity_root_id
     AND newer.payload->>'owner_id'=p_owner_id::text AND newer.payload->>'shift_id'=p_shift_id::text
     AND (newer.assertion_time,newer.event_id)>(u.assertion_time,u.event_id))
  AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 sub
    WHERE sub.shift_id=p_shift_id AND sub.owner_id=p_owner_id AND sub.original_work_id=p_original_work_id
     AND sub.source_ref=p_source_ref AND sub.condition_kind='QUALIFIER_PROOF_CHANGED'
     AND sub.continuity_head_sha256=p_head AND sub.continuity_revision=p_revision AND sub.state='SUSPENDED')
  AND EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 sh
    JOIN reality_internal.governed_employee_completion_warrants_v1 w
     ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
    WHERE sh.shift_id=p_shift_id AND sh.owner_id=p_owner_id AND sh.closed_at IS NULL
     AND sh.authorized_at IS NOT NULL AND sh.planned_start_at<=pg_catalog.clock_timestamp()
     AND sh.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
     AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) item WHERE item->>'source_ref'=p_source_ref))
 ORDER BY u.assertion_time DESC,u.event_id DESC LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_verified_suspension_v1(uuid,uuid,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_verified_suspension_v1(uuid,uuid,text,text,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_release_continuation_v1(p_request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a record; old_event record; fresh_id uuid; suspension jsonb; qsub record; causal text;
BEGIN
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
 AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.release_continuation_claim_id=r.claim_id)
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
 -- Catch up from the independently observed current successor only after
 -- exact release approval and provider readback; never fake a qualifier delta.
 suspension:=reality_internal.read_final_loop_verified_suspension_v1(a.owner_id,a.shift_id,
  a.runtime_scope->>'original_work_id',a.runtime_scope->>'source_ref',
  a.runtime_scope->>'continuity_head_sha256',(a.runtime_scope->>'continuity_revision')::bigint);
 IF suspension IS NOT NULL AND suspension->>'prior_release_sha'<>a.release_sha THEN
  SELECT * INTO qsub FROM reality_internal.final_loop_resume_conditions_v1 sub
   WHERE sub.owner_id=a.owner_id AND sub.shift_id=a.shift_id AND sub.original_work_id=a.runtime_scope->>'original_work_id'
    AND sub.source_ref=a.runtime_scope->>'source_ref' AND sub.condition_kind='QUALIFIER_PROOF_CHANGED'
    AND sub.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
    AND sub.continuity_revision::text=a.runtime_scope->>'continuity_revision'
    AND sub.subscribed_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
    AND sub.state='SUSPENDED' FOR UPDATE;
  IF NOT FOUND OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 prior
   WHERE prior.shift_id=a.shift_id AND prior.original_work_id=a.runtime_scope->>'original_work_id'
    AND (prior.state='SHADOW_PENDING' OR (prior.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
     AND prior.source_receipt_sha256=suspension->>'receipt_sha256'))) THEN RETURN NULL;END IF;
  INSERT INTO reality_internal.final_loop_resume_conditions_v1(
   shift_id,owner_id,original_work_id,source_ref,condition_kind,subscribed_receipt_sha256,
   continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
  VALUES(a.shift_id,a.owner_id,qsub.original_work_id,qsub.source_ref,'VERIFIED_SUSPENSION_INVESTIGATION',
   qsub.subscribed_receipt_sha256,qsub.continuity_head_sha256,qsub.continuity_revision,
   'INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY',suspension->'unresolved_proof_gates','RECOVER','SUSPENDED')
  ON CONFLICT(shift_id,original_work_id,condition_kind) DO NOTHING;
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
 SELECT e.* INTO old_event FROM reality_internal.final_loop_resume_events_v1 e
 JOIN reality_internal.final_loop_resume_conditions_v1 c
  ON c.shift_id=e.shift_id AND c.owner_id=e.owner_id AND c.original_work_id=e.original_work_id
   AND c.condition_kind=e.signal_kind AND c.source_ref=e.source_ref
   AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.continuity_revision=e.continuity_revision
   AND c.subscribed_receipt_sha256=e.previous_receipt_sha256
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 prev ON prev.worker_run_id=e.governed_wake_worker_run_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=prev.worker_run_id
 WHERE e.shift_id=a.shift_id AND e.owner_id=a.owner_id AND e.original_work_id=a.runtime_scope->>'original_work_id'
  AND e.source_ref=a.runtime_scope->>'source_ref' AND e.signal_kind='QUALIFIER_PROOF_CHANGED'
  AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND e.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
  AND e.continuity_revision::text=a.runtime_scope->>'continuity_revision'
  AND e.source_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
  AND e.governed_wake_request_id IS NOT NULL AND run.status='COMPLETED' AND run.finished_at IS NOT NULL
  AND prev.running_release_sha<>a.release_sha AND prev.owner_id=a.owner_id AND prev.shift_id=a.shift_id
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
 ORDER BY run.finished_at DESC LIMIT 1;
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
 RETURN fresh_id;
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.stage_final_loop_release_continuation_v1(uuid)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid DEFAULT NULL)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE w record; l record; e record; target text; token text; bypass text;
        req bigint; now_at timestamptz:=pg_catalog.clock_timestamp(); is_start boolean;
        approved_sha text; nonce uuid; wake_event_id uuid; release_claim uuid; review_release boolean:=false;
BEGIN
 -- Reuse the existing Vault credentials; never expose or copy their values.
 -- Transport is deliberately inert until an independently qualified canonical
 -- release is activated, its completed signed worker receipt is observed, and
 -- the exact release is pinned in the canonical transport configuration.
 SELECT max(decrypted_secret) FILTER (WHERE name='reality_final_loop_canonical_worker_url_v1'),
        max(decrypted_secret) FILTER (WHERE name='reality_riley_preview_worker_token_20261107'),
        max(decrypted_secret) FILTER (WHERE name='reality_riley_preview_vercel_bypass_20261107'),
        max(decrypted_secret) FILTER (WHERE name='reality_final_loop_canonical_worker_release_sha_v1')
 INTO target,token,bypass,approved_sha FROM vault.decrypted_secrets
 WHERE name IN ('reality_final_loop_canonical_worker_url_v1','reality_riley_preview_worker_token_20261107',
 'reality_riley_preview_vercel_bypass_20261107','reality_final_loop_canonical_worker_release_sha_v1');
 IF token IS NULL OR token !~ '^[a-f0-9]{64}$'
 OR bypass IS NULL OR length(bypass)<10 THEN RETURN NULL; END IF;
 -- Never preempt the actual running worker. The release trigger drains a new
 -- event after its lease is released, not after an arbitrary cooldown.
 SELECT * INTO l FROM reality_internal.governed_preview_shift_worker_leases_v1
 WHERE worker_key='preview-governed-employee-shift-worker' FOR UPDATE;
 -- Refresh the clock after waiting for the lease row: a release may have
 -- committed while this notifier was waiting for that same row lock.
 IF FOUND AND l.lease_expires_at>pg_catalog.clock_timestamp() THEN RETURN NULL;END IF;
 now_at:=pg_catalog.clock_timestamp();
 IF (SELECT count(*) FROM reality_internal.governed_employee_shifts_v1 s
     JOIN reality_internal.governed_employee_completion_warrants_v1 x
       ON x.shift_id=s.shift_id AND x.owner_id=s.owner_id AND x.plan_fingerprint=s.plan_fingerprint
     WHERE s.closed_at IS NULL AND s.authorized_at IS NOT NULL
       AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
       AND s.planned_start_at<=now_at AND s.planned_end_at='infinity'::timestamptz
       AND x.state='ACTIVE')<>1 THEN RETURN NULL; END IF;
 SELECT x.* INTO w FROM reality_internal.governed_employee_completion_warrants_v1 x
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=x.shift_id AND s.owner_id=x.owner_id AND s.plan_fingerprint=x.plan_fingerprint
 WHERE (p_shift_id IS NULL OR x.shift_id=p_shift_id)
  AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.planned_start_at<=now_at AND s.planned_end_at='infinity'::timestamptz
  AND x.state='ACTIVE' AND x.mode IN ('UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS',
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS')
  AND x.plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'
 FOR UPDATE OF x SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- A verified one-use review release supplies its own pinned alias/commit.
 -- The provider GET readback is recorded only by the trusted release
 -- controller after delivery. The receiver still must attest before work.
 SELECT a.claim_id,a.release_sha INTO release_claim,approved_sha
 FROM reality_internal.governed_worker_release_approvals_v1 a
 WHERE a.owner_id=w.owner_id AND a.shift_id=w.shift_id
 AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND a.state='CLAIMED_ONCE' AND a.claim_id IS NOT NULL
 AND a.scheduled_alias='reality-signed-worker-maloney2323-5310s-projects.vercel.app'
 AND a.provider_alias_observed_at>=a.claimed_at
 AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
 AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false'
 ORDER BY a.provider_alias_observed_at DESC LIMIT 1;
 IF FOUND THEN
  review_release:=true;
  target:='https://'||'reality-signed-worker-maloney2323-5310s-projects.vercel.app'||'/api/reality/governed-employee-shift-worker';
 ELSE
 -- Legacy releases still require their existing Vault pin and completed witness.
 SELECT max(decrypted_secret) FILTER(WHERE name='reality_final_loop_canonical_worker_url_v1'),
        max(decrypted_secret) FILTER(WHERE name='reality_final_loop_canonical_worker_release_sha_v1')
 INTO target,approved_sha FROM vault.decrypted_secrets
 WHERE name IN('reality_final_loop_canonical_worker_url_v1','reality_final_loop_canonical_worker_release_sha_v1');
 IF target IS DISTINCT FROM 'https://reality-signed-worker-maloney2323-5310s-projects.vercel.app/api/reality/governed-employee-shift-worker'
 OR approved_sha IS NULL OR approved_sha !~ '^[a-f0-9]{40}$' THEN RETURN NULL; END IF;
 SELECT a.claim_id INTO release_claim FROM reality_internal.governed_worker_release_approvals_v1 a
 WHERE a.owner_id=w.owner_id AND a.shift_id=w.shift_id AND a.release_sha=approved_sha
 AND a.state='CLAIMED_ONCE' AND a.scheduled_alias='reality-signed-worker-maloney2323-5310s-projects.vercel.app'
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false' AND a.runtime_scope->>'parent_delivery_enabled'='false'
 AND EXISTS(SELECT 1 FROM reality_internal.governed_signed_worker_release_wakes_v1 v
   JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=v.worker_run_id
   WHERE v.release_claim_id=a.claim_id AND v.owner_id=w.owner_id AND v.shift_id=w.shift_id
   AND v.running_release_sha=a.release_sha AND v.running_release_ref=a.release_ref
   AND a.capability_key=ANY(v.registered_capabilities) AND run.status='COMPLETED'
   AND run.worker_stage='WORKER_RESPONSE_PUBLICATION' AND run.finished_at IS NOT NULL)
 ORDER BY a.claimed_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 is_start:=NOT review_release AND w.governed_start_requested_at IS NOT NULL AND w.governed_start_request_id IS NULL
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shift_worker_pulses_v1 p
   WHERE p.shift_id=w.shift_id AND p.owner_id=w.owner_id
    AND p.last_worker_seen_at>=w.governed_start_requested_at);
 IF NOT is_start THEN
  -- Reuse the existing event inbox; one new current source receipt is a hint.
  -- The receiver MUST run the shared Continuity guard and governed policy again.
  SELECT ev.* INTO e FROM reality_internal.final_loop_resume_events_v1 ev
  JOIN reality_internal.final_loop_resume_conditions_v1 c
   ON c.owner_id=ev.owner_id AND c.shift_id=ev.shift_id AND c.original_work_id=ev.original_work_id
    AND c.source_ref=ev.source_ref AND c.condition_kind=ev.signal_kind
    AND c.continuity_revision=ev.continuity_revision
    AND c.continuity_head_sha256=ev.continuity_head_sha256
    AND c.subscribed_receipt_sha256=ev.previous_receipt_sha256
  WHERE ev.shift_id=w.shift_id AND ev.owner_id=w.owner_id AND ev.state='SHADOW_PENDING'
   AND ev.governed_wake_requested_at IS NOT NULL AND ev.governed_wake_request_id IS NULL
   AND (ev.release_continuation_claim_id IS NULL OR (review_release AND ev.release_continuation_claim_id=release_claim))
   AND ev.source_receipt_sha256<>ev.previous_receipt_sha256
   AND (NOT review_release OR (
    ((ev.signal_kind='QUALIFIER_PROOF_CHANGED' AND ev.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM')
     OR (ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND ev.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
      AND ev.release_continuation_claim_id=release_claim))
    AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
     WHERE a.claim_id=release_claim AND a.runtime_scope->>'original_work_id'=ev.original_work_id
     AND a.runtime_scope->>'source_ref'=ev.source_ref)))
   -- A distinct current qualifier receipt at a terminal boundary can request
   -- evidence-only investigation. The worker MUST preserve the hard budget;
   -- the existing verifier route cannot dispatch old CI for this action.
   AND (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' OR
    (ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND review_release
     AND ev.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
     AND ev.release_continuation_claim_id=release_claim) OR
    (ev.signal_kind='QUALIFIER_PROOF_CHANGED' AND ev.signal_next_action IN
     ('VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
      'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY',
      'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM')))
   AND ev.event_causality_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    ev.shift_id::text||'|'||ev.original_work_id||'|'||ev.continuity_head_sha256||'|'||
    ev.continuity_revision::text||'|'||ev.previous_receipt_sha256||'|'||ev.source_receipt_sha256,'UTF8')),'hex')
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) item
    WHERE item->>'source_ref'=ev.source_ref)
   AND ((ev.signal_kind='QUALIFIER_PROOF_CHANGED' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_continuity_qualification_routes_v1 q
     WHERE q.owner_id=ev.owner_id AND q.source_ref=ev.source_ref
      AND q.reconciliation_receipt_sha256=ev.source_receipt_sha256
      AND q.reconciliation_snapshot->>'shift_id'=ev.shift_id::text
      AND q.reconciliation_snapshot->>'original_candidate_work_id'=ev.original_work_id
      AND q.reconciliation_next_action=ev.signal_next_action
      AND (
       (ev.signal_next_action='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'
        AND NOT coalesce(q.reconciliation_snapshot->'unsatisfied_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED',false))
       OR (ev.signal_next_action='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
        AND q.reconciliation_snapshot->>'recovery_terminal_boundary'='true'
        AND q.reconciliation_snapshot->'unsatisfied_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'original_work_id'=ev.original_work_id
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'remaining_attempts'='0'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'replay_permitted'='false'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'new_attempt_authorized'='false'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'last_attempt_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'last_decision_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$')
       -- A different, independently accepted review effect may qualify
       -- even when its maintenance strategy is terminal. Do not transport
       -- it through an unqualified maintenance/packet-only release.
       OR (ev.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
        AND q.reconciliation_snapshot->>'review_scope_qualified'='true'
        AND q.reconciliation_snapshot->>'review_authority_scope'='EXACT_ACCEPTED_READ_ONLY_REVIEW'
        AND q.reconciliation_snapshot->>'exact_goal_event_verified'='true'
        AND q.reconciliation_snapshot->>'exact_acceptance_approval_verified'='true'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'effect_type'='READ_ONLY_INTERNAL_PR_REVIEW'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'owner_id'=ev.owner_id::text
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'shift_id'=ev.shift_id::text
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'parent_original_work_id'=ev.original_work_id
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'source_ref'=ev.source_ref
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'plan_fingerprint'=w.plan_fingerprint
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'execution_authorized'='false'
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'owner_approval_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
        AND pg_catalog.to_regprocedure('public.reality_claim_final_loop_child_review_v1(uuid,uuid,jsonb)') IS NOT NULL
        AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
         WHERE a.claim_id=release_claim AND a.owner_id=ev.owner_id AND a.shift_id=ev.shift_id
          AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
          AND a.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
          AND a.runtime_scope->>'original_work_id'=ev.original_work_id
          AND a.runtime_scope->>'source_ref'=ev.source_ref
          AND a.runtime_scope->>'plan_fingerprint'=w.plan_fingerprint
          AND a.runtime_scope->>'independent_qualification_branch_verified'='true'
          AND a.runtime_scope->>'independent_gateway_ci_verified'='true'
          AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
          AND a.provider_alias_observed_at>=a.claimed_at
          AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
          AND a.runtime_scope->>'child_execution_enabled'='false'
          AND a.runtime_scope->>'parent_delivery_enabled'='false'
          AND a.runtime_scope->>'production_changed'='false'
          AND a.independent_isolation_proof_sha256 ~ '^sha256:[a-f0-9]{64}$')))
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed))
    OR (ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND review_release
     AND ev.release_continuation_claim_id=release_claim
     AND ev.source_receipt_sha256=(reality_internal.read_final_loop_verified_suspension_v1(
      ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision)->>'receipt_sha256')
     AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
       WHERE a.claim_id=release_claim AND a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
        AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text
        AND a.runtime_scope->>'qualifier_receipt_sha256'=ev.previous_receipt_sha256))
   )
  ORDER BY ev.created_at,ev.event_id LIMIT 1 FOR UPDATE OF ev SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 -- A new authorized start or current evidence can clear only the idle cooldown.
 UPDATE reality_internal.governed_preview_shift_worker_leases_v1
 SET next_wake_at=now_at WHERE worker_key='preview-governed-employee-shift-worker'
  AND lease_expires_at<=now_at;
 nonce:=pg_catalog.gen_random_uuid();
 wake_event_id:=CASE WHEN is_start THEN w.shift_id ELSE e.event_id END;
 req:=net.http_post(url:=target,body:='{}'::jsonb,headers:=pg_catalog.jsonb_build_object(
  'Authorization','Bearer '||token,'x-vercel-protection-bypass',bypass,
  'Content-Type','application/json','x-reality-governed-owner-id',w.owner_id::text,
  'x-reality-governed-shift-id',w.shift_id::text,'x-reality-governed-plan-fingerprint',w.plan_fingerprint,
  'x-reality-governed-event-id',wake_event_id::text,'x-reality-governed-wake-nonce',nonce::text,
  'x-reality-governed-wake-kind',CASE WHEN is_start THEN 'START' ELSE 'RESUME' END,
  'x-reality-governed-release-sha',approved_sha),
  timeout_milliseconds:=45000);
 IF req IS NULL OR req<1 THEN RAISE EXCEPTION 'GOVERNED_WAKE_TRANSPORT_UNVERIFIED';END IF;
 IF is_start THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_request_id=req,governed_start_queued_at=now_at,governed_start_nonce=nonce WHERE shift_id=w.shift_id;
 ELSE
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_request_id=req,governed_wake_queued_at=now_at,governed_wake_nonce=nonce WHERE event_id=e.event_id;
 END IF;
 RETURN req;
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;


CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
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
   PERFORM reality_internal.stage_final_loop_release_continuation_v1(NEW.request_id);
   PERFORM reality_internal.notify_final_loop_governed_trigger_v1(NEW.shift_id);
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;


CREATE OR REPLACE FUNCTION public.reality_record_review_release_alias_observation_v1(
 p_owner_id uuid,p_shift_id uuid,p_release_sha text,p_release_ref text,
 p_scheduled_alias text,p_deployment_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a record; n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'REVIEW_RELEASE_OBSERVATION_SERVICE_ONLY';END IF;
 IF p_scheduled_alias IS DISTINCT FROM 'reality-signed-worker-maloney2323-5310s-projects.vercel.app'
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_deployment_id,'') !~ '^dpl_[A-Za-z0-9_-]{8,75}$'
 THEN RETURN jsonb_build_object('status','REVIEW_RELEASE_ALIAS_SCOPE_UNVERIFIED');END IF;
 SELECT * INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 WHERE r.owner_id=p_owner_id AND r.shift_id=p_shift_id AND r.release_sha=p_release_sha
 AND r.release_ref=p_release_ref AND r.scheduled_alias=p_scheduled_alias
 AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.state='CLAIMED_ONCE' AND r.claim_id IS NOT NULL AND r.approval_receipt_sha256 IS NOT NULL
 AND r.runtime_scope->>'target_deployment_id'=p_deployment_id
 AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND r.runtime_scope->>'independent_transport_proof_sha256' ~ '^sha256:[a-f0-9]{64}$'
 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','REVIEW_RELEASE_ALIAS_CLAIM_UNVERIFIED');END IF;
 IF a.provider_alias_observed_at IS NOT NULL THEN
  RETURN jsonb_build_object('status','REVIEW_RELEASE_ALIAS_ALREADY_OBSERVED_NO_REPLAY','original_job_completed',false);
 END IF;
 IF NOT coalesce(reality_internal.canonical_worker_release_scope_current_v1(p_owner_id,p_shift_id,p_scheduled_alias,a.runtime_scope),false)
 THEN RETURN jsonb_build_object('status','REVIEW_RELEASE_ALIAS_CONTINUITY_DRIFT');END IF;
 UPDATE reality_internal.governed_worker_release_approvals_v1
 SET provider_alias_observed_at=pg_catalog.clock_timestamp(),provider_alias_observed_deployment_id=p_deployment_id
 WHERE request_id=a.request_id AND provider_alias_observed_at IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN jsonb_build_object('status',CASE WHEN n=1 THEN 'REVIEW_RELEASE_ALIAS_OBSERVED_GOVERNED_TRIGGER_NOTIFIED' ELSE 'REVIEW_RELEASE_ALIAS_OBSERVATION_UNVERIFIED' END,
  'shift_id',p_shift_id,'release_sha',p_release_sha,'deployment_id',p_deployment_id,
  'wake_queued',EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
    WHERE e.shift_id=p_shift_id AND e.owner_id=p_owner_id
    AND e.original_work_id=a.runtime_scope->>'original_work_id'
    AND e.source_ref=a.runtime_scope->>'source_ref' AND e.state='SHADOW_PENDING'
    AND (e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
      OR (e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
       AND e.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
       AND e.release_continuation_claim_id=a.claim_id))
    AND e.governed_wake_request_id IS NOT NULL
    AND e.governed_wake_queued_at>=a.claimed_at
    AND (e.release_continuation_claim_id=a.claim_id OR e.release_continuation_claim_id IS NULL)),
  'owner_approval_granted',false,'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_review_release_alias_observation_v1(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_review_release_alias_observation_v1(uuid,uuid,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_claim_canonical_governed_wake_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_nonce uuid,p_kind text,p_release_sha text,p_worker_run_id uuid,p_lease_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE n int:=0; claimed_event record; investigation_only boolean:=false;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CANONICAL_WAKE_SERVICE_ONLY';END IF;
 IF p_nonce IS NULL OR p_event_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('START','RESUME')
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_plan_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.owner_id=s.owner_id AND w.shift_id=s.shift_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE s.owner_id=p_owner_id AND s.shift_id=p_shift_id AND s.plan_fingerprint=p_plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
 AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_release_sha
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','CANONICAL_GOVERNED_WAKE_SCOPE_UNVERIFIED','execution_authorized',false);END IF;
 IF p_kind='START' AND p_event_id=p_shift_id THEN
 UPDATE reality_internal.governed_employee_completion_warrants_v1 w
 SET governed_start_worker_run_id=p_worker_run_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
 AND w.state='ACTIVE' AND w.governed_start_nonce=p_nonce AND w.governed_start_request_id IS NOT NULL
 AND w.governed_start_worker_run_id IS NULL AND w.governed_start_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 GET DIAGNOSTICS n=ROW_COUNT;
 ELSIF p_kind='RESUME' THEN
 UPDATE reality_internal.final_loop_resume_events_v1 e SET governed_wake_worker_run_id=p_worker_run_id
 WHERE e.owner_id=p_owner_id AND e.shift_id=p_shift_id AND e.event_id=p_event_id
 AND e.state='SHADOW_PENDING' AND e.governed_wake_nonce=p_nonce AND e.governed_wake_request_id IS NOT NULL
 AND (e.release_continuation_claim_id IS NULL OR EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
  WHERE a.claim_id=e.release_continuation_claim_id AND a.release_sha=p_release_sha AND a.state='CLAIMED_ONCE'
  AND a.owner_id=e.owner_id AND a.shift_id=e.shift_id AND a.runtime_scope->>'original_work_id'=e.original_work_id
  AND a.runtime_scope->>'source_ref'=e.source_ref AND a.provider_alias_observed_at>=a.claimed_at))
 AND e.governed_wake_worker_run_id IS NULL AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id AND c.source_ref=e.source_ref
  AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
  AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=1 THEN
  SELECT * INTO claimed_event FROM reality_internal.final_loop_resume_events_v1 e
   WHERE e.event_id=p_event_id AND e.governed_wake_worker_run_id=p_worker_run_id;
  IF claimed_event.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' THEN
   IF claimed_event.signal_next_action<>'INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
    OR claimed_event.release_continuation_claim_id IS NULL
    OR claimed_event.source_receipt_sha256 IS DISTINCT FROM (reality_internal.read_final_loop_verified_suspension_v1(
      claimed_event.owner_id,claimed_event.shift_id,claimed_event.original_work_id,claimed_event.source_ref,
      claimed_event.continuity_head_sha256,claimed_event.continuity_revision)->>'receipt_sha256')
   THEN RAISE EXCEPTION 'SUSPENSION_INVESTIGATION_CLAIM_PROOF_UNVERIFIED';END IF;
   investigation_only:=true;
  END IF;
 END IF;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN n=1 THEN 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' ELSE 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,
 'investigation_only',investigation_only,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) TO service_role;

-- Read the typed suspension receipt without inventing a changed qualifier.
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
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',e.event_id,'original_work_id',e.original_work_id,
  'source_ref',e.source_ref,'event_kind',e.signal_kind,
  'source_receipt_sha256',e.source_receipt_sha256,
  'event_causality_sha256',e.event_causality_sha256,
  'event_state',e.state,
  'continuity_revision',e.continuity_revision,
  'signal_next_action',e.signal_next_action,

  'source_current',case
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
   end,

  'would_resume_suspended_obligation',e.state='SHADOW_PENDING' AND
   e.continuity_revision=(v_proof->>'revision')::bigint AND
   e.continuity_head_sha256=v_proof->>'continuity_head_sha256' AND
  case when e.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' then coalesce(
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
  end
 ) ORDER BY e.created_at),'[]'::jsonb) INTO v_events
 FROM reality_internal.final_loop_resume_events_v1 e
 WHERE e.shift_id=p_shift_id AND e.owner_id=(v_proof->>'owner_id')::uuid;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-event-resume-shadow-v1',
  'status','FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',
  'shift_id',p_shift_id,'subscriptions',v_subs,'events',v_events,
  'event_dispatch_enabled',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(uuid) FROM PUBLIC,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_event_resume_shadow_v1(uuid) TO service_role;

