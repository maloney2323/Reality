-- A targeted, one-time revision after independent OFF-TARGET rejection.
-- The original candidate/review remains independently inspectable.
alter table reality_internal.owner_maintenance_candidate_target_reviews_v1
 drop constraint owner_maintenance_candidate_target_reviews_v1_pkey;
alter table reality_internal.owner_maintenance_candidate_target_reviews_v1
 add constraint owner_maintenance_candidate_target_reviews_v1_pkey
 primary key(maintenance_id,original_model_request_id);
alter table reality_internal.owner_maintenance_repair_candidates_v1
 add column if not exists target_revision_attempts smallint not null default 0
 check(target_revision_attempts between 0 and 1);
create table if not exists reality_internal.owner_maintenance_model_offtarget_history_v1(
 maintenance_id uuid primary key references reality_internal.owner_maintenance_repair_candidates_v1(maintenance_id),
 owner_id uuid not null,shift_id uuid not null,
 original_request_id uuid not null,original_worker_run_id uuid not null,
 source_ref text not null,
 rejected_source_path text not null,
 rejected_source_blob_sha text not null,
 rejected_candidate_patch jsonb not null,
 rejected_candidate_receipt_sha256 text not null,
 rejected_model_response_id text not null,
 rejected_proposed_source_sha256 text not null,
 old_release_sha text not null,
 independent_reviewer_receipt_sha256 text not null,
 independent_reviewer_worker_run_id uuid not null,
 new_worker_run_id uuid not null,new_release_sha text not null,
 recorded_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.owner_maintenance_model_offtarget_history_v1 enable row level security;
revoke all on reality_internal.owner_maintenance_model_offtarget_history_v1 from public,anon,authenticated;
grant select,insert on reality_internal.owner_maintenance_model_offtarget_history_v1 to service_role;

create or replace function public.reality_claim_signed_maintenance_candidate_target_review_v1(
 p_shift_id uuid,p_worker_run_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_claim record;
begin
 if current_user<>'service_role' or p_shift_id is null or
   p_worker_run_id is null then
  raise exception 'SIGNED_CANDIDATE_INDEPENDENT_REVIEW_WORKER_REQUIRED';
 end if;
 select c.*
 into v
 from reality_internal.owner_maintenance_repair_candidates_v1 c
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=c.maintenance_id and h.owner_id=c.owner_id
   and h.shift_id=c.shift_id and h.source_ref=c.source_ref
   and h.handoff_receipt_sha256=c.source_handoff_sha256
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=c.shift_id and s.owner_id=c.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where c.shift_id=p_shift_id and c.state='MODEL_CANDIDATE_RECORDED'
  and c.signed_worker_run_id<>p_worker_run_id
  and c.candidate_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and c.source_path~'^(src/|api/reality/)[a-zA-Z0-9_./-]+[.]js$'
  and c.release_sha~'^[a-f0-9]{40}$'
  and w.state='ACTIVE' and
   w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and s.authorized_at is not null and s.closed_at is null
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
    where scope.entry->>'maintenance_id'=c.maintenance_id::text
     and scope.entry->>'source_ref'=c.source_ref
     and scope.entry->>'origin_shift_id'=h.origin_shift_id::text)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.owner_maintenance_candidate_target_reviews_v1 prior
    where prior.maintenance_id=c.maintenance_id
     and prior.original_model_request_id=c.request_id)
 order by c.recorded_at,c.maintenance_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_READY',
  'source_review_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
 end if;
 insert into reality_internal.owner_maintenance_candidate_target_reviews_v1(
 maintenance_id,owner_id,shift_id,source_ref,source_path,
 original_candidate_receipt_sha256,original_model_request_id,
 original_release_sha,reviewer_worker_run_id)
 values(v.maintenance_id,v.owner_id,v.shift_id,v.source_ref,v.source_path,
  v.candidate_receipt_sha256,v.request_id,v.release_sha,p_worker_run_id)
 on conflict(maintenance_id,original_model_request_id) do nothing
 returning * into v_claim;
 if not found then return pg_catalog.jsonb_build_object(
  'status','MAINTENANCE_CANDIDATE_TARGET_REVIEW_ALREADY_CLAIMED_NO_REPLAY',
  'source_review_authorized',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MAINTENANCE_CANDIDATE_TARGET_REVIEW_CLAIMED',
  'maintenance_id',v.maintenance_id,'owner_id',v.owner_id,
  'shift_id',v.shift_id,'source_ref',v.source_ref,
  'source_path',v.source_path,
  'model_request_id',v.request_id,'release_sha',v.release_sha,
  'candidate_receipt_sha256',v.candidate_receipt_sha256,
  'reviewer_request_id',v_claim.reviewer_request_id,
  'source_review_authorized',true,'target_repair_proven',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
create or replace function public.reality_revise_signed_offtarget_maintenance_candidate_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_new record;
begin
 if current_user<>'service_role' or p_shift_id is null or
  p_worker_run_id is null or p_release_sha!~'^[a-f0-9]{40}$' then
  raise exception 'SIGNED_OFFTARGET_MODEL_REVISION_SERVICE_REQUIRED';end if;
 select c.*,h.existing_original_work_id,
  h.independent_baseline_receipt_sha256,
  h.independent_diagnostic_receipt_sha256,
  h.source_epoch_receipt_sha256,
  m.maintenance_kind,m.failure_baseline_kind,
  rv.review_receipt_sha256 as independent_reviewer_receipt_sha256,
  rv.reviewer_worker_run_id as independent_reviewer_worker_run_id
 into v from reality_internal.owner_maintenance_repair_candidates_v1 c
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=c.maintenance_id and h.owner_id=c.owner_id
  and h.shift_id=c.shift_id and h.source_ref=c.source_ref
  and h.handoff_receipt_sha256=c.source_handoff_sha256
 join reality_internal.owner_maintenance_candidate_target_reviews_v1 rv
  on rv.maintenance_id=c.maintenance_id and rv.owner_id=c.owner_id
  and rv.shift_id=c.shift_id and rv.source_ref=c.source_ref
  and rv.original_model_request_id=c.request_id
  and rv.original_candidate_receipt_sha256=c.candidate_receipt_sha256
  and rv.state='REVIEWED' and rv.target_in_worker_graph=false
  and rv.verdict='OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY'
  and rv.review_receipt_sha256~'^sha256:[a-f0-9]{64}$'
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=c.maintenance_id and m.owner_id=c.owner_id
  and m.claimed_shift_id=c.shift_id and m.source_ref=c.source_ref
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=c.shift_id and s.owner_id=c.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where c.shift_id=p_shift_id and c.state='MODEL_CANDIDATE_RECORDED'
  and c.target_revision_attempts=0
  and c.release_sha<>p_release_sha
  and c.signed_worker_run_id<>p_worker_run_id
  and c.candidate_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and c.model_response_id~'^resp_[A-Za-z0-9_-]{4,160}$'
  and c.source_blob_sha~'^[a-f0-9]{40}$'
  and c.proposed_source_sha256~'^sha256:[a-f0-9]{64}$'
  and c.source_path~'^(src/|api/reality/)[a-zA-Z0-9_./-]+[.]js$'
  and pg_catalog.jsonb_typeof(c.candidate_patch)='object'
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and s.authorized_at is not null and s.closed_at is null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=c.maintenance_id::text
    and scope.entry->>'source_ref'=c.source_ref
    and scope.entry->>'origin_shift_id'=h.origin_shift_id::text
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED'
  and run.started_at>clock_timestamp()-interval '3 minutes'
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and not exists(
   select 1 from reality_internal.owner_maintenance_model_offtarget_history_v1 old
   where old.maintenance_id=c.maintenance_id)
 order by c.recorded_at,c.maintenance_id
 limit 1 for update of c skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_OFFTARGET_MODEL_REVISION_READY',
  'model_invocation_authorized',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);end if;
 insert into reality_internal.owner_maintenance_model_offtarget_history_v1(
  maintenance_id,owner_id,shift_id,
  original_request_id,original_worker_run_id,source_ref,
  rejected_source_path,rejected_source_blob_sha,
  rejected_candidate_patch,rejected_candidate_receipt_sha256,
  rejected_model_response_id,rejected_proposed_source_sha256,
  old_release_sha,independent_reviewer_receipt_sha256,
  independent_reviewer_worker_run_id,new_worker_run_id,new_release_sha)
 values(v.maintenance_id,v.owner_id,v.shift_id,
  v.request_id,v.signed_worker_run_id,v.source_ref,
  v.source_path,v.source_blob_sha,
  v.candidate_patch,v.candidate_receipt_sha256,
  v.model_response_id,v.proposed_source_sha256,
  v.release_sha,v.independent_reviewer_receipt_sha256,
  v.independent_reviewer_worker_run_id,p_worker_run_id,p_release_sha);
 update reality_internal.owner_maintenance_repair_candidates_v1 c
 set state='CLAIMED',request_id=pg_catalog.gen_random_uuid(),
  signed_worker_run_id=p_worker_run_id,release_sha=p_release_sha,
  target_revision_attempts=1,source_path=null,source_blob_sha=null,
  source_file_sha256=null,provider_observation_sha256=null,
  model_response_id=null,candidate_patch=null,proposed_source_sha256=null,
  candidate_receipt_sha256=null,failure_reason=null,
  claimed_at=clock_timestamp(),recorded_at=null
 where maintenance_id=v.maintenance_id and request_id=v.request_id
  and state='MODEL_CANDIDATE_RECORDED' and target_revision_attempts=0
 returning * into v_new;
 if not found then raise exception 'SIGNED_OFFTARGET_REVISION_CONCURRENT_CLAIM_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_SIGNED_MAINTENANCE_MODEL_CANDIDATE_LEASED',
  'maintenance_id',v_new.maintenance_id,'shift_id',v_new.shift_id,
  'owner_id',v_new.owner_id,'source_ref',v_new.source_ref,
  'source_handoff_sha256',v_new.source_handoff_sha256,
  'original_work_id',v.existing_original_work_id,
  'maintenance_kind',v.maintenance_kind,
  'historical_failure_kind',v.failure_baseline_kind,
  'independent_baseline_receipt_sha256',v.independent_baseline_receipt_sha256,
  'independent_diagnostic_receipt_sha256',v.independent_diagnostic_receipt_sha256,
  'source_epoch_receipt_sha256',v.source_epoch_receipt_sha256,
  'request_id',v_new.request_id,'release_sha',v_new.release_sha,
  'old_failed_offtarget_candidate_preserved',true,
  'target_revision_attempts',1,
  'model_invocation_authorized',true,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_revise_signed_offtarget_maintenance_candidate_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_revise_signed_offtarget_maintenance_candidate_v1(uuid,uuid,text) to service_role;
