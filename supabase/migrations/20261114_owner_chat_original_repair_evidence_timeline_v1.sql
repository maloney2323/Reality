-- Existing signed-in Chat readback projects the actual original-job repair
-- phases from the SAME owner, shift, selected source and durable provider rows.
-- This is evidence display only: neither diagnosis nor passing CI grants install.
create or replace function public.reality_read_chat_work_for_owner_v1(
 p_owner_id uuid,p_conversation_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare items jsonb;
begin
 if p_owner_id is null or p_conversation_id is null or
  (current_user<>'service_role' and auth.uid() is distinct from p_owner_id)
 then raise exception 'CHAT_WORK_OWNER_SESSION_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'source_message_id',i.message_id,'request_id',i.request_id,
   'status',i.status,
   'source_ref','supabase:reality_chat_messages:'||i.message_id::text,
   'shift_id',i.shift_id,
   'diagnosis_status',i.investigation->>'status',
   'diagnosis',i.investigation->>'diagnosis',
   'selected_source_refs',i.investigation->'selected_source_refs',
   'worker_invocation_claimed',i.claim_id is not null,
   'work_chain',coalesce(links.work_chain,'[]'::jsonb),
   'execution_authorized_by_chat',false,
   'installation_authorized',false,'production_changed',false)
  order by i.created_at desc),'[]'::jsonb) into items
 from (
  select * from reality_internal.chat_work_handoffs_v1
  where owner_id=p_owner_id and conversation_id=p_conversation_id
  order by created_at desc limit 50
 ) i
 left join lateral (
  select pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
    'source_ref',j.issue_url,
    'original_work_id',j.original_work_id,
    'shift_id',j.shift_id,
    'original_phase',j.phase,
    'model_draft_phase',d.phase,
    'initial_frozen_ci_conclusion',f.conclusion,
    'initial_frozen_ci_url',f.independent_run_url,
    'initial_failed_test_count',f.failed_test_count,
    'corrective_model_phase',r.state,
    'corrective_ci_conclusion',rt.ci_conclusion,
    'corrective_ci_url',rt.independent_ci_url,
    'corrective_tests_passed',rt.tests_passed,
    'corrective_tests_failed',rt.tests_failed,
    'current_evidence_stage',case
      when j.phase='SETTLED' and j.original_settlement_receipt_ref is not null
       then 'ORIGINAL_SETTLEMENT_RECEIPT_PRESENT'
      when rt.ci_conclusion='success' and rt.tests_failed=0
       and rt.verified_at is not null
       then 'CORRECTIVE_CI_PASSED_AWAITING_EXACT_INSTALL_GATE'
      when rt.ci_conclusion='failure' and rt.verified_at is not null
       then 'CORRECTIVE_CI_REJECTED_WITH_FROZEN_EVIDENCE'
      when r.state='MODEL_REVISION_RECORDED'
       then 'CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI'
      when f.conclusion='failure'
       then 'INITIAL_CANDIDATE_INDEPENDENTLY_REJECTED'
      when d.phase='MODEL_DRAFT_RECORDED'
       then 'MODEL_DRAFT_AWAITING_INDEPENDENT_CI'
      else 'SOURCE_BACKED_ORIGINAL_AWAITING_NEXT_GOVERNED_ACTION' end,
    'independent_repair_or_settlement_proven_by_chat',false,
    'installation_authorized_by_chat',false
   ) order by j.original_work_id) as work_chain
  from pg_catalog.jsonb_array_elements_text(
    case when i.status='INVESTIGATED_SCOPED'
      and pg_catalog.jsonb_typeof(i.investigation->'selected_source_refs')='array'
     then i.investigation->'selected_source_refs'
     else '[]'::jsonb end) selected(source_ref)
  join reality_internal.riley_unattended_repair_originals_v1 j
   on j.issue_url=selected.source_ref and j.owner_id=i.owner_id
   and j.shift_id=i.shift_id and j.production_changed=false
  left join reality_internal.riley_native_model_drafts_v1 d
   on d.original_work_id=j.original_work_id and d.owner_id=j.owner_id
   and d.shift_id=j.shift_id and d.source_ref=j.issue_url
   and d.source_proof_sha256=j.shift_source_proof_sha256
  left join reality_internal.riley_native_frozen_test_findings_v1 f
   on f.original_work_id=j.original_work_id and f.owner_id=j.owner_id
   and f.shift_id=j.shift_id
  left join reality_internal.riley_native_model_revisions_v1 r
   on r.original_work_id=j.original_work_id and r.owner_id=j.owner_id
   and r.shift_id=j.shift_id
  left join reality_internal.riley_native_model_revision_frozen_results_v1 rt
   on rt.original_work_id=j.original_work_id and rt.owner_id=j.owner_id
   and rt.shift_id=j.shift_id
 ) links on true;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_CHAT_WORK_INTAKE_READBACK',
  'owner_id',p_owner_id,'conversation_id',p_conversation_id,
  'items',items,'independent_execution_receipt_count',0,
  'new_shift_started',false,'installation_authorized',false,
  'production_changed',false);
end $fn$;
revoke all on function public.reality_read_chat_work_for_owner_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_chat_work_for_owner_v1(uuid,uuid)
 to service_role;