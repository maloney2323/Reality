-- Reality existing signed-chat blocker -> independent source-target review.
-- This keeps the SAME queue, signed original and recovery contract.
-- No generated source may reach the protected draft-PR publisher without a
-- separate signed worker invocation reviewing the pinned provider entrypoints.
alter table reality_internal.genuine_capability_queue_v1
 drop constraint genuine_capability_queue_v1_phase_check;
alter table reality_internal.genuine_capability_queue_v1
 add constraint genuine_capability_queue_v1_phase_check check (phase=any(array[
  'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
  'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE',
  'AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED',
  'SIGNED_CHAT_RECOVERY_SPEC_FROZEN','SIGNED_CHAT_RECOVERY_MODEL_CLAIMED',
  'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED','SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED',
  'SIGNED_CHAT_RECOVERY_TARGET_REVIEWED','SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED',
  'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED','SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED',
  'SIGNED_CHAT_RECOVERY_MODEL_REJECTED','SIGNED_CHAT_RECOVERY_COMPATIBILITY_REVIEW_REQUIRED'
 ]));

CREATE OR REPLACE FUNCTION public.reality_admit_next_signed_chat_recovery_spec_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare h record; specs jsonb; checkpoint jsonb; digest text; prior integer; q reality_internal.genuine_capability_queue_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select w.* into h
 from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on
 m.id=w.message_id and m.user_id=w.owner_id
 and m.conversation_id=w.conversation_id
 and m.request_id=w.request_id and m.role='user'
 where w.development->>'phase'='CI_VERIFIED'
 and w.development->>'original_work_id' ~ '^work:[a-f0-9]{32}$'
 and w.development->>'source_ref'='supabase:reality_chat_messages:'||w.message_id::text
 and w.development->>'source_sha256'=w.message_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
   pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->'evidence'->>'goal_gap_receipt_sha256' ~ '^sha256:[a-f0-9]{64}$'
 and w.development->'evidence'->>'goal_gap_next_action'=
 'INDEPENDENT_FULL_GOAL_FEATURE_TEST_AND_COMPATIBLE_SAME_ORIGINAL_INSTALL_ADAPTER_REQUIRED'
 and w.development->'evidence'->>'goal_gap_same_original_work_id'=
 w.development->>'original_work_id'
 and w.development->'evidence'->>'goal_gap_source_sha256'=w.message_sha256
 and w.development->'evidence'->>'feature_acceptance_verified'='false'
 and w.development->'evidence'->>'independent_ci_run_id' ~ '^[1-9][0-9]{4,}$'
 and w.development->'evidence'->>'artifact_commit_sha' ~ '^[a-f0-9]{40}$'
 and w.development->>'installation_authorized'='false'
 and w.development->>'production_changed'='false'
 and w.development->>'original_job_completed'='false'
 and not exists (
  select 1 from reality_internal.genuine_capability_queue_v1 x
   where x.source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
    and x.owner_id=w.owner_id
    and x.original_work_id=w.development->>'original_work_id'
    and x.blocker_receipt_sha256=w.development->'evidence'->>'goal_gap_receipt_sha256')
 order by w.created_at,w.message_id
 limit 1 for update of w skip locked;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_NEW_SIGNED_CHAT_RECOVERY_SPEC',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);end if;
 checkpoint:=pg_catalog.jsonb_build_object(
  'signed_source_sha256',h.message_sha256,
  'source_message_id',h.message_id,
  'original_work_id',h.development->>'original_work_id',
  'source_commit_sha',h.development->>'release_sha',
  'frozen_candidate_commit',h.development->'evidence'->>'artifact_commit_sha',
  'source_ci_run_id',(h.development->'evidence'->>'independent_ci_run_id')::bigint,
  'source_ci_scope',h.development->'evidence'->>'ci_scope',
  'checkpoint_phase','CI_VERIFIED');
 select count(*) into prior from reality_internal.verified_capability_receipt_releases_v1
 where report->>'capability_contract_id'='reality.chat-original.full-goal-installer-adapter-v1'
 and report->>'independent_full_goal_acceptance'='true'
 and report->>'installation_profile'='signed-chat-development-preview'
 and report->>'verified_current_environment'='true';
 specs:=pg_catalog.jsonb_build_object(
  'schema','reality-recovery-compiler-capability-spec-v1',
  'original_work_id',h.development->>'original_work_id',
  'signed_message_id',h.message_id,
  'source_ref',h.development->>'source_ref',
  'source_sha256',h.message_sha256,
  'blocker_receipt_sha256',h.development->'evidence'->>'goal_gap_receipt_sha256',
  'blocker_code',h.development->'evidence'->>'goal_gap_next_action',
  'original_goal',h.development->>'objective',
  'checkpoint',checkpoint,
  'required_capability_id','reality.chat-original.full-goal-installer-adapter-v1',
  'source_relevance_roots',pg_catalog.jsonb_build_array(
    'api/reality/governed-employee-shift-worker.js',
    'api/reality/generalized-original-install-review.js',
    'api/reality/generalized-owner-install-approval.js'),
  'source_relevance_gate','INDEPENDENT_PINNED_ENTRYPOINT_DEPENDENCY_REVIEW',
  'required_interfaces',pg_catalog.jsonb_build_array(
     'existing-chat-source-to-governed-development',
     'independent-full-original-goal-feature-acceptance',
     'compatible-same-original-preview-installer',
     'separate-exact-owner-install-authorization',
     'independent-provider-effect-and-final-universe-reconciliation'),
  'quarantine_policy',pg_catalog.jsonb_build_object(
    'source_write','isolated-draft-pr-only',
    'runtime_execution',false,'network_scope','github-provider-broker-only',
    'secret_access','broker-credential-only',
    'permissions_expansion',false,'promotion_requires_independent_ci',true),
  'rollback','fence-uncertain-provider-effect-no-replay-and-preserve-original',
  'resumption','independently-drift-check-and-resume-same-original-checkpoint',
  'candidate_source','existing-signed-chat-development-worker',
  'existing_registry_compatible_receipts',prior,
  'full_goal_accepted',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(specs::text,'sha256'),'hex');
 insert into reality_internal.genuine_capability_queue_v1
 (owner_id,conversation_id,original_work_id,
  original_work_event_id,goal_id,goal_transition_event_id,gap_event_id,
  provider_failure_hash,capability_id,source_ref,frozen_suite_ref,
  phase,source_kind,source_message_id,source_sha256,
  blocker_receipt_sha256,recovery_spec,recovery_spec_sha256)
 values(h.owner_id,h.conversation_id,h.development->>'original_work_id',
  null,'signed-chat-development:'||h.message_id::text,null,null,
  pg_catalog.substr(h.development->'evidence'->>'goal_gap_receipt_sha256',8),
  'reality.chat-original.full-goal-installer-adapter-v1',
  h.development->>'source_ref',
  'recovery-spec:'||digest,
  case when prior>0 then 'SIGNED_CHAT_RECOVERY_COMPATIBILITY_REVIEW_REQUIRED'
   else 'SIGNED_CHAT_RECOVERY_SPEC_FROZEN' end,
  'SIGNED_CHAT_DEVELOPMENT_RECOVERY',h.message_id,h.message_sha256,
  h.development->'evidence'->>'goal_gap_receipt_sha256',specs,digest)
 on conflict do nothing;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and owner_id=h.owner_id
 and original_work_id=h.development->>'original_work_id'
 and blocker_receipt_sha256=h.development->'evidence'->>'goal_gap_receipt_sha256';
 if q.trigger_id is null or q.source_message_id is distinct from h.message_id
    or q.source_sha256 is distinct from h.message_sha256
    or q.recovery_spec_sha256 is distinct from digest then
  raise exception 'SIGNED_CHAT_RECOVERY_SOURCE_CONFLICT';
 end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_SPEC_ATOMICALLY_FROZEN',
  'trigger_id',q.trigger_id,
  'original_work_id',q.original_work_id,
  'owner_id',q.owner_id,'source_message_id',q.source_message_id,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'compatible_registry_receipts',prior,
  'next_stage',q.phase,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;
