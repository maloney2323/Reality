-- Isolated-preview continuous qualification intake for Reality's EXISTING ledgers.
-- A durable evidence-routing inbox, NOT an original-job admission, execution grant,
-- signed shift amendment, payment authorization, or installation permission.
create table if not exists reality_internal.owner_continuous_qualification_inbox_v1 (
  owner_id uuid not null,
  intake_family text not null,
  intake_key text not null,
  source_ref text,
  employee text,
  title text not null,
  source_state text not null,
  evidence_fingerprint text,
  qualification_state text not null,
  next_action text not null,
  terminal_observation boolean not null default false,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  source_observed_at timestamptz,
  primary key(owner_id,intake_family,intake_key),
  constraint continuous_inbox_family_nonempty check(length(intake_family) between 3 and 60),
  constraint continuous_inbox_key_nonempty check(length(intake_key) between 1 and 240),
  constraint continuous_inbox_non_executable check(qualification_state<>'EXECUTION_AUTHORIZED')
);
revoke all on reality_internal.owner_continuous_qualification_inbox_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.owner_continuous_qualification_inbox_v1 to service_role;

create or replace function public.reality_reconcile_continuous_qualification_inbox_v1(
 p_worker_run_id uuid
) returns jsonb
language plpgsql set search_path to ''
as $function$
declare v_now timestamptz:=clock_timestamp();v_count int:=0;v_pending int:=0;
 v_owners int:=0;v_shift uuid;
