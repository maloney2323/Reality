
-- Previously terminal signed Chat source-draft rejection is a first-class,
-- immutable, independently observable Continuity incident. It is not a
-- repeatable approval or executable model instruction.
alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v1_kind_check;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_incidents_v1_kind_check
 check(kind in ('ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED','EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'SIGNED_SHIFT_REPEATED_NO_PROGRESS','SIGNED_CHAT_RECOVERY_REVIEW_STALLED',
 'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED','SIGNED_CHAT_RECOVERY_MODEL_REJECTED'));

create or replace function reality_internal.signed_chat_model_rejection_evidence_v1(
 p_trigger uuid,p_shift uuid) returns jsonb
language plpgsql security invoker set search_path='' as $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 h record; negative jsonb; basis jsonb; failure_sha text; env_sha text;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_MODEL_REJECTION_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED' and claim_id is not null
 and claim_expires_at<clock_timestamp()
 and qualified_candidate is null and quarantine_receipt_sha256 is null;
 if not found then return null;end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
 and m.role='user' and m.user_id=w.owner_id
 and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
 and w.conversation_id=q.conversation_id
 and w.message_sha256=q.source_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->>'original_work_id'=q.original_work_id
 and w.development->>'phase'='CI_VERIFIED'
 and w.development->>'original_job_completed'='false'
 and w.development->>'installation_authorized'='false'
 and w.development->>'production_changed'='false'
 and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256;
 if not found then return null;end if;
 negative:=q.qualification_receipt->'negative_capability_memory';
 env_sha:=negative->>'source_env_fingerprint';
 if coalesce(q.source_ref,'')<>'supabase:reality_chat_messages:'||q.source_message_id::text
 or q.original_work_id !~ '^work:[a-f0-9]{32}$'
 or q.recovery_spec_sha256 is distinct from 'sha256:'||
  pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or q.recovery_spec->>'original_work_id' is distinct from q.original_work_id
 or q.recovery_spec->>'signed_message_id' is distinct from q.source_message_id::text
 or q.recovery_spec->>'source_sha256' is distinct from q.source_sha256
 or q.recovery_spec->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or negative->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or negative->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or negative->>'same_candidate_retry_forbidden' is distinct from 'true'
 or coalesce(negative->>'reason','') !~ '^[A-Z][A-Z0-9_]{4,110}$'
 or env_sha !~ '^[a-f0-9]{40}$'
 or env_sha is distinct from q.qualification_receipt->>'claim_release_sha'
 or q.qualification_receipt->>'claim_worker_source' is distinct from 'existing-signed-worker'
 or q.qualification_receipt->>'source_original_phase' is distinct from 'CI_VERIFIED'
 or q.recovery_spec->>'installation_authorized' is distinct from 'false'
 or q.recovery_spec->>'original_job_completed' is distinct from 'false'
 or q.recovery_spec->>'production_changed' is distinct from 'false'
 or not reality_internal.signed_chat_goal_shift_lineage_v1(
  pg_catalog.jsonb_build_object('owner_id',q.owner_id,'attempt_id',q.trigger_id,
   'original_work_id',q.original_work_id,'source_ref',q.source_ref,
   'source_sha256',q.source_sha256,
   'source_proof_sha256',q.blocker_receipt_sha256,
   'source_original_shift_id',h.shift_id),p_shift)
 then return null;end if;
 basis:=pg_catalog.jsonb_build_object(
  'trigger_id',q.trigger_id,'claim_id',q.claim_id,'rejection_phase',q.phase,
  'rejected_at',q.updated_at,'original_work_id',q.original_work_id,
  'source_sha256',q.source_sha256,'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,'negative_memory',negative);
 failure_sha:='sha256:'||pg_catalog.encode(extensions.digest(basis::text,'sha256'),'hex');
 return pg_catalog.jsonb_build_object(
  'schema','reality-signed-rejected-source-incident-v1',
  'original_work_id',q.original_work_id,'original_source_shift_id',h.shift_id,
  'trigger_id',q.trigger_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,
  'source_claim_id',q.claim_id,'source_message_id',q.source_message_id,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'source_release_sha',env_sha,
  'rejection_reason',negative->>'reason','rejection_receipt_sha256',failure_sha,
  'rejection_evidence',basis,'rejection_at',q.updated_at,
  'compiler_target_path','src/reality-chat-new-development-worker-v1.js',
  'observed_phase',q.phase,'root_cause_verified',false,
  'investigation_only',true,'source_candidate_executed',false,
  'new_original_admitted',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
end $function$;
revoke all on function reality_internal.signed_chat_model_rejection_evidence_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_model_rejection_evidence_v1(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION public.reality_observe_signed_chat_review_incident_v1(p_shift_id uuid, p_worker_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare sh record; q record; last_failure jsonb; prior_failure jsonb;
 evidence jsonb; h text; iid uuid; v_count int:=0;
begin
 if current_user<>'service_role' or p_shift_id is null or p_worker_run_id is null
 then raise exception 'CHAT_REVIEW_INCIDENT_SIGNED_SERVICE_REQUIRED';end if;
 select s.owner_id,s.shift_id into sh
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where s.shift_id=p_shift_id and s.closed_at is null
  and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.authorized_at is not null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes';
 if not found then raise exception 'CHAT_REVIEW_INCIDENT_CURRENT_WAKE_REQUIRED';end if;
 for q in
  select g.*,w.shift_id as source_shift_id
  from reality_internal.genuine_capability_queue_v1 g
  join reality_internal.chat_work_handoffs_v1 w
   on w.message_id=g.source_message_id and w.owner_id=g.owner_id
   and w.conversation_id=g.conversation_id
   and w.message_sha256=g.source_sha256
   and w.development->>'original_work_id'=g.original_work_id
   and w.development->>'phase'='CI_VERIFIED'
   and w.development->>'original_job_completed'='false'
   and w.development->>'installation_authorized'='false'
   and w.development->>'production_changed'='false'
   and w.development->'evidence'->>'goal_gap_receipt_sha256'=g.blocker_receipt_sha256
  join public.reality_chat_messages msg on msg.id=w.message_id
   and msg.user_id=w.owner_id and msg.role='user'
   and msg.conversation_id=w.conversation_id and msg.request_id=w.request_id
   and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(msg.content,'UTF8')),'hex')
  where g.owner_id=sh.owner_id
   and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and g.phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED'
   and g.quarantine_receipt_sha256 is null
   and g.qualification_receipt->>'target_review_retry_count'='2'
   and g.qualification_receipt->>'target_review_next_action'=
       'STRUCTURED_PROVIDER_OR_SOURCE_ESCALATION_REQUIRED'
   and g.qualification_receipt->>'target_review_receipt_sha256' is null
   and g.recovery_spec_sha256='sha256:'||pg_catalog.encode(
     extensions.digest(g.recovery_spec::text,'sha256'),'hex')
   and g.qualified_candidate->>'candidate_sha256'='sha256:'||
     pg_catalog.encode(extensions.digest(
      (g.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
   and g.qualified_candidate->>'original_work_id'=g.original_work_id
   and g.qualified_candidate->>'spec_sha256'=g.recovery_spec_sha256
   and g.qualified_candidate->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
   and g.qualification_receipt->>'target_review_failure_receipt_sha256'=
    'sha256:'||pg_catalog.encode(extensions.digest(
     (g.qualification_receipt->'target_review_last_failure')::text,'sha256'),'hex')
   and pg_catalog.jsonb_typeof(g.qualification_receipt->'target_review_failure_history')='array'
  order by g.updated_at,g.trigger_id limit 8
 loop
  if pg_catalog.jsonb_array_length(q.qualification_receipt->'target_review_failure_history')<>2
    then continue;end if;
  prior_failure:=q.qualification_receipt->'target_review_failure_history'->0;
  last_failure:=q.qualification_receipt->'target_review_failure_history'->1;
  if last_failure is distinct from q.qualification_receipt->'target_review_last_failure'
    or prior_failure->>'retry_count' is distinct from '1'
    or last_failure->>'retry_count' is distinct from '2'
    or prior_failure->>'original_work_id' is distinct from q.original_work_id
    or last_failure->>'original_work_id' is distinct from q.original_work_id
    or prior_failure->>'trigger_id' is distinct from q.trigger_id::text
    or last_failure->>'trigger_id' is distinct from q.trigger_id::text
    or prior_failure->>'source_sha256' is distinct from q.source_sha256
    or last_failure->>'source_sha256' is distinct from q.source_sha256
    or prior_failure->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
    or last_failure->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
    or prior_failure->>'candidate_sha256' is distinct from q.qualified_candidate->>'candidate_sha256'
    or last_failure->>'candidate_sha256' is distinct from q.qualified_candidate->>'candidate_sha256'
    or prior_failure->>'installation_authorized' is distinct from 'false'
    or last_failure->>'installation_authorized' is distinct from 'false'
    or prior_failure->>'original_job_completed' is distinct from 'false'
    or last_failure->>'original_job_completed' is distinct from 'false'
    or prior_failure->>'production_changed' is distinct from 'false'
    or last_failure->>'production_changed' is distinct from 'false'
    or coalesce(prior_failure->>'expired_worker_run_id',prior_failure->>'review_worker_run_id')
      is not distinct from coalesce(last_failure->>'expired_worker_run_id',last_failure->>'review_worker_run_id')
    or not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
     where r.run_id::text=coalesce(prior_failure->>'expired_worker_run_id',prior_failure->>'review_worker_run_id')
      and r.finished_at is not null and r.started_at<clock_timestamp())
    or not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r
     where r.run_id::text=coalesce(last_failure->>'expired_worker_run_id',last_failure->>'review_worker_run_id')
      and r.finished_at is not null and r.started_at<clock_timestamp())
    then continue;end if;
  evidence:=pg_catalog.jsonb_build_object(
   'schema','reality-signed-chat-review-incident-source-v1',
   'original_work_id',q.original_work_id,'original_source_shift_id',q.source_shift_id,
   'trigger_id',q.trigger_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,
   'source_claim_id',q.claim_id,'blocker_receipt_sha256',q.blocker_receipt_sha256,
   'spec_sha256',q.recovery_spec_sha256,
   'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
   'candidate_base_sha',q.qualified_candidate->>'base_sha',
   'candidate_target',q.qualified_candidate->>'target_path',
   'failure_receipt_sha256',q.qualification_receipt->>'target_review_failure_receipt_sha256',
   'failure_history',q.qualification_receipt->'target_review_failure_history',
   'reviewer_source_path','src/reality-signed-chat-recovery-target-review-v1.js',
   'review_claim_rpc','reality_claim_next_signed_chat_recovery_target_review_v1',
   'review_verdict_rpc','reality_record_signed_chat_recovery_target_review_v1',
   'review_failure_rpc','reality_record_signed_chat_recovery_target_review_failure_v1',
   'observed_phase',q.phase,'root_cause_verified',false,
   'investigation_only',true,'original_job_completed',false,
   'installation_authorized',false,'production_changed',false);
  h:=pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex');
  -- Scope is the existing worker's owner investigation capacity only.
  -- The source original's historical shift and all authority remain unchanged.
  if exists(select 1 from reality_internal.owner_shift_continuity_incidents_v1 i
    where i.owner_id=q.owner_id and i.kind='SIGNED_CHAT_RECOVERY_REVIEW_STALLED'
     and i.evidence_key=h) then continue;end if;
  insert into reality_internal.owner_shift_continuity_incidents_v1(
    owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
    error_summary,observation_count,phase,last_observed_at,source_evidence)
  values(q.owner_id,sh.shift_id,'SIGNED_CHAT_RECOVERY_REVIEW_STALLED',
    h,'sha256:'||h,q.claim_id,
    left('Independent candidate review failed twice for '||q.original_work_id||
     '. Exact review failure receipts are preserved. Investigate reviewer contract/provider handoff; root cause unknown. Resume same original only after independent proof.',280),
    2,'DETECTED',clock_timestamp(),evidence)
  on conflict(owner_id,shift_id,kind,evidence_key) do nothing
  returning incident_id into iid;
  if found then v_count:=v_count+1;end if;
 end loop;
 -- Observe exhausted syntax candidates through the very same signed wake.
 for q in select g.trigger_id,g.owner_id,g.claim_id,g.original_work_id
  from reality_internal.genuine_capability_queue_v1 g where g.owner_id=sh.owner_id
  and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and g.qualification_receipt->>'syntax_next_action'='INVESTIGATE_REPEATED_CANDIDATE_SYNTAX_FAILURE'
  order by g.updated_at,g.trigger_id limit 8 loop
  evidence:=reality_internal.signed_chat_syntax_exhaustion_evidence_v1(q.trigger_id,sh.shift_id);
  if evidence is null then continue;end if;
  h:=pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
    owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
    error_summary,observation_count,phase,last_observed_at,source_evidence)
   values(q.owner_id,sh.shift_id,'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED',h,'sha256:'||h,q.claim_id,
    'Two distinct independently parsed candidates are invalid while their pinned baselines parse. Investigate the compiler splice boundary, preserve original and all failure receipts, and require independent proof of a cause-specific correction.',
    2,'DETECTED',clock_timestamp(),evidence)
   on conflict(owner_id,shift_id,kind,evidence_key) do nothing returning incident_id into iid;
  if found then v_count:=v_count+1;end if;
 end loop;
 -- All typed, source-backed rejected Chat recovery drafts enter the SAME
 -- incident ledger and investigator. No reason-specific retry switch.
 for q in select g.trigger_id,g.owner_id,g.claim_id,g.original_work_id
  from reality_internal.genuine_capability_queue_v1 g
  where g.owner_id=sh.owner_id
  and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and g.phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED'
  and g.claim_expires_at<clock_timestamp()
  order by g.updated_at,g.trigger_id limit 8 loop
  evidence:=reality_internal.signed_chat_model_rejection_evidence_v1(q.trigger_id,sh.shift_id);
  if evidence is null then continue;end if;
  h:=pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
   error_summary,observation_count,phase,last_observed_at,source_evidence)
  values(q.owner_id,sh.shift_id,'SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
   h,'sha256:'||h,q.claim_id,
   left('An exact model-generated recovery candidate was independently rejected for '||
    q.original_work_id||'. Typed rejection and frozen spec are preserved. Investigate the source compiler; no replay is authorized.',280),
   1,'DETECTED',clock_timestamp(),evidence)
  on conflict(owner_id,shift_id,kind,evidence_key) do nothing returning incident_id into iid;
  if found then v_count:=v_count+1;end if;
 end loop;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_REVIEW_INCIDENTS_OBSERVED','worker_run_id',p_worker_run_id,
  'new_incident_count',v_count,'new_original_admitted',false,
  'new_shift_started',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $function$
;
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
end $function$
;


-- Source-family re-entry is not a second installer, original job or shift.
-- It is an independently attested continuation of the existing frozen
-- compiler specification AFTER a distinct signed investigation and CI proof.
create or replace function public.reality_read_signed_chat_model_rejection_reentry_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare sh record; q record; i record; evidence jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_REJECTION_REENTRY_SERVICE_ONLY';end if;
 if p_release_sha !~ '^[a-f0-9]{40}$' then
  return pg_catalog.jsonb_build_object('status','SIGNED_MODEL_REJECTION_RELEASE_UNVERIFIED');end if;
 select s.owner_id,r.started_at into sh from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r
  on r.run_id=p_worker_run_id and r.status='STARTED'
 where s.shift_id=p_shift_id
 and reality_internal.signed_chat_goal_active_shift_v1(s.owner_id,s.shift_id)
 and pulse.last_worker_status='WAKE_RECEIVED'
 and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
 and r.started_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_MODEL_REJECTION_CURRENT_WORKER');end if;
 for q in select g.trigger_id,g.original_work_id,g.owner_id,g.updated_at,
    g.recovery_spec_sha256,g.recovery_spec,g.qualification_receipt
  from reality_internal.genuine_capability_queue_v1 g
  where g.owner_id=sh.owner_id
   and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and g.phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED'
   and g.claim_expires_at<clock_timestamp()
   and g.qualified_candidate is null and g.quarantine_receipt_sha256 is null
  order by g.updated_at,g.trigger_id limit 16 loop
  evidence:=reality_internal.signed_chat_model_rejection_evidence_v1(q.trigger_id,p_shift_id);
  if evidence is null or evidence->>'source_release_sha' is not distinct from p_release_sha
   or coalesce((q.recovery_spec->>'model_rejection_revision_epoch')::int,0)>=4
   then continue;end if;
  select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
   where j.owner_id=q.owner_id and j.shift_id=p_shift_id
    and j.kind='SIGNED_CHAT_RECOVERY_MODEL_REJECTED'
    and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
    and j.source_evidence=evidence
    and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
    and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
    and j.assigned_function_id<>j.reviewer_function_id
    and j.investigated_at<sh.started_at
    and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
    and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
   order by j.investigated_at desc limit 1;
  if found then
   return pg_catalog.jsonb_build_object(
    'status','SIGNED_CHAT_REJECTED_ORIGINAL_REENTRY_INDEPENDENT_CI_DUE',
    'shift_id',p_shift_id,'worker_run_id',p_worker_run_id,
    'owner_id',q.owner_id,'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
    'rejection_reason',evidence->>'rejection_reason',
    'rejection_receipt_sha256',evidence->>'rejection_receipt_sha256',
    'rejected_at',q.updated_at,'prior_release_sha',evidence->>'source_release_sha',
    'release_sha',p_release_sha,'incident_id',i.incident_id,
    'investigation_receipt_sha256',i.investigation_receipt_sha256,
    'source_evidence_sha256',i.evidence_sha256,
    'spec_sha256',q.recovery_spec_sha256,
    'installation_authorized',false,'original_job_completed',false,
    'new_original_admitted',false,'production_changed',false);
  end if;
 end loop;
 return pg_catalog.jsonb_build_object('status','NO_INDEPENDENTLY_INVESTIGATED_SIGNED_MODEL_REJECTION_DUE',
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $function$;
revoke all on function public.reality_read_signed_chat_model_rejection_reentry_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_signed_chat_model_rejection_reentry_v1(uuid,uuid,text) to service_role;

create or replace function public.reality_reenter_signed_chat_model_rejection_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_trigger_id uuid,p_release_sha text,p_ci_proof jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $function$
declare scope jsonb;q reality_internal.genuine_capability_queue_v1%rowtype;
 i reality_internal.owner_shift_continuity_incidents_v1%rowtype;
 prior jsonb;rev integer;spec jsonb;spec_hash text;proof_hash text;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_REJECTION_REENTRY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 scope:=public.reality_read_signed_chat_model_rejection_reentry_v1(
  p_shift_id,p_worker_run_id,p_release_sha);
 if scope->>'status' is distinct from 'SIGNED_CHAT_REJECTED_ORIGINAL_REENTRY_INDEPENDENT_CI_DUE'
 or scope->>'trigger_id' is distinct from p_trigger_id::text
 or scope->>'original_work_id' is distinct from q.original_work_id
 or scope->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or q.phase is distinct from 'SIGNED_CHAT_RECOVERY_MODEL_REJECTED'
 or q.qualified_candidate is not null or q.quarantine_receipt_sha256 is not null
 or pg_catalog.jsonb_typeof(p_ci_proof) is distinct from 'object'
 or p_ci_proof->>'schema' is distinct from 'reality-independent-signed-rejection-reentry-ci-v1'
 or p_ci_proof->>'release_sha' is distinct from p_release_sha
 or coalesce(p_ci_proof->>'branch','') !~ '^(repair|reality)/[A-Za-z0-9/_-]{10,135}$'
 or p_ci_proof->>'branch' like '%..%' or p_ci_proof->>'branch' like '%//%'
 or p_ci_proof->>'branch' like 'reality/chat-recovery/%'
 or p_ci_proof->>'workflow' is distinct from '.github/workflows/reality-continuity-format-remediation.yml'
 or p_ci_proof->>'step' is distinct from 'Verify bounds and unchanged authority'
 or p_ci_proof->>'event' is distinct from 'push'
 or p_ci_proof->>'conclusion' is distinct from 'success'
 or p_ci_proof->>'job_conclusion' is distinct from 'success'
 or p_ci_proof->>'source_original_work_id' is distinct from q.original_work_id
 or p_ci_proof->>'rejection_receipt_sha256' is distinct from scope->>'rejection_receipt_sha256'
 or p_ci_proof->>'investigation_receipt_sha256' is distinct from scope->>'investigation_receipt_sha256'
 or p_ci_proof->>'candidate_executed' is distinct from 'false'
 or p_ci_proof->>'installation_authorized' is distinct from 'false'
 or p_ci_proof->>'original_job_completed' is distinct from 'false'
 or p_ci_proof->>'production_changed' is distinct from 'false'
 or coalesce(p_ci_proof->>'run_id','') !~ '^[1-9][0-9]{4,}$'
 or coalesce(p_ci_proof->>'job_id','') !~ '^[1-9][0-9]{4,}$'
 or coalesce(p_ci_proof->>'run_started_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
 or coalesce(p_ci_proof->>'run_completed_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
 then raise exception 'SIGNED_MODEL_REJECTION_EXACT_CI_OR_SOURCE_SCOPE_REQUIRED';end if;
 if (p_ci_proof->>'run_started_at')::timestamptz<q.updated_at
 or (p_ci_proof->>'run_completed_at')::timestamptz<=(p_ci_proof->>'run_started_at')::timestamptz
 then raise exception 'SIGNED_MODEL_REJECTION_CI_DID_NOT_VERIFY_CHANGED_SOURCE_AFTER_FAILURE';end if;
 select * into i from reality_internal.owner_shift_continuity_incidents_v1
 where incident_id=(scope->>'incident_id')::uuid
 and shift_id=p_shift_id and owner_id=q.owner_id
 and phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
 and evidence_sha256=scope->>'source_evidence_sha256'
 and investigation_receipt_sha256=scope->>'investigation_receipt_sha256'
 for update;
 if not found then raise exception 'SIGNED_MODEL_REJECTION_INVESTIGATION_STALE';end if;
 prior:=pg_catalog.jsonb_build_object(
  'spec',q.recovery_spec,'spec_sha256',q.recovery_spec_sha256,
  'rejected_claim_id',q.claim_id,'rejected_at',q.updated_at,
  'negative_capability_memory',q.qualification_receipt->'negative_capability_memory',
  'rejection_receipt_sha256',scope->>'rejection_receipt_sha256',
  'incident_id',i.incident_id,'incident_evidence_sha256',i.evidence_sha256,
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'investigation_diagnosis',i.diagnosis,
  'required_independent_test',i.independent_test_requirement,
  'ci_receipt',p_ci_proof,'no_replay',true,'new_original_admitted',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 rev:=coalesce((q.recovery_spec->>'model_rejection_revision_epoch')::int,0)+1;
 if rev not between 1 and 4 then raise exception 'SIGNED_MODEL_REJECTION_REVISION_LIMIT';end if;
 proof_hash:='sha256:'||pg_catalog.encode(extensions.digest(p_ci_proof::text,'sha256'),'hex');
 spec:=q.recovery_spec||pg_catalog.jsonb_build_object(
  'model_rejection_revision_epoch',rev,
  'prior_model_rejection_receipt_sha256',scope->>'rejection_receipt_sha256',
  'model_rejection_reason',scope->>'rejection_reason',
  'model_rejection_investigation_receipt_sha256',i.investigation_receipt_sha256,
  'model_rejection_investigation_diagnosis',i.diagnosis,
  'model_rejection_test_requirement',i.independent_test_requirement,
  'model_rejection_ci_receipt_sha256',proof_hash,
  'candidate_generation_policy','FROZEN_PINNED_FULL_MODULE_PARSE_REQUIRED',
  'full_goal_accepted',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
  set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
   claim_id=null,claim_expires_at=null,qualified_candidate=null,
   recovery_spec=spec,recovery_spec_sha256=spec_hash,
   frozen_suite_ref='recovery-spec:'||spec_hash,
   qualification_receipt=qualification_receipt||
    pg_catalog.jsonb_build_object(
     'prior_model_rejection_epoch',prior,
     'model_rejection_revision_epoch',rev,
     'model_rejection_ci_receipt_sha256',proof_hash,
     'reentry_recorded_at',clock_timestamp(),
     'next_action','CONTINUE_SAME_ORIGINAL_WITH_NEW_INDEPENDENTLY_TESTED_COMPILER'),
   updated_at=clock_timestamp()
 where trigger_id=p_trigger_id and phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED';
 if not found then raise exception 'SIGNED_MODEL_REJECTION_ATOMIC_REENTRY_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_MODEL_REJECTION_INDEPENDENTLY_QUALIFIED_SAME_ORIGINAL_REENTERED',
  'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
  'shift_id',p_shift_id,'incident_id',i.incident_id,
  'rejection_receipt_sha256',scope->>'rejection_receipt_sha256',
  'investigation_receipt_sha256',i.investigation_receipt_sha256,
  'ci_receipt_sha256',proof_hash,'revised_spec_sha256',spec_hash,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_reenter_signed_chat_model_rejection_v1(uuid,uuid,uuid,text,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_reenter_signed_chat_model_rejection_v1(uuid,uuid,uuid,text,jsonb)
 to service_role;
