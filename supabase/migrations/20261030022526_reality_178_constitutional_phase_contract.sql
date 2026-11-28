-- Queue phase expansion: preserve existing jobs without assuming seeded data.
-- One atomic statement works on data-free acceptance branches and populated
-- environments, without a session-local temporary table or a fabricated job.
DO $m$
DECLARE olddef text;
        before_total bigint; before_queued bigint;
        after_total bigint; after_queued bigint;
BEGIN
 LOCK TABLE reality_internal.governed_build_queue_v1 IN ACCESS EXCLUSIVE MODE;
 SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO olddef
 FROM pg_catalog.pg_constraint c
 WHERE c.conrelid='reality_internal.governed_build_queue_v1'::regclass
   AND c.conname='governed_build_queue_v1_phase_check'
   AND c.contype='c';
 IF olddef IS NULL OR
    pg_catalog.strpos(olddef,'QUEUED_DISCOVERY')=0 OR
    pg_catalog.strpos(olddef,'AWAITING_OWNER_APPROVAL')=0
 THEN RAISE EXCEPTION 'FIRST178_UNEXPECTED_QUEUE_PHASE_CONTRACT'; END IF;
 SELECT count(*)::bigint,
        count(*) FILTER (WHERE phase='QUEUED_DISCOVERY'
          AND worker_claim_id IS NULL AND claimed_at IS NULL)::bigint
 INTO before_total,before_queued
 FROM reality_internal.governed_build_queue_v1;

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

 SELECT count(*)::bigint,
        count(*) FILTER (WHERE phase='QUEUED_DISCOVERY'
          AND worker_claim_id IS NULL AND claimed_at IS NULL)::bigint
 INTO after_total,after_queued
 FROM reality_internal.governed_build_queue_v1;
 IF after_total IS DISTINCT FROM before_total
    OR after_queued IS DISTINCT FROM before_queued
 THEN RAISE EXCEPTION 'FIRST178_EXISTING_QUEUE_ROWS_NOT_PRESERVED'; END IF;
END $m$;
