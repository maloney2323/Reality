-- A successful cron SQL statement proves dispatch, not receipt or execution.
-- The EXISTING authenticated worker emits its own lifecycle attestations.
-- This is telemetry, not a new scheduler, original job, or repair warrant.
create table if not exists reality_internal.signed_worker_actual_runs_v1(
 run_id uuid primary key,
 started_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 status text not null check(status in ('STARTED','COMPLETED','FAILED')),
 worker_stage text not null check(worker_stage ~ '^[A-Z][A-Z0-9_]{5,70}$'),
 check((status='STARTED' and finished_at is null) or
   (status in ('COMPLETED','FAILED') and finished_at is not null))
);
alter table reality_internal.signed_worker_actual_runs_v1 enable row level security;
revoke all on reality_internal.signed_worker_actual_runs_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.signed_worker_actual_runs_v1 to service_role;
create index if not exists signed_worker_actual_runs_recency_v1
 on reality_internal.signed_worker_actual_runs_v1(started_at desc);

create or replace function public.reality_record_signed_worker_actual_run_v1(
 p_run_id uuid,p_status text,p_stage text)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare r reality_internal.signed_worker_actual_runs_v1%rowtype;
begin
 if current_user<>'service_role' or p_run_id is null or
   p_status not in ('STARTED','COMPLETED','FAILED') or
   p_stage !~ '^[A-Z][A-Z0-9_]{5,70}$'
 then raise exception 'SIGNED_WORKER_RUN_ATTESTATION_SERVICE_REQUIRED';end if;
 if p_status='STARTED' then
  insert into reality_internal.signed_worker_actual_runs_v1(
   run_id,status,worker_stage)
  values(p_run_id,'STARTED',p_stage)
  on conflict do nothing returning * into r;
 else
  update reality_internal.signed_worker_actual_runs_v1
  set status=p_status,worker_stage=p_stage,finished_at=clock_timestamp()
  where run_id=p_run_id and status='STARTED'
  returning * into r;
 end if;
 if not found then raise exception 'SIGNED_WORKER_RUN_DUPLICATE_OR_MISSING';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_WORKER_RUN_'||r.status,'run_id',r.run_id,
  'stage',r.worker_stage,'started_at',r.started_at,
  'finished_at',r.finished_at,'actual_worker_process_seen',true,
  'original_job_completed',false,'repair_executed',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_signed_worker_actual_runs_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare r reality_internal.signed_worker_actual_runs_v1%rowtype;
 last_success timestamptz;last_dispatch timestamptz;recent_failed integer;
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
  and d.status='succeeded' and d.start_time>clock_timestamp()-interval '48 hours';
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
  'scheduler_success_alone_proves_execution',false,
  'recent_signed_worker_failures',recent_failed,
  'actual_worker_process_attested',r.run_id is not null,
  'original_job_completed_by_read',false,'repair_executed_by_read',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

revoke execute on function public.reality_record_signed_worker_actual_run_v1(uuid,text,text)
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_signed_worker_actual_runs_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_record_signed_worker_actual_run_v1(uuid,text,text)
 to service_role;
grant execute on function public.reality_read_owner_signed_worker_actual_runs_v1(uuid)
 to service_role;
