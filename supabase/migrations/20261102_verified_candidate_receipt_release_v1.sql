-- Receipt release is EVIDENCE publication only; never an installation warrant.
-- Operates on immutable, independently checked provider artifacts.
create table if not exists reality_internal.verified_capability_receipt_releases_v1 (
  receipt_id text primary key check(receipt_id ~ '^candidate-receipt:[a-f0-9]{32}$'),
  source_issue integer not null check(source_issue>0),
  provider_run_id bigint not null check(provider_run_id>0),
  provider_repository_sha text not null check(provider_repository_sha ~ '^[a-f0-9]{40}$'),
  source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
  verifier_archive_sha256 text not null check(verifier_archive_sha256 ~ '^[a-f0-9]{64}$'),
  proposal_archive_sha256 text not null check(proposal_archive_sha256 ~ '^[a-f0-9]{64}$'),
  verifier_report_sha256 text not null check(verifier_report_sha256 ~ '^[a-f0-9]{64}$'),
  independent_job_id bigint not null check(independent_job_id>0),
  verified_checks integer not null check(verified_checks>0),
  frozen_test_sha256 text not null check(frozen_test_sha256 ~ '^[a-f0-9]{64}$'),
  report jsonb not null,
  provider_proof jsonb not null,
  released_at timestamptz not null default clock_timestamp(),
  unique(provider_run_id,source_sha256,verifier_archive_sha256)
);
alter table reality_internal.verified_capability_receipt_releases_v1 enable row level security;
revoke all on reality_internal.verified_capability_receipt_releases_v1 from public,anon,authenticated;
grant select,insert on reality_internal.verified_capability_receipt_releases_v1 to service_role;
revoke update,delete,truncate on reality_internal.verified_capability_receipt_releases_v1 from service_role;
create or replace function reality_internal.prevent_capability_receipt_mutation_v1()
returns trigger language plpgsql set search_path='' as $fn$
begin
 raise exception 'IMMUTABLE_VERIFIED_CAPABILITY_RECEIPT';
end;
$fn$;
drop trigger if exists verified_capability_receipt_immutable_v1 on reality_internal.verified_capability_receipt_releases_v1;
create trigger verified_capability_receipt_immutable_v1
 before update or delete on reality_internal.verified_capability_receipt_releases_v1
 for each row execute function reality_internal.prevent_capability_receipt_mutation_v1();

