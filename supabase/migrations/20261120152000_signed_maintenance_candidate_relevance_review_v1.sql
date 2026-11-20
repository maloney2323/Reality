-- Second independent signed worker reviews whether a model patch targets
-- a file in the exact signed executor import graph. NOT a frozen-case RED.
create table if not exists reality_internal.owner_maintenance_candidate_target_reviews_v1(
 maintenance_id uuid primary key references reality_internal.owner_maintenance_repair_candidates_v1(maintenance_id),
 owner_id uuid not null,shift_id uuid not null,
 source_ref text not null,source_path text not null,
 original_candidate_receipt_sha256 text not null,
 original_model_request_id uuid not null,
 original_release_sha text not null,
 reviewer_worker_run_id uuid not null,
 reviewer_request_id uuid not null unique default pg_catalog.gen_random_uuid(),
 state text not null default 'CLAIMED' check(state in('CLAIMED','REVIEWED')),
 target_in_worker_graph boolean,
 source_tree_sha text,worker_source_blob_sha text,
 review_receipt_sha256 text unique,
 verdict text,claimed_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 model_candidate_is_fix boolean not null default false check(model_candidate_is_fix=false),
 original_job_completed boolean not null default false check(original_job_completed=false),
 installation_authorized boolean not null default false check(installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false)
);
alter table reality_internal.owner_maintenance_candidate_target_reviews_v1 enable row level security;
revoke all on reality_internal.owner_maintenance_candidate_target_reviews_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_maintenance_candidate_target_reviews_v1 to service_role;

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
    where prior.maintenance_id=c.maintenance_id)
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
 on conflict(maintenance_id) do nothing
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

create or replace function public.reality_record_signed_maintenance_candidate_target_review_v1(
 p_maintenance_id uuid,p_reviewer_request_id uuid,
 p_worker_run_id uuid,p_source_tree_sha text,
 p_worker_source_blob_sha text,p_target_in_worker_graph boolean
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_hash text;v_verdict text;
begin
 if current_user<>'service_role' or p_maintenance_id is null or
  p_reviewer_request_id is null or p_worker_run_id is null or
  p_source_tree_sha!~'^[a-f0-9]{40}$' or
  p_worker_source_blob_sha!~'^[a-f0-9]{40}$' or
  p_target_in_worker_graph is null then
  raise exception 'SIGNED_MAINTENANCE_CANDIDATE_TARGET_PROOF_REQUIRED';
 end if;
 select r.* into v
 from reality_internal.owner_maintenance_candidate_target_reviews_v1 r
 join reality_internal.owner_maintenance_repair_candidates_v1 c
  on c.maintenance_id=r.maintenance_id and c.owner_id=r.owner_id
   and c.shift_id=r.shift_id
   and c.request_id=r.original_model_request_id
   and c.candidate_receipt_sha256=r.original_candidate_receipt_sha256
   and c.source_path=r.source_path
 where r.maintenance_id=p_maintenance_id
  and r.reviewer_request_id=p_reviewer_request_id
  and r.reviewer_worker_run_id=p_worker_run_id
  and r.state='CLAIMED' and r.claimed_at>clock_timestamp()-interval '5 minutes'
 for update of r;
 if not found then raise exception 'SIGNED_TARGET_REVIEW_LEASE_OR_CANDIDATE_DRIFT';end if;
 v_verdict:=case when p_target_in_worker_graph then
  'SIGNED_WORKER_DEPENDENCY_ONLY_FROZEN_RED_STILL_REQUIRED'
 else 'OFF_TARGET_NOT_SIGNED_WORKER_EXECUTOR_DEPENDENCY' end;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  v.owner_id::text||'|'||v.shift_id::text||'|'||v.maintenance_id::text||
  '|'||v.source_ref||'|'||v.source_path||'|'||
  v.original_candidate_receipt_sha256||'|'||v.original_release_sha||
  '|'||p_worker_run_id::text||'|'||p_source_tree_sha||'|'||
  p_worker_source_blob_sha||'|'||v_verdict,'UTF8')),'hex');
 update reality_internal.owner_maintenance_candidate_target_reviews_v1
 set state='REVIEWED',target_in_worker_graph=p_target_in_worker_graph,
  source_tree_sha=p_source_tree_sha,
  worker_source_blob_sha=p_worker_source_blob_sha,
  review_receipt_sha256=v_hash,verdict=v_verdict,
  reviewed_at=clock_timestamp()
 where maintenance_id=p_maintenance_id and reviewer_request_id=p_reviewer_request_id;
 return pg_catalog.jsonb_build_object(
  'status',v_verdict,'maintenance_id',p_maintenance_id,
  'shift_id',v.shift_id,'owner_id',v.owner_id,
  'source_path',v.source_path,'review_receipt_sha256',v_hash,
  'target_in_worker_graph',p_target_in_worker_graph,
  'independent_target_review_recorded',true,
  'candidate_is_verified_repair',false,
  'independent_frozen_red_verified',false,'independent_ci_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false);
end $fn$;
revoke all on function public.reality_claim_signed_maintenance_candidate_target_review_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_signed_maintenance_candidate_target_review_v1(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.reality_claim_signed_maintenance_candidate_target_review_v1(uuid,uuid) to service_role;
grant execute on function public.reality_record_signed_maintenance_candidate_target_review_v1(uuid,uuid,uuid,text,text,boolean) to service_role;
