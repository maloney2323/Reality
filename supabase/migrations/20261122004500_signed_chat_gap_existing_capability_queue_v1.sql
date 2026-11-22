-- Reality signed Chat original gap -> EXISTING genuine capability queue.
-- The Universe source type retains its historical strict event-ID checks.
-- A signed Chat gap uses independently hashed authenticated owner message and
-- prior CI evidence instead. Nothing here authorizes install or execution.
alter table reality_internal.genuine_capability_queue_v1
  add column if not exists source_kind text not null default 'UNIVERSE_VERIFIED_GAP',
  add column if not exists source_message_id uuid,
  add column if not exists source_sha256 text,
  add column if not exists blocker_receipt_sha256 text,
  add column if not exists recovery_spec jsonb,
  add column if not exists recovery_spec_sha256 text,
  add column if not exists quarantine_receipt_sha256 text;
alter table reality_internal.genuine_capability_queue_v1
  alter column original_work_event_id drop not null,
  alter column goal_transition_event_id drop not null,
  alter column gap_event_id drop not null;
alter table reality_internal.genuine_capability_queue_v1
  drop constraint genuine_capability_queue_v1_phase_check;
alter table reality_internal.genuine_capability_queue_v1
  add constraint genuine_capability_queue_v1_phase_check
  check (phase=any(array[
    'PENDING_FROZEN_REPRODUCTION','LEASED_FOR_INDEPENDENT_REPRODUCTION',
    'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE',
    'AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION','SETTLED_ISOLATED',
    'SIGNED_CHAT_RECOVERY_SPEC_FROZEN',
    'SIGNED_CHAT_RECOVERY_MODEL_CLAIMED',
    'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED',
    'SIGNED_CHAT_RECOVERY_PUBLISH_FENCED',
    'SIGNED_CHAT_RECOVERY_CANDIDATE_QUARANTINED',
    'SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
    'SIGNED_CHAT_RECOVERY_COMPATIBILITY_REVIEW_REQUIRED'
  ]));
alter table reality_internal.genuine_capability_queue_v1
 add constraint genuine_capability_source_lineage_v1 check (
  (source_kind='UNIVERSE_VERIFIED_GAP' and
   original_work_event_id is not null and goal_transition_event_id is not null and
   gap_event_id is not null and source_message_id is null and
   source_sha256 is null and blocker_receipt_sha256 is null and
   recovery_spec is null and recovery_spec_sha256 is null)
   or
  (source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY' and
   original_work_event_id is null and goal_transition_event_id is null and
   gap_event_id is null and source_message_id is not null and
   source_sha256 ~ '^[a-f0-9]{64}$' and
   blocker_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$' and
   recovery_spec_sha256 ~ '^sha256:[a-f0-9]{64}$' and
   jsonb_typeof(recovery_spec)='object' and
   (recovery_spec->>'original_work_id')=original_work_id and
   (recovery_spec->>'signed_message_id')=source_message_id::text and
   (recovery_spec->>'blocker_receipt_sha256')=blocker_receipt_sha256 and
   (recovery_spec->>'installation_authorized')='false' and
   (recovery_spec->>'full_goal_accepted')='false' and
   (recovery_spec->>'original_job_completed')='false')
 );
create unique index if not exists genuine_capability_signed_chat_gap_identity_v1
 on reality_internal.genuine_capability_queue_v1(owner_id,original_work_id,blocker_receipt_sha256)
 where source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY';

create or replace function public.reality_admit_next_signed_chat_recovery_spec_v1()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
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
  pg_catalog.substring(h.development->'evidence'->>'goal_gap_receipt_sha256' from 8),
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
end $fn$;

