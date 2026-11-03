-- Automatic, evidence-bound pre-home capability assessments.
-- Runs on the already-established market-stage cron, not on browser login.
-- This ranks PROPOSALS only, never confirms or installs a capability.
create table if not exists reality_internal.market_finding_assessments_v1(
  owner_id uuid not null,
  receipt_id uuid not null,
  finding_fingerprint text not null check(finding_fingerprint ~ '^[a-f0-9]{64}$'),
  report_sha256 text not null check(report_sha256 ~ '^[a-f0-9]{64}$'),
  source_commit_sha text not null check(source_commit_sha ~ '^[a-f0-9]{40}$'),
  assessment jsonb not null check(pg_catalog.jsonb_typeof(assessment)='object'),
  assessment_sha256 text not null check(assessment_sha256 ~ '^[a-f0-9]{64}$'),
  assessed_at timestamptz not null default pg_catalog.now(),
  primary key(owner_id,receipt_id,finding_fingerprint),
  foreign key(owner_id,receipt_id,finding_fingerprint)
   references reality_internal.market_stage_investigations_v1
    (owner_id,receipt_id,finding_fingerprint)
);
alter table reality_internal.market_finding_assessments_v1 enable row level security;
revoke all on reality_internal.market_finding_assessments_v1 from public,anon,authenticated;
grant select,insert on reality_internal.market_finding_assessments_v1 to service_role;

create or replace function reality_internal.assess_saved_market_findings_v1()
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare
 row_record record;
 f jsonb;
 topic text; benefit text; tradeoff text; risk text; p1 text; p2 text; n1 text; n2 text;
 evaluation jsonb;
 generated int:=0;eligible int:=0;write_count int:=0;receipt_count int:=0;
