-- Governed maintenance repair candidate authoring; existing warrant only.
-- An LLM candidate is NEVER an independent frozen test, code installation,
-- job execution, owner approval, or final settlement.
create table if not exists reality_internal.owner_maintenance_repair_candidates_v1(
 maintenance_id uuid primary key references reality_internal.owner_maintenance_signed_repair_handoffs_v1(maintenance_id),
 owner_id uuid not null,shift_id uuid not null,
 source_ref text not null,source_handoff_sha256 text not null,
 signed_worker_run_id uuid not null,request_id uuid not null unique default gen_random_uuid(),
 release_sha text not null check(release_sha~'^[a-f0-9]{40}$'),
 state text not null default 'CLAIMED' check(state in('CLAIMED','MODEL_CANDIDATE_RECORDED','PROVIDER_UNVERIFIED')),
 model_response_id text,source_path text,source_blob_sha text,
 source_file_sha256 text,provider_observation_sha256 text,
 candidate_patch jsonb,proposed_source_sha256 text,
 candidate_receipt_sha256 text unique, failure_reason text,
 claimed_at timestamptz not null default clock_timestamp(),
 recorded_at timestamptz,
 installation_authorized boolean not null default false check(installation_authorized=false),
 original_job_completed boolean not null default false check(original_job_completed=false),
 production_changed boolean not null default false check(production_changed=false)
);
alter table reality_internal.owner_maintenance_repair_candidates_v1 enable row level security;
revoke all on reality_internal.owner_maintenance_repair_candidates_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_maintenance_repair_candidates_v1 to service_role;

create or replace function public.reality_claim_signed_maintenance_repair_candidate_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_claim record;
begin
 if current_user<>'service_role' or p_shift_id is null or
   p_worker_run_id is null or p_release_sha!~'^[a-f0-9]{40}$' then
   raise exception 'MAINTENANCE_CANDIDATE_SIGNED_WORKER_REQUIRED';
 end if;
 select h.*,m.maintenance_kind,m.failure_baseline_kind
 into v from reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=h.maintenance_id and m.owner_id=h.owner_id
  and m.claimed_shift_id=h.shift_id and m.source_ref=h.source_ref
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=h.shift_id and s.owner_id=h.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
  and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where h.shift_id=p_shift_id and h.work_phase='NEEDS_CASE_SPECIFIC_FROZEN_RED'
  and h.independent_baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and s.authorized_at is not null and s.closed_at is null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1
   from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=m.incident_id::text
    and scope.entry->>'source_ref'=h.source_ref
    and scope.entry->>'origin_shift_id'=h.origin_shift_id::text
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.owner_maintenance_repair_candidates_v1 prior where prior.maintenance_id=h.maintenance_id)
 order by h.recorded_at,h.maintenance_id limit 1 for update of h skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_REPAIR_CANDIDATE_READY',
  'model_invocation_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
 end if;
 insert into reality_internal.owner_maintenance_repair_candidates_v1(
 maintenance_id,owner_id,shift_id,source_ref,source_handoff_sha256,
 signed_worker_run_id,release_sha)
 values(v.maintenance_id,v.owner_id,p_shift_id,v.source_ref,
  v.handoff_receipt_sha256,p_worker_run_id,p_release_sha)
 on conflict(maintenance_id) do nothing
 returning * into v_claim;
 if not found then return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_MODEL_CANDIDATE_ALREADY_CLAIMED_NO_REPLAY',
  'maintenance_id',v.maintenance_id,'model_invocation_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'original_job_completed',false,'new_shift_started',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_SIGNED_MAINTENANCE_MODEL_CANDIDATE_LEASED',
  'maintenance_id',v.maintenance_id,'shift_id',p_shift_id,
  'owner_id',v.owner_id,'source_ref',v.source_ref,
  'source_handoff_sha256',v.handoff_receipt_sha256,
  'original_work_id',v.existing_original_work_id,
  'maintenance_kind',v.maintenance_kind,
  'historical_failure_kind',v.failure_baseline_kind,
  'independent_baseline_receipt_sha256',v.independent_baseline_receipt_sha256,
  'independent_diagnostic_receipt_sha256',v.independent_diagnostic_receipt_sha256,
  'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
  'request_id',v_claim.request_id,'release_sha',p_release_sha,
  'model_invocation_authorized',true,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;

