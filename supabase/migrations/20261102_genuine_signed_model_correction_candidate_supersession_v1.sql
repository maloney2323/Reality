
create table if not exists reality_internal.genuine_candidate_supersessions_v1 (
 trigger_id uuid primary key,
 original_work_id text not null,
 owner_id uuid not null,
 prior_candidate jsonb not null,
 prior_qualification_receipt jsonb not null,
 previous_artifact_sha256 text not null,
 corrected_artifact_sha256 text not null unique,
 corrected_model_response_id text not null,
 provider_run_id bigint not null,
 verified_proof jsonb not null,
 qualified_receipt jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table reality_internal.genuine_candidate_supersessions_v1 enable row level security;
revoke all on reality_internal.genuine_candidate_supersessions_v1 from anon,authenticated,public;
grant select,insert on reality_internal.genuine_candidate_supersessions_v1 to service_role;

create or replace function public.reality_supersede_genuine_qualified_candidate_v1(
 p_trigger_id uuid,p_candidate jsonb,p_proof jsonb)
 returns jsonb language plpgsql set search_path to '' as $function$
declare
 q reality_internal.genuine_capability_queue_v1%rowtype;
 o public.universe_events%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 prior_hash text;
 new_hash text;
 new_response text;
 normalized_files jsonb;
 computed_hash text;
 now_at timestamptz;
 receipt jsonb;
 existing reality_internal.genuine_candidate_supersessions_v1%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'GENUINE_REQUALIFICATION_SERVICE_ROLE_REQUIRED';end if;
 if p_trigger_id is null or jsonb_typeof(p_candidate)<>'object' or
  jsonb_typeof(p_proof)<>'object' then
  raise exception 'GENUINE_REQUALIFICATION_EXACT_INPUT_REQUIRED';end if;
 select * into q from reality_internal.genuine_capability_queue_v1
  where trigger_id=p_trigger_id for update;
 if q.trigger_id is null or q.phase<>'AWAITING_OWNER_APPROVAL' or
  q.qualified_candidate is null or q.qualification_receipt is null or
  q.verified_frozen_reproduction is null or q.claim_id is null or
  q.capability_id<>'reality-continuity-settlement-reconciler' then
  raise exception 'GENUINE_REQUALIFICATION_PRIOR_FROZEN_QUALIFICATION_REQUIRED';end if;
 select * into existing from reality_internal.genuine_candidate_supersessions_v1
  where trigger_id=p_trigger_id;
 if existing.trigger_id is not null then
  if existing.corrected_artifact_sha256=p_candidate->>'artifact_sha256'
   then return existing.qualified_receipt;end if;
  raise exception 'GENUINE_REQUALIFICATION_SINGLE_SUPERSESSION_CONFLICT';
 end if;
 if exists (select 1 from reality_internal.genuine_preview_install_approvals_v1 a
  where a.trigger_id=q.trigger_id)
 then raise exception 'GENUINE_REQUALIFICATION_OWNER_ALREADY_APPROVED';end if;
 select * into e from reality_internal.goal_publication_epochs
  where user_id=q.owner_id and conversation_id=q.conversation_id for update;
 select * into o from public.universe_events
  where event_id=q.original_work_event_id;
 if e.last_transition_event_id is distinct from q.goal_transition_event_id or
  o.event_id is null or o.epistemic_status<>'VERIFIED' or
  o.payload->>'original_work_id' is distinct from q.original_work_id or
  o.payload->>'owner_authorized_installation' is distinct from 'false' or
  o.payload->>'original_job_completed' is distinct from 'false' then
  raise exception 'GENUINE_REQUALIFICATION_ORIGINAL_GOAL_CHANGED';end if;
 if exists (select 1 from public.universe_events d where
  d.continuity_root_id=o.continuity_root_id and
  d.worldline_id=o.worldline_id and d.epistemic_status='VERIFIED' and
  d.payload->>'original_work_id'=q.original_work_id and
  (d.payload->>'original_job_completed'='true' or
   d.payload->>'constitutional_phase'='SETTLED')) then
  raise exception 'GENUINE_REQUALIFICATION_ALREADY_SETTLED';end if;
 prior_hash:=q.qualified_candidate->>'artifact_sha256';
 new_hash:=p_candidate->>'artifact_sha256';
 new_response:=p_candidate->>'model_response_id';
 if prior_hash !~ '^[a-f0-9]{64}$' or
  new_hash !~ '^[a-f0-9]{64}$' or new_hash=prior_hash or
  new_response !~ '^resp_[A-Za-z0-9_-]{12,160}$' or
  new_response=q.qualified_candidate->>'model_response_id' or
  p_candidate->>'original_work_id' is distinct from q.original_work_id or
  (p_candidate->>'ticket_hash') !~ '^[a-f0-9]{64}$' or
  jsonb_typeof(p_candidate->'files')<>'array' or
  jsonb_array_length(p_candidate->'files')<2 or
  jsonb_array_length(p_candidate->'files')>16 or
  octet_length(p_candidate::text)>250000 then
  raise exception 'GENUINE_REQUALIFICATION_NEW_MODEL_CANDIDATE_INVALID';end if;
 if exists (select 1 from jsonb_array_elements(p_candidate->'files') f
   where jsonb_typeof(f.value)<>'object' or
   f.value->>'path' !~ '^(src/reality-extensions/|test/reality-extensions/)[A-Za-z0-9._/-]+$' or
   f.value->>'path' like '%..%' or
   length(f.value->>'content') not between 1 and 70000)
  or not exists(select 1 from jsonb_array_elements(p_candidate->'files') f
     where f.value->>'path'=o.payload->>'source_path')
  or not exists(select 1 from jsonb_array_elements(p_candidate->'files') f
     where f.value->>'path' like 'test/reality-extensions/%')
  or (select count(distinct f.value->>'path') from jsonb_array_elements(p_candidate->'files') f)
       <> jsonb_array_length(p_candidate->'files') then
  raise exception 'GENUINE_REQUALIFICATION_EXTENSION_ONLY_SOURCE_REQUIRED';end if;
 select jsonb_agg(f.value order by f.value->>'path') into normalized_files
  from jsonb_array_elements(p_candidate->'files') f;
 computed_hash:=encode(extensions.digest(
   public.reality_continuity_canonical_json_v1(normalized_files),'sha256'),'hex');
 if computed_hash<>new_hash then
  raise exception 'GENUINE_REQUALIFICATION_SOURCE_DIGEST_MISMATCH';end if;
 if p_proof->>'status'<>'INDEPENDENT_PROVIDER_HOLDOUT_PASS' or
  p_proof->>'original_work_id' is distinct from q.original_work_id or
  p_proof->>'prior_artifact_sha256' is distinct from prior_hash or
  p_proof->>'artifact_sha256' is distinct from new_hash or
  p_proof->>'model_response_id' is distinct from new_response or
  p_proof->>'frozen_suite_sha256' is distinct from o.payload->>'frozen_test_sha256' or
  p_proof->>'independent_provider_holdout_verified' is distinct from 'true' or
  p_proof->>'provider_verification_job_passed' is distinct from 'true' or
  p_proof->>'installation_authorized' is distinct from 'false' or
  p_proof->>'original_job_completed' is distinct from 'false' or
  p_proof->>'production_changed' is distinct from 'false' or
  (p_proof->>'provider_run_id') !~ '^[1-9][0-9]{6,17}$' or
  (p_proof->>'verification_artifact_digest') !~ '^sha256:[a-f0-9]{64}$' or
  (p_proof->>'runner_git_sha') !~ '^[a-f0-9]{40}$' or
  (p_proof->>'holdout_tests')::int<5 or
  (p_proof->>'holdout_pass')::int<>(p_proof->>'holdout_tests')::int or
  p_proof->'sandbox'->>'runner_isolation'<>'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS' or
  p_proof->'sandbox'->>'passed' is distinct from 'true' or
  p_proof->'sandbox'->>'original_work_id' is distinct from q.original_work_id or
  p_proof->'sandbox'->>'artifact_sha256' is distinct from new_hash or
  p_proof->'sandbox'->>'model_response_id' is distinct from new_response or
  p_proof->'sandbox'->>'workflow_run_id' is distinct from p_proof->>'provider_run_id' or
  p_proof->'sandbox'->>'runner_git_sha' is distinct from p_proof->>'runner_git_sha' or
  (p_proof->'sandbox'->'frozen_result'->>'exit_code')::int<>0 or
  (p_proof->'sandbox'->'candidate_result'->>'exit_code')::int<>0 or
  (p_proof->'sandbox'->'frozen_result'->>'fail')::int<>0 or
  (p_proof->'sandbox'->'candidate_result'->>'fail')::int<>0 or
  (p_proof->'sandbox'->'frozen_result'->>'pass')::int<1 or
  (p_proof->'sandbox'->'candidate_result'->>'pass')::int<1 then
  raise exception 'GENUINE_REQUALIFICATION_SIGNED_REAL_EVIDENCE_REQUIRED';end if;
 now_at:=clock_timestamp();
 receipt:=jsonb_build_object(
  'schema','reality-genuine-requalification-supersession-v1',
  'status','AWAITING_OWNER_APPROVAL',
  'original_work_id',q.original_work_id,
  'trigger_id',q.trigger_id,
  'valid_time',o.effective_time,
  'transaction_time',now_at,
  'artifact_sha256',new_hash,'model_response_id',new_response,
  'prior_artifact_sha256',prior_hash,
  'real_provider_holdout_verified',true,
  'real_provider_holdout_artifact_sha256',new_hash,
  'provider_run_id',p_proof->>'provider_run_id',
  'verification_artifact_digest',p_proof->>'verification_artifact_digest',
  'frozen_pass',(p_proof->'sandbox'->'frozen_result'->>'pass')::int,
  'candidate_pass',(p_proof->'sandbox'->'candidate_result'->>'pass')::int,
  'holdout_pass',(p_proof->>'holdout_pass')::int,
  'attestation_source','SIGNED_GITHUB_WORKFLOW_INDEPENDENT_PROVIDER_AND_OFFLINE_SANDBOX',
  'installation_authorized',false,'original_job_completed',false,
  'production_changed',false,
  'post_state_hash',encode(extensions.digest(
    jsonb_build_object('previous_artifact',prior_hash,
      'new_artifact',new_hash,'run_id',p_proof->>'provider_run_id')::text,
    'sha256'),'hex'));
 insert into reality_internal.genuine_candidate_supersessions_v1(
  trigger_id,original_work_id,owner_id,prior_candidate,prior_qualification_receipt,
  previous_artifact_sha256,corrected_artifact_sha256,corrected_model_response_id,
  provider_run_id,verified_proof,qualified_receipt)
 values(q.trigger_id,q.original_work_id,q.owner_id,q.qualified_candidate,q.qualification_receipt,
  prior_hash,new_hash,new_response,(p_proof->>'provider_run_id')::bigint,p_proof,receipt);
 update reality_internal.genuine_capability_queue_v1
  set qualified_candidate=p_candidate,qualification_receipt=receipt,updated_at=now_at
  where trigger_id=q.trigger_id;
 return receipt;
end $function$;
revoke all on function public.reality_supersede_genuine_qualified_candidate_v1(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.reality_supersede_genuine_qualified_candidate_v1(uuid,jsonb,jsonb) to service_role;
