-- Reconcile ambiguous network results from exact owner approval without
-- granting authority on a read or causing a second, potentially duplicate POST.
-- This is an owner-scoped status read of the already-installed authority receipt.
create or replace function public.reality_read_owner_exact_business_effect_receipt_v1(
 p_owner_id uuid,p_packet_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare p record;
begin
 if current_user<>'service_role' or p_owner_id is null or p_packet_id is null
 then raise exception 'EXACT_EFFECT_OWNER_READBACK_AUTHENTICATED_SERVICE_REQUIRED';end if;
 select a.packet_id,a.owner_id,a.original_work_id,a.shift_id,a.continuity_ref,
  a.source_ref,a.source_epoch_fingerprint,a.job_class,a.effect_type,
  a.target_ref,a.payload_sha256,a.registered_execution_adapter,
  a.proposal_fingerprint,a.authority_state,a.approval_request_id,
  a.approval_receipt_sha256,a.reserved_worker_run_id,a.created_at,a.approved_at,
  a.reserved_at
 into p
 from reality_internal.owner_business_original_effect_approvals_v1 a
 where a.owner_id=p_owner_id and a.packet_id=p_packet_id;
 if not found then
  return pg_catalog.jsonb_build_object(
   'status','EXACT_BUSINESS_EFFECT_OWNER_PACKET_NOT_FOUND',
   'owner_id',p_owner_id,'packet_id',p_packet_id,
   'read_only',true,'approval_verified',false,'effect_reserved',false,
   'execution_authorized_by_read',false,'provider_effect_performed',false,
   'original_job_completed',false,'production_changed',false);
 end if;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_EXACT_BUSINESS_EFFECT_RECEIPT_READBACK',
  'owner_id',p.owner_id,'packet_id',p.packet_id,'shift_id',p.shift_id,
  'original_work_id',p.original_work_id,
  'continuity_ref',p.continuity_ref,'source_ref',p.source_ref,
  'source_epoch_fingerprint',p.source_epoch_fingerprint,
  'job_class',p.job_class,'effect_type',p.effect_type,
  'target_ref',p.target_ref,'payload_sha256',p.payload_sha256,
  'registered_execution_adapter',p.registered_execution_adapter,
  'proposal_fingerprint',p.proposal_fingerprint,
  'authority_state',p.authority_state,
  'approval_request_id',p.approval_request_id,
  'approval_receipt_sha256',p.approval_receipt_sha256,
  'approved_at',p.approved_at,'reserved_at',p.reserved_at,
  'approval_verified',p.authority_state in(
    'APPROVED_ONE_USE_NOT_EXECUTED','PROVIDER_EFFECT_RESERVED_RECONCILE_ONLY')
    and p.approval_request_id is not null and
    p.approval_receipt_sha256~'^sha256:[a-f0-9]{64}$',
  'effect_reserved',p.authority_state='PROVIDER_EFFECT_RESERVED_RECONCILE_ONLY'
    and p.reserved_worker_run_id is not null,
  'read_only',true,'execution_authorized_by_read',false,
  'provider_effect_performed',false,
  'independent_final_original_verified_by_read',false,
  'original_job_completed',false,'production_changed',false,
  'new_shift_started',false,'installation_authorized',false);
end;
$function$;
revoke all on function public.reality_read_owner_exact_business_effect_receipt_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_exact_business_effect_receipt_v1(uuid,uuid)
 to service_role;
