-- Same-original-job recovery obligation, not a new customer job.
-- An ESCALATED wake is a recoverable investigation checkpoint, not closure.
-- Only the existing signed Genuine Capability broker may call this service
-- role function after independent provider and owner-goal attestation.
create table if not exists reality_internal.genuine_original_recovery_commitments_v1 (
  recovery_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  original_work_id text not null unique
    check (original_work_id ~ '^work:[a-f0-9]{32}$'),
  trigger_id uuid not null,
  original_work_event_id uuid not null,
  latest_observation_id uuid not null
    references reality_internal.genuine_worker_failure_observations_v1(observation_id),
  latest_provider_sha256 text not null
    check (latest_provider_sha256 ~ '^[a-f0-9]{64}$'),
  recovery_status text not null check (recovery_status in (
    'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK',
    'INDEPENDENT_DIAGNOSIS_REQUIRED',
    'FINAL_RECEIPT_VERIFIED')),
  next_evidence_action text not null check (next_evidence_action in (
    'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION',
    'VERIFY_EXTERNAL_EFFECTS_AND_CLASSIFY_FAILURE',
    'NO_FURTHER_EXECUTION_REQUIRED')),
  original_job_settled boolean not null default false,
  last_independent_final_receipt_id uuid null,
  review_count integer not null default 1 check (review_count between 1 and 1000000),
  created_at timestamptz not null default clock_timestamp(),
  last_reviewed_at timestamptz not null default clock_timestamp(),
  check (
    (recovery_status='FINAL_RECEIPT_VERIFIED' and original_job_settled
      and last_independent_final_receipt_id is not null)
    or (recovery_status<>'FINAL_RECEIPT_VERIFIED' and not original_job_settled
      and last_independent_final_receipt_id is null))
);
alter table reality_internal.genuine_original_recovery_commitments_v1
 enable row level security;
revoke all on reality_internal.genuine_original_recovery_commitments_v1
 from public,anon,authenticated;
grant select,insert,update on
 reality_internal.genuine_original_recovery_commitments_v1 to service_role;

