-- Extend the existing canonical writer, reader and completion trigger; no parallel executor.
-- Exact read-only predicate shared by the existing Continuity writer and readback.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_verified_child_receipt_v1(
 p_shift_id uuid,p_original_work_id text,p_worker_run_id uuid,p_head text,p_revision bigint)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO '' AS $proof$
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
  AND a.runtime_scope->>'continuity_head_sha256'='sha256:'||prior.lineage_hash
  AND a.runtime_scope->>'continuity_revision'=(p_revision-1)::text
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
$proof$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_verified_child_receipt_v1(uuid,text,uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_verified_child_receipt_v1(uuid,text,uuid,text,bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.reality_return_final_loop_invocation_observations_v1(
 p_shift_id uuid,p_original_work_id text,p_worker_run_id uuid,
 p_expected_head_sha256 text,p_expected_revision bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE s record; p jsonb; g jsonb; o jsonb; e jsonb; tail record;
 root uuid; event uuid; receipt uuid; basis jsonb; payload jsonb; refs jsonb;
 provenance jsonb; stamp timestamptz; iso text; content_hash text; lineage text;
 checkpoint jsonb; checkpoint_hash text; observation_hash text;
 sub_count integer; rebound integer; old_events jsonb; old_count integer;
 observed_count integer; stale_count integer; after_p jsonb; after_g jsonb;
 current_event_id uuid; qualifier jsonb; qualifier_digest text;
 prior_preclaim_events jsonb; pending_readback jsonb;
 verified_receipt jsonb; receipt_return boolean:=current_user='postgres'; entity_type text;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL
  OR coalesce(p_original_work_id,'') !~ '^work:[a-f0-9]{32}$'
  OR coalesce(p_expected_head_sha256,'') !~ '^sha256:[a-f0-9]{64}$'
  OR p_expected_revision IS NULL OR p_expected_revision<1
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_EXACT_SCOPE_REQUIRED');END IF;
 SELECT sh.owner_id,sh.plan_fingerprint INTO s
 FROM reality_internal.governed_employee_shifts_v1 sh
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=sh.shift_id AND w.owner_id=sh.owner_id AND w.plan_fingerprint=sh.plan_fingerprint
 WHERE sh.shift_id=p_shift_id AND sh.authorized_at IS NOT NULL AND sh.closed_at IS NULL
  AND sh.planned_end_at='infinity'::timestamptz AND w.state='ACTIVE'
  AND sh.status IN ('RUNNING','AWAITING_EXACT_ORIGINAL_WORK','QUEUED')
 FOR UPDATE OF sh;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SHIFT_NOT_CURRENT');END IF;
 -- The historical runs are evidence, not new authority. The writer itself
 -- requires an actual current signed event-bound worker.
 IF NOT receipt_return AND NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
  JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
   AND w.owner_id=s.owner_id AND w.shift_id=p_shift_id AND w.operating_lane='NORMAL_SIGNED_SHIFT'
  JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
   AND a.owner_id=w.owner_id AND a.shift_id=w.shift_id AND a.release_sha=w.running_release_sha
   AND a.provider_alias_observed_at IS NOT NULL
  JOIN reality_internal.final_loop_resume_events_v1 ev ON ev.governed_wake_worker_run_id=r.run_id
   AND ev.shift_id=p_shift_id AND ev.owner_id=s.owner_id AND ev.original_work_id=p_original_work_id
  WHERE r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
   AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes'
   AND ev.continuity_head_sha256=p_expected_head_sha256 AND ev.continuity_revision=p_expected_revision)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CURRENT_SIGNED_EVENT_REQUIRED');END IF;
 p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
  OR p->>'owner_id' IS DISTINCT FROM s.owner_id::text
  OR p->>'continuity_head_sha256' IS DISTINCT FROM p_expected_head_sha256
  OR (p->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CAUSAL_HEAD_DRIFT_NO_REPLAY');END IF;
 root:=(p->>'continuity_root_id')::uuid;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality:canonical-continuity-return:'||root::text,0));
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR g->>'continuity_head_sha256' IS DISTINCT FROM p_expected_head_sha256
  OR (g->>'revision')::bigint IS DISTINCT FROM p_expected_revision
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SHARED_PROOF_UNVERIFIED');END IF;
 SELECT x.value INTO o FROM pg_catalog.jsonb_array_elements(g->'obligations') x
 WHERE x.value->>'original_work_id'=p_original_work_id AND x.value->>'continuity_identity_verified'='true'
  AND x.value->>'qualifier_digest_verified'='true' AND x.value->>'source_proof_verified'='true'
  AND x.value->>'independent_original_outcome_verified'='false';
 e:=o->'execution_spine_readback';
 IF receipt_return THEN
  verified_receipt:=reality_internal.read_final_loop_verified_child_receipt_v1(p_shift_id,p_original_work_id,p_worker_run_id,p_expected_head_sha256,p_expected_revision);
  IF verified_receipt IS NULL OR e->>'status' IS DISTINCT FROM 'SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
   OR e->>'canonical_return_committed' IS DISTINCT FROM 'true'
   OR e->>'canonical_return_head_sha256' IS DISTINCT FROM p_expected_head_sha256
   OR e->>'observation_sha256' IS DISTINCT FROM verified_receipt->>'prior_observation_sha256'
   OR e->>'replay_authorized' IS DISTINCT FROM 'false' OR e->>'provider_outcome_verified' IS DISTINCT FROM 'false'
   OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_worker_release_approvals_v1 a
      WHERE a.claim_id::text=verified_receipt->>'release_claim_id'
      AND reality_internal.read_final_loop_release_successor_scope_v1(a.claim_id)->>'continuity_head_sha256'=p_expected_head_sha256)
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_RECEIPT_RETURN_PROOF_NOT_QUALIFIED','replay_authorized',false);END IF;
  IF EXISTS(SELECT 1 FROM public.universe_events u WHERE u.continuity_root_id=root
   AND u.entity_type='reality_final_loop_independent_child_receipt_observation_v1'
   AND u.payload->'independent_child_receipt'->>'independent_review_receipt_sha256'=verified_receipt->>'independent_review_receipt_sha256')
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_RECEIPT_ALREADY_RETURNED_NO_REPLAY');END IF;
  current_event_id:=(verified_receipt->>'verifier_event_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 v
    WHERE v.event_id=current_event_id AND v.state='SHADOW_PENDING')
   OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 v
    WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING' AND v.event_id<>current_event_id)
  THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_RECEIPT_RETURN_PENDING_EVENT_CONFLICT','replay_authorized',false);END IF;
  qualifier_digest:=o->>'qualifier_receipt_sha256';
  SELECT q.reconciliation_snapshot INTO qualifier FROM reality_internal.owner_continuity_qualification_routes_v1 q
  WHERE q.owner_id=s.owner_id AND q.intake_family='SIGNED_SHIFT_SOURCE' AND q.source_ref=o->>'source_ref'
   AND q.reconciliation_receipt_sha256=qualifier_digest
   AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
   AND q.reconciliation_snapshot->>'shift_id'=p_shift_id::text
   AND q.reconciliation_snapshot->>'original_candidate_work_id'=p_original_work_id
   AND q.reconciliation_checked_at>=pg_catalog.clock_timestamp()-interval '10 minutes'
  ORDER BY q.reconciliation_checked_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','FINAL_LOOP_CHILD_RECEIPT_RETURN_FRESH_QUALIFIER_REQUIRED');END IF;
  observation_hash:=e->>'observation_sha256';
  prior_preclaim_events:='[]'::jsonb;
 ELSE
 IF e->>'status' IS DISTINCT FROM 'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN'
  OR e->>'provider_outcome_verified' IS DISTINCT FROM 'false'
  OR e->>'replay_authorized' IS DISTINCT FROM 'false'
  OR pg_catalog.jsonb_array_length(e->'observations') NOT BETWEEN 1 AND 63
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_OBSERVATIONS_NOT_READY');END IF;
 -- Append each distinct set of already durable observations only once.
 observation_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  (e->'observations')::text,'UTF8')),'hex');
 IF EXISTS(SELECT 1 FROM public.universe_events u WHERE u.continuity_root_id=root
  AND u.entity_type='reality_final_loop_invocation_observation_v1'
  AND u.payload->>'observation_sha256'=observation_hash
  AND u.payload->>'original_work_id'=p_original_work_id)
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_OBSERVATIONS_ALREADY_RETURNED_NO_REPLAY');END IF;
 -- The current signed event may carry an evidence-only return BEFORE
 -- consuming a child claim. It cannot also authorize a model invocation.
 SELECT v.event_id INTO current_event_id FROM reality_internal.final_loop_resume_events_v1 v
 WHERE v.shift_id=p_shift_id AND v.owner_id=s.owner_id AND v.original_work_id=p_original_work_id
  AND v.governed_wake_worker_run_id=p_worker_run_id AND v.state='SHADOW_PENDING'
  AND v.continuity_head_sha256=p_expected_head_sha256 AND v.continuity_revision=p_expected_revision
  AND v.signal_kind='QUALIFIER_PROOF_CHANGED'
  AND v.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
  AND v.source_receipt_sha256=o->>'qualifier_receipt_sha256'
  AND v.governed_wake_queued_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
    WHERE c.claimant_worker_run_id=p_worker_run_id OR c.canonical_verify_invocation_run_id=p_worker_run_id)
 ORDER BY v.created_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_PRECLAIM_EVENT_REQUIRED');END IF;
 qualifier_digest:=o->>'qualifier_receipt_sha256';
 SELECT q.reconciliation_snapshot INTO qualifier
 FROM reality_internal.owner_continuity_qualification_routes_v1 q
 WHERE q.owner_id=s.owner_id AND q.intake_family='SIGNED_SHIFT_SOURCE'
  AND q.source_ref=o->>'source_ref' AND q.reconciliation_receipt_sha256=qualifier_digest
  AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
  AND q.reconciliation_snapshot->>'shift_id'=p_shift_id::text
  AND q.reconciliation_snapshot->>'original_candidate_work_id'=p_original_work_id
  AND q.reconciliation_checked_at>=pg_catalog.clock_timestamp()-interval '10 minutes'
 ORDER BY q.reconciliation_checked_at DESC LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_FRESH_QUALIFIER_REQUIRED');END IF;
 -- A prior signed release can finish before a child claim exists (for
 -- example, when the RPC gateway rejects a newly installed capability).
 -- Retain that completed event as an observation of the worker boundary.
 -- Absence of a canonical child claim is NOT a provider outcome.
 -- Share exact historical eligibility with continuation qualification.
 pending_readback:=reality_internal.read_final_loop_invocation_return_pending_v1(
  p_shift_id,s.owner_id,p_original_work_id,o->>'source_ref',p_expected_head_sha256,
  p_expected_revision,qualifier_digest,qualifier,e,current_event_id,p_worker_run_id);
 IF pending_readback->>'ready' IS DISTINCT FROM 'true'
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_PENDING_EVENTS_REQUIRE_CAUSAL_RECONCILIATION',
  'canonical_return_committed',false,'replay_authorized',false);END IF;
 prior_preclaim_events:=pending_readback->'prior_preclaim_events';
 END IF;
 SELECT u.event_id,u.worldline_id,u.lineage_hash INTO tail FROM public.universe_events u
  WHERE u.continuity_root_id=root AND u.payload->>'owner_id'=s.owner_id::text
   AND u.payload->>'shift_id'=p_shift_id::text ORDER BY u.assertion_time DESC,u.event_id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR 'sha256:'||tail.lineage_hash IS DISTINCT FROM p_expected_head_sha256
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_CAUSAL_HEAD_DRIFT_NO_REPLAY');END IF;
 -- All suspended subscriptions must be current and individually scoped.
 IF EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 sub
  WHERE sub.shift_id=p_shift_id AND (sub.owner_id<>s.owner_id
    OR sub.original_work_id<>p_original_work_id
    OR sub.continuity_head_sha256<>p_expected_head_sha256
    OR sub.continuity_revision<>p_expected_revision))
 THEN RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_RETURN_SUBSCRIPTION_RECONCILIATION_REQUIRED');END IF;
 SELECT count(*) INTO sub_count FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=p_shift_id;
 SELECT count(*),coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',v.event_id,'signal_kind',v.signal_kind,'signal_next_action',v.signal_next_action,
  'source_receipt_sha256',v.source_receipt_sha256,'previous_receipt_sha256',v.previous_receipt_sha256,
  'event_causality_sha256',v.event_causality_sha256,'continuity_head_sha256',v.continuity_head_sha256,
  'continuity_revision',v.continuity_revision,'state',v.state,
  'worker_run_id',v.governed_wake_worker_run_id,
  'disposition',CASE WHEN v.event_id=current_event_id THEN CASE WHEN receipt_return THEN 'INDEPENDENT_CHILD_RECEIPT_OBSERVED' ELSE 'EVIDENCE_ONLY_RETURN' END
   WHEN EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(prior_preclaim_events) x
     WHERE x.value->>'event_id'=v.event_id::text) THEN 'SIGNED_WORKER_FINISHED_NO_CANONICAL_CHILD_CLAIM_OBSERVED'
   WHEN v.governed_wake_worker_run_id IS NULL THEN 'STALE_SIGNAL_OBLIGATION_PRESERVED'
   ELSE 'HISTORICAL_INVOCATION_OBSERVED' END
 ) ORDER BY v.event_id),'[]'::jsonb)
 INTO old_count,old_events FROM reality_internal.final_loop_resume_events_v1 v
 WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING';
 stamp:=pg_catalog.clock_timestamp();iso:=pg_catalog.to_char(stamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 event:=pg_catalog.gen_random_uuid();
 payload:=pg_catalog.jsonb_build_object('schema','reality-final-loop-invocation-observation-return-v1',
  'owner_id',s.owner_id,'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'source_ref',o->>'source_ref','observation_sha256',observation_hash,'invocation_observations',e->'observations',
  'prior_resume_events',old_events,'prior_preclaim_worker_observations',prior_preclaim_events,
  'unresolved_proof_gates',qualifier->'unsatisfied_gates',
  'terminal_recovery_history',qualifier->'recovery_terminal_history',
  'provider_outcome_verified',false,'original_job_completed',false,
  'execution_authorized',false,'replay_authorized',false,'production_changed',false);
 refs:=pg_catalog.jsonb_build_array(observation_hash,o->>'qualifier_receipt_sha256');
 entity_type:='reality_final_loop_invocation_observation_v1';
 IF receipt_return THEN
  entity_type:='reality_final_loop_independent_child_receipt_observation_v1';
  payload:=payload||pg_catalog.jsonb_build_object(
   'schema','reality-final-loop-independent-child-receipt-return-v1',
   'independent_child_receipt',verified_receipt,
   'uncertain_invocations',coalesce((SELECT pg_catalog.jsonb_agg(x ORDER BY n)
     FROM pg_catalog.jsonb_array_elements(e->'observations') WITH ORDINALITY z(x,n)
     WHERE x->>'model_artifact_recorded'='false'),'[]'::jsonb),
   'uncertain_provider_outcomes_preserved',true,'parent_obligation_remains_open',true);
  refs:=refs||pg_catalog.jsonb_build_array(verified_receipt->>'independent_review_receipt_sha256');
 END IF;
 provenance:=pg_catalog.jsonb_build_object('source','SIGNED_CANONICAL_INVOCATION_READBACK',
  'principal_id',s.owner_id,'worker_run_id',p_worker_run_id,'continuity_spine',pg_catalog.jsonb_build_object(
   'version','reality-continuity-spine-v2.1','source_event_id',tail.event_id::text,
   'prior_lineage_hash',tail.lineage_hash,'transformation_receipt_id',NULL));
 content_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(payload),'UTF8')),'hex');
 basis:=pg_catalog.jsonb_build_object('spine_version','reality-continuity-spine-v2.1',
  'continuity_root_id',root::text,'worldline_id',tail.worldline_id::text,
  'parent_event_id',tail.event_id,'prior_lineage_hash',tail.lineage_hash,
  'stage','OBSERVATION','entity_id',event::text,'evidence_refs',refs,
  'transformation_receipt_id',NULL,'effective_time',iso,'assertion_time',iso,
  'epistemic_status','OBSERVED','payload',payload,'provenance',provenance);
 lineage:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  public.reality_continuity_canonical_json_v1(basis),'UTF8')),'hex');
 checkpoint:=pg_catalog.jsonb_build_object('shift_id',p_shift_id,'owner_id',s.owner_id,
  'original_work_id',p_original_work_id,'source_ref',o->>'source_ref','plan_fingerprint',s.plan_fingerprint,
  'frozen_shift_scope_sha256',p->>'frozen_shift_scope_sha256','continuity_root_id',root,
  'continuity_head_sha256',p_expected_head_sha256,'expected_revision',p_expected_revision,
  'worker_run_id',p_worker_run_id,'decision','SUSPEND','reason_code','PROVIDER_EFFECT_UNCERTAIN');
 checkpoint_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(checkpoint::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1
  (shift_id,owner_id,original_work_id,source_ref,plan_fingerprint,frozen_shift_scope_sha256,
  continuity_root_id,continuity_head_sha256,expected_revision,worker_run_id,decision,reason_code,receipt_sha256)
 VALUES(p_shift_id,s.owner_id,p_original_work_id,o->>'source_ref',s.plan_fingerprint,p->>'frozen_shift_scope_sha256',
  root,p_expected_head_sha256,p_expected_revision,p_worker_run_id,'SUSPEND','PROVIDER_EFFECT_UNCERTAIN',checkpoint_hash)
 RETURNING receipt_id INTO receipt;
 INSERT INTO public.universe_events(event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,
  effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
 VALUES(event,'OBSERVATION',entity_type,event,root,tail.worldline_id,tail.event_id,
  stamp,stamp,'OBSERVED',payload,refs,provenance,content_hash,lineage);
 UPDATE reality_internal.final_loop_resume_events_v1 v SET state='SHADOW_OBSERVED',observed_at=stamp
 WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING'
  AND (v.event_id=current_event_id OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(e->'observations') x WHERE x.value->>'event_id'=v.event_id::text)
   OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(prior_preclaim_events) x WHERE x.value->>'event_id'=v.event_id::text));
 GET DIAGNOSTICS observed_count=ROW_COUNT;
 UPDATE reality_internal.final_loop_resume_events_v1 v SET state='SHADOW_STALE',observed_at=stamp
 WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING'
  AND v.governed_wake_worker_run_id IS NULL AND v.governed_wake_request_id IS NULL
  AND v.governed_wake_queued_at IS NULL
  AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(old_events) x
   WHERE x.value->>'event_id'=v.event_id::text AND x.value->>'disposition'='STALE_SIGNAL_OBLIGATION_PRESERVED');
 GET DIAGNOSTICS stale_count=ROW_COUNT;
 IF observed_count+stale_count<>old_count THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_EVENT_CAS_FAILED';END IF;
 UPDATE reality_internal.final_loop_resume_conditions_v1 SET continuity_head_sha256='sha256:'||lineage,
  continuity_revision=p_expected_revision+1,state='SUSPENDED',updated_at=stamp,
  subscribed_receipt_sha256=CASE WHEN condition_kind='QUALIFIER_PROOF_CHANGED' THEN qualifier_digest ELSE subscribed_receipt_sha256 END,
  next_qualified_action=CASE WHEN condition_kind='QUALIFIER_PROOF_CHANGED' THEN qualifier->>'next_action' ELSE next_qualified_action END,
  unresolved_proof_gates=qualifier->'unsatisfied_gates'
 WHERE shift_id=p_shift_id AND owner_id=s.owner_id AND continuity_head_sha256=p_expected_head_sha256
  AND continuity_revision=p_expected_revision;
 GET DIAGNOSTICS rebound=ROW_COUNT;
 IF rebound<>sub_count THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_SUBSCRIPTION_CAS_FAILED';END IF;
 after_p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 after_g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF after_p->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
  OR (after_p->>'revision')::bigint IS DISTINCT FROM p_expected_revision+1
  OR after_g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
  OR after_g->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
 THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_POSTWRITE_READBACK_FAILED';END IF;
 IF receipt_return AND NOT EXISTS(SELECT 1
  FROM pg_catalog.jsonb_array_elements(after_g->'obligations') ob
  CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(ob->'independent_child_receipt_readback') rr
  WHERE ob->>'original_work_id'=p_original_work_id AND ob->>'source_ref'=o->>'source_ref'
   AND rr->>'event_id'=event::text AND rr->'receipt'=verified_receipt
   AND rr->'uncertain_invocations'=payload->'uncertain_invocations')
 THEN RAISE EXCEPTION 'FINAL_LOOP_INDEPENDENT_CHILD_RECEIPT_POSTWRITE_READBACK_FAILED';END IF;
 RETURN jsonb_build_object('status',CASE WHEN receipt_return THEN 'FINAL_LOOP_INDEPENDENT_CHILD_RECEIPT_RETURNED_ORIGINAL_OPEN' ELSE 'FINAL_LOOP_SPINE_OBSERVATIONS_RETURNED_ORIGINAL_OPEN' END,
  'canonical_return_committed',true,'event_id',event,'checkpoint_receipt_id',receipt,
  'observation_sha256',observation_hash,'continuity_head_sha256','sha256:'||lineage,
  'revision',p_expected_revision+1,'rebound_subscriptions',rebound,'observed_events',observed_count,'stale_signals_preserved',stale_count,
  'prior_preclaim_workers_observed',pg_catalog.jsonb_array_length(prior_preclaim_events),
  'execution_authorized',false,'replay_authorized',false,'original_job_completed',false);
