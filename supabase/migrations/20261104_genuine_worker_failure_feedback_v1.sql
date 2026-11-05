-- Reality autonomous worker failure feedback. Observations only, NOT a new agent,
-- worker authority, original job, frozen gap, or repair approval.
-- All evidence is bound to the existing genuine original-work queue and
-- signed Github OIDC workflow through the existing auto-admit broker.
create table if not exists reality_internal.genuine_worker_failure_observations_v1 (
 observation_id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 original_work_id text not null check(original_work_id ~ '^work:[a-f0-9]{32}$'),
 trigger_id uuid not null,
 original_work_event_id uuid not null,
 failed_run_id bigint not null check(failed_run_id>0),
 failed_job_id bigint not null check(failed_job_id>0),
 failed_run_sha text not null check(failed_run_sha ~ '^[a-f0-9]{40}$'),
 verifier_run_id bigint not null check(verifier_run_id>0),
 provider_evidence_sha256 text not null check(provider_evidence_sha256 ~ '^[a-f0-9]{64}$'),
 finding text not null check(finding in (
   'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED',
   'SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS')),
 observed_at timestamptz not null default clock_timestamp(),
 independent_provider_readback_verified boolean not null default true
  check(independent_provider_readback_verified),
 model_findings_are_hypotheses boolean not null default true
  check(model_findings_are_hypotheses),
 original_job_completed boolean not null default false
  check(not original_job_completed),
 installation_authorized boolean not null default false
  check(not installation_authorized),
 production_changed boolean not null default false
  check(not production_changed),
 unique(original_work_id,failed_run_id,failed_job_id)
);
alter table reality_internal.genuine_worker_failure_observations_v1 enable row level security;
revoke all on reality_internal.genuine_worker_failure_observations_v1
 from public,anon,authenticated;
grant select,insert on reality_internal.genuine_worker_failure_observations_v1 to service_role;

