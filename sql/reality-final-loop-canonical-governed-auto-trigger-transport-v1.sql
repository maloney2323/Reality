-- Authoritative benchmark adaptation of the EXISTING governed auto-trigger.
-- Never install in production or use this migration to activate a release.
-- Keep the old wake schedule until actual event delivery, customer-scheduled
-- start, failure recovery and original-work continuation have been verified.
DO $guard$ BEGIN
 IF pg_catalog.to_regclass('reality_internal.governed_signed_worker_release_wakes_v1') IS NULL
 OR pg_catalog.to_regprocedure('reality_internal.canonical_worker_release_scope_current_v1(uuid,uuid,text,jsonb)') IS NULL
 OR pg_catalog.to_regclass('cron.job') IS NULL
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgname IN('final_loop_governed_start_v1','final_loop_governed_resume_v1','final_loop_governed_release_v1') AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'CANONICAL_GOVERNED_TRIGGER_INSTALL_SCOPE_UNVERIFIED';END IF;
END $guard$;
ALTER TABLE reality_internal.governed_employee_completion_warrants_v1
 ADD COLUMN IF NOT EXISTS governed_start_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_start_request_id bigint,
 ADD COLUMN IF NOT EXISTS governed_start_queued_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_start_nonce uuid,
 ADD COLUMN IF NOT EXISTS governed_start_worker_run_id uuid;
ALTER TABLE reality_internal.final_loop_resume_events_v1
 ADD COLUMN IF NOT EXISTS governed_wake_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_wake_request_id bigint,
 ADD COLUMN IF NOT EXISTS governed_wake_queued_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_wake_nonce uuid,
 ADD COLUMN IF NOT EXISTS governed_wake_worker_run_id uuid;

CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid DEFAULT NULL)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE w record; l record; e record; target text; token text; bypass text;
        req bigint; now_at timestamptz:=pg_catalog.clock_timestamp(); is_start boolean;
        approved_sha text; nonce uuid; wake_event_id uuid; release_claim uuid;
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
 IF target IS DISTINCT FROM 'https://reality-signed-worker-maloney2323-5310s-projects.vercel.app/api/reality/governed-employee-shift-worker'
 OR approved_sha IS NULL OR approved_sha !~ '^[a-f0-9]{40}$'
 OR token IS NULL OR token !~ '^[a-f0-9]{64}$'
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
 -- Require the exact consumed release authority and completed runtime proof.
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
 is_start:=w.governed_start_requested_at IS NOT NULL AND w.governed_start_request_id IS NULL
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
   AND ev.source_receipt_sha256<>ev.previous_receipt_sha256
   -- A distinct current qualifier receipt at a terminal boundary can request
   -- evidence-only investigation. The worker MUST preserve the hard budget;
   -- the existing verifier route cannot dispatch old CI for this action.
   AND (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' OR
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
        AND q.reconciliation_snapshot->'recovery_terminal_history'->>'last_decision_receipt_sha256' ~ '^sha256:[a-f0-9]{64}
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed)))
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS final_loop_governed_start_v1 ON reality_internal.governed_employee_completion_warrants_v1;
CREATE TRIGGER final_loop_governed_start_v1 AFTER INSERT ON reality_internal.governed_employee_completion_warrants_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_resume_v1 ON reality_internal.final_loop_resume_events_v1;
CREATE TRIGGER final_loop_governed_resume_v1 AFTER INSERT ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_release_v1 ON reality_internal.governed_preview_shift_worker_leases_v1;
CREATE TRIGGER final_loop_governed_release_v1 AFTER UPDATE OF released_at ON reality_internal.governed_preview_shift_worker_leases_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_governed_start_v1(p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE r record; st text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GOVERNED_START_READ_SERVICE_ONLY';END IF;
 SELECT w.*,s.planned_start_at,p.last_worker_seen_at INTO r
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=w.shift_id AND s.owner_id=w.owner_id AND s.plan_fingerprint=w.plan_fingerprint
 LEFT JOIN reality_internal.governed_employee_shift_worker_pulses_v1 p
  ON p.shift_id=w.shift_id AND p.owner_id=w.owner_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
  AND w.state='ACTIVE' AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','GOVERNED_START_SCOPE_UNVERIFIED'); END IF;
 st:=CASE WHEN r.planned_start_at>pg_catalog.clock_timestamp() THEN 'GOVERNED_START_SCHEDULED'
  WHEN r.governed_start_request_id IS NULL THEN 'GOVERNED_START_NOT_QUEUED'
  WHEN r.governed_start_worker_run_id IS NOT NULL AND r.last_worker_seen_at>=r.governed_start_queued_at THEN 'GOVERNED_START_WORKER_OBSERVED'
  ELSE 'GOVERNED_START_WAKE_QUEUED' END;
 RETURN pg_catalog.jsonb_build_object('status',st,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'plan_fingerprint',r.plan_fingerprint,'network_request_id',r.governed_start_request_id,
  'queued_at',r.governed_start_queued_at,'last_worker_seen_at',r.last_worker_seen_at,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) TO service_role;

-- Existing event/warrant records are the single-use delivery receipts.
-- Only the actual signed worker's active lease and run can consume one.
-- No creation of an original, authority or outcome, no provider call.
CREATE OR REPLACE FUNCTION public.reality_claim_canonical_governed_wake_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_nonce uuid,p_kind text,p_release_sha text,p_worker_run_id uuid,p_lease_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE n int:=0;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CANONICAL_WAKE_SERVICE_ONLY';END IF;
 IF p_nonce IS NULL OR p_event_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('START','RESUME')
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_plan_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.owner_id=s.owner_id AND w.shift_id=s.shift_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE s.owner_id=p_owner_id AND s.shift_id=p_shift_id AND s.plan_fingerprint=p_plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
 AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_release_sha
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','CANONICAL_GOVERNED_WAKE_SCOPE_UNVERIFIED','execution_authorized',false);END IF;
 IF p_kind='START' AND p_event_id=p_shift_id THEN
 UPDATE reality_internal.governed_employee_completion_warrants_v1 w
 SET governed_start_worker_run_id=p_worker_run_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
 AND w.state='ACTIVE' AND w.governed_start_nonce=p_nonce AND w.governed_start_request_id IS NOT NULL
 AND w.governed_start_worker_run_id IS NULL AND w.governed_start_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 GET DIAGNOSTICS n=ROW_COUNT;
 ELSIF p_kind='RESUME' THEN
 UPDATE reality_internal.final_loop_resume_events_v1 e SET governed_wake_worker_run_id=p_worker_run_id
 WHERE e.owner_id=p_owner_id AND e.shift_id=p_shift_id AND e.event_id=p_event_id
 AND e.state='SHADOW_PENDING' AND e.governed_wake_nonce=p_nonce AND e.governed_wake_request_id IS NOT NULL
 AND e.governed_wake_worker_run_id IS NULL AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id AND c.source_ref=e.source_ref
  AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
  AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256);
 GET DIAGNOSTICS n=ROW_COUNT;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN n=1 THEN 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' ELSE 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) TO service_role;
)
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
        AND q.reconciliation_snapshot->'accepted_review_scope'->>'owner_approval_receipt_sha256' ~ '^sha256:[a-f0-9]{64}
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed)))
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS final_loop_governed_start_v1 ON reality_internal.governed_employee_completion_warrants_v1;
CREATE TRIGGER final_loop_governed_start_v1 AFTER INSERT ON reality_internal.governed_employee_completion_warrants_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_resume_v1 ON reality_internal.final_loop_resume_events_v1;
CREATE TRIGGER final_loop_governed_resume_v1 AFTER INSERT ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_release_v1 ON reality_internal.governed_preview_shift_worker_leases_v1;
CREATE TRIGGER final_loop_governed_release_v1 AFTER UPDATE OF released_at ON reality_internal.governed_preview_shift_worker_leases_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_governed_start_v1(p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE r record; st text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GOVERNED_START_READ_SERVICE_ONLY';END IF;
 SELECT w.*,s.planned_start_at,p.last_worker_seen_at INTO r
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=w.shift_id AND s.owner_id=w.owner_id AND s.plan_fingerprint=w.plan_fingerprint
 LEFT JOIN reality_internal.governed_employee_shift_worker_pulses_v1 p
  ON p.shift_id=w.shift_id AND p.owner_id=w.owner_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
  AND w.state='ACTIVE' AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','GOVERNED_START_SCOPE_UNVERIFIED'); END IF;
 st:=CASE WHEN r.planned_start_at>pg_catalog.clock_timestamp() THEN 'GOVERNED_START_SCHEDULED'
  WHEN r.governed_start_request_id IS NULL THEN 'GOVERNED_START_NOT_QUEUED'
  WHEN r.governed_start_worker_run_id IS NOT NULL AND r.last_worker_seen_at>=r.governed_start_queued_at THEN 'GOVERNED_START_WORKER_OBSERVED'
  ELSE 'GOVERNED_START_WAKE_QUEUED' END;
 RETURN pg_catalog.jsonb_build_object('status',st,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'plan_fingerprint',r.plan_fingerprint,'network_request_id',r.governed_start_request_id,
  'queued_at',r.governed_start_queued_at,'last_worker_seen_at',r.last_worker_seen_at,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) TO service_role;

-- Existing event/warrant records are the single-use delivery receipts.
-- Only the actual signed worker's active lease and run can consume one.
-- No creation of an original, authority or outcome, no provider call.
CREATE OR REPLACE FUNCTION public.reality_claim_canonical_governed_wake_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_nonce uuid,p_kind text,p_release_sha text,p_worker_run_id uuid,p_lease_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE n int:=0;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CANONICAL_WAKE_SERVICE_ONLY';END IF;
 IF p_nonce IS NULL OR p_event_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('START','RESUME')
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_plan_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.owner_id=s.owner_id AND w.shift_id=s.shift_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE s.owner_id=p_owner_id AND s.shift_id=p_shift_id AND s.plan_fingerprint=p_plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
 AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_release_sha
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','CANONICAL_GOVERNED_WAKE_SCOPE_UNVERIFIED','execution_authorized',false);END IF;
 IF p_kind='START' AND p_event_id=p_shift_id THEN
 UPDATE reality_internal.governed_employee_completion_warrants_v1 w
 SET governed_start_worker_run_id=p_worker_run_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
 AND w.state='ACTIVE' AND w.governed_start_nonce=p_nonce AND w.governed_start_request_id IS NOT NULL
 AND w.governed_start_worker_run_id IS NULL AND w.governed_start_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 GET DIAGNOSTICS n=ROW_COUNT;
 ELSIF p_kind='RESUME' THEN
 UPDATE reality_internal.final_loop_resume_events_v1 e SET governed_wake_worker_run_id=p_worker_run_id
 WHERE e.owner_id=p_owner_id AND e.shift_id=p_shift_id AND e.event_id=p_event_id
 AND e.state='SHADOW_PENDING' AND e.governed_wake_nonce=p_nonce AND e.governed_wake_request_id IS NOT NULL
 AND e.governed_wake_worker_run_id IS NULL AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id AND c.source_ref=e.source_ref
  AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
  AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256);
 GET DIAGNOSTICS n=ROW_COUNT;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN n=1 THEN 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' ELSE 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) TO service_role;

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
          AND a.runtime_scope->>'child_execution_enabled'='false'
          AND a.runtime_scope->>'parent_delivery_enabled'='false'
          AND a.runtime_scope->>'production_changed'='false'
          AND a.independent_isolation_proof_sha256 ~ '^sha256:[a-f0-9]{64}
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed)))
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS final_loop_governed_start_v1 ON reality_internal.governed_employee_completion_warrants_v1;
CREATE TRIGGER final_loop_governed_start_v1 AFTER INSERT ON reality_internal.governed_employee_completion_warrants_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_resume_v1 ON reality_internal.final_loop_resume_events_v1;
CREATE TRIGGER final_loop_governed_resume_v1 AFTER INSERT ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_release_v1 ON reality_internal.governed_preview_shift_worker_leases_v1;
CREATE TRIGGER final_loop_governed_release_v1 AFTER UPDATE OF released_at ON reality_internal.governed_preview_shift_worker_leases_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_governed_start_v1(p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE r record; st text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GOVERNED_START_READ_SERVICE_ONLY';END IF;
 SELECT w.*,s.planned_start_at,p.last_worker_seen_at INTO r
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=w.shift_id AND s.owner_id=w.owner_id AND s.plan_fingerprint=w.plan_fingerprint
 LEFT JOIN reality_internal.governed_employee_shift_worker_pulses_v1 p
  ON p.shift_id=w.shift_id AND p.owner_id=w.owner_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
  AND w.state='ACTIVE' AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','GOVERNED_START_SCOPE_UNVERIFIED'); END IF;
 st:=CASE WHEN r.planned_start_at>pg_catalog.clock_timestamp() THEN 'GOVERNED_START_SCHEDULED'
  WHEN r.governed_start_request_id IS NULL THEN 'GOVERNED_START_NOT_QUEUED'
  WHEN r.governed_start_worker_run_id IS NOT NULL AND r.last_worker_seen_at>=r.governed_start_queued_at THEN 'GOVERNED_START_WORKER_OBSERVED'
  ELSE 'GOVERNED_START_WAKE_QUEUED' END;
 RETURN pg_catalog.jsonb_build_object('status',st,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'plan_fingerprint',r.plan_fingerprint,'network_request_id',r.governed_start_request_id,
  'queued_at',r.governed_start_queued_at,'last_worker_seen_at',r.last_worker_seen_at,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) TO service_role;

-- Existing event/warrant records are the single-use delivery receipts.
-- Only the actual signed worker's active lease and run can consume one.
-- No creation of an original, authority or outcome, no provider call.
CREATE OR REPLACE FUNCTION public.reality_claim_canonical_governed_wake_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_nonce uuid,p_kind text,p_release_sha text,p_worker_run_id uuid,p_lease_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE n int:=0;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CANONICAL_WAKE_SERVICE_ONLY';END IF;
 IF p_nonce IS NULL OR p_event_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('START','RESUME')
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_plan_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.owner_id=s.owner_id AND w.shift_id=s.shift_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE s.owner_id=p_owner_id AND s.shift_id=p_shift_id AND s.plan_fingerprint=p_plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
 AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_release_sha
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','CANONICAL_GOVERNED_WAKE_SCOPE_UNVERIFIED','execution_authorized',false);END IF;
 IF p_kind='START' AND p_event_id=p_shift_id THEN
 UPDATE reality_internal.governed_employee_completion_warrants_v1 w
 SET governed_start_worker_run_id=p_worker_run_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
 AND w.state='ACTIVE' AND w.governed_start_nonce=p_nonce AND w.governed_start_request_id IS NOT NULL
 AND w.governed_start_worker_run_id IS NULL AND w.governed_start_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 GET DIAGNOSTICS n=ROW_COUNT;
 ELSIF p_kind='RESUME' THEN
 UPDATE reality_internal.final_loop_resume_events_v1 e SET governed_wake_worker_run_id=p_worker_run_id
 WHERE e.owner_id=p_owner_id AND e.shift_id=p_shift_id AND e.event_id=p_event_id
 AND e.state='SHADOW_PENDING' AND e.governed_wake_nonce=p_nonce AND e.governed_wake_request_id IS NOT NULL
 AND e.governed_wake_worker_run_id IS NULL AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id AND c.source_ref=e.source_ref
  AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
  AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256);
 GET DIAGNOSTICS n=ROW_COUNT;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN n=1 THEN 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' ELSE 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) TO service_role;
))))
      AND q.reconciliation_receipt_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
        pg_catalog.convert_to(q.reconciliation_snapshot::text,'UTF8')),'hex')
    )) OR (ev.signal_kind='INDEPENDENT_FROZEN_CI_RECEIPT' AND EXISTS(
     SELECT 1 FROM reality_internal.owner_maintenance_independent_case_ci_v1 ci
     WHERE ci.owner_id=ev.owner_id AND ci.shift_id=ev.shift_id AND ci.source_ref=ev.source_ref
      AND ci.case_specific_ci_receipt_sha256=ev.source_receipt_sha256
      AND ci.source_epoch_frozen_red_verified AND ci.code_correction_green_verified
      AND NOT ci.original_customer_job_completed AND NOT ci.artifact_installation_authorized
      AND NOT ci.production_changed)))
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION reality_internal.on_final_loop_governed_wake_v1()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF TG_TABLE_NAME='governed_employee_completion_warrants_v1' THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_requested_at=pg_catalog.clock_timestamp() WHERE shift_id=NEW.shift_id;
 ELSIF TG_TABLE_NAME='final_loop_resume_events_v1' THEN
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_requested_at=pg_catalog.clock_timestamp() WHERE event_id=NEW.event_id;
 END IF;
 -- Notification failures must not roll back durable authorization or evidence.
 BEGIN
  IF TG_TABLE_NAME='governed_preview_shift_worker_leases_v1' THEN
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
END $$;
REVOKE ALL ON FUNCTION reality_internal.on_final_loop_governed_wake_v1() FROM PUBLIC,anon,authenticated,service_role;

