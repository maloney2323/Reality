-- Retain one ordinary continuation per claim and revision; independently
-- verified suspension receipts are still unique across all releases.
-- No prior event, nonce, claim or historical approval is reset.
DROP INDEX IF EXISTS reality_internal.final_loop_release_continuation_once_v1;
CREATE UNIQUE INDEX final_loop_release_continuation_once_v1
 ON reality_internal.final_loop_resume_events_v1(release_continuation_claim_id,continuity_revision)
 WHERE release_continuation_claim_id IS NOT NULL AND ledger_return_condition_sha256 IS NULL
 AND signal_kind NOT IN ('VERIFIED_INVESTIGATION_REVIEW','VERIFIED_REVIEW_TECHNICAL_EVIDENCE');
-- Derive an evidence-only operational binding from a consumed release.
-- NEVER update the original release approval, mint authority or enable child/parent delivery.
-- The first supported successor is the existing independently verified suspension return.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_release_successor_scope_v1(p_claim_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE a record; g jsonb; p jsonb; ob jsonb; sus jsonb; rev bigint; head text; n int;
BEGIN
 IF current_user NOT IN ('postgres','service_role') OR p_claim_id IS NULL THEN RETURN NULL; END IF;
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 JOIN reality_internal.governed_employee_shifts_v1 s ON s.shift_id=r.shift_id AND s.owner_id=r.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 WHERE r.claim_id=p_claim_id AND r.state='CLAIMED_ONCE'
  AND r.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND r.provider_alias_observed_at>=r.claimed_at
  AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
  AND r.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
  AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
  AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND r.runtime_scope->>'independent_gateway_ci_verified'='true'
  AND r.runtime_scope->>'independent_qualification_branch_verified'='true'
  AND r.runtime_scope->>'independent_transport_proof_sha256'~'^sha256:[a-f0-9]{64}$'
  AND r.runtime_scope->>'child_execution_enabled'='false'
  AND r.runtime_scope->>'parent_delivery_enabled'='false'
  AND r.runtime_scope->>'production_changed'='false'
  AND r.runtime_scope->>'plan_fingerprint'=s.plan_fingerprint
  AND r.runtime_scope->>'continuity_revision'~'^[1-9][0-9]{0,8}$'
  AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_start_at<=pg_catalog.clock_timestamp() AND s.planned_end_at>pg_catalog.clock_timestamp()
  AND s.status IN ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) z WHERE z->>'source_ref'=r.runtime_scope->>'source_ref')
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id AND newer.capability_key=r.capability_key AND newer.state='CLAIMED_ONCE' AND newer.provider_alias_observed_at>r.provider_alias_observed_at);
 IF NOT FOUND THEN RETURN NULL; END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(a.shift_id);
 p:=public.reality_read_current_final_loop_proof_envelope_v1(a.shift_id);
 rev:=(a.runtime_scope->>'continuity_revision')::bigint+1;
 head:=g->>'continuity_head_sha256';
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR g->>'owner_id' IS DISTINCT FROM a.owner_id::text OR g->>'shift_id' IS DISTINCT FROM a.shift_id::text
  OR g->>'continuity_root_id' IS DISTINCT FROM a.runtime_scope->>'continuity_root_id'
  OR g->>'revision' IS DISTINCT FROM rev::text
  OR head IS NULL OR head=a.runtime_scope->>'continuity_head_sha256'
  OR g->>'execution_authorized' IS DISTINCT FROM 'false'
  OR g->>'original_job_completed' IS DISTINCT FROM 'false'
  OR g->>'production_changed' IS DISTINCT FROM 'false'
  OR g->>'no_new_executable_authority' IS DISTINCT FROM 'true'
  OR g->>'unverified_handoffs' IS DISTINCT FROM '0'
  OR g->>'worldline_parent_links_verified' IS DISTINCT FROM 'true'
  OR g->>'shift_scope_authority_event_present' IS DISTINCT FROM 'true'
  OR p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR p->>'owner_id' IS DISTINCT FROM a.owner_id::text
  OR p->>'shift_id' IS DISTINCT FROM a.shift_id::text
  OR p->>'plan_fingerprint' IS DISTINCT FROM a.runtime_scope->>'plan_fingerprint'
  OR p->>'continuity_root_id' IS DISTINCT FROM g->>'continuity_root_id'
  OR p->>'continuity_head_sha256' IS DISTINCT FROM head
  OR p->>'revision' IS DISTINCT FROM rev::text
  OR p->>'frozen_shift_scope_sha256' IS DISTINCT FROM g->>'frozen_shift_scope_sha256'
  OR pg_catalog.jsonb_typeof(g->'obligations') IS DISTINCT FROM 'array'
 THEN RETURN NULL; END IF;
 SELECT count(*) INTO n FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x->>'original_work_id'=a.runtime_scope->>'original_work_id'
 AND x->>'source_ref'=a.runtime_scope->>'source_ref'
 AND x->>'qualifier_receipt_sha256'=a.runtime_scope->>'qualifier_receipt_sha256'
 AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true' AND x->>'source_proof_verified'='true'
 AND x->>'independent_original_outcome_verified'='false' AND x->>'execution_permitted_by_handoff'='false'
 AND x->>'next_qualified_action'='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 IF n<>1 THEN RETURN NULL; END IF;
 sus:=reality_internal.read_final_loop_verified_suspension_v1(a.owner_id,a.shift_id,a.runtime_scope->>'original_work_id',a.runtime_scope->>'source_ref',head,rev);
 IF sus IS NULL OR sus->>'prior_head_sha256' IS DISTINCT FROM a.runtime_scope->>'continuity_head_sha256'
 OR sus->>'root_id' IS DISTINCT FROM a.runtime_scope->>'continuity_root_id'
 OR sus->>'prior_release_sha' IS DISTINCT FROM a.release_sha
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_signed_worker_release_wakes_v1 w
  JOIN reality_internal.final_loop_resume_events_v1 e ON e.governed_wake_worker_run_id=w.worker_run_id AND e.release_continuation_claim_id=w.release_claim_id
  WHERE w.worker_run_id::text=sus->>'prior_worker_run_id' AND w.release_claim_id=a.claim_id AND w.owner_id=a.owner_id AND w.shift_id=a.shift_id
   AND e.event_id::text=sus->>'prior_event_id' AND e.state='SHADOW_OBSERVED' AND e.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
   AND e.continuity_revision=(a.runtime_scope->>'continuity_revision')::bigint AND e.original_work_id=a.runtime_scope->>'original_work_id' AND e.source_ref=a.runtime_scope->>'source_ref')
 THEN RETURN NULL; END IF;
 RETURN pg_catalog.jsonb_build_object('continuity_head_sha256',head,'continuity_revision',rev,
  'qualifier_receipt_sha256',a.runtime_scope->>'qualifier_receipt_sha256','suspension_receipt_sha256',sus->>'receipt_sha256',
  'original_work_id',a.runtime_scope->>'original_work_id','source_ref',a.runtime_scope->>'source_ref',
  'release_claim_id',a.claim_id,'execution_authorized',false,'replay_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_release_successor_scope_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_release_successor_scope_v1(uuid) TO service_role;

-- The same event-specific proof must be present at dispatch AND signed claim.
CREATE OR REPLACE FUNCTION reality_internal.final_loop_release_successor_matches_v1(p_claim uuid,p_owner uuid,p_shift uuid,p_work text,p_source text,p_head text,p_revision bigint)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT coalesce(EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
 CROSS JOIN LATERAL (SELECT reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id) v) q
 WHERE a.claim_id=p_claim AND a.owner_id=p_owner AND a.shift_id=p_shift
 AND q.v->>'original_work_id'=p_work AND q.v->>'source_ref'=p_source
 AND q.v->>'continuity_head_sha256'=p_head AND q.v->>'continuity_revision'=p_revision::text),false)
