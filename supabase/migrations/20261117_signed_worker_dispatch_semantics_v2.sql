-- A cron SQL success with '0 rows' is an eligibility miss, not HTTP enqueue.
create or replace function public.reality_read_owner_signed_worker_actual_runs_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare r reality_internal.signed_worker_actual_runs_v1%rowtype;
 last_success timestamptz;last_dispatch timestamptz;last_check timestamptz;recent_failed integer;
 last_result text;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'SIGNED_WORKER_RUN_READ_OWNER_SERVICE_REQUIRED';end if;
 -- This is platform availability. The owner has never supplied another
 -- owner's worker run identity, and no credential or request payload is read.
 select * into r from reality_internal.signed_worker_actual_runs_v1
 order by started_at desc limit 1;
 select max(started_at) into last_success
 from reality_internal.signed_worker_actual_runs_v1
 where status='COMPLETED';
 select max(d.start_time) into last_dispatch
 from cron.job_run_details d join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
  and d.status='succeeded'
  and d.return_message='1 row'
  and d.start_time>clock_timestamp()-interval '48 hours';
 select d.start_time,
  case when d.status='failed' then 'FAILED'
   when d.return_message='0 rows' then 'NO_ELIGIBLE_REQUEST_QUEUED'
   when d.status='succeeded' and d.return_message='1 row'
     then 'HTTP_ENQUEUE_ATTEMPTED_NOT_DELIVERY_PROOF'
   else 'SCHEDULER_SQL_STATUS_UNCLASSIFIED' end
 into last_check,last_result
 from cron.job_run_details d join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
 order by d.runid desc limit 1;
 select count(*) into recent_failed
 from reality_internal.signed_worker_actual_runs_v1
 where status='FAILED' and started_at>clock_timestamp()-interval '24 hours';
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SIGNED_WORKER_ACTUAL_RUN_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'latest_run_id',r.run_id,
  'latest_worker_status',coalesce(r.status,'NO_SIGNED_WORKER_RUN_OBSERVED'),
  'latest_worker_stage',r.worker_stage,
  'last_actual_worker_started_at',r.started_at,
  'last_actual_worker_finished_at',r.finished_at,
  'last_completed_worker_run_at',last_success,
  'last_scheduler_sql_dispatch_at',last_dispatch,
  'last_scheduler_sql_check_at',last_check,
  'latest_scheduler_sql_dispatch_result',coalesce(last_result,'NO_SCHEDULER_SQL_CHECK'),
  'actual_http_delivery_independently_verified',false,
  'scheduler_success_alone_proves_execution',false,
  'recent_signed_worker_failures',recent_failed,
  'actual_worker_process_attested',r.run_id is not null,
  'original_job_completed_by_read',false,'repair_executed_by_read',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

