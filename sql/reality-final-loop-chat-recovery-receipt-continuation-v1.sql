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
   'recovery_approval',CASE WHEN a.same_obligation_recovery_approval IS NOT NULL THEN
    pg_catalog.jsonb_build_object('approved',a.same_obligation_recovery_approval->'approved',
     'proposal_sha256',a.same_obligation_recovery_approval->>'proposal_sha256',
     'approval_receipt_sha256',a.same_obligation_recovery_approval->>'approval_receipt_sha256',
     'historical_invocation_replay_authorized',false) ELSE NULL END,
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

-- Validate a finite chain of already committed evidence returns from the
-- immutable release's approved anchor. Does not qualify a new model budget.
-- Each edge must have a signed event, transition receipt and canonical payload.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_bounded_release_chain_v1(p_claim uuid,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $chain$
DECLARE a record; packet record; approval jsonb; proposal jsonb; v_head text:=p_head; v_rev bigint:=p_revision;
 base_rev bigint; edge record; step_count int:=0; max_steps int; receipt jsonb; last_entity text; last_receipt text;
BEGIN
 IF current_user NOT IN ('postgres','service_role') OR p_claim IS NULL OR p_revision IS NULL
  OR coalesce(p_head,'')!~'^sha256:[a-f0-9]{64}$' THEN RETURN NULL;END IF;
 SELECT x.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 x
 WHERE x.claim_id=p_claim AND x.state='CLAIMED_ONCE'
  AND x.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND x.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND x.provider_alias_observed_at>=x.claimed_at
  AND x.provider_alias_observed_deployment_id=x.runtime_scope->>'target_deployment_id'
  AND x.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
  AND x.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND x.runtime_scope->>'independent_gateway_ci_verified'='true'
  AND x.runtime_scope->>'independent_qualification_branch_verified'='true'
  AND x.runtime_scope->>'independent_transport_proof_sha256'~'^sha256:[a-f0-9]{64}$'
  AND x.runtime_scope->>'child_execution_enabled'='false'
  AND x.runtime_scope->>'parent_delivery_enabled'='false'
  AND x.runtime_scope->>'production_changed'='false'
  AND x.runtime_scope->>'continuity_revision'~'^[1-9][0-9]{0,8}$';
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT p.* INTO packet FROM reality_internal.final_loop_child_approval_packets_v1 p
 WHERE p.owner_id=a.owner_id AND p.shift_id=a.shift_id
  AND p.parent_original_work_id=a.runtime_scope->>'original_work_id'
  AND p.source_ref=a.runtime_scope->>'source_ref' AND p.state='EFFECT_RESERVED_RECONCILE_ONLY'
  AND p.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW' AND p.same_obligation_recovery_approval IS NOT NULL;
 IF NOT FOUND THEN RETURN NULL;END IF;
 approval:=packet.same_obligation_recovery_approval;proposal:=approval->'proposal';
 IF approval->>'schema' IS DISTINCT FROM 'reality-final-loop-same-obligation-recovery-approval-v1'
  OR approval->>'approval_receipt_sha256' IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((approval-'approval_receipt_sha256')::text,'UTF8')),'hex')
  OR approval->>'proposal_sha256' IS DISTINCT FROM 'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(proposal::text,'UTF8')),'hex')
  OR approval->>'approved' IS DISTINCT FROM 'true' OR approval->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
  OR proposal->>'packet_id' IS DISTINCT FROM packet.packet_id::text OR proposal->>'plan_id' IS DISTINCT FROM packet.plan_id::text
  OR proposal->>'owner_id' IS DISTINCT FROM a.owner_id::text OR proposal->>'shift_id' IS DISTINCT FROM a.shift_id::text
  OR proposal->>'original_work_id' IS DISTINCT FROM packet.parent_original_work_id
  OR proposal->>'source_ref' IS DISTINCT FROM packet.source_ref
  OR proposal->>'source_manifest_sha256' IS DISTINCT FROM packet.source_manifest_sha256
  OR proposal->>'acceptance_contract_sha256' IS DISTINCT FROM packet.acceptance_contract_sha256
  OR proposal->>'prior_owner_approval_receipt_sha256' IS DISTINCT FROM packet.owner_approval_receipt_sha256
  OR proposal->>'continuity_root_id' IS DISTINCT FROM a.runtime_scope->>'continuity_root_id'
  OR proposal->>'continuity_head_sha256' IS DISTINCT FROM a.runtime_scope->>'continuity_head_sha256'
  OR proposal->>'continuity_revision' IS DISTINCT FROM a.runtime_scope->>'continuity_revision'
  OR proposal->'terminal_recovery_history'->>'remaining_attempts' IS DISTINCT FROM '0'
  OR proposal->'terminal_recovery_history'->>'replay_permitted' IS DISTINCT FROM 'false'
  OR proposal->>'historical_invocation_replay_authorized' IS DISTINCT FROM 'false'
  OR proposal->>'new_budget_authorized' IS DISTINCT FROM 'false'
  OR pg_catalog.jsonb_typeof(proposal->'unfinished_scopes') IS DISTINCT FROM 'array'
 THEN RETURN NULL;END IF;
 base_rev:=(a.runtime_scope->>'continuity_revision')::bigint;
 max_steps:=2*pg_catalog.jsonb_array_length(proposal->'unfinished_scopes');
 IF max_steps NOT BETWEEN 2 AND 126 OR v_rev<base_rev OR v_rev-base_rev>max_steps THEN RETURN NULL;END IF;
 WHILE v_rev>base_rev LOOP
  SELECT u.*,prior.lineage_hash AS previous_lineage,tr.receipt_sha256 AS transition_receipt,
    ev.event_id AS signed_event_id,run.run_id AS signed_run_id INTO edge
  FROM public.universe_events u
  JOIN public.universe_events prior ON prior.event_id=u.parent_event_id
    AND prior.continuity_root_id=u.continuity_root_id AND prior.worldline_id=u.worldline_id
  JOIN reality_internal.final_loop_transition_receipts_v1 tr ON tr.owner_id=a.owner_id AND tr.shift_id=a.shift_id
    AND tr.original_work_id=packet.parent_original_work_id AND tr.source_ref=packet.source_ref
    AND tr.continuity_root_id=u.continuity_root_id AND tr.continuity_head_sha256='sha256:'||prior.lineage_hash
    AND tr.expected_revision=v_rev-1 AND tr.worker_run_id::text=u.provenance->>'worker_run_id'
    AND tr.decision='SUSPEND' AND tr.reason_code='PROVIDER_EFFECT_UNCERTAIN'
  JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=tr.worker_run_id
    AND run.status='COMPLETED' AND run.finished_at IS NOT NULL
  JOIN reality_internal.final_loop_resume_events_v1 ev ON ev.governed_wake_worker_run_id=run.run_id
    AND ev.shift_id=a.shift_id AND ev.owner_id=a.owner_id AND ev.original_work_id=packet.parent_original_work_id
    AND ev.source_ref=packet.source_ref AND ev.continuity_head_sha256=tr.continuity_head_sha256
    AND ev.continuity_revision=tr.expected_revision AND ev.state='SHADOW_OBSERVED'
    AND ev.release_continuation_claim_id=a.claim_id AND ev.signal_kind='QUALIFIER_PROOF_CHANGED'
    AND ev.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
    AND ev.source_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
    AND ev.governed_wake_nonce IS NOT NULL AND ev.governed_wake_request_id IS NOT NULL
    AND ev.governed_wake_requested_at<=ev.governed_wake_queued_at AND ev.governed_wake_queued_at<=run.started_at
  JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
    AND wake.release_claim_id=a.claim_id AND wake.running_release_sha=a.release_sha AND wake.running_release_ref=a.release_ref
    AND wake.owner_id=a.owner_id AND wake.shift_id=a.shift_id AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
    AND wake.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  WHERE 'sha256:'||u.lineage_hash=v_head AND u.continuity_root_id::text=a.runtime_scope->>'continuity_root_id'
    AND u.event_kind='OBSERVATION' AND u.epistemic_status='OBSERVED'
    AND u.entity_type IN ('reality_final_loop_invocation_observation_v1','reality_final_loop_independent_child_receipt_observation_v1')
    AND u.payload->>'owner_id'=a.owner_id::text AND u.payload->>'shift_id'=a.shift_id::text
    AND u.payload->>'original_work_id'=packet.parent_original_work_id AND u.payload->>'source_ref'=packet.source_ref
    AND u.payload->>'execution_authorized'='false' AND u.payload->>'original_job_completed'='false'
    AND u.payload->>'replay_authorized'='false' AND u.payload->>'production_changed'='false'
    AND u.payload->'terminal_recovery_history'=proposal->'terminal_recovery_history'
    AND u.payload->>'observation_sha256'='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((u.payload->'invocation_observations')::text,'UTF8')),'hex')
    AND u.evidence_refs ? (u.payload->>'observation_sha256')
    AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
    AND u.provenance->'continuity_spine'->>'prior_lineage_hash'=prior.lineage_hash
    AND u.provenance->'continuity_spine'->>'source_event_id'=prior.event_id::text
    AND tr.receipt_sha256~'^sha256:[a-f0-9]{64}$'
    AND (u.entity_type='reality_final_loop_invocation_observation_v1' AND ev.ledger_return_condition_sha256 IS NOT NULL
      AND run.worker_stage='LEDGER_RETURN_RESPONSE_PUBLICATION'
      OR u.entity_type='reality_final_loop_independent_child_receipt_observation_v1' AND ev.ledger_return_condition_sha256 IS NULL
      AND run.worker_stage='WORKER_RESPONSE_PUBLICATION')
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL;END IF;
  IF edge.entity_type='reality_final_loop_independent_child_receipt_observation_v1' THEN
   receipt:=edge.payload->'independent_child_receipt';
   IF receipt->>'release_claim_id' IS DISTINCT FROM a.claim_id::text
    OR receipt->>'verifier_worker_run_id' IS DISTINCT FROM edge.signed_run_id::text
    OR receipt->>'prior_head_sha256' IS DISTINCT FROM 'sha256:'||edge.previous_lineage
    OR receipt->>'prior_revision' IS DISTINCT FROM (v_rev-1)::text
    OR receipt->>'independently_verified' IS DISTINCT FROM 'true'
    OR NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
     WHERE c.packet_id=packet.packet_id AND c.child_work_id=receipt->>'child_work_id'
      AND c.scope_sha256=receipt->>'scope_sha256' AND c.phase='INDEPENDENTLY_VERIFIED'
      AND c.independent_review_receipt_sha256=receipt->>'independent_review_receipt_sha256'
      AND c.canonical_verify_invocation_run_id=edge.signed_run_id AND c.canonical_verify_invocation_id::text=receipt->>'verify_invocation_id'
      AND c.canonical_prepare_invocation_id::text=receipt->>'prepare_invocation_id'
      AND c.historical_prepare_fence->>'continuation_approval_receipt_sha256'=approval->>'approval_receipt_sha256')
   THEN RETURN NULL;END IF;
  END IF;
  IF step_count=0 THEN last_entity:=edge.entity_type;last_receipt:=edge.transition_receipt;END IF;
  v_head:='sha256:'||edge.previous_lineage;v_rev:=v_rev-1;step_count:=step_count+1;
 END LOOP;
 IF v_head IS DISTINCT FROM a.runtime_scope->>'continuity_head_sha256' THEN RETURN NULL;END IF;
 RETURN pg_catalog.jsonb_build_object('release_claim_id',a.claim_id,'owner_id',a.owner_id,'shift_id',a.shift_id,
  'original_work_id',packet.parent_original_work_id,'source_ref',packet.source_ref,'plan_id',packet.plan_id,'packet_id',packet.packet_id,
  'continuity_head_sha256',p_head,'continuity_revision',p_revision,'qualifier_receipt_sha256',a.runtime_scope->>'qualifier_receipt_sha256',
  'approval_receipt_sha256',approval->>'approval_receipt_sha256','bounded_chain_steps',step_count,
  'last_entity_type',last_entity,'suspension_receipt_sha256',last_receipt,
  'execution_authorized',false,'replay_authorized',false,'production_changed',false);
