create or replace function public.reality_read_owner_released_capability_receipts_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare rows jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
   raise exception 'VERIFIED_RECEIPT_OWNER_SERVICE_SCOPE_REQUIRED';
 end if;
 select coalesce(pg_catalog.jsonb_agg(
   pg_catalog.jsonb_build_object(
    'receipt_id',r.receipt_id,'status','RELEASED_VERIFIED_PROVIDER_EVIDENCE',
    'source_issue',r.source_issue,'source_sha256',r.source_sha256,
    'provider_run_id',r.provider_run_id,'released_at',r.released_at,
    'verified_checks_passed',r.verified_checks,
    'observed_model_input_tokens',(r.report->>'model_input_tokens')::integer,
    'observed_model_output_tokens',(r.report->>'model_output_tokens')::integer,
    'observed_model_attempts',(r.report->>'model_attempts')::integer,
    'observed_independent_verification_ms',(r.report->>'independent_verification_ms')::integer,
    'observed_model_cost_usd',null,
    'source_of_usage','IMMUTABLE_INDEPENDENT_VERIFIER_REPORT',
    'verifier_archive_sha256',r.verifier_archive_sha256,
    'verifier_report_sha256',r.verifier_report_sha256,
    'durable_readback_verified',true,
    'owner_work_binding_verified',false,
    'installation_authorized',false,'installed',false,
    'original_job_settled_by_this_receipt',false,
    'production_changed',false)
    order by r.released_at desc
 ),'[]'::jsonb) into rows
 from reality_internal.verified_capability_receipt_releases_v1 r
 where exists(
  select 1 from public.universe_events e
  -- The owner may have legitimate VERIFIED historical source work even
  -- if it was settled outside the current active capability queue.
  -- This join identifies an owner, NOT a fresh execution authorization.
  where e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'owner_id'=p_owner_id::text
   and e.provenance->>'principal_id'=p_owner_id::text
   and e.payload->>'issue_number'=r.source_issue::text
   and e.payload->>'frozen_test_sha256'=r.frozen_test_sha256
   and e.payload->>'owner_authorized_installation'='false'
 );
 return pg_catalog.jsonb_build_object(
  'schema','reality-owner-released-capability-receipts-v1',
  'receipts',rows,'owner_work_authorized_by_receipts',false,
  'installation_authorized',false,'production_changed',false);
end;
$fn$;
revoke all on function public.reality_read_owner_released_capability_receipts_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_released_capability_receipts_v1(uuid)
 to service_role;

