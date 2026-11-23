-- Final Loop independently readable completed-worker release proof.
-- Install ONLY on the verified isolated preview database together with
-- the owner-approved release controller. No shared benchmark migration.
-- This does not authorize any LLM, job, provider write, or shift restart.
CREATE TABLE IF NOT EXISTS reality_internal.governed_signed_worker_release_wakes_v1(
 worker_run_id uuid PRIMARY KEY
  REFERENCES reality_internal.signed_worker_actual_runs_v1(run_id),
 owner_id uuid NOT NULL,
 shift_id uuid NOT NULL,
 running_release_sha text NOT NULL
  CHECK(running_release_sha ~ '^[a-f0-9]{40}$'),
 running_release_ref text NOT NULL
  CHECK(running_release_ref ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$'),
 operating_lane text NOT NULL CHECK(operating_lane='NORMAL_SIGNED_SHIFT'),
 registered_capabilities text[] NOT NULL,
 release_receipt_sha256 text NOT NULL
  CHECK(release_receipt_sha256 ~ '^sha256:[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);
ALTER TABLE reality_internal.governed_signed_worker_release_wakes_v1
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reality_internal.governed_signed_worker_release_wakes_v1
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT
 ON reality_internal.governed_signed_worker_release_wakes_v1 TO service_role;

CREATE OR REPLACE FUNCTION public.reality_record_signed_worker_release_wake_v1(
 p_worker_run_id uuid,p_owner_id uuid,p_shift_id uuid,
 p_release_sha text,p_release_ref text,
 p_registered_capabilities text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE found_shift boolean; found_run boolean; hash text; inserted int;
BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_WAKE_SERVICE_ONLY';
 END IF;
 IF p_release_sha !~ '^[a-f0-9]{40}$' OR
   p_release_ref !~ '^[A-Za-z0-9][A-Za-z0-9/_-]{3,145}$' OR
   p_registered_capabilities IS NULL OR
   pg_catalog.array_length(p_registered_capabilities,1) IS NULL OR
   pg_catalog.array_length(p_registered_capabilities,1)>32 OR
   EXISTS(SELECT 1 FROM pg_catalog.unnest(p_registered_capabilities) k
    WHERE k !~ '^[A-Z][A-Z0-9_]{3,110}$') OR
   (SELECT pg_catalog.count(DISTINCT k)
     FROM pg_catalog.unnest(p_registered_capabilities) k)
       <>pg_catalog.array_length(p_registered_capabilities,1)
 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_WAKE_RUNTIME_IDENTITY_UNVERIFIED',
   'release_activated',false);
 END IF;
 SELECT EXISTS(SELECT 1 FROM reality_internal.governed_employee_shifts_v1 s
   WHERE s.shift_id=p_shift_id AND s.owner_id=p_owner_id
    AND s.authorized_at IS NOT NULL AND s.closed_at IS NULL)
 INTO found_shift;
 SELECT EXISTS(SELECT 1 FROM reality_internal.signed_worker_actual_runs_v1 r
   WHERE r.run_id=p_worker_run_id AND r.status='STARTED'
    AND r.finished_at IS NULL
    AND r.started_at>pg_catalog.clock_timestamp()-interval '12 minutes')
 INTO found_run;
 IF NOT found_shift OR NOT found_run THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_WAKE_SHIFT_OR_PROCESS_UNVERIFIED',
   'release_activated',false);
 END IF;
 hash:='sha256:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.concat_ws('|',p_worker_run_id::text,p_owner_id::text,
   p_shift_id::text,p_release_sha,p_release_ref,
   pg_catalog.array_to_string(p_registered_capabilities,',')),
  'UTF8')),'hex');
 INSERT INTO reality_internal.governed_signed_worker_release_wakes_v1(
  worker_run_id,owner_id,shift_id,running_release_sha,
  running_release_ref,operating_lane,registered_capabilities,
  release_receipt_sha256
 ) VALUES(p_worker_run_id,p_owner_id,p_shift_id,p_release_sha,
  p_release_ref,'NORMAL_SIGNED_SHIFT',p_registered_capabilities,hash)
 ON CONFLICT (worker_run_id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>1 THEN
  RETURN pg_catalog.jsonb_build_object(
   'status','SIGNED_RELEASE_WAKE_ALREADY_RECORDED_NO_REPLAY',
   'release_activated',false);
 END IF;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_WORKER_RELEASE_WAKE_DURABLY_RECORDED',
  'worker_run_id',p_worker_run_id,'owner_id',p_owner_id,
  'shift_id',p_shift_id,'release_sha',p_release_sha,
  'release_ref',p_release_ref,'operating_lane','NORMAL_SIGNED_SHIFT',
  'release_receipt_sha256',hash,'release_activated',false,
  'original_job_completed',false,'production_changed',false);
END $fn$;

-- Independent reader counts only runs that subsequently reached the
-- durable normal-worker COMPLETED checkpoint. Staging-only runs fail.
CREATE OR REPLACE FUNCTION public.reality_read_signed_worker_release_wakes_v1(
 p_shift_id uuid,p_after timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
 SET search_path='' AS $fn$
DECLARE data jsonb;
BEGIN
 IF current_user<>'service_role' OR p_shift_id IS NULL OR
  p_after IS NULL OR p_after>pg_catalog.clock_timestamp() THEN
  RAISE EXCEPTION 'SIGNED_RELEASE_WAKES_SERVICE_SCOPE_REQUIRED';
 END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object(
   'worker_run_id',q.worker_run_id,
   'shift_id',q.shift_id,'owner_id',q.owner_id,
   'running_release_sha',q.running_release_sha,
   'running_release_ref',q.running_release_ref,
   'operating_lane',q.operating_lane,
   'registered_capabilities',pg_catalog.to_jsonb(q.registered_capabilities),
   'release_receipt_sha256',q.release_receipt_sha256,
   'recorded_at',q.recorded_at,'finished_at',q.finished_at
  ) ORDER BY q.recorded_at DESC),'[]'::jsonb)
 INTO data FROM (
  SELECT a.*,r.finished_at FROM
   reality_internal.governed_signed_worker_release_wakes_v1 a
  JOIN reality_internal.signed_worker_actual_runs_v1 r
    ON r.run_id=a.worker_run_id
  WHERE a.shift_id=p_shift_id AND a.recorded_at>=p_after
   AND r.status='COMPLETED'
   AND r.worker_stage='WORKER_RESPONSE_PUBLICATION'
   AND r.finished_at IS NOT NULL
  ORDER BY a.recorded_at DESC LIMIT 10
 ) q;
 RETURN pg_catalog.jsonb_build_object(
  'status','SIGNED_RELEASE_COMPLETED_WORKER_WAKES_READ_ONLY',
  'shift_id',p_shift_id,'wakes',data,
  'read_only',true,'release_activated',false,
  'original_job_completed',false);
END $fn$;

REVOKE ALL ON FUNCTION
 public.reality_record_signed_worker_release_wake_v1(
 uuid,uuid,uuid,text,text,text[])
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION
 public.reality_read_signed_worker_release_wakes_v1(
 uuid,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION
 public.reality_record_signed_worker_release_wake_v1(
 uuid,uuid,uuid,text,text,text[])
 TO service_role;
GRANT EXECUTE ON FUNCTION
 public.reality_read_signed_worker_release_wakes_v1(
 uuid,timestamptz)
 TO service_role;
