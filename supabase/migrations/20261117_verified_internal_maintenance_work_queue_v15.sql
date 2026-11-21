-- INTERNAL MAINTENANCE IS WORK, BUT IT IS NOT CUSTOMER SETTLEMENT.
-- Carry independently verified operating failures across authorized shifts.
-- This does not create a customer original, install warrant, or new shift.
create table if not exists reality_internal.owner_internal_maintenance_jobs_v1(
 incident_id uuid primary key references reality_internal.owner_shift_continuity_incidents_v1(incident_id),
 owner_id uuid not null,
 origin_shift_id uuid not null,
 maintenance_kind text not null
   check(maintenance_kind in('EMPLOYEE_QUALIFICATION_HANDOFF_STALLED','QUALIFIED_EVIDENCE_JOB_BLOCKED')),
 assignee text not null,
 independent_reviewer text not null,
 source_ref text not null
   check(source_ref~'^https://github[.]com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/(issues|pull)/[1-9][0-9]*$'),
 independent_review_status text not null
   check(independent_review_status in('NO_ORIGINAL_ADMISSION_CONFIRMED','SOURCE_CHANGED_NEEDS_FROZEN_TEST')),
 independent_review_receipt_sha256 text not null
   check(independent_review_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 investigation_receipt_sha256 text not null
   check(investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 phase text not null
   check(phase in('OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE','OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
      'FROZEN_FAILURE_VERIFIED','CANDIDATE_INDEPENDENTLY_TESTED','AWAITING_EXACT_APPROVAL',
      'AUTHORIZED_REPAIR_IN_PROGRESS','REPAIR_VERIFIED_ORIGINAL_NOT_SETTLED',
      'INTERNAL_REPAIR_VERIFIED_CLOSED','BLOCKED_NEEDS_OWNER_AUTHORITY')),
 original_customer_work_id text check(original_customer_work_id is null or
   original_customer_work_id~'^work:[a-f0-9]{32}$'),
 independent_frozen_test_receipt_sha256 text check(independent_frozen_test_receipt_sha256 is null
   or independent_frozen_test_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 exact_install_approval_receipt_sha256 text check(exact_install_approval_receipt_sha256 is null
   or exact_install_approval_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 repaired_capability_receipt_sha256 text check(repaired_capability_receipt_sha256 is null
   or repaired_capability_receipt_sha256~'^sha256:[a-f0-9]{64}$'),
 original_job_completed boolean not null default false check(original_job_completed=false),
 installation_authorized_by_discovery boolean not null default false
   check(installation_authorized_by_discovery=false),
 external_action_authorized_by_discovery boolean not null default false
   check(external_action_authorized_by_discovery=false),
 production_changed boolean not null default false check(production_changed=false),
 created_at timestamptz not null default clock_timestamp(),
 last_seen_at timestamptz not null default clock_timestamp(),
 unique(owner_id,incident_id)
);
create index if not exists owner_internal_maintenance_open_v1
 on reality_internal.owner_internal_maintenance_jobs_v1(owner_id,phase,created_at);
alter table reality_internal.owner_internal_maintenance_jobs_v1 enable row level security;
revoke all on reality_internal.owner_internal_maintenance_jobs_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_internal_maintenance_jobs_v1 to service_role;

create or replace function reality_internal.observe_verified_internal_maintenance_work_v1()
returns integer language plpgsql security invoker set search_path to '' as $fn$
declare inserted integer;
begin
 if current_user not in('postgres','service_role')
 then raise exception 'MAINTENANCE_VERIFIED_OBSERVER_SERVICE_REQUIRED';end if;
 -- The observations MUST have been independently reviewed on a different
 -- signed worker. Model diagnosis alone NEVER creates an executable job.
 insert into reality_internal.owner_internal_maintenance_jobs_v1(
  incident_id,owner_id,origin_shift_id,maintenance_kind,
  assignee,independent_reviewer,source_ref,
  independent_review_status,independent_review_receipt_sha256,
  investigation_receipt_sha256,phase)
 select i.incident_id,i.owner_id,i.shift_id,i.kind,
  i.assigned_employee,i.independent_reviewer,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.source_ref else r.source_ref end,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.status else r.status end,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then b.receipt_sha256 else r.receipt_sha256 end,
  i.investigation_receipt_sha256,
  case when i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
    then 'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE'
    else 'OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION' end
 from reality_internal.owner_shift_continuity_incidents_v1 i
 join reality_internal.governed_employee_shifts_v1 shift
  on shift.shift_id=i.shift_id and shift.owner_id=i.owner_id
 left join reality_internal.shift_business_qualification_reviews_v1 b
  on b.incident_id=i.incident_id and b.owner_id=i.owner_id
   and b.shift_id=i.shift_id
 left join reality_internal.shift_continuity_independent_reviews_v1 r
  on r.incident_id=i.incident_id and r.owner_id=i.owner_id
   and r.shift_id=i.shift_id
 where i.kind in('EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
    'QUALIFIED_EVIDENCE_JOB_BLOCKED')
  and i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
  and i.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
  and i.assigned_employee is not null
  and i.independent_reviewer is not null
  and i.assigned_function_id<>i.reviewer_function_id
  and i.repair_executed=false and i.installation_authorized=false
  and i.production_changed=false
  and (
   (i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and b.status='NO_ORIGINAL_ADMISSION_CONFIRMED'
     and b.completed_at is not null and b.original_claim_count=0
     and b.prior_inquiry_count>=2
     and b.reviewer=i.independent_reviewer
     and b.receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and b.original_job_completed=false and b.repair_executed=false
     and b.installation_authorized=false and b.production_changed=false)
   or
   (i.kind='QUALIFIED_EVIDENCE_JOB_BLOCKED'
     and r.status='SOURCE_CHANGED_NEEDS_FROZEN_TEST'
     and r.completed_at is not null and r.reviewer=i.independent_reviewer
     and r.previously_reviewed_sha256<>r.current_provider_sha256
     and r.receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and r.original_job_completed=false and r.repair_executed=false
     and r.installation_authorized=false and r.production_changed=false)
   )
 on conflict(incident_id) do nothing;
 get diagnostics inserted=row_count;
 return inserted;
end $fn$;
revoke all on function reality_internal.observe_verified_internal_maintenance_work_v1()
 from public,anon,authenticated;
grant execute on function reality_internal.observe_verified_internal_maintenance_work_v1()
 to service_role;

create or replace function public.reality_read_owner_internal_maintenance_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MAINTENANCE_OWNER_READ_AUTHORITY_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'internal_work_id','maintenance:'||m.incident_id::text,
  'origin_incident_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
  'owner_id',m.owner_id,'kind',m.maintenance_kind,
  'assignee',m.assignee,'independent_reviewer',m.independent_reviewer,
  'phase',m.phase,'source_ref',m.source_ref,
  'independent_review_status',m.independent_review_status,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
  'original_customer_work_id',m.original_customer_work_id,
  'frozen_reproduction_verified',m.independent_frozen_test_receipt_sha256 is not null,
  'repair_verified',m.repaired_capability_receipt_sha256 is not null,
  'original_customer_job_completed',false,'installation_authorized_by_read',false,
  'external_action_authorized_by_read',false,'production_changed',false,
  'created_at',m.created_at
 ) order by m.created_at desc),'[]'::jsonb) into items
 from (select * from reality_internal.owner_internal_maintenance_jobs_v1
       where owner_id=p_owner_id order by created_at desc limit 50) m;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
  'owner_id',p_owner_id,'read_only',true,
  'count',pg_catalog.jsonb_array_length(items),'items',items,
  'shift_started_by_read',false,'owner_authority_granted_by_read',false,
  'customer_jobs_completed_by_read',0,'production_changed',false);
end $fn$;
revoke execute on function public.reality_read_owner_internal_maintenance_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_internal_maintenance_v1(uuid)
 to service_role;

-- Same EXISTING owner-shift watchdog; no second scheduler and no new shift.
do $wake$
declare j_id bigint; old_command text;
begin
 select jobid,command into strict j_id,old_command from cron.job
 where jobname='reality-governed-wake-watchdog-v1'
   and active=true and schedule='* * * * *'
   and command like '%observe_qualified_employee_work_blockers_v1%'
   and command like '%watchdog_guarded_preview_self_repair_v1%';
 if position('observe_verified_internal_maintenance_work_v1' in old_command)=0 then
  perform cron.alter_job(j_id,command=>old_command||
   E'\nSELECT reality_internal.observe_verified_internal_maintenance_work_v1();');
 end if;
end $wake$;