CREATE OR REPLACE FUNCTION public.reality_claim_next_signed_chat_recovery_candidate_v1(p_release_sha text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q reality_internal.genuine_capability_queue_v1%rowtype; h record; claim uuid; expires timestamptz;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 if p_release_sha !~ '^[a-f0-9]{40}$' then raise exception 'SIGNED_CHAT_RECOVERY_RELEASE_SHA_INVALID';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN' and claim_id is null
 order by created_at,trigger_id limit 1 for update skip locked;
 if q.trigger_id is null then return pg_catalog.jsonb_build_object(
 'status','NO_PENDING_SIGNED_CHAT_RECOVERY'); end if;
 select w.*,m.content as original_instruction into h
 from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on
 m.id=w.message_id and m.user_id=w.owner_id and
 m.conversation_id=w.conversation_id and m.request_id=w.request_id and m.role='user'
 where w.message_id=q.source_message_id
 and w.owner_id=q.owner_id and w.conversation_id=q.conversation_id
 and w.development->>'phase'='CI_VERIFIED'
 and w.development->>'original_work_id'=q.original_work_id
 and w.message_sha256=q.source_sha256
 and w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
  pg_catalog.convert_to(m.content,'UTF8')),'hex')
 and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256
 and w.development->>'installation_authorized'='false'
 and w.development->>'original_job_completed'='false'
 and w.development->>'production_changed'='false';
 if h.message_id is null or q.recovery_spec_sha256 is distinct from
  'sha256:'||pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
  then raise exception 'SIGNED_CHAT_RECOVERY_SOURCE_OR_SPEC_DRIFT';end if;
 claim:=pg_catalog.gen_random_uuid();
 expires:=clock_timestamp()+interval '3 minutes';
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_MODEL_CLAIMED',claim_id=claim,
  claim_expires_at=expires,updated_at=clock_timestamp(),
  qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||pg_catalog.jsonb_build_object(
   'claim_worker_source','existing-signed-worker',
   'claim_release_sha',p_release_sha,
   'source_original_phase','CI_VERIFIED',
   'signed_spec_sha256',q.recovery_spec_sha256,
   'claim_created_at',clock_timestamp())
 where trigger_id=q.trigger_id and phase='SIGNED_CHAT_RECOVERY_SPEC_FROZEN';
 if not found then raise exception 'SIGNED_CHAT_RECOVERY_ATOMIC_CLAIM_LOST';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_SOURCE_LEASED',
  'recovery_mode',true,'trigger_id',q.trigger_id,
  'message_id',h.message_id,'request_id',h.request_id,
  'owner_id',h.owner_id,'conversation_id',h.conversation_id,
  'original_work_id',q.original_work_id,
  'source_ref',h.development->>'source_ref',
  'message_sha256',h.message_sha256,
  'original_instruction',h.original_instruction,
  'objective','Implement a bounded existing-Reality adapter for full original goal feature acceptance and SAME original governed isolated preview installation; preserve all exact owner approval and independent verification boundaries.',
  'recovery_spec_sha256',q.recovery_spec_sha256,
  'recovery_spec',q.recovery_spec,
  'recovery_blocker_receipt_sha256',q.blocker_receipt_sha256,
  'claim_id',claim,'claim_expires_at',expires,
  'release_sha',p_release_sha,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;