-- The same authoritative one-original scope used by the genuine builder.
-- A worker wake with an unverified owner/goal is not a capability-gap warrant.
create or replace function public.reality_read_genuine_worker_failure_scope_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare w record;v_historical integer;v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_FAILURE_READ_SERVICE_ONLY';end if;
 select w.original_work_id,w.owner_id,w.trigger_id,w.worker_run_id,
  w.wake_state,q.original_work_event_id,q.phase,
  q.goal_transition_event_id,q.conversation_id,
  e.payload->>'issue_number' as source_issue_number,
  c.state as continuation_state,a.consumed_at
 into w
 from reality_internal.governed_execution_wake_outbox_v1 w
 join reality_internal.genuine_capability_queue_v1 q
  on q.trigger_id=w.trigger_id and q.owner_id=w.owner_id
    and q.original_work_id=w.original_work_id
    and q.phase='ISOLATED_INSTALLED_PROBATION'
 join reality_internal.genuine_preview_install_approvals_v1 a
  on a.trigger_id=q.trigger_id and a.owner_id=q.owner_id
    and a.original_work_id=q.original_work_id
    and a.consumed_at is not null and a.target_environment='ISOLATED_PREVIEW'
 join reality_internal.genuine_original_continuations_v1 c
  on c.trigger_id=q.trigger_id
   and c.owner_id=q.owner_id and c.original_work_id=q.original_work_id
   and c.approval_id=a.approval_id
   and c.state in ('ACCEPTED_FOR_ISOLATED_RESUMPTION','RESUMPTION_CLAIMED')
 join reality_internal.goal_publication_epochs g
  on g.user_id=q.owner_id and g.conversation_id=q.conversation_id
   and g.last_transition_event_id=q.goal_transition_event_id
 join public.universe_events e on e.event_id=q.original_work_event_id
   and e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'original_work_id'=q.original_work_id
   and e.payload->>'owner_id'=q.owner_id::text
   and e.provenance->>'principal_id'=q.owner_id::text
   and e.payload->>'owner_authorized_investigation'='true'
   and e.payload->>'owner_authorized_installation'='false'
   and e.payload->>'original_job_completed'='false'
   and e.payload->>'production_changed'='false'
 where w.wake_state='ESCALATED' and w.worker_run_id>0
   and w.target_environment='ISOLATED_PREVIEW'
   and not exists (
    select 1 from reality_internal.genuine_independent_final_receipts_v1 r
     where r.owner_id=w.owner_id and r.original_work_id=w.original_work_id)
 order by w.updated_at desc limit 1;
 if not found then
  return jsonb_build_object('status','NO_VERIFIED_ESCALATED_ORIGINAL_WORK',
   'record_allowed',false,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 end if;
 select count(*)::integer into v_historical
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_steps_v1 t on t.shift_id=s.shift_id
 where s.owner_id=w.owner_id and t.step_index in (6,7)
  and t.state='BLOCKED_PROVIDER'
  and t.source_status='VERIFIED_HISTORICAL_NOOP'
  and t.proof->>'kind'='EXISTING_HISTORICAL_UNIVERSE_SATISFIED_NO_REPLAY'
  and t.proof->>'original_work_id'=w.original_work_id
  and t.proof->>'original_queue_trigger_id'=w.trigger_id::text
  and t.proof->>'independent_historical_readback_verified'='true'
  and t.proof->>'current_original_job_completed'='false'
  and t.proof->>'original_job_execution_replayed'='false'
  and t.proof_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(t.proof::text,'UTF8')),'hex');
 return jsonb_build_object(
   'status','ESCALATED_OWNER_ORIGINAL_WORK_VERIFIED',
   'owner_id',w.owner_id,'original_work_id',w.original_work_id,
   'trigger_id',w.trigger_id,'original_work_event_id',w.original_work_event_id,
   'failed_run_id',w.worker_run_id,
   'queue_phase',w.phase,'continuation_state',w.continuation_state,
   'historical_noop_verified',v_historical=2,
   'verification_required_before_model',true,
   'record_allowed',true,'model_invocation_authorized',false,
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
end $fn$;
revoke all on function public.reality_read_genuine_worker_failure_scope_v1()
 from public,anon,authenticated;
grant execute on function public.reality_read_genuine_worker_failure_scope_v1()
 to service_role;

-- The trusted OIDC broker MUST independently GET the corresponding GitHub
-- Actions run and named failure job. This DB action is a receipt, not a retry.
create or replace function public.reality_record_genuine_worker_failure_v1(
 p_verifier_run_id bigint,p_failed_run_id bigint,p_failed_job_id bigint,
 p_failed_run_sha text,p_provider_evidence_sha256 text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare s jsonb;old record;v_finding text;v_id uuid;v_existing boolean:=false;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_FAILURE_RECORD_SERVICE_ONLY';end if;
 if p_verifier_run_id<1 or p_failed_run_id<1 or p_failed_job_id<1 or
   p_verifier_run_id=p_failed_run_id or
   p_failed_run_sha !~ '^[a-f0-9]{40}$' or
   p_provider_evidence_sha256 !~ '^[a-f0-9]{64}$'
 then raise exception 'GENUINE_FAILURE_PROVIDER_PROOF_REQUIRED';end if;
 s:=public.reality_read_genuine_worker_failure_scope_v1();
 if s->>'status'<>'ESCALATED_OWNER_ORIGINAL_WORK_VERIFIED' or
    (s->>'failed_run_id')::bigint is distinct from p_failed_run_id or
    s->>'record_allowed'<>'true' or
    s->>'original_work_id' !~ '^work:[a-f0-9]{32}$'
 then raise exception 'GENUINE_FAILURE_SCOPE_CHANGED';end if;
 v_finding:=case when s->>'historical_noop_verified'='true'
  then 'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED'
  else 'SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS' end;
 select * into old from reality_internal.genuine_worker_failure_observations_v1
 where original_work_id=s->>'original_work_id'
  and failed_run_id=p_failed_run_id and failed_job_id=p_failed_job_id;
 if found then
  if old.owner_id<>(s->>'owner_id')::uuid or
    old.trigger_id<>(s->>'trigger_id')::uuid or
    old.provider_evidence_sha256<>p_provider_evidence_sha256 or
    old.failed_run_sha<>p_failed_run_sha then
   raise exception 'GENUINE_FAILURE_IMMUTABLE_PROVIDER_CONFLICT';end if;
  v_id:=old.observation_id;v_finding:=old.finding;v_existing:=true;
 else
  insert into reality_internal.genuine_worker_failure_observations_v1
   (owner_id,original_work_id,trigger_id,original_work_event_id,
    failed_run_id,failed_job_id,failed_run_sha,verifier_run_id,
    provider_evidence_sha256,finding)
  values ((s->>'owner_id')::uuid,s->>'original_work_id',
    (s->>'trigger_id')::uuid,(s->>'original_work_event_id')::uuid,
    p_failed_run_id,p_failed_job_id,p_failed_run_sha,p_verifier_run_id,
    p_provider_evidence_sha256,v_finding)
  returning observation_id into v_id;
 end if;
 return jsonb_build_object(
  'status','SIGNED_WORKER_FAILURE_RECORDED',
  'observation_id',v_id,'already_recorded',v_existing,
  'original_work_id',s->>'original_work_id','trigger_id',s->>'trigger_id',
  'failed_run_id',p_failed_run_id,'failed_job_id',p_failed_job_id,
  'provider_evidence_sha256',p_provider_evidence_sha256,
  'finding',v_finding,
  'investigation_lifecycle',case when v_finding=
   'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED'
   then 'NO_REPLAY_HISTORICAL_EVIDENCE_PRESERVED'
   else 'INDEPENDENT_GAP_VERIFICATION_REQUIRED' end,
  'governed_intake','EXISTING_GENUINE_CAPABILITY_ENGINE_ONLY',
  'frozen_missing_capability_verified',false,
  'model_generated',false,'new_customer_job_created',false,
  'retry_external_effects_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_record_genuine_worker_failure_v1(
 bigint,bigint,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_genuine_worker_failure_v1(
 bigint,bigint,bigint,text,text) to service_role;