-- Repair entry for the EXISTING signed employee shift. A completed CI
-- diagnostic is not an independent frozen RED, a patch or an installation.
-- One durable source-bound repair obligation per already-authorized incident.
create table if not exists reality_internal.owner_maintenance_signed_repair_handoffs_v1 (
 maintenance_id uuid primary key references reality_internal.owner_internal_maintenance_jobs_v1(incident_id),
 owner_id uuid not null,
 shift_id uuid not null,
 origin_shift_id uuid not null,
 source_ref text not null check(source_ref~'^https://github[.]com/maloney2323/Reality/pull/[1-9][0-9]*$'),
 existing_original_work_id text check(existing_original_work_id is null or
  existing_original_work_id~'^work:[a-f0-9]{32}$'),
 source_epoch_receipt_sha256 text not null check(source_epoch_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_baseline_receipt_sha256 text not null check(independent_baseline_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 independent_diagnostic_receipt_sha256 text not null check(independent_diagnostic_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 requalification_receipt_sha256 text check(requalification_receipt_sha256 is null or
  requalification_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 registered_by_worker_run_id uuid not null,
 work_phase text not null default 'NEEDS_CASE_SPECIFIC_FROZEN_RED'
  check(work_phase='NEEDS_CASE_SPECIFIC_FROZEN_RED'),
 handoff_receipt_sha256 text not null unique check(handoff_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(),
 installation_authorized boolean not null default false check(installation_authorized=false),
 original_job_completed boolean not null default false check(original_job_completed=false),
 production_changed boolean not null default false check(production_changed=false)
);
alter table reality_internal.owner_maintenance_signed_repair_handoffs_v1 enable row level security;
revoke all on reality_internal.owner_maintenance_signed_repair_handoffs_v1 from public,anon,authenticated;
grant select,insert on reality_internal.owner_maintenance_signed_repair_handoffs_v1 to service_role;

create or replace function public.reality_admit_existing_signed_maintenance_repair_handoff_v1(
 p_shift_id uuid,p_worker_run_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record; v_existing record; v_hash text; v_now timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null then
  raise exception 'SIGNED_MAINTENANCE_REPAIR_WORKER_REQUIRED';
 end if;
 -- The original worker + authorization records, not GitHub issue comments,
 -- a model message, or a Chat prompt, own the exact eligible scope.
 select m.incident_id as maintenance_id,m.owner_id,m.origin_shift_id,
  m.source_ref,m.independent_failure_baseline_receipt_sha256,
  w.source_scope,e.receipt_sha256 as source_epoch_receipt_sha256,
  e.epoch_status,c.ci_independent_diagnostic_receipt_sha256,
  c.requalification_receipt_sha256,pr.original_work_id
 into v
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w
  on w.shift_id=s.shift_id and w.owner_id=s.owner_id
   and w.plan_fingerprint=s.plan_fingerprint
 join pg_catalog.jsonb_array_elements(w.source_scope) scope(entry) on true
 join reality_internal.owner_internal_maintenance_jobs_v1 m
  on m.incident_id=(scope.entry->>'maintenance_id')::uuid
   and m.owner_id=s.owner_id
   and m.claimed_shift_id=s.shift_id
   and m.source_ref=scope.entry->>'source_ref'
   and m.origin_shift_id=(scope.entry->>'origin_shift_id')::uuid
   and m.independent_review_receipt_sha256=
      scope.entry->>'independent_review_receipt_sha256'
 join reality_internal.signed_maintenance_ci_source_epochs_v1 e
  on e.maintenance_id=m.incident_id and e.owner_id=m.owner_id
   and e.shift_id=s.shift_id and e.source_ref=m.source_ref
 join reality_internal.signed_maintenance_executor_claims_v1 c
  on c.maintenance_id=m.incident_id and c.owner_id=m.owner_id
   and c.shift_id=s.shift_id and c.source_ref=m.source_ref
   and c.source_epoch_receipt_sha256=e.receipt_sha256
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id
 left join reality_internal.riley_pr_review_originals_v1 pr
  on pr.shift_id=s.shift_id and pr.owner_id=s.owner_id
   and pr.source_ref=m.source_ref
 where s.shift_id=p_shift_id and s.authorized_at is not null
   and s.closed_at is null and s.planned_start_at<=v_now
   and s.planned_end_at>v_now
   and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and w.state='ACTIVE'
   and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
   and pg_catalog.jsonb_typeof(w.source_scope)='array'
   and pg_catalog.jsonb_array_length(w.source_scope) between 1 and 4
   and pulse.last_worker_status='WAKE_RECEIVED'
   and pulse.last_worker_seen_at>v_now-interval '3 minutes'
   and run.status='STARTED'
   and run.started_at>v_now-interval '3 minutes'
   and m.handling_state='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'
   and m.independent_failure_baseline_receipt_sha256~
      '^sha256:[a-f0-9]{64}$'
   and m.independent_frozen_test_receipt_sha256 is null
   and m.exact_install_approval_receipt_sha256 is null
   and m.repaired_capability_receipt_sha256 is null
   and m.original_job_completed=false and m.production_changed=false
   and c.state='COMPLETED'
   and c.action='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'
   and c.ci_independent_diagnostic_receipt_sha256~
      '^sha256:[a-f0-9]{64}$'
   and (
    (e.epoch_status='SOURCE_EPOCH_ATTESTED_EXECUTABLE_RED_REQUIRED'
     and c.requalification_receipt_sha256 is null)
    or
    (e.epoch_status='SOURCE_EPOCH_CHANGED_REQUALIFICATION_REQUIRED'
     and c.requalification_receipt_sha256~
      '^sha256:[a-f0-9]{64}$')
   )
   and not exists(
    select 1 from reality_internal.owner_maintenance_signed_repair_handoffs_v1 prior
    where prior.maintenance_id=m.incident_id)
 order by (scope.entry->>'step_index')::int,m.incident_id
 limit 1 for update of m skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_NEW_SIGNED_MAINTENANCE_REPAIR_HANDOFF_ELIGIBLE',
  'work_order_created',false,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false);end if;
 v_hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(v.owner_id::text||'|'||p_shift_id::text||'|'||
    v.maintenance_id::text||'|'||v.origin_shift_id::text||'|'||
    v.source_ref||'|'||v.independent_failure_baseline_receipt_sha256||
    '|'||v.source_epoch_receipt_sha256||'|'||
    v.ci_independent_diagnostic_receipt_sha256||'|'||
    coalesce(v.requalification_receipt_sha256,'')||'|'||
    coalesce(v.original_work_id,'NO_PRIOR_EXECUTABLE_ORIGINAL')||
    '|NEEDS_CASE_SPECIFIC_FROZEN_RED','UTF8')),'hex');
 insert into reality_internal.owner_maintenance_signed_repair_handoffs_v1(
  maintenance_id,owner_id,shift_id,origin_shift_id,source_ref,
  existing_original_work_id,source_epoch_receipt_sha256,
  independent_baseline_receipt_sha256,independent_diagnostic_receipt_sha256,
  requalification_receipt_sha256,registered_by_worker_run_id,handoff_receipt_sha256)
 values(v.maintenance_id,v.owner_id,p_shift_id,v.origin_shift_id,
  v.source_ref,v.original_work_id,v.source_epoch_receipt_sha256,
  v.independent_failure_baseline_receipt_sha256,
  v.ci_independent_diagnostic_receipt_sha256,
  v.requalification_receipt_sha256,p_worker_run_id,v_hash)
 on conflict(maintenance_id) do nothing;
 select * into v_existing
 from reality_internal.owner_maintenance_signed_repair_handoffs_v1
 where maintenance_id=v.maintenance_id;
 if not found or v_existing.handoff_receipt_sha256<>v_hash then
  raise exception 'SIGNED_MAINTENANCE_REPAIR_HANDOFF_SCOPE_DRIFT';
 end if;
 return pg_catalog.jsonb_build_object(
  'status','EXISTING_SIGNED_MAINTENANCE_REPAIR_WORK_ADMITTED',
  'owner_id',v_existing.owner_id,'shift_id',v_existing.shift_id,
  'maintenance_id',v_existing.maintenance_id,
  'source_ref',v_existing.source_ref,
  'existing_original_work_id',v_existing.existing_original_work_id,
  'handoff_receipt_sha256',v_existing.handoff_receipt_sha256,
  'independent_baseline_receipt_sha256',v_existing.independent_baseline_receipt_sha256,
  'independent_diagnostic_receipt_sha256',v_existing.independent_diagnostic_receipt_sha256,
  'source_epoch_receipt_sha256',v_existing.source_epoch_receipt_sha256,
  'next_action','GENERATE_AND_INDEPENDENTLY_TEST_CASE_SPECIFIC_FROZEN_RED',
  'work_order_created',true,'frozen_ci_red_verified',false,
  'repair_executed',false,'original_job_completed',false,
  'installation_authorized',false,'production_changed',false,
  'new_shift_started',false);
end $fn$;
revoke all on function public.reality_admit_existing_signed_maintenance_repair_handoff_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_admit_existing_signed_maintenance_repair_handoff_v1(uuid,uuid) to service_role;