create or replace function public.reality_claim_next_signed_chat_recovery_candidate_v1(
 p_release_sha text) returns jsonb language plpgsql security invoker set search_path='' as $fn$
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
  qualification_receipt=pg_catalog.jsonb_build_object(
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
  'recovery_blocker_receipt_sha256',q.blocker_receipt_sha256,
  'claim_id',claim,'claim_expires_at',expires,
  'release_sha',p_release_sha,
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;

create or replace function public.reality_record_signed_chat_recovery_draft_v1(
 p_trigger_id uuid,p_claim_id uuid,p_base_sha text,p_target_path text,
 p_source_blob_sha text,p_find text,p_replace text,p_reason text,
 p_model_response_id text) returns jsonb
 language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype; c jsonb; digest text;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or q.source_kind<>'SIGNED_CHAT_DEVELOPMENT_RECOVERY'
  or q.phase<>'SIGNED_CHAT_RECOVERY_MODEL_CLAIMED'
  or q.claim_id is distinct from p_claim_id
  or q.claim_expires_at<clock_timestamp()
  or q.qualification_receipt->>'claim_release_sha' is distinct from p_base_sha
  or p_base_sha !~ '^[a-f0-9]{40}$'
  or p_source_blob_sha !~ '^[a-f0-9]{40}$'
  or p_target_path !~ '^(src/[A-Za-z0-9_./-]+\.js|api/reality/[A-Za-z0-9_./-]+\.js|reality-[A-Za-z0-9_.-]+\.(js|css)|index\.html)$'
  or pg_catalog.strpos(p_target_path,'..')>0
  or pg_catalog.strpos(p_target_path,'//')>0
  or pg_catalog.length(p_find)<20 or pg_catalog.length(p_find)>12000
  or pg_catalog.length(p_replace)<20 or pg_catalog.length(p_replace)>16000
  or p_find=p_replace or pg_catalog.length(p_reason)<10 or pg_catalog.length(p_reason)>1800
  or p_model_response_id !~ '^resp_[A-Za-z0-9_-]{4,160}$'
 then raise exception 'SIGNED_CHAT_RECOVERY_DRAFT_CLAIM_OR_PATCH_INVALID';end if;
 c:=pg_catalog.jsonb_build_object(
 'base_sha',p_base_sha,'source_blob_sha',p_source_blob_sha,
 'target_path',p_target_path,'find',p_find,'replace',p_replace,
 'reason',p_reason,'model_response_id',p_model_response_id,
 'spec_sha256',q.recovery_spec_sha256,
 'blocker_receipt_sha256',q.blocker_receipt_sha256,
 'original_work_id',q.original_work_id,
 'installation_authorized',false,'original_job_completed',false,
 'production_changed',false);
 digest:='sha256:'||pg_catalog.encode(extensions.digest(c::text,'sha256'),'hex');
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_DRAFT_GENERATED',
  qualified_candidate=c||pg_catalog.jsonb_build_object('candidate_sha256',digest),
  updated_at=clock_timestamp()
 where trigger_id=q.trigger_id;
 return pg_catalog.jsonb_build_object(
 'status','SIGNED_CHAT_RECOVERY_QUARANTINED_DRAFT_GENERATED',
 'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
 'candidate_sha256',digest,'recovery_spec_sha256',q.recovery_spec_sha256,
 'model_generated',true,'source_installed',false,
 'installation_authorized',false,'original_job_completed',false,
 'production_changed',false,'new_shift_started',false);
end $fn$;

create or replace function public.reality_mark_signed_chat_recovery_unverified_v1(
 p_trigger_id uuid,p_claim_id uuid,p_reason text) returns jsonb
 language plpgsql security invoker set search_path='' as $fn$
declare q reality_internal.genuine_capability_queue_v1%rowtype;
begin
 if current_user<>'service_role' then raise exception 'SIGNED_CHAT_RECOVERY_SERVICE_ONLY';end if;
 if p_reason !~ '^[A-Z][A-Z0-9_]{4,110}$' then raise exception 'INVALID_RECOVERY_REJECTION_REASON';end if;
 update reality_internal.genuine_capability_queue_v1
 set phase='SIGNED_CHAT_RECOVERY_MODEL_REJECTED',
  qualification_receipt=coalesce(qualification_receipt,'{}'::jsonb)||
   pg_catalog.jsonb_build_object(
   'negative_capability_memory',pg_catalog.jsonb_build_object(
    'reason',p_reason,'spec_sha256',recovery_spec_sha256,
    'blocker_receipt_sha256',blocker_receipt_sha256,
    'source_env_fingerprint',coalesce(qualification_receipt->>'claim_release_sha',''),
    'same_candidate_retry_forbidden',true),
   'rejected_at',clock_timestamp()),
  updated_at=clock_timestamp()
 where trigger_id=p_trigger_id and source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'
 and phase='SIGNED_CHAT_RECOVERY_MODEL_CLAIMED' and claim_id=p_claim_id
 returning * into q;
 if q.trigger_id is null then raise exception 'RECOVERY_REJECTION_CLAIM_NOT_CURRENT';end if;
 return pg_catalog.jsonb_build_object(
  'status','SIGNED_CHAT_RECOVERY_REJECTION_MEMORY_RECORDED',
  'trigger_id',q.trigger_id,'original_work_id',q.original_work_id,
  'next_action','CORRECT_SPEC_OR_ENVIRONMENT_WITH_FRESH_SIGNED_EVIDENCE',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,'new_shift_started',false);
end $fn$;

revoke all on function public.reality_admit_next_signed_chat_recovery_spec_v1() from public,anon,authenticated;
grant execute on function public.reality_admit_next_signed_chat_recovery_spec_v1() to service_role;
revoke all on function public.reality_claim_next_signed_chat_recovery_candidate_v1(text) from public,anon,authenticated;
grant execute on function public.reality_claim_next_signed_chat_recovery_candidate_v1(text) to service_role;
revoke all on function public.reality_record_signed_chat_recovery_draft_v1(uuid,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reality_record_signed_chat_recovery_draft_v1(uuid,uuid,text,text,text,text,text,text,text) to service_role;
revoke all on function public.reality_mark_signed_chat_recovery_unverified_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_mark_signed_chat_recovery_unverified_v1(uuid,uuid,text) to service_role;
