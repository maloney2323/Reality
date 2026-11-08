-- Private, error-class-only visibility for the same trusted source-step proof.
-- No prompt, API key, provider error body, installation or execution warrant.
-- Safe to install while a shift runs: readback function only, service_role only.
-- Owner-private visibility of service-produced, read-only ONE OpenAI model
-- business-role advisories. Not a new permission, worker, original job or
-- success receipt. The provider answer is an advisory, never verification.
-- DRAFT migration: do not apply to production without exact authorization.
create or replace function public.reality_read_owner_employee_shifts_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'service_role' then raise exception 'SHIFT_SERVICE_ONLY';end if;
 if p_owner_id is null then raise exception 'SHIFT_OWNER_REQUIRED';end if;
 return jsonb_build_object(
  'status','OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
  'shifts',coalesce((
   select jsonb_agg(jsonb_build_object(
    'shift_id',s.shift_id,'status',s.status,
    'plan_fingerprint',s.plan_fingerprint,
    'planned_start_at',s.planned_start_at,
    'planned_end_at',s.planned_end_at,
    'authorized_at',s.authorized_at,'closed_at',s.closed_at,
    'close_report',s.close_report,
    'steps',coalesce((select jsonb_agg(jsonb_build_object(
     'step_index',t.step_index,'stage',t.stage,'state',t.state,
     'source_ref',t.source_ref,'duration_minutes',t.duration_minutes,
     'source_status',t.source_status,'proof_sha256',t.proof_sha256,
     'completed_at',t.completed_at,
     'role_handoff_status',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
       and (t.proof->>'source_url')=t.source_ref
       and (t.proof->'combined_role_handoff'->>'version')=
         'reality-one-openai-coordinated-role-handoff-v1'
       and (t.proof->'combined_role_handoff'->>'shift_id')=t.shift_id::text
       and (t.proof->'combined_role_handoff'->>'step_index')=t.step_index::text
       and (t.proof->'combined_role_handoff'->>'source_ref')=t.source_ref
       and (t.proof->'combined_role_handoff'->>'one_shared_openai_provider')='true'
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
       and (t.proof->'combined_role_handoff'->>'installation_authorized')='false'
       and (t.proof->'combined_role_handoff'->>'independent_verification_performed')='false'
       and t.proof->'combined_role_handoff'->>'status' in (
         'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK',
         'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM')
     then t.proof->'combined_role_handoff'->>'status' else null end,
     'role_handoff_reason',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->>'kind'='GITHUB_SOURCE_READBACK'
       and t.proof->>'source_url'=t.source_ref
       and t.proof->'combined_role_handoff'->>'version'=
         'reality-one-openai-coordinated-role-handoff-v1'
       and t.proof->'combined_role_handoff'->>'shift_id'=t.shift_id::text
       and t.proof->'combined_role_handoff'->>'step_index'=t.step_index::text
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and t.proof->'combined_role_handoff'->>'status'=
         'ROLE_ADVISORY_UNAVAILABLE_NO_COMPLETION_CLAIM'
       and t.proof->'combined_role_handoff'->>'original_job_completed'='false'
       and t.proof->'combined_role_handoff'->>'installation_authorized'='false'
       and t.proof->'combined_role_handoff'->>'independent_verification_performed'='false'
       and t.proof->'combined_role_handoff'->>'reason' in (
         'OPENAI_RESPONSE_UNAVAILABLE','OPENAI_REQUEST_OPTIONS_REJECTED',
         'OPENAI_CREDENTIAL_OR_MODEL_ACCESS_REJECTED',
         'OPENAI_MODEL_OR_ENDPOINT_NOT_FOUND',
         'OPENAI_RATE_OR_QUOTA_LIMIT','OPENAI_PROVIDER_SERVER_FAILURE',
         'OPENAI_REQUEST_OR_TIMEOUT_UNVERIFIED',
         'SHARED_OPENAI_ADAPTER_NOT_CONFIGURED','PROVIDER_SOURCE_NO_LONGER_OPEN',
         'OPENAI_PROVIDER_RESULT_UNVERIFIED','OPENAI_EMPTY_FINAL_ADVISORY')
     then t.proof->'combined_role_handoff'->>'reason' else null end,
     'role_handoff_labels',case when
       t.step_index between 2 and 5
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
       and (t.proof->'combined_role_handoff'->>'installation_authorized')='false'
       and jsonb_typeof(t.proof->'combined_role_handoff'->'roles')='array'
     then t.proof->'combined_role_handoff'->'roles'
     else '[]'::jsonb end,
     'role_handoff_advisory',case when
       t.step_index between 2 and 5
       and t.state='SOURCE_CHECKED'
       and t.proof->'combined_role_handoff'->>'status'=
        'SHARED_OPENAI_ROLE_ADVISORY_RECORDED_NOT_VERIFIED_WORK'
       and t.proof->'combined_role_handoff'->>'source_ref'=t.source_ref
       and (t.proof->'combined_role_handoff'->>'independent_verification_performed')='false'
       and (t.proof->'combined_role_handoff'->>'original_job_completed')='false'
     then left(t.proof->'combined_role_handoff'->>'model_advice',1200)
     else null end) order by t.step_index)
    from reality_internal.governed_employee_shift_steps_v1 t
     where t.shift_id=s.shift_id),'[]'::jsonb)) order by s.created_at desc)
   from (select * from reality_internal.governed_employee_shifts_v1
    where owner_id=p_owner_id order by created_at desc limit 5) s),'[]'::jsonb),
  'work_installation_authorized_by_read',false,
  'verified_human_hours_saved',null,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_employee_shifts_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_employee_shifts_v1(uuid)
 to service_role;
