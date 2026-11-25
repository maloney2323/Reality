-- Isolated acceptance branch repair of historical migration 20261030022526.
-- The original migration required an existing QUEUED_DISCOVERY row after
-- altering the phase constraint. A data-free branch must not invent one.
-- Preserve the exact intended phase contract and all existing rows, including
-- the legitimate zero-row case. Do not modify the parent's migration history.
-- Apply only to the verified data-free acceptance branch after provider checks.
DO $repair$
DECLARE before_count bigint; before_queued bigint; after_count bigint;
 after_queued bigint; def text; expected text[]:=ARRAY[
 'QUEUED_DISCOVERY','CLAIMED_DISCOVERY','BLOCKED_MISSING_EVIDENCE',
 'BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED','AWAITING_SANDBOX',
 'SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL','FAILED','CANCELLED',
 'RUNNING_CONSTITUTIONAL','ESCALATED','EXECUTION_UNRESOLVED'];
BEGIN
 IF pg_catalog.to_regclass('cron.job') IS NOT NULL OR EXISTS(
 SELECT 1 FROM reality_internal.governed_employee_shifts_v1
 WHERE authorized_at IS NOT NULL AND closed_at IS NULL)
 THEN RAISE EXCEPTION 'ISOLATED_REPLAY_REPAIR_SCOPE_UNVERIFIED'; END IF;
 LOCK TABLE reality_internal.governed_build_queue_v1 IN ACCESS EXCLUSIVE MODE;
 SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO def
 FROM pg_catalog.pg_constraint c
 WHERE c.conrelid='reality_internal.governed_build_queue_v1'::regclass
 AND c.conname='governed_build_queue_v1_phase_check' AND c.contype='c';
 IF def IS NULL OR pg_catalog.strpos(def,'QUEUED_DISCOVERY')=0
 OR pg_catalog.strpos(def,'AWAITING_OWNER_APPROVAL')=0
 THEN RAISE EXCEPTION 'FIRST178_UNEXPECTED_QUEUE_PHASE_CONTRACT'; END IF;
 SELECT count(*),count(*) FILTER(WHERE phase='QUEUED_DISCOVERY' AND worker_claim_id IS NULL AND claimed_at IS NULL)
 INTO before_count,before_queued FROM reality_internal.governed_build_queue_v1;
 IF before_count<>0 THEN RAISE EXCEPTION 'DATA_FREE_REPLAY_REPAIR_QUEUE_NOT_EMPTY'; END IF;
 ALTER TABLE reality_internal.governed_build_queue_v1
 DROP CONSTRAINT governed_build_queue_v1_phase_check;
 ALTER TABLE reality_internal.governed_build_queue_v1
 ADD CONSTRAINT governed_build_queue_v1_phase_check CHECK(phase=ANY(ARRAY[
 'QUEUED_DISCOVERY','CLAIMED_DISCOVERY','BLOCKED_MISSING_EVIDENCE',
 'BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED','AWAITING_SANDBOX',
 'SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL','FAILED','CANCELLED',
 'RUNNING_CONSTITUTIONAL','ESCALATED','EXECUTION_UNRESOLVED']));
 SELECT count(*),count(*) FILTER(WHERE phase='QUEUED_DISCOVERY' AND worker_claim_id IS NULL AND claimed_at IS NULL)
 INTO after_count,after_queued FROM reality_internal.governed_build_queue_v1;
 IF before_count<>after_count OR before_queued<>after_queued
 THEN RAISE EXCEPTION 'FIRST178_EXISTING_QUEUE_IDENTITY_NOT_PRESERVED'; END IF;
END $repair$;
