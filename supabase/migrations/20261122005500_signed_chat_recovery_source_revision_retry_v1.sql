-- One source-revision-bound recovery attempt after a deterministic model patch
-- rejection. This is the EXISTING queue and original, not a new job or shift.
-- Reject replay on same release; preserve failed attempt memory and cap retries.
create or replace function public.reality_requeue_signed_chat_recovery_after_upgrade_v1(
 p_release_sha text) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record;
 v_prior jsonb; v_rejection_receipt text; v_revisions integer;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_CHAT_RECOVERY_REQUEUE_SERVICE_ONLY';end if;
 if p_release_sha !~ '^[a-f0-9]{40}$' then
  raise exception 'SIGNED_CHAT_RECOVERY_SOURCE_REVISION_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED'
  and qualified_candidate is null
  and quarantine_receipt_sha256 is null
  and qualification_receipt->'negative_capability_memory'->>'reason'=
   'MODEL_BOUNDED_UNIQUE_CODE_CHANGE_NOT_VERIFIED'
  and qualification_receipt->'negative_capability_memory'->>'spec_sha256'=
   recovery_spec_sha256
  and qualification_receipt->'negative_capability_memory'->>'blocker_receipt_sha256'=
   blocker_receipt_sha256
  and qualification_receipt->'negative_capability_memory'->>'source_env_fingerprint'
   is distinct from p_release_sha
  and coalesce((qualification_receipt->>'recovery_revision_count')::integer,0)=0
 order by created_at,trigger_id limit 1 for update skip locked;
 if q.trigger_id is null then
  return pg_catalog.jsonb_build_object(
   'status','NO_SOURCE_REVISED_SIGNED_CHAT_RECOVERY_REQUEUE',
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
  and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'original_work_id'=q.original_work_id
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=
   q.blocker_receipt_sha256
  and w.development->>'installation_authorized'='false'
  and w.development->>'original_job_completed'='false'
  and w.development->>'production_changed'='false';
 if h.message_id is null or q.recovery_spec_sha256 is distinct from
  'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 then raise exception 'SIGNED_CHAT_RECOVERY_REQUEUE_ORIGINAL_DRIFT';end if;
 v_prior:=q.qualification_receipt->'negative_capability_memory';
 v_rejection_receipt:='sha256:'||pg_catalog.encode(extensions.digest(
    v_prior::text||':'||q.trigger_id::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
  claim_id=null,claim_expires_at=null,
  qualification_receipt=qualification_receipt||
   pg_catalog.jsonb_build_object(
    'recovery_revision_count',1,
    'prior_rejection_sha256',v_rejection_receipt,
    'revised_runtime_source_sha',p_release_sha,
    'requeued_at',clock_timestamp(),
    'retry_policy','ONE_CHANGED_RELEASE_ONLY_PREVIOUS_REJECTION_RETAINED'),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id and phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED';
 if not found then raise exception 'SIGNED_CHAT_RECOVERY_REQUEUE_RACE';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_SAME_ORIGINAL_REQUEUED_ON_CHANGED_RELEASE',
  'trigger_id',q.trigger_id,
  'original_work_id',q.original_work_id,
  'source_message_id',q.source_message_id,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'negative_memory_receipt_sha256',v_rejection_receipt,
  'revised_runtime_source_sha',p_release_sha,
  'max_retries_after_revision',1,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_requeue_signed_chat_recovery_after_upgrade_v1(text)
 from public,anon,authenticated;
grant execute on function public.reality_requeue_signed_chat_recovery_after_upgrade_v1(text)
 to service_role;
