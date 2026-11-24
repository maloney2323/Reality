-- Queue phase expansion: preserve existing jobs without assuming seeded data.
-- Safe on empty isolated Supabase branches and populated main environments.
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

-- Verify existing queue rows before and after schema-only alteration.
CREATE TEMP TABLE first178_queue_preservation ON COMMIT DROP AS
 SELECT count(*)::bigint AS total,
        count(*) FILTER (WHERE phase='QUEUED_DISCOVERY'
          AND worker_claim_id IS NULL AND claimed_at IS NULL)::bigint AS queued
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

DO $verify$
DECLARE before_total bigint; before_queued bigint;
        after_total bigint; after_queued bigint;
BEGIN
 SELECT total,queued INTO before_total,before_queued
 FROM pg_temp.first178_queue_preservation;
 SELECT count(*)::bigint,
        count(*) FILTER (WHERE phase='QUEUED_DISCOVERY'
          AND worker_claim_id IS NULL AND claimed_at IS NULL)::bigint
 INTO after_total,after_queued
 FROM reality_internal.governed_build_queue_v1;
 IF after_total IS DISTINCT FROM before_total
    OR after_queued IS DISTINCT FROM before_queued
 THEN RAISE EXCEPTION 'FIRST178_EXISTING_QUEUE_ROWS_NOT_PRESERVED'; END IF;
END $verify$;
