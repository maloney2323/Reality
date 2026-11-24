-- Preserve pending exact owner approvals and admitted source in the SAME Continuity worker.
create or replace function public.reality_reconcile_continuity_qualification_routes_v1(
 p_worker_run_id uuid
) returns jsonb
language plpgsql set search_path to ''
as $function$
declare v_now timestamptz:=clock_timestamp();v_count int:=0;v_matched int:=0;
 v_owner int:=0;v_review int:=0;
begin
 if current_user<>'service_role' or p_worker_run_id is null then
  raise exception 'CONTINUITY_ROUTE_SIGNED_SERVICE_REQUIRED';
 end if;
 -- The existing single-flight signed worker is the only lawful automatic
 -- trigger. An arbitrary Chat request cannot advance even evidence routing.
 if not exists (
  select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>v_now-interval '3 minutes'
 ) then raise exception 'CONTINUITY_ROUTE_CURRENT_SIGNED_WORKER_REQUIRED'; end if;

 with eligible as (
  select distinct g.owner_id from reality_internal.owner_routine_delegations_v1 g
  where g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
   and g.enabled is true and g.activated_at<=v_now and g.expires_at>v_now
 ),
 matching as (
  select i.*,c.original_work_id as claim_original_work_id,
   c.shift_id as claim_shift_id,c.phase as original_claim_phase,
   sh.status as claim_shift_status,w.mode as claim_warrant_mode,
   w.state as claim_warrant_state,
   coalesce((
    select true from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.owner_id=i.owner_id and f.original_work_id=c.original_work_id
     and f.shift_id=c.shift_id and f.source_ref=i.source_ref
     and f.outcome='SUCCEEDED'
     and f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
    limit 1
   ),false) as independently_settled,
   q.trigger_id as qualified_trigger_id,
   q.original_work_id as qualified_original_work_id,
   a.approval_id as approved_employee_list_id,
   packet.review_state as exact_chat_review_state,
   packet.original_work_id as exact_chat_original_work_id,
   (existing_chat.development->>'original_work_id') as existing_chat_original_work_id
  from reality_internal.owner_continuous_qualification_inbox_v1 i
  join eligible e on e.owner_id=i.owner_id
  left join lateral(
   select x.* from reality_internal.governed_employee_original_claims_v1 x
   where x.owner_id=i.owner_id and x.source_ref=i.source_ref
    and x.original_work_id~'^work:[a-f0-9]{32}$'
   order by x.updated_at desc,x.original_work_id limit 1
  ) c on true
  left join reality_internal.governed_employee_shifts_v1 sh
   on sh.shift_id=c.shift_id and sh.owner_id=c.owner_id
  left join reality_internal.governed_employee_completion_warrants_v1 w
   on w.shift_id=sh.shift_id and w.owner_id=sh.owner_id
  left join lateral (
   select g.trigger_id,g.original_work_id from reality_internal.genuine_capability_queue_v1 g
   where g.owner_id=i.owner_id and g.source_ref=i.source_ref
    and g.phase='AWAITING_OWNER_APPROVAL'
    and g.qualification_receipt is not null
    and g.qualified_candidate->>'artifact_sha256'~'^[a-f0-9]{64}$'
    and g.original_work_id~'^work:[a-f0-9]{32}$'
   order by g.updated_at desc,g.trigger_id limit 1
  ) q on true
  left join reality_internal.owner_continuity_qualification_routes_v1 prior_route
   on prior_route.owner_id=i.owner_id and prior_route.intake_family=i.intake_family
    and prior_route.intake_key=i.intake_key
  left join lateral (
   select p.review_state,p.original_work_id from
    reality_internal.owner_qualified_chat_original_review_packets_v1 p
   where i.intake_family='AUTHENTICATED_CHAT'
    and p.owner_id=i.owner_id and p.message_id::text=i.intake_key
    and p.continuity_ref=prior_route.continuity_ref
   limit 1
  ) packet on true
  left join lateral (
   select h.development from reality_internal.chat_work_handoffs_v1 h
   join public.reality_chat_messages m on m.id=h.message_id
    and m.user_id=h.owner_id and m.conversation_id=h.conversation_id
    and m.request_id=h.request_id and m.role='user'
    and h.message_sha256=pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(m.content,'UTF8')),'hex')
   where i.intake_family='AUTHENTICATED_CHAT'
    and h.owner_id=i.owner_id and h.message_id::text=i.intake_key
    and h.development->>'original_work_id'~'^work:[a-f0-9]{32}$'
   limit 1
  ) existing_chat on true
  left join lateral (
   select a.approval_id from reality_internal.approved_chat_employee_assignments_v1 a
   where i.intake_family='AUTHENTICATED_CHAT'
    and a.owner_id=i.owner_id
    and i.intake_key=a.source_message_id::text
    and a.approval_status='APPROVED'
    and a.execution_authorized is false
   order by a.approved_at desc limit 1
  ) a on true
  where i.last_seen_at>v_now-interval '48 hours'
 ),
 classified as (
  select m.*,
   case
    when m.terminal_observation then 'TERMINAL_RECEIPT_PRESERVED_NO_REPLAY'
    when m.independently_settled then 'INDEPENDENT_ORIGINAL_RECEIPT_RECONCILE_UNIVERSE'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'QUALIFIED_CHAT_ORIGINAL_ADMITTED_PENDING_GOVERNED_EXECUTION'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
     then 'EXISTING_SIGNED_CHAT_ORIGINAL_RECONCILE_WORKER'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL'
    when m.qualified_trigger_id is not null
     then 'EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'EXISTING_ORIGINAL_RECHECK_GOVERNED_TRIGGER'
    when m.claim_original_work_id is not null
     then 'EXISTING_ORIGINAL_AUTHORITY_SCOPE_RECHECK_REQUIRED'
    when m.approved_employee_list_id is not null
     then 'APPROVED_JOB_LIST_NEEDS_INDEPENDENT_ORIGINAL_QUALIFICATION'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION'
    when m.source_ref is null or m.source_ref=''
     then 'MISSING_EXACT_SOURCE_LINEAGE_RECHECK'
    when m.qualification_state like '%PROVIDER%'
     or m.qualification_state like '%EPOCH%'
     then 'SOURCE_EPOCH_REVALIDATION_REQUIRED'
    else 'OWNER_GOAL_ORIGINAL_AND_INDEPENDENT_SOURCE_QUALIFICATION_REQUIRED'
   end as next_route,
   case
    when m.terminal_observation or m.independently_settled
     then 'RECONCILE_VERIFIED_RECEIPT_IN_UNIVERSE_WITHOUT_REPLAY'
    when m.exact_chat_review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
     then 'EXISTING_SIGNED_CHAT_WORKER_RECHECK_ORIGINAL_SOURCE_SCOPE_AND_ACCEPTANCE'
    when m.existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
     then 'RECONCILE_EXISTING_SIGNED_CHAT_ORIGINAL_WITH_EXECUTOR_NO_REPLAY'
    when m.exact_chat_review_state='AWAITING_OWNER_EXACT_APPROVAL'
     then 'PRESENT_EXISTING_EXACT_OWNER_ADMISSION_CARD_IN_REALITY_CHAT'
    when m.qualified_trigger_id is not null
     then 'READ_EXISTING_QUALIFIED_CAPABILITY_PREFLIGHT_IN_REALITY_CHAT'
    when m.claim_original_work_id is not null
     and m.claim_shift_status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
     and m.claim_warrant_state='ACTIVE'
     and m.claim_warrant_mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     then 'GOVERNED_TRIGGER_MUST_RECHECK_SOURCE_GOAL_AND_EXACT_AUTHORITY'
    when m.claim_original_work_id is not null
     then 'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION'
    when m.approved_employee_list_id is not null
     then 'INDEPENDENTLY_QUALIFY_APPROVED_TASK_LIST_AS_ACTUAL_ORIGINALS'
    when m.intake_family='AUTHENTICATED_CHAT'
     then 'VERIFY_AUTHENTICATED_MESSAGE_GOAL_SOURCE_AND_CONSEQUENCE'
    when m.source_ref is null or m.source_ref=''
     then 'FIND_EXACT_SOURCE_BEFORE_OWNER_PROPOSAL'
    else 'INDEPENDENTLY_VERIFY_CURRENT_SOURCE_AND_OWNER_BUSINESS_OBLIGATION'
   end as route_action
  from matching m
 ),
 saved as(
  insert into reality_internal.owner_continuity_qualification_routes_v1(
   owner_id,intake_family,intake_key,continuity_ref,source_ref,
   original_work_id,qualified_capability_trigger_id,source_epoch_fingerprint,
   route_state,governed_next_action,existing_approval_adapter,last_checked_at
  )
  select owner_id,intake_family,intake_key,
   'reality:qualification:'||pg_catalog.encode(pg_catalog.sha256(
    pg_catalog.convert_to(owner_id::text||'|'||intake_family||'|'||intake_key,'UTF8')),'hex'),
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id,
     exact_chat_original_work_id,
     case when existing_chat_original_work_id~'^work:[a-f0-9]{32}$'
      then existing_chat_original_work_id else null end),
   qualified_trigger_id,evidence_fingerprint,next_route,route_action,
   case when qualified_trigger_id is not null then 'EXISTING_QUALIFIED_CAPABILITY_CHAT'
   else null end,
   v_now
  from classified
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,
   original_work_id=excluded.original_work_id,
   qualified_capability_trigger_id=excluded.qualified_capability_trigger_id,
   source_epoch_fingerprint=excluded.source_epoch_fingerprint,
   route_state=excluded.route_state,
   governed_next_action=excluded.governed_next_action,
   existing_approval_adapter=excluded.existing_approval_adapter,
   last_checked_at=excluded.last_checked_at
  returning owner_id,original_work_id,route_state
 )
 select count(*),count(*) filter(where original_work_id is not null),
  count(distinct owner_id),
  count(*) filter(where route_state='EXISTING_QUALIFIED_ARTIFACT_CHECK_OWNER_APPROVAL_ADAPTER')
 into v_count,v_matched,v_owner,v_review from saved;

 return pg_catalog.jsonb_build_object(
  'status','CONTINUITY_QUALIFICATION_ROUTES_RECONCILED',
  'worker_run_id',p_worker_run_id,'owner_count',v_owner,
  'routed_source_count',v_count,'existing_original_matches',v_matched,
  'existing_qualified_capability_adapter_checks',v_review,
  'model_execution_authorized',false,'owner_approval_granted',false,
  'new_original_admitted',false,'new_shift_started',false,
  'installation_authorized',false,'production_changed',false);
