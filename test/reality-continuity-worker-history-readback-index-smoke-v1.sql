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
-- Reproduce live readback statements with minimal service function fixtures.
CREATE FUNCTION public.reality_read_owner_worker_recovery_status_v1(p_owner_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE success_at timestamptz;
BEGIN
 select max(d.start_time) into success_at
 from cron.job_run_details d join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
 and d.status='succeeded'
 and d.start_time>clock_timestamp()-interval '48 hours';
 RETURN success_at;
END $fn$;
CREATE FUNCTION public.reality_read_owner_signed_worker_actual_runs_v1(p_owner_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE last_dispatch timestamptz;
BEGIN
 select max(d.start_time) into last_dispatch
 from cron.job_run_details d join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
  and d.status='succeeded'
  and d.return_message='1 row'
 and d.start_time>clock_timestamp()-interval '48 hours';
 RETURN last_dispatch;
END $fn$;
CREATE TEMP VIEW optimized_history_answers AS SELECT
 public.reality_read_owner_worker_recovery_status_v1(NULL::uuid) AS recovery,
 public.reality_read_owner_signed_worker_actual_runs_v1(NULL::uuid) AS dispatch;
\ir ../sql/reality-continuity-worker-history-readback-query-v1.sql
DO $$
DECLARE p json;
BEGIN
 IF EXISTS((SELECT * FROM baseline EXCEPT SELECT * FROM optimized_history_answers)
 UNION ALL (SELECT * FROM optimized_history_answers EXCEPT SELECT * FROM baseline))
 THEN RAISE EXCEPTION 'READBACK_EVIDENCE_CHANGED'; END IF;
 EXECUTE $q$EXPLAIN (FORMAT JSON) select max(latest.start_time)
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';$q$ INTO p;
 RAISE NOTICE 'optimized recovery natural plan: %',p;
 IF p::text NOT LIKE '%reality_cron_success_start_readback_v1%' THEN
  RAISE EXCEPTION 'RECOVERY_INDEX_NOT_USED'; END IF;
 EXECUTE $q$EXPLAIN (FORMAT JSON) select max(latest.start_time)
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.return_message='1 row'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';$q$ INTO p;
 RAISE NOTICE 'optimized dispatch natural plan: %',p;
 IF p::text NOT LIKE '%reality_cron_dispatch_start_readback_v1%' THEN
  RAISE EXCEPTION 'DISPATCH_INDEX_NOT_USED'; END IF;
END $$;
EXPLAIN (ANALYZE, BUFFERS) select max(latest.start_time)
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';
EXPLAIN (ANALYZE, BUFFERS) select max(latest.start_time)
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.return_message='1 row'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';
DELETE FROM cron.job_run_details WHERE jobid IN (1,3);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM optimized_history_answers WHERE recovery IS NOT NULL OR dispatch IS NOT NULL)
 THEN RAISE EXCEPTION 'EMPTY_HISTORY_FALSE_SUCCESS'; END IF; END $$;
