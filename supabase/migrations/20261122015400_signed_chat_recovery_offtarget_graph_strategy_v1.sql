-- Apply a DISTINCT bounded source-target strategy only after Reality's own
-- second signed worker independently rejected an off-target model draft.
-- Preserve original identity, blocker, failed candidate and review evidence.
-- Never invent a new owner instruction, shift, original or installation warrant.
create or replace function public.reality_recompile_signed_chat_recovery_offtarget_v1(
 p_release_sha text) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record;
 updated_spec jsonb; digest text; previous jsonb; proof jsonb; receipt text;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_CHAT_RECOVERY_OFFTARGET_SERVICE_ONLY';end if;
 if p_release_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'SIGNED_CHAT_RECOVERY_OFFTARGET_SOURCE_SHA_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase='SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED'
 and recovery_spec->>'schema'='reality-recovery-compiler-capability-spec-v2'
 and recovery_spec->>'patch_strategy'=
  'FROZEN_GITHUB_LINE_SPAN_INDEPENDENT_EXACT_ANCHOR'
 and coalesce((qualification_receipt->>'target_scope_revision_count')::int,0)=0
 and qualified_candidate is not null
 and qualified_candidate->>'base_sha' is distinct from p_release_sha
 and quarantine_receipt_sha256 is null
 and qualification_receipt->>'target_review_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
 and qualification_receipt->'target_review'->>'target_in_graph'='false'
 and qualification_receipt->'target_review'->>'candidate_sha256'=
  qualified_candidate->>'candidate_sha256'
 and qualification_receipt->'last_target_rejection'->>'reason'=
   'CANDIDATE_TARGET_OUTSIDE_PINNED_RUNTIME_GRAPH'
 and qualification_receipt->'last_target_rejection'->>'review_receipt_sha256'=
   qualification_receipt->>'target_review_receipt_sha256'
 and recovery_spec_sha256='sha256:'||
   pg_catalog.encode(extensions.digest(recovery_spec::text,'sha256'),'hex')
 order by updated_at,trigger_id limit 1 for update skip locked;
 if q.trigger_id is null then return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_CHAT_SOURCE_TARGET_REJECTION_READY',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);end if;
 select w.* into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
  and m.user_id=w.owner_id and m.conversation_id=w.conversation_id
  and m.request_id=w.request_id and m.role='user'
 where w.message_id=q.source_message_id
 and w.owner_id=q.owner_id and w.conversation_id=q.conversation_id
 and w.message_sha256=q.source_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->>'original_work_id'=q.original_work_id
 and w.development->>'phase'='CI_VERIFIED'
 and w.development->'evidence'->>'goal_gap_receipt_sha256'=
  q.blocker_receipt_sha256
 and w.development->>'installation_authorized'='false'
 and w.development->>'original_job_completed'='false'
 and w.development->>'production_changed'='false';
 if h.message_id is null or
  q.qualified_candidate->>'original_work_id' is distinct from q.original_work_id
 then raise exception 'SIGNED_CHAT_RECOVERY_OFFTARGET_OWNER_SOURCE_CHANGED';end if;
 previous:=pg_catalog.jsonb_build_object(
  'original_spec_sha256',q.recovery_spec_sha256,
  'rejected_candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'rejected_model_response_id',q.qualified_candidate->>'model_response_id',
  'rejected_target_path',q.qualified_candidate->>'target_path',
  'source_commit_sha',q.qualified_candidate->>'base_sha',
  'rejection_receipt_sha256',
    q.qualification_receipt->>'target_review_receipt_sha256',
  'independent_reviewer_worker_run_id',
    q.qualification_receipt->'target_review'->>'review_worker_run_id',
  'proof','OFF_TARGET_NOT_IN_SIGNED_EXECUTOR_OR_INSTALLER_ENTRYPOINT_GRAPH');
 receipt:='sha256:'||pg_catalog.encode(extensions.digest(
   previous::text||':'||q.original_work_id||':'||q.blocker_receipt_sha256,
   'sha256'),'hex');
 updated_spec:=q.recovery_spec||pg_catalog.jsonb_build_object(
  'schema','reality-recovery-compiler-capability-spec-v3',
  'previous_spec_sha256',q.recovery_spec_sha256,
  'source_target_policy','PINNED_RUNTIME_ENTRYPOINT_SOURCE_GRAPH_ONLY',
  'rejected_candidate_receipt_sha256',receipt,
  'source_strategy_recompiled_at',clock_timestamp(),
  'full_goal_accepted',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(
   updated_spec::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
  claim_id=null,claim_expires_at=null,
  recovery_spec=updated_spec,recovery_spec_sha256=digest,
  frozen_suite_ref='recovery-spec:'||digest,
  qualified_candidate=null,
  qualification_receipt=qualification_receipt||
    pg_catalog.jsonb_build_object(
      'target_scope_revision_count',1,
      'offtarget_source_correction_sha',p_release_sha,
      'prior_offtarget_candidate_receipt_sha256',receipt,
      'offtarget_history',coalesce(qualification_receipt->'offtarget_history','[]'::jsonb)||
       pg_catalog.jsonb_build_array(previous),
      'target_scope_recompiled_at',clock_timestamp()),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id
  and phase='SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED';
 if not found then raise exception 'SIGNED_CHAT_RECOVERY_OFFTARGET_CONCURRENT_REVIEW_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_OFFTARGET_SOURCE_STRATEGY_RECOMPILED',
  'trigger_id',q.trigger_id,
  'original_work_id',q.original_work_id,
  'previous_spec_sha256',q.recovery_spec_sha256,
  'new_spec_sha256',digest,
  'prior_rejected_candidate_receipt_sha256',receipt,
  'next_strategy','PINNED_RUNTIME_ENTRYPOINT_SOURCE_GRAPH_ONLY',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_recompile_signed_chat_recovery_offtarget_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_recompile_signed_chat_recovery_offtarget_v1(text)
 to service_role;
