
-- Durable one-time binding from a source-verified candidate to a NEW work ID.
-- Authority: a previously authenticated owner goal authorizing discovery/testing,
-- NOT this worker impersonating a user and NOT installation approval.
create or replace function reality_internal.canonical_json_for_followon_v1(v jsonb)
returns text language plpgsql immutable strict set search_path=pg_catalog as $$
declare result text;
begin
 case jsonb_typeof(v)
 when 'object' then
  select '{'||coalesce(string_agg(to_jsonb(k)::text||':'||
   reality_internal.canonical_json_for_followon_v1(val),',' order by k),'')||'}'
  into result from jsonb_each(v) as src(k,val);
  return result;
 when 'array' then
  select '['||coalesce(string_agg(reality_internal.canonical_json_for_followon_v1(val),',' order by ord),'')||']'
  into result from jsonb_array_elements(v) with ordinality as src(val,ord);
  return result;
 else return v::text;
 end case;
end$$;
revoke all on function reality_internal.canonical_json_for_followon_v1(jsonb) from public,anon,authenticated;
create or replace function reality_internal.uuid_from_followon_source_v1(v text)
returns uuid language plpgsql immutable strict set search_path=pg_catalog as $$
declare b bytea; h text;
begin
 b:=extensions.digest(convert_to(v,'UTF8'),'sha256');
 b:=set_byte(b,6,(get_byte(b,6)&15)|80);
 b:=set_byte(b,8,(get_byte(b,8)&63)|128);
 h:=encode(substring(b from 1 for 16),'hex');
 return (substr(h,1,8)||'-'||substr(h,9,4)||'-'||substr(h,13,4)||'-'||
   substr(h,17,4)||'-'||substr(h,21,12))::uuid;
