-- Settlement is not a status checkbox: require TWO independent persisted
-- Continuity receipts: original executor outcome and constitutional SETTLED.
create or replace function public.reality_mark_general_repair_settled_v1(
 p_owner_id uuid,p_conversation_id uuid,p_original_work_id text,
 p_reservation_id uuid,p_original_outcome_event_id uuid,
 p_final_checkpoint_event_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare a reality_internal.general_repair_owner_approvals_v1%rowtype;
 outcome_event public.universe_events%rowtype;
 checkpoint public.universe_events%rowtype;
begin
 if current_user<>'service_role' then
  raise exception 'GENERAL_REPAIR_SERVICE_ONLY';
 end if;
 select * into a from reality_internal.general_repair_owner_approvals_v1
  where owner_id=p_owner_id and conversation_id=p_conversation_id
   and original_work_id=p_original_work_id and reservation_id=p_reservation_id
  for update;
 if a.reservation_id is null or a.status not in ('INSTALLED','SETTLED') or
    a.installed_commit_sha is null or a.candidate_hash is null then
  raise exception 'GENERAL_REPAIR_EXACT_INSTALLED_OWNER_RECEIPT_REQUIRED';
 end if;
 select * into outcome_event from public.universe_events
  where event_id=p_original_outcome_event_id;
 select * into checkpoint from public.universe_events
  where event_id=p_final_checkpoint_event_id;
 if outcome_event.event_id is null or checkpoint.event_id is null or
    outcome_event.entity_type<>'reality_generic_verified_original_work_outcome' or
    outcome_event.payload->>'owner_id'<>p_owner_id::text or
    outcome_event.payload->>'original_work_id'<>p_original_work_id or
    outcome_event.payload->>'installed_artifact_hash'<>a.candidate_hash or
    outcome_event.payload->>'installed_commit_sha'<>a.installed_commit_sha or
    outcome_event.payload->>'outcome'<>'SUCCEEDED' or
    outcome_event.payload->>'independent_outcome_verified'<>'true' or
    outcome_event.payload->>'production_changed'<>'false' or
    checkpoint.entity_type<>'reality_general_constitutional_checkpoint' or
    checkpoint.payload->>'owner_id'<>p_owner_id::text or
    checkpoint.payload->>'original_work_id'<>p_original_work_id or
    checkpoint.payload->>'constitutional_phase'<>'SETTLED' or
    checkpoint.payload->>'original_job_completed'<>'true' or
    checkpoint.payload->'driver_state'->'settlement'->>'settlement_receipt_ref'<>
      'supabase:universe_events:'||p_original_outcome_event_id::text or
    checkpoint.payload->'driver_state'->'candidate'->>'artifact_hash'<>
      a.candidate_hash or
    checkpoint.continuity_root_id<>outcome_event.continuity_root_id or
    checkpoint.worldline_id<>outcome_event.worldline_id or
    outcome_event.assertion_time>checkpoint.assertion_time
 then raise exception 'GENERAL_REPAIR_DISTINCT_ORIGINAL_SETTLEMENT_EVIDENCE_MISSING';
 end if;
 update reality_internal.general_repair_owner_approvals_v1
 set status='SETTLED',settled_at=coalesce(settled_at,pg_catalog.now())
 where reservation_id=a.reservation_id;
 return pg_catalog.jsonb_build_object(
 'status','SETTLED','original_work_id',p_original_work_id,
 'reservation_id',p_reservation_id,
 'installed_commit_sha',a.installed_commit_sha,
 'original_outcome_receipt_ref','supabase:universe_events:'||p_original_outcome_event_id::text,
 'final_constitutional_receipt_ref','supabase:universe_events:'||p_final_checkpoint_event_id::text,
 'independent_outcome_verified',true,'original_job_completed',true,
 'production_changed',false);
end $fn$;
revoke all on function public.reality_mark_general_repair_settled_v1(
 uuid,uuid,text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_mark_general_repair_settled_v1(
 uuid,uuid,text,uuid,uuid,uuid) to service_role;
