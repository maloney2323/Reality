-- Canonical original-work handoff: fix circular approval -> claim dependency.
-- The existing original claim is a post-authorization execution lease, NOT
-- proof that a job is ready to be presented to the owner for exact approval.
-- Read the existing qualification route and canonical Universe owner-goal
-- admission first. Preserve all original identity and authority boundaries.
alter table reality_internal.business_original_executor_contracts_v1
 add column if not exists supported_effect_types jsonb not null
 default '[]'::jsonb;
alter table reality_internal.business_original_executor_contracts_v1
 drop constraint if exists business_executor_effect_types_contract_v1;
alter table reality_internal.business_original_executor_contracts_v1
 add constraint business_executor_effect_types_contract_v1 check (
  pg_catalog.jsonb_typeof(supported_effect_types)='array'
  and pg_catalog.jsonb_array_length(supported_effect_types)<=6
  and supported_effect_types <@
   '["INTERNAL_READ","INTERNAL_DRAFT","CUSTOMER_SEND",
      "MARKETING_PUBLISH","PROCUREMENT_COMMIT","FINANCIAL_COMMIT"]'::jsonb
 );

create or replace function public.reality_read_owner_exact_business_effect_preflight_v1(
 p_owner_id uuid,p_original_work_id text,p_job_class text,p_effect_type text
) returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
 v_now timestamptz:=clock_timestamp();
 v_route record; v_adapter record; v_shift record;
 v_route_count integer:=0;
 v_source_current boolean:=false;
 v_admitted boolean:=false;
 v_warrant boolean:=false;
 v_provider boolean:=false;
 v_adapter_verified boolean:=false;
 v_final boolean:=false;
 v_ready boolean:=false;
 v_provider_id text;
 v_next text;
 v_consequence text;