$fn$;
REVOKE ALL ON FUNCTION reality_internal.final_loop_release_successor_matches_v1(uuid,uuid,uuid,text,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.final_loop_release_successor_matches_v1(uuid,uuid,uuid,text,text,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid DEFAULT NULL::uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      AND ev.release_continuation_claim_id=release_claim)
     OR (ev.signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND ev.signal_next_action='INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY'
      AND ev.release_continuation_claim_id=release_claim)
     OR (ev.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND ev.signal_next_action='READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY'
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
    (ev.signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND review_release
     AND ev.signal_next_action='INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY'
     AND ev.release_continuation_claim_id=release_claim) OR
    (ev.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND review_release
     AND ev.signal_next_action='READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY'
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
       WHERE a.claim_id=release_claim AND ((a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
        AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text) OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision))
        AND a.runtime_scope->>'qualifier_receipt_sha256'=ev.previous_receipt_sha256))
    OR (ev.signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND review_release
     AND ev.release_continuation_claim_id=release_claim
     AND ev.source_receipt_sha256=(reality_internal.read_final_loop_verified_investigation_v1(
       ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision)->>'investigation_receipt_sha256')
     AND ev.previous_receipt_sha256=(reality_internal.read_final_loop_verified_investigation_v1(
       ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision)->>'suspension_receipt_sha256')
     AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
      WHERE a.claim_id=release_claim AND ((a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
       AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text) OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision))))
    OR (ev.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE' AND review_release
     AND ev.release_continuation_claim_id=release_claim
     AND ev.source_receipt_sha256=(reality_internal.read_final_loop_verified_terminal_review_v1(
      ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision)->>'review_receipt_sha256')
     AND ev.previous_receipt_sha256=(reality_internal.read_final_loop_verified_terminal_review_v1(
      ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision)->>'investigation_receipt_sha256')
     AND EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
       WHERE a.claim_id=release_claim AND ((a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
        AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text) OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision))))
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
END $function$;

CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id uuid, p_worker_run_id uuid, p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE e record; proof jsonb; guard jsonb; suspension jsonb; evidence jsonb; digest text;
 i reality_internal.owner_shift_continuity_incidents_v1%ROWTYPE;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';END IF;
 SELECT ev.*,a.release_sha,a.release_ref,w.release_receipt_sha256 INTO e
 FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=ev.release_continuation_claim_id
  AND a.owner_id=ev.owner_id AND a.shift_id=ev.shift_id AND a.state='CLAIMED_ONCE'
  AND a.runtime_scope->>'original_work_id'=ev.original_work_id AND a.runtime_scope->>'source_ref'=ev.source_ref
  AND ((a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
  AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text) OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision))
  AND a.runtime_scope->>'qualifier_receipt_sha256'=ev.previous_receipt_sha256
  AND a.provider_alias_observed_at>=a.claimed_at
  AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
  AND a.runtime_scope->>'child_execution_enabled'='false' AND a.runtime_scope->>'parent_delivery_enabled'='false'
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
  AND r.status='STARTED' AND r.finished_at IS NULL
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
  AND w.release_claim_id=a.claim_id AND w.owner_id=ev.owner_id AND w.shift_id=ev.shift_id
  AND w.running_release_sha=a.release_sha AND w.running_release_ref=a.release_ref AND w.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse ON pulse.shift_id=ev.shift_id AND pulse.owner_id=ev.owner_id
  AND pulse.last_worker_status='WAKE_RECEIVED' AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 WHERE ev.event_id=p_event_id AND ev.shift_id=p_shift_id AND ev.governed_wake_worker_run_id=p_worker_run_id
  AND ev.state='SHADOW_PENDING' AND ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION'
  AND ev.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
  AND ev.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
  AND EXISTS(SELECT 1 FROM reality_internal.governed_preview_shift_worker_leases_v1 l
    WHERE l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
     AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.started_at>=l.claimed_at)
 FOR UPDATE OF ev;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false);END IF;
 suspension:=reality_internal.read_final_loop_verified_suspension_v1(e.owner_id,e.shift_id,e.original_work_id,e.source_ref,
  e.continuity_head_sha256,e.continuity_revision);
 proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 guard:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF suspension IS NULL OR suspension->>'receipt_sha256' IS DISTINCT FROM e.source_receipt_sha256
  OR proof->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR proof->>'continuity_head_sha256' IS DISTINCT FROM e.continuity_head_sha256
  OR proof->>'revision' IS DISTINCT FROM e.continuity_revision::text
  OR guard->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR guard->>'continuity_head_sha256' IS DISTINCT FROM e.continuity_head_sha256
  OR guard->>'revision' IS DISTINCT FROM e.continuity_revision::text
  OR guard->>'execution_authorized' IS DISTINCT FROM 'false'
  OR guard->>'original_job_completed' IS DISTINCT FROM 'false'
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(guard->'obligations') x
   WHERE x->>'original_work_id'=e.original_work_id AND x->>'source_ref'=e.source_ref
    AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
    AND x->>'source_proof_verified'='true' AND x->>'independent_original_outcome_verified'='false'
    AND x->'execution_spine_readback'->>'status'='SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
    AND x->'execution_spine_readback'->>'canonical_return_event_id'=suspension->>'event_id'
    AND x->'execution_spine_readback'->>'replay_authorized'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false);END IF;
 -- One investigation identity per suspension receipt, including any earlier
 -- same-wake incident; a new release or worker must never reset it.
 IF EXISTS(SELECT 1 FROM reality_internal.owner_shift_continuity_incidents_v1 prior
  WHERE prior.owner_id=e.owner_id AND prior.shift_id=e.shift_id
   AND prior.source_evidence->>'original_work_id'=e.original_work_id
   AND prior.source_evidence->>'verified_suspension_receipt_sha256'=e.source_receipt_sha256)
 THEN RETURN pg_catalog.jsonb_build_object('status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false);END IF;
 evidence:=pg_catalog.jsonb_build_object('schema','reality-signed-final-loop-blocker-v1',
  'owner_id',e.owner_id,'shift_id',e.shift_id,'original_work_id',e.original_work_id,'source_ref',e.source_ref,
  'continuity_root_id',suspension->>'root_id','continuity_head_sha256',e.continuity_head_sha256,
  'continuity_revision',e.continuity_revision,'event_id',e.event_id,'worker_run_id',p_worker_run_id,
  'release_sha',e.release_sha,'release_receipt_sha256',e.release_receipt_sha256,
  'blocker_code','FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED',
  'verified_suspension_event_id',suspension->>'event_id','verified_suspension_receipt_id',suspension->>'receipt_id',
  'verified_suspension_receipt_sha256',suspension->>'receipt_sha256',
  'prior_continuity_head_sha256',suspension->>'prior_head_sha256',
  'unresolved_proof_gates',suspension->'unresolved_proof_gates',
  'investigation_only',true,'root_cause_verified',false,'provider_outcome_verified',false,
  'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,'replay_authorized',false,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(evidence::text,'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(owner_id,shift_id,kind,evidence_key,evidence_sha256,
  error_summary,source_evidence,phase,investigation_lease_id,investigation_claimed_at,investigation_attempts)
 VALUES(e.owner_id,e.shift_id,'SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED',digest,'sha256:'||digest,
  'Verified suspension: independently investigate distinct evidence; preserve original obligation and exhausted recovery budget. No effect replay.',
  evidence,'INVESTIGATION_CLAIMED',pg_catalog.gen_random_uuid(),pg_catalog.clock_timestamp(),1)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO NOTHING RETURNING * INTO i;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false);END IF;
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,'source_evidence',i.source_evidence,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,'failed_source_ref',e.source_ref,
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY','model_inquiry_authorized',true,
  'new_original_jobs_created',0,'execution_authorized',false,'installation_authorized',false,'production_changed',false);
