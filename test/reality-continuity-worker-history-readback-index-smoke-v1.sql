\set ON_ERROR_STOP on
-- Independent synthetic PostgreSQL regression; no live provider or owner data.
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigint PRIMARY KEY, jobname text NOT NULL);
CREATE TABLE cron.job_run_details (runid bigint PRIMARY KEY, jobid bigint NOT NULL,
 status text NOT NULL, start_time timestamptz NOT NULL, return_message text);
INSERT INTO cron.job VALUES (1,'reality-riley-preview-original-execution-wake-v1'),
 (2,'other-job'),(3,'reality-riley-preview-original-execution-wake-v1');
INSERT INTO cron.job_run_details
SELECT i, 2, 'succeeded', now()-make_interval(mins=>i%100000), '1 row'
FROM generate_series(1,150000) i;
INSERT INTO cron.job_run_details VALUES
 (150001,1,'succeeded',now()-interval '2 hours','1 row'),
 (150002,1,'succeeded',now()-interval '1 hour','0 rows'),
 (150003,1,'failed',now()-interval '5 minutes','1 row'),
 (150004,1,'succeeded',now()-interval '72 hours','1 row'),
 (150005,3,'succeeded',now()-interval '90 minutes','1 row'),
 (150006,1,'succeeded',now()-interval '3 hours',NULL);
ANALYZE cron.job;
ANALYZE cron.job_run_details;
-- Preserve both live predicates from the observed PostgreSQL error contexts,
-- including the actual-run receipt's stricter dispatch success condition.
CREATE TEMP VIEW exact_history_answers AS
SELECT
 (SELECT max(d.start_time) FROM cron.job_run_details d JOIN cron.job j ON j.jobid=d.jobid
 WHERE j.jobname='reality-riley-preview-original-execution-wake-v1'
 AND d.status='succeeded' AND d.start_time>clock_timestamp()-interval '48 hours') AS recovery,
 (SELECT max(d.start_time) FROM cron.job_run_details d JOIN cron.job j ON j.jobid=d.jobid
 WHERE j.jobname='reality-riley-preview-original-execution-wake-v1'
 AND d.status='succeeded' AND d.return_message='1 row'
 AND d.start_time>clock_timestamp()-interval '48 hours') AS dispatch;
CREATE TEMP TABLE baseline AS SELECT * FROM exact_history_answers;
DO $$
BEGIN
 IF (SELECT recovery<=dispatch OR recovery IS NULL OR dispatch IS NULL FROM baseline)
 THEN RAISE EXCEPTION 'FIXTURE_DID_NOT_DISTINGUISH_DISPATCH_FROM_HISTORY'; END IF;
END $$;
\ir ../sql/reality-continuity-worker-history-readback-index-v1.sql
ANALYZE cron.job_run_details;
DO $$
DECLARE p json;
BEGIN
 IF EXISTS((SELECT * FROM baseline EXCEPT SELECT * FROM exact_history_answers)
 UNION ALL (SELECT * FROM exact_history_answers EXCEPT SELECT * FROM baseline))
 THEN RAISE EXCEPTION 'READBACK_EVIDENCE_CHANGED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE c.relname='reality_cron_success_start_readback_v1' AND i.indisvalid)
 THEN RAISE EXCEPTION 'INDEX_INVALID';END IF;
 -- Check the index is usable by the planner with both exact predicates.
 -- The natural planner chooses independently; no forced scan settings.
 EXECUTE 'EXPLAIN (FORMAT JSON) SELECT max(d.start_time) FROM cron.job_run_details d JOIN cron.job j ON j.jobid=d.jobid WHERE j.jobname=''reality-riley-preview-original-execution-wake-v1'' AND d.status=''succeeded'' AND d.start_time>clock_timestamp()-interval ''48 hours''' INTO p;
 RAISE NOTICE 'recovery natural plan: %',p;
 EXECUTE 'EXPLAIN (FORMAT JSON) SELECT max(d.start_time) FROM cron.job_run_details d JOIN cron.job j ON j.jobid=d.jobid WHERE j.jobname=''reality-riley-preview-original-execution-wake-v1'' AND d.status=''succeeded'' AND d.return_message=''1 row'' AND d.start_time>clock_timestamp()-interval ''48 hours''' INTO p;
 RAISE NOTICE 'dispatch natural plan: %',p;
END $$;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT * FROM exact_history_answers;
-- Additional no matching recent successes case, both must remain NULL.
DELETE FROM cron.job_run_details WHERE jobid IN (1,3);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM exact_history_answers WHERE recovery IS NOT NULL OR dispatch IS NOT NULL)
 THEN RAISE EXCEPTION 'EMPTY_HISTORY_FALSE_SUCCESS'; END IF; END $$;
