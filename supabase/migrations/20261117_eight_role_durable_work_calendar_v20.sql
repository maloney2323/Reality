-- v20: evidence-bound, durable eight-role operating schedule, continuously
-- reconciled from existing discovery, independent evidence and maintenance.
-- Scheduled investigation != new original job, shift, installed code or ROI.
create table if not exists reality_internal.owner_employee_operating_schedule_v1 (
 owner_id uuid not null,
 work_key text not null check(work_key~'^schedule:[a-f0-9]{64}$'),
 employee text not null check(employee in(
  'Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')),
 work_kind text not null check(work_kind in('SOURCE_INVESTIGATION','INTERNAL_MAINTENANCE')),
 source_ref text not null check(length(source_ref) between 10 and 1024),
 source_family text not null check(length(source_family) between 5 and 60),
 title text not null check(length(title) between 1 and 240),
 source_evidence_sha256 text not null check(source_evidence_sha256~'^sha256:[a-f0-9]{64}$'),
 source_observed_at timestamptz not null,
 prior_shift_id uuid,
 incident_id uuid,
 evidence_job_id uuid,
 previous_independent_evidence_receipt_sha256 text
  check(previous_independent_evidence_receipt_sha256 is null or
        previous_independent_evidence_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 work_state text not null check(work_state in(
  'CURRENT_SOURCE_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED',
  'SOURCE_EPOCH_REVIEW_REQUIRED','SOURCE_NO_LONGER_CURRENT',
  'SOURCE_SETTLED_NO_REPLAY','EVIDENCE_REVIEW_VERIFIED',
  'MAINTENANCE_AWAITING_SIGNED_SHIFT','MAINTENANCE_IN_SIGNED_SHIFT',
  'MAINTENANCE_VERIFIED')),
 priority smallint not null check(priority between 0 and 9),
 planned_business_date date,
 daily_order smallint check(daily_order between 1 and 4),
 independently_verified_current_evidence boolean not null default false,
 owner_shift_authorized_by_schedule boolean not null default false
  check(owner_shift_authorized_by_schedule=false),
 original_customer_job_created boolean not null default false
  check(original_customer_job_created=false),
 installation_authorized boolean not null default false
  check(installation_authorized=false),
 production_changed boolean not null default false
  check(production_changed=false),
 first_recorded_at timestamptz not null default clock_timestamp(),
 last_reconciled_at timestamptz not null default clock_timestamp(),
 primary key (owner_id,work_key),
 check ((planned_business_date is null)=(daily_order is null)),
 check (work_kind<>'INTERNAL_MAINTENANCE' or incident_id is not null)
);
create index if not exists owner_employee_operating_schedule_scope_v1
 on reality_internal.owner_employee_operating_schedule_v1
 (owner_id,employee,planned_business_date,work_state);
alter table reality_internal.owner_employee_operating_schedule_v1 enable row level security;
revoke all on reality_internal.owner_employee_operating_schedule_v1
 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_employee_operating_schedule_v1
 to service_role;

create or replace function public.reality_refresh_employee_operating_schedule_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_now timestamptz:=clock_timestamp();
 v_added int:=0;v_owners int:=0;
begin
 if current_user not in ('service_role','postgres') then
  raise exception 'EMPLOYEE_SCHEDULE_SIGNED_SERVICE_ONLY';end if;
 -- This is no new permission. Only the owner's existing unexpired standing
 -- EVIDENCE_ONLY delegation may allow unattended investigation planning.
 with eligible_owners as (
  select g.owner_id from reality_internal.owner_routine_delegations_v1 g
  where g.enabled=true and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.expires_at>v_now and g.activated_at<=v_now
   and exists(select 1 from reality_internal.employee_discovery_role_coverage_v1 c
    where c.owner_id=g.owner_id and c.checked_at>v_now-interval '48 hours'
    group by c.owner_id having count(distinct c.employee)=8)
 ),
 current_sources as (
  select o.owner_id,o.employee,o.source_ref,o.source_family,o.title,
   o.evidence_sha256 as source_sha,o.source_observed_at,
   'SOURCE_INVESTIGATION'::text as kind,null::uuid as origin_shift,
   null::uuid as incident_id,j.job_id as evidence_job,
   case when j.phase='COMPLETED_INDEPENDENTLY_VERIFIED'
     then j.independent_receipt_sha256 else null end as previous_receipt,
   case
    when o.disposition='SETTLED_NO_REPLAY' then 'SOURCE_SETTLED_NO_REPLAY'
    -- A discovery evidence SHA is a scan-level digest for PR lens sources,
    -- NOT the GitHub provider epoch. Compare the independently observed
    -- original updated_at and first/reviewer provider SHA before replaying.
    when j.phase='COMPLETED_INDEPENDENTLY_VERIFIED'
      and j.independent_receipt_sha256~'^sha256:[a-f0-9]{64}
    when o.disposition='SOURCE_NO_LONGER_CURRENT'
      then 'SOURCE_NO_LONGER_CURRENT'
    when j.phase in('COMPLETED_INDEPENDENTLY_VERIFIED','BLOCKED_SOURCE_CHANGED')
      then 'SOURCE_EPOCH_REVIEW_REQUIRED'
    when o.disposition='HISTORICAL_REVALIDATION_REQUIRED'
      then 'HISTORICAL_REVALIDATION_REQUIRED'
    else 'CURRENT_SOURCE_REVIEW_REQUIRED'
   end::text as state,
   o.source_identity as identity
  from reality_internal.employee_discovery_observations_v1 o
  join eligible_owners g on g.owner_id=o.owner_id
  left join lateral (
   select j.job_id,j.phase,j.discovery_evidence_sha256,
    j.independent_receipt_sha256,j.first_source_updated_at,
    j.first_source_checked_at,j.first_source_proof_sha256,
    j.reviewed_source_sha256,j.verified_at
   from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
   where j.owner_id=o.owner_id and j.employee=o.employee
    and j.source_ref=o.source_ref
   order by j.qualified_at desc,j.job_id limit 1
  ) j on true
  where o.installation_authorized=false
   and o.shift_authorized=false and o.qualified_job_created=false
   and o.production_changed=false
 ),
 current_repairs as (
  select m.owner_id,m.assignee as employee,m.source_ref,
   'INTERNAL_MAINTENANCE'::text as source_family,
   left('Internal repair · '||replace(m.maintenance_kind,'_',' '),240) as title,
   m.independent_review_receipt_sha256 as source_sha,
   m.created_at as source_observed_at,
   'INTERNAL_MAINTENANCE'::text as kind,
   m.origin_shift_id as origin_shift,m.incident_id,
   null::uuid as evidence_job,
   m.repaired_capability_receipt_sha256 as previous_receipt,
   case
    when m.phase='INTERNAL_REPAIR_VERIFIED_CLOSED' and
      m.repaired_capability_receipt_sha256~'^sha256:[a-f0-9]{64}$'
      then 'MAINTENANCE_VERIFIED'
    when exists(
      select 1 from reality_internal.governed_employee_completion_warrants_v1 w
      join reality_internal.governed_employee_shifts_v1 s
       on s.shift_id=w.shift_id and s.owner_id=w.owner_id
      cross join lateral jsonb_array_elements(w.source_scope) scope
      where w.owner_id=m.owner_id and w.state='ACTIVE'
       and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
       and s.closed_at is null and s.planned_end_at>v_now
       and scope->>'maintenance_id'=m.incident_id::text)
      then 'MAINTENANCE_IN_SIGNED_SHIFT'
    else 'MAINTENANCE_AWAITING_SIGNED_SHIFT'
   end::text as state,
   m.incident_id::text as identity
  from reality_internal.owner_internal_maintenance_jobs_v1 m
  join eligible_owners g on g.owner_id=m.owner_id
  where m.original_job_completed=false and m.production_changed=false
   and m.installation_authorized_by_discovery=false
   and m.external_action_authorized_by_discovery=false
   and m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 ),
 combined as (
  select * from current_sources
  union all select * from current_repairs
 ),
 prioritized as (
  select c.*,
   case c.state
    when 'MAINTENANCE_IN_SIGNED_SHIFT' then 0
    when 'MAINTENANCE_AWAITING_SIGNED_SHIFT' then 1
    when 'SOURCE_EPOCH_REVIEW_REQUIRED' then 2
    when 'SOURCE_NO_LONGER_CURRENT' then 3
    when 'CURRENT_SOURCE_REVIEW_REQUIRED' then 4
    when 'HISTORICAL_REVALIDATION_REQUIRED' then 5
    else 9 end::smallint as priority,
   c.state not in('EVIDENCE_REVIEW_VERIFIED',
      'SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED') as due,
   row_number() over(partition by c.owner_id,c.employee
    order by case when c.state in('EVIDENCE_REVIEW_VERIFIED',
      'SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED') then 1 else 0 end,
     case when c.kind='INTERNAL_MAINTENANCE' then 0 else 1 end,
     case c.state
      when 'SOURCE_EPOCH_REVIEW_REQUIRED' then 0
      when 'SOURCE_NO_LONGER_CURRENT' then 1 else 2 end,
     c.source_observed_at desc,c.source_ref,c.identity) as role_sequence
  from combined c
 ),
 dated as (
  select p.*,
   case when p.due then (
    select days.day from (
     select gs::date as day,row_number() over(order by gs) as ord
     from pg_catalog.generate_series(
      (v_now at time zone 'America/New_York')::date::timestamp,
      (v_now at time zone 'America/New_York')::date::timestamp+
        interval '60 days',interval '1 day') gs
     where extract(isodow from gs) between 1 and 5
    ) days
    where days.ord=((p.role_sequence-1)/4)+1
    limit 1
   ) else null::date end as business_date
  from prioritized p
 ),
 saved as (
  insert into reality_internal.owner_employee_operating_schedule_v1
   (owner_id,work_key,employee,work_kind,source_ref,source_family,title,
    source_evidence_sha256,source_observed_at,prior_shift_id,incident_id,
    evidence_job_id,previous_independent_evidence_receipt_sha256,
    work_state,priority,planned_business_date,daily_order,
    independently_verified_current_evidence,last_reconciled_at)
  select d.owner_id,
   'schedule:'||encode(sha256(convert_to(d.owner_id::text||'|'||
    d.kind||'|'||d.employee||'|'||d.identity,'UTF8')),'hex'),
   d.employee,d.kind,d.source_ref,d.source_family,d.title,d.source_sha,
   d.source_observed_at,d.origin_shift,d.incident_id,d.evidence_job,
   d.previous_receipt,d.state,d.priority,d.business_date,
   case when d.business_date is not null
    then ((d.role_sequence-1)%4+1)::smallint else null::smallint end,
   d.state='EVIDENCE_REVIEW_VERIFIED',v_now
  from dated d
  on conflict(owner_id,work_key) do update set
    source_ref=excluded.source_ref,source_family=excluded.source_family,
    title=excluded.title,source_evidence_sha256=excluded.source_evidence_sha256,
    source_observed_at=excluded.source_observed_at,
    prior_shift_id=excluded.prior_shift_id,incident_id=excluded.incident_id,
    evidence_job_id=excluded.evidence_job_id,
    previous_independent_evidence_receipt_sha256=
     excluded.previous_independent_evidence_receipt_sha256,
    work_state=excluded.work_state,priority=excluded.priority,
    planned_business_date=excluded.planned_business_date,
    daily_order=excluded.daily_order,
    independently_verified_current_evidence=
     excluded.independently_verified_current_evidence,
    last_reconciled_at=excluded.last_reconciled_at
  returning owner_id,work_kind,work_state
 )
 select count(*),count(distinct owner_id) into v_added,v_owners from saved;
 return jsonb_build_object(
  'status','EIGHT_ROLE_OWNER_WORK_CALENDAR_DURABLY_RECONCILED',
  'owner_count',v_owners,'source_and_maintenance_assignments',v_added,
  'calendar_source','EXISTING_DISCOVERY_AND_INDEPENDENT_JOB_RECEIPTS',
  'reconcile_frequency','EVERY_15_MINUTES_EXISTING_SOURCE_REFRESH_EVERY_6_HOURS',
  'planned_days_not_verified_work_hours',true,
  'read_only_source_investigation_scope',true,
  'scheduled_executable_original_jobs',0,
  'new_original_customer_jobs_created',0,'shift_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_employee_operating_schedule_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_ownerscope boolean;v_rows jsonb;v_role jsonb;
 v_count int;v_pending int;v_verified int;v_repairs int;v_latest timestamptz;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'EMPLOYEE_CALENDAR_OWNER_SERVICE_REQUIRED';end if;
 select exists(select 1 from reality_internal.owner_routine_delegations_v1 g
   where g.owner_id=p_owner_id and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
    and g.enabled=true and g.expires_at>clock_timestamp())
 into v_ownerscope;
 select count(*),count(*) filter(where planned_business_date is not null),
  count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED'),
  count(*) filter(where work_kind='INTERNAL_MAINTENANCE' and
    work_state<>'MAINTENANCE_VERIFIED'),
  max(last_reconciled_at)
 into v_count,v_pending,v_verified,v_repairs,v_latest
 from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=p_owner_id and last_reconciled_at>clock_timestamp()-interval '48 hours';
 select coalesce(jsonb_agg(jsonb_build_object(
  'work_key',work_key,'employee',employee,'work_kind',work_kind,
  'source_ref',source_ref,'source_family',source_family,'title',title,
  'work_state',work_state,'source_evidence_sha256',source_evidence_sha256,
  'previous_independent_evidence_receipt_sha256',
   previous_independent_evidence_receipt_sha256,
  'independently_verified_current_evidence',independently_verified_current_evidence,
  'incident_id',incident_id,'origin_shift_id',prior_shift_id,
  'planned_business_date',planned_business_date,'daily_order',daily_order,
  'source_observed_at',source_observed_at)
  order by employee,planned_business_date nulls last,daily_order nulls last,
    priority,work_key),'[]'::jsonb)
 into v_rows
 from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=p_owner_id and last_reconciled_at>clock_timestamp()-interval '48 hours';
 select coalesce(jsonb_agg(jsonb_build_object('employee',e.employee,
  'work_records',coalesce(x.total,0),
  'planned_source_reviews',coalesce(x.planned,0),
  'current_evidence_verified',coalesce(x.verified,0),
  'unfinished_internal_repairs',coalesce(x.repairs,0)
 ) order by e.ordinal),'[]'::jsonb) into v_role
 from (values(1,'Avery'),(2,'Riley'),(3,'Quinn'),(4,'Taylor'),
  (5,'Casey'),(6,'Morgan'),(7,'Jordan'),(8,'Sage')) e(ordinal,employee)
 left join lateral(
  select count(*) total,count(*) filter(where planned_business_date is not null) planned,
   count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED') verified,
   count(*) filter(where work_kind='INTERNAL_MAINTENANCE' and
    work_state<>'MAINTENANCE_VERIFIED') repairs
  from reality_internal.owner_employee_operating_schedule_v1 s
  where s.owner_id=p_owner_id and s.employee=e.employee
   and s.last_reconciled_at>clock_timestamp()-interval '48 hours'
 ) x on true;
 return jsonb_build_object(
  'status',case when v_latest>clock_timestamp()-interval '30 minutes'
    then 'OWNER_EIGHT_ROLE_WORK_CALENDAR_CURRENT'
    else 'OWNER_EIGHT_ROLE_WORK_CALENDAR_STALE' end,
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'standing_evidence_discovery_grant_currently_active',v_ownerscope,
  'role_count',8,'roles',v_role,
  'work_records',coalesce(v_count,0),
  'planned_investigations',coalesce(v_pending,0),
  'independently_verified_current_evidence_reviews',coalesce(v_verified,0),
  'unfinished_internal_repairs',coalesce(v_repairs,0),
  'items',v_rows,'reconciled_at',v_latest,
  'planned_dates_are_not_exec_authority',true,
  'scheduled_executable_original_jobs',0,
  'new_original_customer_jobs_created',0,
  'shift_authorized_by_read',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_refresh_employee_operating_schedule_v1()
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_employee_operating_schedule_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_refresh_employee_operating_schedule_v1()
 to service_role;
grant execute on function public.reality_read_owner_employee_operating_schedule_v1(uuid)
 to service_role;
-- A lightweight reconciler for the real persisted discovery and maintenance
-- ledgers. The existing six-hour source scanner and signed shift worker remain
-- the only source/provider workers; no additional LLM or installation trigger.
do $cron$
begin
 if not exists(select 1 from cron.job where jobname=
   'reality-employee-operating-schedule-reconciliation-v1') then
  perform cron.schedule(
   'reality-employee-operating-schedule-reconciliation-v1',
   '*/15 * * * *',
   'select public.reality_refresh_employee_operating_schedule_v1();');
 end if;
end $cron$;

      and j.first_source_proof_sha256=j.reviewed_source_sha256
      and (
       j.discovery_evidence_sha256=o.evidence_sha256
       or (o.source_family='GITHUB_PULL_REQUEST'
        and j.first_source_updated_at=o.source_observed_at
        and j.verified_at>=j.first_source_checked_at)
      )
      then 'EVIDENCE_REVIEW_VERIFIED'
    when o.disposition='SOURCE_NO_LONGER_CURRENT'
      then 'SOURCE_NO_LONGER_CURRENT'
    when j.phase in('COMPLETED_INDEPENDENTLY_VERIFIED','BLOCKED_SOURCE_CHANGED')
      then 'SOURCE_EPOCH_REVIEW_REQUIRED'
    when o.disposition='HISTORICAL_REVALIDATION_REQUIRED'
      then 'HISTORICAL_REVALIDATION_REQUIRED'
    else 'CURRENT_SOURCE_REVIEW_REQUIRED'
   end::text as state,
   o.source_identity as identity
  from reality_internal.employee_discovery_observations_v1 o
  join eligible_owners g on g.owner_id=o.owner_id
  left join lateral (
   select j.job_id,j.phase,j.discovery_evidence_sha256,
    j.independent_receipt_sha256
   from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
   where j.owner_id=o.owner_id and j.employee=o.employee
    and j.source_ref=o.source_ref
   order by j.qualified_at desc,j.job_id limit 1
  ) j on true
  where o.installation_authorized=false
   and o.shift_authorized=false and o.qualified_job_created=false
   and o.production_changed=false
 ),
 current_repairs as (
  select m.owner_id,m.assignee as employee,m.source_ref,
   'INTERNAL_MAINTENANCE'::text as source_family,
   left('Internal repair · '||replace(m.maintenance_kind,'_',' '),240) as title,
   m.independent_review_receipt_sha256 as source_sha,
   m.created_at as source_observed_at,
   'INTERNAL_MAINTENANCE'::text as kind,
   m.origin_shift_id as origin_shift,m.incident_id,
   null::uuid as evidence_job,
   m.repaired_capability_receipt_sha256 as previous_receipt,
   case
    when m.phase='INTERNAL_REPAIR_VERIFIED_CLOSED' and
      m.repaired_capability_receipt_sha256~'^sha256:[a-f0-9]{64}$'
      then 'MAINTENANCE_VERIFIED'
    when exists(
      select 1 from reality_internal.governed_employee_completion_warrants_v1 w
      join reality_internal.governed_employee_shifts_v1 s
       on s.shift_id=w.shift_id and s.owner_id=w.owner_id
      cross join lateral jsonb_array_elements(w.source_scope) scope
      where w.owner_id=m.owner_id and w.state='ACTIVE'
       and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
       and s.closed_at is null and s.planned_end_at>v_now
       and scope->>'maintenance_id'=m.incident_id::text)
      then 'MAINTENANCE_IN_SIGNED_SHIFT'
    else 'MAINTENANCE_AWAITING_SIGNED_SHIFT'
   end::text as state,
   m.incident_id::text as identity
  from reality_internal.owner_internal_maintenance_jobs_v1 m
  join eligible_owners g on g.owner_id=m.owner_id
  where m.original_job_completed=false and m.production_changed=false
   and m.installation_authorized_by_discovery=false
   and m.external_action_authorized_by_discovery=false
   and m.independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 ),
 combined as (
  select * from current_sources
  union all select * from current_repairs
 ),
 prioritized as (
  select c.*,
   case c.state
    when 'MAINTENANCE_IN_SIGNED_SHIFT' then 0
    when 'MAINTENANCE_AWAITING_SIGNED_SHIFT' then 1
    when 'SOURCE_EPOCH_REVIEW_REQUIRED' then 2
    when 'SOURCE_NO_LONGER_CURRENT' then 3
    when 'CURRENT_SOURCE_REVIEW_REQUIRED' then 4
    when 'HISTORICAL_REVALIDATION_REQUIRED' then 5
    else 9 end::smallint as priority,
   c.state not in('EVIDENCE_REVIEW_VERIFIED',
      'SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED') as due,
   row_number() over(partition by c.owner_id,c.employee
    order by case when c.state in('EVIDENCE_REVIEW_VERIFIED',
      'SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED') then 1 else 0 end,
     case when c.kind='INTERNAL_MAINTENANCE' then 0 else 1 end,
     case c.state
      when 'SOURCE_EPOCH_REVIEW_REQUIRED' then 0
      when 'SOURCE_NO_LONGER_CURRENT' then 1 else 2 end,
     c.source_observed_at desc,c.source_ref,c.identity) as role_sequence
  from combined c
 ),
 dated as (
  select p.*,
   case when p.due then (
    select days.day from (
     select gs::date as day,row_number() over(order by gs) as ord
     from pg_catalog.generate_series(
      (v_now at time zone 'America/New_York')::date::timestamp,
      (v_now at time zone 'America/New_York')::date::timestamp+
        interval '60 days',interval '1 day') gs
     where extract(isodow from gs) between 1 and 5
    ) days
    where days.ord=((p.role_sequence-1)/4)+1
    limit 1
   ) else null::date end as business_date
  from prioritized p
 ),
 saved as (
  insert into reality_internal.owner_employee_operating_schedule_v1
   (owner_id,work_key,employee,work_kind,source_ref,source_family,title,
    source_evidence_sha256,source_observed_at,prior_shift_id,incident_id,
    evidence_job_id,previous_independent_evidence_receipt_sha256,
    work_state,priority,planned_business_date,daily_order,
    independently_verified_current_evidence,last_reconciled_at)
  select d.owner_id,
   'schedule:'||encode(sha256(convert_to(d.owner_id::text||'|'||
    d.kind||'|'||d.employee||'|'||d.identity,'UTF8')),'hex'),
   d.employee,d.kind,d.source_ref,d.source_family,d.title,d.source_sha,
   d.source_observed_at,d.origin_shift,d.incident_id,d.evidence_job,
   d.previous_receipt,d.state,d.priority,d.business_date,
   case when d.business_date is not null
    then ((d.role_sequence-1)%4+1)::smallint else null::smallint end,
   d.state='EVIDENCE_REVIEW_VERIFIED',v_now
  from dated d
  on conflict(owner_id,work_key) do update set
    source_ref=excluded.source_ref,source_family=excluded.source_family,
    title=excluded.title,source_evidence_sha256=excluded.source_evidence_sha256,
    source_observed_at=excluded.source_observed_at,
    prior_shift_id=excluded.prior_shift_id,incident_id=excluded.incident_id,
    evidence_job_id=excluded.evidence_job_id,
    previous_independent_evidence_receipt_sha256=
     excluded.previous_independent_evidence_receipt_sha256,
    work_state=excluded.work_state,priority=excluded.priority,
    planned_business_date=excluded.planned_business_date,
    daily_order=excluded.daily_order,
    independently_verified_current_evidence=
     excluded.independently_verified_current_evidence,
    last_reconciled_at=excluded.last_reconciled_at
  returning owner_id,work_kind,work_state
 )
 select count(*),count(distinct owner_id) into v_added,v_owners from saved;
 return jsonb_build_object(
  'status','EIGHT_ROLE_OWNER_WORK_CALENDAR_DURABLY_RECONCILED',
  'owner_count',v_owners,'source_and_maintenance_assignments',v_added,
  'calendar_source','EXISTING_DISCOVERY_AND_INDEPENDENT_JOB_RECEIPTS',
  'reconcile_frequency','EVERY_15_MINUTES_EXISTING_SOURCE_REFRESH_EVERY_6_HOURS',
  'planned_days_not_verified_work_hours',true,
  'read_only_source_investigation_scope',true,
  'scheduled_executable_original_jobs',0,
  'new_original_customer_jobs_created',0,'shift_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_employee_operating_schedule_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v_ownerscope boolean;v_rows jsonb;v_role jsonb;
 v_count int;v_pending int;v_verified int;v_repairs int;v_latest timestamptz;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'EMPLOYEE_CALENDAR_OWNER_SERVICE_REQUIRED';end if;
 select exists(select 1 from reality_internal.owner_routine_delegations_v1 g
   where g.owner_id=p_owner_id and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
    and g.enabled=true and g.expires_at>clock_timestamp())
 into v_ownerscope;
 select count(*),count(*) filter(where planned_business_date is not null),
  count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED'),
  count(*) filter(where work_kind='INTERNAL_MAINTENANCE' and
    work_state<>'MAINTENANCE_VERIFIED'),
  max(last_reconciled_at)
 into v_count,v_pending,v_verified,v_repairs,v_latest
 from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=p_owner_id and last_reconciled_at>clock_timestamp()-interval '48 hours';
 select coalesce(jsonb_agg(jsonb_build_object(
  'work_key',work_key,'employee',employee,'work_kind',work_kind,
  'source_ref',source_ref,'source_family',source_family,'title',title,
  'work_state',work_state,'source_evidence_sha256',source_evidence_sha256,
  'previous_independent_evidence_receipt_sha256',
   previous_independent_evidence_receipt_sha256,
  'independently_verified_current_evidence',independently_verified_current_evidence,
  'incident_id',incident_id,'origin_shift_id',prior_shift_id,
  'planned_business_date',planned_business_date,'daily_order',daily_order,
  'source_observed_at',source_observed_at)
  order by employee,planned_business_date nulls last,daily_order nulls last,
    priority,work_key),'[]'::jsonb)
 into v_rows
 from reality_internal.owner_employee_operating_schedule_v1
 where owner_id=p_owner_id and last_reconciled_at>clock_timestamp()-interval '48 hours';
 select coalesce(jsonb_agg(jsonb_build_object('employee',e.employee,
  'work_records',coalesce(x.total,0),
  'planned_source_reviews',coalesce(x.planned,0),
  'current_evidence_verified',coalesce(x.verified,0),
  'unfinished_internal_repairs',coalesce(x.repairs,0)
 ) order by e.ordinal),'[]'::jsonb) into v_role
 from (values(1,'Avery'),(2,'Riley'),(3,'Quinn'),(4,'Taylor'),
  (5,'Casey'),(6,'Morgan'),(7,'Jordan'),(8,'Sage')) e(ordinal,employee)
 left join lateral(
  select count(*) total,count(*) filter(where planned_business_date is not null) planned,
   count(*) filter(where work_state='EVIDENCE_REVIEW_VERIFIED') verified,
   count(*) filter(where work_kind='INTERNAL_MAINTENANCE' and
    work_state<>'MAINTENANCE_VERIFIED') repairs
  from reality_internal.owner_employee_operating_schedule_v1 s
  where s.owner_id=p_owner_id and s.employee=e.employee
   and s.last_reconciled_at>clock_timestamp()-interval '48 hours'
 ) x on true;
 return jsonb_build_object(
  'status',case when v_latest>clock_timestamp()-interval '30 minutes'
    then 'OWNER_EIGHT_ROLE_WORK_CALENDAR_CURRENT'
    else 'OWNER_EIGHT_ROLE_WORK_CALENDAR_STALE' end,
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'standing_evidence_discovery_grant_currently_active',v_ownerscope,
  'role_count',8,'roles',v_role,
  'work_records',coalesce(v_count,0),
  'planned_investigations',coalesce(v_pending,0),
  'independently_verified_current_evidence_reviews',coalesce(v_verified,0),
  'unfinished_internal_repairs',coalesce(v_repairs,0),
  'items',v_rows,'reconciled_at',v_latest,
  'planned_dates_are_not_exec_authority',true,
  'scheduled_executable_original_jobs',0,
  'new_original_customer_jobs_created',0,
  'shift_authorized_by_read',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke execute on function public.reality_refresh_employee_operating_schedule_v1()
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_employee_operating_schedule_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_refresh_employee_operating_schedule_v1()
 to service_role;
grant execute on function public.reality_read_owner_employee_operating_schedule_v1(uuid)
 to service_role;
-- A lightweight reconciler for the real persisted discovery and maintenance
-- ledgers. The existing six-hour source scanner and signed shift worker remain
-- the only source/provider workers; no additional LLM or installation trigger.
do $cron$
begin
 if not exists(select 1 from cron.job where jobname=
   'reality-employee-operating-schedule-reconciliation-v1') then
  perform cron.schedule(
   'reality-employee-operating-schedule-reconciliation-v1',
   '*/15 * * * *',
   'select public.reality_refresh_employee_operating_schedule_v1();');
 end if;
end $cron$;
