-- Patch only the exact observed statement in each existing function.
-- Preserve all other live function source, privileges and authorization boundaries.
-- Fail closed on unknown source; apply both changes atomically after indexes valid.
DO $patch$
DECLARE f regprocedure; before_def text; after_def text; needle text; replacement text;
BEGIN
 FOR f,needle,replacement IN SELECT * FROM (VALUES
 ('public.reality_read_owner_worker_recovery_status_v1(uuid)'::regprocedure,
  $old$select max(d.start_time) into success_at from cron.job_run_details d join cron.job j on j.jobid=d.jobid where j.jobname='reality-riley-preview-original-execution-wake-v1' and d.status='succeeded' and d.start_time>clock_timestamp()-interval '48 hours';$old$,
  $new$select max(latest.start_time) into success_at
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';$new$),
 ('public.reality_read_owner_signed_worker_actual_runs_v1(uuid)'::regprocedure,
  $old$select max(d.start_time) into last_dispatch from cron.job_run_details d join cron.job j on j.jobid=d.jobid where j.jobname='reality-riley-preview-original-execution-wake-v1' and d.status='succeeded' and d.return_message='1 row' and d.start_time>clock_timestamp()-interval '48 hours';$old$,
  $new$select max(latest.start_time) into last_dispatch
 from cron.job j
 cross join lateral (
  select d.start_time from cron.job_run_details d
  where d.jobid=j.jobid and d.status='succeeded'
  and d.return_message='1 row'
  and d.start_time>clock_timestamp()-interval '48 hours'
  order by d.start_time desc limit 1
 ) latest
 where j.jobname='reality-riley-preview-original-execution-wake-v1';$new$)
 ) AS v(f,needle,replacement)
 LOOP
  before_def:=pg_catalog.pg_get_functiondef(f::oid);
  -- Match whitespace variation only. No other SQL token may differ.
  needle:=pg_catalog.replace(needle,'.','[.]');
  needle:=pg_catalog.replace(needle,'(','[(]');
  needle:=pg_catalog.replace(needle,')','[)]');
  needle:=pg_catalog.replace(needle,' ','[[:space:]]+');
  IF pg_catalog.regexp_count(before_def,needle)<>1 THEN
   RAISE EXCEPTION 'LIVE_READBACK_SOURCE_MISMATCH %',f;
  END IF;
  after_def:=pg_catalog.regexp_replace(before_def,needle,replacement);
  IF before_def=after_def THEN RAISE EXCEPTION 'READBACK_PATCH_NO_CHANGE';END IF;
  EXECUTE after_def;
 END LOOP;
END $patch$;
