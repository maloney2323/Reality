-- The SAME existing signed shift consumes independently rechecked GitHub
-- case-specific source RED->GREEN evidence. No new work, authority, shift,
-- installation or customer settlement. The reviewer is Reality's current
-- signed service worker; Supabase GitHub broker independently checks provider.
create table if not exists reality_internal.owner_maintenance_independent_case_ci_v1(
 maintenance_id uuid primary key references reality_internal.owner_internal_maintenance_jobs_v1(incident_id),
 owner_id uuid not null,shift_id uuid not null,
 source_ref text not null,
 signed_repair_handoff_receipt_sha256 text not null,
 source_epoch_receipt_sha256 text not null,
 historical_failure_kind text not null,
 independently_reviewing_worker_run_id uuid not null,
 github_run_id bigint not null check(github_run_id>0),
 github_job_id bigint not null check(github_job_id>0),
 github_artifact_id bigint not null check(github_artifact_id>0),
 github_artifact_digest text not null check(github_artifact_digest~'^sha256:[a-f0-9]{64}$'),
 corrected_release_sha text not null check(corrected_release_sha~'^[a-f0-9]{40}$'),
 frozen_test_blob_sha text not null check(frozen_test_blob_sha~'^[a-f0-9]{40}$'),
 signed_case_spec_blob_sha text not null check(signed_case_spec_blob_sha~'^[a-f0-9]{40}$'),
 signed_trigger_blob_sha text not null check(signed_trigger_blob_sha~'^[a-f0-9]{40}$'),
 independent_runner_blob_sha text not null check(independent_runner_blob_sha~'^[a-f0-9]{40}$'),
 case_specific_ci_receipt_sha256 text not null unique
  check(case_specific_ci_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 source_epoch_frozen_red_verified boolean not null default true check(source_epoch_frozen_red_verified=true),
 code_correction_green_verified boolean not null default true check(code_correction_green_verified=true),
 original_customer_job_completed boolean not null default false check(original_customer_job_completed=false),
 artifact_installation_authorized boolean not null default false check(artifact_installation_authorized=false),
 production_changed boolean not null default false check(production_changed=false),
 reviewed_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.owner_maintenance_independent_case_ci_v1 enable row level security;
revoke all on reality_internal.owner_maintenance_independent_case_ci_v1 from public,anon,authenticated;
grant select,insert on reality_internal.owner_maintenance_independent_case_ci_v1 to service_role;

create or replace function public.reality_read_signed_existing_maintenance_case_ci_scope_v1(
 p_shift_id uuid,p_worker_run_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record; v_cases jsonb;v_count int;
begin
 if current_user<>'service_role' or p_shift_id is null
  or p_worker_run_id is null then
  raise exception 'SIGNED_CASE_CI_REVIEW_WORKER_REQUIRED';end if;
 select s.shift_id,s.owner_id,w.source_scope
 into v from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 p
  on p.shift_id=s.shift_id and p.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where s.shift_id=p_shift_id and s.closed_at is null
  and s.authorized_at is not null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and pg_catalog.jsonb_typeof(w.source_scope)='array'
  and pg_catalog.jsonb_array_length(w.source_scope) between 1 and 4
  and p.last_worker_status='WAKE_RECEIVED'
  and p.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED'
  and run.started_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_MAINTENANCE_CASE_CI_REVIEW_WARRANT',
  'cases','[]'::jsonb,'case_count',0,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false);end if;
 select coalesce(pg_catalog.jsonb_agg(
 pg_catalog.jsonb_build_object(
  'maintenance_id',m.incident_id,'owner_id',m.owner_id,
  'shift_id',m.claimed_shift_id,'source_ref',m.source_ref,
  'source_epoch_receipt_sha256',h.source_epoch_receipt_sha256,
  'signed_repair_handoff_receipt_sha256',h.handoff_receipt_sha256,
  'historical_failure_kind',m.failure_baseline_kind,
  'independent_failure_baseline_receipt_sha256',m.independent_failure_baseline_receipt_sha256
 ) order by m.incident_id),'[]'::jsonb)
 into v_cases
 from pg_catalog.jsonb_array_elements(v.source_scope) scope(entry)
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=(scope.entry->>'maintenance_id')::uuid
   and m.owner_id=v.owner_id and m.claimed_shift_id=p_shift_id
   and m.source_ref=scope.entry->>'source_ref'
   and m.origin_shift_id=(scope.entry->>'origin_shift_id')::uuid
   and m.independent_review_receipt_sha256=
       scope.entry->>'independent_review_receipt_sha256'
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=m.incident_id and h.owner_id=m.owner_id
  and h.shift_id=p_shift_id and h.source_ref=m.source_ref
  and h.origin_shift_id=m.origin_shift_id
  and h.independent_baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
 where m.independent_frozen_test_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and m.phase in('OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
   'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE')
  and m.failure_baseline_kind in(
   'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED',
   'HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES')
  and not exists(select 1 from reality_internal.owner_maintenance_independent_case_ci_v1 old
   where old.maintenance_id=m.incident_id);
 v_count:=pg_catalog.jsonb_array_length(v_cases);
 return pg_catalog.jsonb_build_object(
  'status',case when v_count>0 then
   'SIGNED_EXISTING_MAINTENANCE_CASE_CI_INDEPENDENT_REVIEW_READY'
   else 'NO_UNREVIEWED_SIGNED_MAINTENANCE_CASE_CI_SCOPE' end,
  'shift_id',p_shift_id,'owner_id',v.owner_id,
  'case_count',v_count,'cases',v_cases,'case_ci_read_authorized',true,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;

create or replace function public.reality_record_signed_existing_maintenance_case_ci_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_maintenance_id uuid,
 p_release_sha text,p_github_run_id bigint,p_github_job_id bigint,
 p_artifact_id bigint,p_artifact_digest text,
 p_frozen_test_blob_sha text,p_signed_case_spec_blob_sha text,
 p_signed_trigger_blob_sha text,p_independent_runner_blob_sha text
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record;v_hash text;v_existing record;v_updated int;
begin
 if current_user<>'service_role' or p_shift_id is null
  or p_worker_run_id is null or p_maintenance_id is null
  or p_release_sha!~'^[a-f0-9]{40}$'
  or p_github_run_id<1 or p_github_job_id<1 or p_artifact_id<1
  or p_artifact_digest!~'^sha256:[a-f0-9]{64}$'
  or p_frozen_test_blob_sha!~'^[a-f0-9]{40}$'
  or p_signed_case_spec_blob_sha!~'^[a-f0-9]{40}$'
  or p_signed_trigger_blob_sha!~'^[a-f0-9]{40}$'
  or p_independent_runner_blob_sha!~'^[a-f0-9]{40}$' then
  raise exception 'SIGNED_PROVIDER_CASE_CI_RECEIPT_FIELDS_REQUIRED';end if;
 select m.incident_id,m.owner_id,m.claimed_shift_id,m.source_ref,
  m.failure_baseline_kind,m.phase,m.independent_frozen_test_receipt_sha256,
  m.origin_shift_id,h.handoff_receipt_sha256,h.source_epoch_receipt_sha256
 into v from reality_internal.owner_internal_maintenance_jobs_v1 m
 join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
  on h.maintenance_id=m.incident_id and h.owner_id=m.owner_id
  and h.shift_id=p_shift_id and h.source_ref=m.source_ref
  and h.origin_shift_id=m.origin_shift_id
  and h.independent_baseline_receipt_sha256=m.independent_failure_baseline_receipt_sha256
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=m.claimed_shift_id and s.owner_id=m.owner_id
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 where m.incident_id=p_maintenance_id and m.claimed_shift_id=p_shift_id
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false
  and m.phase in('OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
    'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE')
  and m.independent_failure_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and s.closed_at is null and s.authorized_at is not null
  and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and s.status in('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and w.state='ACTIVE'
  and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
  and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) scope(entry)
   where scope.entry->>'maintenance_id'=m.incident_id::text
    and scope.entry->>'origin_shift_id'=m.origin_shift_id::text
    and scope.entry->>'source_ref'=m.source_ref
    and scope.entry->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256)
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.status='STARTED' and run.started_at>clock_timestamp()-interval '3 minutes'
  and not exists(select 1 from reality_internal.owner_maintenance_independent_case_ci_v1 prior
   where prior.maintenance_id=m.incident_id)
 for update of m skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_CASE_CI_REPAIR_EVIDENCE_ACCEPTANCE_SCOPE',
  'case_specific_frozen_red_attested',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);end if;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v.owner_id::text||'|'||p_shift_id::text||'|'||
   p_maintenance_id::text||'|'||v.source_ref||'|'||
   v.handoff_receipt_sha256||'|'||v.source_epoch_receipt_sha256||'|'||
   v.failure_baseline_kind||'|'||p_release_sha||'|'||
   p_github_run_id::text||'|'||p_github_job_id::text||'|'||
   p_artifact_id::text||'|'||p_artifact_digest||'|'||
   p_frozen_test_blob_sha||'|'||p_signed_case_spec_blob_sha||'|'||
   p_signed_trigger_blob_sha||'|'||p_independent_runner_blob_sha||
   '|EXACT_FROZEN_SOURCE_RED_GREEN_INDEPENDENTLY_RECHECKED','UTF8')),'hex');
 insert into reality_internal.owner_maintenance_independent_case_ci_v1(
  maintenance_id,owner_id,shift_id,source_ref,
  signed_repair_handoff_receipt_sha256,source_epoch_receipt_sha256,
  historical_failure_kind,independently_reviewing_worker_run_id,
  github_run_id,github_job_id,github_artifact_id,github_artifact_digest,
  corrected_release_sha,frozen_test_blob_sha,signed_case_spec_blob_sha,
  signed_trigger_blob_sha,independent_runner_blob_sha,
  case_specific_ci_receipt_sha256)
 values(p_maintenance_id,v.owner_id,p_shift_id,v.source_ref,
  v.handoff_receipt_sha256,v.source_epoch_receipt_sha256,
  v.failure_baseline_kind,p_worker_run_id,
  p_github_run_id,p_github_job_id,p_artifact_id,p_artifact_digest,
  p_release_sha,p_frozen_test_blob_sha,p_signed_case_spec_blob_sha,
  p_signed_trigger_blob_sha,p_independent_runner_blob_sha,v_hash)
 on conflict(maintenance_id) do nothing;
 select * into v_existing from reality_internal.owner_maintenance_independent_case_ci_v1
 where maintenance_id=p_maintenance_id;
 if not found or v_existing.case_specific_ci_receipt_sha256<>v_hash
 then raise exception 'SIGNED_CASE_CI_INDEPENDENT_RECEIPT_CONFLICT';end if;
 update reality_internal.owner_internal_maintenance_jobs_v1 m
 set independent_frozen_test_receipt_sha256=v_hash,
  phase='FROZEN_FAILURE_VERIFIED'
 where m.incident_id=p_maintenance_id and m.owner_id=v.owner_id
  and m.claimed_shift_id=p_shift_id
  and m.independent_frozen_test_receipt_sha256 is null
  and m.repaired_capability_receipt_sha256 is null
  and m.exact_install_approval_receipt_sha256 is null
  and m.original_job_completed=false and m.production_changed=false;
 get diagnostics v_updated=row_count;
 if v_updated<>1 then raise exception 'SIGNED_CASE_CI_ORIGINAL_INCIDENT_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED',
  'owner_id',v.owner_id,'shift_id',p_shift_id,'maintenance_id',p_maintenance_id,
  'source_ref',v.source_ref,'github_run_id',p_github_run_id,
  'case_specific_ci_receipt_sha256',v_hash,
  'case_specific_frozen_red_attested',true,
  'code_regression_green_verified',true,
  'repair_installed',false,'repair_executed',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false,
  'next_action','EXACT_SOURCE_PATCH_INDEPENDENT_REPAIR_AND_INSTALL_REVIEW_REQUIRED');
end $fn$;
revoke all on function public.reality_read_signed_existing_maintenance_case_ci_scope_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.reality_record_signed_existing_maintenance_case_ci_v1(uuid,uuid,uuid,text,bigint,bigint,bigint,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_read_signed_existing_maintenance_case_ci_scope_v1(uuid,uuid) to service_role;
grant execute on function public.reality_record_signed_existing_maintenance_case_ci_v1(uuid,uuid,uuid,text,bigint,bigint,bigint,text,text,text,text,text) to service_role;
