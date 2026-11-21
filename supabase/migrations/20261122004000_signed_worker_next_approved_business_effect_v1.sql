-- Current signed Reality worker can discover the NEXT approved original effect.
-- This is a verified, read-only bridge into its existing dispatch cadence.
-- The callback registry MUST have a real installed provider handler BEFORE
-- the separate one-use claim RPC is invoked; never claim just to test wiring.
create or replace function public.reality_read_next_signed_business_effect_handoff_v1(
 p_worker_run_id uuid
) returns jsonb language plpgsql set search_path to ''
as $function$
declare v record; pre jsonb; epoch text;
begin
 if current_user<>'service_role' or p_worker_run_id is null
 then raise exception 'SIGNED_BUSINESS_EFFECT_SERVICE_WORKER_REQUIRED';end if;
 if not exists(select 1
  from reality_internal.governed_preview_shift_worker_leases_v1 l
  where l.worker_key='preview-governed-employee-shift-worker'
   and l.claim_id=p_worker_run_id
   and l.released_at is null
   and l.lease_expires_at>clock_timestamp())
 then return pg_catalog.jsonb_build_object(
  'status','SIGNED_BUSINESS_EFFECT_CURRENT_WORKER_LEASE_REQUIRED',
  'execution_authorized_by_read',false,'effect_reserved',false,
  'original_job_completed',false,'production_changed',false);end if;
 select p.* into v
 from reality_internal.owner_business_original_effect_approvals_v1 p
 join reality_internal.governed_employee_shifts_v1 s
  on s.shift_id=p.shift_id and s.owner_id=p.owner_id
 where p.authority_state='APPROVED_ONE_USE_NOT_EXECUTED'
  and p.approved_at>clock_timestamp()-interval '30 minutes'
  and s.closed_at is null
  and s.status in('RUNNING','AWAITING_EXACT_ORIGINAL_WORK')
 order by p.approved_at,p.packet_id limit 1;
 if not found then return pg_catalog.jsonb_build_object(
  'status','NO_OWNER_APPROVED_BUSINESS_EFFECT_TO_HANDOFF',
  'execution_authorized_by_read',false,'effect_reserved',false,
  'original_job_completed',false,'production_changed',false);end if;
 pre:=public.reality_read_owner_exact_business_effect_preflight_v1(
  v.owner_id,v.original_work_id,v.job_class,v.effect_type);
 select r.source_epoch_fingerprint into epoch
 from reality_internal.owner_continuity_qualification_routes_v1 r
 where r.owner_id=v.owner_id and r.original_work_id=v.original_work_id
  and r.continuity_ref=v.continuity_ref and r.source_ref=v.source_ref;
 if pre->>'status'<>'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT'
  or pre->>'canonical_original_admission_verified'<>'true'
  or pre->>'canonical_source_current'<>'true'
  or pre->>'consented_business_provider_verified'<>'true'
  or pre->>'registered_executor_independently_verified'<>'true'
  or pre->>'independent_final_original_already_present'<>'false'
  or pre->>'registered_executor_adapter'<>v.registered_execution_adapter
  or pre->>'shift_id'<>v.shift_id::text
  or epoch is distinct from v.source_epoch_fingerprint
 then return pg_catalog.jsonb_build_object(
  'status','SIGNED_BUSINESS_EFFECT_SOURCE_OR_ADAPTER_DRIFT_NO_DISPATCH',
  'execution_authorized_by_read',false,'effect_reserved',false,
  'original_job_completed',false,'production_changed',false);end if;
 return pg_catalog.jsonb_build_object(
  'status','EXACT_APPROVED_BUSINESS_EFFECT_REGISTERED_HANDLER_REQUIRED',
  'owner_id',v.owner_id,'shift_id',v.shift_id,
  'packet_id',v.packet_id,'original_work_id',v.original_work_id,
  'continuity_ref',v.continuity_ref,'source_ref',v.source_ref,
  'job_class',v.job_class,'effect_type',v.effect_type,
  'registered_execution_adapter',v.registered_execution_adapter,
  'source_epoch_fingerprint',v.source_epoch_fingerprint,
  'payload_sha256',v.payload_sha256,
  'approval_receipt_sha256',v.approval_receipt_sha256,
  'owner_exact_one_use_approval_verified',true,
  'handler_installed_and_verified_by_read',false,
  'execution_authorized_by_read',false,'effect_reserved',false,
  'original_job_completed',false,'production_changed',false,
  'next_action','REQUIRE_INSTALLED_EXECUTOR_REGISTERED_IN_TRUSTED_WORKER');
end;
$function$;
revoke all on function public.reality_read_next_signed_business_effect_handoff_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_next_signed_business_effect_handoff_v1(uuid)
 to service_role;