create or replace function public.reality_commit_genuine_original_recovery_v1(
 p_observation_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $body$
declare v_observation record;v_queue record;v_existing record;
 v_status text;v_next text;v_id uuid;v_duplicate boolean;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_RECOVERY_SERVICE_ROLE_ONLY';
 end if;
 if p_observation_id is null then
  raise exception 'GENUINE_RECOVERY_OBSERVATION_REQUIRED';
 end if;
 select * into v_observation
 from reality_internal.genuine_worker_failure_observations_v1 o
 where o.observation_id=p_observation_id
   and o.independent_provider_readback_verified=true
   and o.original_job_completed=false
   and o.installation_authorized=false
   and o.production_changed=false;
 if not found then
  raise exception 'GENUINE_RECOVERY_INDEPENDENT_OBSERVATION_NOT_FOUND';
 end if;
 select q.owner_id,q.original_work_id,q.trigger_id,
        q.original_work_event_id,q.goal_transition_event_id
 into v_queue
 from reality_internal.genuine_capability_queue_v1 q
 join reality_internal.goal_publication_epochs g
   on g.user_id=q.owner_id and g.conversation_id=q.conversation_id
   and g.last_transition_event_id=q.goal_transition_event_id
 join reality_internal.genuine_original_continuations_v1 c
   on c.trigger_id=q.trigger_id and c.original_work_id=q.original_work_id
   and c.owner_id=q.owner_id
   and c.state in ('ACCEPTED_FOR_ISOLATED_RESUMPTION','RESUMPTION_CLAIMED')
 join reality_internal.genuine_preview_install_approvals_v1 a
   on a.trigger_id=q.trigger_id and a.original_work_id=q.original_work_id
   and a.owner_id=q.owner_id and a.approval_id=c.approval_id
   and a.consumed_at is not null and a.target_environment='ISOLATED_PREVIEW'
 join public.universe_events ev
   on ev.event_id=q.original_work_event_id
   and ev.entity_type='reality_original_source_backed_repair_work'
   and ev.epistemic_status='VERIFIED'
   and ev.payload->>'original_work_id'=q.original_work_id
   and ev.payload->>'owner_id'=q.owner_id::text
   and ev.payload->>'original_job_completed'='false'
   and ev.payload->>'owner_authorized_investigation'='true'
   and ev.payload->>'owner_authorized_installation'='false'
 where q.owner_id=v_observation.owner_id
   and q.original_work_id=v_observation.original_work_id
   and q.trigger_id=v_observation.trigger_id
   and q.original_work_event_id=v_observation.original_work_event_id
   and q.phase='ISOLATED_INSTALLED_PROBATION'
   and not exists(
     select 1 from reality_internal.genuine_independent_final_receipts_v1 fr
     where fr.owner_id=q.owner_id and fr.original_work_id=q.original_work_id)
 limit 1;
 if not found then
  raise exception 'GENUINE_RECOVERY_ACTIVE_ORIGINAL_SCOPE_CHANGED';
 end if;
 v_status:=case when v_observation.finding=
  'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED'
  then 'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK'
  when v_observation.finding=
  'SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS'
  then 'INDEPENDENT_DIAGNOSIS_REQUIRED'
  else null end;
 if v_status is null then
  raise exception 'GENUINE_RECOVERY_UNSUPPORTED_FAILURE_CLASS';
 end if;
 v_next:=case when v_status='RECONCILE_ALREADY_SATISFIED_PRIOR_WORK'
   then 'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION'
   else 'VERIFY_EXTERNAL_EFFECTS_AND_CLASSIFY_FAILURE' end;
 -- Serializing on the original queue protects from parallel signed wakes;
 -- this row does not consume execution claims or new owner authority.
 perform 1 from reality_internal.genuine_capability_queue_v1 q
 where q.trigger_id=v_queue.trigger_id for update;
 select * into v_existing
 from reality_internal.genuine_original_recovery_commitments_v1 r
 where r.original_work_id=v_queue.original_work_id for update;
 if found then
  if v_existing.owner_id<>v_queue.owner_id or
     v_existing.trigger_id<>v_queue.trigger_id or
     v_existing.original_work_event_id<>v_queue.original_work_event_id or
     v_existing.original_job_settled then
   raise exception 'GENUINE_RECOVERY_IMMUTABLE_ORIGINAL_SCOPE_CONFLICT';
  end if;
  v_duplicate:=v_existing.latest_observation_id=p_observation_id;
  if not v_duplicate then
   update reality_internal.genuine_original_recovery_commitments_v1
   set latest_observation_id=p_observation_id,
       latest_provider_sha256=v_observation.provider_evidence_sha256,
       recovery_status=v_status,next_evidence_action=v_next,
       last_reviewed_at=clock_timestamp(),
       review_count=least(review_count+1,1000000)
   where recovery_id=v_existing.recovery_id;
  end if;
  v_id:=v_existing.recovery_id;
 else
  insert into reality_internal.genuine_original_recovery_commitments_v1(
    owner_id,original_work_id,trigger_id,original_work_event_id,
    latest_observation_id,latest_provider_sha256,
    recovery_status,next_evidence_action)
  values(v_queue.owner_id,v_queue.original_work_id,v_queue.trigger_id,
    v_queue.original_work_event_id,p_observation_id,
    v_observation.provider_evidence_sha256,v_status,v_next)
  returning recovery_id into v_id;
  v_duplicate:=false;
 end if;
 return jsonb_build_object(
   'status','EXISTING_ORIGINAL_RECOVERY_OBLIGATION_PRESERVED',
   'recovery_id',v_id,'already_preserved',v_duplicate,
   'original_work_id',v_queue.original_work_id,
   'original_work_event_id',v_queue.original_work_event_id,
   'owner_id',v_queue.owner_id,'trigger_id',v_queue.trigger_id,
   'observation_id',p_observation_id,
   'provider_evidence_sha256',v_observation.provider_evidence_sha256,
   'recovery_status',v_status,'next_evidence_action',v_next,
   'must_preserve_original_job',true,
   'allow_safe_reconciliation_without_new_approval',true,
   'owner_approval_for_new_install_still_required',true,
   'retry_external_effects_authorized',false,
   'model_generation_authorized',false,
   'new_customer_job_created',false,
   'original_job_completed',false,
   'installation_authorized',false,
   'production_changed',false);
end $body$;
revoke all on function public.reality_commit_genuine_original_recovery_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_commit_genuine_original_recovery_v1(uuid)
 to service_role;