begin
 if current_user<>'service_role' or p_worker_run_id is null then
  raise exception 'CONTINUOUS_QUALIFIER_SIGNED_SERVICE_ONLY';
 end if;
 -- Bind routing to an ACTUAL currently leased signed worker, never a Chat
 -- message or caller-supplied owner/source. This is evidence-only standing work.
 if not exists(
  select 1 from reality_internal.signed_worker_actual_runs_v1 r
  where r.run_id=p_worker_run_id and r.status='STARTED'
   and r.started_at>v_now-interval '3 minutes'
 ) then raise exception 'CONTINUOUS_QUALIFIER_CURRENT_WORKER_REQUIRED'; end if;

 with eligible as (
  select distinct g.owner_id from reality_internal.owner_routine_delegations_v1 g
  where g.scope='EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'
    and g.enabled=true and g.activated_at<=v_now and g.expires_at>v_now
 ),
 -- Every input is a readback from Reality's current ledgers, never a
 -- constructed example, model-generated source, or untrusted Chat instruction.
 raw as (
  select s.owner_id,'EMPLOYEE_SCHEDULE'::text family,s.work_key::text item_key,
   s.source_ref,s.employee,coalesce(nullif(s.title,''),'Employee source review') title,
   s.work_state source_state,s.source_evidence_sha256 evidence,
   s.source_observed_at observed,
   case
    when s.work_state in('SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED',
      'SOURCE_NO_LONGER_CURRENT') then 'HISTORICAL_OR_TERMINAL_NO_REPLAY'
    when s.work_state='MAINTENANCE_IN_SIGNED_SHIFT' then
      'SIGNED_MAINTENANCE_SCOPE_RECHECK'
    when s.work_state='MAINTENANCE_AWAITING_SIGNED_SHIFT' then
      'OWNER_MAINTENANCE_SCOPE_REVIEW_REQUIRED'
    when s.work_state='EVIDENCE_REVIEW_VERIFIED' then
      'EVIDENCE_VERIFIED_ORIGINAL_STILL_NEEDS_QUALIFICATION'
    when s.work_state='SOURCE_EPOCH_REVIEW_REQUIRED' then
      'CURRENT_PROVIDER_EPOCH_REQUALIFICATION_REQUIRED'
    when s.work_state='HISTORICAL_REVALIDATION_REQUIRED' then
      'HISTORICAL_SOURCE_REVALIDATION_REQUIRED'
    else 'CURRENT_SOURCE_QUALIFICATION_REQUIRED' end qual_state,
   case
    when s.work_state in('SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED',
      'SOURCE_NO_LONGER_CURRENT') then 'PRESERVE_EXISTING_RECEIPT_NO_REPLAY'
    when s.work_state='MAINTENANCE_IN_SIGNED_SHIFT' then
      'USE_EXISTING_WARRANTED_MAINTENANCE_EXECUTOR'
    when s.work_state='MAINTENANCE_AWAITING_SIGNED_SHIFT' then
      'VERIFY_MAINTENANCE_SOURCE_AND_PRESENT_EXACT_OWNER_SCOPE'
    when s.work_state='EVIDENCE_REVIEW_VERIFIED' then
      'QUALIFY_BUSINESS_ORIGINAL_INDEPENDENTLY_BEFORE_OWNER_DECISION'
    else 'INDEPENDENTLY_RECHECK_CURRENT_SOURCE_AND_ACCEPTANCE' end next_action,
   s.work_state in('SOURCE_SETTLED_NO_REPLAY','MAINTENANCE_VERIFIED',
     'SOURCE_NO_LONGER_CURRENT') terminal
  from reality_internal.owner_employee_operating_schedule_v1 s
  join eligible e on e.owner_id=s.owner_id
  where s.last_reconciled_at>v_now-interval '48 hours'
    and s.installation_authorized=false and s.production_changed=false

  union all
  select c.owner_id,'EMPLOYEE_CAPABILITY'::text,c.capability_key,
   c.source_url,c.assigned_employee,
   coalesce(nullif(c.source_title,''),'Employee capability inquiry'),
   c.phase,c.evidence_fingerprint,c.source_last_seen_at,
   case when c.phase like 'INQUIRY_RECORDED%' then
      'INDEPENDENT_CAPABILITY_GAP_PROOF_REQUIRED'
    when c.phase like '%BLOCKED%' then 'CAPABILITY_PROVIDER_PROOF_RECHECK_REQUIRED'
    else 'EMPLOYEE_CAPABILITY_INQUIRY_REQUIRED' end,
   'VERIFY_GENUINE_CURRENT_GAP_BEFORE_ORIGINAL_OR_INSTALL_APPROVAL',
   false
  from reality_internal.owner_capability_employee_schedule_v1 c
  join eligible e on e.owner_id=c.owner_id

  union all
  select q.owner_id,'GOVERNED_CAPABILITY'::text,q.trigger_id::text,
   q.source_ref,null::text,
   'Existing governed capability: '||coalesce(nullif(q.capability_id,''),'unclassified'),
   q.phase,coalesce(q.provider_failure_hash,''),q.updated_at,
   case when q.phase='SETTLED_ISOLATED' then
      'ISOLATED_SETTLEMENT_RECONCILE_WITH_UNIVERSE'
    when q.phase='ISOLATED_INSTALLED_PROBATION' then
      'INDEPENDENT_POSTINSTALL_ACCEPTANCE_REQUIRED'
    when q.phase like '%APPROVAL%' then
      'EXACT_OWNER_ARTIFACT_APPROVAL_REVIEW'
    else 'GOVERNED_ORIGINAL_PROOF_RECHECK_REQUIRED' end,
   case when q.phase='SETTLED_ISOLATED' then
       'RECONCILE_RECEIPT_NO_NEW_EXECUTION'
    when q.phase='ISOLATED_INSTALLED_PROBATION' then
       'INDEPENDENTLY_VERIFY_SAME_ORIGINAL_WITHOUT_REPLAY'
    else 'RECHECK_OWNER_GOAL_ORIGINAL_FROZEN_PROOF_AND_AUTHORITY' end,
   false
  from reality_internal.genuine_capability_queue_v1 q
  join eligible e on e.owner_id=q.owner_id

  union all
  select i.owner_id,'RECOVERY_INCIDENT'::text,i.incident_id::text,
   null::text,i.assigned_employee,
   coalesce(nullif(i.error_summary,''),'Observed worker recovery incident'),
   i.phase,i.error_fingerprint,i.last_observed_at,
   case when i.continuity_verified_at is not null then
      'CONTINUITY_VERIFIED_REPAIR_STATUS_RECONCILIATION'
    else 'INDEPENDENT_INCIDENT_QUALIFICATION_REQUIRED' end,
   'RECHECK_PROVIDER_FAILURE_AND_OWNER_SCOPED_REPAIR_AUTHORITY',
   false
  from reality_internal.owner_worker_recovery_incidents_v1 i
  join eligible e on e.owner_id=i.owner_id

  union all
  select i.owner_id,'AUTHENTICATED_CHAT'::text,i.message_id::text,
   'supabase:reality_chat_messages:'||i.message_id::text,null::text,
   'Saved owner Chat instruction requiring governed classification',
   i.status,i.message_sha256,i.created_at,
   case when i.status='PENDING' then 'SIGNED_CHAT_SCOPE_CLASSIFICATION_REQUIRED'
    when i.status='PROVIDER_UNVERIFIED' then 'AMBIGUOUS_PROVIDER_EFFECTS_NO_REPLAY'
    else 'CHAT_HANDOFF_RECEIPT_RECONCILIATION_REQUIRED' end,
   case when i.status='PROVIDER_UNVERIFIED' then
      'VERIFY_PROVIDER_EFFECTS_BEFORE_ANY_RETRY'
    else 'VERIFY_AUTHENTICATED_INTENT_CURRENT_SCOPE_AND_APPROVAL' end,
   false
  from reality_internal.chat_work_handoffs_v1 i
  join eligible e on e.owner_id=i.owner_id
  where i.created_at>v_now-interval '14 days'

  union all
  select s.owner_id,'SIGNED_SHIFT_SOURCE'::text,
   s.shift_id::text||':'||st.step_index::text,
   st.source_ref,null::text,
   coalesce(nullif(st.source_title,''),'Signed shift step '||st.step_index::text),
   st.state,coalesce(st.proof_sha256,''),st.completed_at,
   case when st.state='AWAITING_EXACT_WORK' then
      'EXACT_BUSINESS_ORIGINAL_QUALIFICATION_REQUIRED'
    when st.state='SOURCE_CHECKED' then
      'SIGNED_SOURCE_CHECK_NEEDS_ORIGINAL_ADMISSION_PROOF'
    when st.state='QUEUED' then
      'WAIT_FOR_INDEPENDENT_ORIGINAL_VERIFICATION'
    else 'SIGNED_SHIFT_BOUND_WORK_CONTINUATION' end,
   case when st.state='AWAITING_EXACT_WORK' then
      'PRESENT_EXACT_SOURCE_AND_OWNER_APPROVAL_ONLY_AFTER_QUALIFICATION'
    else 'READ_EXISTING_WARRANT_AND_SOURCE_BEFORE_NEXT_EXECUTION' end,
   false
  from reality_internal.governed_employee_shifts_v1 s
  join eligible e on e.owner_id=s.owner_id
  join reality_internal.governed_employee_shift_steps_v1 st
   on st.shift_id=s.shift_id
  where s.closed_at is null and s.authorized_at is not null
   and s.planned_end_at>v_now
 ),
 saved as (
  insert into reality_internal.owner_continuous_qualification_inbox_v1(
    owner_id,intake_family,intake_key,source_ref,employee,title,
    source_state,evidence_fingerprint,qualification_state,next_action,
    terminal_observation,last_seen_at,source_observed_at
  )
  select r.owner_id,r.family,r.item_key,r.source_ref,r.employee,
   left(r.title,350),coalesce(r.source_state,'UNKNOWN'),
   nullif(r.evidence,''),r.qual_state,r.next_action,
   r.terminal,v_now,r.observed
  from raw r
  where r.item_key is not null and length(r.item_key) between 1 and 240
  on conflict(owner_id,intake_family,intake_key) do update set
   source_ref=excluded.source_ref,employee=excluded.employee,
   title=excluded.title,source_state=excluded.source_state,
   evidence_fingerprint=excluded.evidence_fingerprint,
   qualification_state=excluded.qualification_state,
   next_action=excluded.next_action,
   terminal_observation=excluded.terminal_observation,
   last_seen_at=excluded.last_seen_at,
   source_observed_at=excluded.source_observed_at
  returning owner_id,qualification_state,terminal_observation
 )
 select count(*),count(*) filter(where not terminal_observation),
  count(distinct owner_id)
 into v_count,v_pending,v_owners from saved;
 return pg_catalog.jsonb_build_object(
  'status','CONTINUOUS_QUALIFICATION_INBOX_DURABLY_RECONCILED',
  'worker_run_id',p_worker_run_id,
  'owner_count',v_owners,'evidence_sources_reconciled',v_count,
  'nonterminal_qualification_observations',v_pending,
  'new_shift_started',false,'new_original_job_admitted',false,
  'owner_approval_granted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false
 );
