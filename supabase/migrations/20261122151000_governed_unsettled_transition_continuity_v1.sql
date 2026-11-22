
-- SOURCE-BOUND detection, not a new retry or installation authority.
alter table reality_internal.owner_shift_continuity_incidents_v1
 drop constraint owner_shift_continuity_incidents_v1_kind_check;
alter table reality_internal.owner_shift_continuity_incidents_v1
 add constraint owner_shift_continuity_incidents_v1_kind_check
 check(kind in ('ELIGIBLE_WORK_NO_DISPATCH','EMPLOYEE_INQUIRY_CLAIM_STALE',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED','EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'SIGNED_SHIFT_REPEATED_NO_PROGRESS','SIGNED_CHAT_RECOVERY_REVIEW_STALLED',
 'SIGNED_CHAT_RECOVERY_SYNTAX_STALLED','SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
 'SIGNED_GOVERNED_TRANSITION_STALLED'));

create or replace function reality_internal.signed_chat_fenced_transition_evidence_v1(
 p_trigger uuid,p_shift uuid) returns jsonb
language plpgsql security invoker set search_path='' as $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 h record; candidate jsonb;branch text;epoch integer;feature_epoch integer;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_UNSETTLED_TRANSITION_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
  and updated_at<clock_timestamp()-interval '90 seconds'
  and qualified_candidate is not null and quarantine_receipt_sha256 is null;
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
 candidate:=q.qualified_candidate;
 if q.source_ref is distinct from 'supabase:reality_chat_messages:'||q.source_message_id::text
 or q.original_work_id !~ '^work:[a-f0-9]{32}$'
 or q.recovery_spec_sha256 is distinct from 'sha256:'||
  pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or q.recovery_spec->>'original_work_id' is distinct from q.original_work_id
 or q.recovery_spec->>'signed_message_id' is distinct from q.source_message_id::text
 or q.recovery_spec->>'source_sha256' is distinct from q.source_sha256
 or q.recovery_spec->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or q.recovery_spec->>'installation_authorized' is distinct from 'false'
 or q.recovery_spec->>'original_job_completed' is distinct from 'false'
 or q.recovery_spec->>'production_changed' is distinct from 'false'
 or candidate->>'original_work_id' is distinct from q.original_work_id
 or candidate->>'spec_sha256' is distinct from q.recovery_spec_sha256
 or candidate->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
 or coalesce(candidate->>'base_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(candidate->>'source_blob_sha','') !~ '^[a-f0-9]{40}$'
 or coalesce(candidate->>'candidate_sha256','') !~ '^sha256:[a-f0-9]{64}$'
 or candidate->>'candidate_sha256' is distinct from 'sha256:'||
  pg_catalog.encode(extensions.digest((candidate-'candidate_sha256')::text,'sha256'),'hex')
 or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
 or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
 or q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX'
 or q.qualification_receipt->'syntax_proof'->>'candidate_sha256' is distinct from candidate->>'candidate_sha256'
 or q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||
   pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
 or not reality_internal.signed_chat_goal_shift_lineage_v1(
  pg_catalog.jsonb_build_object('owner_id',q.owner_id,'attempt_id',q.trigger_id,
   'original_work_id',q.original_work_id,'source_ref',q.source_ref,
   'source_sha256',q.source_sha256,
   'source_proof_sha256',q.blocker_receipt_sha256,
   'source_original_shift_id',h.shift_id),p_shift)
 then return null;end if;
 if coalesce(q.recovery_spec->>'syntax_revision_epoch','0')!~'^[0-9]$'
  or coalesce(q.recovery_spec->>'feature_revision_epoch','0')!~'^[0-4]$'
 then return null;end if;
 epoch:=coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0);
 feature_epoch:=coalesce((q.recovery_spec->>'feature_revision_epoch')::integer,0);
 branch:='reality/chat-recovery/'||q.trigger_id::text||
  (case when feature_epoch>0 then '-feature-r'||feature_epoch else '' end)||
  (case when epoch>0 then '-syntax-r'||epoch else '' end);
 return pg_catalog.jsonb_build_object(
  'schema','reality-source-bound-unsettled-transition-v1',
  'transition_family','SIGNED_CHAT_DEVELOPMENT_RECOVERY',
  'expected_transition','QUARANTINE_PROVIDER_RECEIPTED',
  'observed_phase',q.phase,'fenced_at',q.updated_at,
  'original_work_id',q.original_work_id,
  'source_original_shift_id',h.shift_id,
  'trigger_id',q.trigger_id,'source_claim_id',q.claim_id,
  'source_ref',q.source_ref,'source_message_id',q.source_message_id,
  'source_sha256',q.source_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',candidate->>'candidate_sha256',
  'candidate_base_sha',candidate->>'base_sha',
  'candidate_source_blob_sha',candidate->>'source_blob_sha',
  'candidate_target_path',candidate->>'target_path',
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'syntax_receipt_sha256',q.qualification_receipt->>'syntax_receipt_sha256',
  'expected_quarantine_branch',branch,
  'provider_effect_known',false,
  'root_cause_verified',false,
  'provider_effect_replayed',false,
  'investigation_only',true,
  'new_original_admitted',false,
  'installation_authorized',false,'original_job_completed',false,'production_changed',false);
end $function$;
revoke all on function reality_internal.signed_chat_fenced_transition_evidence_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function reality_internal.signed_chat_fenced_transition_evidence_v1(uuid,uuid)
 to service_role;

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
 -- Generic unresolved *governed transition* condition: no settled provider
 -- effect, one signed owner original, and no automatic replay. Further phase
 -- families may implement the same evidence contract and incident kind.
 for q in
  select g.trigger_id,g.owner_id,g.claim_id,g.original_work_id
   from reality_internal.genuine_capability_queue_v1 g
   where g.owner_id=sh.owner_id
   and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and g.phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
   and g.updated_at<clock_timestamp()-interval '90 seconds'
   and g.quarantine_receipt_sha256 is null
   order by g.updated_at,g.trigger_id limit 8 loop
  evidence:=reality_internal.signed_chat_fenced_transition_evidence_v1(q.trigger_id,sh.shift_id);
  if evidence is null then continue;end if;
  h:=pg_catalog.encode(extensions.digest(evidence::text,'sha256'),'hex');
  insert into reality_internal.owner_shift_continuity_incidents_v1(
   owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
   error_summary,observation_count,phase,last_observed_at,source_evidence)
  values(q.owner_id,sh.shift_id,'SIGNED_GOVERNED_TRANSITION_STALLED',
   h,'sha256:'||h,q.claim_id,
   left('A governed provider transition has not settled for original '||
    q.original_work_id||'. Independently determine GitHub ref and provider permissions before declaring an effect or requesting any new write.',280),
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
  and (kind<>'SIGNED_GOVERNED_TRANSITION_STALLED' or (
   source_evidence->>'schema'='reality-source-bound-unsettled-transition-v1'
   and source_evidence->>'transition_family'='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and source_evidence->>'investigation_only'='true'
   and source_evidence->>'provider_effect_known'='false'
   and source_evidence->>'provider_effect_replayed'='false'
   and evidence_sha256='sha256:'||pg_catalog.encode(extensions.digest(source_evidence::text,'sha256'),'hex')
   and source_evidence=reality_internal.signed_chat_fenced_transition_evidence_v1(
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