END $chain$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_bounded_release_chain_v1(uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_bounded_release_chain_v1(uuid,text,bigint) TO service_role;
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_release_successor_scope_v1(p_claim_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE a record; g jsonb; p jsonb; ob jsonb; sus jsonb; rev bigint; head text; n int; bounded jsonb;
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
 bounded:=reality_internal.read_final_loop_bounded_release_chain_v1(a.claim_id,g->>'continuity_head_sha256',(g->>'revision')::bigint);
 IF bounded IS NOT NULL AND (bounded->>'bounded_chain_steps')::int>0
  AND g->>'status'='FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  AND g->>'owner_id'=a.owner_id::text AND g->>'shift_id'=a.shift_id::text
  AND g->>'continuity_root_id'=a.runtime_scope->>'continuity_root_id'
  AND g->>'unverified_handoffs'='0' AND g->>'worldline_parent_links_verified'='true'
  AND g->>'execution_authorized'='false' AND g->>'original_job_completed'='false' AND g->>'production_changed'='false'
  AND p->>'continuity_head_sha256'=g->>'continuity_head_sha256' AND p->>'revision'=g->>'revision'
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(g->'obligations') x
   WHERE x->>'original_work_id'=bounded->>'original_work_id' AND x->>'source_ref'=bounded->>'source_ref'
    AND x->>'qualifier_receipt_sha256'=bounded->>'qualifier_receipt_sha256'
    AND x->>'continuity_identity_verified'='true' AND x->>'qualifier_digest_verified'='true'
    AND x->>'independent_original_outcome_verified'='false')
 THEN RETURN bounded;END IF;
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
END $function$;
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_verified_child_receipt_v1(p_shift_id uuid, p_original_work_id text, p_worker_run_id uuid, p_head text, p_revision bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 SELECT CASE WHEN count(*)=1 THEN jsonb_agg(proof)->0 END
 FROM (
 SELECT pg_catalog.jsonb_build_object(
  'child_work_id',c.child_work_id,'scope_index',c.scope_index,'scope_sha256',c.scope_sha256,
  'prepare_invocation_id',c.canonical_prepare_invocation_id,'verify_invocation_id',c.canonical_verify_invocation_id,
  'preparation_worker_run_id',c.claimant_worker_run_id,'verifier_worker_run_id',r.run_id,
  'verifier_event_id',e.event_id,'release_claim_id',a.claim_id,'release_sha',a.release_sha,
  'release_receipt_sha256',w.release_receipt_sha256,'source_ref',e.source_ref,
  'source_head_sha',c.source_head_sha,'source_manifest_sha256',c.source_manifest_sha256,
  'owner_approval_receipt_sha256',packet.owner_approval_receipt_sha256,
  'independent_review_receipt_sha256',c.independent_review_receipt_sha256,
  'review_sha256',c.review_sha256,'provider_evidence_sha256',c.independent_provider_evidence_sha256,
  'verifier_verdict_sha256',c.verifier_evidence->>'verifier_verdict_sha256',
  'prior_observation_sha256',u.payload->>'observation_sha256','prior_event_id',u.event_id,
  'prior_head_sha256',p_head,'prior_revision',p_revision,
  'independently_verified',true,'original_job_completed',false,'replay_authorized',false,
  'execution_authorized',false,'production_changed',false) proof
 FROM reality_internal.final_loop_child_review_work_v1 c
 JOIN reality_internal.final_loop_pr_source_plans_v1 plan ON plan.plan_id=c.plan_id AND plan.shift_id=c.shift_id
  AND plan.owner_id=c.owner_id AND plan.parent_original_work_id=c.parent_original_work_id
  AND plan.source_head_sha=c.source_head_sha AND plan.source_manifest_sha256=c.source_manifest_sha256
 JOIN reality_internal.final_loop_child_approval_packets_v1 packet ON packet.packet_id=c.packet_id
  AND packet.plan_id=c.plan_id AND packet.shift_id=c.shift_id AND packet.owner_id=c.owner_id
  AND packet.parent_original_work_id=c.parent_original_work_id AND packet.source_ref=plan.source_ref
  AND packet.acceptance_contract_sha256=c.acceptance_contract_sha256
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=c.independent_verifier_run_id
  AND r.run_id=c.canonical_verify_invocation_run_id
 JOIN reality_internal.signed_worker_actual_runs_v1 prep ON prep.run_id=c.claimant_worker_run_id
 JOIN reality_internal.final_loop_resume_events_v1 e ON e.governed_wake_worker_run_id=r.run_id
  AND e.shift_id=c.shift_id AND e.owner_id=c.owner_id AND e.original_work_id=c.parent_original_work_id
  AND e.source_ref=plan.source_ref
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
  AND w.shift_id=e.shift_id AND w.owner_id=e.owner_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
  AND a.claim_id=e.release_continuation_claim_id AND a.shift_id=e.shift_id AND a.owner_id=e.owner_id
  AND a.release_sha=w.running_release_sha AND a.release_ref=w.running_release_ref
 JOIN public.universe_events u ON u.continuity_root_id::text=a.runtime_scope->>'continuity_root_id'
  AND 'sha256:'||u.lineage_hash=e.continuity_head_sha256
 JOIN public.universe_events prior ON prior.event_id=u.parent_event_id
  AND prior.continuity_root_id=u.continuity_root_id AND prior.worldline_id=u.worldline_id
 CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(plan.source_plan->'bounded_scopes') scope
 WHERE current_user IN ('postgres','service_role')
  AND c.shift_id=p_shift_id AND c.parent_original_work_id=p_original_work_id AND r.run_id=p_worker_run_id
  AND e.continuity_head_sha256=p_head AND e.continuity_revision=p_revision
  AND c.phase='INDEPENDENTLY_VERIFIED' AND c.canonical_prepare_invocation_id IS NOT NULL
  AND c.canonical_verify_invocation_id IS NOT NULL AND c.canonical_verify_invocation_id<>c.canonical_prepare_invocation_id
  AND r.run_id<>prep.run_id AND prep.status='COMPLETED' AND prep.finished_at<=r.started_at
  AND r.status='COMPLETED' AND r.worker_stage='WORKER_RESPONSE_PUBLICATION'
  AND r.started_at<=c.verified_at AND c.verified_at<=r.finished_at
  AND e.state IN ('SHADOW_PENDING','SHADOW_OBSERVED')
  AND e.signal_kind='QUALIFIER_PROOF_CHANGED' AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND e.ledger_return_condition_sha256 IS NULL AND e.governed_wake_nonce IS NOT NULL
  AND e.governed_wake_request_id IS NOT NULL AND e.governed_wake_requested_at<=e.governed_wake_queued_at
  AND e.governed_wake_queued_at<=r.started_at
  AND a.state='CLAIMED_ONCE' AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND a.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND w.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND a.provider_alias_observed_at>=a.claimed_at AND a.provider_alias_observed_at<=r.started_at
  AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
  AND a.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
  AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
  AND a.runtime_scope->>'independent_gateway_ci_verified'='true'
  AND a.runtime_scope->>'independent_qualification_branch_verified'='true'
  AND a.runtime_scope->>'child_execution_enabled'='false' AND a.runtime_scope->>'parent_delivery_enabled'='false'
  AND a.runtime_scope->>'production_changed'='false' AND a.runtime_scope->>'original_work_id'=c.parent_original_work_id
  AND a.runtime_scope->>'source_ref'=e.source_ref AND a.runtime_scope->>'qualifier_receipt_sha256'=e.source_receipt_sha256
  AND ((a.runtime_scope->>'continuity_head_sha256'='sha256:'||prior.lineage_hash
   AND a.runtime_scope->>'continuity_revision'=(p_revision-1)::text)
   OR reality_internal.read_final_loop_bounded_release_chain_v1(a.claim_id,'sha256:'||prior.lineage_hash,p_revision-1) IS NOT NULL)
  AND packet.state='EFFECT_RESERVED_RECONCILE_ONLY' AND packet.authority_effect='READ_ONLY_INTERNAL_PR_REVIEW'
  AND packet.owner_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  AND scope->>'index'=c.scope_index::text AND scope->>'proposed_scope_sha256'=c.scope_sha256
  AND c.model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'
  AND c.review_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(c.review_body,'UTF8')),'hex')
  AND c.verifier_evidence->>'schema'='reality-final-loop-independent-patch-review-v1'
  AND c.verifier_evidence->>'read_only'='true' AND c.verifier_evidence->>'production_changed'='false'
  AND c.verifier_evidence->>'independent_model_used'='true'
  AND c.verifier_evidence->>'review_source_verified'='true' AND c.verifier_evidence->>'all_scope_patches_checked'='true'
  AND c.verifier_evidence->>'child_work_id'=c.child_work_id
  AND c.verifier_evidence->>'parent_original_work_id'=c.parent_original_work_id
  AND c.verifier_evidence->>'scope_sha256'=c.scope_sha256
  AND c.verifier_evidence->>'review_sha256'=c.review_sha256
  AND c.verifier_evidence->>'source_head_sha'=c.source_head_sha
  AND c.verifier_evidence->>'source_manifest_sha256'=c.source_manifest_sha256
  AND c.verifier_evidence->>'independent_verifier_run_id'=r.run_id::text
  AND c.verifier_evidence->>'verifier_model_response_id'~'^resp_[A-Za-z0-9_-]{4,160}$'
  AND c.verifier_evidence->>'verifier_model_response_id'<>c.model_response_id
  AND c.verifier_evidence->>'provider_evidence_sha256'=c.independent_provider_evidence_sha256
  AND c.independent_provider_evidence_sha256~'^sha256:[a-f0-9]{64}$'
  AND c.verifier_evidence->>'verifier_verdict_sha256'~'^sha256:[a-f0-9]{64}$'
  AND c.verifier_evidence->>'canonical_continuity_root_id'=u.continuity_root_id::text
  AND c.verifier_evidence->>'canonical_continuity_head_sha256'=p_head
  AND c.verifier_evidence->>'canonical_continuity_revision'=p_revision::text
  AND c.verifier_evidence->>'canonical_owner_approval_receipt_sha256'=packet.owner_approval_receipt_sha256
  AND pg_catalog.jsonb_typeof(c.verifier_evidence->'verified_paths')='array'
  AND pg_catalog.jsonb_array_length(c.verifier_evidence->'verified_paths')=(scope->>'file_count')::int
  AND (SELECT count(DISTINCT x#>>'{}') FROM pg_catalog.jsonb_array_elements(c.verifier_evidence->'verified_paths') x)=(scope->>'file_count')::int
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(c.verifier_evidence->'verified_paths') x
    WHERE pg_catalog.jsonb_typeof(x)<>'string' OR NOT EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(scope->'files') f WHERE f->>'path'=x#>>'{}'))
  AND c.independent_review_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    (pg_catalog.jsonb_build_object('child_work_id',c.child_work_id,'parent_original_work_id',c.parent_original_work_id,
      'review_sha256',c.review_sha256,'source_manifest_sha256',c.source_manifest_sha256,
      'independent_verifier_run_id',r.run_id,'provider_evidence_sha256',c.verifier_evidence->>'provider_evidence_sha256',
      'verifier_verdict_sha256',c.verifier_evidence->>'verifier_verdict_sha256',
      'canonical_continuity_root_id',c.verifier_evidence->'canonical_continuity_root_id',
      'canonical_continuity_head_sha256',c.verifier_evidence->'canonical_continuity_head_sha256',
      'canonical_continuity_revision',c.verifier_evidence->'canonical_continuity_revision',
      'canonical_owner_approval_receipt_sha256',c.verifier_evidence->'canonical_owner_approval_receipt_sha256'))::text,'UTF8')),'hex')
  AND u.entity_type='reality_final_loop_invocation_observation_v1' AND u.epistemic_status='OBSERVED'
  AND u.payload->>'owner_id'=c.owner_id::text AND u.payload->>'shift_id'=c.shift_id::text
  AND u.payload->>'original_work_id'=c.parent_original_work_id AND u.payload->>'source_ref'=plan.source_ref
  AND u.payload->>'observation_sha256'=e.previous_receipt_sha256
  AND u.payload->>'observation_sha256'='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((u.payload->'invocation_observations')::text,'UTF8')),'hex')
  AND u.payload->>'provider_outcome_verified'='false' AND u.payload->>'replay_authorized'='false'
  AND u.payload->>'execution_authorized'='false' AND u.payload->>'original_job_completed'='false'
  AND u.evidence_refs ? e.previous_receipt_sha256
  AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(u.payload->'invocation_observations') x
   WHERE x->>'child_work_id'=c.child_work_id AND x->>'scope_sha256'=c.scope_sha256
   AND x->>'invocation_id'=c.canonical_prepare_invocation_id::text AND x->>'worker_run_id'=prep.run_id::text
   AND x->>'model_artifact_recorded'='true' AND x->>'worker_completed'='true' AND x->>'replay_authorized'='false')
 ) verified;
