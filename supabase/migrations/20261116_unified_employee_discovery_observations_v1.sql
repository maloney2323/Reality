-- Reality employee-specific discovery. One shared, owner-scoped, read-only
-- intake ledger built from ALREADY CONNECTED sources. Discovery is NOT a job,
-- work warrant, payroll schedule, or model authority.
CREATE TABLE IF NOT EXISTS reality_internal.employee_discovery_observations_v1(
 owner_id uuid NOT NULL,
 source_identity text NOT NULL CHECK(length(source_identity) BETWEEN 10 AND 1024),
 employee text NOT NULL CHECK(employee IN
  ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')),
 source_family text NOT NULL CHECK(source_family IN
  ('GITHUB_ISSUE','MARKET_ASSESSMENT','CAPABILITY_AUDIT')),
 source_ref text NOT NULL CHECK(length(source_ref) BETWEEN 10 AND 1024),
 evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^sha256:[a-f0-9]{64}$'),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
 disposition text NOT NULL CHECK(disposition IN
  ('NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED',
   'SETTLED_NO_REPLAY','SOURCE_NO_LONGER_CURRENT')),
 source_observed_at timestamptz NOT NULL,
 first_discovered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_reconciled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_scan_id uuid NOT NULL,
 qualified_job_created boolean NOT NULL DEFAULT false CHECK(NOT qualified_job_created),
 shift_authorized boolean NOT NULL DEFAULT false CHECK(NOT shift_authorized),
 installation_authorized boolean NOT NULL DEFAULT false CHECK(NOT installation_authorized),
 production_changed boolean NOT NULL DEFAULT false CHECK(NOT production_changed),
 PRIMARY KEY(owner_id,source_identity)
);
ALTER TABLE reality_internal.employee_discovery_observations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.employee_discovery_observations_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.employee_discovery_observations_v1 TO service_role;

CREATE TABLE IF NOT EXISTS reality_internal.employee_discovery_role_coverage_v1(
 owner_id uuid NOT NULL,
 employee text NOT NULL CHECK(employee IN
  ('Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage')),
 last_scan_id uuid NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 candidate_source_count integer NOT NULL CHECK(candidate_source_count BETWEEN 0 AND 150),
 historical_source_count integer NOT NULL CHECK(historical_source_count BETWEEN 0 AND 150),
 settled_source_count integer NOT NULL CHECK(settled_source_count BETWEEN 0 AND 150),
 coverage_state text NOT NULL CHECK(coverage_state IN
  ('CURRENT_PROOF_REQUIRED','HISTORICAL_SOURCES_REQUIRE_REFRESH',
   'NO_CONNECTED_ROLE_SOURCE_EVIDENCE')),
 last_evidence_at timestamptz,
 qualified_jobs integer NOT NULL DEFAULT 0 CHECK(qualified_jobs=0),
 execution_authorized boolean NOT NULL DEFAULT false CHECK(NOT execution_authorized),
 PRIMARY KEY(owner_id,employee)
);
ALTER TABLE reality_internal.employee_discovery_role_coverage_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.employee_discovery_role_coverage_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON reality_internal.employee_discovery_role_coverage_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_refresh_employee_discovery_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
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
END $fn$;
REVOKE ALL ON FUNCTION public.reality_refresh_employee_discovery_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_refresh_employee_discovery_v1()
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_read_owner_employee_discovery_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE v_roles jsonb;v_items jsonb;v_scanned timestamptz;
BEGIN
 IF current_user<>'service_role' OR p_owner_id IS NULL THEN
  RAISE EXCEPTION 'EMPLOYEE_DISCOVERY_READ_SERVICE_ONLY';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'employee',c.employee,'coverage_state',c.coverage_state,
   'candidate_source_count',c.candidate_source_count,
   'historical_source_count',c.historical_source_count,
   'settled_source_count',c.settled_source_count,
   'checked_at',c.checked_at,'last_evidence_at',c.last_evidence_at,
   'qualified_jobs',0,'execution_authorized',false)
   ORDER BY c.employee),'[]'::jsonb),
  max(c.checked_at) INTO v_roles,v_scanned
 FROM reality_internal.employee_discovery_role_coverage_v1 c
 WHERE c.owner_id=p_owner_id;
 IF jsonb_array_length(v_roles)<>8 OR v_scanned IS NULL THEN
  RETURN jsonb_build_object('status','EMPLOYEE_DISCOVERY_NOT_YET_SCANNED',
   'owner_id',p_owner_id,'roles',v_roles,'items','[]'::jsonb,
   'qualified_jobs',0,'shift_authorized',false,
   'production_changed',false);
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'employee',o.employee,'source_family',o.source_family,
  'source_ref',o.source_ref,'title',o.title,
  'disposition',o.disposition,'evidence_sha256',o.evidence_sha256,
  'source_observed_at',o.source_observed_at,
  'qualified_job',false,'execution_authorized',false)
  ORDER BY o.employee,o.source_ref),'[]'::jsonb)
 INTO v_items FROM reality_internal.employee_discovery_observations_v1 o
 WHERE o.owner_id=p_owner_id AND o.disposition<>'SOURCE_NO_LONGER_CURRENT';
 RETURN jsonb_build_object('status','OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY',
  'owner_id',p_owner_id,'checked_at',v_scanned,'roles',v_roles,
  'items',v_items,'source_count',jsonb_array_length(v_items),
  'qualified_jobs',0,'shift_authorized',false,
  'installation_authorized',false,'production_changed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_employee_discovery_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_employee_discovery_v1(uuid)
 TO service_role;
