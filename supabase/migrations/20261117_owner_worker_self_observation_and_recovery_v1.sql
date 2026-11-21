-- Reality self-observation: piggyback the already-running watchdog cron.
-- A failed scheduled worker is evidence-backed operational work, never an
-- installation warrant, an original customer job, or final repair proof.
create table if not exists reality_internal.owner_worker_recovery_incidents_v1(
 incident_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 cron_jobid bigint not null,
 error_fingerprint text not null check(error_fingerprint~'^[a-f0-9]{64}$'),
 error_summary text not null,
 first_failed_runid bigint not null,
 last_failed_runid bigint not null,
 first_observed_at timestamptz not null,
 last_observed_at timestamptz not null,
 occurrence_count integer not null default 1,
 phase text not null default 'DETECTED'
  check(phase in ('DETECTED','LEASED_FOR_INVESTIGATION',
    'EMPLOYEE_INVESTIGATION_SCHEDULED','BLOCKED_NEEDS_EVIDENCE')),
 assigned_employee text,
 assigned_function_id text,
 independent_reviewer text,
 reviewer_function_id text,
 investigation_scope text,
 independent_test_requirement text,
 evidence_limitations text,
 provisional_minutes_low integer,
 provisional_minutes_high integer,
 model_response_id text,
 assigned_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,cron_jobid,error_fingerprint)
);
alter table reality_internal.owner_worker_recovery_incidents_v1 enable row level security;
revoke all on reality_internal.owner_worker_recovery_incidents_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_worker_recovery_incidents_v1 to service_role;

create or replace function reality_internal.observe_owner_worker_cron_failures_v1()
returns text language plpgsql security invoker set search_path to '' as $body$
declare r record;g record; signatures_count integer:=0;changed integer;
begin
 -- A watchdog observes failures EVEN WHEN the broken worker cannot wake.
 -- Protected owner feeds are deliberately not called here.
 for r in
  select j.jobid,d.runid,d.start_time,
   pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    coalesce(d.return_message,'UNKNOWN_CRON_FAILURE'),'UTF8')),'hex') as sig,
   left(pg_catalog.regexp_replace(
    pg_catalog.split_part(coalesce(d.return_message,'NO_ERROR_DETAIL'),E'\n',1),
    '[A-Za-z0-9_-]{28,}','[redacted]','g'),220) as message
  from cron.job j join cron.job_run_details d on d.jobid=j.jobid
  where j.jobname='reality-riley-preview-original-execution-wake-v1'
   and d.status='failed' and d.start_time>clock_timestamp()-interval '24 hours'
  order by d.runid desc limit 80
 loop
  for g in select owner_id,activated_at from
   reality_internal.owner_routine_delegations_v1
   where activated_at is not null and activated_at<=r.start_time
  loop
   insert into reality_internal.owner_worker_recovery_incidents_v1(
    owner_id,cron_jobid,error_fingerprint,error_summary,
    first_failed_runid,last_failed_runid,first_observed_at,last_observed_at)
   values(g.owner_id,r.jobid,r.sig,r.message,r.runid,r.runid,
    r.start_time,r.start_time)
   on conflict(owner_id,cron_jobid,error_fingerprint) do update
    set occurrence_count=case when excluded.last_failed_runid>
       reality_internal.owner_worker_recovery_incidents_v1.last_failed_runid
      then reality_internal.owner_worker_recovery_incidents_v1.occurrence_count+1
      else reality_internal.owner_worker_recovery_incidents_v1.occurrence_count end,
     last_failed_runid=greatest(
       reality_internal.owner_worker_recovery_incidents_v1.last_failed_runid,
       excluded.last_failed_runid),
     last_observed_at=greatest(
       reality_internal.owner_worker_recovery_incidents_v1.last_observed_at,
       excluded.last_observed_at),
     updated_at=case when excluded.last_failed_runid>
       reality_internal.owner_worker_recovery_incidents_v1.last_failed_runid
       then clock_timestamp()
       else reality_internal.owner_worker_recovery_incidents_v1.updated_at end;
   signatures_count:=signatures_count+1;
  end loop;
 end loop;
 return 'WORKER_INCIDENT_SOURCE_OBSERVATIONS_RECONCILED_'||signatures_count;
end $body$;

-- No client may create/overwrite an incident. The existing active owner grant
-- permits only an evidence-and-plan model investigation within its daily cap.
create or replace function public.reality_claim_next_standing_worker_recovery_v1()
returns jsonb language plpgsql security invoker set search_path to '' as $body$
declare g reality_internal.owner_routine_delegations_v1%rowtype;
 i reality_internal.owner_worker_recovery_incidents_v1%rowtype;
