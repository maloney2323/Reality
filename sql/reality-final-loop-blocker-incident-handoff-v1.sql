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
-- Exact investigation-only continuation: no original/child executor claim,
-- no repeat of an uncertain provider invocation and no new recovery budget.
CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE e record; proof jsonb; guard jsonb; suspension jsonb; evidence jsonb; digest text;
 i reality_internal.owner_shift_continuity_incidents_v1%ROWTYPE;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';END IF;
 SELECT ev.*,a.release_sha,a.release_ref,w.release_receipt_sha256 INTO e
 FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.claim_id=ev.release_continuation_claim_id
  AND a.owner_id=ev.owner_id AND a.shift_id=ev.shift_id AND a.state='CLAIMED_ONCE'
  AND a.runtime_scope->>'original_work_id'=ev.original_work_id AND a.runtime_scope->>'source_ref'=ev.source_ref
  AND a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
  AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text
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
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(uuid,uuid,uuid) TO service_role;

-- Independently recompute the existing investigation receipt before observing
-- the delivered signal. This is not repair/outcome verification or settlement.
CREATE OR REPLACE FUNCTION public.reality_observe_final_loop_suspension_investigation_v1(
 p_shift_id uuid,p_event_id uuid,p_worker_run_id uuid,p_incident_id uuid,p_receipt_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE e record; i reality_internal.owner_shift_continuity_incidents_v1%ROWTYPE;
 proof jsonb; computed text; n int;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SUSPENSION_INVESTIGATION_OBSERVATION_SERVICE_ONLY';END IF;
 SELECT ev.* INTO e FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=p_worker_run_id
  AND run.status='STARTED' AND run.finished_at IS NULL
 WHERE ev.shift_id=p_shift_id AND ev.event_id=p_event_id AND ev.governed_wake_worker_run_id=p_worker_run_id
  AND ev.signal_kind='VERIFIED_SUSPENSION_INVESTIGATION' AND ev.state='SHADOW_PENDING'
  AND ev.signal_next_action='INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY'
 FOR UPDATE OF ev;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','SUSPENSION_INVESTIGATION_EVENT_UNVERIFIED','execution_authorized',false);END IF;
 SELECT * INTO i FROM reality_internal.owner_shift_continuity_incidents_v1
 WHERE incident_id=p_incident_id AND owner_id=e.owner_id AND shift_id=e.shift_id
  AND kind='SIGNED_FINAL_LOOP_CONTINUITY_BLOCKED'
  AND phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  AND investigation_receipt_sha256=p_receipt_sha256
  AND source_evidence->>'event_id'=e.event_id::text
  AND source_evidence->>'worker_run_id'=p_worker_run_id::text
  AND source_evidence->>'original_work_id'=e.original_work_id
  AND source_evidence->>'continuity_head_sha256'=e.continuity_head_sha256
  AND source_evidence->>'verified_suspension_receipt_sha256'=e.source_receipt_sha256
  AND source_evidence->>'replay_authorized'='false'
  AND source_evidence->>'new_attempt_authorized'='false'
  AND evidence_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(source_evidence::text,'UTF8')),'hex')
 FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','SUSPENSION_INVESTIGATION_RECEIPT_UNVERIFIED','execution_authorized',false);END IF;
 proof:=pg_catalog.jsonb_build_object('owner_id',i.owner_id,'incident_id',i.incident_id,
  'evidence_sha256',i.evidence_sha256,'model_response_id',i.model_response_id,
  'assigned_employee',i.assigned_employee,'reviewer',i.independent_reviewer,
  'diagnosis',i.diagnosis,'proposed_upgrade',i.proposed_upgrade,
  'required_independent_test',i.independent_test_requirement,'limitations',i.limitations,
  'new_original_jobs_created',0,'installation_authorized',false);
 computed:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(proof::text,'UTF8')),'hex');
 IF computed IS DISTINCT FROM p_receipt_sha256 THEN RETURN pg_catalog.jsonb_build_object('status','SUSPENSION_INVESTIGATION_RECEIPT_HASH_MISMATCH','execution_authorized',false);END IF;
 UPDATE reality_internal.final_loop_resume_events_v1 SET state='SHADOW_OBSERVED',observed_at=pg_catalog.clock_timestamp()
 WHERE event_id=p_event_id AND state='SHADOW_PENDING' AND governed_wake_worker_run_id=p_worker_run_id;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'SUSPENSION_INVESTIGATION_OBSERVATION_CAS_FAILED';END IF;
 RETURN pg_catalog.jsonb_build_object('status','SUSPENSION_INVESTIGATION_RECEIPT_INDEPENDENTLY_READ_BACK',
  'event_id',p_event_id,'incident_id',p_incident_id,'worker_run_id',p_worker_run_id,
  'investigation_receipt_sha256',computed,'continuity_revision',e.continuity_revision,
  'previous_attempt_budget_preserved',true,'replay_authorized',false,'new_attempt_authorized',false,
  'execution_authorized',false,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_observe_final_loop_suspension_investigation_v1(uuid,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_observe_final_loop_suspension_investigation_v1(uuid,uuid,uuid,uuid,text) TO service_role;