begin
 if current_user not in ('postgres','service_role') then
  raise exception 'PREHOME_ASSESSMENT_PRIVILEGED_WORKER_REQUIRED';
 end if;
 -- Never let pre-home assessment promote unverified research to an executable job.
 for row_record in
  select i.owner_id,i.receipt_id,i.finding_fingerprint,i.report_sha256,
   i.source_commit_sha,i.phase,i.independent_test_required,
   r.report,r.candidate_count
  from reality_internal.market_stage_investigations_v1 i
  join reality_internal.market_research_receipts_v1 r
    on r.owner_id=i.owner_id and r.receipt_id=i.receipt_id
   and r.report_sha256=i.report_sha256 and r.source_commit_sha=i.source_commit_sha
  left join reality_internal.market_finding_assessments_v1 a
   on a.owner_id=i.owner_id and a.receipt_id=i.receipt_id
      and a.finding_fingerprint=i.finding_fingerprint
  where a.finding_fingerprint is null
   and r.created_at>pg_catalog.now()-interval '45 days'
   and i.stage_repair_verified=true
   and i.phase='EVIDENCE_INSPECTED_INDEPENDENT_TEST_REQUIRED'
   and i.verified_missing_capability=false and i.owner_install_authorized=false
   and i.executable_job_created=false and i.production_changed=false
   and r.report->>'version'='reality-market-intelligence-v1'
   and r.report->>'report_sha256'=r.report_sha256
   and r.report->>'installation_authorized'='false'
   and r.report->>'job_started'='false'
   and r.report->>'production_changed'='false'
   and r.candidate_count between 1 and 4
   and pg_catalog.jsonb_typeof(r.report->'findings')='array'
   and pg_catalog.jsonb_array_length(r.report->'findings')=r.candidate_count
  order by r.created_at desc, i.finding_fingerprint
  limit 120
 loop
  receipt_count:=receipt_count+1;
  select x.value into f
  from pg_catalog.jsonb_array_elements(row_record.report->'findings') x(value)
  where x.value->>'fingerprint'=row_record.finding_fingerprint
  limit 1;
  if f is null or f->>'status'<>'RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST'
   or f->>'sandbox_verified'<>'false'
   or f->>'installation_authorized'<>'false'
   or f->>'code_comparison'<>'SAMPLED_CODE_ONLY_NOT_PROVEN_ABSENT'
   or length(coalesce(f->>'proposed_improvement',''))<30
   or length(coalesce(f->>'falsification_test',''))<30
   or pg_catalog.jsonb_typeof(f->'evidence_urls')<>'array'
   or pg_catalog.jsonb_array_length(f->'evidence_urls')<1
  then continue;end if;
  eligible:=eligible+1;
  -- Reproducible semantic triage based on report content; future topics use
  -- a general fallback. Do not invent a benchmark, revenue, cost or pass.
  if (f->>'title') ~* '(repair|resum|self.heal)' then
   topic:='REPAIR_AND_RESUMPTION';
   benefit:='Potentially make repair safer and help Reality finish interrupted original work with independently linked evidence receipts';
   p1:='Keeps the original job, cause, frozen test and recovery outcome connected';
   p2:='Could reduce unsafe replay and false completion if independent tests pass';
   n1:='A timeout after an external write may be impossible to safely replay';
   n2:='Existing recovery controls may already address parts of this proposal';
   risk:='Duplicate external effects or misleading settlement if replay and receipts are not independently verified';
  elsif (f->>'title') ~* '(approval|connector|permission)' then
   topic:='CONNECTOR_APPROVAL_CONSISTENCY';
   benefit:='Potentially enforce the same owner and data-scope decisions across native and MCP connectors';
   p1:='Makes cross-connector authorization expectations inspectable';
   p2:='Could block inconsistent approval and field-level access across tools';
   n1:='Provider-specific API semantics may complicate one universal contract';
   n2:='Revoked access and changing permissions require repeated provider tests';
   risk:='One connector may still expose a prohibited effect or unauthorized data';
  elsif (f->>'title') ~* '(managed|agent|sandbox|execution)' then
   topic:='MANAGED_AGENT_EXECUTION';
   benefit:='Potentially reduce custom orchestration work through an isolated managed execution adapter';
   p1:='May simplify session recovery and sandbox management after a measured comparison';
   p2:='Can be evaluated behind Reality’s existing evidence and approval boundary';
   n1:='Adds dependency on provider runtime, pricing and execution semantics';
   n2:='Durable provider sessions are not evidence of safe original-job resumption';
   risk:='Managed recovery might duplicate effects, weaken auditability or bypass Reality’s independent verification';
  elsif (f->>'title') ~* '(budget|evaluation|runtime|cost)' then
   topic:='RUNTIME_EVALUATION_AND_BUDGET';
   benefit:='Potentially connect real usage and quality observations to governed pause or intervention decisions';
   p1:='Would make actual budget and quality regressions easier to audit';
   p2:='Could halt risky work when source-verified limits are exceeded';
   n1:='Instrumentation and provider telemetry may be incomplete or delayed';
   n2:='Aggressive interventions can interrupt legitimate work';
   risk:='A missing telemetry signal could cause unjustified success or let prohibited spending continue';
  else
   topic:='OTHER_RESEARCH_OPPORTUNITY';
   benefit:='Potential improvement described in the source-backed proposal; practical value requires an independent test';
   p1:='Contains a public source and a pinned code comparison to guide investigation';
   p2:='Includes a falsification test before any upgrade may be recommended';
   n1:='The code review was a bounded sample, not repository-wide evidence';
   n2:='Delivery effort, costs, and actual performance are unmeasured';
   risk:='The supposed improvement may already exist or may not work as proposed';
  end if;
  evaluation:=pg_catalog.jsonb_build_object(
    'status','PREHOME_INSPECTED_NEEDS_INDEPENDENT_TEST',
    'assessment_version','evidence-bound-prehome-v1',
    'method','DETERMINISTIC_SOURCE_GROUNDED_PRELIMINARY_TRIAGE',
    'topic',topic,
    'what_it_does',left(f->>'proposed_improvement',1200),
    'potential_customer_value',benefit,
    'pros',pg_catalog.jsonb_build_array(p1,p2),
    'cons',pg_catalog.jsonb_build_array(n1,n2),
    'risk',risk,
    'priority',case when topic='REPAIR_AND_RESUMPTION'
       then 'FIRST_TO_VERIFY' else 'REVIEW_AFTER_EVIDENCE' end,
    'why_priority',case when topic='REPAIR_AND_RESUMPTION'
       then 'Directly addresses Reality’s core repair-to-original-job promise, but is not verified as missing'
       else 'Not ranked by demonstrated ROI; first establish the actual missing capability' end,
    'estimated_business_value_usd',null,
    'estimated_time_saved_minutes',null,
    'engineering_effort','NOT_MEASURED',
    'ongoing_cost','NOT_MEASURED',
    'system_gap_verified',false,
    'independent_test_passed',false,
    'next_verification',left(row_record.independent_test_required,1200),
    'existing_reality_evidence',left(coalesce(f->>'reality_comparison',''),1200),
    'market_evidence',left(coalesce(f->>'market_claim',''),1200),
    'source_urls',f->'evidence_urls',
    'pinned_source_commit',row_record.source_commit_sha,
    'source_report_sha256',row_record.report_sha256,
    'repository_wide_audit',false,
    'code_install_authorized',false,
    'execution_started',false);
  insert into reality_internal.market_finding_assessments_v1
   (owner_id,receipt_id,finding_fingerprint,report_sha256,
    source_commit_sha,assessment,assessment_sha256)
  values(row_record.owner_id,row_record.receipt_id,row_record.finding_fingerprint,
    row_record.report_sha256,row_record.source_commit_sha,evaluation,
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(evaluation::text,'UTF8')),'hex'))
  on conflict do nothing;
  get diagnostics write_count=row_count;
  generated:=generated+write_count;
 end loop;
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','AUTONOMOUS_PREHOME_ASSESSMENTS_CHECKED',
  'eligible',eligible,'new_assessments',generated,
  'install_authorized',false,'production_changed',false);
