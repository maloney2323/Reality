-- DRAFT isolated acceptance only. Existing warrant, resume inbox and signed lease
-- are the durable state. No new executor, scheduler, authority or completion.
-- Transport remains disabled until an operator configures the isolated worker URL
-- and its own server-only token / deployment bypass in this isolated project's Vault.
ALTER TABLE reality_internal.governed_employee_completion_warrants_v1
 ADD COLUMN IF NOT EXISTS governed_start_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_start_request_id bigint,
 ADD COLUMN IF NOT EXISTS governed_start_queued_at timestamptz;
ALTER TABLE reality_internal.final_loop_resume_events_v1
 ADD COLUMN IF NOT EXISTS governed_wake_requested_at timestamptz,
 ADD COLUMN IF NOT EXISTS governed_wake_request_id bigint,
 ADD COLUMN IF NOT EXISTS governed_wake_queued_at timestamptz;

CREATE OR REPLACE FUNCTION reality_internal.notify_final_loop_governed_trigger_v1(p_shift_id uuid DEFAULT NULL)
 RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE w record; l record; e record; target text; token text; bypass text;
        req bigint; now_at timestamptz:=pg_catalog.clock_timestamp(); is_start boolean;
BEGIN
 -- Dedicated configuration: do NOT obtain a URL from cron, Chat, the model or an event.
 SELECT max(decrypted_secret) FILTER (WHERE name='reality_final_loop_isolated_worker_url_v1'),
        max(decrypted_secret) FILTER (WHERE name='reality_final_loop_isolated_worker_token_v1'),
        max(decrypted_secret) FILTER (WHERE name='reality_final_loop_isolated_worker_bypass_v1')
 INTO target,token,bypass FROM vault.decrypted_secrets
 WHERE name IN ('reality_final_loop_isolated_worker_url_v1','reality_final_loop_isolated_worker_token_v1',
 'reality_final_loop_isolated_worker_bypass_v1');
 IF target IS NULL OR target !~ '^https://[a-z0-9-]+[.]vercel[.]app/api/reality/governed-employee-shift-worker$'
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
 req:=net.http_post(url:=target,body:='{}'::jsonb,headers:=pg_catalog.jsonb_build_object(
  'Authorization','Bearer '||token,'x-vercel-protection-bypass',bypass,
  'Content-Type','application/json','x-reality-governed-owner-id',w.owner_id::text,
  'x-reality-governed-shift-id',w.shift_id::text,'x-reality-governed-plan-fingerprint',w.plan_fingerprint),
  timeout_milliseconds:=45000);
 IF req IS NULL OR req<1 THEN RAISE EXCEPTION 'GOVERNED_WAKE_TRANSPORT_UNVERIFIED';END IF;
 IF is_start THEN
  UPDATE reality_internal.governed_employee_completion_warrants_v1
   SET governed_start_request_id=req,governed_start_queued_at=now_at WHERE shift_id=w.shift_id;
 ELSE
  UPDATE reality_internal.final_loop_resume_events_v1
   SET governed_wake_request_id=req,governed_wake_queued_at=now_at WHERE event_id=e.event_id;
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
  WHEN r.last_worker_seen_at>=r.governed_start_queued_at THEN 'GOVERNED_START_WORKER_OBSERVED'
  ELSE 'GOVERNED_START_WAKE_QUEUED' END;
 RETURN pg_catalog.jsonb_build_object('status',st,'owner_id',r.owner_id,'shift_id',r.shift_id,
  'plan_fingerprint',r.plan_fingerprint,'network_request_id',r.governed_start_request_id,
  'queued_at',r.governed_start_queued_at,'last_worker_seen_at',r.last_worker_seen_at,
  'read_only',true,'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_final_loop_governed_start_v1(uuid,uuid,text) TO service_role;
