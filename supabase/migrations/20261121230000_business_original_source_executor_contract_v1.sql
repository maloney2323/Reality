-- Shared admission contract for actual business originals. This is NOT an
-- executor, not a duplicate job queue, and not an authorization by inventory.
-- A registered executor manifest must point to independently proven installed
-- behavior. No manifests are seeded just to make a demo appear ready.
create table if not exists reality_internal.business_original_executor_contracts_v1(
 adapter_id text primary key,
 job_class text not null,
 provider_id text not null,
 registered_execution_adapter text not null,
 effect_authority_policy_sha256 text not null,
 independently_verified_acceptance_sha256 text not null,
 independent_verifier_ref text not null,
 evidence_checked_at timestamptz not null,
 enabled boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 constraint business_original_executor_manifest_shape check(
  adapter_id~'^[a-z][a-z0-9_-]{2,90}$' and
  job_class~'^[a-z][a-z0-9_-]{2,90}$' and
  provider_id~'^[a-z][a-z0-9-]{1,70}$' and
  registered_execution_adapter~'^reality_[a-z0-9_]+_v[0-9]+$' and
  effect_authority_policy_sha256~'^sha256:[a-f0-9]{64}$' and
  independently_verified_acceptance_sha256~'^sha256:[a-f0-9]{64}$' and
  length(independent_verifier_ref) between 8 and 500)
);
create index if not exists business_original_adapter_class_provider_v1
 on reality_internal.business_original_executor_contracts_v1(job_class,provider_id)
 where enabled;
revoke all on reality_internal.business_original_executor_contracts_v1 from public,anon,authenticated;
grant select on reality_internal.business_original_executor_contracts_v1 to service_role;
-- No INSERT, UPDATE or DELETE through app/service-role APIs: only independently
-- reviewed infrastructure migrations can register installed, tested adapters.

