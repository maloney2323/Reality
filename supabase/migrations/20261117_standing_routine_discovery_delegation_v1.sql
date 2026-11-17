-- Reality standing routine delegation, scoped to evidence-only source inquiry.
-- Explicitly enabled by an authenticated owner; never inferred from a model,
-- a discovered capability, a shift history or a user-facing page read.
create table if not exists reality_internal.owner_routine_delegations_v1(
 owner_id uuid primary key,
 enabled boolean not null default false,
 scope text not null default 'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
  check(scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'),
 activated_at timestamptz,
 expires_at timestamptz,
 max_daily_inquiries integer not null default 12
  check(max_daily_inquiries between 1 and 12),
 daily_date date,
 daily_reserved integer not null default 0
  check(daily_reserved between 0 and 12),
 last_reserved_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 check(not enabled or (activated_at is not null and expires_at is not null))
);
create table if not exists reality_internal.owner_routine_delegation_events_v1(
 event_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 enabled boolean not null,
 scope text not null,
 recorded_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.owner_routine_delegations_v1 enable row level security;
alter table reality_internal.owner_routine_delegation_events_v1 enable row level security;
revoke all on reality_internal.owner_routine_delegations_v1 from public,anon,authenticated;
revoke all on reality_internal.owner_routine_delegation_events_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_routine_delegations_v1 to service_role;
grant select,insert on reality_internal.owner_routine_delegation_events_v1 to service_role;

create or replace function public.reality_set_owner_routine_delegation_v1(
 p_owner_id uuid,p_enabled boolean)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_routine_delegations_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null or p_enabled is null
 then raise exception 'STANDING_DELEGATION_SERVICE_OWNER_AND_EXPLICIT_CONSENT_REQUIRED';end if;
 -- A grant always requires fresh explicit owner interaction; readback or
 -- worker wake cannot silently prolong or expand its scope.
 insert into reality_internal.owner_routine_delegations_v1(
  owner_id,enabled,activated_at,expires_at,updated_at)
 values(p_owner_id,p_enabled,
  case when p_enabled then clock_timestamp() else null end,
  case when p_enabled then clock_timestamp()+interval '30 days' else null end,
  clock_timestamp())
 on conflict(owner_id) do update set
  enabled=excluded.enabled,activated_at=excluded.activated_at,
  expires_at=excluded.expires_at,updated_at=excluded.updated_at
 returning * into v;
 insert into reality_internal.owner_routine_delegation_events_v1(
  owner_id,enabled,scope) values(p_owner_id,p_enabled,v.scope);
 return jsonb_build_object(
  'status',case when p_enabled then 'ROUTINE_DISCOVERY_STANDING_GRANT_ACTIVE'
   else 'ROUTINE_DISCOVERY_STANDING_GRANT_PAUSED' end,
  'owner_id',v.owner_id,'scope',v.scope,
  'enabled',v.enabled,'expires_at',v.expires_at,
  'max_daily_inquiries',v.max_daily_inquiries,
  'today_reserved',case when v.daily_date=current_date then v.daily_reserved else 0 end,
  'source_research_delegated',v.enabled,
  'model_investigation_delegated',v.enabled,
  'internal_write_scope','ONLY_INQUIRY_LEDGER',
  'shift_execution_authorized',false,'original_job_admission_authorized',false,
  'external_actions_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;

create or replace function public.reality_read_owner_routine_delegation_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_routine_delegations_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'STANDING_DELEGATION_READ_OWNER_REQUIRED';end if;
 select * into v from reality_internal.owner_routine_delegations_v1
  where owner_id=p_owner_id;
 return jsonb_build_object(
  'status','OWNER_STANDING_ROUTINE_DELEGATION_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,
  'scope','EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1',
  'enabled',coalesce(v.enabled,false),
  'currently_active',coalesce(v.enabled,false) and
    coalesce(v.expires_at,clock_timestamp()-interval '1 minute')>clock_timestamp(),
  'expires_at',v.expires_at,
  'max_daily_inquiries',coalesce(v.max_daily_inquiries,12),
  'today_reserved',case when v.daily_date=current_date then v.daily_reserved else 0 end,
  'external_actions_authorized',false,'installation_authorized',false,
  'shift_execution_authorized',false,'production_changed',false,
  'read_only',true);
end $fn$;

-- Atomic daily work budget. This ONLY selects a source owner with an active
-- owner-created grant; it cannot authorize an original job.
create or replace function public.reality_reserve_next_standing_inquiry_v1()
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare v reality_internal.owner_routine_delegations_v1%rowtype;
begin
 if current_user<>'service_role'
 then raise exception 'STANDING_INQUIRY_WORKER_SERVICE_ONLY';end if;
 select g.* into v
 from reality_internal.owner_routine_delegations_v1 g
 where g.enabled=true and g.expires_at>clock_timestamp()
  and (case when g.daily_date=current_date then g.daily_reserved else 0 end)<g.max_daily_inquiries
  and exists(
   select 1 from reality_internal.employee_discovery_observations_v1 o
    join reality_internal.employee_discovery_role_coverage_v1 c
     on c.owner_id=o.owner_id and c.employee=o.employee
   where o.owner_id=g.owner_id
    and o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
    and o.qualified_job_created=false and o.shift_authorized=false
    and o.installation_authorized=false and o.production_changed=false
    and c.qualified_jobs=0 and c.execution_authorized=false
    and c.checked_at>=clock_timestamp()-interval '12 hours'
    and o.last_reconciled_at>=clock_timestamp()-interval '12 hours'
    and o.source_ref ~ '^https://github.com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
    and not exists(select 1
      from reality_internal.employee_temporal_inquiries_v1 t
      where t.owner_id=o.owner_id and t.employee=o.employee
       and t.source_ref=o.source_ref and t.evidence_sha256=o.evidence_sha256)
  )
 order by g.last_reserved_at nulls first,g.updated_at
 limit 1 for update of g skip locked;
 if not found then return jsonb_build_object(
  'status','NO_ELIGIBLE_GRANTED_STANDING_INQUIRY',
  'owner_bound',false,'model_inquiry_authorized',false,
  'new_original_jobs_created',0,'installation_authorized',false,
  'production_changed',false);end if;
 update reality_internal.owner_routine_delegations_v1
 set daily_reserved=case when daily_date=current_date
   then daily_reserved+1 else 1 end,
  daily_date=current_date,last_reserved_at=clock_timestamp(),
  updated_at=clock_timestamp()
 where owner_id=v.owner_id;
 return jsonb_build_object(
  'status','STANDING_OWNER_EVIDENCE_INQUIRY_RESERVED',
  'owner_id',v.owner_id,'owner_bound',true,
  'scope',v.scope,'max_daily_inquiries',v.max_daily_inquiries,
  'model_inquiry_authorized',true,
  'new_original_jobs_created',0,'shift_execution_authorized',false,
  'external_actions_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke execute on function public.reality_set_owner_routine_delegation_v1(uuid,boolean) from public,anon,authenticated;
revoke execute on function public.reality_read_owner_routine_delegation_v1(uuid) from public,anon,authenticated;
revoke execute on function public.reality_reserve_next_standing_inquiry_v1() from public,anon,authenticated;
grant execute on function public.reality_set_owner_routine_delegation_v1(uuid,boolean) to service_role;
grant execute on function public.reality_read_owner_routine_delegation_v1(uuid) to service_role;
grant execute on function public.reality_reserve_next_standing_inquiry_v1() to service_role;