create or replace function public.reality_claim_next_signed_chat_recovery_target_review_v1(
 p_worker_run_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 h record; run record; v_review_id uuid;
 expected_roots jsonb;
begin
 if current_user<>'service_role' or p_worker_run_id is null then
  raise exception 'CHAT_RECOVERY_INDEPENDENT_SIGNED_REVIEWER_REQUIRED';end if;
 select * into run from reality_internal.signed_worker_actual_runs_v1
 where run_id=p_worker_run_id and status='STARTED'
 and started_at>clock_timestamp()-interval '3 minutes';
 if run.run_id is null then
  raise exception 'CHAT_RECOVERY_INDEPENDENT_WORKER_RUN_UNVERIFIED';end if;
 expected_roots:=pg_catalog.jsonb_build_array(
    'api/reality/governed-employee-shift-worker.js',
    'api/reality/generalized-original-install-review.js',
    'api/reality/generalized-owner-install-approval.js');
 select * into q from reality_internal.genuine_capability_queue_v1
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  and phase='SIGNED_CHAT_RECOVERY_DRAFT_GENERATED'
  and updated_at<run.started_at
  and recovery_spec->'source_relevance_roots'=expected_roots
  and recovery_spec_sha256='sha256:'||
    pg_catalog.encode(extensions.digest(recovery_spec::text,'sha256'),'hex')
  and qualified_candidate->>'spec_sha256'=recovery_spec_sha256
  and qualified_candidate->>'blocker_receipt_sha256'=blocker_receipt_sha256
  and qualified_candidate->>'original_work_id'=original_work_id
  and qualified_candidate->>'candidate_sha256'='sha256:'||
    pg_catalog.encode(extensions.digest(
      (qualified_candidate-'candidate_sha256')::text,'sha256'),'hex')
 order by updated_at,trigger_id limit 1 for update skip locked;
 if q.trigger_id is null then
  return pg_catalog.jsonb_build_object(
  'status','NO_SIGNED_CHAT_RECOVERY_CANDIDATE_TARGET_REVIEW_READY',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);end if;
 select w.* into h from reality_internal.chat_work_handoffs_v1 w
 join public.reality_chat_messages m on m.id=w.message_id
  and m.role='user' and m.user_id=w.owner_id and
  m.conversation_id=w.conversation_id and m.request_id=w.request_id
 where w.message_id=q.source_message_id and w.owner_id=q.owner_id
  and w.conversation_id=q.conversation_id
  and w.message_sha256=q.source_sha256 and
  w.message_sha256=pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(m.content,'UTF8')),'hex')
  and w.development->>'phase'='CI_VERIFIED'
  and w.development->>'original_work_id'=q.original_work_id
  and w.development->'evidence'->>'goal_gap_receipt_sha256'=q.blocker_receipt_sha256
  and w.development->>'installation_authorized'='false'
  and w.development->>'original_job_completed'='false'
  and w.development->>'production_changed'='false';
 if h.message_id is null then
  raise exception 'CHAT_RECOVERY_TARGET_REVIEW_ORIGINAL_DRIFT';end if;
 v_review_id:=pg_catalog.gen_random_uuid();
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED',
  qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||
   pg_catalog.jsonb_build_object('target_review_lease',pg_catalog.jsonb_build_object(
    'review_id',v_review_id,'signed_worker_run_id',p_worker_run_id,
    'source_claim_id',q.claim_id,'review_started_at',clock_timestamp(),
    'expires_at',clock_timestamp()+interval '3 minutes')),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id
 and phase='SIGNED_CHAT_RECOVERY_DRAFT_GENERATED';
 if not found then raise exception 'CHAT_RECOVERY_REVIEW_CONCURRENT_CLAIM_DRIFT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_LEASED',
  'trigger_id',q.trigger_id,'owner_id',q.owner_id,
  'original_work_id',q.original_work_id,'source_message_id',q.source_message_id,
  'source_ref',q.source_ref,'source_sha256',q.source_sha256,
  'blocker_receipt_sha256',q.blocker_receipt_sha256,
  'spec_sha256',q.recovery_spec_sha256,
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'target_path',q.qualified_candidate->>'target_path',
  'base_sha',q.qualified_candidate->>'base_sha',
  'source_blob_sha',q.qualified_candidate->>'source_blob_sha',
  'source_entrypoints',expected_roots,
  'review_id',v_review_id,'worker_run_id',p_worker_run_id,
  'source_installed',false,'feature_acceptance_verified',false,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;