create or replace function public.reality_read_owner_business_original_source_executor_contract_v1(
 p_owner_id uuid,p_job_classes jsonb
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v_total int;v_verified int;v_assignments int;v_adapters int;
 v_contracts jsonb;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_owner_id is null or
  pg_catalog.jsonb_typeof(p_job_classes)<>'array' or
  pg_catalog.jsonb_array_length(p_job_classes) not between 2 and 12 or
  pg_catalog.length(p_job_classes::text)>1200 or
  exists(select 1 from pg_catalog.jsonb_array_elements(p_job_classes) x
   where pg_catalog.jsonb_typeof(x.value)<>'string' or
    (x.value#>>'{}')!~'^[a-z][a-z0-9_-]{2,90}$') or
  (select count(distinct x.value#>>'{}') from
   pg_catalog.jsonb_array_elements(p_job_classes) x)
    <>pg_catalog.jsonb_array_length(p_job_classes)
 then raise exception 'BUSINESS_ORIGINAL_EXACT_OWNER_JOB_CLASS_SCOPE_REQUIRED'; end if;

 select count(*)::int,
   count(*) filter(where r.provider_access_verified is true and
    r.credential_saved is true)::int
 into v_total,v_verified
 from reality_internal.owner_connector_setup_requests_v1 r
 where r.owner_id=p_owner_id;
 select count(*)::int into v_assignments
 from reality_internal.approved_chat_employee_assignments_v1 a
 where a.owner_id=p_owner_id and a.approval_status='APPROVED' and
  a.execution_authorized is false;
 select count(*)::int into v_adapters
 from reality_internal.business_original_executor_contracts_v1 a
 where a.enabled is true and a.evidence_checked_at>v_now-interval '30 days';

 with classes as(
  select x.value#>>'{}' as job_class,x.ordinality as rank
  from pg_catalog.jsonb_array_elements(p_job_classes) with ordinality x(value,ordinality)
 ),
 provable as(
  select c.job_class,c.rank,
    count(distinct e.adapter_id)::int installed_adapters,
    count(distinct cs.provider_id)::int access_verified_source_adapters,
    count(distinct i.source_ref) filter(where
      i.source_ref is not null and i.last_seen_at>v_now-interval '30 minutes'
      and r.last_checked_at>v_now-interval '30 minutes'
      and j.job_id is not null)::int independently_reviewed_current_sources
  from classes c
  left join reality_internal.business_original_executor_contracts_v1 e
   on e.job_class=c.job_class and e.enabled and
    e.evidence_checked_at>v_now-interval '30 days'
  left join reality_internal.owner_connector_setup_requests_v1 cs
   on cs.owner_id=p_owner_id and cs.provider_id=e.provider_id and
    cs.provider_access_verified is true and cs.credential_saved is true
  left join reality_internal.owner_continuous_qualification_inbox_v1 i
   on i.owner_id=p_owner_id and cs.provider_id is not null and
    i.source_ref like 'connector:'||cs.provider_id||':%' and
    not i.terminal_observation
  left join reality_internal.owner_continuity_qualification_routes_v1 r
   on r.owner_id=i.owner_id and r.intake_family=i.intake_family and
    r.intake_key=i.intake_key
  left join lateral (
   select j.job_id from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
   where j.owner_id=i.owner_id and j.source_ref=i.source_ref and
    j.phase='COMPLETED_INDEPENDENTLY_VERIFIED' and
    j.independent_receipt_sha256~'^sha256:[a-f0-9]{64}$' and
    j.original_customer_job_completed is false
   order by j.verified_at desc nulls last limit 1
  ) j on true
  group by c.job_class,c.rank
 )
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'job_class',z.job_class,'installed_verified_executor_adapters',z.installed_adapters,
   'provider_source_connections_verified',z.access_verified_source_adapters,
   'current_independently_reviewed_source_observations',
     z.independently_reviewed_current_sources,
   'verified_business_original_admissions',0,
   'itemized_authorization_ready',false,
   'execution_authorized',false,'customer_work_completed',false,
   'next_verified_evidence',case
     when z.installed_adapters=0 then 'INSTALL_AND_INDEPENDENTLY_VERIFY_EXACT_BUSINESS_EXECUTOR'
     when z.access_verified_source_adapters=0 then 'VERIFY_OWNER_CONSENTED_BUSINESS_SOURCE_CONNECTION'
     when z.independently_reviewed_current_sources=0 then 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_OBLIGATION'
     else 'BIND_EXACT_SIGNED_OWNER_GOAL_ACCEPTANCE_AND_ORIGINAL_ADMISSION'
    end
  ) order by z.rank),'[]'::jsonb) into v_contracts
 from provable z;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_BUSINESS_ORIGINAL_SOURCE_EXECUTOR_CONTRACT_READ_ONLY',
  'owner_id',p_owner_id,'requested_job_class_count',
    pg_catalog.jsonb_array_length(p_job_classes),
  'provider_setup_requests',v_total,
  'verified_owner_provider_source_connections',v_verified,
  'independently_verified_installed_business_executor_manifests',v_adapters,
  'owner_approved_employee_task_lists_not_execution_permissions',v_assignments,
  'itemized_originals_ready_for_exact_approval',0,
  'itemized_originals_ready_for_execution',0,
  'classes',v_contracts,
  'next_admission_gate',
   'PROVE_OWNER_SOURCE_GOAL_ACCEPTANCE_EXECUTOR_AND_ITEMIZED_AUTHORITY',
  'read_only',true,'source_observation_is_not_an_original',true,
  'approved_employee_list_is_not_an_execution_warrant',true,
  'current_maintenance_shift_scope_cannot_be_EXPANDED_BY_READ',true,
  'owner_approval_granted',false,'model_execution_authorized',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_business_original_source_executor_contract_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_read_owner_business_original_source_executor_contract_v1(uuid,jsonb)
 to service_role;