end $fn$;
revoke all on function reality_internal.assess_saved_market_findings_v1()
 from public,anon,authenticated;
grant execute on function reality_internal.assess_saved_market_findings_v1() to service_role;

-- Extend the original read-only owner RPC, preserving its contract.
create or replace function public.reality_read_latest_owner_market_research_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare v reality_internal.market_research_receipts_v1%rowtype; v_findings jsonb;
begin
 if current_user<>'service_role' or p_owner_id is null then
  raise exception 'MARKET_RESEARCH_OWNER_SERVICE_ROLE_REQUIRED';
 end if;
 select * into v from reality_internal.market_research_receipts_v1
 where owner_id=p_owner_id order by created_at desc,receipt_id desc limit 1;
 if not found then return pg_catalog.jsonb_build_object(
    'ok',true,'status','NO_RESEARCH_RECEIPT','findings','[]'::jsonb,
    'verified_readback',true,'review_only',true,
    'installation_authorized',false,'job_started',false,'production_changed',false);
 end if;
 if v.report->>'version'<>'reality-market-intelligence-v1' or
    v.report->>'report_sha256'<>v.report_sha256 or
    v.report->>'installation_authorized'<>'false' or
    v.report->>'job_started'<>'false' or
    v.report->>'production_changed'<>'false' or
    pg_catalog.jsonb_typeof(v.report->'findings')<>'array' or
    pg_catalog.jsonb_array_length(v.report->'findings')<>v.candidate_count
 then raise exception 'MARKET_RESEARCH_PERSISTED_RECEIPT_INCONSISTENT';
 end if;
 select coalesce(pg_catalog.jsonb_agg(
    f.value || pg_catalog.jsonb_build_object(
      'prehome_assessment',case when a.report_sha256=v.report_sha256
        and a.source_commit_sha=v.source_commit_sha
        and a.assessment->>'status'='PREHOME_INSPECTED_NEEDS_INDEPENDENT_TEST'
        and a.assessment->>'code_install_authorized'='false'
        and a.assessment->>'execution_started'='false'
        and a.assessment->>'system_gap_verified'='false'
        and a.assessment_sha256=
         pg_catalog.encode(pg_catalog.sha256(
            pg_catalog.convert_to(a.assessment::text,'UTF8')),'hex')
       then a.assessment || pg_catalog.jsonb_build_object('assessment_receipt_sha256',a.assessment_sha256,
           'assessed_at',a.assessed_at)
       else pg_catalog.jsonb_build_object('status','AUTOMATIC_ASSESSMENT_PENDING',
        'system_gap_verified',false,'code_install_authorized',false)
       end
    ) order by f.ord),'[]'::jsonb) into v_findings
 from pg_catalog.jsonb_array_elements(v.report->'findings') with ordinality as f(value,ord)
 left join reality_internal.market_finding_assessments_v1 a
   on a.owner_id=v.owner_id and a.receipt_id=v.receipt_id
    and a.finding_fingerprint=f.value->>'fingerprint';
 return pg_catalog.jsonb_build_object(
  'ok',true,'status','GOVERNED_MARKET_RESEARCH_RECORDED',
  'receipt_id',v.receipt_id,'report_sha256',v.report_sha256,
  'recorded_at',v.created_at,'pinned_commit_sha',v.source_commit_sha,
  'researched_source_count',v.report->'search_source_count',
  'findings',v_findings,
  'assessed_count',(select count(*) from reality_internal.market_finding_assessments_v1 a
   where a.owner_id=v.owner_id and a.receipt_id=v.receipt_id),
  'verified_readback',true,'review_only',true,'installation_authorized',false,
  'job_started',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_latest_owner_market_research_v1(uuid)
 from public,anon,authenticated;
grant execute on function public.reality_read_latest_owner_market_research_v1(uuid) to service_role;

-- Single autonomously repeating research progression: stage THEN value inspection.
select cron.unschedule(jobid)
 from cron.job where jobname='reality-market-investigation-stage-watchdog-v1';
select cron.schedule(
 'reality-market-investigation-stage-watchdog-v1',
 '* * * * *',
 'select reality_internal.reconcile_market_stages_v1(); select reality_internal.assess_saved_market_findings_v1();'
);
-- Backfill the actual customer report before the home screen can load.
select reality_internal.assess_saved_market_findings_v1();
