-- Reality shared continuity/verifier guard, additive security upgrade.
-- Same canonical ledger and independent provider verification, no new ledger,
-- no dispatcher, no installed action and no invented acceptance receipts.
-- Current authorized source/scope and CAS remain enforced by existing writer.

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
 v_work text;v_source text;v_qual_next text;
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
   -- Only a genuinely settled parent with its referenced independent Universe
   -- OUTCOME event counts as the Universe return. A VERIFIED WORK event isn't it.
   SELECT EXISTS(
     SELECT 1 FROM reality_internal.final_loop_parent_deliveries_v1 d
     JOIN public.universe_events e
       ON e.event_id=d.universe_outcome_event_id
      AND e.continuity_root_id=v_root
      AND e.event_kind='OUTCOME' AND e.epistemic_status='VERIFIED'
     WHERE d.shift_id=p_shift_id AND d.owner_id=v_owner
       AND d.source_ref=v_source AND d.parent_original_work_id=v_work
       AND d.original_settlement_receipt_id IS NOT NULL
       AND d.universe_outcome_event_id IS NOT NULL
       AND d.settled_at IS NOT NULL
   ) INTO has_universe;
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
   IF NOT qualifier_ok OR j->>'independent_source_proof_verified'<>'true'
   THEN v_mismatches:=v_mismatches+1;END IF;
   v_items:=v_items||pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object(
     'original_work_id',v_work,'source_ref',v_source,
     'status',CASE WHEN NOT qualifier_ok THEN 'QUALIFIER_CHAIN_UNVERIFIED'
      WHEN j->>'independent_source_proof_verified'<>'true' THEN 'SOURCE_UNVERIFIED'
      WHEN has_final AND has_universe THEN 'INDEPENDENTLY_SETTLED_WITH_UNIVERSE'
      ELSE 'CONTINUITY_OPEN_PENDING_PROOFS' END,
     'source_proof_verified',j->>'independent_source_proof_verified'='true',
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
   'obligations',v_items,'unverified_handoffs',v_mismatches);
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

