
create or replace function public.reality_qualify_genuine_candidate_v1(
 p_trigger_id uuid,p_gap_event_id uuid,p_candidate jsonb,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare t reality_internal.genuine_capability_queue_v1%rowtype;
 o public.universe_events%rowtype;
 e reality_internal.goal_publication_epochs%rowtype;
 tx timestamptz;
 pre_hash text;post_hash text;
 receipt jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'QUALIFICATION_SERVICE_ROLE_REQUIRED';end if;
 select * into t from reality_internal.genuine_capability_queue_v1
 where trigger_id=p_trigger_id and gap_event_id=p_gap_event_id for update;
 if t.trigger_id is null or t.claim_id is null or
  t.verified_frozen_reproduction is null then
  raise exception 'QUALIFICATION_TRUSTED_RED_CLAIM_REQUIRED';end if;
 if t.phase='AWAITING_OWNER_APPROVAL' then
  if t.qualified_candidate->>'artifact_sha256' is distinct from
    p_candidate->>'artifact_sha256'
  then raise exception 'QUALIFICATION_CANDIDATE_CONFLICT';end if;
  return t.qualification_receipt;
 end if;
 if t.phase<>'FROZEN_REPRODUCED_AWAITING_CANDIDATE' then
  raise exception 'QUALIFICATION_FROZEN_PHASE_REQUIRED';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'reality-goal-pub-v1:'||t.owner_id::text||':'||t.conversation_id::text,0));
 select * into e from reality_internal.goal_publication_epochs
 where user_id=t.owner_id and conversation_id=t.conversation_id for update;
 select * into o from public.universe_events
 where event_id=t.original_work_event_id;
 if e.last_transition_event_id is distinct from t.goal_transition_event_id or
  o.event_id is null or o.epistemic_status<>'VERIFIED' or
  o.payload->>'original_work_id' is distinct from t.original_work_id or
  o.payload->>'owner_authorized_investigation' is distinct from 'true' or
  o.payload->>'owner_authorized_installation' is distinct from 'false' or
  o.payload->>'original_job_completed' is distinct from 'false'
 then raise exception 'QUALIFICATION_OWNER_GOAL_ORIGINAL_CHANGED';end if;
 if exists(select 1 from public.universe_events d
   where d.continuity_root_id=o.continuity_root_id and
   d.worldline_id=o.worldline_id and d.epistemic_status='VERIFIED' and
   d.payload->>'original_work_id'=t.original_work_id and
   (d.payload->>'original_job_completed'='true' or
    d.payload->>'constitutional_phase'='SETTLED'))
 then raise exception 'QUALIFICATION_ORIGINAL_ALREADY_SETTLED';end if;
 if p_candidate->>'original_work_id' is distinct from t.original_work_id or
   (p_candidate->>'artifact_sha256') !~ '^[a-f0-9]{64}$' or
   (p_candidate->>'ticket_hash') !~ '^[a-f0-9]{64}$' or
   (p_candidate->>'model_response_id') !~ '^resp_[A-Za-z0-9_-]{12,160}$' or
   jsonb_typeof(p_candidate->'files')<>'array' or
   jsonb_array_length(p_candidate->'files')<2 or
   pg_catalog.octet_length(p_candidate::text)>250000 or
   p_proof->>'original_work_id' is distinct from t.original_work_id or
   p_proof->>'artifact_sha256' is distinct from p_candidate->>'artifact_sha256' or
   p_proof->>'ticket_hash' is distinct from p_candidate->>'ticket_hash' or
   p_proof->>'model_response_id' is distinct from p_candidate->>'model_response_id' or
   p_proof->>'frozen_suite_sha256' is distinct from
     o.payload->>'frozen_test_sha256' or
   p_proof->>'runner_isolation'<>'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS' or
   p_proof->>'passed' is distinct from 'true' or
   p_proof->>'installation_authorized' is distinct from 'false' or
   p_proof->>'original_job_completed' is distinct from 'false' or
   (p_proof->'frozen_result'->>'exit_code')::int<>0 or
   (p_proof->'candidate_result'->>'exit_code')::int<>0 or
   (p_proof->'frozen_result'->>'tests')::int<1 or
   (p_proof->'candidate_result'->>'tests')::int<1 or
   (p_proof->'frozen_result'->>'fail')::int<>0 or
   (p_proof->'candidate_result'->>'fail')::int<>0 or
   (p_proof->'frozen_result'->>'pass')::int is distinct from
    (p_proof->'frozen_result'->>'tests')::int or
   (p_proof->'candidate_result'->>'pass')::int is distinct from
    (p_proof->'candidate_result'->>'tests')::int
 then raise exception 'QUALIFICATION_EXACT_SANDBOX_EVIDENCE_REQUIRED';end if;
 tx:=pg_catalog.clock_timestamp();
 pre_hash:=pg_catalog.encode(extensions.digest(
   (pg_catalog.jsonb_build_object('phase',t.phase,
    'original_work_id',t.original_work_id,'claim_id',t.claim_id,
    'gap_event_id',t.gap_event_id,'provider_failure_hash',t.provider_failure_hash)
   )::text,'sha256'),'hex');
 post_hash:=pg_catalog.encode(extensions.digest(
   (pg_catalog.jsonb_build_object('phase','AWAITING_OWNER_APPROVAL',
    'original_work_id',t.original_work_id,'claim_id',t.claim_id,
    'gap_event_id',t.gap_event_id,'candidate_hash',
    p_candidate->>'artifact_sha256'))::text,'sha256'),'hex');
 receipt:=pg_catalog.jsonb_build_object(
   'schema','reality-genuine-capability-qualification-v1',
   'status','AWAITING_OWNER_APPROVAL',
   'original_work_id',t.original_work_id,
   'trigger_id',t.trigger_id,'gap_event_id',t.gap_event_id,
   'claim_id',t.claim_id,'artifact_sha256',p_candidate->>'artifact_sha256',
   'model_response_id',p_candidate->>'model_response_id',
   'frozen_tests',(p_proof->'frozen_result'->>'tests')::int,
   'frozen_pass',(p_proof->'frozen_result'->>'pass')::int,
   'candidate_tests',(p_proof->'candidate_result'->>'tests')::int,
   'candidate_pass',(p_proof->'candidate_result'->>'pass')::int,
   'valid_time',o.effective_time,'transaction_time',tx,
   'pre_state_hash',pre_hash,'post_state_hash',post_hash,
   'attestation_source','SIGNED_GITHUB_WORKFLOW_WITH_INDEPENDENT_SANDBOX',
   'provider_run_id',p_proof->>'workflow_run_id',
   'installation_authorized',false,'original_job_completed',false,
   'production_changed',false);
 update reality_internal.genuine_capability_queue_v1
 set phase='AWAITING_OWNER_APPROVAL',qualified_candidate=p_candidate,
 qualification_receipt=receipt,updated_at=tx
 where trigger_id=t.trigger_id;
 return receipt;
end $$;
revoke all on function public.reality_qualify_genuine_candidate_v1(uuid,uuid,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function public.reality_qualify_genuine_candidate_v1(uuid,uuid,jsonb,jsonb)
 to service_role;