end $function$;
revoke all on function public.reality_reconcile_continuity_qualification_routes_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_reconcile_continuity_qualification_routes_v1(uuid) to service_role;

create or replace function public.reality_read_owner_qualified_chat_original_source_v1(
 p_owner_id uuid,p_message_id uuid,p_continuity_ref text
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v record;
begin
 if current_user<>'service_role' or p_owner_id is null or p_message_id is null
 or p_continuity_ref!~'^reality:qualification:[a-f0-9]{64}$' then
  raise exception 'QUALIFIED_CHAT_SOURCE_TRUSTED_OWNER_REQUIRED';end if;
 select r.owner_id,r.intake_key,r.continuity_ref,r.route_state,
  r.last_checked_at,i.source_ref,i.terminal_observation,
  h.request_id,h.conversation_id,h.message_sha256,h.development,
  m.id as persisted_message_id,m.role,m.content
 into v
 from reality_internal.owner_continuity_qualification_routes_v1 r
 join reality_internal.owner_continuous_qualification_inbox_v1 i
  on i.owner_id=r.owner_id and i.intake_family=r.intake_family
  and i.intake_key=r.intake_key
 join reality_internal.chat_work_handoffs_v1 h
  on h.owner_id=r.owner_id and h.message_id=p_message_id
  and h.message_id::text=r.intake_key
 join public.reality_chat_messages m
  on m.id=h.message_id and m.user_id=h.owner_id
  and m.conversation_id=h.conversation_id and m.request_id=h.request_id
  and m.role='user'
 where r.owner_id=p_owner_id and r.intake_family='AUTHENTICATED_CHAT'
  and r.intake_key=p_message_id::text
  and r.continuity_ref=p_continuity_ref
  and r.source_ref='supabase:reality_chat_messages:'||p_message_id::text
  and i.source_ref=r.source_ref
 limit 1;
 if not found or v.terminal_observation or
  v.route_state not in ('SAVED_CHAT_INTENT_NEEDS_GOVERNED_CLASSIFICATION',
   'QUALIFIED_CHAT_ORIGINAL_AWAITING_EXACT_OWNER_APPROVAL')
  or v.last_checked_at<clock_timestamp()-interval '30 minutes'
  or v.message_sha256 IS DISTINCT FROM
   pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v.content,'UTF8')),'hex')
 then return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_CURRENT_SOURCE_NOT_VERIFIED',
  'exact_review_ready',false,'new_original_admitted',false,
  'execution_authorized',false,'installation_authorized',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','QUALIFIED_CHAT_SIGNED_SOURCE_VERIFIED',
  'owner_id',v.owner_id,'conversation_id',v.conversation_id,
  'request_id',v.request_id,'message_id',p_message_id,
  'continuity_ref',v.continuity_ref,'source_ref',v.source_ref,
  'signed_source_sha256',v.message_sha256,
  'already_admitted_original',v.development->>'original_work_id',
  'original_new_admission_possible',v.development is null,
  'signed_user_message_verified',true,'model_did_not_grant_authority',true,
  'execution_authorized',false,'new_original_admitted',false,
  'installation_authorized',false,'production_changed',false);
end $function$;

revoke all on function public.reality_read_owner_qualified_chat_original_source_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reality_read_owner_qualified_chat_original_source_v1(uuid,uuid,text) to service_role;
