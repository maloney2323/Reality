-- Extend current owner-scoped source readback with independently routed continuity, not new authority.
-- Source-neutral, bounded owner readback fairness over existing authorized intake.
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
  'continuity_ref',x.continuity_ref,
  'governed_route_state',x.governed_route_state,
  'governed_next_action',x.governed_next_action,
  'matched_original_work_id',x.matched_original_work_id,
  'existing_approval_adapter',x.existing_approval_adapter,
  'approval_ready',false,'executable_original_admitted',false
 ) order by x.terminal_observation,x.intake_priority,
    x.family_rank,x.intake_family,x.intake_key),
 '[]'::jsonb) into v_items
 from (
  -- A fair, bounded sample from EVERY owner-scoped source family rather
  -- than filling all 30 slots with prior verified evidence or shift steps.
  -- Priority comes from Reality's verified state, never a hardcoded job ID.
  select ranked.* from (
   select i.*,
    r.continuity_ref,r.original_work_id as matched_original_work_id,
    coalesce(r.route_state,'SIGNED_WORKER_ROUTE_RECONCILIATION_PENDING')
      as governed_route_state,
    coalesce(r.governed_next_action,'RECHECK_SIGNED_WORKER_CONTINUITY_ROUTE')
      as governed_next_action,
    r.existing_approval_adapter,
    case
     when i.qualification_state='CURRENT_SOURCE_QUALIFICATION_REQUIRED' then 0
     when i.qualification_state='EXACT_BUSINESS_ORIGINAL_QUALIFICATION_REQUIRED' then 1
     when i.qualification_state='CURRENT_PROVIDER_EPOCH_REQUALIFICATION_REQUIRED' then 2
     when i.qualification_state='INDEPENDENT_CAPABILITY_GAP_PROOF_REQUIRED' then 3
     when i.qualification_state='CAPABILITY_PROVIDER_PROOF_RECHECK_REQUIRED' then 4
     when i.qualification_state='INDEPENDENT_INCIDENT_QUALIFICATION_REQUIRED' then 5
     when i.qualification_state='SIGNED_CHAT_SCOPE_CLASSIFICATION_REQUIRED' then 6
     when i.qualification_state='INDEPENDENT_POSTINSTALL_ACCEPTANCE_REQUIRED' then 7
     when i.qualification_state='HISTORICAL_SOURCE_REVALIDATION_REQUIRED' then 8
     when i.qualification_state='EVIDENCE_VERIFIED_ORIGINAL_STILL_NEEDS_QUALIFICATION' then 11
     when i.qualification_state='SIGNED_SOURCE_CHECK_NEEDS_ORIGINAL_ADMISSION_PROOF' then 12
     when i.qualification_state='AMBIGUOUS_PROVIDER_EFFECTS_NO_REPLAY' then 18
     when i.terminal_observation then 90
     else 20 end as intake_priority,
    pg_catalog.row_number() over(
     partition by i.intake_family
     order by i.terminal_observation,
      case
       when i.qualification_state='CURRENT_SOURCE_QUALIFICATION_REQUIRED' then 0
       when i.qualification_state='EXACT_BUSINESS_ORIGINAL_QUALIFICATION_REQUIRED' then 1
       when i.qualification_state='CURRENT_PROVIDER_EPOCH_REQUALIFICATION_REQUIRED' then 2
       when i.qualification_state='INDEPENDENT_CAPABILITY_GAP_PROOF_REQUIRED' then 3
       when i.qualification_state='CAPABILITY_PROVIDER_PROOF_RECHECK_REQUIRED' then 4
       when i.qualification_state='INDEPENDENT_INCIDENT_QUALIFICATION_REQUIRED' then 5
       when i.qualification_state='SIGNED_CHAT_SCOPE_CLASSIFICATION_REQUIRED' then 6
       when i.qualification_state='INDEPENDENT_POSTINSTALL_ACCEPTANCE_REQUIRED' then 7
       when i.qualification_state='HISTORICAL_SOURCE_REVALIDATION_REQUIRED' then 8
       when i.qualification_state='EVIDENCE_VERIFIED_ORIGINAL_STILL_NEEDS_QUALIFICATION' then 11
       when i.qualification_state='SIGNED_SOURCE_CHECK_NEEDS_ORIGINAL_ADMISSION_PROOF' then 12
       when i.qualification_state='AMBIGUOUS_PROVIDER_EFFECTS_NO_REPLAY' then 18
       when i.terminal_observation then 90
       else 20 end,
      i.source_observed_at desc nulls last,i.intake_key
    ) as family_rank
   from reality_internal.owner_continuous_qualification_inbox_v1 i
   left join reality_internal.owner_continuity_qualification_routes_v1 r
    on r.owner_id=i.owner_id and r.intake_family=i.intake_family
    and r.intake_key=i.intake_key
   where i.owner_id=p_owner_id
  ) ranked
  where ranked.family_rank<=5
  order by ranked.terminal_observation,ranked.intake_priority,
   ranked.family_rank,ranked.intake_family,ranked.intake_key
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
