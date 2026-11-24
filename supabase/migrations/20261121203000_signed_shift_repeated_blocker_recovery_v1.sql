-- Repeatable signed-worker no-progress detection. Isolated preview only.
-- A worker wake is not proof of an original job, its completion or authority.
-- Reuse the existing owner shift incident and independent investigation path.
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 DROP CONSTRAINT owner_shift_continuity_incidents_v1_kind_check;
ALTER TABLE reality_internal.owner_shift_continuity_incidents_v1
 ADD CONSTRAINT owner_shift_continuity_incidents_v1_kind_check
 CHECK (kind = ANY(ARRAY[
  'ELIGIBLE_WORK_NO_DISPATCH',
  'EMPLOYEE_INQUIRY_CLAIM_STALE',
  'QUALIFIED_EVIDENCE_JOB_BLOCKED',
  'EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
  'SIGNED_SHIFT_REPEATED_NO_PROGRESS'
 ]::text[]));

CREATE TABLE IF NOT EXISTS reality_internal.shift_repeated_blocker_observations_v1(
 shift_id uuid PRIMARY KEY REFERENCES reality_internal.governed_employee_shifts_v1(shift_id),
 owner_id uuid NOT NULL,
 blocker_code text NOT NULL CHECK(blocker_code ~ '^[A-Z0-9_]{5,100}$'),
 consecutive_count integer NOT NULL DEFAULT 1
  CHECK(consecutive_count BETWEEN 1 AND 100000),
 last_shift_progress_at timestamptz,
 original_claim_count integer NOT NULL DEFAULT 0 CHECK(original_claim_count>=0),
 independent_final_count integer NOT NULL DEFAULT 0 CHECK(independent_final_count>=0),
 last_worker_run_id uuid NOT NULL,
 first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 incident_id uuid REFERENCES reality_internal.owner_shift_continuity_incidents_v1(incident_id)
);
ALTER TABLE reality_internal.shift_repeated_blocker_observations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.shift_repeated_blocker_observations_v1
 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON reality_internal.shift_repeated_blocker_observations_v1
 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_observe_signed_shift_no_progress_v1(
 p_shift_id uuid, p_worker_run_id uuid, p_safe_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $recovery$
DECLARE sh record; prior reality_internal.shift_repeated_blocker_observations_v1%ROWTYPE;
 v_claims integer; v_finals integer; v_key text; v_incident uuid;
 v_observed timestamptz:=clock_timestamp();
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR
  p_worker_run_id IS NULL OR p_safe_result IS NULL OR
  p_safe_result !~ '^[A-Z0-9_]{5,100}$'
 THEN RAISE EXCEPTION 'SIGNED_NO_PROGRESS_SERVICE_SCOPE_REQUIRED'; END IF;
 -- Safe work may continue. Only actual unresolved result codes qualify for
 -- this bounded detector, never a generic worker wake or evidence pack.
 IF p_safe_result !~ '(_REQUIRED|_BLOCKED|_UNVERIFIED|_NOT_READY)$'
 THEN RETURN pg_catalog.jsonb_build_object(
  'status','NO_UNRESOLVED_WORKER_BLOCKER',
  'new_original_admitted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false); END IF;

 SELECT s.shift_id,s.owner_id,s.last_progress_at INTO sh
 FROM reality_internal.governed_employee_shifts_v1 s
 JOIN reality_internal.governed_employee_shift_worker_pulses_v1 wake
  ON wake.shift_id=s.shift_id AND wake.owner_id=s.owner_id
 JOIN reality_internal.signed_worker_actual_runs_v1 run
  ON run.run_id=p_worker_run_id AND run.status='STARTED'
 WHERE s.shift_id=p_shift_id AND s.closed_at IS NULL
  AND s.status IN('RUNNING','QUEUED','AWAITING_EXACT_ORIGINAL_WORK')
  AND s.authorized_at IS NOT NULL
  AND wake.last_worker_status='WAKE_RECEIVED'
  AND wake.last_worker_seen_at>v_observed-interval '3 minutes'
  AND run.started_at>v_observed-interval '3 minutes'
 FOR UPDATE OF s;
 IF NOT FOUND THEN RAISE EXCEPTION 'SIGNED_NO_PROGRESS_ACTIVE_WORKER_UNVERIFIED'; END IF;

 SELECT count(*)::integer INTO v_claims
 FROM reality_internal.governed_employee_original_claims_v1 c
 WHERE c.shift_id=sh.shift_id AND c.owner_id=sh.owner_id;
 SELECT count(*)::integer INTO v_finals
 FROM reality_internal.governed_original_independent_final_receipts_v1 f
 WHERE f.shift_id=sh.shift_id AND f.owner_id=sh.owner_id;

 INSERT INTO reality_internal.shift_repeated_blocker_observations_v1 AS existing(
  shift_id,owner_id,blocker_code,consecutive_count,
  last_shift_progress_at,original_claim_count,independent_final_count,
  last_worker_run_id,first_seen_at,last_seen_at
 ) VALUES(sh.shift_id,sh.owner_id,p_safe_result,1,
  sh.last_progress_at,v_claims,v_finals,p_worker_run_id,v_observed,v_observed)
 ON CONFLICT(shift_id) DO UPDATE SET
  blocker_code=excluded.blocker_code,
  consecutive_count=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN LEAST(existing.consecutive_count+1,100000) ELSE 1 END,
  first_seen_at=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN existing.first_seen_at ELSE v_observed END,
  incident_id=CASE
   WHEN existing.owner_id=excluded.owner_id
    AND existing.blocker_code=excluded.blocker_code
    AND existing.last_shift_progress_at IS NOT DISTINCT FROM excluded.last_shift_progress_at
    AND existing.original_claim_count=excluded.original_claim_count
    AND existing.independent_final_count=excluded.independent_final_count
   THEN existing.incident_id ELSE NULL END,
  owner_id=excluded.owner_id,
  last_shift_progress_at=excluded.last_shift_progress_at,
  original_claim_count=excluded.original_claim_count,
  independent_final_count=excluded.independent_final_count,
  last_worker_run_id=excluded.last_worker_run_id,
  last_seen_at=v_observed
 WHERE existing.last_worker_run_id<>excluded.last_worker_run_id
 RETURNING * INTO prior;
 IF NOT FOUND THEN
  RETURN pg_catalog.jsonb_build_object('status','SIGNED_WORKER_WAKE_ALREADY_OBSERVED_NO_REPLAY',
   'new_original_admitted',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 IF prior.consecutive_count<2 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_SHIFT_BLOCKER_FIRST_OBSERVED',
   'shift_id',sh.shift_id,'consecutive_count',prior.consecutive_count,
   'new_original_admitted',false,'execution_authorized',false,
   'installation_authorized',false,'production_changed',false);
 END IF;
 -- Stable identity is evidence of a repeating gate, NOT evidence of its cause.
 v_key:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  'reality-repeat:v1:'||sh.owner_id::text||':'||sh.shift_id::text||':'||
  prior.blocker_code||':'||coalesce(prior.last_shift_progress_at::text,'none')||':'||
  prior.original_claim_count::text||':'||prior.independent_final_count::text,
  'UTF8')),'hex');
 INSERT INTO reality_internal.owner_shift_continuity_incidents_v1(
  owner_id,shift_id,kind,evidence_key,evidence_sha256,source_claim_id,
  error_summary,observation_count,phase,last_observed_at)
 VALUES(sh.owner_id,sh.shift_id,'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
  v_key,'sha256:'||v_key,NULL,
  left('The signed worker repeatedly reports '||prior.blocker_code||
   '. No independently verified original-work progress changed between these wakes; classify the exact evidence, capability, authorization and continuation gap.',280),
  LEAST(prior.consecutive_count,100000),'DETECTED',v_observed)
 ON CONFLICT(owner_id,shift_id,kind,evidence_key) DO UPDATE
 SET last_observed_at=v_observed,
  observation_count=LEAST(
   GREATEST(reality_internal.owner_shift_continuity_incidents_v1.observation_count,
    excluded.observation_count),100000)
 RETURNING incident_id INTO v_incident;
 UPDATE reality_internal.shift_repeated_blocker_observations_v1
 SET incident_id=v_incident
 WHERE shift_id=sh.shift_id AND last_worker_run_id=p_worker_run_id;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_SHIFT_REPEATED_BLOCKER_INCIDENT_RECORDED',
  'shift_id',sh.shift_id,'incident_id',v_incident,
  'consecutive_count',prior.consecutive_count,
  'next_action','INVESTIGATE_EXISTING_SIGNED_SHIFT_INCIDENT_ON_NEXT_WAKE',
  'new_original_admitted',false,'execution_authorized',false,
  'installation_authorized',false,'production_changed',false);
END $recovery$;

REVOKE ALL ON FUNCTION public.reality_observe_signed_shift_no_progress_v1(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_observe_signed_shift_no_progress_v1(uuid,uuid,text)
 TO service_role;