-- Reuse Reality's existing Continuity Ledger + independently verified Universe workline.
-- No new authority, model claim, new job, replay or production deployment.
-- This migration is repeatable from the installed, independently read function.

CREATE OR REPLACE FUNCTION public.reality_reconcile_verified_parent_universe_return_v1(p_shift_id uuid, p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_shift record; v_proof jsonb; d record; v_tail record;
 v_root uuid; v_head text; v_now timestamptz; v_iso text;
 v_event uuid; v_payload jsonb; v_refs jsonb;v_provenance jsonb;
 v_basis jsonb;v_content_hash text;v_lineage_hash text;
BEGIN
 IF current_user<>'service_role' THEN
   RAISE EXCEPTION 'FINAL_LOOP_VERIFIED_PARENT_RETURN_SERVICE_ONLY';END IF;
 IF p_shift_id IS NULL OR p_worker_run_id IS NULL THEN
   RETURN pg_catalog.jsonb_build_object(
     'status','FINAL_LOOP_VERIFIED_PARENT_RETURN_EXACT_SIGNED_SCOPE_REQUIRED',
     'return_appended',false,'execution_authorized',false,
     'original_job_completed',false);END IF;
 IF NOT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
     WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
       AND r.finished_at IS NULL
       AND r.started_at>=pg_catalog.clock_timestamp()-interval '10 minutes') THEN
   RETURN pg_catalog.jsonb_build_object(
     'status','FINAL_LOOP_VERIFIED_PARENT_RETURN_ACTIVE_SIGNED_RUN_REQUIRED',
     'return_appended',false,'execution_authorized',false,
     'original_job_completed',false);END IF;
 SELECT s.shift_id,s.owner_id,s.plan_fingerprint
 INTO v_shift
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
   AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL
   AND s.closed_at IS NULL AND s.planned_end_at='infinity'::timestamptz
   AND s.status IN('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
   AND w.state='ACTIVE' AND w.authorized_at IS NOT NULL
 FOR UPDATE OF s;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_VERIFIED_PARENT_RETURN_EXISTING_SHIFT_REQUIRED',
   'return_appended',false,'execution_authorized',false,
   'original_job_completed',false);END IF;
 v_proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 IF v_proof->>'status'<>
     'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
   OR v_proof->>'owner_id'<>v_shift.owner_id::text
   OR v_proof->>'shift_id'<>p_shift_id::text
   OR v_proof->>'plan_fingerprint'<>v_shift.plan_fingerprint
   OR v_proof->>'execution_authorized'<>'false'
   OR v_proof->>'production_changed'<>'false'
   OR v_proof->>'continuity_head_sha256' !~ '^sha256:[a-f0-9]{64}$'
   OR pg_catalog.jsonb_typeof(v_proof->'jobs')<>'array' THEN
   RETURN pg_catalog.jsonb_build_object(
    'status','FINAL_LOOP_VERIFIED_PARENT_RETURN_CANONICAL_PROOF_UNVERIFIED',
    'return_appended',false,'execution_authorized',false,
    'original_job_completed',false);END IF;
 v_root:=(v_proof->>'continuity_root_id')::uuid;
 v_head:=v_proof->>'continuity_head_sha256';
 -- Do not allow an independent verified goal workline to override the
 -- canonical shift root. Every candidate must be a REAL previously
 -- settled, owner-approved parent with a different signed verifier.
 SELECT delivery.*
 INTO d FROM reality_internal.final_loop_parent_deliveries_v1 delivery
 JOIN public.universe_events outcome
 ON outcome.event_id=delivery.universe_outcome_event_id
  AND outcome.continuity_root_id=delivery.shift_id
  AND outcome.worldline_id=delivery.plan_id
  AND outcome.parent_event_id=delivery.universe_goal_event_id
  AND outcome.event_kind='OUTCOME'
  AND outcome.entity_type='reality_final_loop_verified_original_outcome_v1'
  AND outcome.epistemic_status='VERIFIED'
  AND outcome.payload->>'schema'=
    'reality-final-loop-verified-pr-review-outcome-v1'
  AND outcome.payload->>'owner_id'=delivery.owner_id::text
  AND outcome.payload->>'shift_id'=delivery.shift_id::text
  AND outcome.payload->>'original_work_id'=delivery.parent_original_work_id
  AND outcome.payload->>'source_ref'=delivery.source_ref
  AND outcome.payload->>'source_head_sha'=delivery.source_head_sha
  AND outcome.payload->>'source_manifest_sha256'=delivery.source_manifest_sha256
  AND outcome.payload->>'acceptance_contract_sha256'=delivery.acceptance_contract_sha256
  AND outcome.payload->>'independent_verifier_worker_run_id'=
    delivery.independent_verifier_worker_run_id::text
  AND outcome.payload->>'provider_comment_url'=delivery.provider_comment_url
  AND outcome.payload->>'independent_outcome_verified'='true'
  AND outcome.payload->>'original_job_completed'='true'
  AND outcome.payload->>'production_changed'='false'
  AND outcome.provenance->>'source'=
    'SIGNED_FINAL_LOOP_OWNER_APPROVAL_GITHUB_PROVIDER_READBACK'
  AND outcome.content_hash=pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(
      outcome.payload),'UTF8')),'hex')
  AND outcome.lineage_hash~'^[a-f0-9]{64}$'
 JOIN public.universe_events goal
 ON goal.event_id=delivery.universe_goal_event_id
   AND goal.continuity_root_id=delivery.shift_id
   AND goal.worldline_id=delivery.plan_id
   AND goal.parent_event_id IS NULL AND goal.event_kind='WORK'
   AND goal.epistemic_status='VERIFIED'
   AND goal.payload->>'owner_id'=delivery.owner_id::text
   AND goal.payload->>'original_work_id'=delivery.parent_original_work_id
   AND goal.payload->>'acceptance_contract_sha256'=
     delivery.acceptance_contract_sha256
 JOIN reality_internal.signed_worker_actual_runs_v1 independent_run
 ON independent_run.run_id=delivery.independent_verifier_worker_run_id
   AND independent_run.started_at IS NOT NULL
   AND independent_run.status='COMPLETED'
 WHERE delivery.shift_id=p_shift_id
   AND delivery.owner_id=v_shift.owner_id
   AND delivery.status='SETTLED'
   AND delivery.settled_at IS NOT NULL
   AND delivery.original_settlement_receipt_id IS NOT NULL
   AND delivery.independent_verifier_worker_run_id IS NOT NULL
   AND delivery.independent_verifier_worker_run_id IS DISTINCT FROM
       delivery.publisher_worker_run_id
   AND delivery.owner_approved_at IS NOT NULL
   AND delivery.owner_publication_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND delivery.cross_scope_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   AND delivery.acceptance_contract_sha256~'^sha256:[a-f0-9]{64}$'
   AND delivery.source_manifest_sha256~'^sha256:[a-f0-9]{64}$'
   AND EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(v_proof->'jobs') j
       WHERE j.value->>'source_ref'=delivery.source_ref
         AND j.value->>'original_work_id'=delivery.parent_original_work_id
         AND j.value->>'independent_source_proof_verified'='true')
   AND NOT EXISTS(SELECT 1 FROM public.universe_events already
    WHERE already.continuity_root_id=v_root
      AND already.entity_type='reality_final_loop_verified_cross_worldline_return_v1'
      AND already.event_kind='OUTCOME'
      AND already.payload->>'delivery_id'=delivery.delivery_id::text)
 ORDER BY delivery.settled_at,delivery.delivery_id LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'status','FINAL_LOOP_NO_NEW_INDEPENDENTLY_SETTLED_PARENT_TO_RETURN',
   'read_only',true,'return_appended',false,
   'execution_authorized',false,'original_job_completed',false);END IF;
 -- Serialize all cross-worldline returns on the existing canonical root.
 -- The Universe's unique successor index rejects concurrent forks.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'reality:canonical-continuity-return:'||v_root::text,0));
 IF EXISTS(SELECT 1 FROM public.universe_events already
    WHERE already.continuity_root_id=v_root
      AND already.entity_type='reality_final_loop_verified_cross_worldline_return_v1'
      AND already.payload->>'delivery_id'=d.delivery_id::text) THEN
   RETURN pg_catalog.jsonb_build_object(
    'status','FINAL_LOOP_PARENT_ALREADY_RETURNED_NO_REPLAY',
    'read_only',true,'return_appended',false,
    'execution_authorized',false,'original_job_completed',false);END IF;
 SELECT event_id,worldline_id,lineage_hash INTO v_tail
 FROM public.universe_events e WHERE e.continuity_root_id=v_root
  AND e.payload->>'owner_id'=v_shift.owner_id::text
  AND e.payload->>'shift_id'=p_shift_id::text
 ORDER BY e.assertion_time DESC,e.event_id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR 'sha256:'||v_tail.lineage_hash<>v_head OR
   v_tail.worldline_id IS NULL THEN RETURN pg_catalog.jsonb_build_object(
    'status','FINAL_LOOP_PARENT_RETURN_CANONICAL_HEAD_CHANGED_NO_REPLAY',
    'return_appended',false,'execution_authorized',false,
    'original_job_completed',false);END IF;
 v_now:=pg_catalog.clock_timestamp();
 v_iso:=pg_catalog.to_char(v_now AT TIME ZONE 'UTC',
   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 v_event:=pg_catalog.gen_random_uuid();
 v_payload:=pg_catalog.jsonb_build_object(
   'schema','reality-final-loop-cross-worldline-verified-return-v1',
   'owner_id',v_shift.owner_id,'shift_id',p_shift_id,
   'original_work_id',d.parent_original_work_id,
   'source_ref',d.source_ref,'delivery_id',d.delivery_id,
   'source_universe_outcome_event_id',d.universe_outcome_event_id,
   'source_universe_goal_event_id',d.universe_goal_event_id,
   'source_worldline_id',d.plan_id,
   'independent_parent_settlement_receipt_id',d.original_settlement_receipt_id,
   'cross_scope_receipt_sha256',d.cross_scope_receipt_sha256,
   'owner_publication_receipt_sha256',d.owner_publication_receipt_sha256,
   'independent_verifier_worker_run_id',d.independent_verifier_worker_run_id,
   'independent_outcome_verified',true,
   'original_job_completed',true,'production_changed',false,
   'new_authority_granted',false,
   'effect_executed_by_this_return',false);
 v_refs:=pg_catalog.jsonb_build_array(
   'supabase:final_loop_parent_deliveries_v1:'||d.delivery_id::text,
   'supabase:universe_events:'||d.universe_outcome_event_id::text,
   d.source_ref,d.cross_scope_receipt_sha256,d.owner_publication_receipt_sha256);
 v_provenance:=pg_catalog.jsonb_build_object(
   'source','INDEPENDENT_PARENT_TO_CANONICAL_CONTINUITY_RECONCILIATION',
   'principal_id',v_shift.owner_id,
   'independent_verifier_worker_run_id',d.independent_verifier_worker_run_id,
   'continuity_spine',pg_catalog.jsonb_build_object(
    'version','reality-continuity-spine-v2.1',
    'source_event_id',v_tail.event_id::text,
    'prior_lineage_hash',v_tail.lineage_hash,
    'transformation_receipt_id',d.original_settlement_receipt_id::text));
 v_content_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   public.reality_continuity_canonical_json_v1(v_payload),'UTF8')),'hex');
 v_basis:=pg_catalog.jsonb_build_object(
   'spine_version','reality-continuity-spine-v2.1',
   'continuity_root_id',v_root::text,
   'worldline_id',v_tail.worldline_id::text,
   'parent_event_id',v_tail.event_id,
   'prior_lineage_hash',v_tail.lineage_hash,
   'stage','OUTCOME','entity_id',d.plan_id::text,
   'evidence_refs',v_refs,'transformation_receipt_id',
     d.original_settlement_receipt_id::text,
   'effective_time',v_iso,'assertion_time',v_iso,
   'epistemic_status','VERIFIED',
   'payload',v_payload,'provenance',v_provenance);
 v_lineage_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   public.reality_continuity_canonical_json_v1(v_basis),'UTF8')),'hex');
 INSERT INTO public.universe_events(
   event_id,event_kind,entity_type,entity_id,
   continuity_root_id,worldline_id,parent_event_id,
   effective_time,assertion_time,epistemic_status,
   payload,evidence_refs,provenance,content_hash,lineage_hash)
 VALUES(v_event,'OUTCOME',
  'reality_final_loop_verified_cross_worldline_return_v1',
  d.plan_id,v_root,v_tail.worldline_id,v_tail.event_id,
  v_now,v_now,'VERIFIED',v_payload,v_refs,v_provenance,
  v_content_hash,v_lineage_hash);
 RETURN pg_catalog.jsonb_build_object(
  'schema','reality-final-loop-independent-cross-worldline-return-v1',
  'status','FINAL_LOOP_VERIFIED_PARENT_RETURN_DURABLY_RECONCILED',
  'owner_id',v_shift.owner_id,'shift_id',p_shift_id,
  'original_work_id',d.parent_original_work_id,'source_ref',d.source_ref,
  'source_parent_delivery_id',d.delivery_id,
  'source_verified_universe_event_id',d.universe_outcome_event_id,
  'continuity_root_id',v_root,'canonical_universe_return_event_id',v_event,
  'same_original_independently_verified',true,
  'return_appended',true,'new_effect_executed',false,
  'new_authority_granted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'shift_completed',false);
END $function$;

REVOKE ALL ON FUNCTION public.reality_reconcile_verified_parent_universe_return_v1(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_reconcile_verified_parent_universe_return_v1(uuid,uuid) TO service_role;