end$$;
revoke all on function reality_internal.uuid_from_followon_source_v1(text) from public,anon,authenticated;
create or replace function public.reality_bind_verified_candidate_followon_v1(p_handoff_id text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,reality_internal as $$
declare h reality_internal.verified_candidate_handoffs_v1%rowtype;
 old public.universe_events%rowtype;
 goal public.universe_events%rowtype;
 epoch reality_internal.goal_publication_epochs%rowtype;
 prior public.universe_events%rowtype;
 existing public.universe_events%rowtype;
 root uuid; worldline uuid; work text; ev uuid; entity uuid;
 payload jsonb; provenance jsonb; stored_provenance jsonb;
 refs jsonb; chain jsonb; now_iso text; hash_line text; hash_content text;
 tips_count integer; original_settled_count integer;
begin
 if current_setting('role',true)<>'service_role' then
  raise exception 'CANDIDATE_FOLLOWON_SIGNED_SERVICE_REQUIRED';
 end if;
 select * into strict h from reality_internal.verified_candidate_handoffs_v1
  where handoff_id=p_handoff_id and execution_generation=1 and
        phase='AWAITING_FRESH_OWNER_WORK_BINDING' and owner_install_authorized=false;
 select * into strict old from public.universe_events
  where event_id=h.historical_original_work_event_id;
 if old.entity_type<>'reality_original_source_backed_repair_work' or
    old.epistemic_status<>'VERIFIED' or
    old.payload->>'owner_id'<>h.owner_id::text or
    old.payload->>'original_work_id'<>h.historical_original_work_id or
    old.payload->>'goal_id'<>h.goal_id or
    old.payload->>'issue_number'<>h.source_issue::text or
    old.payload->>'owner_authorized_investigation'<>'true' or
    old.payload->>'owner_authorized_installation'<>'false' or
    old.provenance->>'conversation_id'<>h.conversation_id::text or
    old.provenance->>'principal_id'<>h.owner_id::text
 then raise exception 'CANDIDATE_FOLLOWON_HISTORIC_SCOPE_INVALID';end if;
 select count(*) into original_settled_count from public.universe_events s
 where s.entity_type='reality_general_constitutional_checkpoint'
   and s.epistemic_status='VERIFIED'
   and s.payload->>'original_work_id'=h.historical_original_work_id
   and s.payload->'driver_state'->>'phase'='SETTLED';
 if original_settled_count<>1 then
  raise exception 'CANDIDATE_FOLLOWON_HISTORICAL_SETTLEMENT_NOT_UNIQUE';end if;
 if not exists(select 1 from reality_internal.verified_capability_receipt_releases_v1 r
  where r.receipt_id=h.receipt_id and r.source_sha256=h.candidate_sha256
  and r.provider_run_id=41547631404 and r.verified_checks=21
  and r.source_issue=h.source_issue)
 then raise exception 'CANDIDATE_FOLLOWON_SOURCE_RECEIPT_INVALID';end if;
 select * into strict epoch from reality_internal.goal_publication_epochs
  where user_id=h.owner_id and conversation_id=h.conversation_id;
 select * into strict goal from public.universe_events
  where event_id=epoch.last_transition_event_id;
 if epoch.last_transition_event_id::text<>old.payload->>'goal_transition_receipt_ref'
   or goal.payload->>'event_type'<>'AUTHORITATIVE_USER_GOAL_TRANSITION'
   or goal.payload->>'authorized_by'<>'AUTHENTICATED_USER_EXPLICIT_GOAL_COMMAND'
   or goal.payload->>'principal_id'<>h.owner_id::text
   or goal.payload->>'goal_id'<>h.goal_id
   or goal.payload->>'user_directed_objective' not like '%Independently discover bugs%'
   or goal.payload->>'user_directed_objective' not like '%Identify and test upgrades%'
   or goal.payload->>'user_directed_objective' not like '%Require my explicit approval%'
 then raise exception 'CANDIDATE_FOLLOWON_STANDING_OWNER_SCOPE_NOT_VERIFIED';end if;
 root:=old.continuity_root_id;worldline:=old.worldline_id;
 perform pg_advisory_xact_lock(hashtextextended('reality-candidate-new-work:'||h.handoff_id,0));
 work:='work:'||substr(encode(extensions.digest(convert_to(
  'reality:governed:followon:v1:'||h.owner_id::text||':'||h.goal_id||':'||
  h.historical_original_work_id||':'||h.candidate_sha256||':'||
  h.execution_generation::text,'UTF8'),'sha256'),'hex'),1,32);
 if work=h.historical_original_work_id then raise exception 'CANDIDATE_FOLLOWON_OLD_WORK_COLLISION';end if;
 ev:=reality_internal.uuid_from_followon_source_v1('governed-followon-event:'||work);
 entity:=reality_internal.uuid_from_followon_source_v1(work);
 select * into existing from public.universe_events where event_id=ev;
 if existing.event_id is not null then
  if existing.entity_type<>'reality_original_source_backed_repair_work' or
     existing.payload->>'original_work_id'<>work or
     existing.payload->>'original_model_candidate_sha256'<>h.candidate_sha256 or
     existing.payload->>'owner_id'<>h.owner_id::text or
     existing.payload->>'owner_authorized_installation'<>'false' then
   raise exception 'CANDIDATE_FOLLOWON_EXISTING_EVENT_CONFLICT';end if;
 else
  select count(*),min(e.event_id::text)::uuid into tips_count,ev
   from public.universe_events e where e.continuity_root_id=root and e.worldline_id=worldline
    and not exists(select 1 from public.universe_events child
                   where child.parent_event_id=e.event_id);
  if tips_count<>1 then raise exception 'CANDIDATE_FOLLOWON_CHAIN_FORKED';end if;
  select * into strict prior from public.universe_events where event_id=ev;
  ev:=reality_internal.uuid_from_followon_source_v1('governed-followon-event:'||work);
  now_iso:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  payload:=old.payload||
   jsonb_build_object(
     'followon_version','reality-governed-verified-candidate-followon-v1',
     'parent_original_work_id',h.historical_original_work_id,
     'verified_candidate_receipt_id',h.receipt_id,
     'original_model_candidate_sha256',h.candidate_sha256,
     'model_verification_run_id',41547631404,
     'execution_generation',h.execution_generation,
     'original_work_id',work,
     'owner_authorized_investigation',true,
     'investigation_authority_origin','OWNER_CONFIRMED_STANDING_GOAL',
     'owner_authorized_installation',false,
     'original_job_completed',false,'production_changed',false);
  provenance:=jsonb_build_object(
   'source','reality-governed-verified-candidate-followon-v1',
   'principal_id',h.owner_id,'conversation_id',h.conversation_id);
  stored_provenance:=provenance||jsonb_build_object('continuity_spine',
     jsonb_build_object('version','reality-continuity-spine-v2.1',
     'prior_lineage_hash',prior.lineage_hash,
     'transformation_receipt_id',null,'source_event_id',null,
     'source_entity_id',null,'source_continuity_root_id',null,
     'source_worldline_id',null));
  refs:=jsonb_build_array('https://github.com/maloney2323/Reality/actions/runs/41547631404',
   'supabase:verified-candidate-receipt:'||h.receipt_id,old.event_id::text);
  chain:=jsonb_build_object(
   'spine_version','reality-continuity-spine-v2.1',
   'continuity_root_id',root::text,'worldline_id',worldline::text,
   'parent_event_id',prior.event_id::text,
   'prior_lineage_hash',prior.lineage_hash,
   'stage','OBSERVATION','entity_id',entity::text,
   'evidence_refs',refs,'transformation_receipt_id',null,
   'effective_time',now_iso,'assertion_time',now_iso,
   'epistemic_status','VERIFIED','payload',payload,'provenance',provenance);
  hash_line:=encode(extensions.digest(convert_to(
   reality_internal.canonical_json_for_followon_v1(chain),'UTF8'),'sha256'),'hex');
  hash_content:=encode(extensions.digest(convert_to(
   reality_internal.canonical_json_for_followon_v1(payload),'UTF8'),'sha256'),'hex');
  insert into public.universe_events(
   event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,
   parent_event_id,effective_time,assertion_time,epistemic_status,payload,
   evidence_refs,provenance,content_hash,lineage_hash)
  values(ev,'OBSERVATION','reality_original_source_backed_repair_work',
   entity,root,worldline,prior.event_id,now_iso::timestamptz,
   now_iso::timestamptz,'VERIFIED',payload,refs,stored_provenance,hash_content,hash_line);
 end if;
 select * into strict existing from public.universe_events where event_id=ev;
 if existing.payload->>'original_work_id'<>work or
   existing.payload->>'original_model_candidate_sha256'<>h.candidate_sha256 or
   existing.epistemic_status<>'VERIFIED'
 then raise exception 'CANDIDATE_FOLLOWON_POST_WRITE_READBACK_FAILED';end if;
 return jsonb_build_object(
  'status','FRESH_GOVERNED_INVESTIGATION_WORK_SOURCE_BOUND',
  'historical_original_work_id',h.historical_original_work_id,
  'new_original_work_id',work,
  'new_original_work_event_id',ev,
  'goal_transition_event_id',epoch.last_transition_event_id,
  'owner_id',h.owner_id,'receipt_id',h.receipt_id,
  'candidate_sha256',h.candidate_sha256,
  'investigation_authorized_from_standing_goal',true,
  'installation_authorized',false,'owner_approval_issued',false,
  'original_job_completed',false,'production_changed',false);
end$$;
revoke all on function public.reality_bind_verified_candidate_followon_v1(text)
from public,anon,authenticated;
grant execute on function public.reality_bind_verified_candidate_followon_v1(text) to service_role;