create or replace function public.reality_record_signed_maintenance_repair_candidate_v1(
 p_maintenance_id uuid,p_request_id uuid,p_source_path text,
 p_source_blob_sha text,p_source_file_sha256 text,
 p_provider_observation_sha256 text,p_model_response_id text,
 p_candidate_patch jsonb,p_proposed_source_sha256 text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_sha text;
begin
 if current_user<>'service_role' or p_request_id is null or
  p_maintenance_id is null or
  p_source_path!~'^(src/|api/reality/)[a-zA-Z0-9_./-]+[.]js$' or
  p_source_path like '%..%' or
  p_source_blob_sha!~'^[a-f0-9]{40}$' or
  p_source_file_sha256!~'^sha256:[a-f0-9]{64}$' or
  p_provider_observation_sha256!~'^sha256:[a-f0-9]{64}$' or
  p_model_response_id!~'^resp_[A-Za-z0-9_-]{4,160}$' or
  p_proposed_source_sha256!~'^sha256:[a-f0-9]{64}$' or
  pg_catalog.jsonb_typeof(p_candidate_patch)<>'object' or
  (select pg_catalog.array_agg(key order by key)
   from pg_catalog.jsonb_object_keys(p_candidate_patch) key)
    <>array['find','reason','replace']::text[] or
  length(p_candidate_patch->>'find') not between 20 and 12000 or
  length(p_candidate_patch->>'replace')>16000 or
  length(p_candidate_patch->>'reason') not between 8 and 1500
 then raise exception 'MAINTENANCE_SOURCE_CANDIDATE_UNVERIFIED';end if;
 select c.* into v from reality_internal.owner_maintenance_repair_candidates_v1 c
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=c.maintenance_id
  and h.owner_id=c.owner_id and h.shift_id=c.shift_id
  and h.handoff_receipt_sha256=c.source_handoff_sha256
 where c.maintenance_id=p_maintenance_id and c.request_id=p_request_id
  and c.state='CLAIMED'
  and c.claimed_at>clock_timestamp()-interval '8 minutes'
 for update of c;
 if not found then raise exception 'MAINTENANCE_CANDIDATE_CLAIM_EXPIRED_OR_DRIFT';end if;
 v_sha:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v.shift_id::text||'|'||p_maintenance_id::text||'|'||
  v.source_handoff_sha256||'|'||v.release_sha||'|'||
  p_source_path||'|'||p_source_blob_sha||'|'||
  p_source_file_sha256||'|'||p_provider_observation_sha256||'|'||
  p_model_response_id||'|'||p_proposed_source_sha256||'|'||
  p_candidate_patch::text,'UTF8')),'hex');
 update reality_internal.owner_maintenance_repair_candidates_v1
 set state='MODEL_CANDIDATE_RECORDED',source_path=p_source_path,
  source_blob_sha=p_source_blob_sha,source_file_sha256=p_source_file_sha256,
  provider_observation_sha256=p_provider_observation_sha256,
  model_response_id=p_model_response_id,candidate_patch=p_candidate_patch,
  proposed_source_sha256=p_proposed_source_sha256,
  candidate_receipt_sha256=v_sha,recorded_at=clock_timestamp()
 where maintenance_id=p_maintenance_id and request_id=p_request_id and state='CLAIMED';
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED',
  'maintenance_id',p_maintenance_id,'shift_id',v.shift_id,
  'owner_id',v.owner_id,'source_ref',v.source_ref,
  'request_id',p_request_id,'source_path',p_source_path,
  'candidate_receipt_sha256',v_sha,'proposed_source_sha256',p_proposed_source_sha256,
  'model_generated',true,'independent_frozen_red_verified',false,
  'independent_ci_verified',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false,
  'next_action','INDEPENDENTLY_REPRODUCE_CASE_SPECIFIC_FAILURE_BEFORE_TESTING_CANDIDATE');
end $fn$;

create or replace function public.reality_mark_signed_maintenance_repair_candidate_unverified_v1(
 p_maintenance_id uuid,p_request_id uuid,p_reason text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;
begin
 if current_user<>'service_role' or p_reason!~'^[A-Z0-9_]{5,120}$'
 then raise exception 'MAINTENANCE_CANDIDATE_FAILURE_REASON_INVALID';end if;
 update reality_internal.owner_maintenance_repair_candidates_v1
 set state='PROVIDER_UNVERIFIED',failure_reason=p_reason,recorded_at=clock_timestamp()
 where maintenance_id=p_maintenance_id and request_id=p_request_id
  and state='CLAIMED'
 returning maintenance_id,shift_id into v;
 return pg_catalog.jsonb_build_object(
 'status','MAINTENANCE_REPAIR_MODEL_CANDIDATE_NOT_VERIFIED',
 'maintenance_id',v.maintenance_id,'shift_id',v.shift_id,
 'model_generated',false,'independent_ci_verified',false,
 'original_job_completed',false,'installation_authorized',false,
 'production_changed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_claim_signed_maintenance_repair_candidate_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.reality_record_signed_maintenance_repair_candidate_v1(uuid,uuid,text,text,text,text,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.reality_mark_signed_maintenance_repair_candidate_unverified_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_claim_signed_maintenance_repair_candidate_v1(uuid,uuid,text) to service_role;
grant execute on function public.reality_record_signed_maintenance_repair_candidate_v1(uuid,uuid,text,text,text,text,text,jsonb,text) to service_role;
grant execute on function public.reality_mark_signed_maintenance_repair_candidate_unverified_v1(uuid,uuid,text) to service_role;
