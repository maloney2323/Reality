-- Expose independently reconciled operating continuity in the existing
-- owner-scoped Capabilities status, without falsely claiming autonomous repair.
create or replace function public.reality_read_owner_worker_recovery_status_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_routine_delegations_v1%rowtype;
 latest cron.job_run_details%rowtype;
 incidents jsonb;success_at timestamptz;planned integer;
 verified_count integer;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'WORKER_RECOVERY_READ_SERVICE_OWNER_REQUIRED';end if;
 select * into v from reality_internal.owner_routine_delegations_v1
 where owner_id=p_owner_id;
 select d.* into latest from cron.job_run_details d
 join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
 order by d.runid desc limit 1;
 select max(d.start_time) into success_at from cron.job_run_details d
 join cron.job j on j.jobid=d.jobid
 where j.jobname='reality-riley-preview-original-execution-wake-v1'
 and d.status='succeeded'
 and d.start_time>clock_timestamp()-interval '48 hours';
 select count(*) into planned
 from reality_internal.owner_capability_employee_schedule_v1
 where owner_id=p_owner_id
 and phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF';
 select count(*) into verified_count
 from reality_internal.owner_worker_recovery_incidents_v1
 where owner_id=p_owner_id
 and phase='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'
 and continuity_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
 and recovery_attribution='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED';
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,
  'phase',i.phase,'error_summary',i.error_summary,
  'failure_count',i.occurrence_count,
  'first_observed_at',i.first_observed_at,
  'last_observed_at',i.last_observed_at,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'investigation_scope',i.investigation_scope,
  'independent_test_requirement',i.independent_test_requirement,
  'estimated_minutes_low',i.provisional_minutes_low,
  'estimated_minutes_high',i.provisional_minutes_high,
  'scheduler_dispatched_after_failure',
    coalesce(success_at>i.last_observed_at,false),
  'operational_continuity_verified',(
    i.phase='OPERATIONAL_CONTINUITY_VERIFIED_EXTERNAL_FIX'
    and i.continuity_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and i.recovery_attribution='EXTERNALLY_CORRECTED_NOT_SELF_REPAIRED'),
  'operational_recovery_receipt_sha256',i.continuity_receipt_sha256,
  'operational_recovery_verified_at',i.continuity_verified_at,
  'operational_recovery_attribution',i.recovery_attribution,
  'independently_verified_repaired',false,
  'autonomous_self_repair_proven',false
 ) order by i.last_observed_at desc),'[]'::jsonb)
 into incidents
 from (select * from reality_internal.owner_worker_recovery_incidents_v1
  where owner_id=p_owner_id
  order by last_observed_at desc limit 8) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SIGNED_WORKER_RECOVERY_EVIDENCE_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'standing_grant_active',coalesce(v.enabled,false) and
    v.expires_at>clock_timestamp(),
  'last_scheduler_status',coalesce(latest.status,'NO_SCHEDULER_HISTORY'),
  'last_scheduler_check_at',latest.start_time,
  'last_scheduler_failure',case when latest.status='failed' then
    left(pg_catalog.split_part(coalesce(latest.return_message,''),E'\n',1),220)
    else null end,
  'last_scheduler_success_at',success_at,
  'scheduler_dispatch_success_not_worker_proof',true,
  'current_capability_investigations_scheduled',planned,
  'operational_recoveries_verified',verified_count,
  'autonomous_self_repair_proven',false,
  'incidents',incidents,
  'incident_count',pg_catalog.jsonb_array_length(incidents),
  'next_action',case
   when latest.status='failed' then
    'A current scheduler failure was observed. Reality must investigate and independently verify any recovery; no new repair authorization is inferred.'
   when verified_count>0 then
    'Operational continuity was independently verified from post-failure cron checks and signed-worker receipts. The correction was external, not self-repaired. No further repair of that historical failure is needed; future recurrences reopen investigation.'
   when coalesce(v.enabled,false)=false then
    'Standing research is paused. Existing shifts retain their permissions.'
   when planned>0 then
    'Employee investigations are scheduled. Independent current-gap proof is next; a schedule does not authorize installation.'
   else
    'Permission is active. The signed worker must produce independent evidence of investigation or report a blocker.'
   end,
  'execution_authorized_by_read',false,
  'installation_authorized',false,
  'production_changed',false
 );
end $fn$;
revoke execute on function public.reality_read_owner_worker_recovery_status_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_worker_recovery_status_v1(uuid)
 to service_role;
