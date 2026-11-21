-- Source-neutral exact-business-effect authority PREFLIGHT on the EXISTING
-- canonical original, owner/shift warrant, Continuity route, Universe
-- acceptance event and independently checked installed adapter manifest.
-- No new original history/shift/approval/executor/side effect is created.
create or replace function public.reality_read_owner_exact_business_effect_preflight_v1(
 p_owner_id uuid,p_original_work_id text,p_job_class text,p_effect_type text
) returns jsonb
language plpgsql
set search_path to ''
as $function$
declare
 v record;
 v_adapter record;
 v_now timestamptz:=clock_timestamp();
 v_source_current boolean:=false;
 v_exact_warrant boolean:=false;
 v_goal_worldline boolean:=false;
 v_provider_verified boolean:=false;
 v_adapter_verified boolean:=false;
 v_terminal boolean:=false;
 v_ready boolean:=false;
 v_next text:='EXACT_SIGNED_CANONICAL_ORIGINAL_REQUIRED';
 v_provider_id text;
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
 then raise exception 'EXACT_BUSINESS_EFFECT_TRUSTED_OWNER_AND_SCOPE_REQUIRED';end if;
 v_consequence:=case when p_effect_type in('INTERNAL_READ','INTERNAL_DRAFT')
  then 'INTERNAL_NO_EXTERNAL_EFFECT' else 'EXTERNAL_CONSEQUENTIAL_ACTION' end;
 select c.owner_id,c.shift_id,c.original_work_id,c.source_ref,
  c.source_event_id,c.source_proof_sha256,c.phase,
  s.status shift_status,s.closed_at,
  w.mode warrant_mode,w.state warrant_state,w.source_scope,
  r.continuity_ref,r.original_work_id routed_original,r.last_checked_at,
  i.last_seen_at,i.terminal_observation,
  u.epistemic_status universe_status,
  u.continuity_root_id,u.worldline_id,u.payload universe_payload
 into v
 from reality_internal.governed_employee_original_claims_v1 c
 join reality_internal.governed_employee_shifts_v1 s
  on s.owner_id=c.owner_id and s.shift_id=c.shift_id
 left join reality_internal.governed_employee_completion_warrants_v1 w
  on w.owner_id=c.owner_id and w.shift_id=c.shift_id
 left join reality_internal.owner_continuity_qualification_routes_v1 r
  on r.owner_id=c.owner_id and r.original_work_id=c.original_work_id
  and r.source_ref=c.source_ref
 left join reality_internal.owner_continuous_qualification_inbox_v1 i
  on i.owner_id=r.owner_id and i.intake_family=r.intake_family
  and i.intake_key=r.intake_key and i.source_ref=c.source_ref
 left join public.universe_events u
  on u.event_id=c.source_event_id
 where c.owner_id=p_owner_id and c.original_work_id=p_original_work_id
 limit 1;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_ORIGINAL_NOT_ADMITTED',
   'owner_id',p_owner_id,'original_work_id',p_original_work_id,
   'job_class',p_job_class,'effect_type',p_effect_type,
   'consequence_class',v_consequence,
   'next_gate','ADMIT_REAL_SOURCE_BACKED_ORIGINAL_WITH_OWNER_GOAL',
   'ready_for_exact_effect_review',false,'read_only',true,
   'execution_authorized',false,'itemized_approval_granted',false,
   'new_shift_started',false,'installation_authorized',false,
   'production_changed',false,'original_job_completed_by_read',false);
 end if;
 v_source_current:=coalesce(v.routed_original=p_original_work_id and
  v.continuity_ref~'^reality:qualification:[a-f0-9]{64}$' and
  v.source_proof_sha256~'^sha256:[a-f0-9]{64}$' and
  v.terminal_observation is false and
  v.last_checked_at>=v_now-interval '30 minutes' and
  v.last_seen_at>=v_now-interval '30 minutes',false);
 v_exact_warrant:=coalesce(v.warrant_state='ACTIVE' and
  v.warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS' and
  v.shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK') and
  v.closed_at is null and
  pg_catalog.jsonb_typeof(v.source_scope)='array' and
  exists(select 1 from pg_catalog.jsonb_array_elements(
   coalesce(v.source_scope,'[]'::jsonb)) a
   where a->>'source_ref'=v.source_ref),false);
 v_goal_worldline:=coalesce(v.universe_status='VERIFIED' and
  v.continuity_root_id is not null and v.worldline_id is not null and
  v.universe_payload->>'principal_id'=p_owner_id::text and
  v.universe_payload->>'original_work_id'=p_original_work_id and
  v.universe_payload->>'acceptance_contract_sha256'
    ~'^sha256:[a-f0-9]{64}
 v_terminal:=exists(
  select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
  where f.owner_id=p_owner_id and f.shift_id=v.shift_id and
   f.original_work_id=p_original_work_id and f.source_ref=v.source_ref and
   f.outcome='SUCCEEDED' and
   f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$');
 v_provider_id:=case when v.source_ref like 'connector:%:%' then
  pg_catalog.split_part(v.source_ref,':',2) else null end;
 v_provider_verified:=exists(
  select 1 from reality_internal.owner_connector_setup_requests_v1 x
  where x.owner_id=p_owner_id and x.provider_id=v_provider_id
  and x.credential_saved is true and x.provider_access_verified is true);
 select a.adapter_id,a.registered_execution_adapter,
  a.independently_verified_acceptance_sha256,a.effect_authority_policy_sha256,
  a.independent_verifier_ref
 into v_adapter
 from reality_internal.business_original_executor_contracts_v1 a
 where a.job_class=p_job_class and a.provider_id=v_provider_id
  and a.enabled is true and
  a.evidence_checked_at>=v_now-interval '30 days'
  and a.independently_verified_acceptance_sha256~'^sha256:[a-f0-9]{64}$'
  and a.effect_authority_policy_sha256~'^sha256:[a-f0-9]{64}$'
  and length(a.independent_verifier_ref)>=8
 order by a.evidence_checked_at desc limit 1;
 v_adapter_verified:=found and v_provider_verified;
 v_ready:=v_source_current and v_exact_warrant and v_goal_worldline
  and v_adapter_verified and not v_terminal;
 v_next:=case
  when v_terminal then 'INDEPENDENT_FINAL_ORIGINAL_ALREADY_PRESENT_NO_REPLAY'
  when not v_source_current then 'CURRENT_SOURCE_PROVENANCE_REQUALIFICATION_REQUIRED'
  when not v_goal_worldline then 'INDEPENDENT_OWNER_GOAL_ACCEPTANCE_WORLDLINE_REQUIRED'
  when not v_exact_warrant then 'EXACT_BUSINESS_ORIGINAL_SHIFT_WARRANT_REQUIRED'
  when not v_provider_verified then 'OWNER_CONSENTED_PROVIDER_CONNECTION_PROOF_REQUIRED'
  when not v_adapter_verified then 'REGISTER_AND_INDEPENDENTLY_VERIFY_EXECUTOR_ADAPTER'
  else 'OWNER_MUST_REVIEW_EXACT_EFFECT_TARGET_PAYLOAD_AND_ONE_USE_AUTHORIZATION'
 end;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT',
  'owner_id',p_owner_id,'shift_id',v.shift_id,
  'original_work_id',p_original_work_id,
  'continuity_ref',v.continuity_ref,'source_ref',v.source_ref,
  'job_class',p_job_class,'effect_type',p_effect_type,
  'consequence_class',v_consequence,
  'canonical_source_current',v_source_current,
  'exact_business_shift_warrant_verified',v_exact_warrant,
  'independent_goal_acceptance_worldline_verified',v_goal_worldline,
  'consented_business_provider_verified',v_provider_verified,
  'registered_executor_independently_verified',v_adapter_verified,
  'registered_executor_adapter',case when v_adapter_verified
   then v_adapter.registered_execution_adapter else null end,
  'independent_verifier_ref',case when v_adapter_verified
   then v_adapter.independent_verifier_ref else null end,
  'independent_final_original_already_present',v_terminal,
  'ready_for_exact_effect_review',v_ready,
  'next_gate',v_next,
  'itemized_approval_granted',false,
  'execution_authorized',false,
  'executor_claimed',false,'read_only',true,
  'original_job_completed_by_read',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 to service_role;
,false);
 v_terminal:=exists(
  select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
  where f.owner_id=p_owner_id and f.shift_id=v.shift_id and
   f.original_work_id=p_original_work_id and f.source_ref=v.source_ref and
   f.outcome='SUCCEEDED' and
   f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$');
 v_provider_id:=case when v.source_ref like 'connector:%:%' then
  pg_catalog.split_part(v.source_ref,':',2) else null end;
 v_provider_verified:=exists(
  select 1 from reality_internal.owner_connector_setup_requests_v1 x
  where x.owner_id=p_owner_id and x.provider_id=v_provider_id
  and x.credential_saved is true and x.provider_access_verified is true);
 select a.adapter_id,a.registered_execution_adapter,
  a.independently_verified_acceptance_sha256,a.effect_authority_policy_sha256,
  a.independent_verifier_ref
 into v_adapter
 from reality_internal.business_original_executor_contracts_v1 a
 where a.job_class=p_job_class and a.provider_id=v_provider_id
  and a.enabled is true and
  a.evidence_checked_at>=v_now-interval '30 days'
  and a.independently_verified_acceptance_sha256~'^sha256:[a-f0-9]{64}$'
  and a.effect_authority_policy_sha256~'^sha256:[a-f0-9]{64}$'
  and length(a.independent_verifier_ref)>=8
 order by a.evidence_checked_at desc limit 1;
 v_adapter_verified:=found and v_provider_verified;
 v_ready:=v_source_current and v_exact_warrant and v_goal_worldline
  and v_adapter_verified and not v_terminal;
 v_next:=case
  when v_terminal then 'INDEPENDENT_FINAL_ORIGINAL_ALREADY_PRESENT_NO_REPLAY'
  when not v_source_current then 'CURRENT_SOURCE_PROVENANCE_REQUALIFICATION_REQUIRED'
  when not v_goal_worldline then 'INDEPENDENT_OWNER_GOAL_ACCEPTANCE_WORLDLINE_REQUIRED'
  when not v_exact_warrant then 'EXACT_BUSINESS_ORIGINAL_SHIFT_WARRANT_REQUIRED'
  when not v_provider_verified then 'OWNER_CONSENTED_PROVIDER_CONNECTION_PROOF_REQUIRED'
  when not v_adapter_verified then 'REGISTER_AND_INDEPENDENTLY_VERIFY_EXECUTOR_ADAPTER'
  else 'OWNER_MUST_REVIEW_EXACT_EFFECT_TARGET_PAYLOAD_AND_ONE_USE_AUTHORIZATION'
 end;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT',
  'owner_id',p_owner_id,'shift_id',v.shift_id,
  'original_work_id',p_original_work_id,
  'continuity_ref',v.continuity_ref,'source_ref',v.source_ref,
  'job_class',p_job_class,'effect_type',p_effect_type,
  'consequence_class',v_consequence,
  'canonical_source_current',v_source_current,
  'exact_business_shift_warrant_verified',v_exact_warrant,
  'independent_goal_acceptance_worldline_verified',v_goal_worldline,
  'consented_business_provider_verified',v_provider_verified,
  'registered_executor_independently_verified',v_adapter_verified,
  'registered_executor_adapter',case when v_adapter_verified
   then v_adapter.registered_execution_adapter else null end,
  'independent_verifier_ref',case when v_adapter_verified
   then v_adapter.independent_verifier_ref else null end,
  'independent_final_original_already_present',v_terminal,
  'ready_for_exact_effect_review',v_ready,
  'next_gate',v_next,
  'itemized_approval_granted',false,
  'execution_authorized',false,
  'executor_claimed',false,'read_only',true,
  'original_job_completed_by_read',false,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_exact_business_effect_preflight_v1(uuid,text,text,text)
 to service_role;
