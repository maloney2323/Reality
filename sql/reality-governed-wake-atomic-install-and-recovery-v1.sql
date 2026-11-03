-- Reality wake hardening: notifications MUST NEVER roll back a saved
-- owner approval; the outbox is durable independently of pg_net delivery.
CREATE OR REPLACE FUNCTION reality_internal.wake_approved_on_outbox_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
DECLARE hint_id bigint;
BEGIN
 IF NEW.wake_state<>'WAKE_PENDING' OR
    NEW.target_environment<>'ISOLATED_PREVIEW' THEN
   RAISE EXCEPTION 'WAKE_OUTBOX_NOTIFY_INVALID'; END IF;
 -- Notification is supplementary; pg_net failures cannot invalidate
 -- the owner's once-only authorization or lose the durable queue row.
 BEGIN
  hint_id:=reality_internal.send_governed_wake_hint_v1('approval');
 EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'REALITY_WAKE_NOTIFICATION_FAILED_OUTBOX_RETAINED';
 END;
 RETURN NEW;
END $fn$;

-- Future genuine installations MUST be admitted by OIDC proof-of-life,
-- current material state, and the CURRENT delivery fence. Original source
-- and signed approval continue to be verified by the existing reservation.
CREATE OR REPLACE FUNCTION reality_internal.assert_governed_install_reservation_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
BEGIN
 IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL THEN
   RETURN NEW; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=NEW.approval_id FOR UPDATE;
 -- Historical completed approvals predate this protocol. Never replay.
 IF w.approval_id IS NULL THEN RETURN NEW; END IF;
 IF w.wake_state <> 'GOVERNANCE_READY' OR
    w.dispatch_fence<1 OR
    w.dispatch_lease_expires_at<=clock_timestamp() OR
    w.worker_run_id IS NULL OR
    w.worker_run_id::text IS DISTINCT FROM NEW.installer_run_id OR
    w.original_work_id IS DISTINCT FROM NEW.original_work_id OR
    w.artifact_sha256 IS DISTINCT FROM NEW.artifact_hash OR
    w.pre_state_hash IS DISTINCT FROM NEW.pre_state_hash OR
    w.owner_id IS DISTINCT FROM NEW.owner_id OR
    NEW.target_environment<>'ISOLATED_PREVIEW' THEN
   RAISE EXCEPTION 'GOVERNED_INSTALL_SIGNED_WORKER_OR_FENCE_REQUIRED'; END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS reality_governed_install_reservation_guard_v1
 ON reality_internal.genuine_preview_install_approvals_v1;
CREATE TRIGGER reality_governed_install_reservation_guard_v1
 BEFORE UPDATE OF consumed_at
 ON reality_internal.genuine_preview_install_approvals_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.assert_governed_install_reservation_v1();

CREATE OR REPLACE FUNCTION reality_internal.record_governed_install_reservation_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
BEGIN
 IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL THEN
   RETURN NEW; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=NEW.approval_id FOR UPDATE;
 IF w.approval_id IS NULL THEN RETURN NEW; END IF;
 IF w.wake_state<>'GOVERNANCE_READY' OR
    w.worker_run_id::text IS DISTINCT FROM NEW.installer_run_id THEN
   RAISE EXCEPTION 'GOVERNED_RESERVATION_ACK_NOT_MATCHED'; END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
 SET wake_state='EXECUTING',
     dispatch_lease_expires_at=clock_timestamp()+interval '90 minutes',
     updated_at=clock_timestamp()
 WHERE approval_id=NEW.approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES (NEW.approval_id,w.dispatch_fence,'EXECUTING',
  jsonb_build_object('source','ORIGINAL_SINGLE_USE_INSTALL_RESERVATION',
   'provider_run_id',NEW.installer_run_id,
   'installation_completed',false,'production_changed',false));
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS reality_governed_install_reservation_record_v1
 ON reality_internal.genuine_preview_install_approvals_v1;
CREATE TRIGGER reality_governed_install_reservation_record_v1
 AFTER UPDATE OF consumed_at
 ON reality_internal.genuine_preview_install_approvals_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.record_governed_install_reservation_v1();

-- Once a signed worker has come alive, we don't blindly restart the same
-- installation on an unobserved timeout: side effects might have occurred.
-- Escalate stale WORKER_ALIVE/GOVERNANCE_READY/EXECUTING instead.
CREATE OR REPLACE FUNCTION reality_internal.watch_governed_wake_outbox_v1()
RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path TO '' AS $fn$
DECLARE stalled reality_internal.governed_execution_wake_outbox_v1%rowtype;
        count_stalled integer:=0;
BEGIN
 FOR stalled IN SELECT * FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE wake_state IN ('WORKER_ALIVE','GOVERNANCE_READY','EXECUTING')
   AND dispatch_lease_expires_at<clock_timestamp()
 FOR UPDATE SKIP LOCKED LOOP
  UPDATE reality_internal.governed_execution_wake_outbox_v1
  SET wake_state='ESCALATED',updated_at=clock_timestamp()
  WHERE approval_id=stalled.approval_id;
  INSERT INTO reality_internal.governed_execution_wake_events_v1
   (approval_id,dispatch_fence,wake_state,detail)
  VALUES(stalled.approval_id,stalled.dispatch_fence,'ESCALATED',
   jsonb_build_object('reason','SIGNED_WORKER_STALLED_EFFECTS_UNKNOWN',
    'automatic_execution_retry',false));
  count_stalled:=count_stalled+1;
 END LOOP;
 IF EXISTS (SELECT 1 FROM reality_internal.governed_execution_wake_outbox_v1
   WHERE (wake_state IN ('WAKE_PENDING','RETRY_PENDING')
      AND next_attempt_at<=now())
    OR (wake_state IN ('DISPATCH_CLAIMED','DISPATCH_ACCEPTED')
      AND dispatch_lease_expires_at<=now())) THEN
  BEGIN
   PERFORM reality_internal.send_governed_wake_hint_v1('watchdog');
  EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'REALITY_WAKE_WATCHDOG_NOTIFICATION_FAILED_RETRY_PERSISTED';
  END;
  RETURN 'WAKE_HINT_REQUESTED_STALLED_'||count_stalled;
 END IF;
 IF count_stalled>0 THEN RETURN 'STALE_WORKERS_ESCALATED_'||count_stalled; END IF;
 RETURN 'NO_WAKE_DUE';
END $fn$;