END $function$;

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_terminal_technical_context_v1(p_shift_id uuid, p_event_id uuid, p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE e record; evidence jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'TERMINAL_TECHNICAL_CONTEXT_SERVICE_ONLY';END IF;
 SELECT ev.*,wake.running_release_sha,wake.running_release_ref INTO e FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=p_worker_run_id
  AND run.status='STARTED' AND run.finished_at IS NULL AND run.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
  AND wake.owner_id=ev.owner_id AND wake.shift_id=ev.shift_id AND wake.release_claim_id=ev.release_continuation_claim_id
  AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=wake.release_claim_id
  AND a.owner_id=ev.owner_id AND a.shift_id=ev.shift_id AND a.release_sha=wake.running_release_sha
  AND a.state='CLAIMED_ONCE' AND a.provider_alias_observed_at>=a.claimed_at
  AND ((a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
  AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text) OR reality_internal.final_loop_release_successor_matches_v1(a.claim_id,ev.owner_id,ev.shift_id,ev.original_work_id,ev.source_ref,ev.continuity_head_sha256,ev.continuity_revision))
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse ON pulse.owner_id=ev.owner_id
  AND pulse.shift_id=ev.shift_id AND pulse.last_worker_status='WAKE_RECEIVED'
  AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 WHERE ev.event_id=p_event_id AND ev.shift_id=p_shift_id AND ev.governed_wake_worker_run_id=p_worker_run_id
  AND ev.state='SHADOW_PENDING' AND ev.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
  AND ev.signal_next_action='READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY'
  AND ev.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_CONTEXT_UNVERIFIED',
  'execution_authorized',false,'original_job_completed',false);END IF;
 evidence:=reality_internal.read_final_loop_verified_terminal_review_v1(e.owner_id,e.shift_id,e.original_work_id,e.source_ref,
  e.continuity_head_sha256,e.continuity_revision);
 IF evidence IS NULL OR evidence->>'review_receipt_sha256' IS DISTINCT FROM e.source_receipt_sha256
  OR evidence->>'investigation_receipt_sha256' IS DISTINCT FROM e.previous_receipt_sha256
  OR evidence->>'review_worker_run_id'=p_worker_run_id::text OR evidence->>'investigation_worker_run_id'=p_worker_run_id::text
 THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_CONTEXT_UNVERIFIED',
  'execution_authorized',false,'original_job_completed',false);END IF;
 RETURN evidence||pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY',
  'worker_run_id',p_worker_run_id,'running_release_sha',e.running_release_sha,
  'running_release_ref',e.running_release_ref,'release_claim_id',e.release_continuation_claim_id,
  'event_id',e.event_id,'owner_id',e.owner_id,'shift_id',e.shift_id,'original_work_id',e.original_work_id,
  'source_ref',e.source_ref,'continuity_head_sha256',e.continuity_head_sha256,'continuity_revision',e.continuity_revision,
  'read_only',true,'execution_authorized',false,'original_job_completed',false,'installation_authorized',false,
  'replay_authorized',false,'production_changed',false,'new_attempt_authorized',false,'previous_attempt_budget_preserved',true);
END $function$;

CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_independent_investigation_review_v1(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE successor jsonb; a record; evidence jsonb; sub record; fresh_id uuid; causal text; current_invocation boolean;
BEGIN
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 WHERE r.request_id=p_request_id AND r.state='CLAIMED_ONCE' AND r.claim_id IS NOT NULL
  AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND r.provider_alias_observed_at>=r.claimed_at
  AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
  AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
  AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND r.runtime_scope->>'child_execution_enabled'='false' AND r.runtime_scope->>'parent_delivery_enabled'='false'
  AND r.runtime_scope->>'production_changed'='false'
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
   WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id AND newer.capability_key=r.capability_key
    AND newer.state='CLAIMED_ONCE' AND newer.provider_alias_observed_at>r.provider_alias_observed_at);
 IF NOT FOUND THEN RETURN NULL;END IF;
 successor:=reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id);
 IF successor IS NOT NULL THEN a.runtime_scope:=a.runtime_scope||pg_catalog.jsonb_build_object('continuity_head_sha256',successor->>'continuity_head_sha256','continuity_revision',(successor->>'continuity_revision')::bigint); END IF;
 evidence:=reality_internal.read_final_loop_verified_investigation_v1(a.owner_id,a.shift_id,
  a.runtime_scope->>'original_work_id',a.runtime_scope->>'source_ref',
  a.runtime_scope->>'continuity_head_sha256',(a.runtime_scope->>'continuity_revision')::bigint);
 IF evidence IS NULL THEN RETURN NULL;END IF;
 current_invocation:=coalesce(evidence->>'evidence_kind'='RETURNED_UNRESOLVED_INVOCATION',false);
 SELECT * INTO sub FROM reality_internal.final_loop_resume_conditions_v1 c
 WHERE c.owner_id=a.owner_id AND c.shift_id=a.shift_id AND c.original_work_id=a.runtime_scope->>'original_work_id'
  AND c.source_ref=a.runtime_scope->>'source_ref' AND c.condition_kind='QUALIFIER_PROOF_CHANGED'
  AND c.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
  AND c.continuity_revision::text=a.runtime_scope->>'continuity_revision'
  AND (c.state='SUSPENDED' OR (current_invocation AND c.state='SHADOW_SIGNALED'
   AND c.last_signaled_receipt_sha256=evidence->>'qualifier_receipt_sha256'))
 FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.shift_id=a.shift_id AND e.original_work_id=sub.original_work_id
   AND ((e.state='SHADOW_PENDING' AND NOT coalesce((current_invocation AND e.owner_id=a.owner_id AND e.source_ref=sub.source_ref
    AND e.continuity_head_sha256=sub.continuity_head_sha256 AND e.continuity_revision=sub.continuity_revision
    AND e.signal_kind='QUALIFIER_PROOF_CHANGED' AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
    AND e.source_receipt_sha256=evidence->>'qualifier_receipt_sha256'
    AND e.previous_receipt_sha256=sub.subscribed_receipt_sha256 AND e.governed_wake_request_id IS NOT NULL
    AND e.observed_at IS NULL AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
     JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
     JOIN reality_internal.governed_worker_release_approvals_v1 rel ON rel.claim_id=w.release_claim_id
     WHERE r.run_id=e.governed_wake_worker_run_id AND r.status='COMPLETED' AND r.finished_at IS NOT NULL
      AND r.worker_stage='WORKER_RESPONSE_PUBLICATION' AND w.owner_id=e.owner_id AND w.shift_id=e.shift_id
      AND w.release_claim_id=e.release_continuation_claim_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
      AND rel.owner_id=e.owner_id AND rel.shift_id=e.shift_id AND rel.state='CLAIMED_ONCE'
      AND rel.release_sha=w.running_release_sha AND rel.release_ref=w.running_release_ref
      AND rel.provider_alias_observed_at>=rel.claimed_at AND rel.provider_alias_observed_at<=r.started_at
      AND rel.provider_alias_observed_deployment_id=rel.runtime_scope->>'target_deployment_id'
      AND w.release_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
      AND rel.runtime_scope->>'original_work_id'=e.original_work_id
      AND rel.runtime_scope->>'source_ref'=e.source_ref AND rel.runtime_scope->>'child_execution_enabled'='false'
      AND rel.runtime_scope->>'parent_delivery_enabled'='false' AND rel.runtime_scope->>'production_changed'='false')),false)) OR (e.signal_kind='VERIFIED_INVESTIGATION_REVIEW'
    AND e.source_receipt_sha256=evidence->>'investigation_receipt_sha256'))) THEN RETURN NULL;END IF;
 INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,
  subscribed_receipt_sha256,continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
 VALUES(a.shift_id,a.owner_id,sub.original_work_id,sub.source_ref,'VERIFIED_INVESTIGATION_REVIEW',
  evidence->>'suspension_receipt_sha256',sub.continuity_head_sha256,sub.continuity_revision,
  'INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY',evidence->'unresolved_proof_gates','RECOVER','SUSPENDED')
 ON CONFLICT(shift_id,original_work_id,condition_kind) DO UPDATE SET subscribed_receipt_sha256=EXCLUDED.subscribed_receipt_sha256,updated_at=pg_catalog.clock_timestamp()
 WHERE successor IS NOT NULL AND final_loop_resume_conditions_v1.owner_id=EXCLUDED.owner_id
 AND final_loop_resume_conditions_v1.source_ref=EXCLUDED.source_ref
 AND final_loop_resume_conditions_v1.continuity_head_sha256=EXCLUDED.continuity_head_sha256
 AND final_loop_resume_conditions_v1.continuity_revision=EXCLUDED.continuity_revision
 AND final_loop_resume_conditions_v1.state='SUSPENDED'
 AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e WHERE e.shift_id=EXCLUDED.shift_id
 AND e.original_work_id=EXCLUDED.original_work_id AND e.signal_kind=EXCLUDED.condition_kind
 AND e.continuity_revision=EXCLUDED.continuity_revision);
 IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=a.owner_id AND c.shift_id=a.shift_id AND c.original_work_id=sub.original_work_id
   AND c.source_ref=sub.source_ref AND c.condition_kind='VERIFIED_INVESTIGATION_REVIEW'
   AND c.continuity_head_sha256=sub.continuity_head_sha256 AND c.continuity_revision=sub.continuity_revision
   AND c.subscribed_receipt_sha256=evidence->>'suspension_receipt_sha256') THEN RETURN NULL;END IF;
 -- Completed, already consumed qualifier deliveries are historical only.
 -- Keep their nonce, worker, claim and receipt intact; do not infer provider success.
 IF current_invocation THEN
  UPDATE reality_internal.final_loop_resume_events_v1 e SET state='SHADOW_STALE'
  WHERE e.shift_id=a.shift_id AND e.original_work_id=sub.original_work_id AND e.state='SHADOW_PENDING'
   AND (current_invocation AND e.owner_id=a.owner_id AND e.source_ref=sub.source_ref
    AND e.continuity_head_sha256=sub.continuity_head_sha256 AND e.continuity_revision=sub.continuity_revision
    AND e.signal_kind='QUALIFIER_PROOF_CHANGED' AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
    AND e.source_receipt_sha256=evidence->>'qualifier_receipt_sha256'
    AND e.previous_receipt_sha256=sub.subscribed_receipt_sha256 AND e.governed_wake_request_id IS NOT NULL
    AND e.observed_at IS NULL AND EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
     JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
     JOIN reality_internal.governed_worker_release_approvals_v1 rel ON rel.claim_id=w.release_claim_id
     WHERE r.run_id=e.governed_wake_worker_run_id AND r.status='COMPLETED' AND r.finished_at IS NOT NULL
      AND r.worker_stage='WORKER_RESPONSE_PUBLICATION' AND w.owner_id=e.owner_id AND w.shift_id=e.shift_id
      AND w.release_claim_id=e.release_continuation_claim_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
      AND rel.owner_id=e.owner_id AND rel.shift_id=e.shift_id AND rel.state='CLAIMED_ONCE'
      AND rel.release_sha=w.running_release_sha AND rel.release_ref=w.running_release_ref
      AND rel.provider_alias_observed_at>=rel.claimed_at AND rel.provider_alias_observed_at<=r.started_at
      AND rel.provider_alias_observed_deployment_id=rel.runtime_scope->>'target_deployment_id'
      AND w.release_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
      AND rel.runtime_scope->>'original_work_id'=e.original_work_id
      AND rel.runtime_scope->>'source_ref'=e.source_ref AND rel.runtime_scope->>'child_execution_enabled'='false'
      AND rel.runtime_scope->>'parent_delivery_enabled'='false' AND rel.runtime_scope->>'production_changed'='false'));
 END IF;
 causal:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  a.shift_id::text||'|'||sub.original_work_id||'|'||sub.continuity_head_sha256||'|'||
  sub.continuity_revision::text||'|'||(evidence->>'suspension_receipt_sha256')||'|'||
  (evidence->>'investigation_receipt_sha256'),'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_resume_events_v1(shift_id,owner_id,original_work_id,source_ref,signal_kind,
  source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,
  signal_next_action,release_continuation_claim_id)
 VALUES(a.shift_id,a.owner_id,sub.original_work_id,sub.source_ref,'VERIFIED_INVESTIGATION_REVIEW',
  evidence->>'investigation_receipt_sha256',evidence->>'suspension_receipt_sha256',causal,sub.continuity_head_sha256,
  sub.continuity_revision,'INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY',a.claim_id)
 ON CONFLICT DO NOTHING RETURNING event_id INTO fresh_id;
 IF current_invocation AND fresh_id IS NULL THEN RAISE EXCEPTION 'CURRENT_INVOCATION_REVIEW_NOT_STAGED';END IF;
 RETURN fresh_id;
