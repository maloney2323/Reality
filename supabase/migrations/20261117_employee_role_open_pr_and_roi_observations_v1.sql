-- Add read-only role-oriented PR evidence and a verified missing-ROI
-- investigation to the existing 8-role discovery queue. No Stripe calls.
ALTER TABLE reality_internal.employee_discovery_observations_v1
 DROP CONSTRAINT employee_discovery_observations_v1_source_family_check;
ALTER TABLE reality_internal.employee_discovery_observations_v1
 ADD CONSTRAINT employee_discovery_observations_v1_source_family_check
 CHECK(source_family IN('GITHUB_ISSUE','GITHUB_PULL_REQUEST',
   'MARKET_ASSESSMENT','CAPABILITY_AUDIT','ROI_EVIDENCE_GAP'));
CREATE OR REPLACE FUNCTION public.reality_refresh_employee_discovery_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_snapshot reality_internal.next_week_employee_source_snapshots_v1%rowtype;
 v_scan_id uuid:=gen_random_uuid();
 v_owner uuid;
 v_issue jsonb;
 v_role text;
 v_url text;
 v_identity text;
 v_title text;
 v_status text;
 v_count integer:=0;
 v_owners integer:=0;
 v_now timestamptz:=clock_timestamp();
 v_settled boolean;
