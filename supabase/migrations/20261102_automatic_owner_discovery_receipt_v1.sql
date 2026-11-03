-- A discovery is evidence, not a newly authorized customer job.
-- This read-only service RPC projects an existing automatically recorded,
-- source-pinned unbound discovery to a customer who owns an independently
-- verified historical source-backed job for the SAME missing module and suite.
-- No new work is created, no authority inferred from a past settlement.
create or replace function public.reality_read_owner_discovery_receipts_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker
set search_path=''
as $body$
declare receipts jsonb;
begin
 if current_user <> 'service_role' then
  raise exception 'DISCOVERY_RECEIPT_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null then
  raise exception 'DISCOVERY_RECEIPT_OWNER_REQUIRED';
 end if;
 select coalesce(pg_catalog.jsonb_agg(r.record order by r.observed_at desc),'[]'::jsonb)
 into receipts
 from (
  select distinct on (d.frozen_sha256)
   d.discovered_at as observed_at,
   pg_catalog.jsonb_build_object(
     'schema','reality-automatic-discovery-receipt-v1',
     'receipt_id','discovery:'||pg_catalog.substr(
       pg_catalog.encode(extensions.digest(
       d.frozen_sha256||':'||d.frozen_test_path||':'||d.missing_module_path,
       'sha256'),'hex'),1,32),
     'receipt_kind','AUTOMATIC_EVIDENCE_OBSERVATION',
     'status',d.status,
     'frozen_test_sha256',d.frozen_sha256,
     'frozen_test_path',d.frozen_test_path,
     'missing_module_path',d.missing_module_path,
     'first_repository_sha',d.first_observed_sha,
     'latest_repository_sha',d.latest_observed_sha,
     'first_observed_at',d.discovered_at,
     'latest_observed_at',d.last_observed_at,
     'historical_source_job_settled',true,
     'new_original_work_created',false,
     'owner_work_binding_verified',false,
     'installation_authorized',false,
     'original_job_completed_by_receipt',false,
     'production_changed',false
   ) as record
  from reality_internal.genuine_unbound_capability_discoveries_v1 d
  join public.universe_events e
   on e.entity_type='reality_original_source_backed_repair_work'
   and e.epistemic_status='VERIFIED'
   and e.payload->>'frozen_test_path'=d.frozen_test_path
   and e.payload->>'source_path'=d.missing_module_path
   and e.payload->>'frozen_test_sha256'=d.frozen_sha256
   and e.payload->>'owner_id'=p_owner_id::text
   and e.provenance->>'principal_id'=p_owner_id::text
  join reality_internal.genuine_capability_queue_v1 q
   on q.original_work_event_id=e.event_id
   and q.owner_id=p_owner_id
   and q.original_work_id=e.payload->>'original_work_id'
   and q.phase='SETTLED_ISOLATED'
  where d.status='AWAITING_OWNER_WORK_BINDING'
  order by d.frozen_sha256,d.discovered_at desc
  limit 20
 ) r;
 return pg_catalog.jsonb_build_object(
   'schema','reality-owner-automatic-discovery-receipts-v1',
   'receipts',receipts,
   'scope','OWNER_MATCHED_SOURCE_ONLY_NO_NEW_JOB_AUTHORITY',
   'work_creation_authorized',false,
   'installation_authorized',false,
   'production_changed',false
 );
end;
$body$;
revoke all on function public.reality_read_owner_discovery_receipts_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_discovery_receipts_v1(uuid)
 to service_role;