END $function$;

CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_terminal_technical_evidence_v1(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE successor jsonb; a record; evidence jsonb; sub record; fresh_id uuid; causal text; prior_event uuid;
 prior_run uuid; prior_status text; interrupted_proof jsonb; lease_row record;
BEGIN
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 WHERE r.request_id=p_request_id AND r.state='CLAIMED_ONCE' AND r.claim_id IS NOT NULL
  AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND r.provider_alias_observed_at>=r.claimed_at
  AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
  AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
  AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND r.runtime_scope->>'child_execution_enabled'='false' AND r.runtime_scope->>'parent_delivery_enabled'='false'
  AND r.runtime_scope->>'production_changed'='false'
  AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
   WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id AND newer.capability_key=r.capability_key
    AND newer.state='CLAIMED_ONCE' AND newer.provider_alias_observed_at>r.provider_alias_observed_at);
 IF NOT FOUND THEN RETURN NULL;END IF;
 successor:=reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id);
 IF successor IS NOT NULL THEN a.runtime_scope:=a.runtime_scope||pg_catalog.jsonb_build_object('continuity_head_sha256',successor->>'continuity_head_sha256','continuity_revision',(successor->>'continuity_revision')::bigint); END IF;
 evidence:=reality_internal.read_final_loop_verified_terminal_review_v1(a.owner_id,a.shift_id,
  a.runtime_scope->>'original_work_id',a.runtime_scope->>'source_ref',
  a.runtime_scope->>'continuity_head_sha256',(a.runtime_scope->>'continuity_revision')::bigint);
 IF evidence IS NULL THEN RETURN NULL;END IF;
 -- Serialize with the existing singleton lease; never reconcile a worker
 -- if a new claim can race this transaction.
 SELECT * INTO lease_row FROM reality_internal.governed_preview_shift_worker_leases_v1
 WHERE worker_key='preview-governed-employee-shift-worker' FOR UPDATE SKIP LOCKED;
 SELECT * INTO sub FROM reality_internal.final_loop_resume_conditions_v1 c
 WHERE c.owner_id=a.owner_id AND c.shift_id=a.shift_id AND c.original_work_id=a.runtime_scope->>'original_work_id'
  AND c.source_ref=a.runtime_scope->>'source_ref' AND c.condition_kind='QUALIFIER_PROOF_CHANGED'
  AND c.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
  AND c.continuity_revision::text=a.runtime_scope->>'continuity_revision' AND c.state='SUSPENDED'
 FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL;END IF;
 -- An already-consumed read-only delivery may be superseded only by an
 -- independently qualified, different, later activated release. The old
 -- event, nonce, claim, signed run, and evidence hashes are never reset.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.shift_id=a.shift_id AND e.original_work_id=sub.original_work_id
   AND e.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
   AND e.source_receipt_sha256=evidence->>'review_receipt_sha256') THEN
  SELECT e.event_id,run.run_id,run.status,
   CASE WHEN run.status='STARTED' THEN pg_catalog.jsonb_build_object(
    'schema','reality-interrupted-evidence-failure-v1',
    'owner_id',e.owner_id,'shift_id',e.shift_id,'original_work_id',e.original_work_id,
    'source_ref',e.source_ref,'continuity_head_sha256',e.continuity_head_sha256,
    'continuity_revision',e.continuity_revision,'event_id',e.event_id,'run_id',run.run_id,
    'request_id',e.governed_wake_request_id,'release_claim_id',prev.claim_id,
    'release_sha',wake.running_release_sha,'lease_claim_id',lease_row.claim_id,
    'lease_expires_at',lease_row.lease_expires_at,'recorded_worker_stage',run.worker_stage,
    'provider_response_status',http.status_code,'provider_response_recorded_at',http.created,
    'provider_response_sha256','sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(http.content,'UTF8')),'hex'),
    'reconciled_at',pg_catalog.clock_timestamp(),'technical_observation_recorded',false,
    'original_job_completed',false,'replay_authorized',false,'new_attempt_authorized',false,
    'previous_attempt_budget_preserved',true,'installation_authorized',false,'production_changed',false)
   END
  INTO prior_event,prior_run,prior_status,interrupted_proof
  FROM reality_internal.final_loop_resume_events_v1 e
  JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=e.governed_wake_worker_run_id
  JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
    AND wake.owner_id=e.owner_id AND wake.shift_id=e.shift_id AND wake.release_claim_id=e.release_continuation_claim_id
    AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
  JOIN reality_internal.governed_worker_release_approvals_v1 prev ON prev.claim_id=wake.release_claim_id
    AND prev.owner_id=e.owner_id AND prev.shift_id=e.shift_id AND prev.release_sha=wake.running_release_sha
    AND prev.state='CLAIMED_ONCE' AND prev.capability_key=a.capability_key
    AND prev.provider_alias_observed_at>=prev.claimed_at
  JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse ON pulse.owner_id=e.owner_id AND pulse.shift_id=e.shift_id
  LEFT JOIN net._http_response http ON http.id=e.governed_wake_request_id
  WHERE e.shift_id=a.shift_id AND e.owner_id=a.owner_id AND e.original_work_id=sub.original_work_id
   AND e.source_ref=sub.source_ref AND e.signal_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
   AND e.signal_next_action='READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY'
   AND e.source_receipt_sha256=evidence->>'review_receipt_sha256'
   AND e.previous_receipt_sha256=evidence->>'investigation_receipt_sha256'
   AND e.continuity_head_sha256=sub.continuity_head_sha256 AND e.continuity_revision=sub.continuity_revision
   AND e.state='SHADOW_PENDING' AND e.observed_at IS NULL AND e.governed_wake_request_id IS NOT NULL
   AND (
    (run.status='COMPLETED' AND run.worker_stage='TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION'
     AND run.finished_at IS NOT NULL AND pulse.last_worker_status='WAKE_COMPLETED'
     AND pulse.last_worker_safe_result='TERMINAL_TECHNICAL_EVIDENCE_UNVERIFIED'
     AND pulse.last_worker_completed_at BETWEEN run.started_at AND run.finished_at
     AND a.provider_alias_observed_at>run.finished_at)
    OR
    (run.status='STARTED' AND run.finished_at IS NULL AND run.interrupted_evidence_failure_v1 IS NULL
     AND e.governed_wake_nonce IS NOT NULL AND e.governed_wake_queued_at IS NOT NULL
     AND lease_row.claim_id IS NOT NULL AND lease_row.released_at IS NULL
     AND lease_row.claimed_at>=e.governed_wake_queued_at
     AND run.started_at>=lease_row.claimed_at AND run.started_at<lease_row.lease_expires_at
     AND lease_row.lease_expires_at<pg_catalog.clock_timestamp()
     AND a.provider_alias_observed_at>lease_row.lease_expires_at
     AND pulse.last_worker_status='WAKE_RECEIVED'
     AND pulse.last_worker_seen_at BETWEEN run.started_at AND lease_row.lease_expires_at
     AND (pulse.last_worker_completed_at IS NULL OR pulse.last_worker_completed_at<run.started_at)
     AND http.status_code=503 AND http.timed_out IS FALSE
     AND http.content_type ILIKE 'application/json%'
     -- pg_net's created timestamp is not a worker completion timestamp.
     -- Use the exact dispatch request ID and bound its record to this lease.
     AND http.created>=e.governed_wake_queued_at AND http.created<=lease_row.lease_expires_at
     AND (CASE WHEN http.content IS JSON OBJECT THEN http.content::jsonb ELSE '{}'::jsonb END)
       @> '{"ok":false,"error":"SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED","work_completed":false,"installation_authorized":false,"production_changed":false}'::jsonb
     AND (SELECT count(*) FROM net._http_response h WHERE h.id=e.governed_wake_request_id)=1
     AND NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 newer
       WHERE newer.run_id<>run.run_id AND newer.started_at>=run.started_at)
     AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 tr
       WHERE tr.worker_run_id=run.run_id)
     AND NOT EXISTS(SELECT 1 FROM public.universe_events u
       WHERE u.entity_type='reality_final_loop_terminal_technical_observation_v1'
        AND u.payload->>'owner_id'=e.owner_id::text AND u.payload->>'shift_id'=e.shift_id::text
        AND u.payload->>'original_work_id'=e.original_work_id)
     AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 f
       WHERE f.owner_id=e.owner_id AND f.shift_id=e.shift_id AND f.original_work_id=e.original_work_id))
   )
   AND a.claim_id<>prev.claim_id AND a.release_sha<>prev.release_sha
   AND a.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
   AND a.runtime_scope->>'independent_gateway_ci_verified'='true'
   AND a.runtime_scope->>'independent_qualification_branch_verified'='true'
   AND a.runtime_scope->>'independent_transport_proof_sha256' ~ '^sha256:[a-f0-9]{64}$'
   AND a.approval_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
   AND a.runtime_scope->>'qualifier_receipt_sha256'=evidence->>'qualifier_receipt_sha256'
   AND prev.runtime_scope->>'child_execution_enabled'='false'
   AND prev.runtime_scope->>'parent_delivery_enabled'='false'
   AND prev.runtime_scope->>'production_changed'='false'
   AND evidence->'terminal_history'->>'remaining_attempts'='0'
   AND evidence->'terminal_history'->>'replay_permitted'='false'
   AND evidence->'terminal_history'->>'new_attempt_authorized'='false'
   AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 x
     JOIN reality_internal.governed_worker_release_approvals_v1 xrel ON xrel.claim_id=x.release_continuation_claim_id
     WHERE x.shift_id=e.shift_id AND x.original_work_id=e.original_work_id AND x.signal_kind=e.signal_kind
      AND x.source_receipt_sha256=e.source_receipt_sha256 AND xrel.release_sha=a.release_sha)
  FOR UPDATE OF e,run;
  IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e
  WHERE e.shift_id=a.shift_id AND e.original_work_id=sub.original_work_id AND e.state='SHADOW_PENDING'
   AND e.event_id IS DISTINCT FROM prior_event) THEN RETURN NULL;END IF;
 INSERT INTO reality_internal.final_loop_resume_conditions_v1(shift_id,owner_id,original_work_id,source_ref,condition_kind,
  subscribed_receipt_sha256,continuity_head_sha256,continuity_revision,next_qualified_action,unresolved_proof_gates,proposed_transition,state)
 VALUES(a.shift_id,a.owner_id,sub.original_work_id,sub.source_ref,'VERIFIED_REVIEW_TECHNICAL_EVIDENCE',
  evidence->>'investigation_receipt_sha256',sub.continuity_head_sha256,sub.continuity_revision,
  'READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY',evidence->'unresolved_proof_gates','RECOVER','SUSPENDED')
 ON CONFLICT(shift_id,original_work_id,condition_kind) DO UPDATE SET subscribed_receipt_sha256=EXCLUDED.subscribed_receipt_sha256,updated_at=pg_catalog.clock_timestamp()
 WHERE successor IS NOT NULL AND final_loop_resume_conditions_v1.owner_id=EXCLUDED.owner_id
 AND final_loop_resume_conditions_v1.source_ref=EXCLUDED.source_ref
 AND final_loop_resume_conditions_v1.continuity_head_sha256=EXCLUDED.continuity_head_sha256
 AND final_loop_resume_conditions_v1.continuity_revision=EXCLUDED.continuity_revision
 AND final_loop_resume_conditions_v1.state='SUSPENDED'
 AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 e WHERE e.shift_id=EXCLUDED.shift_id
 AND e.original_work_id=EXCLUDED.original_work_id AND e.signal_kind=EXCLUDED.condition_kind
 AND e.continuity_revision=EXCLUDED.continuity_revision);
 IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=a.owner_id AND c.shift_id=a.shift_id AND c.original_work_id=sub.original_work_id
   AND c.source_ref=sub.source_ref AND c.condition_kind='VERIFIED_REVIEW_TECHNICAL_EVIDENCE'
   AND c.continuity_head_sha256=sub.continuity_head_sha256 AND c.continuity_revision=sub.continuity_revision
   AND c.subscribed_receipt_sha256=evidence->>'investigation_receipt_sha256') THEN RETURN NULL;END IF;
 causal:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  a.shift_id::text||'|'||sub.original_work_id||'|'||sub.continuity_head_sha256||'|'||
  sub.continuity_revision::text||'|'||(evidence->>'investigation_receipt_sha256')||'|'||
  (evidence->>'review_receipt_sha256'),'UTF8')),'hex');
 -- Supersede only after all source and subscription checks. Both operations
 -- are in this transaction; conflict must not strand the old event.
 IF prior_event IS NOT NULL THEN
  IF prior_status='STARTED' THEN
   IF interrupted_proof IS NULL THEN RAISE EXCEPTION 'INTERRUPTED_EVIDENCE_FAILURE_PROOF_MISSING';END IF;
   UPDATE reality_internal.signed_worker_actual_runs_v1
    SET status='FAILED',finished_at=(interrupted_proof->>'reconciled_at')::timestamptz,
     interrupted_evidence_failure_v1=interrupted_proof||pg_catalog.jsonb_build_object(
      'receipt_sha256','sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(interrupted_proof::text,'UTF8')),'hex'))
    WHERE run_id=prior_run AND status='STARTED' AND finished_at IS NULL
     AND interrupted_evidence_failure_v1 IS NULL;
   IF NOT FOUND THEN RAISE EXCEPTION 'INTERRUPTED_EVIDENCE_FAILURE_RECONCILIATION_RACE';END IF;
  END IF;
  UPDATE reality_internal.final_loop_resume_events_v1 SET state='SHADOW_STALE'
   WHERE event_id=prior_event AND state='SHADOW_PENDING' AND observed_at IS NULL;
  IF NOT FOUND THEN RETURN NULL;END IF;
 END IF;
 INSERT INTO reality_internal.final_loop_resume_events_v1(shift_id,owner_id,original_work_id,source_ref,signal_kind,
  source_receipt_sha256,previous_receipt_sha256,event_causality_sha256,continuity_head_sha256,continuity_revision,
  signal_next_action,release_continuation_claim_id)
 VALUES(a.shift_id,a.owner_id,sub.original_work_id,sub.source_ref,'VERIFIED_REVIEW_TECHNICAL_EVIDENCE',
  evidence->>'review_receipt_sha256',evidence->>'investigation_receipt_sha256',causal,sub.continuity_head_sha256,
  sub.continuity_revision,'READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY',a.claim_id)
 ON CONFLICT DO NOTHING RETURNING event_id INTO fresh_id;
 IF prior_event IS NOT NULL AND fresh_id IS NULL THEN
  RAISE EXCEPTION 'TERMINAL_EVIDENCE_CONTINUATION_NOT_STAGED';END IF;
 RETURN fresh_id;
END $function$;

CREATE OR REPLACE FUNCTION reality_internal.stage_final_loop_release_continuation_v1(p_request_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE successor jsonb; a record; old_event record; fresh_id uuid; suspension jsonb; qsub record; causal text;
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

-- The existing completion trigger must actually deliver the newly supported
-- evidence stages; its earlier filter excluded both ledger-return publication
-- and the verifier's preexecution fence. Same trigger, same handler.
DROP TRIGGER IF EXISTS final_loop_completed_investigation_wake_v1 ON reality_internal.signed_worker_actual_runs_v1;
CREATE TRIGGER final_loop_completed_investigation_wake_v1
 AFTER UPDATE OF status ON reality_internal.signed_worker_actual_runs_v1
 FOR EACH ROW WHEN (OLD.status='STARTED' AND NEW.status='COMPLETED'
 AND NEW.worker_stage IN ('SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION',
 'INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION','WORKER_RESPONSE_PUBLICATION',
 'SHARED_CONTINUITY_VERIFIER_RETURN_FENCE','LEDGER_RETURN_RESPONSE_PUBLICATION'))
 EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
