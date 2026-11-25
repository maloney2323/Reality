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
  and kind<>'SIGNED_MAINTENANCE_BUILDER_FAILED'
  and phase in ('DETECTED','BLOCKED_NEEDS_EVIDENCE')
  and (investigation_attempts<3 or (investigation_attempts=3
   and remediation_granted_at is not null and remediation_used_at is null
   and remediation_release_commit~'^[a-f0-9]{40}$'
   and remediation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
   and remediation_ci_run_id is not null))
  and (kind<>'SIGNED_CHAT_RECOVERY_REVIEW_STALLED' or (
   source_evidence->>'investigation_only'='true'
   and evidence_sha256='sha256:'||pg_catalog.encode(
       extensions.digest(source_evidence::text,'sha256'),'hex')
   and exists(select 1 from reality_internal.genuine_capability_queue_v1 g
     where g.owner_id=owner_shift_continuity_incidents_v1.owner_id
      and g.trigger_id::text=source_evidence->>'trigger_id'
      and g.claim_id=owner_shift_continuity_incidents_v1.source_claim_id
      and g.original_work_id=source_evidence->>'original_work_id'
      and g.qualified_candidate->>'candidate_sha256'=source_evidence->>'candidate_sha256'
      and g.qualification_receipt->>'target_review_failure_receipt_sha256'=
       source_evidence->>'failure_receipt_sha256'
      and g.phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
      and g.quarantine_receipt_sha256 is null)))
  and (kind<>'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED' or (
   source_evidence->>'schema'='reality-signed-chat-syntax-incident-source-v1'
   and source_evidence->>'investigation_only'='true'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_syntax_exhaustion_evidence_v1((source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (kind<>'SIGNED_CHAT_RECOVERY_MODEL_REJECTED' or (
   source_evidence->>'schema'='reality-signed-rejected-source-incident-v1'
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'source_candidate_executed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_model_rejection_evidence_v1(
    (source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (kind<>'SIGNED_GOVERNED_TRANSITION_STALLED' or (
   source_evidence->>'schema'='reality-source-bound-unsettled-transition-v1'
   and source_evidence->>'transition_family'='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'provider_effect_known'='false'
   and source_evidence->>'provider_effect_replayed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_fenced_transition_evidence_v1(
    (source_evidence->>'trigger_id')::uuid,p_shift_id)))
  and (kind<>'SIGNED_INFRASTRUCTURE_PROVISIONING_FAILED' or (
   source_evidence->>'schema'='reality-signed-infrastructure-incident-v1'
   and source_evidence->>'owner_id'=s.owner_id::text
   and source_evidence->>'shift_id'=p_shift_id::text
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'root_cause_verified'='false'
   and source_evidence->>'original_job_completed'='false'
   and source_evidence->>'installation_authorized'='false'
   and source_evidence->>'production_changed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(source_evidence::text,'UTF8')),'hex')
   and exists(select 1 from reality_internal.final_loop_pr_source_plans_v1 p
    join reality_internal.governed_employee_completion_warrants_v1 w
      on w.shift_id=p.shift_id and w.owner_id=p.owner_id and w.plan_fingerprint=p.plan_fingerprint
    join reality_internal.owner_internal_maintenance_jobs_v1 m
      on m.owner_id=p.owner_id and m.claimed_shift_id=p.shift_id and m.source_ref=p.source_ref
    join reality_internal.owner_maintenance_signed_repair_handoffs_v1 h
      on h.maintenance_id=m.incident_id and h.owner_id=m.owner_id and h.shift_id=p.shift_id
      and h.source_ref=p.source_ref and h.existing_original_work_id=p.parent_original_work_id
    where p.owner_id=s.owner_id and p.shift_id=p_shift_id
     and p.parent_original_work_id=source_evidence->>'original_work_id'
     and p.source_ref=source_evidence->>'source_ref'
     and w.state='ACTIVE' and w.mode='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'
     and m.original_job_completed=false and m.production_changed=false
     and exists(select 1 from pg_catalog.jsonb_array_elements(w.source_scope) ws
       where ws->>'maintenance_id'=m.incident_id::text and ws->>'source_ref'=m.source_ref
        and ws->>'origin_shift_id'=m.origin_shift_id::text
        and ws->>'independent_review_receipt_sha256'=m.independent_review_receipt_sha256))))
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
  next_investigation_at=null,
  remediation_used_at=case when i.investigation_attempts=3 then clock_timestamp()
   else remediation_used_at end
 where incident_id=i.incident_id returning * into i;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_CONTINUITY_INVESTIGATION_CLAIMED',
  'owner_id',i.owner_id,'shift_id',i.shift_id,
  'incident_id',i.incident_id,'lease_id',i.investigation_lease_id,
  'kind',i.kind,'source_claim_id',i.source_claim_id,
  'source_evidence',i.source_evidence,
  'error_summary',i.error_summary,'evidence_sha256',i.evidence_sha256,
  'first_detected_at',i.first_detected_at,
  'investigation_attempt',i.investigation_attempts,
  'remediation_release_commit',i.remediation_release_commit,
  'remediation_ci_run_id',i.remediation_ci_run_id,
  'remediation_receipt_sha256',i.remediation_receipt_sha256,
  'previous_failure_reason',i.limitations,
  'failure_history',i.investigation_failure_history,
  'qualified_job_id',i.qualified_job_id,
  'failed_source_ref',coalesce(
   (select j.source_ref from reality_internal.owner_qualified_employee_evidence_jobs_v1 j
    where j.job_id=i.qualified_job_id and j.owner_id=i.owner_id and j.shift_id=i.shift_id),
   (select t.source_ref from reality_internal.employee_temporal_inquiries_v1 t
    where i.kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'
     and t.claim_id=i.source_claim_id and t.owner_id=i.owner_id
     and t.phase='RECORDED' and t.provider_proof_sha256~'^sha256:[a-f0-9]{64}$'
    limit 1)),
  'failed_job_phase',(select j.phase from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'failed_job_blocker',(select j.blocker from reality_internal.owner_qualified_employee_evidence_jobs_v1 j where j.job_id=i.qualified_job_id),
  'scope','SOURCE_BACKED_SHIFT_FAILURE_INVESTIGATION_ONLY',
  'model_inquiry_authorized',true,'new_original_jobs_created',0,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
