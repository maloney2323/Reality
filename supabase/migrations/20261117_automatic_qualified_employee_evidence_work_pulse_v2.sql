-- Correct full worker lifecycle: a successfully finished worker pulse
-- is a valid recent signed proof, not evidence of no authorized shift.
-- No work is promoted without a current source-backed inquiry.
create or replace function reality_internal.qualify_owner_employee_evidence_jobs_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare n int;
begin
 if current_user<>'postgres' then raise exception
  'QUALIFICATION_TRUSTED_WATCHDOG_ROLE_REQUIRED';end if;
 -- The existing original-code repair warrant continues to be separately
 -- required. This creates ONLY immediately executable read-only evidence packs.
 with eligible as (
  select distinct on (s.owner_id,s.shift_id,i.employee,i.source_ref)
   s.owner_id,s.shift_id,i.claim_id,i.employee,i.source_ref,
   i.evidence_sha256,i.provider_proof_sha256,
   i.next_proof,i.investigation,i.finished_at
  from reality_internal.governed_employee_shifts_v1 s
  join reality_internal.employee_temporal_inquiries_v1 i
   on i.owner_id=s.owner_id
  join reality_internal.employee_discovery_observations_v1 d
   on d.owner_id=i.owner_id and d.employee=i.employee
    and d.source_ref=i.source_ref and d.evidence_sha256=i.evidence_sha256
  where s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp()
   and s.planned_end_at>clock_timestamp()
   and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and exists(select 1 from reality_internal.governed_employee_shift_worker_pulses_v1 w
    where w.shift_id=s.shift_id and w.owner_id=s.owner_id
      and w.last_worker_status in ('WAKE_RECEIVED','WAKE_COMPLETED')
      and (w.last_worker_status='WAKE_RECEIVED' or
       (w.last_worker_completed_at is not null and
        w.last_worker_completed_at>=w.last_worker_seen_at-interval '3 minutes'
        and w.last_worker_completed_at<=clock_timestamp()))
      and w.last_worker_seen_at>clock_timestamp()-interval '5 minutes')
   and i.phase='RECORDED'
   and i.finished_at>=s.authorized_at and i.finished_at<=clock_timestamp()
   and i.provider_checked_at>=s.authorized_at
   and i.provider_checked_at<=clock_timestamp()
   and i.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and i.evidence_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and i.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   and i.recommendation in ('INVESTIGATE_MORE','OWNER_REVIEW')
   and length(i.next_proof) between 15 and 1500
   and length(i.investigation) between 20 and 2500
   and i.source_ref ~ '^https://github[.]com/[^/]+/[^/]+/(issues|pull)/[1-9][0-9]*$'
   and d.qualified_job_created=false and d.installation_authorized=false
   and d.production_changed=false
   and d.source_observed_at<=i.provider_checked_at
  order by s.owner_id,s.shift_id,i.employee,i.source_ref,i.finished_at desc
 )
 insert into reality_internal.owner_qualified_employee_evidence_jobs_v1(
  owner_id,shift_id,inquiry_claim_id,employee,source_ref,
  discovery_evidence_sha256,inquiry_provider_sha256,objective,
  initial_investigation,qualification_receipt_sha256)
 select e.owner_id,e.shift_id,e.claim_id,e.employee,e.source_ref,
  e.evidence_sha256,e.provider_proof_sha256,e.next_proof,
  e.investigation,
  'sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   e.owner_id::text||':'||e.shift_id::text||':'||e.claim_id::text||
   ':'||e.source_ref||':'||e.provider_proof_sha256||
   ':QUALIFIED_CURRENT_SOURCE_EVIDENCE_PACK','UTF8')),'hex')
 from eligible e
 on conflict do nothing;
 get diagnostics n=row_count;
 return 'SOURCE_BACKED_EXECUTABLE_EVIDENCE_JOBS_QUALIFIED_'||n;
end $fn$;

