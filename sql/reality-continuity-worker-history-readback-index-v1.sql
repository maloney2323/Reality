-- BENCHMARK ONLY: index-only candidate for the two observed cron-history readback timeouts.
-- No function, permission, scheduler, shift, ledger, worker, or receipt changes.
-- Execute as a standalone statement outside a transaction, only after live catalog
-- confirms table ownership, existing equivalent indexes, and available capacity.
-- CREATE INDEX CONCURRENTLY is intentionally not a transactional migration.
-- A failed/invalid index must be independently inspected before any retry.
CREATE INDEX CONCURRENTLY IF NOT EXISTS reality_cron_success_start_readback_v1
 ON cron.job_run_details (jobid, start_time DESC)
 INCLUDE (return_message)
 WHERE status = 'succeeded';
