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

-- Direct-original independent review, in the SAME review ledger as ordinary
-- evidence-job incidents. A missing qualified job is not an invitation to invent one.
ALTER TABLE reality_internal.shift_continuity_independent_reviews_v1
 ALTER COLUMN qualified_job_id DROP NOT NULL,
 ALTER COLUMN previously_reviewed_sha256 DROP NOT NULL,
 ADD COLUMN IF NOT EXISTS original_work_id text,
 ADD COLUMN IF NOT EXISTS continuity_head_sha256 text,
 ADD COLUMN IF NOT EXISTS review_event_id uuid,
 ADD COLUMN IF NOT EXISTS frozen_source_head_sha text,
 ADD COLUMN IF NOT EXISTS independent_verdict jsonb;
ALTER TABLE reality_internal.shift_continuity_independent_reviews_v1
 ADD CONSTRAINT shift_continuity_direct_original_review_scope_v1 CHECK(
 (qualified_job_id IS NOT NULL AND previously_reviewed_sha256 IS NOT NULL AND original_work_id IS NULL
  AND review_event_id IS NULL AND frozen_source_head_sha IS NULL)
 OR (qualified_job_id IS NULL AND previously_reviewed_sha256 IS NULL
  AND original_work_id IS NOT NULL AND original_work_id~'^work:[a-f0-9]{32}$'
  AND continuity_head_sha256 IS NOT NULL AND continuity_head_sha256~'^sha256:[a-f0-9]{64}$'
  AND review_event_id IS NOT NULL AND frozen_source_head_sha IS NOT NULL AND frozen_source_head_sha~'^[a-f0-9]{40}$'));
CREATE UNIQUE INDEX shift_continuity_direct_original_review_event_once_v1
 ON reality_internal.shift_continuity_independent_reviews_v1(review_event_id) WHERE review_event_id IS NOT NULL;

