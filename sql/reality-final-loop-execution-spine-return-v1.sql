-- Evidence-only return to the existing canonical Spine. No additional
-- scheduler, ledger, model invocation, installation or recovery authority.
-- Deliberately requires a current signed run and exact CAS snapshot.
-- Single read-only predicate for the existing canonical writer and its
-- continuation qualification. Without a current event, every pending event
-- must already have independently bound historical evidence. No new authority.
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
  AND a.runtime_scope->>'continuity_head_sha256'=v.continuity_head_sha256
  AND a.runtime_scope->>'continuity_revision'=v.continuity_revision::text
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
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'FINAL_LOOP_SPINE_RETURN_SERVICE_ONLY';END IF;
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
 IF NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
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
  'disposition',CASE WHEN v.event_id=current_event_id THEN 'EVIDENCE_ONLY_RETURN'
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
 VALUES(event,'OBSERVATION','reality_final_loop_invocation_observation_v1',event,root,tail.worldline_id,tail.event_id,
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
 RETURN jsonb_build_object('status','FINAL_LOOP_SPINE_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  'canonical_return_committed',true,'event_id',event,'checkpoint_receipt_id',receipt,
  'observation_sha256',observation_hash,'continuity_head_sha256','sha256:'||lineage,
  'revision',p_expected_revision+1,'rebound_subscriptions',rebound,'observed_events',observed_count,'stale_signals_preserved',stale_count,
  'prior_preclaim_workers_observed',pg_catalog.jsonb_array_length(prior_preclaim_events),
  'execution_authorized',false,'replay_authorized',false,'original_job_completed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_return_final_loop_invocation_observations_v1(uuid,text,uuid,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_return_final_loop_invocation_observations_v1(uuid,text,uuid,text,bigint) TO service_role;

-- Read the changed condition from the independently verified Continuity guard.
-- A release is only a transport identity; the condition hash is separately
-- deduplicated across release activations. No provider effects are inferred.
CREATE OR REPLACE FUNCTION reality_internal.read_final_loop_ledger_return_condition_v1(
 p_shift_id uuid,p_release_claim_id uuid,p_current_event_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $condition$
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
 OR g->>'continuity_head_sha256' IS DISTINCT FROM a.runtime_scope->>'continuity_head_sha256'
 OR g->>'revision' IS DISTINCT FROM a.runtime_scope->>'continuity_revision'
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
END $condition$;
REVOKE ALL ON FUNCTION reality_internal.read_final_loop_ledger_return_condition_v1(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_final_loop_ledger_return_condition_v1(uuid,uuid,uuid,uuid) TO service_role;

-- The trusted independent post-install verifier may call this on a changed
-- condition. It inserts into the existing event inbox: the existing trigger
-- and lease release path perform delivery; this function never calls HTTP.
CREATE OR REPLACE FUNCTION public.reality_stage_final_loop_ledger_return_v1(p_shift_id uuid,p_release_claim_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $stage$
DECLARE proof jsonb; old_event record; staged uuid;
BEGIN
 IF current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'LEDGER_RETURN_STAGE_SERVICE_ONLY';END IF;
 proof:=reality_internal.read_final_loop_ledger_return_condition_v1(p_shift_id,p_release_claim_id,NULL,NULL);
 IF proof IS NULL THEN RETURN pg_catalog.jsonb_build_object('status','LEDGER_RETURN_CONDITION_NOT_QUALIFIED','execution_authorized',false);END IF;
 -- Use the already verified qualifier subscription, never synthesize a new
 -- qualifier receipt. All earlier events remain immutable historical evidence.
 SELECT v.* INTO old_event FROM reality_internal.final_loop_resume_events_v1 v
 JOIN reality_internal.final_loop_resume_conditions_v1 c ON c.shift_id=v.shift_id AND c.owner_id=v.owner_id
  AND c.original_work_id=v.original_work_id AND c.source_ref=v.source_ref AND c.condition_kind=v.signal_kind
  AND c.continuity_head_sha256=v.continuity_head_sha256 AND c.continuity_revision=v.continuity_revision
  AND c.subscribed_receipt_sha256=v.previous_receipt_sha256
 WHERE v.shift_id=p_shift_id AND v.owner_id::text=proof->>'owner_id' AND v.original_work_id=proof->>'original_work_id'
 AND v.source_ref=proof->>'source_ref' AND v.continuity_head_sha256=proof->>'head' AND v.continuity_revision::text=proof->>'revision'
 AND v.signal_kind='QUALIFIER_PROOF_CHANGED' AND v.signal_next_action='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'
 AND v.source_receipt_sha256=proof->>'qualifier' AND v.source_receipt_sha256<>v.previous_receipt_sha256
 AND v.governed_wake_worker_run_id IS NOT NULL AND v.governed_wake_request_id IS NOT NULL
 AND v.ledger_return_condition_sha256 IS NULL AND v.state='SHADOW_PENDING'
 ORDER BY v.created_at DESC LIMIT 1 FOR UPDATE OF c;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','LEDGER_RETURN_SUBSCRIPTION_NOT_CURRENT','execution_authorized',false);END IF;
 INSERT INTO reality_internal.final_loop_resume_events_v1(
  shift_id,owner_id,original_work_id,source_ref,signal_kind,source_receipt_sha256,previous_receipt_sha256,
  event_causality_sha256,continuity_head_sha256,continuity_revision,signal_next_action,
  release_continuation_claim_id,ledger_return_condition_sha256)
 VALUES(old_event.shift_id,old_event.owner_id,old_event.original_work_id,old_event.source_ref,
  old_event.signal_kind,old_event.source_receipt_sha256,old_event.previous_receipt_sha256,old_event.event_causality_sha256,
  old_event.continuity_head_sha256,old_event.continuity_revision,old_event.signal_next_action,p_release_claim_id,proof->>'condition_sha256')
 ON CONFLICT DO NOTHING RETURNING event_id INTO staged;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN staged IS NOT NULL THEN 'LEDGER_RETURN_EVENT_STAGED' ELSE 'LEDGER_RETURN_CONDITION_ALREADY_STAGED_NO_REPLAY' END,
  'event_id',staged,'condition_sha256',proof->>'condition_sha256','execution_authorized',false,'replay_authorized',false,'original_job_completed',false);
END $stage$;
REVOKE ALL ON FUNCTION public.reality_stage_final_loop_ledger_return_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_stage_final_loop_ledger_return_v1(uuid,uuid) TO service_role;
