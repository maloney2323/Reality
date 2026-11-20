-- Record a bounded, authenticated maintenance executor failure without inventing repair proof.
ALTER TABLE reality_internal.signed_maintenance_executor_claims_v1
 ADD COLUMN IF NOT EXISTS last_error_code text,
 ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
CREATE OR REPLACE FUNCTION public.reality_record_signed_maintenance_executor_failure_v1(
 p_maintenance_id uuid,p_worker_run_id uuid,p_error_code text
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO '' AS $$
DECLARE c record;
BEGIN
 IF current_user <> 'service_role' OR p_maintenance_id IS NULL OR p_worker_run_id IS NULL
   OR p_error_code !~ '^[A-Z][A-Z0-9_]{2,99}$'
 THEN RAISE EXCEPTION 'SIGNED_MAINTENANCE_FAILURE_SCOPE_INVALID'; END IF;
 UPDATE reality_internal.signed_maintenance_executor_claims_v1
 SET state='FAILED_RETRYABLE',last_error_code=p_error_code,last_error_at=now(),
     lease_expires_at=now()
 WHERE maintenance_id=p_maintenance_id AND worker_run_id=p_worker_run_id
   AND state='CLAIMED' AND lease_expires_at>now()
 RETURNING * INTO c;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','MAINTENANCE_CLAIM_NOT_OWNED_OR_EXPIRED','repair_executed',false); END IF;
 RETURN jsonb_build_object('status',CASE WHEN c.attempt_count>=3
    THEN 'MAINTENANCE_RETRY_LIMIT_REACHED' ELSE 'MAINTENANCE_FAILURE_RECORDED_RETRYABLE' END,
   'maintenance_id',c.maintenance_id,'shift_id',c.shift_id,
   'attempt_count',c.attempt_count,'error_code',c.last_error_code,
   'repair_executed',false,'original_job_completed',false,'production_changed',false);
END $$;
REVOKE ALL ON FUNCTION public.reality_record_signed_maintenance_executor_failure_v1(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_record_signed_maintenance_executor_failure_v1(uuid,uuid,text) TO service_role;