begin
 if current_user<>'service_role' or p_owner_id is null or
  p_original_work_id is null or
  p_original_work_id!~'^work:[a-f0-9]{32}$' or
  p_job_class is null or p_job_class!~'^[a-z][a-z0-9_-]{2,90}$' or
  p_effect_type is null or p_effect_type not in (
   'INTERNAL_READ','INTERNAL_DRAFT','CUSTOMER_SEND',
   'MARKETING_PUBLISH','PROCUREMENT_COMMIT','FINANCIAL_COMMIT'
  )
 then
  raise exception 'BUSINESS_EFFECT_OWNER_OR_EXACT_SCOPE_INVALID';
 end if;
 v_consequence:=case when p_effect_type in ('INTERNAL_READ','INTERNAL_DRAFT')
  then 'INTERNAL_NO_EXTERNAL_EFFECT' else 'EXTERNAL_CONSEQUENTIAL_ACTION' end;
 -- Unique source-backed ORIGINAL route required, not an execution claim.
 select count(*)::integer into v_route_count
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=p_owner_id and r.original_work_id=p_original_work_id;
 if v_route_count<>1 then
  return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_ORIGINAL_NOT_ADMITTED',
   'owner_id',p_owner_id,'original_work_id',p_original_work_id,
   'job_class',p_job_class,'effect_type',p_effect_type,
   'consequence_class',v_consequence,
   'next_gate',case when v_route_count=0 then
    'ADMIT_REAL_SOURCE_BACKED_ORIGINAL_WITH_OWNER_GOAL'
    else 'RESOLVE_AMBIGUOUS_ORIGINAL_SOURCE_ROUTES' end,
   'ready_for_exact_effect_review',false,'read_only',true,
   'execution_authorized',false,'itemized_approval_granted',false,
   'execution_claim_created',false,'new_shift_started',false,
   'installation_authorized',false,'production_changed',false,
   'original_job_completed_by_read',false);
 end if;
 select r.owner_id,r.continuity_ref,r.source_ref,
  r.source_epoch_fingerprint,r.last_checked_at,
  i.evidence_fingerprint,i.last_seen_at,i.terminal_observation
 into v_route
 from reality_internal.owner_continuity_qualification_routes_v1 r
 join reality_internal.owner_continuous_qualification_inbox_v1 i
  on i.owner_id=r.owner_id and i.intake_family=r.intake_family
  and i.intake_key=r.intake_key and i.source_ref=r.source_ref
 where r.owner_id=p_owner_id and r.original_work_id=p_original_work_id;
 v_source_current:=coalesce(
  v_route.terminal_observation is false and
  v_route.source_epoch_fingerprint~'^[a-f0-9]{64}$' and
  v_route.evidence_fingerprint=v_route.source_epoch_fingerprint and
  v_route.continuity_ref~'^reality:qualification:[a-f0-9]{64}$' and
  v_route.last_seen_at>=v_now-interval '30 minutes' and
  v_route.last_checked_at>=v_now-interval '30 minutes',false);
 -- Exact canonical business original is proved by independently verified
 -- owner-goal-acceptance Universe lineage, NOT a source observation/model.
 v_admitted:=exists(
  select 1 from public.universe_events u
  where u.epistemic_status='VERIFIED'
   and u.continuity_root_id is not null and u.worldline_id is not null
   and u.payload->>'principal_id'=p_owner_id::text
   and u.payload->>'original_work_id'=p_original_work_id
   and u.payload->>'acceptance_contract_sha256'
      ~'^sha256:[a-f0-9]{64}$'
   and (u.payload->>'source_ref'=v_route.source_ref or
        u.provenance->>'source_ref'=v_route.source_ref)
 );
 select s.shift_id,s.status,s.closed_at,w.mode,w.state,w.source_scope
 into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 left join reality_internal.governed_employee_completion_warrants_v1 w
  on w.owner_id=s.owner_id and w.shift_id=s.shift_id
 where s.owner_id=p_owner_id and s.closed_at is null
  and s.status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=v_now and s.planned_end_at>v_now
 order by s.created_at desc limit 1;
 v_warrant:=coalesce(v_shift.state='ACTIVE'
  and v_shift.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
  and pg_catalog.jsonb_typeof(v_shift.source_scope)='array'
  and exists(select 1
   from pg_catalog.jsonb_array_elements(
     coalesce(v_shift.source_scope,'[]'::jsonb)) scope
   where scope->>'source_ref'=v_route.source_ref),false);
 v_final:=exists(
  select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
  where f.owner_id=p_owner_id and f.original_work_id=p_original_work_id
   and f.shift_id=v_shift.shift_id and f.source_ref=v_route.source_ref
   and f.outcome='SUCCEEDED'
   and f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$');
 v_provider_id:=case when v_route.source_ref like 'connector:%:%'
  then pg_catalog.split_part(v_route.source_ref,':',2)
  else null end;
 v_provider:=exists(
  select 1 from reality_internal.owner_connector_setup_requests_v1 x
  where x.owner_id=p_owner_id and x.provider_id=v_provider_id
   and x.credential_saved is true and x.oauth_consent_granted is true
   and x.provider_access_verified is true
 );
 -- An adapter must specifically attest this consequence's EFFECT TYPE;
 -- job class/provider strings alone are not authorized tool capabilities.
 select a.adapter_id,a.registered_execution_adapter,
  a.independent_verifier_ref,a.effect_authority_policy_sha256,
  a.independently_verified_acceptance_sha256
 into v_adapter
 from reality_internal.business_original_executor_contracts_v1 a
 where a.job_class=p_job_class and a.provider_id=v_provider_id
  and a.enabled is true
  and a.evidence_checked_at>=v_now-interval '30 days'
  and a.supported_effect_types ? p_effect_type
  and a.effect_authority_policy_sha256~'^sha256:[a-f0-9]{64}$'
  and a.independently_verified_acceptance_sha256~'^sha256:[a-f0-9]{64}$'
  and length(a.independent_verifier_ref)>=8
 order by a.evidence_checked_at desc limit 1;
 v_adapter_verified:=found and v_provider;
 v_ready:=v_source_current and v_admitted and v_warrant
  and v_provider and v_adapter_verified and not v_final;
 v_next:=case
  when v_final then 'INDEPENDENT_FINAL_ORIGINAL_ALREADY_PRESENT_NO_REPLAY'
  when not v_source_current then 'CURRENT_SOURCE_PROVENANCE_REQUALIFICATION_REQUIRED'
  when not v_admitted then 'INDEPENDENT_OWNER_GOAL_ACCEPTANCE_WORLDLINE_REQUIRED'
  when not v_warrant then 'EXACT_BUSINESS_ORIGINAL_SHIFT_WARRANT_REQUIRED'
  when not v_provider then 'OWNER_CONSENTED_PROVIDER_CONNECTION_PROOF_REQUIRED'
  when not v_adapter_verified then 'REGISTER_AND_INDEPENDENTLY_VERIFY_EFFECT_SPECIFIC_EXECUTOR'
  else 'OWNER_MUST_REVIEW_EXACT_EFFECT_TARGET_PAYLOAD_AND_ONE_USE_AUTHORIZATION'
 end;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT',
  'owner_id',p_owner_id,'shift_id',v_shift.shift_id,
  'original_work_id',p_original_work_id,
  'source_ref',v_route.source_ref,'continuity_ref',v_route.continuity_ref,
  'job_class',p_job_class,'effect_type',p_effect_type,
  'consequence_class',v_consequence,
  'canonical_original_admission_verified',v_admitted,
  'canonical_source_current',v_source_current,
  'exact_business_shift_warrant_verified',v_warrant,
  'independent_goal_acceptance_worldline_verified',v_admitted,
  'consented_business_provider_verified',v_provider,
  'registered_executor_independently_verified',v_adapter_verified,
  'registered_executor_adapter',case when v_adapter_verified
    then v_adapter.registered_execution_adapter else null end,
  'independent_verifier_ref',case when v_adapter_verified
    then v_adapter.independent_verifier_ref else null end,
  'independent_final_original_already_present',v_final,
  'ready_for_exact_effect_review',v_ready,'next_gate',v_next,
  'owner_review_before_execution_claim',true,
  'execution_claim_created',false,
  'itemized_approval_granted',false,'execution_authorized',false,
  'executor_claimed',false,'read_only',true,
  'original_job_completed_by_read',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 to service_role;