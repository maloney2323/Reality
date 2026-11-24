-- First real business-source PROOF: the existing signed Continuity worker
-- reads an already owner-scoped issue/PR using Reality's EXISTING live GitHub
-- provider reader, then records two matching provider observations. This
-- proves an INTERNAL operational source, not a customer integration or a job.
create table if not exists reality_internal.owner_internal_repo_provider_evidence_v1(
 owner_id uuid not null,
 continuity_ref text not null,
 intake_key text not null,
 source_ref text not null,
 employee text,
 source_title text not null,
 source_updated_at timestamptz not null,
 provider_proof_sha256 text not null,
 signed_worker_run_id uuid not null,
 checked_at timestamptz not null default clock_timestamp(),
 provider_recheck_kind text not null default 'TWO_CURRENT_GITHUB_READBACKS_SAME_SOURCE',
 primary key(owner_id,source_ref,provider_proof_sha256),
 constraint internal_repo_provider_evidence_provenance check (
  continuity_ref~'^reality:qualification:[a-f0-9]{64}$'
  and provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
  and source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
  and length(source_title) between 1 and 500
  and provider_recheck_kind='TWO_CURRENT_GITHUB_READBACKS_SAME_SOURCE'
 )
);
revoke all on reality_internal.owner_internal_repo_provider_evidence_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.owner_internal_repo_provider_evidence_v1
 to service_role;

