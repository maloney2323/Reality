-- Existing incident ledger and observer, no new queue or executor.
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1 DROP CONSTRAINT owner_shift_continuity_incidents_v1_kind_check;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1 ADD CONSTRAINT owner_shift_continuity_incidents_v1_kind_check CHECK ((kind = ANY (ARRAY['ELIGIBLE_WORK_NO_DISPATCH'::text, 'EMPLOYEE_INQUIRY_CLAIM_STALE'::text, 'QUALIFIED_EVIDENCE_JOB_BLOCKED'::text, 'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'::text, 'SIGNED_SHIFT_REPEATED_NO_PROGRESS'::text, 'SIGNED_CHAT_RECOVERY_REVIEW_STALLED'::text, 'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'::text, 'SIGNED_CHAT_RECOVERY_MODEL_REJECTED'::text, 'SIGNED_GOVERNED_TRANSITION_STALLED'::text, 'SIGNED_MAINTENANCE_BUILDER_FAILED'::text, 'SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED'::text, 'SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED'::text])));
CREATE OR REPLACE FUNCTION public.reality_observe_signed_shift_no_progress_v1(p_shift_id uuid, p_worker_run_id uuid, p_safe_result text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE sh record; prior reality_internal.shift_repeated_blocker_observations_v1%ROWTYPE;
 v_claims integer; v_finals integer; v_key text; v_incident uuid;
 v_observed timestamptz:=clock_timestamp();
 exact_event record; suspension record; current_proof jsonb; current_guard jsonb; evidence jsonb; evidence_hash text;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR
  p_worker_run_id IS NULL OR p_safe_result IS NULL OR
  p_safe_result !~ '^[A-Z0-9_]{5,100}$'
 THEN RAISE EXCEPTION 'SIGNED_NO_PROGRESS_SERVICE_SCOPE_REQUIRED'; END IF;
 -- Safe work may continue. Only actual unresolved result codes qualify for
 -- this bounded detector, never a generic worker wake or evidence pack.
 IF p_safe_result !~ '(_REQUIRED|_BLOCKED|_UNVERIFIED|_NOT_READY)$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_UNRESOLVED_WORKER_BLOCKER',
  'new_original_admitted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false); END IF;

 SELECT s.shift_id,s.owner_id,s.last_progress_at INTO sh
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 wake
  ON wake.shift_id=s.shift_id AND wake.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.authorized_at IS NOT NULL
  AND wake.last_worker_status='WAKE_RECEIVED'
  AND wake.last_worker_seen_at>v_observed-interval '3 minutes'
  AND run.started_at>v_observed-interval '3 minutes'
 FOR UPDATE OF s;
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_NO_PROGRESS_ACTIVE_WORKER_UNVERIFIED'; END IF;

 -- First typed signed Final Loop failure is a durable incident, not a repeat counter.
 IF p_safe_result IN ('FINAL_LOOP_CONTINUITY_RPC_NOT_REGISTERED_UNVERIFIED',
  'FINAL_LOOP_CONTINUITY_RETURN_OUTCOME_UNVERIFIED','FINAL_LOOP_CONTINUITY_RETURN_PROOF_UNVERIFIED',
  'FINAL_LOOP_CONTINUITY_RETURN_READBACK_UNVERIFIED','FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED') THEN
  SELECT e.event_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision,
   w.running_release_sha,w.release_receipt_sha256,a.runtime_scope->>'continuity_root_id' root_id
  INTO exact_event FROM reality_internal.final_loop_resume_events_v1 e
  JOIN reality_internal.governed_signed_worker_release_wakes_v1 w
   ON w.worker_run_id=e.governed_wake_worker_run_id AND w.shift_id=e.shift_id AND w.owner_id=e.owner_id
  JOIN reality_internal.governed_worker_release_approvals_v1 a
   ON a.claim_id=w.release_claim_id AND a.owner_id=e.owner_id AND a.shift_id=e.shift_id
   AND a.release_sha=w.running_release_sha AND a.state='CLAIMED_ONCE'
   AND a.provider_alias_observed_at IS NOT NULL
  WHERE e.shift_id=p_shift_id AND e.owner_id=sh.owner_id
   AND e.governed_wake_worker_run_id=p_worker_run_id AND e.governed_wake_queued_at IS NOT NULL
   AND e.original_work_id=a.runtime_scope->>'original_work_id'
   AND e.source_ref=a.runtime_scope->>'source_ref'
   AND e.continuity_head_sha256=a.runtime_scope->>'continuity_head_sha256'
   AND e.continuity_revision::text=a.runtime_scope->>'continuity_revision'
   AND e.source_receipt_sha256=a.runtime_scope->>'qualifier_receipt_sha256'
   AND w.release_receipt_sha256~'^sha256:[a-f0-9]{64}$' AND w.operating_lane='NORMAL_SIGNED_SHIFT'
   AND NOT EXISTS(SELECT 1 FROM reality_internal.final_loop_child_review_work_v1 c
    WHERE c.claimant_worker_run_id=p_worker_run_id OR c.canonical_verify_invocation_run_id=p_worker_run_id)
  LIMIT 1;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','FINAL_LOOP_BLOCKER_INCIDENT_SOURCE_UNVERIFIED',
   'new_original_admitted',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false); END IF;
  -- A successful suspension is evidence, not authority to repeat a failed effect.
  IF p_safe_result='FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED' THEN
   current_proof:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
   current_guard:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
   SELECT u.event_id,u.lineage_hash,r.receipt_id,r.receipt_sha256 INTO suspension
   FROM public.universe_events u
   JOIN public.universe_events parent ON parent.event_id=u.parent_event_id
   JOIN reality_internal.final_loop_transition_receipts_v1 r
    ON r.shift_id=p_shift_id AND r.owner_id=sh.owner_id AND r.worker_run_id=p_worker_run_id
    AND r.original_work_id=exact_event.original_work_id AND r.source_ref=exact_event.source_ref
    AND r.continuity_root_id=u.continuity_root_id AND r.continuity_head_sha256=exact_event.continuity_head_sha256
    AND r.expected_revision=exact_event.continuity_revision AND r.decision='SUSPEND'
    AND r.reason_code='PROVIDER_EFFECT_UNCERTAIN'
   WHERE u.continuity_root_id::text=exact_event.root_id
    AND u.entity_type='reality_final_loop_invocation_observation_v1' AND u.epistemic_status='OBSERVED'
    AND 'sha256:'||parent.lineage_hash=exact_event.continuity_head_sha256
    AND u.payload->>'owner_id'=sh.owner_id::text AND u.payload->>'shift_id'=p_shift_id::text
    AND u.payload->>'original_work_id'=exact_event.original_work_id AND u.payload->>'source_ref'=exact_event.source_ref
    AND u.provenance->>'worker_run_id'=p_worker_run_id::text
    AND u.payload->>'provider_outcome_verified'='false' AND u.payload->>'original_job_completed'='false'
    AND u.payload->>'execution_authorized'='false' AND u.payload->>'replay_authorized'='false'
    AND u.payload->>'production_changed'='false'
    AND u.payload->'unresolved_proof_gates' ? 'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED'
    AND u.payload->'terminal_recovery_history'->>'remaining_attempts'='0'
    AND u.payload->'terminal_recovery_history'->>'replay_permitted'='false'
    AND current_proof->>'status'='FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
    AND current_proof->>'continuity_head_sha256'='sha256:'||u.lineage_hash
    AND current_proof->>'revision'=(exact_event.continuity_revision+1)::text
    AND current_guard->>'status'='FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
    AND current_guard->>'continuity_head_sha256'='sha256:'||u.lineage_hash
    AND current_guard->>'revision'=(exact_event.continuity_revision+1)::text
    AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 ev
      WHERE ev.event_id=exact_event.event_id AND ev.state='SHADOW_OBSERVED')
    AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 sub
      WHERE sub.shift_id=p_shift_id AND sub.owner_id=sh.owner_id
       AND sub.original_work_id=exact_event.original_work_id AND sub.source_ref=exact_event.source_ref
       AND sub.continuity_head_sha256='sha256:'||u.lineage_hash
       AND sub.continuity_revision=exact_event.continuity_revision+1 AND sub.state='SUSPENDED')
   LIMIT 1;
   IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
    'status','FINAL_LOOP_VERIFIED_SUSPENSION_SOURCE_UNVERIFIED',
    'new_original_admitted',false,'execution_authorized',false,'installation_authorized',false,'production_changed',false); END IF;
  END IF;
  evidence:=pg_catalog.jsonb_build_object('schema','reality-signed-final-loop-blocker-v1',
   'owner_id',sh.owner_id,'shift_id',p_shift_id,'original_work_id',exact_event.original_work_id,
   'source_ref',exact_event.source_ref,'continuity_root_id',exact_event.root_id,
   'continuity_head_sha256',exact_event.continuity_head_sha256,'continuity_revision',exact_event.continuity_revision,
   'event_id',exact_event.event_id,'worker_run_id',p_worker_run_id,'release_sha',exact_event.running_release_sha,
   'release_receipt_sha256',exact_event.release_receipt_sha256,'blocker_code',p_safe_result,
   'investigation_only',true,'root_cause_verified',false,'provider_outcome_verified',false,
   'replay_authorized',false,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
  IF p_safe_result='FINAL_LOOP_VERIFIED_SUSPENSION_INVESTIGATION_REQUIRED' THEN
   evidence:=evidence||pg_catalog.jsonb_build_object(
    'verified_suspension_event_id',suspension.event_id,'verified_suspension_receipt_id',suspension.receipt_id,
    'verified_suspension_receipt_sha256',suspension.receipt_sha256,
    'continuity_head_sha256','sha256:'||suspension.lineage_hash,'continuity_revision',exact_event.continuity_revision+1,
    'prior_continuity_head_sha256',exact_event.continuity_head_sha256,
    'previous_attempt_budget_preserved',true,'new_attempt_authorized',false);
  END IF;
  evidence_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(evidence::text,'UTF8')),'hex');
  INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,evidence_sha256,error_summary,source_evidence)
  VALUES(sh.owner_id,p_shift_id,'SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED',evidence_hash,'sha256:'||evidence_hash,
   'Signed Final Loop transition blocked: '||p_safe_result||'. Investigate exact source and release, preserve original obligation; no effect replay.',evidence)
  ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO NOTHING;
  SELECT incident_id INTO v_incident FROM reality_internal.owner_shift_continuity_incidents_v1
   WHERE owner_id=sh.owner_id AND shift_id=p_shift_id AND kind='SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED'
   AND evidence_key=evidence_hash AND source_evidence=evidence;
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_LOOP_BLOCKER_INCIDENT_READBACK_MISMATCH';END IF;
  RETURN pg_catalog.jsonb_build_object('status','SIGNED_FINAL_LOOP_BLOCKER_INCIDENT_RECORDED',
   'incident_id',v_incident,'evidence_sha256','sha256:'||evidence_hash,'original_work_id',exact_event.original_work_id,
   'next_action','INVESTIGATE_EXISTING_SIGNED_SHIFT_INCIDENT','new_original_admitted',false,
   'execution_authorized',false,'installation_authorized',false,'production_changed',false);
 END IF;
 SELECT count(*)::integer INTO v_claims
 FROM reality_internal.governed_employee_original_claims_v1 c
 WHERE c.shift_id=sh.shift_id AND c.owner_id=sh.owner_id;
 SELECT count(*)::integer INTO v_finals
 FROM reality_internal.governed_original_independent_final_receipts_v1 f
 WHERE f.shift_id=sh.shift_id AND f.owner_id=sh.owner_id;

 INSERT INTO reality_internal.shift_repeated_blocker_observations_v1 AS existing(
  shift_id,owner_id,blocker_code,consecutive_count,
  last_shift_progress_at,original_claim_count,independent_final_count,
  last_worker_run_id,first_seen_at,last_seen_at
 ) VALUES(sh.shift_id,sh.owner_id,p_safe_result,1,
  sh.last_progress_at,v_claims,v_finals,p_worker_run_id,v_observed,v_observed)
 ON CONFLICT(shift_id) DO UPDATE SET
  blocker_code=excluded.blocker_code,
  consecutive_count=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN LEAST(existing.consecutive_count+1,100000) ELSE 1 END,
  first_seen_at=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN existing.first_seen_at ELSE v_observed END,
  incident_id=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN existing.incident_id ELSE NULL END,
  owner_id=excluded.owner_id,
  last_shift_progress_at=excluded.last_shift_progress_at,
  original_claim_count=excluded.original_claim_count,
  independent_final_count=excluded.independent_final_count,
  last_worker_run_id=excluded.last_worker_run_id,
  last_seen_at=v_observed
 WHERE existing.last_worker_run_id<>excluded.last_worker_run_id
 RETURNING * INTO prior;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('status','SIGNED_WORKER_WAKE_ALREADY_OBSERVED_NO_REPLAY',
   'new_original_admitted',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 IF prior.consecutive_count<2 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_SHIFT_BLOCKER_FIRST_OBSERVED',
   'shift_id',sh.shift_id,'consecutive_count',prior.consecutive_count,
   'new_original_admitted',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 -- Stable identity is evidence of a repeating gate, NOT evidence of its cause.
 v_key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'reality-repeat:v1:'||sh.owner_id::text||':'||sh.shift_id::text||':'||
  prior.blocker_code||':'||coalesce(prior.last_shift_progress_at::text,'none')||':'||
  prior.original_claim_count::text||':'||prior.independent_final_count::text,
  'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(
  owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
  error_summary,observation_count,phase,last_observed_at)
 VALUES(sh.owner_id,sh.shift_id,'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
  v_key,'sha256:'||v_key,NULL,
  left('The signed worker repeatedly reports '||prior.blocker_code||
   '. No independently verified original-work progress changed between these wakes; classify the exact evidence, capability, authorization and continuation gap.',280),
  LEAST(prior.consecutive_count,100000),'DETECTED',v_observed)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO UPDATE
 SET last_observed_at=v_observed,
  observation_count=LEAST(
   GREATEST(reality_internal.owner_shift_continuity_incidents_v1.observation_count,
    excluded.observation_count),100000)
 RETURNING incident_id INTO v_incident;
 UPDATE reality_internal.shift_repeated_blocker_observations_v1
 SET incident_id=v_incident
 WHERE shift_id=sh.shift_id AND last_worker_run_id=p_worker_run_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_REPEATED_BLOCKER_INCIDENT_RECORDED',
  'shift_id',sh.shift_id,'incident_id',v_incident,
  'consecutive_count',prior.consecutive_count,
  'next_action','INVESTIGATE_EXISTING_SIGNED_SHIFT_INCIDENT_ON_NEXT_WAKE',
  'new_original_admitted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
END $function$;
REVOKE ALL ON FUNCTION public.reality_observe_signed_shift_no_progress_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_observe_signed_shift_no_progress_v1(uuid,uuid,text) TO service_role;