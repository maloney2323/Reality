-- Preserve useful error codes without leaking arbitrary cron messages.
-- Group repeated failures once by owner+worker+error signature, and fence
-- abandoned model leases instead of silently leaving them "working".
create or replace function reality_internal.observe_owner_worker_cron_failures_v1()
returns text language plpgsql security invoker set search_path to '' as $body$
declare r record;observed integer:=0;fenced integer:=0;
begin
 for r in
  select g.owner_id,j.jobid,
   pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(coalesce(d.return_message,
      'UNKNOWN_CRON_FAILURE'),'UTF8')),'hex') as signature,
   coalesce(
    'ERROR: '||(pg_catalog.regexp_match(
     pg_catalog.split_part(coalesce(d.return_message,''),E'\n',1),
     '^ERROR:[[:space:]]+([A-Z][A-Z0-9_]{3,100})'))[1],
    'UNCLASSIFIED_CRON_WORKER_FAILURE'
   ) as safe_summary,
   min(d.runid) as first_id,max(d.runid) as last_id,
   min(d.start_time) as first_at,max(d.start_time) as last_at,
   count(*)::integer as occurrences
  from cron.job j
   join cron.job_run_details d on d.jobid=j.jobid
   join reality_internal.owner_routine_delegations_v1 g
    on g.activated_at is not null and g.activated_at<=d.start_time
  where j.jobname='reality-riley-preview-original-execution-wake-v1'
   and d.status='failed'
   and d.start_time>clock_timestamp()-interval '24 hours'
  group by g.owner_id,j.jobid,signature,safe_summary
 loop
  insert into reality_internal.owner_worker_recovery_incidents_v1(
   owner_id,cron_jobid,error_fingerprint,error_summary,
   first_failed_runid,last_failed_runid,first_observed_at,last_observed_at,
   occurrence_count)
  values(r.owner_id,r.jobid,r.signature,r.safe_summary,
   r.first_id,r.last_id,r.first_at,r.last_at,r.occurrences)
  on conflict(owner_id,cron_jobid,error_fingerprint) do update
   set first_failed_runid=least(
     reality_internal.owner_worker_recovery_incidents_v1.first_failed_runid,
     excluded.first_failed_runid),
    last_failed_runid=greatest(
     reality_internal.owner_worker_recovery_incidents_v1.last_failed_runid,
     excluded.last_failed_runid),
    first_observed_at=least(
     reality_internal.owner_worker_recovery_incidents_v1.first_observed_at,
     excluded.first_observed_at),
    last_observed_at=greatest(
     reality_internal.owner_worker_recovery_incidents_v1.last_observed_at,
     excluded.last_observed_at),
    occurrence_count=greatest(
     reality_internal.owner_worker_recovery_incidents_v1.occurrence_count,
     excluded.occurrence_count),
    error_summary=excluded.error_summary;
  observed:=observed+1;
 end loop;
 update reality_internal.owner_worker_recovery_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',
  updated_at=clock_timestamp()
 where phase='LEASED_FOR_INVESTIGATION'
  and updated_at<clock_timestamp()-interval '10 minutes';
 get diagnostics fenced=row_count;
 return 'WORKER_FAILURE_GROUPS_RECONCILED_'||observed||
  '_FENCED_UNVERIFIED_LEASES_'||fenced;
end $body$;
