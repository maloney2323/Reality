-- Owner-only, read-only capability discovery category intake.
-- Automatically projects already-persisted market, provider-audit, candidate,
-- governed queue and settled evidence. No discovery can grant installation.
-- No new work is created. Only the genuine worker's independent frozen
-- reproduction may qualify a missing capability.
create or replace function public.reality_read_owner_capability_gap_feed_v1(p_owner_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare
  r reality_internal.market_research_receipts_v1%rowtype;
  market_item record;
  signal record;
  handoff record;
  work record;
  done record;
  a jsonb;
  item jsonb;
  active_items jsonb := '[]'::jsonb;
  settled_items jsonb := '[]'::jsonb;
  research_count integer := 0;
  observed_count integer := 0;
  tested_count integer := 0;
  queue_count integer := 0;
  verified_gap_count integer := 0;
begin
  if current_user <> 'service_role' or p_owner_id is null then
    raise exception 'GAP_FEED_OWNER_SERVICE_ROLE_REQUIRED';
  end if;
  select * into r
   from reality_internal.market_research_receipts_v1
   where owner_id=p_owner_id order by created_at desc,receipt_id desc limit 1;
  if found and r.report->>'version'='reality-market-intelligence-v1'
   and r.report->>'report_sha256'=r.report_sha256
   and r.report->>'installation_authorized'='false'
   and r.report->>'job_started'='false'
   and r.report->>'production_changed'='false'
   and pg_catalog.jsonb_typeof(r.report->'findings')='array'
   and pg_catalog.jsonb_array_length(r.report->'findings')=r.candidate_count
   and r.candidate_count between 1 and 4 then
   for market_item in
    select f.value as finding,a.assessment,a.assessment_sha256,a.assessed_at
    from pg_catalog.jsonb_array_elements(r.report->'findings') f(value)
    join reality_internal.market_finding_assessments_v1 a
     on a.owner_id=p_owner_id and a.receipt_id=r.receipt_id
      and a.finding_fingerprint=f.value->>'fingerprint'
      and a.report_sha256=r.report_sha256
      and a.source_commit_sha=r.source_commit_sha
    where f.value->>'status'='RESEARCH_HYPOTHESIS_NEEDS_INDEPENDENT_TEST'
      and f.value->>'sandbox_verified'='false'
      and f.value->>'installation_authorized'='false'
      and f.value->>'code_comparison'='SAMPLED_CODE_ONLY_NOT_PROVEN_ABSENT'
   loop
    a:=market_item.assessment;
    if a->>'status'<>'PREHOME_INSPECTED_NEEDS_INDEPENDENT_TEST'
     or a->>'system_gap_verified'<>'false'
     or a->>'independent_test_passed'<>'false'
     or a->>'code_install_authorized'<>'false'
     or a->>'execution_started'<>'false'
     or a->>'source_report_sha256'<>r.report_sha256
     or a->>'pinned_source_commit'<>r.source_commit_sha
     or market_item.assessment_sha256 <>
       pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(a::text,'UTF8')),'hex')
     or pg_catalog.jsonb_typeof(a->'pros')<>'array'
     or pg_catalog.jsonb_typeof(a->'cons')<>'array'
     or length(coalesce(market_item.finding->>'title',''))<8
     or (market_item.finding->>'fingerprint') !~ '^[a-f0-9]{64}$'
    then continue; end if;
    research_count:=research_count+1;
    item:=pg_catalog.jsonb_build_object(
      'key','research:'||(market_item.finding->>'fingerprint'),
      'kind','RESEARCH_OPPORTUNITY',
      'stage','INSPECTED_NEEDS_INDEPENDENT_GAP_TEST',
      'title',left(market_item.finding->>'title',180),
      'what_it_does',left(coalesce(a->>'what_it_does',''),1100),
      'potential_value',left(coalesce(a->>'potential_customer_value',''),700),
      'pros',a->'pros','cons',a->'cons',
      'risk',left(coalesce(a->>'risk',''),700),
      'next_proof',left(coalesce(a->>'next_verification',''),1100),
      'priority',case when a->>'priority'='FIRST_TO_VERIFY' then 2 else 5 end,
      'source_url',market_item.finding->'evidence_urls'->>0,
      'source_receipt',r.receipt_id,
      'source_sha256',r.report_sha256,
      'last_seen_at',market_item.assessed_at,
      'verified_missing_capability',false,
      'candidate_independently_tested',false,
      'owner_approval_needed',false,
      'installation_authorized',false,
      'executable_job',false);
    active_items:=active_items||pg_catalog.jsonb_build_array(item);
   end loop;
  end if;

  -- One source-backed CI failure audit is not the same as a missing
  -- capability. Never elevate provider-audit metadata into a repair job.
  for signal in
   select * from reality_internal.capability_discovery_audit_sightings_v1
   where owner_id=p_owner_id and kind='REPEATED_CI_FAILURE'
     and last_seen_at>pg_catalog.now()-interval '7 days'
     and fingerprint ~ '^[a-f0-9]{64}$'
     and evidence_url ~ '^https://github[.]com/maloney2323/Reality/actions/runs/[1-9][0-9]*$'
   order by last_seen_at desc limit 8
  loop
    observed_count:=observed_count+1;
    item:=pg_catalog.jsonb_build_object(
     'key','ci:'||signal.fingerprint,'kind','CI_FAILURE_INVESTIGATION',
     'stage','OBSERVED_PROVIDER_FAILURE_ROOT_CAUSE_UNKNOWN',
     'title','Investigate source-observed Reality CI failures',
     'what_it_does','Find and fix the underlying failure only if a current independent reproduction confirms it.',
     'potential_value','Could restore reliable verification and reduce repeated failed checks.',
     'pros',pg_catalog.jsonb_build_array(
       'Based on a recorded provider workflow observation',
       'Can be tested against fresh frozen CI runs'),
     'cons',pg_catalog.jsonb_build_array(
       'The original audit can become stale after a later passing run',
       'CI failure does not establish a missing capability'),
     'risk','Re-running or altering the wrong job can mask a legitimate acceptance failure.',
     'next_proof','Read latest provider runs, reproduce the failure, distinguish intentional red acceptance from an outstanding defect, and reconcile previously settled work.',
     'priority',3,'source_url',signal.evidence_url,
     'source_receipt',signal.fingerprint,
     'last_seen_at',signal.last_seen_at,
     'observation_count',signal.observation_count,
     'verified_missing_capability',false,
     'candidate_independently_tested',false,
     'owner_approval_needed',false,
     'installation_authorized',false,'executable_job',false);
    active_items:=active_items||pg_catalog.jsonb_build_array(item);
  end loop;

  -- Independent tests can verify a candidate *artifact*, while installation
  -- still needs a fresh active owner-work binding and explicit approval.
  for handoff in
   select h.*,release.verified_checks,release.provider_run_id,
    release.report as proof_report
   from reality_internal.verified_candidate_handoffs_v1 h
   join reality_internal.verified_capability_receipt_releases_v1 release
     on release.receipt_id=h.receipt_id
    and release.source_issue=h.source_issue
    and release.report->>'source_sha256'=h.candidate_sha256
    and release.report->>'status'='INDEPENDENT_SOURCE_CANDIDATE_PASSED'
    and release.report->>'installation_performed'='false'
    and release.report->>'production_changed'='false'
    and release.verified_checks between 1 and 500
   where h.owner_id=p_owner_id
    and h.phase='AWAITING_FRESH_OWNER_WORK_BINDING'
    and h.owner_install_authorized=false
    and h.original_job_completed=false and h.production_changed=false
    and h.candidate_sha256 ~ '^[a-f0-9]{64}$'
    and h.source_issue>0
    and not exists(
     select 1 from reality_internal.genuine_capability_queue_v1 q
     where q.owner_id=h.owner_id
      and q.original_work_id=h.historical_original_work_id
      and q.phase='SETTLED_ISOLATED')
   order by h.created_at desc limit 6
  loop
    tested_count:=tested_count+1;
    item:=pg_catalog.jsonb_build_object(
     'key','candidate:'||handoff.candidate_sha256,
     'kind','INDEPENDENTLY_TESTED_CANDIDATE',
     'stage','TESTED_AWAITING_FRESH_OWNER_WORK_BINDING',
     'title','Independently tested repair candidate · issue #'||handoff.source_issue,
     'what_it_does','An existing candidate passed '||handoff.verified_checks||
       ' independent source checks. Reality must attach it to a current owner-authorized job before considering installation.',
     'potential_value','May avoid regenerating a candidate for an equivalent verified failure; savings not measured.',
     'pros',pg_catalog.jsonb_build_array(
       'Independent verification result and source hash are preserved',
       'A tested artifact can be reviewed against a fresh original job'),
     'cons',pg_catalog.jsonb_build_array(
       'The previous job is historical, not permission to install now',
       'The current environment and matching failure still require new verification'),
     'risk','Historical tests cannot justify installation into a different job or environment.',
     'next_proof','Verify the current goal, fresh original work, provider status, artifact hash and frozen regression; then request exact owner approval.',
     'priority',1,'source_url',
        'https://github.com/maloney2323/Reality/issues/'||handoff.source_issue,
     'source_receipt',handoff.receipt_id,
     'source_sha256',handoff.candidate_sha256,
     'last_seen_at',handoff.created_at,
     'verified_test_count',handoff.verified_checks,
     'verified_missing_capability',false,
     'candidate_independently_tested',true,
     'owner_approval_needed',true,
     'installation_authorized',false,'executable_job',false);
    active_items:=active_items||pg_catalog.jsonb_build_array(item);
  end loop;

  -- Only genuine original-job queue entries can say "verified gap" when a
  -- matching independent frozen reproduction receipt is durably present.
  for work in
   select q.* from reality_internal.genuine_capability_queue_v1 q
   where q.owner_id=p_owner_id
    and q.phase in ('PENDING_FROZEN_REPRODUCTION',
     'LEASED_FOR_INDEPENDENT_REPRODUCTION',
     'FROZEN_REPRODUCED_AWAITING_CANDIDATE',
     'AWAITING_OWNER_APPROVAL','AWAITING_INSTALLATION_APPROVAL')
   order by q.updated_at desc limit 12
  loop
    queue_count:=queue_count+1;
    if work.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
      and work.verified_frozen_reproduction->>'original_work_id'=work.original_work_id
      and work.verified_frozen_reproduction->>'frozen_sha256'=
       pg_catalog.replace(work.frozen_suite_ref,'github:frozen-regression:sha256:','')
    then verified_gap_count:=verified_gap_count+1;end if;
    item:=pg_catalog.jsonb_build_object(
     'key','queue:'||work.trigger_id,
     'kind','GOVERNED_ORIGINAL_JOB_GAP',
     'stage',work.phase,
     'title','Original job capability need · '||left(work.capability_id,90),
     'what_it_does','Existing governed repair worker is processing a source-backed original job.',
     'potential_value','Outcome and savings are not verified until the same job is settled.',
     'pros',pg_catalog.jsonb_build_array('Original work and goal IDs are preserved','Independent frozen tests gate new model generation'),
     'cons',pg_catalog.jsonb_build_array('A failed frozen test alone is not permission to install','Provider effects and original authorization must remain reconciled'),
     'risk','Installation without exact owner consent or after uncertain provider effects is prohibited.',
     'next_proof','Continue existing governed worker; require independently verified candidate and separate owner approval before isolated installation.',
     'priority',0,
     'source_url',case when work.source_ref ~ '^https://github[.]com/maloney2323/Reality/actions/runs/[1-9][0-9]*$'
        then work.source_ref else null end,
     'source_receipt',work.gap_event_id,
     'source_sha256',work.provider_failure_hash,
     'last_seen_at',work.updated_at,
     'verified_missing_capability',
       work.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'
       and work.verified_frozen_reproduction->>'original_work_id'=work.original_work_id
       and work.verified_frozen_reproduction->>'frozen_sha256'=
        pg_catalog.replace(work.frozen_suite_ref,'github:frozen-regression:sha256:',''),
     'candidate_independently_tested',work.qualification_receipt is not null,
     'owner_approval_needed',work.phase='AWAITING_OWNER_APPROVAL',
     'installation_authorized',false,'executable_job',false);
    active_items:=active_items||pg_catalog.jsonb_build_array(item);
  end loop;

  -- Verified historic installs appear in a separate completed section;
  -- they must never inflate the NEW gap or pending approval counts.
  for done in
   select q.trigger_id,q.original_work_id,q.capability_id,q.updated_at,
     a.installed_commit_sha,a.settlement_receipt,a.install_branch
   from reality_internal.genuine_capability_queue_v1 q
   join reality_internal.genuine_preview_install_approvals_v1 a
    on a.trigger_id=q.trigger_id and a.owner_id=q.owner_id
     and a.original_work_id=q.original_work_id
   where q.owner_id=p_owner_id and q.phase='SETTLED_ISOLATED'
     and a.installed_commit_sha ~ '^[a-f0-9]{40}$'
     and a.settlement_receipt->>'status'='SETTLED_ISOLATED'
     and a.settlement_receipt->>'original_work_id'=q.original_work_id
     and a.settlement_receipt->>'installed_commit_sha'=a.installed_commit_sha
     and a.settlement_receipt->>'independent_outcome_verified'='true'
     and a.settlement_receipt->>'original_job_completed'='true'
     and a.settlement_receipt->>'production_changed'='false'
   order by q.updated_at desc limit 12
  loop
    settled_items:=settled_items||pg_catalog.jsonb_build_array(
     pg_catalog.jsonb_build_object(
      'key','settled:'||done.trigger_id,
      'title','Previously completed · '||left(done.capability_id,90),
      'stage','SETTLED_ISOLATED','source_commit',done.installed_commit_sha,
      'source_url','https://github.com/maloney2323/Reality/commit/'||
       done.installed_commit_sha,
      'original_work_id',done.original_work_id,
      'verified_missing_capability',false,
      'historical_settlement_verified',true,
      'installation_authorized',false,'new_installation_authorized',false,
      'updated_at',done.updated_at));
  end loop;

  if pg_catalog.jsonb_array_length(active_items)>30 then
    raise exception 'GAP_FEED_BOUNDED_RESULT_REQUIRED';
  end if;
  return pg_catalog.jsonb_build_object(
   'ok',true,'status','OWNER_GAP_INTAKE_RECONCILED',
   'owner_id',p_owner_id,
   'items',active_items,
   'settled_history',settled_items,
   'counts',pg_catalog.jsonb_build_object(
     'current_candidates',pg_catalog.jsonb_array_length(active_items),
     'research_assessed',research_count,
     'provider_failures_to_investigate',observed_count,
     'independently_tested_candidates',tested_count,
     'governed_active_queue',queue_count,
     'verified_current_gaps',verified_gap_count,
     'historical_completed',pg_catalog.jsonb_array_length(settled_items)),
   'source_basis','PERSISTED_OWNER_EVIDENCE_NO_PROVIDER_LIVE_REFRESH',
   'read_only',true,'installation_authorized',false,
   'work_started',false,'production_changed',false);
end $fn$;
revoke all on function public.reality_read_owner_capability_gap_feed_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.reality_read_owner_capability_gap_feed_v1(uuid)
  to service_role;
