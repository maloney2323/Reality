-- Reality's existing Continuity Ledger governs these source-level routing
-- observations. They are not owner authorization, executable original jobs,
-- model instructions, source verification or final completion receipts.
create table if not exists reality_internal.owner_continuity_qualification_routes_v1(
 owner_id uuid not null,
 intake_family text not null,
 intake_key text not null,
 continuity_ref text not null,
 source_ref text,
 original_work_id text,
 qualified_capability_trigger_id uuid,
 source_epoch_fingerprint text,
 route_state text not null,
 governed_next_action text not null,
 existing_approval_adapter text,
 first_seen_at timestamptz not null default clock_timestamp(),
 last_checked_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,intake_family,intake_key),
 foreign key(owner_id,intake_family,intake_key)
  references reality_internal.owner_continuous_qualification_inbox_v1(owner_id,intake_family,intake_key),
 constraint continuity_route_stable_ref check(continuity_ref~'^reality:qualification:[a-f0-9]{64}$'),
 constraint continuity_route_not_execution check(route_state<>'EXECUTION_AUTHORIZED'),
 constraint continuity_route_existing_original_format check(
  original_work_id is null or original_work_id~'^work:[a-f0-9]{32}$')
);
revoke all on reality_internal.owner_continuity_qualification_routes_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_continuity_qualification_routes_v1 to service_role;

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
   a.approval_id as approved_employee_list_id
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
   source_ref,coalesce(claim_original_work_id,qualified_original_work_id),
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
