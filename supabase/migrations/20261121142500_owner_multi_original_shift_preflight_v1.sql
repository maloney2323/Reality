-- Reuse the SAME Continuity source ledger, original claims, exact warrant
-- and independently verified acceptance receipts for a multi-original shift.
-- This preflight reads evidence; it never grants a batch blanket permission.
create or replace function public.reality_read_owner_multi_original_shift_preflight_v1(
 p_owner_id uuid,p_target_original_count integer
) returns jsonb
language plpgsql set search_path to ''
as $function$
declare
 v_now timestamptz:=clock_timestamp();
 v_total integer;v_current integer;v_source_bound integer;
 v_signed integer;v_eligible integer;v_final integer;
 v_shift uuid;v_shift_status text;v_shift_mode text;v_shift_scope jsonb;
 v_examples jsonb;v_lanes jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
  or p_target_original_count not between 2 and 12
 then raise exception 'MULTI_ORIGINAL_OWNER_TARGET_SCOPE_REQUIRED';end if;
 select count(*)::integer,
   count(*) filter(where not i.terminal_observation and
    i.last_seen_at>=v_now-interval '30 minutes')::integer
 into v_total,v_current
 from reality_internal.owner_continuous_qualification_inbox_v1 i
 where i.owner_id=p_owner_id;
 select s.shift_id,s.status,w.mode,w.source_scope
 into v_shift,v_shift_status,v_shift_mode,v_shift_scope
 from reality_internal.governed_employee_shifts_v1 s
 left join reality_internal.governed_employee_completion_warrants_v1 w
  on w.owner_id=s.owner_id and w.shift_id=s.shift_id and w.state='ACTIVE'
 where s.owner_id=p_owner_id and s.closed_at is null
  and s.status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 order by s.created_at desc limit 1;

 -- Only actual current owner-scoped source records can contribute. The
 -- exact original must be a separately admitted canonical work identifier.
 with input as(
  select i.owner_id,i.intake_family,i.intake_key,i.employee,i.title,
   i.source_ref,i.evidence_fingerprint,i.qualification_state,
   i.terminal_observation,i.last_seen_at,r.continuity_ref,
   r.original_work_id,r.route_state,r.governed_next_action,
   r.last_checked_at,
   p.review_state as chat_review_state,
   p.packet_id as chat_packet_id,p.approval_receipt_sha256 as chat_approval_receipt,
   c.shift_id as claim_shift_id,c.claim_id,c.source_event_id,
   c.source_proof_sha256 as claim_source_sha256,c.phase as claim_phase,
   (
    c.original_work_id is not null and c.original_work_id=r.original_work_id
    and c.source_ref=i.source_ref and c.owner_id=i.owner_id
   ) as canonical_shift_claim_found,
   exists(
    select 1 from reality_internal.governed_employee_completion_warrants_v1 w
    join reality_internal.governed_employee_shifts_v1 sh
     on sh.owner_id=w.owner_id and sh.shift_id=w.shift_id
    where w.owner_id=i.owner_id and w.shift_id=c.shift_id
     and sh.closed_at is null and w.state='ACTIVE'
     and w.mode='UNTIL_ALL_INDEPENDENT_FINAL_RECEIPTS'
     and exists(
      select 1 from pg_catalog.jsonb_array_elements(w.source_scope) sc
      where sc->>'source_ref'=i.source_ref)
   ) as exact_business_warrant_verified,
   exists(
    select 1 from public.universe_events u
    where u.event_id=c.source_event_id
     and u.epistemic_status='VERIFIED'
     and u.continuity_root_id is not null
     and u.worldline_id is not null
     and u.payload->>'principal_id'=i.owner_id::text
     and u.payload->>'original_work_id'=c.original_work_id
     and u.payload->>'acceptance_contract_sha256'
      ~ '^sha256:[a-f0-9]{64}$'
   ) as verified_original_goal_acceptance_worldline,
   exists(
    select 1 from reality_internal.governed_original_independent_final_receipts_v1 f
    where f.owner_id=i.owner_id and f.original_work_id=r.original_work_id
     and f.source_ref=i.source_ref and f.shift_id=c.shift_id
     and f.outcome='SUCCEEDED'
     and f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   ) as original_final_independent_receipt
  from reality_internal.owner_continuous_qualification_inbox_v1 i
  join reality_internal.owner_continuity_qualification_routes_v1 r
   on r.owner_id=i.owner_id and r.intake_family=i.intake_family
   and r.intake_key=i.intake_key
  left join reality_internal.governed_employee_original_claims_v1 c
   on c.owner_id=r.owner_id and c.original_work_id=r.original_work_id
   and c.source_ref=r.source_ref
  left join reality_internal.owner_qualified_chat_original_review_packets_v1 p
   on p.owner_id=i.owner_id and p.message_id::text=i.intake_key
   and p.continuity_ref=r.continuity_ref and i.intake_family='AUTHENTICATED_CHAT'
  where i.owner_id=p_owner_id
 ),
 tagged as(
  select t.*,
   (not t.terminal_observation and
    t.last_seen_at>=v_now-interval '30 minutes' and
    t.last_checked_at>=v_now-interval '30 minutes'
   ) as evidence_current,
   case
    when t.terminal_observation or t.original_final_independent_receipt
     then 'FINAL_OR_TERMINAL_SOURCE_NO_REPLAY'
    when t.last_seen_at<v_now-interval '30 minutes' or
     t.last_checked_at<v_now-interval '30 minutes'
     then 'SIGNED_WORKER_SOURCE_FRESHNESS_REQUIRED'
    when t.original_work_id is null
     then 'CANONICAL_ORIGINAL_ADMISSION_REQUIRED'
    when not t.canonical_shift_claim_found
     then 'EXACT_SHIFT_ORIGINAL_CLAIM_REQUIRED'
    when not t.exact_business_warrant_verified
     then 'EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED'
    when not t.verified_original_goal_acceptance_worldline
     then 'OWNER_GOAL_ACCEPTANCE_WORLDLINE_INDEPENDENT_PROOF_REQUIRED'
    when t.claim_source_sha256!~'^sha256:[a-f0-9]{64}$'
     then 'INDEPENDENT_SOURCE_PROOF_REQUIRED'
    else 'CANONICAL_ORIGINAL_PRESENT_RECHECK_REGISTERED_EXECUTOR_AND_EFFECT_SCOPE'
   end as gate,
   (not t.terminal_observation and
     t.last_seen_at>=v_now-interval '30 minutes' and
     t.last_checked_at>=v_now-interval '30 minutes' and
     t.canonical_shift_claim_found and
     t.exact_business_warrant_verified and
     t.verified_original_goal_acceptance_worldline and
     t.claim_source_sha256~'^sha256:[a-f0-9]{64}$' and
     not t.original_final_independent_receipt
   ) as qualified_evidence_for_governed_executor_preflight
  from input t
 ),
 ranked as(
  select t.*,row_number() over(partition by intake_family order by
   qualified_evidence_for_governed_executor_preflight desc,
   evidence_current desc,last_seen_at desc,intake_key) as family_rank
  from tagged t
 ),
 counts as(
  select count(*) filter(where original_work_id is not null)::integer bound,
   count(*) filter(where qualified_evidence_for_governed_executor_preflight)::integer
    eligible,
   count(*) filter(where original_final_independent_receipt)::integer finals,
   count(*) filter(where chat_review_state='AWAITING_OWNER_EXACT_APPROVAL')::integer
    pending_chat
  from tagged
 ),
 display as(
  select coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
    'intake_family',z.intake_family,'intake_key',z.intake_key,
    'source_ref',z.source_ref,'employee',z.employee,'title',z.title,
    'continuity_ref',z.continuity_ref,'original_work_id',z.original_work_id,
    'route_state',z.route_state,'governed_next_action',z.governed_next_action,
    'exact_approval_packet_id',z.chat_packet_id,
    'signed_chat_approval_state',z.chat_review_state,
    'independent_final_receipt_verified',z.original_final_independent_receipt,
    'exact_business_warrant_verified',z.exact_business_warrant_verified,
    'owner_goal_acceptance_worldline_verified',
      z.verified_original_goal_acceptance_worldline,
    'qualified_evidence_for_governed_executor_preflight',
      z.qualified_evidence_for_governed_executor_preflight,
    'acceptance_gate',z.gate,
    'new_shift_started',false,'execution_authorized_by_read',false,
    'owner_approval_granted_by_read',false
   ) order by z.qualified_evidence_for_governed_executor_preflight desc,
    z.family_rank,z.last_seen_at desc,z.intake_family),
   '[]'::jsonb) items
  from (
   select * from ranked where family_rank<=2 and not terminal_observation
   order by qualified_evidence_for_governed_executor_preflight desc,
    family_rank,last_seen_at desc,intake_family limit 20
  ) z
 )
 select counts.bound,counts.eligible,counts.finals,counts.pending_chat,
  display.items into v_source_bound,v_eligible,v_final,v_signed,v_examples
 from counts cross join display;
 -- An evidence-qualified source still requires separate installed executor,
 -- consequence policy, exact approval and actual independent work completion.
 return pg_catalog.jsonb_build_object(
  'status','OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT',
  'owner_id',p_owner_id,
  'target_original_count',p_target_original_count,
  'total_discovered_source_observations',v_total,
  'current_nonterminal_source_observations',v_current,
  'source_bound_originals',v_source_bound,
  'independently_qualified_originals_for_executor_preflight',v_eligible,
  'independent_original_final_receipts',v_final,
  'pending_exact_chat_admission_approvals',v_signed,
  'current_shift_id',v_shift,'current_shift_status',v_shift_status,
  'current_shift_warrant_mode',v_shift_mode,
  'current_shift_scope_is_not_general_business_permission',true,
  'ready_to_start_multi_original_execution',false,
  'readiness_reason',case
   when v_eligible<p_target_original_count
   then 'NOT_ENOUGH_INDEPENDENTLY_QUALIFIED_BUSINESS_ORIGINALS'
   else 'EXACT_EXECUTOR_POLICY_AND_ITEMIZED_OWNER_AUTHORITY_STILL_REQUIRED' end,
  'prioritized_source_preflight',v_examples,
  'original_receipts_not_evidence_jobs',true,
  'no_fabricated_job_success',true,'source_qualification_is_not_authority',true,
  'original_customer_jobs_completed_by_preflight',0,
  'new_shift_started',false,'owner_approval_granted',false,
  'model_execution_authorized',false,'installation_authorized',false,
  'production_changed',false,'read_only',true);
end $function$;
revoke all on function public.reality_read_owner_multi_original_shift_preflight_v1(uuid,integer)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_multi_original_shift_preflight_v1(uuid,integer)
 to service_role;
