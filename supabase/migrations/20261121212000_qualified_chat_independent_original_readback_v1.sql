-- Independent original readback joins the owner approval receipt to the
-- actual canonical signed Chat development record. No second write/authority.
create or replace function public.reality_read_owner_qualified_chat_original_reviews_v1(
 p_owner_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'QUALIFIED_CHAT_OWNER_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'packet_id',p.packet_id,'message_id',p.message_id,'continuity_ref',p.continuity_ref,
  'source_ref',p.source_ref,'source_quote',p.source_quote,'objective',p.objective,
  'proposal_fingerprint',p.proposal_fingerprint,
  'review_state',p.review_state,'original_work_id',p.original_work_id,
  'canonical_chat_original_readback_verified',(
    p.review_state='ORIGINAL_ADMITTED_IN_EXISTING_CHAT_WORK_ADAPTER'
    and h.message_id=p.message_id
    and h.message_sha256=p.signed_message_sha256
    and h.development->>'source_sha256'=p.signed_message_sha256
    and h.development->>'original_work_id'=p.original_work_id
    and h.development->>'source_ref'=p.source_ref
    and h.development->>'installation_authorized'='false'
    and h.development->>'original_job_completed'='false'
    and h.development->>'production_changed'='false'
  ),
  'approval_receipt_sha256',p.approval_receipt_sha256,
  'owner_approval_ready',p.review_state='AWAITING_OWNER_EXACT_APPROVAL',
  'model_execution_authorized',false,'installation_authorized',false,
  'original_job_completed',false,'new_shift_started',false)
 order by p.created_at desc),'[]'::jsonb) into v
 from (select * from reality_internal.owner_qualified_chat_original_review_packets_v1
  where owner_id=p_owner_id order by created_at desc limit 20) p
 left join reality_internal.chat_work_handoffs_v1 h
  on h.owner_id=p.owner_id and h.message_id=p.message_id
   and h.conversation_id=p.conversation_id and h.request_id=p.request_id;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_QUALIFIED_CHAT_ORIGINAL_EXACT_REVIEWS',
  'owner_id',p_owner_id,'items',v,'read_only',true,
  'owner_approval_granted_by_read',false,
  'execution_authorized',false,'installation_authorized',false,
  'production_changed',false);
end $function$;
revoke all on function public.reality_read_owner_qualified_chat_original_reviews_v1(uuid) from public,anon,authenticated;
grant execute on function public.reality_read_owner_qualified_chat_original_reviews_v1(uuid) to service_role;
