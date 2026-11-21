-- Distinguish a recovered worker from a fully resumed existing original.
create or replace function public.reality_read_owner_preview_worker_auto_repair_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path to '' as $fn$
declare receipts jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null
 then raise exception 'AUTO_REPAIR_OWNER_READ_SERVICE_REQUIRED';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'repair_id',r.repair_id,'incident_id',r.incident_id,
  'phase',r.phase,'failed_runid',r.failed_runid,
  'repair_kind',r.repair_kind,
  'scope_verified',r.scope_verified,
  'before_sha256',r.before_sha256,'after_sha256',r.after_sha256,
  'repair_receipt_sha256',r.repair_receipt_sha256,
  'repair_applied_at',r.repair_applied_at,
  'worker_run_id',r.worker_run_id,
  'original_capability_claim_id',r.original_capability_claim_id,
  'original_work_receipt_sha256',r.original_work_receipt_sha256,
  'verified_at',r.verified_at,
  'blocker',r.blocker,
  'preview_only',r.preview_only,
  'production_changed',r.production_changed,
  'next_action',case r.phase
   when 'PATCH_APPLIED_AWAITING_WORKER' then
    'Reality applied the exact known preview scheduling correction. Wait for a signed-worker process receipt; SQL dispatch success is not enough.'
   when 'WORKER_ATTESTED_AWAITING_ORIGINAL' then
    'Reality independently saw the signed worker run. Wait for the SAME previously scheduled authorized investigation to complete and produce an independent original work receipt.'
   when 'WORKER_RESTORED_NO_ORIGINAL_TO_RESUME' then
    'The preview scheduling permission was automatically corrected and the signed worker independently resumed. No previously scheduled original was waiting, so no original-job completion can be claimed.'
   when 'INDEPENDENT_WORKER_AND_ORIGINAL_VERIFIED' then
    'Reality independently verified repaired scheduling, the signed worker ran, and a previously scheduled owner investigation recorded a genuine receipt. Continue ordinary work and monitor for regression.'
   when 'BLOCKED_UNRECOGNIZED_SCOPE' then
    'The failure did not match the safely reviewed correction. Reality cannot modify it automatically; inspect and approve an exact repair recipe while other work continues.'
   else
    'Independent worker or original evidence is missing. Preserve the defect, exact blocker, and existing work; do not claim completion.'
   end
 ) order by r.last_checked_at desc),'[]'::jsonb)
 into receipts from (
  select * from reality_internal.preview_worker_auto_repairs_v1
  where owner_id=p_owner_id order by last_checked_at desc limit 6
 ) r;
 return pg_catalog.jsonb_build_object(
  'status','OWNER_PREVIEW_OPERATIONAL_AUTO_REPAIR_READ_ONLY',
  'owner_id',p_owner_id,'owner_scope_verified',true,'read_only',true,
  'items',receipts,'count',pg_catalog.jsonb_array_length(receipts),
  'production_changed',false,'new_job_authorized_by_read',false,
  'install_authorized_by_read',false,
  'historical_external_correction_not_reclassified',true
 );
end $fn$;
