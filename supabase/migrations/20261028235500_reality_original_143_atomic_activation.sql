-- Isolated Reality original customer job #143 capability/settlement transactions.
-- Creates methods ONLY: does not install a capability, approve owner action,
-- change any existing user state, close GitHub issue, or touch production.
-- Both functions are callable solely by a trusted service-role server after
-- authentication, source verification, explicit consent and fresh goal binding.
create or replace function public.reality_register_original_143_capability(
 p_owner_id uuid, p_conversation_id uuid, p_reservation_id uuid,
 p_event jsonb, p_registry jsonb
) returns jsonb
language plpgsql security invoker set search_path to ''
as $fn$
declare
 r record;
 ep record;
 tail record;
 acc record;
 ev uuid;
 cid uuid;
 root uuid;
 worldline uuid;
 parent uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
 then raise exception 'ORIGINAL_143_SERVICE_ROLE_REQUIRED'; end if;
 if p_owner_id is null or p_conversation_id is null or p_reservation_id is null or
    jsonb_typeof(p_event) <> 'object' or jsonb_typeof(p_registry) <> 'object'
 then raise exception 'ORIGINAL_143_REGISTRATION_INPUT_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into r from reality_internal.execution_reservations
 where user_id=p_owner_id and conversation_id=p_conversation_id and
 reservation_id=p_reservation_id for update;
 if not found or r.status <> 'RESERVED'
 then raise exception 'ORIGINAL_143_ONE_TIME_RESERVATION_REQUIRED'; end if;
 select * into ep from reality_internal.goal_publication_epochs
 where user_id=p_owner_id and conversation_id=p_conversation_id for update;
 if not found or
   ep.revision is distinct from r.goal_revision or
   ep.last_transition_event_id is distinct from r.goal_transition_event_id or
   ep.user_message_revision is distinct from r.user_message_revision or
   ep.latest_user_request_id is distinct from r.latest_user_request_id
 then raise exception 'ORIGINAL_143_OWNER_GOAL_EPOCH_CHANGED'; end if;
 if r.goal_id is distinct from p_event->'payload'->>'original_goal_id' or
    p_event->'payload'->>'owner_id' is distinct from p_owner_id::text or
    p_event->'payload'->>'conversation_id' is distinct from p_conversation_id::text or
    p_event->'payload'->>'original_work_id' is distinct from 'work:24cda9611404e9bcb47909976067605c' or
    p_event->'payload'->>'owner_confirmation' is distinct from 'ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY' or
    p_event->'payload'->>'target_branch' is distinct from 'experiment/reality-live-durable-adversarial-20261025' or
    p_event->'payload'->>'source_sha256' is distinct from '7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128' or
    p_event->'payload'->>'runtime_activation_verified' is distinct from 'true' or
    p_event->'payload'->>'registration_readback_verified' is distinct from 'true' or
    p_event->>'entity_type' is distinct from 'personal_original_executor_capability_registered' or
    p_event->>'event_kind' is distinct from 'CAPABILITY' or
    p_event->>'epistemic_status' is distinct from 'VERIFIED' or
    p_registry->>'capability_id' is distinct from 'a5b94c83-65a5-5bfd-ac13-90fdd6510052' or
    p_registry->>'capability_version' is distinct from 'original-repair-executor-1' or
    p_registry->>'status' is distinct from 'ACTIVE' or
    p_registry->'verification_basis'->>'owner_id' is distinct from p_owner_id::text or
    p_registry->'verification_basis'->>'original_goal_id' is distinct from r.goal_id or
    p_registry->'verification_basis'->>'original_work_id' is distinct from 'work:24cda9611404e9bcb47909976067605c' or
    p_registry->'verification_basis'->>'target_branch' is distinct from 'experiment/reality-live-durable-adversarial-20261025' or
    p_registry->'verification_basis'->>'source_sha256' is distinct from '7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128' or
    p_registry->'verification_basis'->>'independent_live_run_ref' is distinct from 'https://github.com/maloney2323/Reality/actions/runs/40777160879' or
    p_registry->'procedure'->>'runtime_import_verified' is distinct from 'true'
 then raise exception 'ORIGINAL_143_REGISTRATION_EVIDENCE_INVALID'; end if;
 ev := (p_event->>'event_id')::uuid;
 cid := (p_registry->>'capability_id')::uuid;
 root := (p_event->>'continuity_root_id')::uuid;
 worldline := (p_event->>'worldline_id')::uuid;
 parent := (p_event->>'parent_event_id')::uuid;
 if ev is null or root is null or worldline is null or parent is null or
    p_registry->>'admitted_event_id' is distinct from ev::text or
    p_event->>'lineage_hash' !~ '^[a-f0-9]{64}$' or
    p_event->>'content_hash' !~ '^[a-f0-9]{64}$'
 then raise exception 'ORIGINAL_143_REGISTRATION_CONTINUITY_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-universe-tail:'||root::text||':'||worldline::text,0));
 select event_id,lineage_hash into tail from public.universe_events
 where continuity_root_id=root and worldline_id=worldline
 order by assertion_time desc,created_at desc,event_id desc limit 1;
 if not found or tail.event_id <> parent or
   p_event->>'prior_lineage_hash' is distinct from tail.lineage_hash
 then raise exception 'ORIGINAL_143_CONTINUITY_PARENT_CHANGED'; end if;
 select event_id into acc from public.universe_events
 where continuity_root_id=root and worldline_id=worldline and
 entity_type='personal_original_repair_owner_acceptance' and
 payload->>'owner_id'=p_owner_id::text and
 payload->>'conversation_id'=p_conversation_id::text and
 payload->>'original_goal_id'=r.goal_id and
 payload->>'owner_confirmation'='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY'
 limit 1;
 if not found then raise exception 'ORIGINAL_143_ORIGINAL_ACCEPTANCE_MISSING'; end if;
 if exists(select 1 from public.universe_capabilities where capability_id=cid)
 then raise exception 'ORIGINAL_143_CAPABILITY_ALREADY_REGISTERED'; end if;
 insert into public.universe_events (
  event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,
  parent_event_id,effective_time,assertion_time,epistemic_status,
  payload,evidence_refs,provenance,content_hash,lineage_hash
 ) values (
  ev,'CAPABILITY','personal_original_executor_capability_registered',
  (p_event->>'entity_id')::uuid,root,worldline,parent,
  (p_event->>'effective_time')::timestamptz,
  (p_event->>'assertion_time')::timestamptz,'VERIFIED',
  p_event->'payload',p_event->'evidence_refs',p_event->'provenance',
  p_event->>'content_hash',p_event->>'lineage_hash'
 );
 insert into public.universe_capabilities(
  capability_id,capability_version,status,purpose,preconditions,procedure,
  failure_modes,verification_basis,performance,admitted_event_id
 ) values (
  cid,'original-repair-executor-1','ACTIVE',
  'Isolated original Reality customer job #143 evidence-bound reconciliation',
  coalesce(p_registry->'preconditions','[]'::jsonb),
  p_registry->'procedure',
  coalesce(p_registry->'failure_modes','[]'::jsonb),
  p_registry->'verification_basis',
  coalesce(p_registry->'performance','{}'::jsonb),ev
 );
 update reality_internal.execution_reservations
 set status='VERIFIED',dispatch_started_at=pg_catalog.now(),
 settled_at=pg_catalog.now(),verification_receipt_ref='original-registry:'||ev::text
 where reservation_id=p_reservation_id;
 if not exists(select 1 from public.universe_capabilities
  where capability_id=cid and admitted_event_id=ev and status='ACTIVE')
 then raise exception 'ORIGINAL_143_REGISTRY_ATOMIC_READBACK_FAILED'; end if;
 return pg_catalog.jsonb_build_object('status','REGISTERED',
  'capability_id',cid,'registration_event_id',ev,
  'reservation_id',p_reservation_id);
