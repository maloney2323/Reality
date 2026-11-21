-- Governed self-inquiry: a failed investigation is an unresolved work obligation,
-- not a terminal exit or a new original-job authorization.
-- Applies to the EXISTING signed preview worker, not a second cron/shift.
-- All attempts retain the original owner, shift, incident, evidence and lease history.

alter table reality_internal.owner_shift_continuity_incidents_v1
 add column if not exists investigation_attempts integer not null default 0
  check(investigation_attempts between 0 and 3),
 add column if not exists next_investigation_at timestamptz,
 add column if not exists investigation_failure_history jsonb not null
  default '[]'::jsonb
  check(jsonb_typeof(investigation_failure_history)='array');

-- Preserve the first failed attempt already present in Reality's live ledger.
update reality_internal.owner_shift_continuity_incidents_v1
set investigation_attempts=1,
 investigation_failure_history=pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
  'attempt',1,'failure_reason',coalesce(limitations,'MODEL_PROOF_UNAVAILABLE'),
  'failed_at',investigation_claimed_at,'lease_id',investigation_lease_id)),
 next_investigation_at=clock_timestamp()+interval '2 minutes'
where phase='BLOCKED_NEEDS_EVIDENCE'
 and investigation_claimed_at is not null and investigation_attempts=0;

-- Claim one evidence-bound incident: detected OR a previously failed inquiry.
-- Maximum three attempts, cooldown and lock; never retry a settled original.
CREATE OR REPLACE FUNCTION public.reality_claim_next_shift_continuity_investigation_v1(p_shift_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 s record;
begin
 if current_user<>'service_role' or p_shift_id is null then
  raise exception 'CONTINUITY_INVESTIGATION_SIGNED_SERVICE_REQUIRED';end if;
 select a.owner_id,a.shift_id into s
 from reality_internal.governed_employee_shifts_v1 a
 join reality_internal.governed_employee_shift_worker_pulses_v1 wake
  on wake.shift_id=a.shift_id and wake.owner_id=a.owner_id
 where a.shift_id=p_shift_id and a.status in
   ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and a.closed_at is null and a.authorized_at is not null
   and a.planned_start_at<=clock_timestamp()
   and a.planned_end_at>clock_timestamp()
   and wake.last_worker_status='WAKE_RECEIVED'
   and wake.last_worker_seen_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_CURRENT_SIGNED_SHIFT_CONTINUITY_SCOPE',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where shift_id=p_shift_id and owner_id=s.owner_id
  and phase in ('DETECTED','BLOCKED_NEEDS_EVIDENCE')
  and investigation_attempts<3
  and (next_investigation_at is null or next_investigation_at<=clock_timestamp())
 order by first_detected_at limit 1 for update skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_DETECTED_SHIFT_CONTINUITY_INCIDENT',
  'model_inquiry_authorized',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='INVESTIGATION_CLAIMED',investigation_lease_id=gen_random_uuid(),
  investigation_claimed_at=clock_timestamp(),
  investigation_attempts=investigation_attempts+1,
  next_investigation_at=null
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',(select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;

-- Record why Reality's investigation failed, and permit a bounded re-entry.
CREATE OR REPLACE FUNCTION public.reality_block_shift_continuity_investigation_v1(p_owner_id uuid, p_incident_id uuid, p_lease_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
begin
 if current_user<>'service_role' or p_owner_id is null
   or p_incident_id is null or p_lease_id is null
   or p_reason not in ('INDEPENDENT_SOURCE_UNAVAILABLE','MODEL_PROOF_UNAVAILABLE',
    'MODEL_PROVIDER_AUTH_REJECTED','MODEL_RATE_LIMITED',
    'MODEL_PROVIDER_TEMPORARY_FAILURE','MODEL_PROVIDER_REJECTED',
    'MODEL_OUTPUT_UNVERIFIED','SIGNED_WORKER_OR_MODEL_RECEIPT_MISSING')
 then raise exception 'CONTINUITY_INVESTIGATION_BLOCKED_EXACT_OWNER_REQUIRED';end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',limitations=p_reason,
  next_investigation_at=case when investigation_attempts<3
   then clock_timestamp()+make_interval(mins=>case when investigation_attempts=1 then 2 else 10 end)
   else null end,
  investigation_failure_history=investigation_failure_history||
   pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'attempt',investigation_attempts,'failure_reason',p_reason,
    'failed_at',clock_timestamp(),'lease_id',p_lease_id))
 where owner_id=p_owner_id and incident_id=p_incident_id
  and investigation_lease_id=p_lease_id and phase='INVESTIGATION_CLAIMED'
 returning * into i;
 if not found then raise exception 'CONTINUITY_INVESTIGATION_BLOCK_LEASE_STALE';end if;
 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_INVESTIGATION_BLOCKED_NEEDS_PROOF',
  'investigation_attempts',i.investigation_attempts,
  'automatic_reinvestigation_eligible',i.investigation_attempts<3,
  'next_investigation_at',i.next_investigation_at,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$
