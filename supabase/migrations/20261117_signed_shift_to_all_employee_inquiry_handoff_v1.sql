-- Complete ordinary signed-shift -> existing all-employee source inquiry
-- handoff without granting any new original work or external write authority.
-- The signed worker already holds the owner-authorized exact shift, and this
-- service-only readback validates the same recorded wake/shift identity.
create or replace function public.reality_read_current_signed_employee_inquiry_scope_v1(
 p_shift_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare s record; due_count int; now_at timestamptz:=clock_timestamp();
begin
 if current_user<>'service_role' or p_shift_id is null
 then raise exception 'EMPLOYEE_INQUIRY_SIGNED_WORKER_SERVICE_REQUIRED';end if;
 select a.shift_id,a.owner_id,a.plan_fingerprint,a.status into s
 from reality_internal.governed_employee_shifts_v1 a
 join reality_internal.governed_employee_shift_worker_pulses_v1 wake
  on wake.shift_id=a.shift_id and wake.owner_id=a.owner_id
 where a.shift_id=p_shift_id
  and a.authorized_at is not null and a.closed_at is null
  and a.planned_start_at<=now_at
  and (a.planned_end_at='infinity'::timestamptz or a.planned_end_at>now_at)
  and a.status in ('QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
  and a.plan_fingerprint ~ '^sha256:[a-f0-9]{64}$'
  and wake.last_worker_status='WAKE_RECEIVED'
  and wake.last_worker_seen_at>=now_at-interval '3 minutes'
  and wake.last_worker_seen_at<=now_at
  and exists(
   select 1 from reality_internal.governed_employee_shift_steps_v1 t
   where t.shift_id=a.shift_id and t.step_index between 2 and 5
     and t.source_ref ~
      '^https://github[.]com/maloney2323/Reality/(issues|pull|actions/runs)/[1-9][0-9]*$'
  );
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_CURRENT_SIGNED_EMPLOYEE_INQUIRY_SCOPE',
   'owner_verified',false,'investigation_authorized',false,
   'original_job_created',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 end if;
 select count(*) into due_count
 from reality_internal.employee_discovery_observations_v1 o
 join reality_internal.employee_discovery_role_coverage_v1 c
  on c.owner_id=o.owner_id and c.employee=o.employee
 where o.owner_id=s.owner_id and
  o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
  and o.qualified_job_created=false and o.shift_authorized=false
  and o.installation_authorized=false and o.production_changed=false
  and c.execution_authorized=false and c.qualified_jobs=0
  and c.checked_at>=now_at-interval '12 hours'
  and o.last_reconciled_at>=now_at-interval '12 hours'
  and o.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and (o.source_ref ~ '^https://github[.]com/[^/]+/[^/]+/issues/[1-9][0-9]*$'
    or o.source_ref ~ '^https://github[.]com/[^/]+/[^/]+/pull/[1-9][0-9]*$')
  and not exists(select 1
    from reality_internal.employee_temporal_inquiries_v1 prev
    where prev.owner_id=o.owner_id and prev.employee=o.employee
      and prev.source_ref=o.source_ref
      and prev.evidence_sha256=o.evidence_sha256);
 return pg_catalog.jsonb_build_object(
  'status',case when due_count>0 then
    'OWNER_SIGNED_EMPLOYEE_INQUIRY_SCOPE_ACTIVE'
    else 'NO_ELIGIBLE_SIGNED_EMPLOYEE_INQUIRY_SOURCE' end,
  'owner_id',s.owner_id,'shift_id',s.shift_id,
  'plan_fingerprint',s.plan_fingerprint,
  'due_source_count',due_count,
  'owner_verified',true,
  'investigation_authorized',due_count>0,
  'source_only',true,
  'original_job_created',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_current_signed_employee_inquiry_scope_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_current_signed_employee_inquiry_scope_v1(uuid) to service_role;

-- Reuse existing source-based model investigations. Do NOT invent a fixed
-- job list or route by employee name; promote under-served roles across the
-- eight existing employee identities while keeping source evidence exact.
CREATE OR REPLACE FUNCTION public.reality_claim_owner_employee_time_inquiry_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s record; v reality_internal.employee_temporal_inquiries_v1%rowtype;
begin
 if current_user <> 'service_role' or p_owner_id is null then
  raise exception 'TIME_INQUIRY_SERVICE_OWNER_REQUIRED';end if;
 -- The already reconciled owner discovery inventory is the source of truth.
 -- A source may be reviewed only while its role inventory is fresh.
 select o.* into s
 from reality_internal.employee_discovery_observations_v1 o
 join reality_internal.employee_discovery_role_coverage_v1 c
  on c.owner_id=o.owner_id and c.employee=o.employee
 where o.owner_id=p_owner_id
  and o.disposition in ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED')
  and o.qualified_job_created=false and o.shift_authorized=false
  and o.installation_authorized=false and o.production_changed=false
  and c.execution_authorized=false and c.qualified_jobs=0
  and c.checked_at>=clock_timestamp()-interval '12 hours'
  and o.last_reconciled_at>=clock_timestamp()-interval '12 hours'
  and o.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
  and (o.source_ref ~ '^https://github.com/[^/]+/[^/]+/issues/[1-9][0-9]*$'
    or o.source_ref ~ '^https://github.com/[^/]+/[^/]+/pull/[1-9][0-9]*$')
  and not exists (
   select 1 from reality_internal.employee_temporal_inquiries_v1 z
   where z.owner_id=o.owner_id and z.employee=o.employee
    and z.source_ref=o.source_ref and z.evidence_sha256=o.evidence_sha256)
 order by
 -- Favor employees that have least received SOURCE-BACKED investigation,
 -- not alphabetic first-come monopolization. Current eligible source
 -- identity and provider proof checks remain unchanged.
 (select count(*) from reality_internal.employee_temporal_inquiries_v1 z
   where z.owner_id=o.owner_id and z.employee=o.employee
     and z.phase='RECORDED') asc,
 o.last_reconciled_at desc,o.employee,o.source_ref
 limit 1 for update of o skip locked;
 if not found then return jsonb_build_object(
  'status','NO_FRESH_UNSETTLED_EMPLOYEE_INQUIRY_SOURCE',
  'model_called',false,'new_original_jobs_created',0,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 insert into reality_internal.employee_temporal_inquiries_v1(
  owner_id,employee,source_ref,evidence_sha256,source_scan_at)
 values(s.owner_id,s.employee,s.source_ref,s.evidence_sha256,s.last_reconciled_at)
 on conflict do nothing returning * into v;
 if not found then return jsonb_build_object(
  'status','SOURCE_INQUIRY_ALREADY_CLAIMED_NO_REPLAY',
  'model_called',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 return jsonb_build_object(
  'status','OWNER_SOURCE_INQUIRY_CLAIMED','owner_id',v.owner_id,
  'employee',v.employee,'source_ref',v.source_ref,
  'source_title',s.title,'source_family',s.source_family,
  'evidence_sha256',v.evidence_sha256,'claim_id',v.claim_id,
  'source_scan_at',v.source_scan_at,
  'model_call_leased',true,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
end $function$

