-- Independent syntax proof follows the existing candidate target review and precedes publication.
-- Retire a proven invalid candidate, including its immutable prior publication fence.
-- No replay, new original, authority grant, or substitution of syntax for acceptance.
create or replace function public.reality_record_signed_chat_recovery_syntax_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_trigger_id uuid,p_candidate_sha256 text,
 p_base_sha text,p_source_blob_sha text,p_release_sha text,p_proof jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 sh record; proof jsonb; receipt text; spec jsonb; spec_hash text; archive jsonb;
 status text; next_action text;
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
   'prior_branch','reality/chat-recovery/'||q.trigger_id::text,'prior_provider_effect_not_replayed',true,
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
  update reality_internal.genuine_capability_queue_v1 set qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object('syntax_proof',proof,'syntax_receipt_sha256',receipt,'syntax_next_action',next_action) where trigger_id=q.trigger_id;
 end if;
 return pg_catalog.jsonb_build_object('status',status,'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'syntax_receipt_sha256',receipt,'next_action',next_action,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $$;
revoke all on function public.reality_record_signed_chat_recovery_syntax_v1(uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_syntax_v1(uuid,uuid,uuid,text,text,text,text,jsonb) to service_role;

CREATE OR REPLACE FUNCTION public.reality_read_next_signed_chat_recovery_publish_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase in ('SIGNED_CHAT_RECOVERY_TARGET_REVIEWED',
               'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED')
 order by created_at,trigger_id limit 1;
 if q.trigger_id is null then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE');end if;
 select w.*,m.content into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id and m.role='user'
  and m.user_id=w.owner_id and m.conversation_id=w.conversation_id
  and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
  and w.conversation_id=q.conversation_id
  and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'original_work_id'=q.original_work_id
  and w.message_sha256=q.source_sha256
  and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
     pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=
     q.blocker_receipt_sha256
  and w.development->>'installation_authorized'='false'
  and w.development->>'original_job_completed'='false'
  and w.development->>'production_changed'='false';
 if h.message_id is null or
   q.recovery_spec_sha256 is distinct from
    'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
   or q.qualification_receipt->>'target_review_receipt_sha256' !~ '^sha256:[a-f0-9]{64}$'
   or q.qualification_receipt->'target_review'->>'target_in_graph' is distinct from 'true'
   or q.qualification_receipt->'target_review'->>'candidate_sha256'
     is distinct from q.qualified_candidate->>'candidate_sha256'
   or q.qualified_candidate->>'candidate_sha256' is distinct from
    'sha256:'||pg_catalog.encode(extensions.digest(
     (q.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 then raise exception 'SIGNED_CHAT_RECOVERY_PREPUBLISH_SOURCE_OR_DIGEST_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_QUARANTINE_CANDIDATE_READ',
  'trigger_id',q.trigger_id,'owner_id',q.owner_id,'message_id',q.source_message_id,
  'original_work_id',q.original_work_id,'source_ref',q.source_ref,
  'source_sha256',q.source_sha256,'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'target_review_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'independent_target_review_verified',true,
  'phase',q.phase,'candidate',q.qualified_candidate,
  'quarantine_epoch',coalesce((q.recovery_spec->>'syntax_revision_epoch')::integer,0),
  'syntax_verified',coalesce(q.qualification_receipt->'syntax_proof'->>'candidate'='VALID_SYNTAX'
   and q.qualification_receipt->'syntax_proof'->>'candidate_sha256'=q.qualified_candidate->>'candidate_sha256'
   and q.qualification_receipt->>'syntax_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((q.qualification_receipt->'syntax_proof')::text,'sha256'),'hex'),false),
  'release_sha',q.qualified_candidate->>'base_sha',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
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
    (case when q.recovery_spec->>'syntax_revision_epoch'='1' then '-syntax-r1' else '' end))
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
revoke all on function public.reality_read_next_signed_chat_recovery_publish_v1() from public,anon,authenticated;
grant execute on function public.reality_read_next_signed_chat_recovery_publish_v1() to service_role;
revoke all on function public.reality_record_signed_chat_recovery_quarantine_v1(uuid,text,text,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_quarantine_v1(uuid,text,text,text,text,bigint,text,text) to service_role;

CREATE OR REPLACE FUNCTION public.reality_fence_signed_chat_recovery_publish_v1(p_trigger_id uuid, p_candidate_sha256 text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_PUBLISH_FENCED',
  qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||
   pg_catalog.jsonb_build_object('publish_fenced_at',clock_timestamp(),
    'publish_candidate_sha256',p_candidate_sha256),
  updated_at=clock_timestamp()
 where trigger_id=p_trigger_id and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEWED'
 and qualification_receipt->>'target_review_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
 and qualification_receipt->'target_review'->>'target_in_graph'='true'
 and qualification_receipt->'target_review'->>'candidate_sha256'=p_candidate_sha256
 and qualified_candidate->>'candidate_sha256'=p_candidate_sha256
 and qualification_receipt->'syntax_proof'->>'candidate'='VALID_SYNTAX'
 and qualification_receipt->'syntax_proof'->>'candidate_sha256'=p_candidate_sha256
 and qualification_receipt->>'syntax_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((qualification_receipt->'syntax_proof')::text,'sha256'),'hex')
 and recovery_spec_sha256=qualified_candidate->>'spec_sha256'
 returning * into q;
 if q.trigger_id is null then raise exception 'SIGNED_CHAT_RECOVERY_FENCE_REPLAY_OR_SOURCE_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_QUARANTINE_EFFECT_FENCED',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'candidate_sha256',p_candidate_sha256,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;
revoke all on function public.reality_fence_signed_chat_recovery_publish_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.reality_fence_signed_chat_recovery_publish_v1(uuid,text) to service_role;