;

-- A crashed worker is also a failure needing diagnosis, not a silent dead end.
CREATE OR REPLACE FUNCTION reality_internal.reconcile_shift_continuity_investigation_claims_v1()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if current_user<>'postgres' then raise exception
  'SHIFT_CONTINUITY_CLAIM_WATCHDOG_REQUIRED';end if;
 update reality_internal.owner_shift_continuity_incidents_v1
 set phase='BLOCKED_NEEDS_EVIDENCE',limitations='SIGNED_WORKER_OR_MODEL_RECEIPT_MISSING',
  investigation_attempts=greatest(investigation_attempts,1),
  next_investigation_at=case when greatest(investigation_attempts,1)<3
   then clock_timestamp()+make_interval(mins=>case when investigation_attempts<=1 then 2 else 10 end)
   else null end,
  investigation_failure_history=investigation_failure_history||
   pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'attempt',greatest(investigation_attempts,1),
    'failure_reason','SIGNED_WORKER_OR_MODEL_RECEIPT_MISSING',
    'failed_at',clock_timestamp(),'lease_id',investigation_lease_id))
 where phase='INVESTIGATION_CLAIMED'
  and investigation_claimed_at<clock_timestamp()-interval '8 minutes';
 get diagnostics n=row_count;
 return 'SHIFT_CONTINUITY_INQUIRY_CLAIMS_FENCED_'||n;
end $function$
;

-- Owner Chat / Universe reads the failure history and next attempt as observed facts.
CREATE OR REPLACE FUNCTION public.reality_read_owner_shift_continuity_incidents_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'SHIFT_CONTINUITY_READ_EXACT_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'shift_id',i.shift_id,'kind',i.kind,
  'phase',i.phase,'error_summary',i.error_summary,
  'investigation_attempts',i.investigation_attempts,
  'next_investigation_at',i.next_investigation_at,
  'automatic_reinvestigation_eligible',
   i.phase='BLOCKED_NEEDS_EVIDENCE' and i.investigation_attempts<3,
  'investigation_failure_history',i.investigation_failure_history,
  'evidence_sha256',i.evidence_sha256,'first_detected_at',i.first_detected_at,
  'last_observed_at',i.last_observed_at,
  'assigned_employee',i.assigned_employee,
  'independent_reviewer',i.independent_reviewer,
  'diagnosis',i.diagnosis,
  'proposed_upgrade',i.proposed_upgrade,
  'independent_test_requirement',i.independent_test_requirement,
  'limitations',i.limitations,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'recovery_receipt_sha256',i.recovery_receipt_sha256,
  'recovered_at',i.recovered_at,
  'resolved_worker_run_id',i.resolved_worker_run_id,
  'resolved_inquiry_claim_id',i.resolved_inquiry_claim_id,
  'recovery_attribution',i.recovery_attribution,
  'repair_executed',i.repair_executed,
  'installation_authorized',i.installation_authorized,
  'production_changed',i.production_changed,
  'next_action',case
   when i.phase='DETECTED' then
    'Reality detected stalled authorized work. An employee investigation will be claimed on the next signed worker wake.'
   when i.phase='INVESTIGATION_CLAIMED' then
    'Reality is investigating its observed stall; independent repair proof is still required.'
   when i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' then
    'The assigned employee proposed a diagnosis and capability improvement. The separate reviewer must reproduce the failure and independently test the proposed repair under an existing valid warrant before an installation.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' and i.investigation_attempts<3 then
    'Reality has recorded the failed investigation and will re-investigate on the next eligible signed wake after its bounded cooldown.'
   when i.phase='BLOCKED_NEEDS_EVIDENCE' then
    'The investigation could not establish required proof; preserve the original shift and request the exact missing evidence or authority.'
   else
    'Work resumed with independent evidence. The observed recovery does not by itself demonstrate that Reality repaired its own code.'
  end
 ) order by i.last_observed_at desc),'[]'::jsonb)
 into rows from(
  select * from reality_internal.owner_shift_continuity_incidents_v1
  where owner_id=p_owner_id order by last_observed_at desc limit 8
 ) i;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',rows,'count',pg_catalog.jsonb_array_length(rows),
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false,'self_repair_proven',false);
end $function$
;

revoke execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 from public,anon,authenticated;
revoke execute on function public.reality_block_shift_continuity_investigation_v1(uuid,uuid,uuid,text)
 from public,anon,authenticated;
revoke execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_claim_next_shift_continuity_investigation_v1(uuid)
 to service_role;
grant execute on function public.reality_block_shift_continuity_investigation_v1(uuid,uuid,uuid,text)
 to service_role;
grant execute on function public.reality_read_owner_shift_continuity_incidents_v1(uuid)
 to service_role;
