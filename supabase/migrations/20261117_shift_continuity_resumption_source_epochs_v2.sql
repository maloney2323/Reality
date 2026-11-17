-- Independent post-observation recovery with exact claim/worker provenance.
create or replace function reality_internal.verify_owner_shift_stall_resumption_v1()
returns text language plpgsql security invoker set search_path to '' as $fn$
declare incident reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 proof record;hash text;count_verified int:=0;
begin
 if current_user<>'postgres' then raise exception
  'SHIFT_CONTINUITY_INDEPENDENT_RESUMPTION_WATCHDOG_REQUIRED';end if;
 for incident in select * from reality_internal.owner_shift_continuity_incidents_v1
  where phase in ('DETECTED','INVESTIGATION_CLAIMED',
   'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
   'BLOCKED_NEEDS_EVIDENCE')
  order by first_detected_at for update skip locked
 loop
  select r.run_id signed_worker_id,t.claim_id original_inquiry_id
   into proof
  from reality_internal.employee_temporal_inquiries_v1 t
  join reality_internal.employee_discovery_observations_v1 d
   on d.owner_id=t.owner_id and d.employee=t.employee
    and d.source_ref=t.source_ref and d.evidence_sha256=t.evidence_sha256
  join reality_internal.signed_worker_actual_runs_v1 r
   on r.status='COMPLETED'
    and r.worker_stage='WORKER_RESPONSE_PUBLICATION'
    and r.started_at>incident.first_detected_at
    and r.finished_at is not null and r.finished_at<=clock_timestamp()
    and t.finished_at between r.started_at and r.finished_at
  where t.owner_id=incident.owner_id and t.phase='RECORDED'
   and t.source_scan_at<=incident.first_detected_at
   and t.finished_at>=incident.first_detected_at
   and t.model_response_id ~ '^resp_[A-Za-z0-9_-]{4,160}$'
   and t.provider_proof_sha256 ~ '^sha256:[a-f0-9]{64}$'
   and ((incident.kind='ELIGIBLE_WORK_NO_DISPATCH'
       and t.claimed_at>=incident.first_detected_at)
     or (incident.kind='EMPLOYEE_INQUIRY_CLAIM_STALE'
       and t.claim_id=incident.source_claim_id
       and t.claimed_at<=incident.first_detected_at))
  order by t.finished_at asc limit 1;
  if not found then continue;end if;
  hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(
    incident.incident_id::text||':'||proof.signed_worker_id::text||
    ':'||proof.original_inquiry_id::text||
    ':WORK_RESUMED_BUT_SELF_REPAIR_UNPROVEN','UTF8')),'hex');
  update reality_internal.owner_shift_continuity_incidents_v1
  set phase='RECOVERED_AFTER_OBSERVATION',
   resolved_worker_run_id=proof.signed_worker_id,
   resolved_inquiry_claim_id=proof.original_inquiry_id,
   recovery_attribution='WORK_RESUMED_AFTER_OBSERVATION_SELF_REPAIR_UNPROVEN',
   recovery_receipt_sha256=hash,recovered_at=clock_timestamp()
  where incident_id=incident.incident_id;
  count_verified:=count_verified+1;
 end loop;
 return 'SOURCE_BACKED_SHIFT_STALL_WORK_RESUMPTIONS_VERIFIED_'||count_verified;
end $fn$;

create or replace function public.reality_read_owner_shift_continuity_incidents_v1(
 p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'SHIFT_CONTINUITY_READ_EXACT_OWNER_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'incident_id',i.incident_id,'shift_id',i.shift_id,'kind',i.kind,
  'phase',i.phase,'error_summary',i.error_summary,
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
end $fn$;
