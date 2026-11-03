-- Preview-only, owner-scoped strategic research evidence.
-- Research receipts are NOT verified capability gaps, installation warrants,
-- original-work admissions or settlement receipts.
create table if not exists reality_internal.market_research_receipts_v1 (
 receipt_id uuid primary key default pg_catalog.gen_random_uuid(),
 owner_id uuid not null,
 report_sha256 text not null check (report_sha256 ~ '^[a-f0-9]{64}$'),
 source_commit_sha text not null check (source_commit_sha ~ '^[a-f0-9]{40}$'),
 report jsonb not null,
 candidate_count integer not null check (candidate_count between 0 and 4),
 created_at timestamptz not null default pg_catalog.now(),
 unique(owner_id,report_sha256)
);
create table if not exists reality_internal.market_research_sightings_v1 (
 owner_id uuid not null,
 fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
 first_seen_at timestamptz not null default pg_catalog.now(),
 last_seen_at timestamptz not null default pg_catalog.now(),
 observation_count integer not null default 1,
 primary key(owner_id,fingerprint)
);
alter table reality_internal.market_research_receipts_v1 enable row level security;
alter table reality_internal.market_research_sightings_v1 enable row level security;
revoke all on reality_internal.market_research_receipts_v1 from public,anon,authenticated;
revoke all on reality_internal.market_research_sightings_v1 from public,anon,authenticated;
grant usage on schema reality_internal to service_role;
grant select,insert on reality_internal.market_research_receipts_v1 to service_role;
grant select,insert,update on reality_internal.market_research_sightings_v1 to service_role;
create or replace function public.reality_record_owner_market_research_v1(
 p_owner_id uuid,p_report jsonb)
returns jsonb language plpgsql security invoker set search_path to ''
as $func$
declare
 v_receipt uuid;
 v_record record;
 v_find jsonb;
 v_results jsonb:='[]'::jsonb;
 v_seen boolean;
 v_fp text;
begin
 if current_user <> 'service_role' then
  raise exception 'MARKET_RESEARCH_SERVICE_ROLE_REQUIRED';
 end if;
 if p_owner_id is null or p_report is null or
   pg_catalog.jsonb_typeof(p_report)<>'object' or
   p_report->>'version'<>'reality-market-intelligence-v1' or
   p_report->>'disposition'<>'STRATEGY_REVIEW_ONLY' or
   (p_report->>'report_sha256')!~'^[a-f0-9]{64}$' or
   (p_report->'pinned_snapshot'->>'commit_sha')!~'^[a-f0-9]{40}$' or
   pg_catalog.jsonb_typeof(p_report->'findings')<>'array' or
   pg_catalog.jsonb_array_length(p_report->'findings')>4 or
   (p_report->>'installation_authorized')<>'false' or
   (p_report->>'job_started')<>'false' or
   (p_report->>'production_changed')<>'false' or
   (p_report->>'original_job_completed')<>'false' or
   (p_report->>'owner_authorized_investigation')<>'false' or
   (p_report->>'external_execution_authorized')<>'false' then
  raise exception 'MARKET_RESEARCH_UNTRUSTED_REPORT';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner_id::text,98731));
 insert into reality_internal.market_research_receipts_v1
  (owner_id,report_sha256,source_commit_sha,report,candidate_count)
 values(p_owner_id,p_report->>'report_sha256',
        p_report->'pinned_snapshot'->>'commit_sha',
        p_report,pg_catalog.jsonb_array_length(p_report->'findings'))
 on conflict(owner_id,report_sha256) do nothing;
 select receipt_id into v_receipt from reality_internal.market_research_receipts_v1
  where owner_id=p_owner_id and report_sha256=p_report->>'report_sha256';
 if v_receipt is null then raise exception 'MARKET_RESEARCH_RECEIPT_MISSING'; end if;
 for v_find in select x from pg_catalog.jsonb_array_elements(p_report->'findings') x loop
  v_fp:=v_find->>'fingerprint';
  if v_fp is null or v_fp!~'^[a-f0-9]{64}$' or
    (v_find->>'status')<>'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST' or
    (v_find->>'sandbox_verified')<>'false' or
    (v_find->>'installation_authorized')<>'false' or
    pg_catalog.jsonb_typeof(v_find->'evidence_urls')<>'array' or
    pg_catalog.jsonb_array_length(v_find->'evidence_urls')<1 then
   raise exception 'MARKET_RESEARCH_FINDING_UNVERIFIED';
  end if;
  select exists(select 1 from reality_internal.market_research_sightings_v1 s
   where s.owner_id=p_owner_id and s.fingerprint=v_fp) into v_seen;
  insert into reality_internal.market_research_sightings_v1
   (owner_id,fingerprint) values (p_owner_id,v_fp)
  on conflict(owner_id,fingerprint) do update
  set last_seen_at=pg_catalog.now(),
      observation_count=reality_internal.market_research_sightings_v1.observation_count+1;
  v_results:=v_results || pg_catalog.jsonb_build_array(
   v_find || pg_catalog.jsonb_build_object(
    'novelty',case when v_seen then 'RESEARCH_PREVIOUSLY_OBSERVED'
    else 'FIRST_RESEARCH_OBSERVATION' end));
 end loop;
 return pg_catalog.jsonb_build_object('ok',true,
  'status','GOVERNED_MARKET_RESEARCH_RECORDED','receipt_id',v_receipt,
  'owner_id',p_owner_id,'report_sha256',p_report->>'report_sha256',
  'findings',v_results,'installation_authorized',false,'job_started',false,
  'production_changed',false);
end $func$;
create or replace function public.reality_read_owner_market_research_v1(
 p_owner_id uuid,p_receipt_id uuid)
returns jsonb language plpgsql security invoker set search_path to ''
as $func$
declare v reality_internal.market_research_receipts_v1%rowtype;
begin
 if current_user <> 'service_role' then
  raise exception 'MARKET_RESEARCH_SERVICE_ROLE_REQUIRED';
 end if;
 select * into v from reality_internal.market_research_receipts_v1
  where owner_id=p_owner_id and receipt_id=p_receipt_id;
 if not found then raise exception 'MARKET_RESEARCH_OWNER_RECEIPT_NOT_FOUND'; end if;
 return pg_catalog.jsonb_build_object(
  'receipt_id',v.receipt_id,'owner_id',v.owner_id,
  'report_sha256',v.report_sha256,'candidate_count',v.candidate_count);
end $func$;
revoke all on function public.reality_record_owner_market_research_v1(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.reality_read_owner_market_research_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reality_record_owner_market_research_v1(uuid,jsonb) to service_role;
grant execute on function public.reality_read_owner_market_research_v1(uuid,uuid) to service_role;