end $function$;
revoke all on function public.reality_reconcile_continuous_qualification_inbox_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_reconcile_continuous_qualification_inbox_v1(uuid) to service_role;

create or replace function public.reality_read_owner_continuous_qualification_inbox_v1(
 p_owner_id uuid
) returns jsonb
language plpgsql set search_path to ''
as $function$
declare v_items jsonb;v_total int;v_pending int;v_stale int;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'CONTINUOUS_QUALIFICATION_OWNER_SERVICE_REQUIRED';
 end if;
 select count(*),count(*) filter(where not terminal_observation),
  count(*) filter(where last_seen_at<clock_timestamp()-interval '30 minutes')
 into v_total,v_pending,v_stale
 from reality_internal.owner_continuous_qualification_inbox_v1
 where owner_id=p_owner_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'intake_family',x.intake_family,'intake_key',x.intake_key,
  'source_ref',x.source_ref,'employee',x.employee,'title',x.title,
  'source_state',x.source_state,
  'qualification_state',case when x.last_seen_at<
    clock_timestamp()-interval '30 minutes' then
     'SOURCE_RECONCILIATION_STALE_RECHECK_REQUIRED'
    else x.qualification_state end,
  'next_action',case when x.last_seen_at<
    clock_timestamp()-interval '30 minutes' then
     'RECHECK_CURRENT_SOURCE_BEFORE_ADVANCEMENT'
    else x.next_action end,
  'source_observed_at',x.source_observed_at,
  'last_seen_at',x.last_seen_at,
  'terminal_observation',x.terminal_observation,
  'approval_ready',false,'executable_original_admitted',false
 ) order by x.terminal_observation,x.last_seen_at desc,x.intake_family,x.intake_key),
 '[]'::jsonb) into v_items
 from (
  select * from reality_internal.owner_continuous_qualification_inbox_v1
  where owner_id=p_owner_id
  order by terminal_observation, last_seen_at desc,intake_family,intake_key
  limit 30
 ) x;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CONTINUOUS_QUALIFICATION_INBOX_READ_ONLY',
  'owner_id',p_owner_id,'items',v_items,'total',coalesce(v_total,0),
  'nonterminal_items',coalesce(v_pending,0),
  'stale_source_observations',coalesce(v_stale,0),
  'items_are_qualifier_inputs_not_approved_jobs',true,
  'approval_ready_count',0,
  'shift_authorized_by_read',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false
 );
end $function$;
revoke all on function public.reality_read_owner_continuous_qualification_inbox_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_continuous_qualification_inbox_v1(uuid) to service_role;