create or replace function public.reality_read_next_signed_internal_repo_business_source_v1(
 p_worker_run_id uuid,p_repo_full_name text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v record;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_worker_run_id is null
 or p_repo_full_name!~'^[A-Za-z0-9_.-]{1,80}/[A-Za-z0-9_.-]{1,100}$'
 then raise exception 'SIGNED_INTERNAL_PROVIDER_OWNER_REPOSITORY_REQUIRED';end if;
 if not exists (
  select 1 from reality_internal.signed_worker_actual_runs_v1 w
  where w.run_id=p_worker_run_id and w.status='STARTED'
   and w.started_at>v_now-interval '3 minutes')
 then raise exception 'SIGNED_INTERNAL_PROVIDER_LIVE_WORKER_REQUIRED';end if;
 select i.owner_id,i.intake_family,i.intake_key,i.source_ref,i.employee,
  r.continuity_ref,i.evidence_fingerprint,r.route_state,
  i.last_seen_at,r.last_checked_at
 into v
 from reality_internal.owner_continuous_qualification_inbox_v1 i
 join reality_internal.owner_continuity_qualification_routes_v1 r
  on r.owner_id=i.owner_id and r.intake_family=i.intake_family
  and r.intake_key=i.intake_key and r.source_ref=i.source_ref
 join reality_internal.owner_routine_delegations_v1 g
  on g.owner_id=i.owner_id and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
  and g.enabled is true and g.activated_at<=v_now and g.expires_at>v_now
 where i.intake_family='EMPLOYEE_SCHEDULE'
  and not i.terminal_observation and i.source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
  and (i.source_ref like 'https://github.com/'||p_repo_full_name||'/issues/%'
   or i.source_ref like 'https://github.com/'||p_repo_full_name||'/pull/%')
  and i.last_seen_at>v_now-interval '15 minutes'
  and r.last_checked_at>v_now-interval '15 minutes'
  and not exists(
   select 1 from reality_internal.owner_internal_repo_provider_evidence_v1 e
   where e.owner_id=i.owner_id and e.source_ref=i.source_ref
    and e.checked_at>v_now-interval '12 hours')
 order by case when i.source_ref like '%/issues/%' then 0 else 1 end,
  i.last_seen_at desc,i.intake_key
 limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_DUE_SIGNED_INTERNAL_PROVIDER_BUSINESS_SOURCE',
   'source_connected_and_verified',false,
   'customer_connection_verified',false,
   'original_job_admitted',false,'model_execution_authorized',false,
   'owner_approval_granted',false,'new_shift_started',false,
   'installation_authorized',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_OWNER_INTERNAL_PROVIDER_SOURCE_SELECTED',
  'owner_id',v.owner_id,'intake_family',v.intake_family,
  'intake_key',v.intake_key,'source_ref',v.source_ref,
  'employee',v.employee,'continuity_ref',v.continuity_ref,
  'source_evidence_fingerprint',v.evidence_fingerprint,
  'governed_route_state',v.route_state,
  'worker_run_id',p_worker_run_id,
  'provider_recheck_required',true,
  'customer_connection_verified',false,'original_job_admitted',false,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_next_signed_internal_repo_business_source_v1(uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_next_signed_internal_repo_business_source_v1(uuid,text)
 to service_role;

create or replace function public.reality_record_signed_internal_repo_provider_proof_v1(
 p_worker_run_id uuid,p_owner_id uuid,p_intake_key text,
 p_continuity_ref text,p_source_ref text,p_source_title text,
 p_source_updated_at timestamptz,p_first_sha256 text,p_second_sha256 text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v record;v_rows int;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_worker_run_id is null or p_owner_id is null
 or p_first_sha256!~'^sha256:[a-f0-9]{64}$'
 or p_first_sha256 is distinct from p_second_sha256
 or p_continuity_ref!~'^reality:qualification:[a-f0-9]{64}$'
 or p_source_ref!~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'
 or p_source_title is null or length(trim(p_source_title)) not between 1 and 500
 or p_source_updated_at is null or p_source_updated_at>v_now+interval '2 minutes'
 then raise exception 'SIGNED_INTERNAL_PROVIDER_DOUBLE_READBACK_REQUIRED';end if;
 if not exists (
  select 1 from reality_internal.signed_worker_actual_runs_v1 w
  where w.run_id=p_worker_run_id and w.status='STARTED'
   and w.started_at>v_now-interval '3 minutes')
 then raise exception 'SIGNED_INTERNAL_PROVIDER_LIVE_WORKER_REQUIRED';end if;
 select i.owner_id,i.intake_key,i.employee,r.continuity_ref
 into v
 from reality_internal.owner_continuous_qualification_inbox_v1 i
 join reality_internal.owner_continuity_qualification_routes_v1 r
  on r.owner_id=i.owner_id and r.intake_family=i.intake_family
  and r.intake_key=i.intake_key
 join reality_internal.owner_routine_delegations_v1 g
  on g.owner_id=i.owner_id and g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
  and g.enabled and g.expires_at>v_now and g.activated_at<=v_now
 where i.owner_id=p_owner_id and i.intake_family='EMPLOYEE_SCHEDULE'
  and not i.terminal_observation and i.intake_key=p_intake_key
  and i.source_ref=p_source_ref and r.source_ref=p_source_ref
  and r.continuity_ref=p_continuity_ref
  and i.last_seen_at>v_now-interval '15 minutes'
  and r.last_checked_at>v_now-interval '15 minutes';
 if not found then raise exception 'SIGNED_INTERNAL_PROVIDER_SOURCE_EPOCH_CHANGED';end if;
 insert into reality_internal.owner_internal_repo_provider_evidence_v1(
  owner_id,continuity_ref,intake_key,source_ref,employee,
  source_title,source_updated_at,provider_proof_sha256,signed_worker_run_id
 ) values(p_owner_id,p_continuity_ref,p_intake_key,p_source_ref,v.employee,
  p_source_title,p_source_updated_at,p_first_sha256,p_worker_run_id)
 on conflict(owner_id,source_ref,provider_proof_sha256) do nothing;
 select count(*) into v_rows
 from reality_internal.owner_internal_repo_provider_evidence_v1 e
 where e.owner_id=p_owner_id and e.source_ref=p_source_ref
  and e.continuity_ref=p_continuity_ref
  and e.provider_proof_sha256=p_first_sha256
  and e.source_updated_at=p_source_updated_at;
 if v_rows<>1 then raise exception 'SIGNED_INTERNAL_PROVIDER_RECEIPT_READBACK_FAILED';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_INTERNAL_BUSINESS_SOURCE_DOUBLE_PROVIDER_READBACK_RECORDED',
  'owner_id',p_owner_id,'source_ref',p_source_ref,
  'continuity_ref',p_continuity_ref,'provider_proof_sha256',p_first_sha256,
  'internal_source_provider_readback_verified',true,
  'customer_connection_verified',false,'original_job_admitted',false,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_record_signed_internal_repo_provider_proof_v1(
 uuid,uuid,text,text,text,text,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_internal_repo_provider_proof_v1(
 uuid,uuid,text,text,text,text,timestamptz,text,text) to service_role;

create or replace function public.reality_read_owner_internal_repo_provider_proofs_v1(
 p_owner_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v_records jsonb;v_total int;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'OWNER_INTERNAL_PROVIDER_SOURCE_REVIEW_REQUIRED';end if;
 select count(*)::int into v_total
 from reality_internal.owner_internal_repo_provider_evidence_v1 e
 where e.owner_id=p_owner_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'source_ref',x.source_ref,'source_title',x.source_title,
  'employee',x.employee,'continuity_ref',x.continuity_ref,
  'provider_proof_sha256',x.provider_proof_sha256,
  'provider_updated_at',x.source_updated_at,'checked_at',x.checked_at,
  'provider_readback_current',x.checked_at>clock_timestamp()-interval '30 minutes',
  'provider_double_readback_proven',true,
  'customer_job_completed',false,'execution_authorized',false)
  order by x.checked_at desc),'[]'::jsonb)
 into v_records
 from (select * from reality_internal.owner_internal_repo_provider_evidence_v1
   where owner_id=p_owner_id order by checked_at desc limit 8) x;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_INTERNAL_BUSINESS_SOURCE_PROVIDER_PROOFS',
  'owner_id',p_owner_id,'provider_source_proof_count',v_total,
  'sources',v_records,'read_only',true,
  'internal_company_provider_only',true,'customer_source_connection_verified',false,
  'original_customer_job_completed',false,'owner_approval_granted',false,
  'model_execution_authorized',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_internal_repo_provider_proofs_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_internal_repo_provider_proofs_v1(uuid)
 to service_role;