-- New overload of the established review claim, exact event-bound. The old
-- two-argument function continues to serve qualified evidence jobs.
CREATE OR REPLACE FUNCTION public.reality_claim_shift_continuity_independent_review_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE e record; i record; evidence jsonb; frozen text; v_id uuid;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'SIGNED_INDEPENDENT_CONTINUITY_REVIEW_REQUIRED';END IF;
 SELECT ev.* INTO e FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=p_worker_run_id
  AND run.status='STARTED' AND run.finished_at IS NULL AND run.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
  AND wake.owner_id=ev.owner_id AND wake.shift_id=ev.shift_id AND wake.release_claim_id=ev.release_continuation_claim_id
  AND wake.operating_lane='NORMAL_SIGNED_SHIFT'
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 pulse ON pulse.shift_id=ev.shift_id AND pulse.owner_id=ev.owner_id
  AND pulse.last_worker_status='WAKE_RECEIVED' AND pulse.last_worker_seen_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 WHERE ev.event_id=p_event_id AND ev.shift_id=p_shift_id AND ev.governed_wake_worker_run_id=p_worker_run_id
  AND ev.signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND ev.signal_next_action='INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY'
  AND ev.state='SHADOW_PENDING' AND ev.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 FOR UPDATE OF ev;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','NO_CONTINUITY_INDEPENDENT_REVIEW_READY',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 evidence:=reality_internal.read_final_loop_verified_investigation_v1(e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision);
 IF evidence IS NULL OR evidence->>'investigation_receipt_sha256' IS DISTINCT FROM e.source_receipt_sha256
  OR evidence->>'suspension_receipt_sha256' IS DISTINCT FROM e.previous_receipt_sha256
  OR evidence->>'investigation_worker_run_id'=p_worker_run_id::text
 THEN RETURN pg_catalog.jsonb_build_object('status','NO_CONTINUITY_INDEPENDENT_REVIEW_READY',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 SELECT inc.* INTO i FROM reality_internal.owner_shift_continuity_incidents_v1 inc
 WHERE inc.incident_id=(evidence->>'incident_id')::uuid AND inc.qualified_job_id IS NULL
  AND inc.independent_reviewer IS NOT NULL AND inc.reviewer_function_id IS NOT NULL
  AND inc.reviewer_function_id<>inc.assigned_function_id
  AND NOT EXISTS(SELECT 1 FROM reality_internal.shift_continuity_independent_reviews_v1 r WHERE r.incident_id=inc.incident_id)
 FOR UPDATE OF inc;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','NO_CONTINUITY_INDEPENDENT_REVIEW_READY',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);END IF;
 frozen:=evidence->>'frozen_source_head_sha';
 IF frozen IS NULL OR frozen!~'^[a-f0-9]{40}$' THEN RAISE EXCEPTION 'DIRECT_ORIGINAL_REVIEW_FROZEN_HEAD_UNVERIFIED';END IF;
 v_id:=pg_catalog.gen_random_uuid();
 INSERT INTO reality_internal.shift_continuity_independent_reviews_v1(
  incident_id,owner_id,shift_id,qualified_job_id,claim_id,worker_run_id,reviewer,reviewer_function_id,
  source_ref,previously_reviewed_sha256,investigation_receipt_sha256,original_work_id,continuity_head_sha256,review_event_id,frozen_source_head_sha)
 VALUES(i.incident_id,e.owner_id,e.shift_id,NULL,v_id,p_worker_run_id,i.independent_reviewer,i.reviewer_function_id,
  e.source_ref,NULL,i.investigation_receipt_sha256,e.original_work_id,e.continuity_head_sha256,e.event_id,frozen);
 RETURN pg_catalog.jsonb_build_object('status','SIGNED_CONTINUITY_ORIGINAL_REVIEW_CLAIMED','incident_id',i.incident_id,
  'owner_id',e.owner_id,'shift_id',e.shift_id,'job_id',NULL,'claim_id',v_id,'worker_run_id',p_worker_run_id,
  'investigation_worker_run_id',evidence->>'investigation_worker_run_id','event_id',e.event_id,
  'reviewer',i.independent_reviewer,'reviewer_function_id',i.reviewer_function_id,'source_ref',e.source_ref,
  'original_work_id',e.original_work_id,'continuity_head_sha256',e.continuity_head_sha256,'continuity_revision',e.continuity_revision,
  'frozen_source_head_sha',frozen,'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'installation_authorized',false,'execution_authorized',false,'replay_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_shift_continuity_independent_review_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_shift_continuity_independent_review_v1(uuid,uuid,uuid) TO service_role;

-- Same reviewer, distinct evidence contract: compare actual PR HEAD, not a
-- metadata digest to a frozen manifest digest. Reject replay/approval advice
-- as non-authoritative; current qualified actions remain evidence-only.
CREATE OR REPLACE FUNCTION public.reality_record_shift_continuity_independent_review_v1(
 p_incident_id uuid,p_claim_id uuid,p_worker_run_id uuid,p_source_ref text,p_provider_sha256 text,p_checked_at timestamptz,
 p_event_id uuid,p_source_head_sha text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE r reality_internal.shift_continuity_independent_reviews_v1%ROWTYPE;
 e record; evidence jsonb; verdict jsonb; v_status text; v_receipt text;
BEGIN
 IF current_user<>'service_role' OR p_provider_sha256 IS NULL OR p_provider_sha256!~'^sha256:[a-f0-9]{64}$'
 OR p_source_head_sha IS NULL OR p_source_head_sha!~'^[a-f0-9]{40}$'
 OR p_checked_at IS NULL OR p_checked_at<pg_catalog.clock_timestamp()-interval '3 minutes'
 OR p_checked_at>pg_catalog.clock_timestamp()+interval '1 minute'
 THEN RAISE EXCEPTION 'CONTINUITY_PROVIDER_PROOF_REQUIRED';END IF;
 SELECT * INTO r FROM reality_internal.shift_continuity_independent_reviews_v1
 WHERE incident_id=p_incident_id AND claim_id=p_claim_id AND worker_run_id=p_worker_run_id
  AND source_ref=p_source_ref AND review_event_id=p_event_id AND qualified_job_id IS NULL
  AND status='REVIEW_CLAIMED' AND claimed_at>pg_catalog.clock_timestamp()-interval '3 minutes' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTINUITY_INDEPENDENT_REVIEW_LEASE_INVALID';END IF;
 SELECT ev.* INTO e FROM reality_internal.final_loop_resume_events_v1 ev
 JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=p_worker_run_id
  AND run.status='STARTED' AND run.finished_at IS NULL
 WHERE ev.event_id=p_event_id AND ev.owner_id=r.owner_id AND ev.shift_id=r.shift_id
  AND ev.original_work_id=r.original_work_id AND ev.source_ref=r.source_ref
  AND ev.continuity_head_sha256=r.continuity_head_sha256 AND ev.state='SHADOW_PENDING'
  AND ev.signal_kind='VERIFIED_INVESTIGATION_REVIEW' AND ev.governed_wake_worker_run_id=p_worker_run_id
 FOR UPDATE OF ev;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTINUITY_INDEPENDENT_REVIEW_EVENT_UNVERIFIED';END IF;
 evidence:=reality_internal.read_final_loop_verified_investigation_v1(e.owner_id,e.shift_id,e.original_work_id,e.source_ref,e.continuity_head_sha256,e.continuity_revision);
 IF evidence IS NULL OR evidence->>'investigation_receipt_sha256' IS DISTINCT FROM r.investigation_receipt_sha256
  OR evidence->>'investigation_receipt_sha256' IS DISTINCT FROM e.source_receipt_sha256
  OR evidence->>'suspension_receipt_sha256' IS DISTINCT FROM e.previous_receipt_sha256
  OR evidence->>'frozen_source_head_sha' IS DISTINCT FROM r.frozen_source_head_sha
  OR evidence->>'investigation_worker_run_id'=p_worker_run_id::text
 THEN RAISE EXCEPTION 'CONTINUITY_INDEPENDENT_REVIEW_SOURCE_DRIFT';END IF;
 v_status:=CASE WHEN p_source_head_sha=r.frozen_source_head_sha THEN 'SOURCE_MATCHED_NEEDS_FROZEN_TEST'
  ELSE 'SOURCE_CHANGED_NEEDS_FROZEN_TEST' END;
 verdict:=pg_catalog.jsonb_build_object('schema','reality-direct-original-independent-investigation-review-v1',
  'incident_id',r.incident_id,'claim_id',r.claim_id,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'original_work_id',r.original_work_id,'source_ref',r.source_ref,'continuity_head_sha256',r.continuity_head_sha256,
  'continuity_revision',e.continuity_revision,'review_event_id',p_event_id,'review_worker_run_id',p_worker_run_id,
  'investigation_worker_run_id',evidence->>'investigation_worker_run_id',
  'investigation_receipt_sha256',r.investigation_receipt_sha256,'suspension_receipt_sha256',e.previous_receipt_sha256,
  'frozen_source_head_sha',r.frozen_source_head_sha,'observed_source_head_sha',p_source_head_sha,
  'provider_proof_sha256',p_provider_sha256,'provider_checked_at',p_checked_at,
  'reviewer_function_id',r.reviewer_function_id,'review_status',v_status,
  'unresolved_proof_gates',evidence->'unresolved_proof_gates',
  'recommendation_disposition','ADVISORY_ONLY_NO_AUTHORITY_OR_REPLAY',
  'next_action',CASE WHEN v_status='SOURCE_MATCHED_NEEDS_FROZEN_TEST'
    THEN 'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'
    ELSE 'INDEPENDENTLY_QUALIFY_NEW_SOURCE_EPOCH_NO_REPLAY' END,
  'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,'replay_authorized',false,
  'root_cause_verified',false,'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'execution_authorized',false,'production_changed',false);
 v_receipt:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(verdict::text,'UTF8')),'hex');
 UPDATE reality_internal.shift_continuity_independent_reviews_v1
 SET status=v_status,current_provider_sha256=p_provider_sha256,provider_checked_at=p_checked_at,
  source_head_sha=p_source_head_sha,receipt_sha256=v_receipt,independent_verdict=verdict,completed_at=pg_catalog.clock_timestamp()
 WHERE incident_id=r.incident_id AND status='REVIEW_CLAIMED';
 UPDATE reality_internal.final_loop_resume_events_v1 SET state='SHADOW_OBSERVED',observed_at=pg_catalog.clock_timestamp()
 WHERE event_id=p_event_id AND state='SHADOW_PENDING' AND governed_wake_worker_run_id=p_worker_run_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONTINUITY_INDEPENDENT_REVIEW_EVENT_CAS_FAILED';END IF;
 RETURN verdict||pg_catalog.jsonb_build_object('status',v_status,'job_id',NULL,'reviewer',r.reviewer,
  'independent_review_receipt_sha256',v_receipt);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_shift_continuity_independent_review_v1(uuid,uuid,uuid,text,text,timestamptz,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_shift_continuity_independent_review_v1(uuid,uuid,uuid,text,text,timestamptz,uuid,text) TO service_role;

-- One read-only operational projection from the SAME canonical Continuity
-- guard, signed event inbox, release receipts and existing review ledger.
-- No capability catalog, owner grant or alternative state store.
CREATE OR REPLACE FUNCTION public.reality_read_owner_current_continuity_self_visibility_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE sh record; g jsonb; ob jsonb; investigation jsonb; review jsonb; events jsonb;
 release_evidence jsonb; rows jsonb:='[]'::jsonb; gaps int:=0; active_count int:=0;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'CURRENT_SELF_VISIBILITY_OWNER_SERVICE_REQUIRED';END IF;
 FOR sh IN SELECT s.shift_id,s.status,w.mode FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id
  AND w.owner_id=s.owner_id AND w.plan_fingerprint=s.plan_fingerprint
 WHERE s.owner_id=p_owner_id AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
 AND s.planned_start_at<=pg_catalog.clock_timestamp() AND s.planned_end_at>pg_catalog.clock_timestamp()
 AND w.state='ACTIVE' ORDER BY s.shift_id LIMIT 12
 LOOP
  active_count:=active_count+1;
  g:=public.reality_read_final_loop_shared_continuity_guard_v1(sh.shift_id);
  IF g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
   OR g->>'owner_id' IS DISTINCT FROM p_owner_id::text OR g->>'shift_id' IS DISTINCT FROM sh.shift_id::text
   OR g->>'read_only' IS DISTINCT FROM 'true' OR g->>'execution_authorized' IS DISTINCT FROM 'false'
   OR g->>'production_changed' IS DISTINCT FROM 'false'
   OR pg_catalog.jsonb_typeof(g->'obligations') IS DISTINCT FROM 'array' THEN
   gaps:=gaps+1; CONTINUE;
  END IF;
  FOR ob IN SELECT value FROM pg_catalog.jsonb_array_elements(g->'obligations') LIMIT 12 LOOP
   IF ob->>'continuity_identity_verified' IS DISTINCT FROM 'true'
    OR ob->>'qualifier_digest_verified' IS DISTINCT FROM 'true'
    OR ob->>'source_proof_verified' IS DISTINCT FROM 'true' THEN gaps:=gaps+1; CONTINUE;END IF;
   investigation:=reality_internal.read_final_loop_verified_investigation_v1(p_owner_id,sh.shift_id,
    ob->>'original_work_id',ob->>'source_ref',g->>'continuity_head_sha256',(g->>'revision')::bigint);
   -- A recorded review is not an independently validated repair. Verify its
   -- own digest and a distinct completed, owner-bound signed worker witness.
   SELECT r.independent_verdict||pg_catalog.jsonb_build_object('receipt_sha256',r.receipt_sha256,
    'reviewer',r.reviewer,'completed_at',r.completed_at) INTO review
   FROM reality_internal.shift_continuity_independent_reviews_v1 r
   JOIN reality_internal.final_loop_resume_events_v1 e ON e.event_id=r.review_event_id AND e.state='SHADOW_OBSERVED'
    AND e.governed_wake_worker_run_id=r.worker_run_id AND e.source_receipt_sha256=r.investigation_receipt_sha256
    AND e.owner_id=r.owner_id AND e.shift_id=r.shift_id AND e.original_work_id=r.original_work_id
   JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=r.worker_run_id AND run.status='COMPLETED'
    AND run.finished_at>=r.completed_at
   JOIN reality_internal.governed_signed_worker_release_wakes_v1 wake ON wake.worker_run_id=run.run_id
    AND wake.owner_id=r.owner_id AND wake.shift_id=r.shift_id AND wake.release_claim_id=e.release_continuation_claim_id
   WHERE r.owner_id=p_owner_id AND r.shift_id=sh.shift_id AND r.original_work_id=ob->>'original_work_id'
    AND r.continuity_head_sha256=g->>'continuity_head_sha256' AND r.source_ref=ob->>'source_ref'
    AND r.investigation_receipt_sha256=investigation->>'investigation_receipt_sha256'
    AND r.worker_run_id::text<>investigation->>'investigation_worker_run_id'
    AND r.receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(r.independent_verdict::text,'UTF8')),'hex')
    AND r.independent_verdict->>'execution_authorized'='false' AND r.independent_verdict->>'replay_authorized'='false'
    AND r.independent_verdict->>'original_job_completed'='false' AND r.independent_verdict->>'production_changed'='false'
   ORDER BY r.completed_at DESC LIMIT 1;
   SELECT coalesce(pg_catalog.jsonb_agg(x),'[]'::jsonb) INTO events FROM (
    SELECT e.event_id,e.signal_kind,e.signal_next_action,e.state,e.source_receipt_sha256,
     e.governed_wake_worker_run_id,run.status AS worker_status,run.worker_stage,e.observed_at
    FROM reality_internal.final_loop_resume_events_v1 e
    LEFT JOIN reality_internal.signed_worker_actual_runs_v1 run ON run.run_id=e.governed_wake_worker_run_id
    WHERE e.owner_id=p_owner_id AND e.shift_id=sh.shift_id AND e.original_work_id=ob->>'original_work_id'
     AND e.source_ref=ob->>'source_ref' AND e.continuity_revision=(g->>'revision')::bigint
     AND e.continuity_head_sha256=g->>'continuity_head_sha256'
    ORDER BY e.created_at DESC LIMIT 8) x;
   SELECT pg_catalog.jsonb_build_object('release_sha',a.release_sha,'approval_receipt_sha256',a.approval_receipt_sha256,
    'alias_observed_at',a.provider_alias_observed_at,'deployment_id',a.provider_alias_observed_deployment_id)
    INTO release_evidence FROM reality_internal.governed_worker_release_approvals_v1 a
   WHERE a.owner_id=p_owner_id AND a.shift_id=sh.shift_id AND a.state='CLAIMED_ONCE'
    AND a.runtime_scope->>'original_work_id'=ob->>'original_work_id' AND a.runtime_scope->>'source_ref'=ob->>'source_ref'
    AND a.provider_alias_observed_at>=a.claimed_at
    AND a.provider_alias_observed_deployment_id=a.runtime_scope->>'target_deployment_id'
    AND a.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   ORDER BY a.provider_alias_observed_at DESC LIMIT 1;
   rows:=rows||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'shift_id',sh.shift_id,'shift_status',sh.status,'warrant_mode',sh.mode,'existing_shift_authorized',true,
    'original_work_id',ob->>'original_work_id','source_ref',ob->>'source_ref',
    'continuity_root_id',g->>'continuity_root_id','continuity_head_sha256',g->>'continuity_head_sha256',
    'continuity_revision',(g->>'revision')::bigint,'guard_receipt_sha256',g->>'handoff_observation_sha256',
    'qualifier_receipt_sha256',ob->>'qualifier_receipt_sha256','unresolved_proof_gates',ob->'unresolved_proof_gates',
    'qualifier_next_action',ob->>'next_qualified_action','original_claim_admitted',ob->'original_claim_admitted',
    'independent_original_outcome_verified',ob->'independent_original_outcome_verified',
    'universe_return_verified',ob->'universe_return_verified','active_release_observation',release_evidence,
    'verified_investigation',investigation,'verified_independent_review',review,'current_events',events,
    'operational_next_action',CASE WHEN review IS NOT NULL THEN review->>'next_action'
     WHEN investigation IS NOT NULL THEN 'INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY'
     ELSE ob->>'next_qualified_action' END,
    'read_only',true,'execution_authorized',false,'installation_authorized',false,'production_changed',false));
  END LOOP;
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('status','OWNER_CURRENT_CONTINUITY_SELF_VISIBILITY_READ_ONLY',
  'owner_id',p_owner_id,'observed_at',pg_catalog.clock_timestamp(),'active_shift_count',active_count,
  'unverified_guard_count',gaps,'obligations',rows,'owner_scope_verified',true,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_current_continuity_self_visibility_v1(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_current_continuity_self_visibility_v1(uuid) TO service_role;

-- The existing technical CI verifier consumes this exact signed context.
-- The proof is about the exhausted strategy's technical handoff only.
CREATE OR REPLACE FUNCTION public.reality_read_final_loop_terminal_technical_context_v1(
 p_shift_id uuid,p_event_id uuid,p_worker_run_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
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
  AND a.runtime_scope->>'continuity_head_sha256'=ev.continuity_head_sha256
  AND a.runtime_scope->>'continuity_revision'=ev.continuity_revision::text
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
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_terminal_technical_context_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_terminal_technical_context_v1(uuid,uuid,uuid) TO service_role;

-- Overload of the existing technical evidence writer. For an exhausted
-- strategy, the canonical original/root and independent review replace the
-- new-contract prerequisite. Preserve all unresolved business proof gates.
CREATE OR REPLACE FUNCTION public.reality_record_final_loop_technical_ci_observation_v1(
 p_shift_id uuid,p_event_id uuid,p_worker_run_id uuid,p_proof jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE ctx jsonb; p jsonb; g jsonb; sh record; ev record; tail record;
 root uuid; event_id_new uuid; receipt_id_new uuid; payload jsonb; refs jsonb; provenance jsonb;
 basis jsonb; checkpoint jsonb; receipt_hash text; observation_hash text; content_hash_new text; lineage text;
 stamp timestamptz; iso text; n int; sub_count int; after_p jsonb; after_g jsonb;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'TERMINAL_TECHNICAL_RETURN_SERVICE_ONLY';END IF;
 SELECT s.owner_id,s.plan_fingerprint INTO sh FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w ON w.shift_id=s.shift_id AND w.owner_id=s.owner_id
  AND w.plan_fingerprint=s.plan_fingerprint AND w.state='ACTIVE'
 WHERE s.shift_id=p_shift_id AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL
  AND s.planned_start_at<=pg_catalog.clock_timestamp() AND s.planned_end_at>pg_catalog.clock_timestamp()
 FOR UPDATE OF s;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_SHIFT_UNVERIFIED');END IF;
 SELECT * INTO ev FROM reality_internal.final_loop_resume_events_v1 e
 WHERE e.event_id=p_event_id AND e.owner_id=sh.owner_id AND e.shift_id=p_shift_id FOR UPDATE;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_EVENT_UNVERIFIED');END IF;
 ctx:=public.reality_read_final_loop_terminal_technical_context_v1(p_shift_id,p_event_id,p_worker_run_id);
 IF ctx->>'status' IS DISTINCT FROM 'TERMINAL_TECHNICAL_CONTEXT_VERIFIED_READ_ONLY'
 OR p_proof->>'status' IS DISTINCT FROM 'RECOVERY_TERMINAL_TECHNICAL_CI_ATTESTED_BUDGET_UNCHANGED'
 OR p_proof->'contract_id' IS DISTINCT FROM 'null'::jsonb
 OR p_proof->>'owner_id' IS DISTINCT FROM ctx->>'owner_id'
 OR p_proof->>'shift_id' IS DISTINCT FROM ctx->>'shift_id'
 OR p_proof->>'obligation_id' IS DISTINCT FROM ctx->>'original_work_id'
 OR p_proof->>'source_ref' IS DISTINCT FROM ctx->>'source_ref'
 OR p_proof->>'source_revision' IS DISTINCT FROM ctx->>'frozen_source_head_sha'
 OR p_proof->>'qualifier_receipt_sha256' IS DISTINCT FROM ctx->>'qualifier_receipt_sha256'
 OR p_proof->>'maintenance_id' IS DISTINCT FROM ctx->'terminal_history'->>'maintenance_id'
 OR p_proof->>'existing_diagnostic_receipt_sha256' IS DISTINCT FROM ctx->'terminal_history'->>'independent_diagnostic_receipt_sha256'
 OR p_proof->>'independent_technical_ci_verified' IS DISTINCT FROM 'true'
 OR p_proof->>'frozen_technical_red_verified' IS DISTINCT FROM 'true'
 OR p_proof->>'independent_ci_provider_observation' IS DISTINCT FROM 'true'
 OR p_proof->>'original_business_case_red_verified' IS DISTINCT FROM 'false'
 OR p_proof->>'business_original_warrant_verified' IS DISTINCT FROM 'false'
 OR p_proof->>'original_job_completed' IS DISTINCT FROM 'false'
 OR p_proof->>'previous_attempt_budget_preserved' IS DISTINCT FROM 'true'
 OR p_proof->>'new_attempt_authorized' IS DISTINCT FROM 'false'
 OR p_proof->>'repeat_prior_ci_dispatch_permitted' IS DISTINCT FROM 'false'
 OR p_proof->>'execution_authorized' IS DISTINCT FROM 'false'
 OR p_proof->>'production_changed' IS DISTINCT FROM 'false'
 OR coalesce(p_proof->>'github_artifact_digest','')!~'^sha256:[a-f0-9]{64}$'
 OR coalesce(p_proof->>'signed_case_spec_git_blob_sha','')!~'^[a-f0-9]{40}$'
 OR coalesce(p_proof->>'github_run_id','')!~'^[1-9][0-9]{0,15}$'
 OR coalesce(p_proof->>'github_job_id','')!~'^[1-9][0-9]{0,15}$'
 OR coalesce(p_proof->>'github_artifact_id','')!~'^[1-9][0-9]{0,15}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_signed_worker_release_wakes_v1 w
  WHERE w.worker_run_id=p_worker_run_id AND w.owner_id=sh.owner_id AND w.shift_id=p_shift_id
   AND w.running_release_sha=p_proof->>'github_release_sha')
 THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_PROVIDER_PROOF_UNVERIFIED',
  'execution_authorized',false,'original_job_completed',false);END IF;
 root:=(ctx->>'continuity_root_id')::uuid;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reality:canonical-continuity-return:'||root::text,0));
 p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF p->>'status' IS DISTINCT FROM 'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'
 OR p->>'owner_id' IS DISTINCT FROM sh.owner_id::text OR p->>'continuity_root_id' IS DISTINCT FROM root::text
 OR p->>'continuity_head_sha256' IS DISTINCT FROM ev.continuity_head_sha256
 OR p->>'revision' IS DISTINCT FROM ev.continuity_revision::text
 OR g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR g->>'continuity_head_sha256' IS DISTINCT FROM ev.continuity_head_sha256
 OR g->>'revision' IS DISTINCT FROM ev.continuity_revision::text
 OR g->>'execution_authorized' IS DISTINCT FROM 'false'
 OR coalesce(p->>'frozen_shift_scope_sha256','')!~'^sha256:[a-f0-9]{64}$'
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_events_v1 v
  WHERE v.shift_id=p_shift_id AND v.state='SHADOW_PENDING' AND v.event_id<>p_event_id)
 OR EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c WHERE c.shift_id=p_shift_id
  AND (c.owner_id<>sh.owner_id OR c.original_work_id<>ev.original_work_id OR c.continuity_head_sha256<>ev.continuity_head_sha256
   OR c.continuity_revision<>ev.continuity_revision))
 THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_CONTINUITY_DRIFT_NO_REPLAY');END IF;
 SELECT u.event_id,u.worldline_id,u.lineage_hash INTO tail FROM public.universe_events u
 WHERE u.continuity_root_id=root AND u.payload->>'owner_id'=sh.owner_id::text AND u.payload->>'shift_id'=p_shift_id::text
 ORDER BY u.assertion_time DESC,u.event_id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND OR 'sha256:'||tail.lineage_hash IS DISTINCT FROM ev.continuity_head_sha256
 THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_HEAD_DRIFT_NO_REPLAY');END IF;
 -- A prior technical provider artifact is evidence only. Deduplicate the
 -- exact provider run/artifact against the original, irrespective of release.
 IF EXISTS(SELECT 1 FROM public.universe_events u WHERE u.continuity_root_id=root
  AND u.entity_type='reality_final_loop_terminal_technical_observation_v1'
  AND u.payload->>'original_work_id'=ev.original_work_id
  AND (u.payload->>'review_receipt_sha256'=ev.source_receipt_sha256
   OR (u.payload->'technical_provider_proof'->>'github_run_id'=p_proof->>'github_run_id'
    AND u.payload->'technical_provider_proof'->>'github_artifact_digest'=p_proof->>'github_artifact_digest')))
 THEN RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_ALREADY_RETURNED_NO_REPLAY');END IF;
 stamp:=pg_catalog.clock_timestamp();iso:=pg_catalog.to_char(stamp AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 event_id_new:=pg_catalog.gen_random_uuid();receipt_id_new:=pg_catalog.gen_random_uuid();
 payload:=pg_catalog.jsonb_build_object('schema','reality-final-loop-terminal-technical-observation-v1',
  'owner_id',sh.owner_id,'shift_id',p_shift_id,'original_work_id',ev.original_work_id,'source_ref',ev.source_ref,
  'review_receipt_sha256',ev.source_receipt_sha256,'investigation_receipt_sha256',ev.previous_receipt_sha256,
  'qualifier_receipt_sha256',ctx->>'qualifier_receipt_sha256','terminal_recovery_history',ctx->'terminal_history',
  'unresolved_proof_gates',ctx->'unresolved_proof_gates','technical_provider_proof',p_proof,
  'prior_revision',ev.continuity_revision,'prior_head_sha256',ev.continuity_head_sha256,
  'technical_evidence_only',true,'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,
  'provider_outcome_verified',false,'original_business_red_verified',false,'original_job_completed',false,
  'execution_authorized',false,'installation_authorized',false,'replay_authorized',false,'production_changed',false,
  'next_action','INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED');
 observation_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text,'UTF8')),'hex');
 refs:=pg_catalog.jsonb_build_array(observation_hash,ev.source_receipt_sha256,ctx->>'qualifier_receipt_sha256');
 provenance:=pg_catalog.jsonb_build_object('source','SIGNED_TERMINAL_TECHNICAL_CI_READBACK','principal_id',sh.owner_id,
  'worker_run_id',p_worker_run_id,'continuity_spine',pg_catalog.jsonb_build_object('version','reality-continuity-spine-v2.1',
  'source_event_id',tail.event_id::text,'prior_lineage_hash',tail.lineage_hash,'transformation_receipt_id',NULL));
 content_hash_new:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(payload),'UTF8')),'hex');
 basis:=pg_catalog.jsonb_build_object('spine_version','reality-continuity-spine-v2.1','continuity_root_id',root::text,
  'worldline_id',tail.worldline_id::text,'parent_event_id',tail.event_id,'prior_lineage_hash',tail.lineage_hash,
  'stage','OBSERVATION','entity_id',event_id_new::text,'evidence_refs',refs,'transformation_receipt_id',NULL,
  'effective_time',iso,'assertion_time',iso,'epistemic_status','OBSERVED','payload',payload,'provenance',provenance);
 lineage:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(public.reality_continuity_canonical_json_v1(basis),'UTF8')),'hex');
 checkpoint:=pg_catalog.jsonb_build_object('shift_id',p_shift_id,'owner_id',sh.owner_id,'original_work_id',ev.original_work_id,
  'source_ref',ev.source_ref,'plan_fingerprint',sh.plan_fingerprint,'frozen_shift_scope_sha256',p->>'frozen_shift_scope_sha256',
  'continuity_root_id',root,'continuity_head_sha256',ev.continuity_head_sha256,'expected_revision',ev.continuity_revision,
  'worker_run_id',p_worker_run_id,'decision','REFRESH','reason_code','BLOCKER_ATTESTATION_PENDING');
 receipt_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(checkpoint::text,'UTF8')),'hex');
 INSERT INTO reality_internal.final_loop_transition_receipts_v1(receipt_id,shift_id,owner_id,original_work_id,source_ref,
  plan_fingerprint,frozen_shift_scope_sha256,continuity_root_id,continuity_head_sha256,expected_revision,worker_run_id,decision,reason_code,receipt_sha256)
 VALUES(receipt_id_new,p_shift_id,sh.owner_id,ev.original_work_id,ev.source_ref,sh.plan_fingerprint,p->>'frozen_shift_scope_sha256',
  root,ev.continuity_head_sha256,ev.continuity_revision,p_worker_run_id,'REFRESH','BLOCKER_ATTESTATION_PENDING',receipt_hash);
 INSERT INTO public.universe_events(event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,parent_event_id,
  effective_time,assertion_time,epistemic_status,payload,evidence_refs,provenance,content_hash,lineage_hash)
 VALUES(event_id_new,'OBSERVATION','reality_final_loop_terminal_technical_observation_v1',event_id_new,root,tail.worldline_id,tail.event_id,
  stamp,stamp,'OBSERVED',payload,refs,provenance,content_hash_new,lineage);
 UPDATE reality_internal.final_loop_resume_events_v1 SET state='SHADOW_OBSERVED',observed_at=stamp
 WHERE event_id=p_event_id AND state='SHADOW_PENDING' AND governed_wake_worker_run_id=p_worker_run_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'TERMINAL_TECHNICAL_EVENT_CAS_FAILED';END IF;
 SELECT count(*) INTO sub_count FROM reality_internal.final_loop_resume_conditions_v1 WHERE shift_id=p_shift_id;
 UPDATE reality_internal.final_loop_resume_conditions_v1 SET continuity_head_sha256='sha256:'||lineage,
  continuity_revision=ev.continuity_revision+1,state='SUSPENDED',updated_at=stamp
 WHERE shift_id=p_shift_id AND owner_id=sh.owner_id AND continuity_head_sha256=ev.continuity_head_sha256
  AND continuity_revision=ev.continuity_revision;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>sub_count THEN RAISE EXCEPTION 'TERMINAL_TECHNICAL_SUBSCRIPTION_CAS_FAILED';END IF;
 after_p:=public.reality_read_current_final_loop_proof_envelope_v1(p_shift_id);
 after_g:=public.reality_read_final_loop_shared_continuity_guard_v1(p_shift_id);
 IF after_p->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
 OR after_p->>'revision' IS DISTINCT FROM (ev.continuity_revision+1)::text
 OR after_g->>'status' IS DISTINCT FROM 'FINAL_LOOP_SHARED_CONTINUITY_CHECKED'
 OR after_g->>'continuity_head_sha256' IS DISTINCT FROM 'sha256:'||lineage
 OR after_g->>'revision' IS DISTINCT FROM (ev.continuity_revision+1)::text
 THEN RAISE EXCEPTION 'TERMINAL_TECHNICAL_POSTWRITE_CONTINUITY_UNVERIFIED';END IF;
 RETURN pg_catalog.jsonb_build_object('status','TERMINAL_TECHNICAL_EVIDENCE_RETURNED_ORIGINAL_OPEN',
  'event_id',event_id_new,'checkpoint_receipt_id',receipt_id_new,'observation_receipt_sha256',observation_hash,
  'continuity_head_sha256','sha256:'||lineage,'revision',ev.continuity_revision+1,'original_work_id',ev.original_work_id,
  'technical_observation_recorded',true,'previous_attempt_budget_preserved',true,'new_attempt_authorized',false,
  'original_business_red_verified',false,'original_job_completed',false,'execution_authorized',false,
  'installation_authorized',false,'replay_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_final_loop_technical_ci_observation_v1(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_final_loop_technical_ci_observation_v1(uuid,uuid,uuid,jsonb) TO service_role;