DROP TRIGGER IF EXISTS final_loop_governed_start_v1 ON reality_internal.governed_employee_completion_warrants_v1;
CREATE TRIGGER final_loop_governed_start_v1 AFTER INSERT ON reality_internal.governed_employee_completion_warrants_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_resume_v1 ON reality_internal.final_loop_resume_events_v1;
CREATE TRIGGER final_loop_governed_resume_v1 AFTER INSERT ON reality_internal.final_loop_resume_events_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();
DROP TRIGGER IF EXISTS final_loop_governed_release_v1 ON reality_internal.governed_preview_shift_worker_leases_v1;
CREATE TRIGGER final_loop_governed_release_v1 AFTER UPDATE OF released_at ON reality_internal.governed_preview_shift_worker_leases_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.on_final_loop_governed_wake_v1();

CREATE OR REPLACE FUNCTION public.reality_read_final_loop_governed_start_v1(p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text)
 RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE r record; st text;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'GOVERNED_START_READ_SERVICE_ONLY';END IF;
 SELECT w.*,s.planned_start_at,p.last_worker_seen_at INTO r
 FROM reality_internal.governed_employee_completion_warrants_v1 w
 JOIN reality_internal.governed_employee_shifts_v1 s
  ON s.shift_id=w.shift_id AND s.owner_id=w.owner_id AND s.plan_fingerprint=w.plan_fingerprint
 LEFT JOIN reality_internal.governed_employee_shift_worker_pulses_v1 p
  ON p.shift_id=w.shift_id AND p.owner_id=w.owner_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
  AND w.state='ACTIVE' AND s.closed_at IS NULL AND s.authorized_at IS NOT NULL;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('status','GOVERNED_START_SCOPE_UNVERIFIED'); END IF;
 st:=CASE WHEN r.planned_start_at>pg_catalog.clock_timestamp() THEN 'GOVERNED_START_SCHEDULED'
  WHEN r.governed_start_request_id IS NULL THEN 'GOVERNED_START_NOT_QUEUED'
  WHEN r.governed_start_worker_run_id IS NOT NULL AND r.last_worker_seen_at>=r.governed_start_queued_at THEN 'GOVERNED_START_WORKER_OBSERVED'
  ELSE 'GOVERNED_START_WAKE_QUEUED' END;
 RETURN pg_catalog.jsonb_build_object('status',st,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'plan_fingerprint',r.plan_fingerprint,'network_request_id',r.governed_start_request_id,
  'queued_at',r.governed_start_queued_at,'last_worker_seen_at',r.last_worker_seen_at,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) TO service_role;

