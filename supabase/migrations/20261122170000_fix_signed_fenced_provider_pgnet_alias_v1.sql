-- Correct only an ambiguous pg_net alias observed on the first live
-- signed requalification wake (Postgres 42702). No weakened gates, no replay,
-- no new authority, no changed original. The alias "h" collided with an
-- existing PL/pgSQL source-record variable of that name.
CREATE OR REPLACE FUNCTION public.reality_requalify_fenced_signed_chat_provider_v1(p_shift_id uuid, p_worker_run_id uuid, p_trigger_id uuid, p_candidate_sha256 text, p_original_branch text, p_old_release_sha text, p_current_release_sha text, p_public_repo_status integer, p_independent_ref_status integer, p_current_preview_ref_verified boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 q reality_internal.genuine_capability_queue_v1%rowtype;
 h record; v_shift record; previous_branch text;
 v_epoch integer; v_revised jsonb;v_spec_sha text;
 v_receipt text;v_evidence jsonb;v_broker_count integer;
begin
 if current_user<>'service_role' or p_shift_id is null or
  p_worker_run_id is null or p_trigger_id is null
 then raise exception 'SIGNED_FENCED_REQUALIFICATION_SERVICE_ONLY';end if;
 if p_candidate_sha256 !~ '^sha256:[a-f0-9]{64}$' or
  p_old_release_sha !~ '^[a-f0-9]{40}$' or
  p_current_release_sha !~ '^[a-f0-9]{40}$' or
  p_old_release_sha=p_current_release_sha or
  p_public_repo_status<>200 or p_independent_ref_status<>404 or
  p_current_preview_ref_verified is distinct from true
 then return pg_catalog.jsonb_build_object(
  'status','SIGNED_FENCED_PROVIDER_INDEPENDENT_READBACK_REQUIRED',
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 select s.owner_id,s.shift_id into v_shift
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_completion_warrants_v1 warrant
  on warrant.owner_id=s.owner_id and warrant.shift_id=s.shift_id
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
  on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 run
  on run.run_id=p_worker_run_id and run.status='STARTED'
 where s.shift_id=p_shift_id and s.closed_at is null
  and s.status in ('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  and s.authorized_at is not null and s.planned_start_at<=clock_timestamp()
  and s.planned_end_at>clock_timestamp()
  and warrant.state='ACTIVE'
  and pulse.last_worker_status='WAKE_RECEIVED'
  and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
  and run.started_at>clock_timestamp()-interval '3 minutes';
 if not found then return pg_catalog.jsonb_build_object(
  'status','SIGNED_FENCED_PROVIDER_ACTIVE_SHIFT_REQUIRED',
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 select * into q
 from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and owner_id=v_shift.owner_id
  and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED'
  and quarantine_receipt_sha256 is null
  and recovery_spec->>'provider_requalification_epoch' is null
 for update;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_UNREQUALIFIED_FENCED_SIGNED_CHAT_PROVIDER_SCOPE',
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 select w.*,m.content into h
 from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
  and m.role='user' and m.user_id=w.owner_id
  and m.conversation_id=w.conversation_id
  and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
  and w.conversation_id=q.conversation_id
  and w.message_sha256=q.source_sha256
  and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'original_work_id'=q.original_work_id
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256
  and w.development->>'original_job_completed'='false'
  and w.development->>'installation_authorized'='false'
  and w.development->>'production_changed'='false';
 if not found then raise exception 'SIGNED_FENCED_PROVIDER_ORIGINAL_SOURCE_UNVERIFIED';end if;
 -- The authenticated original may have begun in an earlier shift; Reality's
 -- signed continuity lineage (not shift-id equality) binds that original
 -- to the current authorized shift without admitting a new original.
 if not reality_internal.signed_chat_goal_shift_lineage_v1(
  pg_catalog.jsonb_build_object(
   'owner_id',q.owner_id,'attempt_id',q.trigger_id,
   'original_work_id',q.original_work_id,'source_ref',q.source_ref,
   'source_sha256',q.source_sha256,
   'source_proof_sha256',q.blocker_receipt_sha256,
   'source_original_shift_id',h.shift_id),p_shift_id)
 then raise exception 'SIGNED_FENCED_PROVIDER_SAME_ORIGINAL_SHIFT_LINEAGE_UNVERIFIED';end if;
 v_epoch:=coalesce((q.recovery_spec->>'syntax_revision_epoch')::int,0);
 previous_branch:='reality/chat-recovery/'||q.trigger_id::text||
  (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0'
    then '-feature-r'||(q.recovery_spec->>'feature_revision_epoch') else '' end)||
  (case when v_epoch>0 then '-syntax-r'||v_epoch else '' end);
 if v_epoch<0 or v_epoch>=9 or
   p_original_branch is distinct from previous_branch or
   q.recovery_spec_sha256 is distinct from 'sha256:'||
     pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex') or
   q.qualified_candidate->>'candidate_sha256' is distinct from p_candidate_sha256 or
   p_candidate_sha256 is distinct from 'sha256:'||
     pg_catalog.encode(extensions.digest(
      (q.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex') or
   q.qualified_candidate->>'base_sha' is distinct from p_old_release_sha or
   q.qualified_candidate->>'spec_sha256' is distinct from q.recovery_spec_sha256 or
   q.qualified_candidate->>'original_work_id' is distinct from q.original_work_id or
   q.qualified_candidate->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256 or
   q.qualification_receipt->>'publish_candidate_sha256' is distinct from p_candidate_sha256 or
   q.qualification_receipt->>'publish_fenced_at' is null or
   q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true' or
   q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$' or
   q.qualification_receipt->'syntax_proof'->>'candidate' is distinct from 'VALID_SYNTAX' or
   q.qualification_receipt->'syntax_proof'->>'candidate_sha256' is distinct from p_candidate_sha256 or
   q.qualification_receipt->>'syntax_receipt_sha256' is distinct from 'sha256:'||
    pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
 then raise exception 'SIGNED_FENCED_PROVIDER_CANDIDATE_OR_FENCE_UNVERIFIED';end if;
 -- Requires Reality's existing recorded, investigated continuity failure;
 -- the diagnosing model grants no GitHub or installer authority.
 if not exists(
  select 1 from reality_internal.owner_shift_continuity_incidents_v1 i
   where i.owner_id=q.owner_id and i.shift_id=p_shift_id
    and i.kind='SIGNED_GOVERNED_TRANSITION_STALLED'
    and i.phase='INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF'
    and i.investigation_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'
    and i.source_evidence->>'trigger_id'=q.trigger_id::text
    and i.source_evidence->>'original_work_id'=q.original_work_id
    and i.source_evidence->>'candidate_sha256'=p_candidate_sha256
    and i.source_evidence->>'expected_quarantine_branch'=p_original_branch
    and i.assigned_employee is not null and i.independent_reviewer is not null
    and i.assigned_employee<>i.independent_reviewer
 ) then return pg_catalog.jsonb_build_object(
  'status','SIGNED_FENCED_PROVIDER_EXISTING_CONTINUITY_INVESTIGATION_REQUIRED',
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 -- pg_net stores Reality's signed HTTP worker receipts. Confirm two
 -- separate broker-token readbacks before considering a distinct attempt.
 select count(distinct response_row.content::jsonb->'signed_chat_review_incident_observation'->>'worker_run_id')
 into v_broker_count from net._http_response response_row
 where response_row.created>q.updated_at
  and response_row.content_type like '%json%' and response_row.content like '{%'
  and response_row.content::jsonb->'signed_chat_recovery_quarantine'->>'status'=
     'RECOVERY_FENCED_PROVIDER_EFFECT_UNVERIFIED_NO_REPLAY'
  and response_row.content::jsonb->'signed_chat_recovery_quarantine'->>'provider_ref_http_status'='404'
  and response_row.content::jsonb->'signed_chat_recovery_quarantine'->>'broker_push_permission_verified'='true'
  and response_row.content::jsonb->'signed_chat_recovery_quarantine'->>'write_replay_authorized'='false';
 if v_broker_count<2 then return pg_catalog.jsonb_build_object(
  'status','SIGNED_FENCED_PROVIDER_DISTINCT_BROKER_READBACK_REQUIRED',
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);end if;
 v_evidence:=pg_catalog.jsonb_build_object(
  'schema','reality-signed-fenced-provider-new-source-epoch-v1',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'source_ref',q.source_ref,'source_sha256',q.source_sha256,
  'old_spec_sha256',q.recovery_spec_sha256,
  'old_candidate_sha256',p_candidate_sha256,
  'old_release_sha',p_old_release_sha,
  'new_release_sha',p_current_release_sha,
  'old_expected_quarantine_branch',previous_branch,
  'new_expected_quarantine_branch',
    'reality/chat-recovery/'||q.trigger_id::text||
    (case when coalesce(q.recovery_spec->>'feature_revision_epoch','0')<>'0'
      then '-feature-r'||q.recovery_spec->>'feature_revision_epoch' else '' end)||
    '-syntax-r'||(v_epoch+1),
  'prior_fenced_at',q.qualification_receipt->>'publish_fenced_at',
  'independent_worker_run_id',p_worker_run_id,
  'independent_repo_visibility_verified',true,
  'independent_original_ref_http_status',p_independent_ref_status,
  'independent_current_preview_ref_verified',p_current_preview_ref_verified,
  'distinct_broker_credential_404_observations',v_broker_count,
  'retries_of_previous_fenced_branch',0,
  'new_shift_started',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 v_receipt:='sha256:'||pg_catalog.encode(extensions.digest(v_evidence::text,'sha256'),'hex');
 v_revised:=q.recovery_spec||pg_catalog.jsonb_build_object(
  'syntax_revision_epoch',v_epoch+1,
  'provider_requalification_epoch',1,
  'prior_fenced_provider_requalification_receipt_sha256',v_receipt,
  'prior_fenced_spec_sha256',q.recovery_spec_sha256,
  'previous_fenced_candidate_sha256',p_candidate_sha256,
  'new_preview_release_sha',p_current_release_sha,
  'prior_fenced_branch',previous_branch,
  'source_changed_no_same_write_replay',true,
  'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 v_spec_sha:='sha256:'||pg_catalog.encode(extensions.digest(v_revised::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
  claim_id=null,claim_expires_at=null,
  qualified_candidate=null,quarantine_receipt_sha256=null,
  recovery_spec=v_revised,recovery_spec_sha256=v_spec_sha,
  frozen_suite_ref='recovery-spec:'||v_spec_sha,
  qualification_receipt=
   (coalesce(q.qualification_receipt,'{}'::jsonb)-
    'target_review'-'target_review_receipt_sha256'-
    'syntax_proof'-'syntax_receipt_sha256'-
    'publish_candidate_sha256'-'publish_fenced_at'-
    'goal_install'-'claim_created_at')||
   pg_catalog.jsonb_build_object(
    'provider_requalification_memory',v_evidence,
    'provider_requalification_receipt_sha256',v_receipt,
    'provider_requalification_at',clock_timestamp(),
    'provider_requalification_limit',1),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id
  and phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED';
 if not found then raise exception 'SIGNED_FENCED_PROVIDER_ATOMIC_REQUALIFICATION_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_FENCED_PROVIDER_NEW_RELEASE_SAME_ORIGINAL_SPEC_FROZEN',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'previous_candidate_sha256',p_candidate_sha256,
  'previous_branch',previous_branch,
  'new_spec_sha256',v_spec_sha,
  'new_branch',v_evidence->>'new_expected_quarantine_branch',
  'independent_requalification_receipt_sha256',v_receipt,
  'full_goal_feature_accepted',false,'new_shift_started',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
end $function$;

revoke all on function public.reality_requalify_fenced_signed_chat_provider_v1(uuid,uuid,uuid,text,text,text,text,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.reality_requalify_fenced_signed_chat_provider_v1(uuid,uuid,uuid,text,text,text,text,integer,integer,boolean) to service_role;