end
$fn$;

create or replace function public.reality_settle_original_143_job(
 p_owner_id uuid,p_conversation_id uuid,p_registration_event_id uuid,
 p_event jsonb
) returns jsonb
language plpgsql security invoker set search_path to ''
as $fn$
declare
 rowcap record;
 prior record;
 old record;
 ep record;
 id uuid;
 root uuid;
 worldline uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
 then raise exception 'ORIGINAL_143_SERVICE_ROLE_REQUIRED'; end if;
 if p_owner_id is null or p_conversation_id is null or p_registration_event_id is null or
 jsonb_typeof(p_event) <> 'object'
 then raise exception 'ORIGINAL_143_SETTLEMENT_INPUT_INVALID'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-goal-pub-v1:'||p_owner_id::text||':'||p_conversation_id::text,0));
 select * into rowcap from public.universe_capabilities
 where capability_id='a5b94c83-65a5-5bfd-ac13-90fdd6510052'::uuid
 and capability_version='original-repair-executor-1' and status='ACTIVE'
 and admitted_event_id=p_registration_event_id for update;
 if not found or
  rowcap.verification_basis->>'owner_id' is distinct from p_owner_id::text or
  rowcap.verification_basis->>'original_work_id' is distinct from 'work:24cda9611404e9bcb47909976067605c'
 then raise exception 'ORIGINAL_143_VERIFIED_REGISTRATION_REQUIRED'; end if;
 select * into prior from public.universe_events where event_id=p_registration_event_id;
 if not found or prior.entity_type<>'personal_original_executor_capability_registered' or
 prior.payload->>'conversation_id' is distinct from p_conversation_id::text or
 prior.payload->>'owner_id' is distinct from p_owner_id::text
 then raise exception 'ORIGINAL_143_REGISTRATION_RECEIPT_INVALID'; end if;
 if p_event->>'entity_type' is distinct from 'personal_original_job_final_settlement' or
    p_event->>'event_kind' is distinct from 'OUTCOME' or
    p_event->>'epistemic_status' is distinct from 'VERIFIED' or
    p_event->'payload'->>'owner_id' is distinct from p_owner_id::text or
    p_event->'payload'->>'conversation_id' is distinct from p_conversation_id::text or
    p_event->'payload'->>'original_goal_id' is distinct from prior.payload->>'original_goal_id' or
    p_event->'payload'->>'original_work_id' is distinct from 'work:24cda9611404e9bcb47909976067605c' or
    p_event->'payload'->>'registration_receipt_id' is distinct from p_registration_event_id::text or
    p_event->'payload'->>'outcome' is distinct from 'HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED' or
    p_event->'payload'->>'original_job_completed' is distinct from 'true' or
    p_event->'payload'->>'independently_verified' is distinct from 'true' or
    p_event->'payload'->>'external_repair_performed_by_reality' is distinct from 'false' or
    p_event->'payload'->>'original_issue_number' is distinct from '143' or
    p_event->>'lineage_hash' !~ '^[a-f0-9]{64}$' or
    p_event->>'content_hash' !~ '^[a-f0-9]{64}$'
 then raise exception 'ORIGINAL_143_SETTLEMENT_EVIDENCE_INVALID'; end if;
 root := prior.continuity_root_id;
 worldline := prior.worldline_id;
 if (p_event->>'continuity_root_id')::uuid<>root or
  (p_event->>'worldline_id')::uuid<>worldline
 then raise exception 'ORIGINAL_143_SETTLEMENT_WORLDLINE_CHANGED'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'reality-universe-tail:'||root::text||':'||worldline::text,0));
 select event_id,lineage_hash into old from public.universe_events
 where continuity_root_id=root and worldline_id=worldline
 order by assertion_time desc,created_at desc,event_id desc limit 1;
 if not found or (p_event->>'parent_event_id')::uuid<>old.event_id or
  p_event->>'prior_lineage_hash' is distinct from old.lineage_hash
 then raise exception 'ORIGINAL_143_SETTLEMENT_CONTINUITY_PARENT_CHANGED'; end if;
 if exists(select 1 from public.universe_events
  where continuity_root_id=root and worldline_id=worldline
  and entity_type='personal_original_job_final_settlement'
  and payload->>'original_work_id'='work:24cda9611404e9bcb47909976067605c')
 then raise exception 'ORIGINAL_143_ALREADY_SETTLED_NO_RETRY'; end if;
 id := (p_event->>'event_id')::uuid;
 insert into public.universe_events(
  event_id,event_kind,entity_type,entity_id,continuity_root_id,worldline_id,
  parent_event_id,effective_time,assertion_time,epistemic_status,
  payload,evidence_refs,provenance,content_hash,lineage_hash
 )values(
  id,'OUTCOME','personal_original_job_final_settlement',
  (p_event->>'entity_id')::uuid,root,worldline,(p_event->>'parent_event_id')::uuid,
  (p_event->>'effective_time')::timestamptz,(p_event->>'assertion_time')::timestamptz,'VERIFIED',
  p_event->'payload',p_event->'evidence_refs',p_event->'provenance',
  p_event->>'content_hash',p_event->>'lineage_hash'
 );
 return pg_catalog.jsonb_build_object('status','SETTLED',
 'original_work_id','work:24cda9611404e9bcb47909976067605c',
 'registration_event_id',p_registration_event_id,'settlement_event_id',id);
end
$fn$;

revoke all on function public.reality_register_original_143_capability(uuid,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.reality_settle_original_143_job(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reality_register_original_143_capability(uuid,uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function public.reality_settle_original_143_job(uuid,uuid,uuid,jsonb) to service_role;