-- Existing event/warrant records are the single-use delivery receipts.
-- Only the actual signed worker's active lease and run can consume one.
-- No creation of an original, authority or outcome, no provider call.
CREATE OR REPLACE FUNCTION public.reality_claim_canonical_governed_wake_v1(
 p_owner_id uuid,p_shift_id uuid,p_plan_fingerprint text,p_event_id uuid,
 p_nonce uuid,p_kind text,p_release_sha text,p_worker_run_id uuid,p_lease_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE n int:=0;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'CANONICAL_WAKE_SERVICE_ONLY';END IF;
 IF p_nonce IS NULL OR p_event_id IS NULL OR p_kind IS NULL OR p_kind NOT IN('START','RESUME')
 OR coalesce(p_release_sha,'') !~ '^[a-f0-9]{40}$'
 OR coalesce(p_plan_fingerprint,'') !~ '^sha256:[a-f0-9]{64}$'
 OR NOT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_completion_warrants_v1 w
 ON w.owner_id=s.owner_id AND w.shift_id=s.shift_id AND w.plan_fingerprint=s.plan_fingerprint
 JOIN reality_internal.governed_preview_shift_worker_leases_v1 l ON l.claim_id=p_lease_id
 JOIN reality_internal.signed_worker_actual_runs_v1 r ON r.run_id=p_worker_run_id
 JOIN reality_internal.governed_worker_release_approvals_v1 a ON a.owner_id=s.owner_id AND a.shift_id=s.shift_id
 WHERE s.owner_id=p_owner_id AND s.shift_id=p_shift_id AND s.plan_fingerprint=p_plan_fingerprint
 AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL AND s.planned_start_at<=pg_catalog.clock_timestamp()
 AND s.planned_end_at>pg_catalog.clock_timestamp() AND w.state='ACTIVE'
 AND l.worker_key='preview-governed-employee-shift-worker' AND l.released_at IS NULL
 AND l.lease_expires_at>pg_catalog.clock_timestamp() AND r.status='STARTED' AND r.finished_at IS NULL
 AND r.started_at>=l.claimed_at AND r.started_at>pg_catalog.clock_timestamp()-interval '3 minutes'
 AND a.state='CLAIMED_ONCE' AND a.release_sha=p_release_sha
 AND a.runtime_scope->>'runtime_database_project_ref'='hvkfreoagbrphwghjajw'
 AND a.runtime_scope->>'child_execution_enabled'='false'
 AND a.runtime_scope->>'parent_delivery_enabled'='false')
 THEN RETURN pg_catalog.jsonb_build_object('status','CANONICAL_GOVERNED_WAKE_SCOPE_UNVERIFIED','execution_authorized',false);END IF;
 IF p_kind='START' AND p_event_id=p_shift_id THEN
 UPDATE reality_internal.governed_employee_completion_warrants_v1 w
 SET governed_start_worker_run_id=p_worker_run_id
 WHERE w.owner_id=p_owner_id AND w.shift_id=p_shift_id AND w.plan_fingerprint=p_plan_fingerprint
 AND w.state='ACTIVE' AND w.governed_start_nonce=p_nonce AND w.governed_start_request_id IS NOT NULL
 AND w.governed_start_worker_run_id IS NULL AND w.governed_start_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes';
 GET DIAGNOSTICS n=ROW_COUNT;
 ELSIF p_kind='RESUME' THEN
 UPDATE reality_internal.final_loop_resume_events_v1 e SET governed_wake_worker_run_id=p_worker_run_id
 WHERE e.owner_id=p_owner_id AND e.shift_id=p_shift_id AND e.event_id=p_event_id
 AND e.state='SHADOW_PENDING' AND e.governed_wake_nonce=p_nonce AND e.governed_wake_request_id IS NOT NULL
 AND e.governed_wake_worker_run_id IS NULL AND e.governed_wake_queued_at>pg_catalog.clock_timestamp()-interval '5 minutes'
 AND EXISTS(SELECT 1 FROM reality_internal.final_loop_resume_conditions_v1 c
  WHERE c.owner_id=e.owner_id AND c.shift_id=e.shift_id AND c.original_work_id=e.original_work_id AND c.source_ref=e.source_ref
  AND c.condition_kind=e.signal_kind AND c.continuity_revision=e.continuity_revision
  AND c.continuity_head_sha256=e.continuity_head_sha256 AND c.subscribed_receipt_sha256=e.previous_receipt_sha256);
 GET DIAGNOSTICS n=ROW_COUNT;
 END IF;
 RETURN pg_catalog.jsonb_build_object('status',CASE WHEN n=1 THEN 'CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED' ELSE 'CANONICAL_GOVERNED_WAKE_MISSING_STALE_OR_CONSUMED' END,
 'event_id',p_event_id,'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,
 'execution_authorized',false,'original_job_completed',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_claim_canonical_governed_wake_v1(uuid,uuid,text,uuid,uuid,text,text,uuid,uuid) TO service_role;