create or replace function public.reality_record_signed_chat_recovery_target_review_v1(
 p_trigger_id uuid,p_review_id uuid,p_worker_run_id uuid,
 p_tree_sha text,p_roots jsonb,p_target_in_graph boolean)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
 run record; proof jsonb; digest text;
 roots text[]; evidence_paths text[];
begin
 if current_user<>'service_role' then
  raise exception 'SIGNED_CHAT_RECOVERY_REVIEW_SERVICE_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 select * into run from reality_internal.signed_worker_actual_runs_v1
 where run_id=p_worker_run_id and status='STARTED'
 and started_at>clock_timestamp()-interval '3 minutes';
 if q.trigger_id is null or run.run_id is null
  or q.source_kind<>'SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  or q.phase<>'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED'
  or q.qualification_receipt->'target_review_lease'->>'review_id'
     is distinct from p_review_id::text
  or q.qualification_receipt->'target_review_lease'->>'signed_worker_run_id'
     is distinct from p_worker_run_id::text
  or (q.qualification_receipt->'target_review_lease'->>'expires_at')::timestamptz
     <clock_timestamp()
  or q.recovery_spec_sha256 is distinct from 'sha256:'||
     pg_catalog.encode(extensions.digest(q.recovery_spec::text,'sha256'),'hex')
  or q.qualified_candidate->>'spec_sha256' is distinct from q.recovery_spec_sha256
  or q.qualified_candidate->>'blocker_receipt_sha256' is distinct from q.blocker_receipt_sha256
  or q.qualified_candidate->>'original_work_id' is distinct from q.original_work_id
  or p_tree_sha !~ '^[a-f0-9]{40}$'
  or p_target_in_graph is null
  or pg_catalog.jsonb_typeof(p_roots) is distinct from 'array'
 then raise exception 'SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_SCOPE_INVALID';end if;
 if pg_catalog.jsonb_array_length(p_roots)<>3 then
  raise exception 'SIGNED_CHAT_RECOVERY_REVIEW_ROOT_COUNT_DRIFT';end if;
 select pg_catalog.array_agg(value order by ord) into roots
 from pg_catalog.jsonb_array_elements_text(q.recovery_spec->'source_relevance_roots')
  with ordinality as t(value,ord);
 select pg_catalog.array_agg(element->>'path' order by ord) into evidence_paths
 from pg_catalog.jsonb_array_elements(p_roots)
  with ordinality as t(element,ord);
 if roots is distinct from evidence_paths
    or roots is distinct from array[
      'api/reality/governed-employee-shift-worker.js',
      'api/reality/generalized-original-install-review.js',
      'api/reality/generalized-owner-install-approval.js']::text[]
    or exists(select 1 from pg_catalog.jsonb_array_elements(p_roots) e
      where e->>'blob_sha' !~ '^[a-f0-9]{40}$')
 then raise exception 'SIGNED_CHAT_RECOVERY_REVIEW_ENTRYPOINT_PROOF_DRIFT';end if;
 proof:=pg_catalog.jsonb_build_object(
   'schema','reality-independent-signed-chat-target-review-v1',
   'original_work_id',q.original_work_id,'trigger_id',q.trigger_id,
   'owner_id',q.owner_id,'source_message_id',q.source_message_id,
   'source_sha256',q.source_sha256,
   'blocker_receipt_sha256',q.blocker_receipt_sha256,
   'spec_sha256',q.recovery_spec_sha256,
   'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
   'target_path',q.qualified_candidate->>'target_path',
   'base_sha',q.qualified_candidate->>'base_sha',
   'tree_sha',p_tree_sha,'root_proofs',p_roots,
   'review_id',p_review_id,'review_worker_run_id',p_worker_run_id,
   'target_in_graph',p_target_in_graph,
   'scope','DIRECT_PINNED_SIGNED_WORKER_AND_INSTALL_ENTRYPOINT_IMPORTS',
   'full_goal_accepted',false,'installation_authorized',false,
   'original_job_completed',false,'production_changed',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(proof::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase=case when p_target_in_graph then
     'SIGNED_CHAT_RECOVERY_TARGET_REVIEWED'
     else 'SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED' end,
  qualification_receipt=qualification_receipt||
    pg_catalog.jsonb_build_object(
      'target_review',proof,
      'target_review_receipt_sha256',digest,
      'last_target_rejection',case when p_target_in_graph then
       'null'::jsonb else pg_catalog.jsonb_build_object(
       'reason','CANDIDATE_TARGET_OUTSIDE_PINNED_RUNTIME_GRAPH',
       'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
       'source_release_sha',q.qualified_candidate->>'base_sha',
       'review_receipt_sha256',digest) end,
      'target_reviewed_at',clock_timestamp()),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
  'status',case when p_target_in_graph then
    'SIGNED_CHAT_RECOVERY_INDEPENDENT_DEPENDENCY_TARGET_VERIFIED'
   else 'SIGNED_CHAT_RECOVERY_OFF_TARGET_REJECTED_WITH_RECEIPT' end,
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'candidate_sha256',q.qualified_candidate->>'candidate_sha256',
  'target_review_receipt_sha256',digest,
  'target_in_graph',p_target_in_graph,
  'independent_full_goal_feature_accepted',false,
  'source_installed',false,'installation_authorized',false,
  'original_job_completed',false,'production_changed',false,'new_shift_started',false);
end $fn$;

revoke all on function public.reality_claim_next_signed_chat_recovery_target_review_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_claim_next_signed_chat_recovery_target_review_v1(uuid) to service_role;
revoke all on function public.reality_record_signed_chat_recovery_target_review_v1(uuid,uuid,uuid,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_target_review_v1(uuid,uuid,uuid,text,jsonb,boolean) to service_role;

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
  'release_sha',q.qualified_candidate->>'base_sha',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $function$
;

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
  or p_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_commit_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha = q.qualified_candidate->>'source_blob_sha'
  or p_artifact_blob_sha !~ '^[a-f0-9]{40}$'
  or p_branch is distinct from 'reality/chat-recovery/'||q.trigger_id::text
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
