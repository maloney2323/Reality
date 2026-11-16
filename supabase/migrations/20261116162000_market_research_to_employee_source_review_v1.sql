-- Reuse existing durable research assessments for initial SOURCE review ownership.
-- Morgan's review does not create executable originals, grant shift authority,
-- approve source promotion, or claim a repaired capability.
ALTER TABLE reality_internal.market_finding_assessments_v1
 ADD COLUMN IF NOT EXISTS research_review_employee text NOT NULL DEFAULT 'Morgan',
 ADD COLUMN IF NOT EXISTS research_review_status text NOT NULL
  DEFAULT 'SOURCE_FRESHNESS_AND_GAP_REVALIDATION_PENDING',
 ADD COLUMN IF NOT EXISTS research_review_assigned_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE reality_internal.market_finding_assessments_v1
 ADD CONSTRAINT market_finding_source_review_owner_v1
 CHECK (research_review_employee='Morgan' AND
        research_review_status='SOURCE_FRESHNESS_AND_GAP_REVALIDATION_PENDING');
-- Original proof hashes and dated research are retained unchanged.
CREATE OR REPLACE FUNCTION public.reality_read_latest_owner_market_research_v1(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      'employee_investigation',
       case when a.report_sha256=v.report_sha256
         and a.source_commit_sha=v.source_commit_sha
         and a.assessment->>'status'='PREHOME_INSPECTED_NEEDS_INDEPENDENT_TEST'
         and a.assessment->>'system_gap_verified'='false'
         and a.assessment->>'code_install_authorized'='false'
         and a.assessment_sha256=pg_catalog.encode(pg_catalog.sha256(
           pg_catalog.convert_to(a.assessment::text,'UTF8')),'hex')
         and a.research_review_employee='Morgan'
         and a.research_review_status='SOURCE_FRESHNESS_AND_GAP_REVALIDATION_PENDING'
        then pg_catalog.jsonb_build_object(
         'assignment_id','research-review:'||v.receipt_id::text||':'||
            (f.value->>'fingerprint'),
         'employee','Morgan',
         'status','SOURCE_FRESHNESS_AND_GAP_REVALIDATION_PENDING',
         'source_receipt_id',v.receipt_id,
         'assessment_receipt_sha256',a.assessment_sha256,
         'assigned_at',a.research_review_assigned_at,
         'next_proof',f.value->>'falsification_test',
         'research_only',true,'qualified_original_job',false,
         'execution_authorized',false,'installation_authorized',false,
         'job_started',false,'production_changed',false)
        else pg_catalog.jsonb_build_object(
         'status','RESEARCH_ASSESSMENT_NOT_VERIFIED',
         'qualified_original_job',false,'execution_authorized',false,
         'job_started',false,'installation_authorized',false,
         'production_changed',false)
       end,
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
end $function$;
