-- A verified format-contract correction may unlock the existing one-use
-- investigation remediation gate. Never reset attempts, admit work or install code.
create or replace function public.reality_read_shift_investigation_remediation_scope_v1(
 p_shift_id uuid,p_worker_run_id uuid)
returns jsonb language plpgsql set search_path='' as $f$
declare i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'CONTINUITY_REMEDIATION_SIGNED_WORKER_REQUIRED';end if;
 select inc.* into i from reality_internal.owner_shift_continuity_incidents_v1 inc
 join reality_internal.governed_employee_shifts_v1 s
   on s.shift_id=inc.shift_id and s.owner_id=inc.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 where inc.shift_id=p_shift_id and s.authorized_at is not null and s.closed_at is null
   and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
   and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and pulse.last_worker_status='WAKE_RECEIVED'
   and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes'
   and inc.phase='BLOCKED_NEEDS_EVIDENCE' and inc.investigation_attempts=3
   and inc.remediation_granted_at is null and inc.remediation_used_at is null
   and inc.repair_executed=false and inc.installation_authorized=false and inc.production_changed=false
   and pg_catalog.jsonb_array_length(inc.investigation_failure_history)=3
   and inc.investigation_failure_history->2->>'attempt'='3'
   and inc.investigation_failure_history->2->>'failure_reason'='MODEL_TEXT_BOUNDS_UNVERIFIED'
   and inc.investigation_failure_history->2->'validation_evidence'->>'schema'='reality-continuity-text-validation-v1'
   and (inc.investigation_failure_history->2->>'failed_at')::timestamptz<r.started_at
 order by inc.last_observed_at,inc.incident_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_EXHAUSTED_EVIDENCED_FORMAT_INVESTIGATION','execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','EXHAUSTED_FORMAT_INVESTIGATION_REMEDIATION_SCOPE','owner_id',i.owner_id,
  'shift_id',i.shift_id,'incident_id',i.incident_id,'kind',i.kind,
  'evidence_sha256',i.evidence_sha256,
  'failure_history_sha256','sha256:'||pg_catalog.encode(extensions.digest(i.investigation_failure_history::text,'sha256'),'hex'),
  'last_failure',i.investigation_failure_history->2,'worker_run_id',p_worker_run_id,
  'investigation_attempts',i.investigation_attempts,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $f$;

create or replace function public.reality_record_shift_investigation_remediation_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_incident_id uuid,p_failure_history_sha256 text,
 p_release_sha text,p_ci_run_id bigint,p_ci_job_id bigint,p_provider_proof jsonb)
returns jsonb language plpgsql set search_path='' as $f$
declare scope jsonb; evidence jsonb; receipt text; i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
begin
 if current_user<>'service_role' or p_release_sha is null or p_release_sha !~ '^[a-f0-9]{40}$'
  or p_ci_run_id is null or p_ci_run_id<1 or p_ci_job_id is null or p_ci_job_id<1
  or p_incident_id is null or p_failure_history_sha256 is null
  or p_failure_history_sha256 !~ '^sha256:[a-f0-9]{64}$'
  or p_provider_proof->>'schema' is distinct from 'reality-independent-format-contract-ci-v1'
  or p_provider_proof->>'head_sha' is distinct from p_release_sha
  or p_provider_proof->>'run_id' is distinct from p_ci_run_id::text
  or p_provider_proof->>'job_id' is distinct from p_ci_job_id::text
  or p_provider_proof->>'workflow_path' is distinct from '.github/workflows/reality-continuity-format-remediation.yml'
  or p_provider_proof->>'conclusion' is distinct from 'success'
  or p_provider_proof->>'job_conclusion' is distinct from 'success'
  or p_provider_proof->>'event' is distinct from 'push'
  or p_provider_proof->>'format_contract_verified' is distinct from 'true'
  or p_provider_proof->>'authority_expansion_verified_absent' is distinct from 'true'
  or p_provider_proof->>'failure_history_sha256' is distinct from p_failure_history_sha256
 then raise exception 'CONTINUITY_REMEDIATION_INDEPENDENT_PROVIDER_PROOF_REQUIRED'; end if;
 scope:=public.reality_read_shift_investigation_remediation_scope_v1(p_shift_id,p_worker_run_id);
 if scope->>'status' is distinct from 'EXHAUSTED_FORMAT_INVESTIGATION_REMEDIATION_SCOPE'
  or scope->>'incident_id' is distinct from p_incident_id::text
  or scope->>'failure_history_sha256' is distinct from p_failure_history_sha256
  or (p_provider_proof->>'completed_at')::timestamptz is null
  or (p_provider_proof->>'completed_at')::timestamptz <= (scope->'last_failure'->>'failed_at')::timestamptz
 then raise exception 'CONTINUITY_REMEDIATION_SOURCE_DRIFT';end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where incident_id=p_incident_id and shift_id=p_shift_id
  and owner_id=(scope->>'owner_id')::uuid
  and phase='BLOCKED_NEEDS_EVIDENCE' and investigation_attempts=3
  and remediation_granted_at is null and remediation_used_at is null
  and repair_executed=false and installation_authorized=false and production_changed=false
  and 'sha256:'||pg_catalog.encode(extensions.digest(investigation_failure_history::text,'sha256'),'hex')=p_failure_history_sha256
 for update;
 if not found then raise exception 'CONTINUITY_REMEDIATION_ALREADY_CONSUMED_OR_DRIFTED';end if;
 evidence:=pg_catalog.jsonb_build_object('schema','reality-verified-investigation-remediation-v1',
  'incident_id',i.incident_id,'owner_id',i.owner_id,'shift_id',i.shift_id,
  'evidence_sha256',i.evidence_sha256,'failure_history_sha256',p_failure_history_sha256,
  'last_failure',scope->'last_failure','release_sha',p_release_sha,'provider_proof',p_provider_proof,
  'worker_run_id',p_worker_run_id,'one_use_inquiry_only',true,
  'root_cause_verified',false,'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex');
 -- Evidence is retained on the last failure; attempt count and failure records are unchanged.
 update reality_internal.owner_shift_continuity_incidents_v1
 set remediation_release_commit=p_release_sha,remediation_ci_run_id=p_ci_run_id,
  remediation_receipt_sha256=receipt,remediation_granted_at=clock_timestamp(),
  investigation_failure_history=pg_catalog.jsonb_set(
    investigation_failure_history,array['2','independently_verified_remediation'],evidence,true)
 where incident_id=i.incident_id;
 return pg_catalog.jsonb_build_object('status','ONE_VERIFIED_FORMAT_REMEDIATION_INQUIRY_READY',
  'incident_id',i.incident_id,'shift_id',i.shift_id,'owner_id',i.owner_id,
  'remediation_release_commit',p_release_sha,'remediation_ci_run_id',p_ci_run_id,
  'remediation_receipt_sha256',receipt,'investigation_attempts',3,
  'execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $f$;
revoke all on function public.reality_read_shift_investigation_remediation_scope_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_read_shift_investigation_remediation_scope_v1(uuid,uuid) to service_role;
revoke all on function public.reality_record_shift_investigation_remediation_v1(uuid,uuid,uuid,text,text,bigint,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_shift_investigation_remediation_v1(uuid,uuid,uuid,text,text,bigint,bigint,jsonb) to service_role;
