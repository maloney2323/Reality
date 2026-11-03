-- Reality research-to-investigation continuation: immutable, owner scoped.
-- This repairs the missing read-only stage handoff. It is NOT source installation.
-- All writes here are mechanical evidence reconciliation and have zero tool authority.
create table if not exists reality_internal.market_stage_investigations_v1(
 owner_id uuid not null,
 receipt_id uuid not null references reality_internal.market_research_receipts_v1(receipt_id),
 finding_fingerprint text not null check (finding_fingerprint ~ '^[a-f0-9]{64}$'),
 report_sha256 text not null check (report_sha256 ~ '^[a-f0-9]{64}$'),
 source_commit_sha text not null check (source_commit_sha ~ '^[a-f0-9]{40}$'),
 finding_title text not null check (length(finding_title) between 1 and 150),
 phase text not null check(phase in
  ('EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED','INVESTIGATION_ADMITTED_READ_ONLY')),
 diagnosis_code text not null check(diagnosis_code in
  ('RESEARCH_TO_INVESTIGATION_HANDOFF_MISSING',
   'INDEPENDENT_FROZEN_FAILURE_PROOF_MISSING')),
 next_action text not null default 'REQUIRE_INDEPENDENT_FROZEN_FAILURE_REPRODUCTION'
  check(next_action='REQUIRE_INDEPENDENT_FROZEN_FAILURE_REPRODUCTION'),
 source_urls jsonb not null check(jsonb_typeof(source_urls)='array'),
 independent_test_required text not null,
 stage_repair_verified boolean not null default false check(stage_repair_verified=true),
 verified_missing_capability boolean not null default false check(verified_missing_capability=false),
 executable_job_created boolean not null default false check(executable_job_created=false),
 owner_install_authorized boolean not null default false check(owner_install_authorized=false),
 production_changed boolean not null default false check(production_changed=false),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(owner_id,receipt_id,finding_fingerprint)
);
create table if not exists reality_internal.market_stage_events_v1(
 event_id uuid primary key default pg_catalog.gen_random_uuid(),
 owner_id uuid not null,
 receipt_id uuid not null,
 finding_fingerprint text not null check(finding_fingerprint ~ '^[a-f0-9]{64}$'),
 event_code text not null check(event_code in
  ('RESEARCH_HANDOFF_ABSENT_DETECTED',
   'AUTO_REPAIRED_INVESTIGATION_HANDOFF',
   'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED')),
 report_sha256 text not null check(report_sha256 ~ '^[a-f0-9]{64}$'),
 observed_at timestamptz not null default pg_catalog.now(),
 unique(owner_id,receipt_id,finding_fingerprint,event_code),
 foreign key(owner_id,receipt_id,finding_fingerprint)
  references reality_internal.market_stage_investigations_v1
   (owner_id,receipt_id,finding_fingerprint)
);
create index if not exists market_stage_owner_recent_v1
 on reality_internal.market_stage_investigations_v1(owner_id,created_at desc);
create index if not exists market_stage_events_owner_recent_v1
 on reality_internal.market_stage_events_v1(owner_id,observed_at desc);
alter table reality_internal.market_stage_investigations_v1 enable row level security;
alter table reality_internal.market_stage_events_v1 enable row level security;
revoke all on reality_internal.market_stage_investigations_v1 from public,anon,authenticated;
revoke all on reality_internal.market_stage_events_v1 from public,anon,authenticated;
grant select,insert,update on reality_internal.market_stage_investigations_v1 to service_role;
grant select,insert on reality_internal.market_stage_events_v1 to service_role;

-- This function is invoked by the database watchdog, never by client/model.
-- It examines only already-persisted owner-scoped research evidence.
create or replace function reality_internal.reconcile_market_stages_v1()
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare
 v_rec record;v_find jsonb;v_fp text;v_title text;v_evidence jsonb;
 v_test text;v_count integer:=0;v_new integer:=0;v_ins int;
