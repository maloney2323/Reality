-- Recompile only a genuinely rejected frozen candidate on the same original.
-- An off-target verdict is not a feature test or permission to install.
create or replace function public.reality_recompile_signed_rejected_chat_target_v1(
 p_shift_id uuid,p_worker_run_id uuid,p_release_sha text)
returns jsonb language plpgsql set search_path='' as $f$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 sh record; old_review jsonb; archive jsonb; spec jsonb; spec_hash text;
begin
 if current_user<>'service_role' or p_release_sha is null or p_release_sha !~ '^[a-f0-9]{40}$'
 then raise exception 'CHAT_TARGET_REVISION_SIGNED_PREVIEW_REQUIRED';end if;
 select s.owner_id,s.shift_id,r.started_at into sh
 from reality_internal.governed_employee_shifts_v1 s
 join reality_internal.governed_employee_shift_worker_pulses_v1 pulse
   on pulse.shift_id=s.shift_id and pulse.owner_id=s.owner_id
 join reality_internal.signed_worker_actual_runs_v1 r on r.run_id=p_worker_run_id
 where s.shift_id=p_shift_id and s.closed_at is null and s.authorized_at is not null
   and s.status in('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
   and s.planned_start_at<=clock_timestamp() and s.planned_end_at>clock_timestamp()
   and pulse.last_worker_status='WAKE_RECEIVED'
   and pulse.last_worker_seen_at>clock_timestamp()-interval '3 minutes'
   and r.status='STARTED' and r.started_at>clock_timestamp()-interval '3 minutes';
 if not found then raise exception 'CHAT_TARGET_REVISION_CURRENT_SIGNED_WAKE_REQUIRED';end if;
 select g.* into q from reality_internal.genuine_capability_queue_v1 g
 join reality_internal.chat_work_handoffs_v1 w on w.message_id=g.source_message_id
   and w.owner_id=g.owner_id and w.conversation_id=g.conversation_id and w.message_sha256=g.source_sha256
 join public.reality_chat_messages m on m.id=w.message_id and m.role='user'
   and m.user_id=w.owner_id and m.conversation_id=w.conversation_id and m.request_id=w.request_id
 join reality_internal.signed_worker_actual_runs_v1 prior on prior.run_id::text=g.qualification_receipt->'target_review'->>'review_worker_run_id'
 where g.owner_id=sh.owner_id and g.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
   and g.phase='SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED' and g.updated_at<sh.started_at
   and prior.status='COMPLETED' and prior.finished_at<sh.started_at and prior.run_id<>p_worker_run_id
   and g.quarantine_receipt_sha256 is null
   and coalesce(g.qualification_receipt->>'relevance_revision_count','0')='0'
   and g.recovery_spec->>'schema' in ('reality-recovery-compiler-capability-spec-v1','reality-recovery-compiler-capability-spec-v2')
   and g.recovery_spec_sha256='sha256:'||pg_catalog.encode(extensions.digest(g.recovery_spec::text,'sha256'),'hex')
   and g.qualified_candidate->>'candidate_sha256'='sha256:'||pg_catalog.encode(extensions.digest((g.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
   and g.qualified_candidate->>'original_work_id'=g.original_work_id
   and g.qualified_candidate->>'spec_sha256'=g.recovery_spec_sha256
   and g.qualified_candidate->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
   and g.qualification_receipt->>'target_review_receipt_sha256'='sha256:'||pg_catalog.encode(extensions.digest((g.qualification_receipt->'target_review')::text,'sha256'),'hex')
   and g.qualification_receipt->'target_review'->>'schema'='reality-independent-signed-chat-target-review-v1'
   and g.qualification_receipt->'target_review'->>'target_in_graph'='false'
   and g.qualification_receipt->'target_review'->>'full_goal_accepted'='false'
   and g.qualification_receipt->'target_review'->>'installation_authorized'='false'
   and g.qualification_receipt->'target_review'->>'original_job_completed'='false'
   and g.qualification_receipt->'target_review'->>'production_changed'='false'
   and g.qualification_receipt->'target_review'->>'owner_id'=g.owner_id::text
   and g.qualification_receipt->'target_review'->>'trigger_id'=g.trigger_id::text
   and g.qualification_receipt->'target_review'->>'original_work_id'=g.original_work_id
   and g.qualification_receipt->'target_review'->>'candidate_sha256'=g.qualified_candidate->>'candidate_sha256'
   and g.qualification_receipt->'target_review'->>'spec_sha256'=g.recovery_spec_sha256
   and g.qualification_receipt->'target_review'->>'blocker_receipt_sha256'=g.blocker_receipt_sha256
   and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(m.content,'UTF8')),'hex')
   and w.development->>'original_work_id'=g.original_work_id and w.development->>'phase'='CI_VERIFIED'
   and w.development->>'installation_authorized'='false' and w.development->>'original_job_completed'='false'
   and w.development->>'production_changed'='false'
   and w.development->'evidence'->>'goal_gap_receipt_sha256'=g.blocker_receipt_sha256
 order by g.updated_at,g.trigger_id limit 1 for update of g skip locked;
 if not found then return pg_catalog.jsonb_build_object('status','NO_INDEPENDENT_REJECTED_TARGET_REVISION_DUE',
  'original_job_completed',false,'installation_authorized',false,'production_changed',false,'new_shift_started',false);end if;
 old_review:=q.qualification_receipt->'target_review';
 archive:=pg_catalog.jsonb_build_object('prior_candidate',q.qualified_candidate,
  'prior_spec_sha256',q.recovery_spec_sha256,'prior_claim_id',q.claim_id,
  'prior_qualification_receipt',q.qualification_receipt,'revision_worker_run_id',p_worker_run_id,
  'revised_at',clock_timestamp(),'revised_release_sha',p_release_sha,
  'original_job_completed',false,'installation_authorized',false,'production_changed',false);
 spec:=q.recovery_spec||pg_catalog.jsonb_build_object(
  'schema','reality-recovery-compiler-capability-spec-v2',
  'patch_strategy','FROZEN_GITHUB_LINE_SPAN_INDEPENDENT_EXACT_ANCHOR',
  'line_span_max_lines',81,'source_size_max_bytes',210000,'source_excerpt_max_chars',36000,
  'target_selection_policy','CURRENT_PINNED_ENTRYPOINT_GRAPH_ONLY',
  'prior_target_rejection_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'rejected_target_path',old_review->>'target_path',
  'full_goal_accepted',false,'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
 spec_hash:='sha256:'||pg_catalog.encode(extensions.digest(spec::text,'sha256'),'hex');
 -- Preserve the complete rejected epoch. One new candidate has its own
 -- bounded review lease budget; the prior candidate and failures never vanish.
 update reality_internal.genuine_capability_queue_v1 set
  phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',claim_id=null,claim_expires_at=null,
  qualified_candidate=null,recovery_spec=spec,recovery_spec_sha256=spec_hash,
  frozen_suite_ref='recovery-spec:'||spec_hash,
  qualification_receipt=(q.qualification_receipt
   -array['target_review','target_review_receipt_sha256','target_review_lease',
    'target_reviewed_at','target_review_retry_count','target_review_last_failure',
    'target_review_failure_receipt_sha256','target_review_failure_history',
    'target_review_next_action','last_target_rejection','continuity_source_probe','continuity_source_probe_sha256'])
   ||pg_catalog.jsonb_build_object('relevance_revision_count',1,
     'prior_review_epoch',archive,'revision_policy','ONE_GRAPH_CONSTRAINED_CANDIDATE_DISTINCT_EPOCH',
     'revised_spec_sha256',spec_hash),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id and phase='SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED';
 if not found then raise exception 'CHAT_TARGET_REVISION_CONCURRENT_DRIFT';end if;
 return pg_catalog.jsonb_build_object('status','SIGNED_CHAT_RECOVERY_SAME_ORIGINAL_GRAPH_CONSTRAINED_SPEC',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,'prior_spec_sha256',q.recovery_spec_sha256,
  'revised_spec_sha256',spec_hash,'prior_rejection_receipt_sha256',q.qualification_receipt->>'target_review_receipt_sha256',
  'original_job_completed',false,'installation_authorized',false,'production_changed',false,'new_shift_started',false);
end $f$;
revoke all on function public.reality_recompile_signed_rejected_chat_target_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_recompile_signed_rejected_chat_target_v1(uuid,uuid,text) to service_role;
