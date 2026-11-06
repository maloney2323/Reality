create or replace function public.reality_register_verified_candidate_handoff_v1(
 p_receipt_id text,p_historical_work_id text,p_execution_generation integer default 1
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,reality_internal as $$
declare r reality_internal.verified_capability_receipt_releases_v1%rowtype;
        e public.universe_events%rowtype;
        h reality_internal.verified_candidate_handoffs_v1%rowtype;
        expected_id text;
begin
 if current_setting('role',true)<>'service_role' or p_execution_generation<>1 or
    p_receipt_id is null or p_historical_work_id is null then
  raise exception 'CANDIDATE_HANDOFF_TRUSTED_SERVICE_AND_GENERATION_REQUIRED';
 end if;
 select * into strict r from reality_internal.verified_capability_receipt_releases_v1
  where receipt_id=p_receipt_id and source_issue=188 and verified_checks=21;
 if r.source_sha256 !~ '^[0-9a-f]{64}$' or
    r.report->>'installation_authorized'<>'false' or
    r.report->>'original_customer_job_settled'<>'false' then
  raise exception 'CANDIDATE_HANDOFF_UNVERIFIED_RECEIPT';
 end if;
 select * into strict e from public.universe_events
 where entity_type='reality_original_source_backed_repair_work'
   and epistemic_status='VERIFIED'
   and payload->>'original_work_id'=p_historical_work_id
   and (payload->>'issue_number')::integer=r.source_issue
   and payload->>'owner_authorized_investigation'='true'
   and payload->>'owner_authorized_installation'='false'
   and payload->>'original_job_completed'='false'
   and payload->>'production_changed'='false'
   and provenance->>'principal_id'=payload->>'owner_id'
   and provenance->>'conversation_id' is not null
   and payload->>'original_goal_id' is not null;
 if e.payload->>'original_model_candidate_sha256'=r.source_sha256 then
  raise exception 'CANDIDATE_HANDOFF_HISTORICAL_CANDIDATE_ALREADY_IDENTICAL';
 end if;
 expected_id='candidate-handoff:'||substr(encode(extensions.digest(
   convert_to(p_historical_work_id||':'||r.source_sha256||':'||p_execution_generation::text,'UTF8'),'sha256'),'hex'),1,32);
 insert into reality_internal.verified_candidate_handoffs_v1(
  handoff_id,owner_id,conversation_id,historical_original_work_id,
  historical_original_work_event_id,goal_id,receipt_id,source_issue,
  candidate_sha256,execution_generation
 ) values (
  expected_id,(e.payload->>'owner_id')::uuid,(e.provenance->>'conversation_id')::uuid,
  p_historical_work_id,e.event_id,e.payload->>'original_goal_id',r.receipt_id,
  r.source_issue,r.source_sha256,p_execution_generation
 ) on conflict do nothing;
 select * into strict h from reality_internal.verified_candidate_handoffs_v1
 where handoff_id=expected_id;
 if h.owner_id<>(e.payload->>'owner_id')::uuid or
    h.conversation_id<>(e.provenance->>'conversation_id')::uuid or
    h.receipt_id<>r.receipt_id or h.candidate_sha256<>r.source_sha256 or
    h.phase<>'AWAITING_FRESH_OWNER_WORK_BINDING' or
    h.owner_install_authorized<>false then
  raise exception 'CANDIDATE_HANDOFF_IMMUTABLE_CONFLICT';
 end if;
 return jsonb_build_object(
 'status','CANDIDATE_REGISTERED_OWNER_SCOPED_AWAITING_FRESH_WORK_AUTHORITY',
 'handoff_id',h.handoff_id,'owner_id',h.owner_id,
 'historical_original_work_id',h.historical_original_work_id,
 'receipt_id',h.receipt_id,'candidate_sha256',h.candidate_sha256,
 'execution_generation',h.execution_generation,'phase',h.phase,
 'owner_install_authorized',false,'original_job_completed',false,'production_changed',false);
end;$$;
revoke all on function public.reality_register_verified_candidate_handoff_v1(text,text,integer)
from public,anon,authenticated;
grant execute on function public.reality_register_verified_candidate_handoff_v1(text,text,integer) to service_role;