begin
 if current_user<>'service_role'
 then raise exception 'WORKER_RECOVERY_CLAIM_SERVICE_ONLY';end if;
 for g in select * from reality_internal.owner_routine_delegations_v1
  where enabled=true and expires_at>clock_timestamp()
   and scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and (case when daily_date=current_date
      then daily_reserved else 0 end)<max_daily_inquiries
  order by last_reserved_at nulls first,updated_at
  for update skip locked
 loop
  select * into i from reality_internal.owner_worker_recovery_incidents_v1
   where owner_id=g.owner_id and phase='DETECTED'
   order by last_observed_at desc,incident_id
   for update skip locked limit 1;
  if not found then continue;end if;
  update reality_internal.owner_worker_recovery_incidents_v1
   set phase='LEASED_FOR_INVESTIGATION',updated_at=clock_timestamp()
   where incident_id=i.incident_id;
  update reality_internal.owner_routine_delegations_v1
   set daily_date=current_date,daily_reserved=
    case when daily_date=current_date then daily_reserved+1 else 1 end,
    last_reserved_at=clock_timestamp(),updated_at=clock_timestamp()
   where owner_id=g.owner_id;
  return pg_catalog.jsonb_build_object(
   'status','STANDING_OWNER_WORKER_INCIDENT_CLAIMED',
   'owner_id',g.owner_id,'claim_id',i.incident_id,
   'capability_key','incident:'||i.error_fingerprint,
   'evidence_fingerprint',i.error_fingerprint,
   'source_title','Investigate Reality scheduled worker failure',
   'source_last_seen_at',i.last_observed_at,
   'source_observation',pg_catalog.jsonb_build_object(
    'key','incident:'||i.error_fingerprint,
    'title','Investigate Reality scheduled worker failure',
    'kind','WORKER_EXECUTION_FAILURE',
    'evidence_summary',i.error_summary,
    'cron_jobid',i.cron_jobid,
    'failed_run_count',i.occurrence_count,
    'last_failed_runid',i.last_failed_runid,
    'last_observed_at',i.last_observed_at,
    'verified_missing_capability',false,
    'executable_job',false,
    'installation_authorized',false),
   'scope',g.scope,'model_triage_authorized',true,
   'execution_authorized',false,'new_original_jobs_created',0,
   'installation_authorized',false,'production_changed',false);
 end loop;
 return pg_catalog.jsonb_build_object(
  'status','NO_STANDING_WORKER_INCIDENT',
  'model_triage_authorized',false,
  'new_original_jobs_created',0,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $body$;

create or replace function public.reality_record_owner_worker_recovery_plan_v1(
 p_owner_id uuid,p_claim_id uuid,p_evidence_fingerprint text,
 p_function_id text,p_employee text,p_reviewer_function_id text,p_reviewer text,
 p_rationale text,p_scope text,p_test_requirement text,p_limitations text,
 p_estimate_low integer,p_estimate_high integer,p_model_response_id text)
returns jsonb language plpgsql security invoker set search_path to '' as $body$
declare i reality_internal.owner_worker_recovery_incidents_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null or
   p_claim_id is null or
   p_evidence_fingerprint!~'^[a-f0-9]{64}$'
 then raise exception 'WORKER_RECOVERY_RECORD_SERVICE_OWNER_REQUIRED';end if;
 if p_function_id!~'^[a-z][a-z0-9_]{2,95}$' or
   p_reviewer_function_id!~'^[a-z][a-z0-9_]{2,95}$' or
   p_function_id=p_reviewer_function_id or
   length(trim(coalesce(p_employee,''))) not between 2 and 100 or
   length(trim(coalesce(p_reviewer,''))) not between 2 and 100 or
   p_employee=p_reviewer or
   length(trim(coalesce(p_rationale,''))) not between 20 and 1000 or
   length(trim(coalesce(p_scope,''))) not between 20 and 1500 or
   length(trim(coalesce(p_test_requirement,''))) not between 20 and 1600 or
   length(trim(coalesce(p_limitations,''))) not between 15 and 1200 or
   p_estimate_low not between 15 and 1440 or
   p_estimate_high not between 15 and 2880 or
   p_estimate_low>p_estimate_high or
   p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'WORKER_RECOVERY_MODEL_PLAN_INVALID';end if;
 if not exists(select 1 from reality_internal.owner_routine_delegations_v1
    where owner_id=p_owner_id and enabled=true
     and expires_at>clock_timestamp()
     and scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1')
 then raise exception 'WORKER_RECOVERY_OWNER_GRANT_EXPIRED';end if;
 update reality_internal.owner_worker_recovery_incidents_v1
 set phase='EMPLOYEE_INVESTIGATION_SCHEDULED',
  assigned_function_id=p_function_id,assigned_employee=p_employee,
  reviewer_function_id=p_reviewer_function_id,
  independent_reviewer=p_reviewer,
  investigation_scope=trim(p_scope),
  independent_test_requirement=trim(p_test_requirement),
  evidence_limitations=trim(p_limitations),
  provisional_minutes_low=p_estimate_low,
  provisional_minutes_high=p_estimate_high,
  model_response_id=p_model_response_id,
  assigned_at=clock_timestamp(),updated_at=clock_timestamp()
 where owner_id=p_owner_id and incident_id=p_claim_id
  and error_fingerprint=p_evidence_fingerprint
  and phase='LEASED_FOR_INVESTIGATION'
 returning * into i;
 if not found then raise exception 'WORKER_RECOVERY_CLAIM_STALE_OR_REPLAYED';end if;
 return pg_catalog.jsonb_build_object(
  'status','EMPLOYEE_CAPABILITY_INVESTIGATION_SCHEDULED',
  'owner_id',i.owner_id,'claim_id',i.incident_id,
  'capability_key','incident:'||i.error_fingerprint,
  'evidence_fingerprint',i.error_fingerprint,
  'assigned_employee',i.assigned_employee,
  'assigned_function_id',i.assigned_function_id,
  'independent_reviewer',i.independent_reviewer,
  'reviewer_function_id',i.reviewer_function_id,
  'planned_inquiry_at',i.assigned_at,
  'estimate_minutes_low',i.provisional_minutes_low,
  'estimate_minutes_high',i.provisional_minutes_high,
  'estimated_only_not_measured',true,
  'independent_current_gap_proven',false,
  'existing_governed_worker_required',true,
  'execution_authorized',false,'new_original_jobs_created',0,
  'installation_authorized',false,'production_changed',false);
end $body$;

create or replace function public.reality_block_owner_worker_recovery_plan_v1(
 p_owner_id uuid,p_claim_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $body$
begin
 if current_user<>'service_role' or p_owner_id is null or p_claim_id is null
 then raise exception 'WORKER_RECOVERY_BLOCK_OWNER_REQUIRED';end if;
 update reality_internal.owner_worker_recovery_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',updated_at=clock_timestamp()
 where owner_id=p_owner_id and incident_id=p_claim_id
  and phase='LEASED_FOR_INVESTIGATION';
 return pg_catalog.jsonb_build_object(
  'status','WORKER_RECOVERY_INCIDENT_FENCED_NO_REPLAY',
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $body$;

create or replace function public.reality_read_owner_worker_recovery_status_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $body$
declare v reality_internal.owner_routine_delegations_v1%rowtype;
 latest cron.job_run_details%rowtype;
 incidents jsonb;
 success_at timestamptz;
 planned integer;
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
   and d.status='succeeded' and d.start_time>clock_timestamp()-interval '48 hours';
 select count(*) into planned from reality_internal.owner_capability_employee_schedule_v1
  where owner_id=p_owner_id and
   phase='INQUIRY_SCHEDULED_REQUIRES_INDEPENDENT_GAP_PROOF';
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'phase',i.phase,
  'error_summary',i.error_summary,
  'failure_count',i.occurrence_count,'first_observed_at',i.first_observed_at,
  'last_observed_at',i.last_observed_at,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'investigation_scope',i.investigation_scope,
  'independent_test_requirement',i.independent_test_requirement,
  'estimated_minutes_low',i.provisional_minutes_low,
  'estimated_minutes_high',i.provisional_minutes_high,
  'scheduler_dispatched_after_failure',success_at>i.last_observed_at,
  'independently_verified_repaired',false
 ) order by i.last_observed_at desc),'[]'::jsonb)
 into incidents from (select * from
  reality_internal.owner_worker_recovery_incidents_v1
  where owner_id=p_owner_id order by last_observed_at desc limit 8) i;
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
  'incidents',incidents,
  'incident_count',pg_catalog.jsonb_array_length(incidents),
  'next_action',case
   when coalesce(v.enabled,false)=false then
    'Standing research is paused. Existing shifts retain their permissions.'
   when latest.status='failed' then
    'Reality detected a scheduler failure. Independent investigation and a governed repair are required; do not infer worker execution.'
   when planned>0 then
    'Reality has scheduled employee investigations. Independent current-gap verification is next; no repairs are authorized by scheduling.'
   else
    'Standing permission is active. The scheduler has dispatched, but an independently verified employee investigation receipt is still required.'
   end,
  'execution_authorized_by_read',false,'installation_authorized',false,
  'production_changed',false
 );