begin
 if current_user not in ('postgres','service_role') then
  raise exception 'MARKET_STAGE_PRIVILEGED_WATCHDOG_ONLY';
 end if;
 -- Bound each scheduled pass. A unique source receipt can only enter once.
 for v_rec in
  select r.* from reality_internal.market_research_receipts_v1 r
  where r.created_at>pg_catalog.now()-interval '45 days'
    and r.report->>'version'='reality-market-intelligence-v1'
    and r.report->>'disposition'='STRATEGY_REVIEW_ONLY'
    and r.report->>'report_sha256'=r.report_sha256
    and r.report->'pinned_snapshot'->>'commit_sha'=r.source_commit_sha
    and r.report->>'installation_authorized'='false'
    and r.report->>'job_started'='false'
    and r.report->>'production_changed'='false'
    and pg_catalog.jsonb_typeof(r.report->'findings')='array'
  order by r.created_at desc limit 80
 loop
  if pg_catalog.jsonb_array_length(v_rec.report->'findings')<>v_rec.candidate_count
     or v_rec.candidate_count>4 then continue; end if;
  for v_find in select * from pg_catalog.jsonb_array_elements(v_rec.report->'findings') loop
   v_fp:=v_find->>'fingerprint';v_title:=left(coalesce(v_find->>'title',''),150);
   v_test:=left(coalesce(v_find->>'falsification_test',''),700);
   v_evidence:=v_find->'evidence_urls';
   if v_fp is null or v_fp !~ '^[a-f0-9]{64}$' or
     length(v_title)<1 or length(v_test)<12 or
     pg_catalog.jsonb_typeof(v_evidence)<>'array' or
     pg_catalog.jsonb_array_length(v_evidence)<1 or
     (v_find->>'status')<>'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST' or
     (v_find->>'sandbox_verified')<>'false' or
     (v_find->>'installation_authorized')<>'false' or
     (v_find->>'code_comparison')<>'SAMPLED_CODE_ONLY_NOT_PROVEN_ABSENT'
   then continue;end if;
   v_count:=v_count+1;
   insert into reality_internal.market_stage_investigations_v1
    (owner_id,receipt_id,finding_fingerprint,report_sha256,source_commit_sha,
     finding_title,phase,diagnosis_code,source_urls,independent_test_required,
     stage_repair_verified)
   values (v_rec.owner_id,v_rec.receipt_id,v_fp,v_rec.report_sha256,
    v_rec.source_commit_sha,v_title,'INVESTIGATION_ADMITTED_READ_ONLY',
    'RESEARCH_TO_INVESTIGATION_HANDOFF_MISSING',v_evidence,v_test,true)
   on conflict do nothing;
   get diagnostics v_ins=row_count;
   if v_ins<>1 then continue;end if;
   v_new:=v_new+1;
   insert into reality_internal.market_stage_events_v1
    (owner_id,receipt_id,finding_fingerprint,event_code,report_sha256)
   values(v_rec.owner_id,v_rec.receipt_id,v_fp,
    'RESEARCH_HANDOFF_ABSENT_DETECTED',v_rec.report_sha256),
    (v_rec.owner_id,v_rec.receipt_id,v_fp,
    'AUTO_REPAIRED_INVESTIGATION_HANDOFF',v_rec.report_sha256),
    (v_rec.owner_id,v_rec.receipt_id,v_fp,
    'INDEPENDENT_FAILURE_PROOF_STILL_REQUIRED',v_rec.report_sha256);
   -- Stage 2 is an independent *evidence-sufficiency* check, not an
   -- independent software test. It cannot claim a new capability gap.
   update reality_internal.market_stage_investigations_v1
   set phase='EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED',
       diagnosis_code='INDEPENDENT_FROZEN_FAILURE_PROOF_MISSING',
       updated_at=pg_catalog.now()
   where owner_id=v_rec.owner_id and receipt_id=v_rec.receipt_id
     and finding_fingerprint=v_fp and phase='INVESTIGATION_ADMITTED_READ_ONLY';
  end loop;
 end loop;
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','MARKET_STAGE_WATCHDOG_COMPLETE',
  'eligible_findings',v_count,'handoffs_recovered_this_tick',v_new,
  'installation_authorized',false,'executable_jobs_created',false,
  'production_changed',false);
end $fn$;
revoke all on function reality_internal.reconcile_market_stages_v1()
 from public,anon,authenticated;
grant execute on function reality_internal.reconcile_market_stages_v1()
 to service_role;

-- Explicitly bound to the owner verified by authenticated Reality Chat.
create or replace function public.reality_read_owner_market_stage_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare v_latest reality_internal.market_research_receipts_v1%rowtype;
 v_items jsonb:='[]'::jsonb;v_events jsonb:='[]'::jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MARKET_STAGE_OWNER_READBACK_PRIVILEGED';
 end if;
 select * into v_latest from reality_internal.market_research_receipts_v1
  where owner_id=p_owner_id order by created_at desc,receipt_id desc limit 1;
 if not found then
  return pg_catalog.jsonb_build_object('ok',true,'status','NO_SAVED_RESEARCH',
   'items',v_items,'events',v_events,'owner_id',p_owner_id,
   'read_only',true,'installation_authorized',false,
   'external_execution_authorized',false,'production_changed',false);
 end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'finding_fingerprint',x.finding_fingerprint,
   'title',x.finding_title,
   'phase',x.phase,
   'diagnosis_code',x.diagnosis_code,
   'next_action',x.next_action,
   'verified_missing_capability',false,
   'stage_repair_verified',x.stage_repair_verified,
   'owner_install_authorized',false,
   'source_commit_sha',x.source_commit_sha,
   'report_sha256',x.report_sha256,
   'investigation_started_at',x.created_at,
   'last_checked_at',x.updated_at) order by x.created_at,x.finding_fingerprint),
    '[]'::jsonb) into v_items
 from reality_internal.market_stage_investigations_v1 x
 where x.owner_id=p_owner_id and x.receipt_id=v_latest.receipt_id;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'event_id',e.event_id,
  'finding_fingerprint',e.finding_fingerprint,
  'event_code',e.event_code,
  'observed_at',e.observed_at) order by e.observed_at,e.event_id),
  '[]'::jsonb) into v_events
 from reality_internal.market_stage_events_v1 e
 where e.owner_id=p_owner_id and e.receipt_id=v_latest.receipt_id;
 return pg_catalog.jsonb_build_object('ok',true,
  'status',case when pg_catalog.jsonb_array_length(v_items)=0
    then 'RESEARCH_STALLED_NO_INVESTIGATION_HANDOFF'
    else 'AUTO_REPAIRED_RESEARCH_STAGE_HANDOFF' end,
  'owner_id',p_owner_id,
  'receipt_id',v_latest.receipt_id,'report_sha256',v_latest.report_sha256,
  'expected_findings',v_latest.candidate_count,
  'items',v_items,'events',v_events,
  'read_only',true,'stage_handoff_verified',
    pg_catalog.jsonb_array_length(v_items)=v_latest.candidate_count,
  'installation_authorized',false,'external_execution_authorized',false,
  'executable_job_created',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_market_stage_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_owner_market_stage_v1(uuid)
 to service_role;

-- Backfill the already-saved customer report without claiming any new model run.
select reality_internal.reconcile_market_stages_v1();
-- Independent of browser or sign-in. Reconciliation is bounded and idempotent.
select pg_catalog.cron.schedule(
 'reality-market-investigation-stage-watchdog-v1',
 '* * * * *',
 'select reality_internal.reconcile_market_stages_v1()'
);