create or replace function public.reality_release_verified_capability_receipt_v1(
 p_report jsonb,p_proof jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare id text; existing reality_internal.verified_capability_receipt_releases_v1%rowtype;
declare n bigint; src text; repo_sha text; proposer text; verifier text; report_hash text;
begin
 if current_user<>'service_role' then
   raise exception 'VERIFIED_RECEIPT_TRUSTED_RELEASE_ONLY';
 end if;
 if not (p_report ?& array[
  'schema','status','signed_run_id','repository_sha','source_issue',
  'source_sha256','frozen_test_sha256','holdout_test_sha256',
  'output_sha256','model_response_id','tested','passed','failed',
  'exit_code','installation_authorized','installation_performed',
  'original_customer_job_settled','production_changed',
  'verified_customer_dollars_saved','independent_secret_free_runner',
  'offline_docker_network_none'
 ] and p_proof ?& array[
  'schema','provider_job_conclusion','provider_run_conclusion',
  'provider_run_status','provider_repository','provider_branch',
  'independent_job_id','verifier_archive_sha256',
  'proposal_archive_sha256','verifier_report_sha256',
  'provider_repository_sha','provider_run_id','source_sha256'
 ]) then
  raise exception 'VERIFIED_RECEIPT_REQUIRED_PROOF_FIELDS_MISSING';
 end if;
 if pg_catalog.jsonb_typeof(p_report->'tested')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'passed')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'failed')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'exit_code')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'signed_run_id')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'source_issue')<>'number' or
    pg_catalog.jsonb_typeof(p_proof->'provider_run_id')<>'number' or
    pg_catalog.jsonb_typeof(p_proof->'independent_job_id')<>'number' or
    pg_catalog.jsonb_typeof(p_report->'installation_authorized')<>'boolean' or
    pg_catalog.jsonb_typeof(p_report->'installation_performed')<>'boolean' or
    pg_catalog.jsonb_typeof(p_report->'original_customer_job_settled')<>'boolean' or
    pg_catalog.jsonb_typeof(p_report->'production_changed')<>'boolean'
 then raise exception 'VERIFIED_RECEIPT_PROOF_TYPES_INVALID'; end if;
 if p_report is null or p_proof is null or
    p_report->>'schema'<>'reality-independent-uninstalled-source-value-v1' or
    p_report->>'status'<>'INDEPENDENT_SOURCE_CANDIDATE_PASSED' or
    p_report->>'independent_secret_free_runner'<>'true' or
    p_report->>'offline_docker_network_none'<>'true' or
    p_report->>'installation_authorized'<>'false' or
    p_report->>'installation_performed'<>'false' or
    p_report->>'original_customer_job_settled'<>'false' or
    p_report->>'production_changed'<>'false' or
    p_report->'verified_customer_dollars_saved'<>'null'::jsonb or
    p_report->>'exit_code'<>'0' or
    p_report->>'failed'<>'0' or
    p_report->>'tested'<>p_report->>'passed' or
    (p_report->>'tested') !~ '^[1-9][0-9]{0,5}$' or
    (p_report->>'source_sha256') !~ '^[a-f0-9]{64}$' or
    (p_report->>'frozen_test_sha256') !~ '^[a-f0-9]{64}$' or
    (p_report->>'holdout_test_sha256') !~ '^[a-f0-9]{64}$' or
    (p_report->>'output_sha256') !~ '^[a-f0-9]{64}$' or
    (p_report->>'repository_sha') !~ '^[a-f0-9]{40}$' or
    (p_report->>'model_response_id') !~ '^resp_[A-Za-z0-9_-]{12,160}$' or
    (p_report->>'signed_run_id') !~ '^[1-9][0-9]{1,16}$' or
    (p_report->>'source_issue') !~ '^[1-9][0-9]{0,6}$' or
    p_proof->>'schema'<>'reality-trusted-provider-artifact-readback-v1' or
    p_proof->>'provider_job_conclusion'<>'success' or
    p_proof->>'provider_run_conclusion'<>'success' or
    p_proof->>'provider_run_status'<>'completed' or
    p_proof->>'provider_repository'<>'maloney2323/Reality' or
    p_proof->>'provider_branch'<>'feature/reality-general-capability-engine-20261101' or
    (p_proof->>'independent_job_id') !~ '^[1-9][0-9]{1,16}$' or
    (p_proof->>'verifier_archive_sha256') !~ '^[a-f0-9]{64}$' or
    (p_proof->>'proposal_archive_sha256') !~ '^[a-f0-9]{64}$' or
    (p_proof->>'verifier_report_sha256') !~ '^[a-f0-9]{64}$' or
    p_proof->>'provider_repository_sha'<>p_report->>'repository_sha' or
    p_proof->>'provider_run_id'<>p_report->>'signed_run_id' or
    p_proof->>'source_sha256'<>p_report->>'source_sha256'
 then
   raise exception 'VERIFIED_RECEIPT_INDEPENDENT_PROOF_INVALID';
 end if;
 n:=(p_report->>'signed_run_id')::bigint;
 src:=p_report->>'source_sha256';
 repo_sha:=p_report->>'repository_sha';
 proposer:=p_proof->>'proposal_archive_sha256';
 verifier:=p_proof->>'verifier_archive_sha256';
 report_hash:=p_proof->>'verifier_report_sha256';
 id:='candidate-receipt:'||pg_catalog.substr(
   pg_catalog.encode(extensions.digest(
      'maloney2323/Reality|'||n::text||'|'||repo_sha||'|'||src||'|'||proposer||'|'||verifier,
      'sha256'),'hex'),1,32);
 insert into reality_internal.verified_capability_receipt_releases_v1(
   receipt_id,source_issue,provider_run_id,provider_repository_sha,
   source_sha256,verifier_archive_sha256,proposal_archive_sha256,
   verifier_report_sha256,independent_job_id,verified_checks,
   frozen_test_sha256,report,provider_proof
 ) values(
   id,(p_report->>'source_issue')::integer,n,repo_sha,src,verifier,proposer,
   report_hash,(p_proof->>'independent_job_id')::bigint,
   (p_report->>'passed')::integer,p_report->>'frozen_test_sha256',
   p_report,p_proof
 ) on conflict do nothing;
 select * into existing from reality_internal.verified_capability_receipt_releases_v1
 where receipt_id=id;
 if existing.receipt_id is null or
    existing.report<>p_report or existing.provider_proof<>p_proof or
    existing.verified_checks<>(p_report->>'passed')::integer or
    existing.verifier_report_sha256<>report_hash then
    raise exception 'VERIFIED_RECEIPT_CONFLICT_NO_REWRITE';
 end if;
 return pg_catalog.jsonb_build_object(
 'schema','reality-durably-released-verified-capability-receipt-v1',
 'receipt_id',existing.receipt_id,
 'status','RELEASED_VERIFIED_PROVIDER_EVIDENCE',
 'source_issue',existing.source_issue,
 'source_sha256',existing.source_sha256,
 'provider_run_id',existing.provider_run_id,
 'verified_checks_passed',existing.verified_checks,
 'released_at',existing.released_at,
 'durable_readback_verified',true,
 'original_work_authorized',false,
 'installation_authorized',false,'installed',false,
 'original_job_settled',false,'production_changed',false);
end;
$fn$;
revoke all on function public.reality_release_verified_capability_receipt_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.reality_release_verified_capability_receipt_v1(jsonb,jsonb) to service_role;

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
