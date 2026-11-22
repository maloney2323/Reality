-- Same signed original: bounded independent source-target review recovery.
-- A provider/readback failure must be durable, and an expired review lease
-- cannot strand a legitimate signed Chat original indefinitely.
-- This changes NO execution/owner authority and never installs source.
alter table reality_internal.genuine_capability_queue_v1
 drop constraint genuine_capability_queue_v1_phase_check;
alter table reality_internal.genuine_capability_queue_v1
 add constraint genuine_capability_queue_v1_phase_check check (phase=any(array[
  'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
  'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE',
  'AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED',
  'SIGNED_CHAT_RECOVERY_SPEC_FROZEN','SIGNED_CHAT_RECOVERY_MODEL_CLAIMED',
  'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED',
  'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED',
  'SIGNED_CHAT_RECOVERY_TARGET_REVIEWED',
  'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED',
  'SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED',
  'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED',
  'SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED',
  'SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
  'SIGNED_CHAT_RECOVERY_COMPATIBILITY_REVIEW_REQUIRED'
 ]));
create or replace function public.reality_record_signed_chat_recovery_target_review_failure_v1(
 p_trigger_id uuid,p_review_id uuid,p_worker_run_id uuid,p_failure_code text)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 r record; n integer; failure jsonb; digest text; decision text;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_CHAT_REVIEW_RECOVERY_SERVICE_ONLY';end if;
 if p_failure_code !~ '^[A-Z][A-Z0-9_]{5,95}$' then
  raise exception 'SIGNED_CHAT_REVIEW_FAILURE_CODE_INVALID';end if;
 select * into r from reality_internal.signed_worker_actual_runs_v1
 where run_id=p_worker_run_id and status='STARTED'
 and started_at>clock_timestamp()-interval '3 minutes';
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 for update;
 if r.run_id is null or q.trigger_id is null
 or q.phase<>'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED'
 or q.qualification_receipt->'target_review_lease'->>'review_id'
   is distinct from p_review_id::text
 or q.qualification_receipt->'target_review_lease'->>'signed_worker_run_id'
   is distinct from p_worker_run_id::text
 or (q.qualification_receipt->'target_review_lease'->>'expires_at')::timestamptz
   <clock_timestamp()
 or q.recovery_spec_sha256 is distinct from 'sha256:'||
   pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
 or q.qualified_candidate->>'candidate_sha256' is distinct from 'sha256:'||
   pg_catalog.encode(extensions.digest(
   (q.qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 then raise exception 'SIGNED_CHAT_REVIEW_FAILURE_SOURCE_OR_LEASE_DRIFT';end if;
 n:=coalesce((q.qualification_receipt->>'target_review_retry_count')::integer,0)+1;
 decision:=case when n<2 then 'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED'
  else 'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED' end;
 failure:=pg_catalog.jsonb_build_object(
  'schema','reality-independent-chat-recovery-review-failure-v1',
  'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
  'source_message_id',q.source_message_id,
  'source_sha256',q.source_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'review_id',p_review_id,'review_worker_run_id',p_worker_run_id,
  'failure_code',p_failure_code,'retry_count',n,
  'next_phase',decision,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(failure::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase=decision,
  qualification_receipt=qualification_receipt||
   pg_catalog.jsonb_build_object(
    'target_review_retry_count',n,
    'target_review_failure_receipt_sha256',digest,
    'target_review_last_failure',failure,
    'target_review_failure_history',
     coalesce(qualification_receipt->'target_review_failure_history','[]'::jsonb)||
      pg_catalog.jsonb_build_array(failure),
    'target_review_next_action',case when n<2 then
     'INDEPENDENT_REVIEW_ON_NEXT_SIGNED_WAKE'
     else 'STRUCTURED_PROVIDER_OR_SOURCE_ESCALATION_REQUIRED' end),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status',case when n<2 then
   'SIGNED_CHAT_RECOVERY_INDEPENDENT_REVIEW_REQUEUED_AFTER_SOURCE_FAILURE'
    else 'SIGNED_CHAT_RECOVERY_REVIEW_EXTERNAL_EVIDENCE_REQUIRED' end,
  'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
  'failure_receipt_sha256',digest,
  'retry_count',n,'source_installed',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
create or replace function public.reality_reconcile_expired_signed_chat_target_review_v1(
 p_worker_run_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 r record;h record;n integer;decision text;failure jsonb;digest text;
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_CHAT_REVIEW_RECOVERY_SERVICE_ONLY';end if;
 select * into r from reality_internal.signed_worker_actual_runs_v1
 where run_id=p_worker_run_id and status='STARTED'
 and started_at>clock_timestamp()-interval '3 minutes';
 if r.run_id is null then
  raise exception 'SIGNED_CHAT_REVIEW_RECONCILIATION_WORKER_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED'
  and (qualification_receipt->'target_review_lease'->>'expires_at')::timestamptz
    <clock_timestamp()
  and qualification_receipt->'target_review_lease'->>'signed_worker_run_id'
     is distinct from p_worker_run_id::text
  and quarantine_receipt_sha256 is null
  and qualified_candidate is not null
  and recovery_spec_sha256='sha256:'||
    pg_catalog.encode(extensions.digest(recovery_spec::text,'sha256'),'hex')
 order by updated_at,trigger_id limit 1 for update skip locked;
 if q.trigger_id is null then
  return pg_catalog.jsonb_build_object(
   'status','NO_EXPIRED_SIGNED_CHAT_REVIEW_LEASE',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false,'new_shift_started',false);end if;
 select w.* into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
 and m.role='user' and m.user_id=w.owner_id
 and m.conversation_id=w.conversation_id
 and m.request_id=w.request_id
 where w.message_id=q.source_message_id
 and w.owner_id=q.owner_id and w.conversation_id=q.conversation_id
 and w.message_sha256=q.source_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->>'phase'='CI_VERIFIED'
 and w.development->>'original_work_id'=q.original_work_id
 and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256
 and w.development->>'installation_authorized'='false'
 and w.development->>'original_job_completed'='false'
 and w.development->>'production_changed'='false';
 if h.message_id is null then
  raise exception 'SIGNED_CHAT_REVIEW_EXPIRED_ORIGINAL_DRIFT';end if;
 n:=coalesce((q.qualification_receipt->>'target_review_retry_count')::integer,0)+1;
 decision:=case when n<2 then 'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED'
  else 'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_UNVERIFIED' end;
 failure:=pg_catalog.jsonb_build_object(
  'schema','reality-independent-chat-recovery-review-expiry-v1',
  'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
  'source_sha256',q.source_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'expired_review_id',
   q.qualification_receipt->'target_review_lease'->>'review_id',
  'expired_worker_run_id',
   q.qualification_receipt->'target_review_lease'->>'signed_worker_run_id',
  'reconciliation_run_id',p_worker_run_id,
  'failure_code','EXPIRED_PROVIDER_REVIEW_WITHOUT_VERDICT',
  'retry_count',n,'next_phase',decision,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(failure::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase=decision,
  qualification_receipt=qualification_receipt||
    pg_catalog.jsonb_build_object(
     'target_review_retry_count',n,
     'target_review_failure_receipt_sha256',digest,
     'target_review_last_failure',failure,
     'target_review_failure_history',
      coalesce(qualification_receipt->'target_review_failure_history','[]'::jsonb)||
       pg_catalog.jsonb_build_array(failure),
     'target_review_next_action',case when n<2 then
       'INDEPENDENT_REVIEW_ON_NEXT_SIGNED_WAKE'
       else 'STRUCTURED_PROVIDER_OR_SOURCE_ESCALATION_REQUIRED' end),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status',case when n<2 then
    'SIGNED_CHAT_RECOVERY_EXPIRED_REVIEW_REQUEUED_ON_SAME_ORIGINAL'
    else 'SIGNED_CHAT_RECOVERY_REVIEW_ESCALATION_REQUIRED' end,
  'original_work_id',q.original_work_id,
  'trigger_id',q.trigger_id,'failure_receipt_sha256',digest,
  'retry_count',n,'source_installed',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;
revoke all on function public.reality_record_signed_chat_recovery_target_review_failure_v1(uuid,uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_target_review_failure_v1(uuid,uuid,uuid,text)
 to service_role;
revoke all on function public.reality_reconcile_expired_signed_chat_target_review_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_reconcile_expired_signed_chat_target_review_v1(uuid)
 to service_role;