END $fn$;
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
 v_invocation_observation_hash text;v_return_event uuid;v_return_head text;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'FINAL_LOOP_SHARED_CONTINUITY_SERVICE_ONLY';END IF;
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
     'worker_completed',r.status='COMPLETED','model_artifact_recorded',c.model_response_id IS NOT NULL,
     'provider_outcome_verified',false,'replay_authorized',false
   ) || CASE WHEN r.status='FAILED' THEN pg_catalog.jsonb_build_object(
     'worker_terminal_status','FAILED','worker_failure_stage',r.worker_stage,
     'worker_failure_attested',true,'provider_outcome_unknown',true)
     ELSE '{}'::jsonb END ORDER BY c.scope_index,c.child_work_id),'[]'::jsonb)
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
    AND ca.owner_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=c.claimant_worker_run_id
    AND r.finished_at IS NOT NULL AND r.started_at IS NOT NULL
    AND (r.status='COMPLETED' OR (r.status='FAILED'
      AND r.worker_stage='EXACT_CLAIMED_REVIEW_CONTINUITY_RETURN_FENCE'
      AND r.finished_at>=r.started_at AND c.phase='CLAIMED'
      AND c.model_response_id IS NULL AND c.review_sha256 IS NULL
      AND c.independent_review_receipt_sha256 IS NULL))
   JOIN reality_internal.final_loop_resume_events_v1 e ON e.governed_wake_worker_run_id=r.run_id
    AND e.shift_id=c.shift_id AND e.owner_id=c.owner_id
    AND e.original_work_id=c.parent_original_work_id AND e.source_ref=v_source
    AND e.governed_wake_queued_at IS NOT NULL
   JOIN reality_internal.governed_signed_worker_release_wakes_v1 w ON w.worker_run_id=r.run_id
    AND w.owner_id=c.owner_id AND w.shift_id=c.shift_id
    AND w.operating_lane='NORMAL_SIGNED_SHIFT'
    AND w.release_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=w.release_claim_id
    AND a.owner_id=c.owner_id AND a.shift_id=c.shift_id AND a.release_sha=w.running_release_sha
    AND a.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   WHERE c.owner_id=v_owner AND c.shift_id=p_shift_id
    AND c.parent_original_work_id=v_work AND c.canonical_prepare_invocation_id IS NOT NULL
    -- A failed run is only evidence of its signed terminal worker state.
    -- Require the exact consumed event, release approval and time ordering.
    AND (r.status='COMPLETED' OR (
      e.release_continuation_claim_id=a.claim_id
      AND e.signal_kind='QUALIFIER_PROOF_CHANGED'
      AND e.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
      AND e.governed_wake_nonce IS NOT NULL AND e.governed_wake_request_id IS NOT NULL
      AND e.governed_wake_requested_at<=e.governed_wake_queued_at
      AND e.governed_wake_queued_at<=r.started_at
      AND c.claimed_at>=r.started_at AND c.claimed_at<=r.finished_at
      AND a.state='CLAIMED_ONCE' AND a.capability_key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
      AND a.provider_alias_observed_at>=a.claimed_at AND a.provider_alias_observed_at<=r.started_at
      AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
      AND a.release_ref=w.running_release_ref
      AND a.runtime_scope->>'original_work_id'=c.parent_original_work_id
      AND a.runtime_scope->>'source_ref'=v_source
      AND a.runtime_scope->>'exact_runtime_database_contract_verified'='true'
      AND a.runtime_scope->>'independent_gateway_ci_verified'='true'
      AND a.runtime_scope->>'independent_qualification_branch_verified'='true'
      AND a.runtime_scope->>'child_execution_enabled'='false'
      AND a.runtime_scope->>'parent_delivery_enabled'='false'
      AND a.runtime_scope->>'production_changed'='false'));

   -- The writer's response is never its own proof. Independently locate
   -- the identical observation set on the same canonical parent chain.
   v_invocation_observation_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(v_observations::text,'UTF8')),'hex');
   v_return_event:=NULL;v_return_head:=NULL;
   SELECT u.event_id,'sha256:'||u.lineage_hash INTO v_return_event,v_return_head
   FROM public.universe_events u
   JOIN public.universe_events prior ON prior.event_id=u.parent_event_id
    AND prior.continuity_root_id=u.continuity_root_id AND prior.worldline_id=u.worldline_id
   JOIN reality_internal.final_loop_transition_receipts_v1 tr
    ON tr.shift_id=p_shift_id AND tr.owner_id=v_owner AND tr.original_work_id=v_work
    AND tr.continuity_root_id=v_root AND tr.continuity_head_sha256='sha256:'||prior.lineage_hash
    AND tr.decision='SUSPEND' AND tr.reason_code='PROVIDER_EFFECT_UNCERTAIN'
    AND tr.worker_run_id::text=u.provenance->>'worker_run_id'
   WHERE u.continuity_root_id=v_root AND u.event_kind='OBSERVATION'
    AND u.entity_type='reality_final_loop_invocation_observation_v1' AND u.epistemic_status='OBSERVED'
    AND u.payload->>'owner_id'=v_owner::text AND u.payload->>'shift_id'=p_shift_id::text
    AND u.payload->>'original_work_id'=v_work AND u.payload->>'source_ref'=v_source
    AND u.payload->>'observation_sha256'=v_invocation_observation_hash
    AND u.payload->'invocation_observations'=v_observations
    AND u.payload->>'provider_outcome_verified'='false' AND u.payload->>'original_job_completed'='false'
    AND u.payload->>'execution_authorized'='false' AND u.payload->>'replay_authorized'='false'
    AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
     public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
    AND u.lineage_hash~'^[a-f0-9]{64}$'
    AND u.provenance->'continuity_spine'->>'prior_lineage_hash'=prior.lineage_hash
    AND u.provenance->'continuity_spine'->>'source_event_id'=prior.event_id::text
   ORDER BY u.assertion_time DESC,u.event_id DESC LIMIT 1;
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
        WHEN v_return_event IS NOT NULL THEN 'SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN'
        ELSE 'SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN' END,
       'fenced_count',v_fenced_count,'signed_observation_count',v_observation_count,
       'observations',v_observations,
        -- A receipt for a completed subset is historical proof, not proof
        -- that the CURRENT set of fenced invocations has returned.
        'canonical_return_committed',v_return_event IS NOT NULL AND v_fenced_count=v_observation_count AND v_fenced_count>0,
        'observation_sha256',v_invocation_observation_hash,
        'canonical_return_event_id',CASE WHEN v_fenced_count=v_observation_count AND v_fenced_count>0 THEN v_return_event END,
        'canonical_return_head_sha256',CASE WHEN v_fenced_count=v_observation_count AND v_fenced_count>0 THEN v_return_head END,
        'historical_subset_return_event_id',CASE WHEN v_fenced_count<>v_observation_count THEN v_return_event END,
        'historical_subset_return_head_sha256',CASE WHEN v_fenced_count<>v_observation_count THEN v_return_head END,
       'execution_authorized',false,'provider_outcome_verified',false,
       'original_job_completed',false,'replay_authorized',false),
     'same_head_evidence_checkpoint_observed',has_checkpoint,
     'independent_child_receipt_readback',(
      SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('event_id',u.event_id,
        'receipt',u.payload->'independent_child_receipt','uncertain_invocations',u.payload->'uncertain_invocations')
        ORDER BY u.assertion_time,u.event_id),'[]'::jsonb)
      FROM public.universe_events u
      JOIN public.universe_events prior ON prior.event_id=u.parent_event_id
       AND prior.continuity_root_id=u.continuity_root_id AND prior.worldline_id=u.worldline_id
      WHERE u.continuity_root_id=v_root AND u.entity_type='reality_final_loop_independent_child_receipt_observation_v1'
       AND u.epistemic_status='OBSERVED' AND u.payload->>'owner_id'=v_owner::text
       AND u.payload->>'shift_id'=p_shift_id::text AND u.payload->>'original_work_id'=v_work AND u.payload->>'source_ref'=v_source
       AND u.payload->>'original_job_completed'='false' AND u.payload->>'replay_authorized'='false'
       AND u.payload->>'execution_authorized'='false' AND u.payload->>'production_changed'='false'
       AND u.evidence_refs ? (u.payload->'independent_child_receipt'->>'independent_review_receipt_sha256')
       AND u.content_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(u.payload),'UTF8')),'hex')
       AND u.payload->'independent_child_receipt'=reality_internal.read_final_loop_verified_child_receipt_v1(
        p_shift_id,v_work,(u.provenance->>'worker_run_id')::uuid,'sha256:'||prior.lineage_hash,
        (u.payload->'independent_child_receipt'->>'prior_revision')::bigint)
       AND EXISTS(SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 tr
        WHERE tr.shift_id=p_shift_id AND tr.owner_id=v_owner AND tr.original_work_id=v_work
         AND tr.continuity_root_id=v_root AND tr.continuity_head_sha256='sha256:'||prior.lineage_hash
         AND tr.worker_run_id::text=u.provenance->>'worker_run_id' AND tr.decision='SUSPEND'
         AND tr.reason_code='PROVIDER_EFFECT_UNCERTAIN')),

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
CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE ledger_stage jsonb; demand record; child_return jsonb;
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
   -- Return the actual independent receipt on the same signed completion.
   -- No model call, worker dispatch, new authority or parent settlement.
   IF NEW.status='COMPLETED' AND OLD.status='STARTED' AND NEW.worker_stage='WORKER_RESPONSE_PUBLICATION' THEN
    FOR demand IN SELECT DISTINCT e.shift_id,e.original_work_id,e.continuity_head_sha256,e.continuity_revision
     FROM reality_internal.final_loop_resume_events_v1 e
     JOIN reality_internal.final_loop_child_review_work_v1 c ON c.independent_verifier_run_id=NEW.run_id
      AND c.canonical_verify_invocation_run_id=NEW.run_id AND c.shift_id=e.shift_id
      AND c.parent_original_work_id=e.original_work_id AND c.phase='INDEPENDENTLY_VERIFIED'
     WHERE e.governed_wake_worker_run_id=NEW.run_id AND e.state='SHADOW_PENDING'
    LOOP
     PERFORM reality_internal.reconcile_current_qualification_proofs_v1(demand.shift_id);
     child_return:=public.reality_return_final_loop_invocation_observations_v1(demand.shift_id,
       demand.original_work_id,NEW.run_id,demand.continuity_head_sha256,demand.continuity_revision);
    END LOOP;
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