CREATE OR REPLACE FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(p_shift_id uuid, p_original_work_id text, p_worker_run_id uuid, p_expected_revision bigint, p_expected_scope_sha256 text, p_expected_head_sha256 text, p_decision text, p_reason_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shift record;v_snapshot jsonb;v_job jsonb;v_run record;
 v_receipt uuid;v_hash text;v_body jsonb;v_result jsonb;
 v_shared jsonb;v_shared_job jsonb;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CHECKPOINT_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL OR p_original_work_id IS NULL OR
  p_original_work_id !~ '^work:[a-f0-9]{32}$' OR p_worker_run_id IS NULL OR
  p_expected_revision IS NULL OR p_expected_revision<1 OR
  coalesce(p_expected_scope_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_expected_head_sha256,'') !~ '^sha256:[a-f0-9]{64}$' OR
  coalesce(p_decision,'') NOT IN ('REFRESH','SUSPEND','ADVANCE','RECOVER','SETTLE') OR
  coalesce(p_reason_code,'') NOT IN
   ('CANONICAL_ACCEPTANCE_PENDING','EPISTEMIC_PROOF_STALE',
    'AUTHORITY_NOT_VERIFIED','CAPACITY_NOT_VERIFIED',
    'PROVIDER_EFFECT_UNCERTAIN','BLOCKER_ATTESTATION_PENDING',
    'CONTINUITY_REOBSERVATION_REQUIRED') THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_CHECKPOINT_INVALID_SCOPE',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false); END IF;
 -- Do not widen the granted shift into arbitrary execution/installation.
 IF p_decision NOT IN ('REFRESH','SUSPEND') THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_FOUR_PROOFS_AND_ATOMIC_EXECUTOR_CLAIM_REQUIRED',
   'transition_committed',false,'execution_authorized',false,
   'installation_authorized',false,'original_job_completed',false);
 END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint
 INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
  ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
  AND s.closed_at IS NULL AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' FOR UPDATE OF s;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_ORIGINAL_SHIFT_NOT_CURRENT',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 SELECT r.run_id,r.status,r.started_at INTO v_run
 FROM reality_internal.signed_worker_actual_runs_v1 r
 WHERE r.run_id=p_worker_run_id AND r.status='STARTED' AND r.finished_at IS NULL
  AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes';
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_SIGNED_WORKER_RUN_REQUIRED',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 v_snapshot:=public.reality_read_current_final_loop_proof_envelope_v1(
  p_shift_id);
 IF v_snapshot->>'status' <>
  'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING' OR
  v_snapshot->>'frozen_shift_scope_sha256'<>p_expected_scope_sha256 OR
  v_snapshot->>'continuity_head_sha256'<>p_expected_head_sha256 OR
  (v_snapshot->>'revision')::bigint<>p_expected_revision THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_CAUSAL_HEAD_OR_SCOPE_DRIFT_NO_REPLAY',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 SELECT j.value INTO v_job FROM
  jsonb_array_elements(v_snapshot->'jobs') j(value)
 WHERE j.value->>'original_work_id'=p_original_work_id
  AND j.value->>'independent_source_proof_verified'='true';
 IF NOT FOUND OR v_job->>'source_ref' IS NULL THEN
  RETURN jsonb_build_object(
   'status','FINAL_LOOP_CANONICAL_ORIGINAL_NOT_ADMITTED',
   'transition_committed',false,'original_job_completed',false);
 END IF;

 -- One shared, read-only guard must resolve the EXACT original, current
 -- ledger head and independently checked qualifier before any checkpoint.
 -- It never grants execution, approval, installation, or settlement.
 v_shared:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF v_shared->>'status'<>'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
   OR v_shared->>'owner_id'<>v_shift.owner_id::text
   OR v_shared->>'shift_id'<>p_shift_id::text
   OR v_shared->>'continuity_root_id'<>v_snapshot->>'continuity_root_id'
   OR v_shared->>'continuity_head_sha256'<>p_expected_head_sha256
   OR v_shared->>'frozen_shift_scope_sha256'<>p_expected_scope_sha256
   OR (v_shared->>'revision')::bigint<>p_expected_revision
   OR v_shared->>'execution_authorized'<>'false'
   OR v_shared->>'transition_committed'<>'false'
   OR v_shared->>'installation_authorized'<>'false'
   OR v_shared->>'original_job_completed'<>'false'
 THEN RETURN jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_HEAD_OR_SCOPE_UNVERIFIED_NO_EFFECT',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false);END IF;
 SELECT value INTO v_shared_job FROM
   pg_catalog.jsonb_array_elements(v_shared->'obligations') ob(value)
 WHERE ob.value->>'original_work_id'=p_original_work_id
   AND ob.value->>'source_ref'=v_job->>'source_ref';
 IF NOT FOUND OR v_shared_job->>'source_proof_verified'<>'true'
   OR v_shared_job->>'qualifier_digest_verified'<>'true'
   OR v_shared_job->>'continuity_identity_verified'<>'true'
   OR v_shared_job->>'execution_permitted_by_handoff'<>'false'
 THEN RETURN jsonb_build_object(
   'status','FINAL_LOOP_SHARED_CONTINUITY_PROOF_OR_IDENTITY_GAP_NO_EFFECT',
   'transition_committed',false,'execution_authorized',false,
   'original_job_completed',false);END IF;

 v_body:=jsonb_build_object(
  'shift_id',p_shift_id,'owner_id',v_shift.owner_id,
  'original_work_id',p_original_work_id,
  'source_ref',v_job->>'source_ref',
  'plan_fingerprint',v_shift.plan_fingerprint,
  'frozen_shift_scope_sha256',p_expected_scope_sha256,
  'continuity_root_id',v_snapshot->>'continuity_root_id',
  'continuity_head_sha256',p_expected_head_sha256,
  'expected_revision',p_expected_revision,
  'worker_run_id',p_worker_run_id,'decision',p_decision,
  'reason_code',p_reason_code);
 v_hash:='sha256:'||pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(v_body::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1
  (shift_id,owner_id,original_work_id,source_ref,plan_fingerprint,
   frozen_shift_scope_sha256,continuity_root_id,
   continuity_head_sha256,expected_revision,worker_run_id,
   decision,reason_code,receipt_sha256)
 VALUES(p_shift_id,v_shift.owner_id,p_original_work_id,
  v_job->>'source_ref',v_shift.plan_fingerprint,
  p_expected_scope_sha256,(v_snapshot->>'continuity_root_id')::uuid,
  p_expected_head_sha256,p_expected_revision,p_worker_run_id,
  p_decision,p_reason_code,v_hash)
 ON CONFLICT DO NOTHING RETURNING receipt_id INTO v_receipt;
 IF v_receipt IS NULL THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EXISTING_CHECKPOINT_NO_REPLAY',
   'transition_committed',false,'original_job_completed',false);
 END IF;
 RETURN jsonb_build_object(
  'schema','reality-final-loop-evidence-checkpoint-v1',
  'status','FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_DURABLY_RECORDED',
  'receipt_id',v_receipt,'receipt_sha256',v_hash,
  'shift_id',p_shift_id,'original_work_id',p_original_work_id,
  'decision',p_decision,'reason_code',p_reason_code,
  'evidence_only',true,'transition_committed',true,
  'shared_continuity_guard_verified',true,
  'shared_continuity_observation_sha256',
    v_shared->>'handoff_observation_sha256',
  'executor_invoked',false,'execution_authorized',false,
  'repair_executed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(uuid,text,uuid,bigint,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_final_loop_evidence_checkpoint_v1(uuid,text,uuid,bigint,text,text,text,text) TO service_role;

