-- Issue #351. Apply only after preview worker supports the bounded
-- lease RPCs. The command fingerprint prevents changing an unknown job.
-- Harden the existing *preview* cron job against its two evidenced runaway
-- wake causes without changing any source/shift/installation authorization.
-- In particular, a standing evidence-only discovery grant is NOT an event.
DO $fix$
DECLARE
  v_job cron.job%rowtype;
  v_old_clause text:=$clause$
 or exists (
  select 1 from reality_internal.owner_routine_delegations_v1 g
  where g.enabled=true
   and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>clock_timestamp()
   and (case when g.daily_date=current_date then g.daily_reserved else 0 end)<g.max_daily_inquiries
 )
$clause$;
  v_new_command text;
BEGIN
  SELECT * INTO v_job FROM cron.job WHERE
    jobname='reality-riley-preview-original-execution-wake-v1'
    AND active=true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_CRON_NOT_FOUND_NO_CHANGE';
  END IF;
  IF v_job.schedule='*/5 * * * *'
     AND position(v_old_clause IN v_job.command)=0 THEN
    RETURN; -- repeatable migration; a prior verified gate remains intact
  END IF;
  IF v_job.schedule<>'* * * * *'
     OR md5(v_job.command)<>'3bfec223bf07e419048ac817b1a87f87'
     OR position(v_old_clause IN v_job.command)=0
     OR length(v_job.command)-length(replace(v_job.command,v_old_clause,''))
        <>length(v_old_clause)
  THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_COMMAND_DRIFT_ABORT_NO_CHANGE';
  END IF;
  v_new_command:=replace(v_job.command,v_old_clause,'');
  IF position('owner_capability_employee_schedule_v1' IN v_new_command)=0
     OR position('eligible_shift.permitted' IN v_new_command)=0
     OR position('net.http_post' IN v_new_command)=0
  THEN
    RAISE EXCEPTION 'PREVIEW_WORKER_DUE_WORK_ELIGIBILITY_MISSING';
  END IF;
  -- The cron remains a fallback poll, but execution is now protected by a
  -- durable per-worker lease. Existing event-driven lanes are preserved.
  PERFORM cron.alter_job(v_job.jobid,
    schedule=>'*/5 * * * *',command=>v_new_command);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobid=v_job.jobid
    AND active=true AND schedule='*/5 * * * *' AND command=v_new_command)
  THEN RAISE EXCEPTION 'PREVIEW_WORKER_CRON_READBACK_FAILED_ROLLBACK'; END IF;
END
$fix$;