end $body$;

revoke all on function public.reality_claim_next_standing_worker_recovery_v1() from public,anon,authenticated;
revoke all on function public.reality_record_owner_worker_recovery_plan_v1(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) from public,anon,authenticated;
revoke all on function public.reality_block_owner_worker_recovery_plan_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_read_owner_worker_recovery_status_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_next_standing_worker_recovery_v1() to service_role;
grant execute on function public.reality_record_owner_worker_recovery_plan_v1(uuid,uuid,text,text,text,text,text,text,text,text,text,integer,integer,text) to service_role;
grant execute on function public.reality_block_owner_worker_recovery_plan_v1(uuid,uuid) to service_role;
grant execute on function public.reality_read_owner_worker_recovery_status_v1(uuid) to service_role;

-- Connect the existing one-minute watchdog to Reality's durable incident
-- intake without changing its primary purpose or adding a scheduler.
do $watchdog$
declare v_id bigint;v_command text;v_new text;
begin
 select jobid,command into strict v_id,v_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
  and active=true and schedule='* * * * *'
  and command like '%watch_governed_wake_outbox_v1%';
 if position('observe_owner_worker_cron_failures_v1' in v_command)>0 then return;end if;
 v_new:=v_command||E'\nSELECT reality_internal.observe_owner_worker_cron_failures_v1();';
 perform cron.alter_job(v_id,command=>v_new);
end $watchdog$;
