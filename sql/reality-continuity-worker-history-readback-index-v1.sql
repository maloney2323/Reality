-- BENCHMARK ONLY. Standalone statements, outside transactions; verify catalog,
-- equivalent indexes, ownership and resource capacity before installing.
-- No ledger, worker, schedule, authority or evidence data changes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS reality_cron_success_start_readback_v1
 ON cron.job_run_details (jobid, start_time DESC)
 WHERE status = 'succeeded';
CREATE INDEX CONCURRENTLY IF NOT EXISTS reality_cron_dispatch_start_readback_v1
 ON cron.job_run_details (jobid, start_time DESC)
 WHERE status = 'succeeded' AND return_message = '1 row';
