-- Exactly-once signed service acceptance-gap transition for ANY existing
-- source-bound Chat-development original whose real CI has been reconciled.
-- This creates NO original/shift, does not execute feature tests, and never
-- confuses missing proof with a failing feature test or feature acceptance.
create or replace function public.reality_record_next_chat_development_goal_gap_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare v record; v_receipt text; v_next text; v_compatible boolean;
begin
 if current_user<>'service_role' then
  raise exception 'CHAT_GOAL_GAP_SIGNED_WORKER_SERVICE_ONLY';
 end if;
 select h.* into v
 from reality_internal.chat_work_handoffs_v1 h
 join public.reality_chat_messages m on
  m.id=h.message_id and m.user_id=h.owner_id and
  m.conversation_id=h.conversation_id and m.request_id=h.request_id
 where m.role='user' and pg_catalog.length(m.content)>=50 and
  h.development->>'version'='reality-chat-new-development-v1' and
  h.development->>'source_sha256'=h.message_sha256 and
  h.development->>'original_work_id' ~ '^work:[a-f0-9]{32}$' and
  pg_catalog.length(h.development->>'objective')>=8 and
  h.development->>'phase'='CI_VERIFIED' and
  h.development->>'independent_ci_verified'='true' and
  h.development->'evidence'->>'ci_scope'='SYNTAX_AND_SOURCE_IDENTITY_ONLY' and
  h.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$' and
  h.development->'evidence'->>'artifact_commit_sha' ~ '^[a-f0-9]{40}$' and
  h.development->'evidence'->>'feature_acceptance_verified'='false' and
  h.development->>'installation_authorized'='false' and
  h.development->>'original_job_completed'='false' and
  h.development->>'production_changed'='false' and
  not (h.development->'evidence' ? 'goal_gap_receipt_sha256')
 order by h.created_at,h.message_id limit 1
 for update of h skip locked;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','NO_UNRECORDED_SIGNED_CHAT_GOAL_ACCEPTANCE_GAP',
   'original_job_completed',false,'installation_authorized',false,
   'production_changed',false,'new_shift_started',false);
 end if;
 select exists(select 1 from reality_internal.riley_unattended_repair_originals_v1 r
  where r.original_work_id=v.development->>'original_work_id' and
   r.owner_id=v.owner_id) into v_compatible;
 v_next:=case when not v_compatible
  then 'INDEPENDENT_FULL_GOAL_FEATURE_TEST_AND_COMPATIBLE_SAME_ORIGINAL_INSTALL_ADAPTER_REQUIRED'
  else 'INDEPENDENT_FULL_GOAL_FEATURE_TEST_REQUIRED_BEFORE_EXACT_OWNER_INSTALL'
  end;
 v_receipt:='sha256:'||pg_catalog.encode(extensions.digest(
  v.message_id::text||':'||v.owner_id::text||':'||
  v.message_sha256||':'||(v.development->>'original_work_id')||':'||
  (v.development->'evidence'->>'artifact_commit_sha')||':'||
  (v.development->'evidence'->>'independent_ci_run_id')||':'||
  'FEATURE_ACCEPTANCE_NOT_YET_PROVEN:'||v_next,'sha256'),'hex');
 update reality_internal.chat_work_handoffs_v1
 set development=pg_catalog.jsonb_set(development,'{evidence}',
   (development->'evidence')||pg_catalog.jsonb_build_object(
    'goal_gap_receipt_sha256',v_receipt,
    'goal_gap_status','FULL_ORIGINAL_GOAL_ACCEPTANCE_PROOF_MISSING',
    'goal_gap_next_action',v_next,
    'goal_gap_recorded_at',clock_timestamp(),
    'goal_gap_same_original_work_id',v.development->>'original_work_id',
    'goal_gap_source_sha256',v.message_sha256,
    'goal_gap_syntax_ci_run_id',
      (v.development->'evidence'->>'independent_ci_run_id')::bigint,
    'goal_gap_independent_feature_test_verified',false,
    'goal_gap_compatible_install_lineage',v_compatible),true)
 where message_id=v.message_id
  and development->>'phase'='CI_VERIFIED'
  and not (development->'evidence' ? 'goal_gap_receipt_sha256');
 if not found then
  raise exception 'CHAT_GOAL_GAP_EXACT_ONCE_RACE';
 end if;
 return pg_catalog.jsonb_build_object(
  'status','CHAT_DEVELOPMENT_GOAL_GAP_SOURCE_BOUND_RECEIPTED',
  'owner_id',v.owner_id,'message_id',v.message_id,
  'original_work_id',v.development->>'original_work_id',
  'receipt_sha256',v_receipt,'next_action',v_next,
  'source_sha256',v.message_sha256,
  'independent_ci_run_id',
    (v.development->'evidence'->>'independent_ci_run_id')::bigint,
  'feature_acceptance_verified',false,
  'original_job_completed',false,'installation_authorized',false,
  'production_changed',false,'new_shift_started',false);
end; $fn$;
revoke all on function public.reality_record_next_chat_development_goal_gap_v1()
 from public,anon,authenticated;
grant execute on function public.reality_record_next_chat_development_goal_gap_v1()
 to service_role;
