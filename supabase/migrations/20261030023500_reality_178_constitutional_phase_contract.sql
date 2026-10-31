-- Foundation-level repair: the existing #178 constitutional driver and
-- existing atomic queue use phases missing from the old table constraint.
-- Do not change any queue rows, identity, original work or authorization.
DO $m$
DECLARE olddef text;
BEGIN
 SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO olddef
 FROM pg_catalog.pg_constraint c
 JOIN pg_catalog.pg_class t ON t.oid=c.conrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace
 WHERE n.nspname='reality_internal'
   AND t.relname='governed_build_queue_v1'
   AND c.conname='governed_build_queue_v1_phase_check';
 IF olddef IS NULL OR
    pg_catalog.strpos(olddef,'QUEUED_DISCOVERY')=0 OR
    pg_catalog.strpos(olddef,'AWAITING_OWNER_APPROVAL')=0
 THEN RAISE EXCEPTION 'FIRST178_UNEXPECTED_QUEUE_PHASE_CONTRACT'; END IF;
END $m$;
ALTER TABLE reality_internal.governed_build_queue_v1
 DROP CONSTRAINT governed_build_queue_v1_phase_check;
ALTER TABLE reality_internal.governed_build_queue_v1
 ADD CONSTRAINT governed_build_queue_v1_phase_check
 CHECK (phase = ANY(ARRAY[
  'QUEUED_DISCOVERY','CLAIMED_DISCOVERY','BLOCKED_MISSING_EVIDENCE',
  'BLOCKED_OWNER_AUTHORITY','BUILD_TICKET_VERIFIED','AWAITING_SANDBOX',
  'SANDBOX_REJECTED','AWAITING_OWNER_APPROVAL','FAILED','CANCELLED',
  'RUNNING_CONSTITUTIONAL','ESCALATED','EXECUTION_UNRESOLVED'
 ]));
-- A schema repair, not an execution event. Exactly preserve queued records.
DO $verify$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n
 FROM reality_internal.governed_build_queue_v1
 WHERE phase='QUEUED_DISCOVERY'
 AND worker_claim_id IS NULL AND claimed_at IS NULL;
 IF n<1 THEN RAISE EXCEPTION 'FIRST178_EXISTING_QUEUED_JOB_NOT_PRESERVED'; END IF;
END $verify$;