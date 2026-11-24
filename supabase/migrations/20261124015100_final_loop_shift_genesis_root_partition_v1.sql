-- Reuse Reality's existing Continuity Ledger + independently verified Universe workline.
-- No new authority, model claim, new job, replay or production deployment.
-- This migration is repeatable from the installed, independently read function.

CREATE OR REPLACE FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shift record;v_graph jsonb;v_events integer;v_roots integer;
 v_root uuid;v_head text;v_rev bigint;v_scope_hash text;
 v_jobs jsonb:='[]'::jsonb;
 v_governed_handoffs jsonb:='[]'::jsonb;
BEGIN
 IF current_user <> 'service_role' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CANONICAL_READER_SERVICE_ONLY'; END IF;
 IF p_shift_id IS NULL THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_EXACT_SHIFT_REQUIRED',
   'read_only',true,'original_job_completed',false); END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint,w.mode,w.source_scope
 INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
  AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
  AND s.planned_end_at='infinity'::timestamptz
  AND s.status IN ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  AND w.state='ACTIVE' AND w.authorized_at IS NOT NULL;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_NO_ACTIVE_AUTHORIZED_SHIFT',
   'shift_id',p_shift_id,'read_only',true,
   'execution_authorized',false,'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 -- Reuse the real source-graph RPC. It already checks the frozen
 -- shift-source warrant and joins each admitted original by source proof.
 v_graph:=public.reality_read_owner_shift_execution_graph_v1(
  v_shift.owner_id,v_shift.shift_id);
 IF v_graph->>'status'<>'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'
  OR v_graph->>'owner_id'<>v_shift.owner_id::text
  OR v_graph->>'shift_id'<>v_shift.shift_id::text
  OR v_graph->>'plan_fingerprint'<>v_shift.plan_fingerprint
  OR jsonb_typeof(v_graph->'jobs')<>'array' THEN
  RAISE EXCEPTION 'FINAL_LOOP_NATIVE_OWNER_GRAPH_MISMATCH'; END IF;

 -- Select the SHIFT'S ORIGINAL SIGNAL ROOT, not every independent parent
 -- workline. Parent acceptance/settlement uses its own proof root/plan.
 -- Both are valid; only the original signal root drives this controller.
 SELECT count(*),count(DISTINCT e.continuity_root_id)
 INTO v_events,v_roots
 FROM public.universe_events e
 WHERE e.payload->>'owner_id'=v_shift.owner_id::text
   AND e.payload->>'shift_id'=v_shift.shift_id::text
   AND e.continuity_root_id IS NOT NULL
   AND e.event_kind='RAW_SIGNAL'
   AND e.parent_event_id IS NULL
   AND e.epistemic_status='OBSERVED'
   AND e.content_hash~'^[a-f0-9]{64}$'
   AND e.lineage_hash~'^[a-f0-9]{64}$';
 IF v_events<>1 OR v_roots<>1 THEN
  RETURN jsonb_build_object('status','FINAL_LOOP_CANONICAL_FIRST_SIGNAL_ROOT_UNVERIFIED',
   'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
   'read_only',true,'execution_authorized',false,
   'original_job_completed',false); END IF;
 SELECT e.continuity_root_id INTO v_root
 FROM public.universe_events e
 WHERE e.payload->>'owner_id'=v_shift.owner_id::text
   AND e.payload->>'shift_id'=v_shift.shift_id::text
   AND e.event_kind='RAW_SIGNAL' AND e.parent_event_id IS NULL
   AND e.epistemic_status='OBSERVED'
   AND e.content_hash~'^[a-f0-9]{64}$'
   AND e.lineage_hash~'^[a-f0-9]{64}$'
 LIMIT 1;
 SELECT e.lineage_hash INTO v_head
 FROM public.universe_events e
 WHERE e.continuity_root_id=v_root
   AND e.payload->>'owner_id'=v_shift.owner_id::text
   AND e.payload->>'shift_id'=v_shift.shift_id::text
 ORDER BY e.assertion_time DESC,e.event_id DESC LIMIT 1;
 IF v_head IS NULL OR v_head !~ '^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'FINAL_LOOP_CONTINUITY_LINEAGE_HASH_UNVERIFIED'; END IF;
 v_scope_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(jsonb_build_object(
   'shift_id',v_shift.shift_id,'owner_id',v_shift.owner_id,
   'plan_fingerprint',v_shift.plan_fingerprint,
   'mode',v_shift.mode,'source_scope',v_shift.source_scope
  )::text,'UTF8')),'hex');
 SELECT count(*)+1 INTO v_rev
 FROM reality_internal.final_loop_transition_receipts_v1 t
 WHERE t.shift_id=v_shift.shift_id AND t.owner_id=v_shift.owner_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'source_ref',j.value->>'source_ref',
  'original_work_id',j.value->>'original_work_id',
  'original_kind',j.value->>'original_kind',
  'source_step_index',(j.value->>'source_step_index')::integer,
  'source_phase',j.value->>'phase',
  'native_next_governed_action',j.value->>'next_governed_action',
  'source_proof_sha256',j.value->>'source_proof_sha256',
  'independent_source_proof_verified',
   j.value->>'independent_source_proof_verified'='true',
  'original_acceptance_verified',false,
  'authority_proof_verified',false,
  'capacity_proof_verified',false,
  'final_outcome_verified',false,
  'settlement_eligible',false,
  'evidence_checkpoint_recorded_on_head',EXISTS(
   SELECT 1 FROM reality_internal.final_loop_transition_receipts_v1 t
   WHERE t.shift_id=v_shift.shift_id
    AND t.owner_id=v_shift.owner_id
    AND t.original_work_id=j.value->>'original_work_id'
    AND t.continuity_head_sha256='sha256:'||v_head
    AND t.decision='REFRESH')
 ) ORDER BY (j.value->>'source_step_index')::integer),'[]'::jsonb)
 INTO v_jobs FROM jsonb_array_elements(v_graph->'jobs') j(value);

 -- Canonical read-only handoff projection for the same existing signed
 -- shift, verified source graph, and owner-scoped qualifier. A diagnosis is
 -- not a capability lease, an accepted customer goal, an installation
 -- warrant, or a Final Loop transition receipt.
 SELECT coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'source_ref',j.value->>'source_ref',
   'original_work_id',j.value->>'original_work_id',
   'source_step_index',j.value->'source_step_index',
   'qualifier_receipt_sha256',r.reconciliation_receipt_sha256,
   'qualifier_checked_at',r.reconciliation_checked_at,
   'qualifier_next_action',r.reconciliation_next_action,
   'unresolved_proof_gates',coalesce(
      r.reconciliation_snapshot->'unsatisfied_gates','[]'::jsonb),
   'independent_source_proof_verified',
      j.value->>'independent_source_proof_verified'='true',
   'proposed_transition',case when (
    v_shift.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
    and r.reconciliation_snapshot->>'internal_maintenance_scope_allowed'='true'
    and r.reconciliation_snapshot->>'case_specific_frozen_red_verified'='false'
    and r.reconciliation_next_action in
      ('VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
       'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI')
    and j.value->>'independent_source_proof_verified'='true'
  ) then 'RECOVER' else 'SUSPEND' end,
   'recovery_authority_scope',case when (
    v_shift.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
    and r.reconciliation_snapshot->>'internal_maintenance_scope_allowed'='true'
    and r.reconciliation_snapshot->>'case_specific_frozen_red_verified'='false'
    and r.reconciliation_next_action in
      ('VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
       'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI')
    and j.value->>'independent_source_proof_verified'='true'
  ) then 'INTERNAL_MAINTENANCE_ONLY' else 'NO_DISPATCH' end,
   'reason_code',case when (
    v_shift.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
    and r.reconciliation_snapshot->>'internal_maintenance_scope_allowed'='true'
    and r.reconciliation_snapshot->>'case_specific_frozen_red_verified'='false'
    and r.reconciliation_next_action in
      ('VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
       'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI')
    and j.value->>'independent_source_proof_verified'='true'
  ) then 'BLOCKER_ATTESTATION_PENDING' when
      r.reconciliation_snapshot->'unsatisfied_gates' ? 'BUSINESS_ORIGINAL_WARRANT_MISMATCH'
      then 'AUTHORITY_NOT_VERIFIED'
      else 'BLOCKER_ATTESTATION_PENDING' end,
   'diagnosis_consumable',true,
   'registered_capability_lease',false,
   'execution_authorized',false,
   'owner_approval_granted',false,
   'original_job_completed',false,
   'production_changed',false
 ) order by (j.value->>'source_step_index')::integer),
 '[]'::jsonb) INTO v_governed_handoffs
 FROM pg_catalog.jsonb_array_elements(v_jobs) j(value)
 JOIN LATERAL(
   select r.reconciliation_receipt_sha256,r.reconciliation_checked_at,
      r.reconciliation_next_action,r.reconciliation_snapshot
   from reality_internal.owner_continuity_qualification_routes_v1 r
   where r.owner_id=v_shift.owner_id
    and r.intake_family='SIGNED_SHIFT_SOURCE'
    and r.source_ref=j.value->>'source_ref'
    and r.reconciliation_checked_at >= pg_catalog.clock_timestamp()-interval '30 minutes'
    and r.reconciliation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and r.reconciliation_next_action is not null
   order by r.reconciliation_checked_at desc,r.intake_key
   limit 1
 ) r on true
 WHERE j.value->>'original_work_id' ~ '^work:[a-f0-9]{32}$'
  and j.value->>'independent_source_proof_verified'='true';

 -- IMPORTANT: No existing document reviewed here proves the frozen
 -- customer-original acceptance contract and four proofs as a whole.
 -- The engine must not convert the shift's warrant/scope hash into an
 -- acceptance_contract_sha256 or owner-acceptance=true.
 RETURN jsonb_build_object(
  'schema','reality-final-loop-canonical-proof-readback-v1',
  'status','FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
  'owner_id',v_shift.owner_id,'shift_id',v_shift.shift_id,
  'plan_fingerprint',v_shift.plan_fingerprint,
  'frozen_shift_scope_sha256',v_scope_hash,
  'continuity_root_id',v_root,
  'continuity_head_sha256','sha256:'||v_head,
  'revision',v_rev,'observed_at',pg_catalog.clock_timestamp(),
  'read_only',true,'independent_owner_scope_verified',true,
  'owner_acceptance_verified',false,'acceptance_frozen',false,
  'acceptance_contract_sha256',null,'jobs',v_jobs,
  'governed_qualification_handoffs',v_governed_handoffs,
  'governed_handoffs_are_authorization',false,
  'missing_proofs',jsonb_build_array(
   'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
   'EXACT_ORIGINAL_EFFECT_AUTHORITY',
   'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
   'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'),
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_current_final_loop_proof_envelope_v1(uuid) TO service_role;
