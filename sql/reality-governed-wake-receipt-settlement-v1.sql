-- Reality governed wake: settlement only follows independent durable receipts.
-- No model text or client flag may set these states. Historical approvals
-- without a v1 outbox record are untouched.
CREATE OR REPLACE FUNCTION reality_internal.record_governed_settlement_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
BEGIN
 IF NEW.settlement_receipt IS NOT DISTINCT FROM OLD.settlement_receipt THEN
  RETURN NEW; END IF;
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE approval_id=NEW.approval_id FOR UPDATE;
 IF w.approval_id IS NULL OR w.wake_state<>'EXECUTING' THEN
  RETURN NEW; END IF;
 IF NEW.consumed_at IS NULL OR
   NEW.installer_run_id IS DISTINCT FROM w.worker_run_id::text OR
   NEW.artifact_hash IS DISTINCT FROM w.artifact_sha256 OR
   NEW.target_environment<>'ISOLATED_PREVIEW' OR
   NEW.installed_commit_sha !~ '^[a-f0-9]{40}$' OR
   NEW.settlement_receipt->>'original_job_completed'<>'true' OR
   NEW.settlement_receipt->>'independent_outcome_verified'<>'true' OR
   NEW.settlement_receipt->>'production_changed'<>'false' THEN
  RAISE EXCEPTION 'GOVERNED_SETTLEMENT_INDEPENDENT_SOURCE_PROOF_REQUIRED'; END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
 SET wake_state='SETTLED',updated_at=clock_timestamp(),
     dispatch_lease_expires_at=NULL
 WHERE approval_id=w.approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES(w.approval_id,w.dispatch_fence,'SETTLED',
  jsonb_build_object('evidence','ORIGINAL_JOB_SIGNED_SETTLEMENT',
   'installed_commit_sha',NEW.installed_commit_sha,
   'final_independent_receipt_verified',false));
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS reality_governed_settlement_receipt_v1
 ON reality_internal.genuine_preview_install_approvals_v1;
CREATE TRIGGER reality_governed_settlement_receipt_v1
 AFTER UPDATE OF settlement_receipt
 ON reality_internal.genuine_preview_install_approvals_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.record_governed_settlement_v1();

CREATE OR REPLACE FUNCTION reality_internal.record_governed_final_receipt_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE w reality_internal.governed_execution_wake_outbox_v1%rowtype;
        a reality_internal.genuine_preview_install_approvals_v1%rowtype;
BEGIN
 SELECT * INTO w FROM reality_internal.governed_execution_wake_outbox_v1
 WHERE original_work_id=NEW.original_work_id
   AND artifact_sha256=NEW.artifact_sha256 FOR UPDATE;
 IF w.approval_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM reality_internal.genuine_preview_install_approvals_v1
 WHERE approval_id=w.approval_id;
 IF w.wake_state<>'SETTLED' OR
    NEW.production_changed IS DISTINCT FROM false OR
    NEW.owner_id IS DISTINCT FROM w.owner_id OR
    NEW.provider_run_id IS DISTINCT FROM w.worker_run_id OR
    NEW.installed_commit_sha IS DISTINCT FROM a.installed_commit_sha OR
    NEW.verified_settlement_event_id IS NULL OR
    NEW.verifier_artifact_digest !~ '^[a-f0-9]{64}$' OR
    a.settlement_receipt->>'independent_outcome_verified'<>'true' THEN
  RAISE EXCEPTION 'GOVERNED_FINAL_RECEIPT_RECONCILIATION_FAILED'; END IF;
 UPDATE reality_internal.governed_execution_wake_outbox_v1
 SET wake_state='RECEIPT_VERIFIED',updated_at=clock_timestamp()
 WHERE approval_id=w.approval_id;
 INSERT INTO reality_internal.governed_execution_wake_events_v1
  (approval_id,dispatch_fence,wake_state,detail)
 VALUES(w.approval_id,w.dispatch_fence,'RECEIPT_VERIFIED',
  jsonb_build_object('evidence','INDEPENDENT_FINAL_VERIFIER',
   'verified_settlement_event_id',NEW.verified_settlement_event_id,
   'verifier_artifact_digest',NEW.verifier_artifact_digest,
   'production_changed',false));
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS reality_governed_final_customer_receipt_v1
 ON reality_internal.genuine_independent_final_receipts_v1;
CREATE TRIGGER reality_governed_final_customer_receipt_v1
 AFTER INSERT ON reality_internal.genuine_independent_final_receipts_v1
 FOR EACH ROW EXECUTE FUNCTION reality_internal.record_governed_final_receipt_v1();