BEGIN
 IF current_user<>'service_role' THEN RAISE EXCEPTION 'EMPLOYEE_DISCOVERY_SERVICE_ONLY';END IF;
 SELECT * INTO v_snapshot FROM reality_internal.next_week_employee_source_snapshots_v1
 ORDER BY prepared_at DESC LIMIT 1;
 IF NOT FOUND OR v_snapshot.source_scope<>'maloney2323/Reality'
  OR v_snapshot.source_complete IS DISTINCT FROM true
  OR v_snapshot.shift_execution_authorized IS DISTINCT FROM false
  OR v_snapshot.installation_authorized IS DISTINCT FROM false
  OR v_snapshot.production_changed IS DISTINCT FROM false
  OR v_snapshot.prepared_at<v_now-interval '9 hours'
  OR v_snapshot.source_sha256!~'^[a-f0-9]{64}$'
  OR jsonb_typeof(v_snapshot.open_issues)<>'array'
  OR jsonb_array_length(v_snapshot.open_issues)<>v_snapshot.open_issue_count
  OR v_snapshot.open_issue_count>150
 THEN RAISE EXCEPTION 'EMPLOYEE_DISCOVERY_CURRENT_SOURCE_SCOPE_UNVERIFIED';END IF;
 -- A tenant must have an earlier owner-authorized shift of this exact
 -- platform. Never derive an owner from a model response or JWT metadata.
 FOR v_owner IN
  SELECT DISTINCT owner_id FROM reality_internal.governed_employee_shifts_v1
  WHERE authorized_at IS NOT NULL AND owner_id IS NOT NULL
 LOOP
  v_owners:=v_owners+1;
  IF v_owners>20 THEN RAISE EXCEPTION 'EMPLOYEE_DISCOVERY_OWNER_SCOPE_TOO_BROAD';END IF;
  FOR v_issue IN SELECT value FROM jsonb_array_elements(v_snapshot.open_issues)
  LOOP
   v_role:=v_issue #>> '{qualification,employee}';
   v_url:=v_issue->>'issue_url';
   v_status:=v_issue #>> '{qualification,status}';
   v_title:=v_issue->>'title';
   IF v_role NOT IN ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')
      OR v_url IS NULL OR
      v_url!~'^https://github[.]com/maloney2323/Reality/issues/[1-9][0-9]{0,7}$'
      OR (v_issue->>'issue_number')!~'^[1-9][0-9]{0,7}$'
      OR v_url<>'https://github.com/maloney2323/Reality/issues/'||
         (v_issue->>'issue_number')
      OR v_status NOT IN ('CURRENT_FAILURE_REPRODUCTION_REQUIRED',
       'SOURCE_REVIEW_NEEDS_CURRENT_PROOF','CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
       'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
       'PRIOR_ORIGINAL_SETTLED_NO_REPLAY')
      OR coalesce(v_issue #>> '{qualification,execution_authorized}','true')<>'false'
      OR coalesce(v_issue #>> '{qualification,installation_authorized}','true')<>'false'
      OR coalesce(v_issue #>> '{qualification,verified_current_defect}','true')<>'false'
      OR length(coalesce(v_title,'')) NOT BETWEEN 1 AND 240
   THEN RAISE EXCEPTION 'EMPLOYEE_DISCOVERY_SOURCE_ITEM_UNVERIFIED';END IF;
   SELECT
    EXISTS(SELECT 1 FROM reality_internal.riley_native_independent_final_receipts_v1 r
      WHERE r.owner_id=v_owner AND r.source_ref=v_url
      AND r.production_changed=false)
    OR EXISTS(SELECT 1 FROM reality_internal.governed_original_independent_final_receipts_v1 r
      WHERE r.owner_id=v_owner AND r.source_ref=v_url AND r.outcome='SUCCEEDED'
       AND r.production_changed=false)
    OR EXISTS(SELECT 1 FROM reality_internal.riley_commit_reference_triage_originals_v1 t
      WHERE t.owner_id=v_owner AND t.source_ref=v_url AND t.phase='SETTLED'
       AND t.final_receipt_id IS NOT NULL AND t.production_changed=false)
    OR EXISTS(SELECT 1 FROM reality_internal.riley_shift_failure_triage_v1 t
      WHERE t.owner_id=v_owner AND t.source_ref=v_url AND t.phase='SETTLED'
       AND t.settlement_receipt_id IS NOT NULL AND t.provider_comment_id>0
       AND t.provider_comment_url=v_url||'#issuecomment-'||t.provider_comment_id::text
       AND t.provider_body_sha256~'^sha256:[a-f0-9]{64}$'
       AND t.settled_at IS NOT NULL)
    INTO v_settled;
   v_identity:='github:issue:'||(v_issue->>'issue_number');
   INSERT INTO reality_internal.employee_discovery_observations_v1(
    owner_id,source_identity,employee,source_family,source_ref,
    evidence_sha256,title,disposition,source_observed_at,last_reconciled_at,last_scan_id)
   VALUES(v_owner,v_identity,v_role,'GITHUB_ISSUE',v_url,
    'sha256:'||v_snapshot.source_sha256,v_title,
    CASE WHEN v_status='PRIOR_ORIGINAL_SETTLED_NO_REPLAY' OR v_settled
     THEN 'SETTLED_NO_REPLAY'
     ELSE 'NEEDS_CURRENT_VALIDATION' END,
    v_snapshot.prepared_at,v_now,v_scan_id)
   ON CONFLICT(owner_id,source_identity) DO UPDATE SET
    employee=excluded.employee,source_ref=excluded.source_ref,
    evidence_sha256=excluded.evidence_sha256,title=excluded.title,
    disposition=excluded.disposition,source_observed_at=excluded.source_observed_at,
    last_reconciled_at=excluded.last_reconciled_at,last_scan_id=excluded.last_scan_id;
   v_count:=v_count+1;
  END LOOP;
  -- Morgan's market research is real but currently historic. A saved
  -- assessment is not a fresh market fact or an authorized campaign.
  INSERT INTO reality_internal.employee_discovery_observations_v1(
   owner_id,source_identity,employee,source_family,source_ref,
   evidence_sha256,title,disposition,source_observed_at,last_reconciled_at,last_scan_id)
  SELECT a.owner_id,'market:'||a.finding_fingerprint,'Morgan','MARKET_ASSESSMENT',
   'supabase:market_finding_assessments_v1:'||a.finding_fingerprint,
   'sha256:'||a.assessment_sha256,
   left('Revalidate market research · '||
    coalesce(nullif(a.assessment->>'topic',''),'Unclassified research'),240),
   'HISTORICAL_REVALIDATION_REQUIRED',a.assessed_at,v_now,v_scan_id
  FROM reality_internal.market_finding_assessments_v1 a
  JOIN reality_internal.market_research_receipts_v1 r
   ON r.receipt_id=a.receipt_id AND r.owner_id=a.owner_id
    AND r.report_sha256=a.report_sha256
  WHERE a.owner_id=v_owner AND a.research_review_employee='Morgan'
   AND a.research_review_status='SOURCE_FRESHNESS_AND_GAP_REVALIDATION_PENDING'
   AND a.finding_fingerprint~'^[a-f0-9]{64}$'
   AND a.assessment_sha256~'^[a-f0-9]{64}$'
   AND a.assessed_at IS NOT NULL
  ON CONFLICT(owner_id,source_identity) DO UPDATE SET
   employee=excluded.employee,source_ref=excluded.source_ref,
   evidence_sha256=excluded.evidence_sha256,title=excluded.title,
   disposition=excluded.disposition,source_observed_at=excluded.source_observed_at,
   last_reconciled_at=excluded.last_reconciled_at,last_scan_id=excluded.last_scan_id;
  -- Quinn inspects a saved capability audit, but provider failures require
  -- new independent reproduction before they qualify as current work.
  INSERT INTO reality_internal.employee_discovery_observations_v1(
   owner_id,source_identity,employee,source_family,source_ref,
   evidence_sha256,title,disposition,source_observed_at,last_reconciled_at,last_scan_id)
  SELECT c.owner_id,'capability:'||c.fingerprint,'Quinn','CAPABILITY_AUDIT',
   c.evidence_url,'sha256:'||c.fingerprint,
   left('Revalidate capability audit · '||c.kind,240),
   'HISTORICAL_REVALIDATION_REQUIRED',c.last_seen_at,v_now,v_scan_id
  FROM reality_internal.capability_discovery_audit_sightings_v1 c
  WHERE c.owner_id=v_owner AND c.fingerprint~'^[a-f0-9]{64}$'
   AND c.evidence_url~'^https://github[.]com/maloney2323/Reality/actions/runs/[1-9][0-9]*$'
   AND c.last_seen_at IS NOT NULL AND c.kind IS NOT NULL
  ON CONFLICT(owner_id,source_identity) DO UPDATE SET
   employee=excluded.employee,source_ref=excluded.source_ref,
   evidence_sha256=excluded.evidence_sha256,title=excluded.title,
   disposition=excluded.disposition,source_observed_at=excluded.source_observed_at,
   last_reconciled_at=excluded.last_reconciled_at,last_scan_id=excluded.last_scan_id;
  -- Sage: independently settled receipts with ROI=NOT_MEASURED are
  -- evidence-backed finance investigations, not permission to touch billing.
  INSERT INTO reality_internal.employee_discovery_observations_v1(
   owner_id,source_identity,employee,source_family,source_ref,
   evidence_sha256,title,disposition,source_observed_at,
   last_reconciled_at,last_scan_id)
  SELECT f.owner_id,'roi-gap:'||f.receipt_id::text,'Sage','ROI_EVIDENCE_GAP',
   'supabase:governed_original_independent_final_receipts_v1:'||f.receipt_id::text,
   f.final_evidence_sha256,
   left('Measure actual labor baseline and automation cost for independently settled original '||
    f.original_work_id,240),
   'NEEDS_CURRENT_VALIDATION',f.recorded_at,v_now,v_scan_id
  FROM reality_internal.governed_original_independent_final_receipts_v1 f
  WHERE f.owner_id=v_owner AND f.outcome='SUCCEEDED'
   AND f.roi_verification_status='NOT_MEASURED'
   AND f.final_evidence_sha256~'^sha256:[a-f0-9]{64}$'
   AND f.production_changed=false AND f.recorded_at IS NOT NULL
  ORDER BY f.recorded_at DESC LIMIT 10
  ON CONFLICT(owner_id,source_identity) DO UPDATE SET
   evidence_sha256=excluded.evidence_sha256,title=excluded.title,
   disposition=excluded.disposition,source_observed_at=excluded.source_observed_at,
   last_reconciled_at=excluded.last_reconciled_at,last_scan_id=excluded.last_scan_id;
  -- Keep older evidence but explicitly retire it from the current queue.
  UPDATE reality_internal.employee_discovery_observations_v1 o
   SET disposition='SOURCE_NO_LONGER_CURRENT',last_reconciled_at=v_now
   WHERE o.owner_id=v_owner AND o.last_scan_id<>v_scan_id
    AND o.disposition<>'SOURCE_NO_LONGER_CURRENT';
  INSERT INTO reality_internal.employee_discovery_role_coverage_v1(
   owner_id,employee,last_scan_id,checked_at,candidate_source_count,
   historical_source_count,settled_source_count,coverage_state,last_evidence_at)
  SELECT v_owner,n.employee,v_scan_id,v_now,
   count(o.source_identity) FILTER(WHERE o.disposition='NEEDS_CURRENT_VALIDATION'),
   count(o.source_identity) FILTER(
    WHERE o.disposition='HISTORICAL_REVALIDATION_REQUIRED'),
   count(o.source_identity) FILTER(WHERE o.disposition='SETTLED_NO_REPLAY'),
   CASE WHEN count(o.source_identity) FILTER(
      WHERE o.disposition='NEEDS_CURRENT_VALIDATION')>0
      THEN 'CURRENT_PROOF_REQUIRED'
    WHEN count(o.source_identity) FILTER(
      WHERE o.disposition='HISTORICAL_REVALIDATION_REQUIRED')>0
      THEN 'HISTORICAL_SOURCES_REQUIRE_REFRESH'
    ELSE 'NO_CONNECTED_ROLE_SOURCE_EVIDENCE' END,
   max(o.source_observed_at) FILTER(
    WHERE o.disposition<>'SOURCE_NO_LONGER_CURRENT')
  FROM unnest(ARRAY['Avery','Riley','Quinn','Taylor',
     'Casey','Morgan','Jordan','Sage']) AS n(employee)
  LEFT JOIN reality_internal.employee_discovery_observations_v1 o
   ON o.owner_id=v_owner AND o.employee=n.employee
    AND o.last_scan_id=v_scan_id
  GROUP BY n.employee
  ON CONFLICT(owner_id,employee) DO UPDATE SET
   last_scan_id=excluded.last_scan_id,checked_at=excluded.checked_at,
   candidate_source_count=excluded.candidate_source_count,
   historical_source_count=excluded.historical_source_count,
   settled_source_count=excluded.settled_source_count,
   coverage_state=excluded.coverage_state,last_evidence_at=excluded.last_evidence_at;
 END LOOP;
 RETURN jsonb_build_object('status','EMPLOYEE_DISCOVERY_OBSERVATIONS_SAVED',
  'scan_id',v_scan_id,'owners_scanned',v_owners,
  'source_issues_inspected',v_snapshot.open_issue_count,
  'owner_issue_observations',v_count,
  'qualified_executable_jobs',0,'shift_authorized',false,
  'installation_authorized',false,'production_changed',false);
END $function$;

CREATE OR REPLACE FUNCTION public.reality_record_employee_pr_discovery_v1(
 p_scan_id uuid,p_source_sha256 text,p_prs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_now timestamptz:=clock_timestamp();
 v_owner uuid;v_owners int:=0;v_added int:=0;v_pr_count int;
 v_matched int;
BEGIN
 IF current_user<>'service_role' OR p_scan_id IS NULL
  OR p_source_sha256!~'^[a-f0-9]{64}$' THEN
  RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_SERVICE_SCOPE_REQUIRED';
 END IF;
 IF jsonb_typeof(p_prs)<>'array' THEN RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_ARRAY_REQUIRED';END IF;
 v_pr_count:=jsonb_array_length(p_prs);
 IF v_pr_count>180 THEN RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_SOURCE_BOUND_EXCEEDED';END IF;
 -- A scan is formed by the existing signed planner, not by an unauthenticated
 -- UI request or a model response. All eight row IDs must match the exact scan.
 IF (SELECT count(*) FROM reality_internal.employee_discovery_role_coverage_v1
     WHERE last_scan_id=p_scan_id)<>8 THEN
  RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_FROZEN_SCAN_UNVERIFIED';
 END IF;
 IF EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_prs) pr
  WHERE jsonb_typeof(pr)<>'object'
   OR coalesce(pr->>'state','')<>'open'
   OR coalesce(pr->>'draft','') NOT IN ('true','false')
   OR coalesce(pr->>'number','')!~'^[1-9][0-9]{0,7}$'
   OR pr->>'html_url' <>
    'https://github.com/maloney2323/Reality/pull/'||(pr->>'number')
   OR length(coalesce(pr->>'title','')) NOT BETWEEN 1 AND 220
   OR coalesce(pr->>'updated_at','')!~
     '^20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$'
 ) OR (SELECT count(*) FROM jsonb_array_elements(p_prs))<>
  (SELECT count(DISTINCT pr->>'number') FROM jsonb_array_elements(p_prs) pr)
 THEN RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_PROVIDER_ITEMS_UNVERIFIED';END IF;
 FOR v_owner IN
  SELECT DISTINCT owner_id FROM reality_internal.employee_discovery_role_coverage_v1
  WHERE last_scan_id=p_scan_id
 LOOP
  v_owners:=v_owners+1;
  IF v_owners>20 OR
   (SELECT count(*) FROM reality_internal.employee_discovery_role_coverage_v1
    WHERE owner_id=v_owner AND last_scan_id=p_scan_id)<>8
  THEN RAISE EXCEPTION 'EMPLOYEE_PR_DISCOVERY_OWNER_COVERAGE_UNVERIFIED';END IF;
  WITH provider AS(
   SELECT (pr->>'number')::int n,pr->>'title' title,
    pr->>'html_url' url,(pr->>'updated_at')::timestamptz updated_at
   FROM jsonb_array_elements(p_prs) pr
  ), routes AS(
   SELECT * FROM (VALUES
    ('Avery'::text,
     'product|strateg|business|workforce|customer|market|goal|prioriti|roadmap|home|value'::text,
     'Product strategy review'::text),
    ('Casey','mobile|design|interface|(^|[^a-z])(ui|ux)([^a-z]|$)|chat|home|onboard|screen|scroll|workspace',
     'Product experience review'),
    ('Jordan','customer|onboard|signup|sales|follow.?up|experience|support|what finished|communicat|value',
     'Customer experience review'),
    ('Morgan','marketing|brand|position|landing|website|market|compet|story|growth|customer value|economic dashboard',
     'Marketing claim and audience review'),
    ('Sage','cost|budget|financ|wage|roi|quota|billing|value|savings|pricing|spend|economic',
     'Cost and value evidence review'),
    ('Riley','repair|bug|fix|upgrade|code|capability|software|self.repair|integration',
     'Software implementation review'),
    ('Quinn','security|verification|verifier|test|regression|governance|guard|ci|evidence|independent',
     'Quality and verification review'),
    ('Taylor','worker|shift|scheduler|trigger|automation|deploy|handoff|operation|recovery',
     'Operations execution review')
   ) v(employee,pattern,label)
  ), ranked AS(
   SELECT p.*,r.employee,r.label,
    row_number() OVER(PARTITION BY r.employee
     ORDER BY p.updated_at DESC,p.n DESC) rn
   FROM provider p JOIN routes r ON p.title~*r.pattern
   WHERE p.updated_at<=v_now+interval '1 day'
  )
  INSERT INTO reality_internal.employee_discovery_observations_v1(
   owner_id,source_identity,employee,source_family,source_ref,
   evidence_sha256,title,disposition,source_observed_at,
   last_reconciled_at,last_scan_id)
  SELECT v_owner,'github:pr:'||q.n::text||':role:'||q.employee,
   q.employee,'GITHUB_PULL_REQUEST',q.url,
   'sha256:'||p_source_sha256,
   left(q.label||' · PR #'||q.n::text||': '||q.title,240),
   CASE WHEN q.updated_at<v_now-interval '35 days'
    THEN 'HISTORICAL_REVALIDATION_REQUIRED'
    ELSE 'NEEDS_CURRENT_VALIDATION' END,
   q.updated_at,v_now,p_scan_id
  FROM ranked q WHERE q.rn<=5
  ON CONFLICT(owner_id,source_identity) DO UPDATE SET
   source_ref=excluded.source_ref,evidence_sha256=excluded.evidence_sha256,
   title=excluded.title,disposition=excluded.disposition,
   source_observed_at=excluded.source_observed_at,
   last_reconciled_at=excluded.last_reconciled_at,last_scan_id=excluded.last_scan_id;
  GET DIAGNOSTICS v_matched=ROW_COUNT;
  v_added:=v_added+v_matched;
  INSERT INTO reality_internal.employee_discovery_role_coverage_v1(
   owner_id,employee,last_scan_id,checked_at,candidate_source_count,
   historical_source_count,settled_source_count,coverage_state,
   last_evidence_at,qualified_jobs,execution_authorized)
  SELECT v_owner,roles.employee,p_scan_id,v_now,
   count(o.source_identity) FILTER(WHERE o.disposition='NEEDS_CURRENT_VALIDATION'),
   count(o.source_identity) FILTER(WHERE o.disposition='HISTORICAL_REVALIDATION_REQUIRED'),
   count(o.source_identity) FILTER(WHERE o.disposition='SETTLED_NO_REPLAY'),
   CASE WHEN count(o.source_identity) FILTER(
    WHERE o.disposition='NEEDS_CURRENT_VALIDATION')>0 THEN 'CURRENT_PROOF_REQUIRED'
    WHEN count(o.source_identity) FILTER(
    WHERE o.disposition='HISTORICAL_REVALIDATION_REQUIRED')>0
     THEN 'HISTORICAL_SOURCES_REQUIRE_REFRESH'
    ELSE 'NO_CONNECTED_ROLE_SOURCE_EVIDENCE' END,
   max(o.source_observed_at) FILTER(WHERE o.disposition<>'SOURCE_NO_LONGER_CURRENT'),
   0,false
  FROM (VALUES('Avery'),('Riley'),('Quinn'),('Taylor'),
    ('Casey'),('Morgan'),('Jordan'),('Sage')) roles(employee)
  LEFT JOIN reality_internal.employee_discovery_observations_v1 o
   ON o.owner_id=v_owner AND o.employee=roles.employee
    AND o.last_scan_id=p_scan_id AND o.disposition<>'SOURCE_NO_LONGER_CURRENT'
  GROUP BY roles.employee
  ON CONFLICT(owner_id,employee) DO UPDATE SET
   last_scan_id=excluded.last_scan_id,checked_at=excluded.checked_at,
   candidate_source_count=excluded.candidate_source_count,
   historical_source_count=excluded.historical_source_count,
   settled_source_count=excluded.settled_source_count,
   coverage_state=excluded.coverage_state,
   last_evidence_at=excluded.last_evidence_at;
 END LOOP;
 RETURN jsonb_build_object('status','EMPLOYEE_PR_ROLE_INVESTIGATIONS_SAVED',
  'scan_id',p_scan_id,'provider_open_prs_inspected',v_pr_count,
  'owner_role_lenses_saved',v_added,'owners_scanned',v_owners,
  'qualified_jobs_created',0,'shift_authorized',false,
  'installation_authorized',false,'production_changed',false,
  'billing_connection_modified',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_record_employee_pr_discovery_v1(uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_employee_pr_discovery_v1(uuid,text,jsonb)
 TO service_role;