$function$;
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_ledger_return_condition_v1(p_shift_id uuid, p_release_claim_id uuid, p_current_event_id uuid, p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE a record; g jsonb; o jsonb; e jsonb; q record; p jsonb; digest text; writer_hash text; condition_hash text;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'LEDGER_RETURN_CONDITION_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_release_claim_id IS NULL
  OR (p_current_event_id IS NULL)<>(p_worker_run_id IS NULL) THEN RETURN NULL;END IF;
 SELECT r.* INTO a FROM reality_internal.governed_worker_release_approvals_v1 r
 JOIN reality_internal.governed_employee_shifts_v1 s ON s.shift_id=r.shift_id AND s.owner_id=r.owner_id
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id
  AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 WHERE r.claim_id=p_release_claim_id AND r.shift_id=p_shift_id
 AND r.state='CLAIMED_ONCE' AND r.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 AND r.provider_alias_observed_at>=r.claimed_at
 AND r.provider_alias_observed_deployment_id=r.runtime_scope->>'target_deployment_id'
 AND r.runtime_scope->>'target_environment'='CANONICAL_BENCHMARK_PREVIEW'
 AND r.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND r.runtime_scope->>'exact_runtime_database_contract_verified'='true'
 AND r.runtime_scope->>'independent_gateway_ci_verified'='true'
 AND r.runtime_scope->>'independent_qualification_branch_verified'='true'
 AND r.runtime_scope->>'child_execution_enabled'='false'
 AND r.runtime_scope->>'parent_delivery_enabled'='false'
 AND r.runtime_scope->>'production_changed'='false'
 AND r.runtime_scope->>'plan_fingerprint'=s.plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
 AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp()
 AND s.status IN ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
 AND w.state='ACTIVE' AND w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
 AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(w.source_scope) z
  WHERE z->>'source_ref'=r.runtime_scope->>'source_ref')
 AND NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 newer
  WHERE newer.owner_id=r.owner_id AND newer.shift_id=r.shift_id
  AND newer.capability_key=r.capability_key AND newer.state='CLAIMED_ONCE'
  AND newer.provider_alias_observed_at>r.provider_alias_observed_at);
 IF NOT FOUND THEN RETURN NULL;END IF;
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR g->>'owner_id' IS DISTINCT FROM a.owner_id::text OR g->>'shift_id' IS DISTINCT FROM p_shift_id::text
 OR g->>'continuity_root_id' IS DISTINCT FROM a.runtime_scope->>'continuity_root_id'
 OR ((g->>'continuity_head_sha256' IS DISTINCT FROM a.runtime_scope->>'continuity_head_sha256'
  OR g->>'revision' IS DISTINCT FROM a.runtime_scope->>'continuity_revision')
  AND reality_internal.read_final_loop_bounded_release_chain_v1(a.claim_id,g->>'continuity_head_sha256',(g->>'revision')::bigint) IS NULL)
 OR g->>'execution_authorized' IS DISTINCT FROM 'false'
 OR g->>'original_job_completed' IS DISTINCT FROM 'false'
 THEN RETURN NULL;END IF;
 SELECT x.value INTO o FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x.value->>'original_work_id'=a.runtime_scope->>'original_work_id'
 AND x.value->>'source_ref'=a.runtime_scope->>'source_ref'
 AND x.value->>'qualifier_receipt_sha256'=a.runtime_scope->>'qualifier_receipt_sha256'
 AND x.value->>'next_qualified_action'='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND x.value->>'continuity_identity_verified'='true' AND x.value->>'qualifier_digest_verified'='true'
 AND x.value->>'source_proof_verified'='true' AND x.value->>'independent_original_outcome_verified'='false';
 IF NOT FOUND THEN RETURN NULL;END IF;
 e:=o->'execution_spine_readback';
 IF e->>'status' IS DISTINCT FROM 'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN'
 OR e->>'canonical_return_committed' IS DISTINCT FROM 'false'
 OR e->>'provider_outcome_verified' IS DISTINCT FROM 'false'
 OR e->>'replay_authorized' IS DISTINCT FROM 'false'
 OR pg_catalog.jsonb_typeof(e->'observations') IS DISTINCT FROM 'array'
 OR pg_catalog.jsonb_array_length(e->'observations') NOT BETWEEN 1 AND 63
 THEN RETURN NULL;END IF;
 digest:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to((e->'observations')::text,'UTF8')),'hex');
 IF e->>'observation_sha256' IS DISTINCT FROM digest THEN RETURN NULL;END IF;
 SELECT r.* INTO q FROM reality_internal.owner_continuity_qualification_routes_v1 r
 WHERE r.owner_id=a.owner_id AND r.source_ref=o->>'source_ref' AND r.intake_family='SIGNED_SHIFT_SOURCE'
 AND r.reconciliation_receipt_sha256=o->>'qualifier_receipt_sha256'
 AND r.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.reconciliation_snapshot::text,'UTF8')),'hex')
 AND r.reconciliation_snapshot->>'shift_id'=p_shift_id::text
 AND r.reconciliation_snapshot->>'original_candidate_work_id'=o->>'original_work_id'
 AND r.reconciliation_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND r.reconciliation_checked_at>=pg_catalog.clock_timestamp()-interval '10 minutes'
 ORDER BY r.reconciliation_checked_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN NULL;END IF;
 p:=reality_internal.read_final_loop_invocation_return_pending_v1(p_shift_id,a.owner_id,
  o->>'original_work_id',o->>'source_ref',g->>'continuity_head_sha256',(g->>'revision')::bigint,
  q.reconciliation_receipt_sha256,q.reconciliation_snapshot,e,p_current_event_id,p_worker_run_id);
 IF p->>'ready' IS DISTINCT FROM 'true' THEN RETURN NULL;END IF;
 -- Exact installed code identity, not a clock, run ID, or software release ID,
 -- makes a changed correction distinguishable from a duplicate condition.
 writer_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.pg_get_functiondef('public.reality_return_final_loop_invocation_observations_v1(uuid,text,uuid,text,bigint)'::regprocedure)||
  pg_catalog.pg_get_functiondef('reality_internal.read_final_loop_invocation_return_pending_v1(uuid,uuid,text,text,text,bigint,text,jsonb,jsonb,uuid,uuid)'::regprocedure),
  'UTF8')),'hex');
 condition_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(p_shift_id,a.owner_id,o->>'original_work_id',o->>'source_ref',g->>'continuity_head_sha256',
   g->>'revision',q.reconciliation_receipt_sha256,digest,writer_hash)::text,'UTF8')),'hex');
 RETURN pg_catalog.jsonb_build_object('condition_sha256',condition_hash,'observation_sha256',digest,
  'owner_id',a.owner_id,'original_work_id',o->>'original_work_id','source_ref',o->>'source_ref',
  'head',g->>'continuity_head_sha256','revision',(g->>'revision')::bigint,'qualifier',q.reconciliation_receipt_sha256);
END $function$;
