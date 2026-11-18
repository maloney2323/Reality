-- v22: Private owner-scoped maintenance conversation details.
-- This extends the EXISTING read-only service-role owner ledger; it does
-- not change maintenance queue rows, governance, warrants, or external actions.
create or replace function public.reality_read_owner_internal_maintenance_v1(
 p_owner_id uuid)
returns jsonb language plpgsql set search_path='' as $function$
declare items jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MAINTENANCE_OWNER_READ_AUTHORITY_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'internal_work_id','maintenance:'||m.incident_id::text,
  'origin_incident_id',m.incident_id,'origin_shift_id',m.origin_shift_id,
  'owner_id',m.owner_id,'kind',m.maintenance_kind,
  'assignee',m.assignee,'independent_reviewer',m.independent_reviewer,
  'phase',m.phase,'source_ref',m.source_ref,
  'independent_review_status',m.independent_review_status,
  'independent_review_receipt_sha256',m.independent_review_receipt_sha256,
  'worker_handling_state',m.handling_state,
  'worker_claim_attempts',m.claim_attempts,
  'worker_baseline_attempts',m.baseline_attempts,
  'independent_source_observation_receipt_sha256',
    m.independent_source_observation_receipt_sha256,
  'independent_failure_baseline_receipt_sha256',
    m.independent_failure_baseline_receipt_sha256,
  'independent_frozen_test_receipt_sha256',
    m.independent_frozen_test_receipt_sha256,
  'original_customer_work_id',m.original_customer_work_id,
  'frozen_reproduction_verified',
    m.independent_frozen_test_receipt_sha256 is not null,
  'repair_verified',m.repaired_capability_receipt_sha256 is not null,
  'original_customer_job_completed',false,
  'installation_authorized_by_read',false,
  'external_action_authorized_by_read',false,
  'production_changed',false,'created_at',m.created_at
 ) order by m.created_at desc),'[]'::jsonb) into items
 from (select * from reality_internal.owner_internal_maintenance_jobs_v1
       where owner_id=p_owner_id order by created_at desc limit 50) m;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
  'owner_id',p_owner_id,'read_only',true,
  'count',pg_catalog.jsonb_array_length(items),'items',items,
  'shift_started_by_read',false,'owner_authority_granted_by_read',false,
  'customer_jobs_completed_by_read',0,'production_changed',false);
end $function$;
revoke execute on function public.reality_read_owner_internal_maintenance_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_internal_maintenance_v1(uuid)
 to service_role;
