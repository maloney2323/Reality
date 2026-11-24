-- An exhausted candidate is a new source-bound incident, not another
-- execution attempt. Its failure proof is immutable across subsequent wakes.
alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v1_kind_check;
alter table reality_internal.owner_shift_continuity_incidents_v1 add constraint owner_shift_continuity_incidents_v1_kind_check
 check(kind in ('ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE','QUALIFIED_EVIDENCE_JOB_BLOCKED',
 'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED','SIGNED_SHIFT_REPEATED_NO_PROGRESS',
 'SIGNED_CHAT_RECOVERY_REVIEW_STALLED','SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'));

create or replace function reality_internal.signed_chat_syntax_exhaustion_evidence_v1(p_trigger uuid,p_shift uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q record; a jsonb;b jsonb; ar jsonb; ah text;bh text;prior_candidate jsonb;
begin
 if current_user<>'service_role' then raise exception 'SYNTAX_INCIDENT_SERVICE_ONLY';end if;
 select g.*,w.shift_id as source_shift_id into q
 from reality_internal.genuine_capability_queue_v1 g
 join reality_internal.chat_work_handoffs_v1 w on w.message_id=g.source_message_id and w.owner_id=g.owner_id
 and w.conversation_id=g.conversation_id and w.message_sha256=g.source_sha256
 and w.development->>'original_work_id'=g.original_work_id and w.development->>'phase'='CI_VERIFIED'
 and w.development->>'installation_authorized'='false' and w.development->>'original_job_completed'='false'
 and w.development->>'production_changed'='false' and w.development->'evidence'->>'goal_gap_receipt_sha256'=g.blocker_receipt_sha256
 join public.reality_chat_messages m on m.id=w.message_id and m.user_id=w.owner_id and m.role='user'
 and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
 where g.trigger_id=p_trigger and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and g.phase in ('SIGNED_CHAT_RECOVERY_TARGET_REVIEWED','SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
 and g.quarantine_receipt_sha256 is null
 and g.qualification_receipt->>'syntax_next_action'='INVESTIGATE_REPEATED_CANDIDATE_SYNTAX_FAILURE'
 and g.recovery_spec_sha256='sha256:'||pg_catalog.encode(extensions.digest(g.recovery_spec::text,'sha256'),'hex')
 and g.qualified_candidate->>'candidate_sha256'='sha256:'||pg_catalog.encode(extensions.digest((g.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 and g.qualified_candidate->>'original_work_id'=g.original_work_id
 and g.qualified_candidate->>'spec_sha256'=g.recovery_spec_sha256
 and g.qualified_candidate->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
 and g.claim_id is not null;
 if not found then return null;end if;
 ar:=q.qualification_receipt->'prior_syntax_epoch';a:=ar->'syntax_proof';b:=q.qualification_receipt->'syntax_proof';prior_candidate:=ar->'prior_candidate';
 ah:='sha256:'||pg_catalog.encode(extensions.digest(a::text,'sha256'),'hex');
 bh:='sha256:'||pg_catalog.encode(extensions.digest(b::text,'sha256'),'hex');
 if ar->>'syntax_receipt_sha256' is distinct from ah or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from bh
 or q.recovery_spec->>'prior_syntax_rejection_receipt_sha256' is distinct from ah
 or ar->>'prior_provider_effect_not_replayed' is distinct from 'true'
 or prior_candidate->>'candidate_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((prior_candidate-'candidate_sha256')::text,'sha256'),'hex')
 or a->>'candidate_sha256' is distinct from prior_candidate->>'candidate_sha256'
 or b->>'candidate_sha256' is distinct from q.qualified_candidate->>'candidate_sha256'
 or a->>'candidate_sha256' is not distinct from b->>'candidate_sha256'
 or b->>'base_sha' is distinct from q.qualified_candidate->>'base_sha'
 or b->>'source_blob_sha' is distinct from q.qualified_candidate->>'source_blob_sha'
 or b->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or a->>'worker_run_id' is not distinct from b->>'worker_run_id'
 then return null;end if;
 if exists(select 1 from pg_catalog.jsonb_array_elements(pg_catalog.jsonb_build_array(a,b)) x
  where x->>'schema' is distinct from 'reality-independent-signed-chat-parse-proof-v1'
  or x->>'original_work_id' is distinct from q.original_work_id
  or x->>'owner_id' is distinct from q.owner_id::text or x->>'shift_id' is distinct from p_shift::text
  or x->>'trigger_id' is distinct from q.trigger_id::text
  or x->>'baseline' is distinct from 'VALID_SYNTAX' or x->>'candidate' is distinct from 'INVALID_SYNTAX'
  or x->>'parse_only' is distinct from 'true' or x->>'candidate_executed' is distinct from 'false'
  or x->>'installation_authorized' is distinct from 'false' or x->>'original_job_completed' is distinct from 'false'
  or x->>'execution_authorized' is distinct from 'false' or x->>'production_changed' is distinct from 'false'
  or not exists(select 1 from reality_internal.signed_worker_actual_runs_v1 r where r.run_id::text=x->>'worker_run_id' and r.status='COMPLETED' and r.finished_at is not null))
 then return null;end if;
 -- Only the current authorized source lineage may admit the incident.
 if not reality_internal.signed_chat_goal_shift_lineage_v1(pg_catalog.jsonb_build_object(
  'owner_id',q.owner_id,'attempt_id',q.trigger_id,'original_work_id',q.original_work_id,
  'source_ref',q.source_ref,'source_sha256',q.source_sha256,'source_proof_sha256',q.blocker_receipt_sha256,
  'source_original_shift_id',q.source_shift_id),p_shift) then return null;end if;
 return pg_catalog.jsonb_build_object('schema','reality-signed-chat-syntax-incident-source-v1',
  'original_work_id',q.original_work_id,'original_source_shift_id',q.source_shift_id,'trigger_id',q.trigger_id,
  'source_ref',q.source_ref,'source_sha256',q.source_sha256,'source_claim_id',q.claim_id,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',b->>'candidate_sha256','candidate_base_sha',b->>'base_sha','candidate_target',b->>'target_path',
  'failure_receipt_sha256',bh,'prior_failure_receipt_sha256',ah,'failure_history',pg_catalog.jsonb_build_array(a,b),
  'current_find_tail',pg_catalog.right(q.qualified_candidate->>'find',700),'current_replacement_tail',pg_catalog.right(q.qualified_candidate->>'replace',700),
  'compiler_source_path','src/reality-chat-new-development-worker-v1.js','parser_source_path','src/reality-signed-chat-recovery-syntax-verifier-v1.js',
  'observed_phase',q.phase,'root_cause_verified',false,'investigation_only',true,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false);
end $$;
revoke all on function reality_internal.signed_chat_syntax_exhaustion_evidence_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_syntax_exhaustion_evidence_v1(uuid,uuid) to service_role;

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
CREATE OR REPLACE FUNCTION public.reality_record_signed_chat_recovery_syntax_v1(p_shift_id uuid, p_worker_run_id uuid, p_trigger_id uuid, p_candidate_sha256 text, p_base_sha text, p_source_blob_sha text, p_release_sha text, p_proof jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 sh record; proof jsonb; receipt text; spec jsonb; spec_hash text; archive jsonb;
 status text; next_action text; i record; evidence jsonb; prior_proof jsonb; boundary jsonb; rev integer;
begin
 if current_user<>'service_role' or p_release_sha is null or p_release_sha!~'^[a-f0-9]{40}$'
 then raise exception 'CHAT_RECOVERY_PARSE_SIGNED_PREVIEW_REQUIRED'; end if;
 select s.owner_id,s.shift_id,r.started_at into sh
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 w on w.shift_id=s.shift_id and w.owner_id=s.owner_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 where s.shift_id=p_shift_id and s.closed_at is null and s.authorized_at is not null
  and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
  and w.state='ACTIVE' and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes';
 if not found then raise exception 'CHAT_RECOVERY_PARSE_CURRENT_SIGNED_WAKE_REQUIRED';end if;
 select g.* into q from reality_internal.genuine_capability_queue_v1 g
 join reality_internal.chat_work_handoffs_v1 h on h.message_id=g.source_message_id and h.owner_id=g.owner_id and h.conversation_id=g.conversation_id and h.message_sha256=g.source_sha256
 join public.reality_chat_messages m on m.id=h.message_id and m.role='user' and m.user_id=h.owner_id and m.conversation_id=h.conversation_id and m.request_id=h.request_id
 where g.trigger_id=p_trigger_id and g.owner_id=sh.owner_id and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and g.phase in ('SIGNED_CHAT_RECOVERY_TARGET_REVIEWED','SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
  and g.quarantine_receipt_sha256 is null
  and g.recovery_spec_sha256='sha256:'||pg_catalog.encode(extensions.digest(g.recovery_spec::text,'sha256'),'hex')
  and g.qualified_candidate->>'candidate_sha256'=p_candidate_sha256
  and p_candidate_sha256='sha256:'||pg_catalog.encode(extensions.digest((g.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
  and g.qualified_candidate->>'base_sha'=p_base_sha and g.qualified_candidate->>'source_blob_sha'=p_source_blob_sha
  and g.qualified_candidate->>'target_path'~'^(src/|api/reality/)[A-Za-z0-9_/-]+[.]js$'
  and g.qualified_candidate->>'original_work_id'=g.original_work_id
  and g.qualified_candidate->>'spec_sha256'=g.recovery_spec_sha256
  and g.qualified_candidate->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
  and g.qualification_receipt->>'target_review_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((g.qualification_receipt->'target_review')::text,'sha256'),'hex')
  and g.qualification_receipt->'target_review'->>'target_in_graph'='true'
  and g.qualification_receipt->'target_review'->>'candidate_sha256'=p_candidate_sha256
  and g.qualification_receipt->'target_review'->>'original_work_id'=g.original_work_id
  and h.development->>'original_work_id'=g.original_work_id and h.development->>'phase'='CI_VERIFIED'
  and h.development->>'installation_authorized'='false' and h.development->>'original_job_completed'='false'
  and h.development->>'production_changed'='false' and h.development->'evidence'->>'goal_gap_receipt_sha256'=g.blocker_receipt_sha256
  and h.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
 for update of g;
 if not found then raise exception 'CHAT_RECOVERY_PARSE_EXACT_ORIGINAL_DRIFT';end if;
 if p_proof is null or jsonb_typeof(p_proof) is distinct from 'object'
  or p_proof->>'parse_only' is distinct from 'true' or p_proof->>'candidate_executed' is distinct from 'false'
  or p_proof->>'baseline' is distinct from 'VALID_SYNTAX'
  or coalesce(p_proof->>'candidate','') not in ('VALID_SYNTAX','INVALID_SYNTAX')
  or coalesce(p_proof->>'baseline_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  or coalesce(p_proof->>'proposed_sha256','') !~ '^sha256:[a-f0-9]{64}$'
  or p_proof->>'baseline_sha256'=p_proof->>'proposed_sha256'
 then raise exception 'CHAT_RECOVERY_PARSE_NEGATIVE_OR_POSITIVE_PROOF_INVALID';end if;
 proof:=pg_catalog.jsonb_build_object('schema','reality-independent-signed-chat-parse-proof-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,'owner_id',q.owner_id,
  'worker_run_id',p_worker_run_id,'shift_id',p_shift_id,'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',p_candidate_sha256,'base_sha',p_base_sha,'source_blob_sha',p_source_blob_sha,
  'target_path',q.qualified_candidate->>'target_path','baseline',p_proof->>'baseline',
  'candidate',p_proof->>'candidate','baseline_sha256',p_proof->>'baseline_sha256',
  'proposed_sha256',p_proof->>'proposed_sha256','parse_only',true,'candidate_executed',false,
  'prior_phase',q.phase,'full_goal_feature_accepted',false,'execution_authorized',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex');
 if p_proof->>'candidate'='VALID_SYNTAX' then
  status:='SIGNED_RECOVERY_PARSE_ONLY_VERIFIED';
  next_action:=case when q.phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED' then 'RECONCILE_EXISTING_PROVIDER_EFFECT_WITHOUT_REPLAY' else 'STAGE_EXACT_QUARANTINE_THEN_INDEPENDENT_FULL_GOAL_TEST' end;
  update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
 elsif coalesce(q.recovery_spec->>'syntax_revision_epoch','0')='0' then
  archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,
   'prior_claim_id',q.claim_id,'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,
   'prior_qualification_receipt',q.qualification_receipt,'syntax_proof',proof,'syntax_receipt_sha256',receipt,
   'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
    (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end),'prior_provider_effect_not_replayed',true,
   'no_install_authority',true);
  spec:=q.recovery_spec||pg_catalog.jsonb_build_object(
   'schema','reality-recovery-compiler-capability-spec-v2','syntax_revision_epoch',1,
   'prior_syntax_rejection_receipt_sha256',receipt,'prior_syntax_target_path',q.qualified_candidate->>'target_path',
   'prior_syntax_failed_candidate_sha256',p_candidate_sha256,'prior_syntax_reason','INVALID_SYNTAX',
   'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
  spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
  update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
   claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,
   frozen_suite_ref='recovery-spec:'||spec_hash,
   qualification_receipt=(coalesce(q.qualification_receipt,'{}'::jsonb)-array[
     'target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
     'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256',
     'target_review_failure_history','target_review_next_action','last_target_rejection',
     'continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at',
     'publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
    ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',1,'revised_spec_sha256',spec_hash),
   updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
  status:='SIGNED_RECOVERY_INVALID_SYNTAX_SAME_ORIGINAL_RECOMPILED';
  next_action:='GENERATE_DISTINCT_CORRECTED_CANDIDATE_WITHOUT_REPLAYING_PRIOR_FENCE';
 else
  status:='SIGNED_RECOVERY_SYNTAX_REVISION_EXHAUSTED_NEEDS_INVESTIGATION';
  next_action:='INVESTIGATE_REPEATED_CANDIDATE_SYNTAX_FAILURE';
  prior_proof:=q.qualification_receipt->'syntax_proof';
  if prior_proof is null then
   update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
  else
   -- Retain the originally observed negative verdict, not a new receipt on
   -- each wake. A distinct post-investigation parser run must reproduce it.
   receipt:=q.qualification_receipt->>'syntax_receipt_sha256';
   evidence:=reality_internal.signed_chat_syntax_exhaustion_evidence_v1(q.trigger_id,p_shift_id);
   boundary:=p_proof->'boundary_reproduction';rev:=coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0);
   if evidence is not null and rev between 1 and 8
    and prior_proof->>'baseline_sha256'=proof->>'baseline_sha256'
    and prior_proof->>'proposed_sha256'=proof->>'proposed_sha256'
    and boundary->>'schema'='reality-exact-splice-boundary-reproduction-v1'
    and boundary->>'classification'='DUPLICATED_FROZEN_CLOSING_DELIMITER'
    and boundary->>'original_candidate_sha256'=proof->>'proposed_sha256'
    and boundary->>'corrected_candidate_sha256'~'^sha256:[a-f0-9]{64}$'
    and boundary->>'corrected_candidate_sha256'<>proof->>'proposed_sha256'
    and boundary->>'expanded_find_sha256'~'^sha256:[a-f0-9]{64}$'
    and boundary->>'unchanged_replacement_sha256'='sha256:'||pg_catalog.encode(extensions.digest(q.qualified_candidate->>'replace','sha256'),'hex')
    and boundary->>'additional_source_lines'='1' and boundary->>'parse_only'='true'
    and boundary->>'candidate_executed'='false' and boundary->>'functional_acceptance_verified'='false'
    and length(boundary->>'boundary_line') between 2 and 80
   then
    select j.* into i from reality_internal.owner_shift_continuity_incidents_v1 j
    where j.owner_id=q.owner_id and j.shift_id=p_shift_id and j.kind='SIGNED_CHAT_RECOVERY_SYNTAX_STALLED'
     and j.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF' and j.source_evidence=evidence
     and j.evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex')
     and j.investigation_receipt_sha256~'^sha256:[a-f0-9]{64}$'
     and j.assigned_function_id<>j.reviewer_function_id
     and j.investigated_at<sh.started_at
     and j.proposed_upgrade ~ '^\[GOVERNED_ACTION:(INVESTIGATE_EXISTING_HANDOFF|RUN_INDEPENDENT_FROZEN_TEST|VERIFY_INSTALLED_EXECUTOR)\]'
     and j.repair_executed=false and j.installation_authorized=false and j.production_changed=false
    order by j.investigated_at desc limit 1 for update;
    if found then
     archive:=pg_catalog.jsonb_build_object('prior_phase',q.phase,'prior_candidate',q.qualified_candidate,'prior_claim_id',q.claim_id,
       'prior_spec',q.recovery_spec,'prior_spec_sha256',q.recovery_spec_sha256,'prior_qualification_receipt',q.qualification_receipt,
       'syntax_proof',prior_proof,'syntax_receipt_sha256',receipt,'independent_boundary_reproduction',boundary,
       'reobservation_worker_run_id',p_worker_run_id,'investigation_incident_id',i.incident_id,'investigation_receipt_sha256',i.investigation_receipt_sha256,
       'prior_provider_effect_not_replayed',true,'no_install_authority',true,'prior_branch','reality/chat-recovery/'||q.trigger_id::text||
        (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
        '-syntax-r'||rev::text);
     spec:=q.recovery_spec||pg_catalog.jsonb_build_object('schema','reality-recovery-compiler-capability-spec-v2',
       'syntax_revision_epoch',rev+1,'prior_syntax_rejection_receipt_sha256',receipt,
       'prior_syntax_target_path',q.qualified_candidate->>'target_path','prior_syntax_failed_candidate_sha256',p_candidate_sha256,
       'prior_syntax_reason','INVALID_SYNTAX','syntax_investigation_receipt_sha256',i.investigation_receipt_sha256,
       'syntax_compiler_reproduction',boundary,'syntax_investigation_diagnosis',i.diagnosis,
       'syntax_investigation_test_requirement',i.independent_test_requirement,
       'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,'production_changed',false);
     spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
     update reality_internal.genuine_capability_queue_v1 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
       claim_id=null,claim_expires_at=null,qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,frozen_suite_ref='recovery-spec:'||spec_hash,
       qualification_receipt=(qualification_receipt-array['target_review','target_review_receipt_sha256','target_review_lease','target_reviewed_at',
        'target_review_retry_count','target_review_last_failure','target_review_failure_receipt_sha256','target_review_failure_history','target_review_next_action',
        'last_target_rejection','continuity_source_probe','continuity_source_probe_sha256','publish_fenced_at','publish_candidate_sha256','syntax_proof','syntax_receipt_sha256','syntax_next_action'])
        ||pg_catalog.jsonb_build_object('prior_syntax_epoch',archive,'syntax_revision_epoch',rev+1,'revised_spec_sha256',spec_hash),
       updated_at=clock_timestamp() where trigger_id=q.trigger_id and phase=q.phase;
     status:='SIGNED_RECOVERY_SYNTAX_INVESTIGATION_RECOMPILED_SAME_ORIGINAL';
     next_action:='GENERATE_DISTINCT_CANDIDATE_WITH_INDEPENDENTLY_PROVEN_BOUNDARY_COMPILER';
    end if;
   end if;
  end if;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_record_signed_chat_recovery_quarantine_v1(p_trigger_id uuid, p_candidate_sha256 text, p_commit_sha text, p_source_commit_sha text, p_branch text, p_pr_number bigint, p_artifact_blob_sha text, p_source_blob_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; proof jsonb; receipt text;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or q.source_kind<>'SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  or q.phase<>'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
  or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
  or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
  or q.qualified_candidate->>'candidate_sha256' is distinct from p_candidate_sha256
  or q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX'
  or q.qualification_receipt->'syntax_proof'->>'candidate_sha256' is distinct from p_candidate_sha256
  or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
  or p_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha = q.qualified_candidate->>'source_blob_sha'
  or p_artifact_blob_sha !~ '^[a-f0-9]{40}$'
  or p_branch is distinct from ('reality/chat-recovery/'||q.trigger_id::text||
    (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0' then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
    (case when coalesce(q.recovery_spec->>'syntax_revision_epoch','0')<>'0' then '-syntax-r'||(q.recovery_spec->>'syntax_revision_epoch') else '' end))
  or p_pr_number is null or p_pr_number<1
 then raise exception 'SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPT_INVALID';end if;
 proof:=pg_catalog.jsonb_build_object(
  'schema','reality-signed-chat-recovery-quarantine-receipt-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,
  'source_sha256',q.source_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'candidate_sha256',p_candidate_sha256,
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'independent_target_review_verified',true,
  'github_commit_sha',p_commit_sha,
  'source_commit_sha',p_source_commit_sha,
  'artifact_blob_sha',p_artifact_blob_sha,
  'source_blob_sha',p_source_blob_sha,
  'branch',p_branch,'pr_number',p_pr_number,
  'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number,
  'verification_state','PROVIDER_READBACK_NO_INDEPENDENT_CI_YET',
  'source_installed',false,
  'feature_acceptance_verified',false,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED',
  quarantine_receipt_sha256=receipt,
  qualified_candidate=qualified_candidate||
   pg_catalog.jsonb_build_object('provider_proof',proof,'quarantine_receipt_sha256',receipt),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_QUARANTINE_PROVIDER_RECEIPTED',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'receipt_sha256',receipt,'source_commit_sha',p_source_commit_sha,
  'artifact_commit_sha',p_commit_sha,
  'pr_url','https://github.com/maloney2323/Reality/pull/'||p_pr_number,
  'source_installed',false,'independent_ci_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;
CREATE OR REPLACE FUNCTION reality_internal.signed_chat_goal_context_v1(p_trigger uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record; c jsonb; v jsonb; sy jsonb; rr jsonb;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_GOAL_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and capability_id='reality.chat-original.full-goal-installer-adapter-v1'
 and recovery_spec->'required_interfaces' @> '["existing-chat-source-to-governed-development","independent-full-original-goal-feature-acceptance","compatible-same-original-preview-installer","separate-exact-owner-install-authorization","independent-provider-effect-and-final-universe-reconciliation"]'::jsonb
 and phase='SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED';
 if not found then return null;end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id and m.role='user' and m.user_id=w.owner_id
  and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id and w.conversation_id=q.conversation_id
  and w.message_sha256=q.source_sha256 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->>'original_work_id'=q.original_work_id and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'installation_authorized'='false' and w.development->>'production_changed'='false'
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256;
 if not found then return null;end if;
 c:=q.qualified_candidate;v:=c->'provider_proof';sy:=q.qualification_receipt->'syntax_proof';rr:=q.qualification_receipt->'target_review';
 if q.recovery_spec_sha256 is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or c->>'candidate_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest((c-array['candidate_sha256','provider_proof','quarantine_receipt_sha256'])::text,'sha256'),'hex')
 or c->>'original_work_id' is distinct from q.original_work_id or c->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or c->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or q.quarantine_receipt_sha256 is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(v::text,'sha256'),'hex')
 or c->>'quarantine_receipt_sha256' is distinct from q.quarantine_receipt_sha256
 or v->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or v->>'original_work_id' is distinct from q.original_work_id or v->>'trigger_id' is distinct from q.trigger_id::text
 or v->>'source_sha256' is distinct from q.source_sha256 or v->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or v->>'target_review_receipt_sha256' is distinct from q.qualification_receipt->>'target_review_receipt_sha256'
 or q.qualification_receipt->>'target_review_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(rr::text,'sha256'),'hex')
 or rr->>'target_in_graph' is distinct from 'true' or rr->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||pg_catalog.encode(extensions.digest(sy::text,'sha256'),'hex')
 or sy->>'candidate' is distinct from 'VALID_SYNTAX' or sy->>'candidate_sha256' is distinct from c->>'candidate_sha256'
 or sy->>'candidate_executed' is distinct from 'false'
 or coalesce(sy->>'proposed_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 or coalesce(c->>'target_path','') !~ '^(src/|api/reality/)[A-Za-z0-9_/-]+[.]js$'
 or c->>'target_path' like '%..%' or c->>'target_path' like '%//%'
 or coalesce(v->>'github_commit_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'source_commit_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(c->>'base_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(c->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(v->>'branch','') !~ '^reality/chat-recovery/[a-f0-9-]{36}(-feature-r[1-9][0-9]*)?(-syntax-r[1-9])?$'
 or coalesce(v->>'pr_number','') !~ '^[1-9][0-9]*$'
 or v->>'installation_authorized' is distinct from 'false' or v->>'original_job_completed' is distinct from 'false'
 or v->>'source_installed' is distinct from 'false' or v->>'production_changed' is distinct from 'false'
 then return null;end if;
 return pg_catalog.jsonb_build_object('source_family','SIGNED_CHAT_DEVELOPMENT_RECOVERY',
  'attempt_id',q.trigger_id,'owner_id',q.owner_id,'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,'source_ref',q.source_ref,'source_sha256',q.source_sha256,
  'conversation_id',q.conversation_id,'source_original_shift_id',h.shift_id,
  'source_proof_sha256',q.blocker_receipt_sha256,'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',c->>'candidate_sha256','candidate_commit_sha',v->>'github_commit_sha',
  'source_commit_sha',v->>'source_commit_sha','candidate_artifact_sha256',sy->>'proposed_sha256',
  'base_sha',c->>'base_sha','target_path',c->>'target_path',
  'expected_preinstall_blob_sha',c->>'source_blob_sha','expected_installed_blob_sha',v->>'source_blob_sha',
  'candidate_branch',v->>'branch','candidate_pr_number',(v->>'pr_number')::bigint,
  'quarantine_receipt_sha256',q.quarantine_receipt_sha256,'syntax_receipt_sha256',q.qualification_receipt->>'syntax_receipt_sha256',
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'goal_install',q.qualification_receipt->'goal_install',
  'installation_authorized',false,'original_job_completed',coalesce(h.development->>'original_job_completed'='true',false),'production_changed',false);
end $function$
;