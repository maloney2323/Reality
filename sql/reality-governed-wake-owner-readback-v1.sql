-- Read-only, owner-scoped wake trace for Reality's signed-in conversation.
CREATE OR REPLACE FUNCTION public.reality_read_owner_governed_wakes_v1(p_owner_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE records jsonb;
 watchdog_last_run timestamptz;
 watchdog_last_status text;
 broker_last_status text;
 broker_last_at timestamptz;

BEGIN
 IF current_user<>'service_role' THEN
  RAISE EXCEPTION 'WAKE_OWNER_SERVICE_ROLE_REQUIRED'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
    'approval_id',s.approval_id,
    'artifact_sha256',s.artifact_sha256,
    'original_work_id',s.original_work_id,
    'wake_state',s.wake_state,
    'dispatch_attempts',s.dispatch_attempts,
    'dispatched_at',s.dispatched_at,
    'worker_alive_at',s.first_worker_alive_at,
    'ledger_phase',s.phase,
    'last_updated_at',s.updated_at,
    'preview_only',true
   ) ORDER BY s.created_at DESC),'[]'::jsonb)
 INTO records
 FROM (
  SELECT w.approval_id,w.artifact_sha256,w.original_work_id,w.wake_state,w.dispatch_attempts,
    w.dispatched_at,w.first_worker_alive_at,w.updated_at,w.created_at,q.phase
  FROM reality_internal.governed_execution_wake_outbox_v1 w
  JOIN reality_internal.genuine_capability_queue_v1 q ON q.trigger_id=w.trigger_id
  JOIN reality_internal.genuine_preview_install_approvals_v1 a
    ON a.approval_id=w.approval_id
  WHERE w.owner_id=p_owner_id
    AND q.owner_id=p_owner_id
    AND a.owner_id=p_owner_id
    AND a.original_work_id=w.original_work_id
    AND a.artifact_hash=w.artifact_sha256
    AND w.target_environment='ISOLATED_PREVIEW'
  ORDER BY w.created_at DESC LIMIT 12
 ) s;
 SELECT d.start_time,d.status
 INTO watchdog_last_run,watchdog_last_status
 FROM cron.job_run_details d
 WHERE d.jobid=(SELECT jobid FROM cron.job
   WHERE jobname='reality-governed-wake-watchdog-v1')
 ORDER BY d.start_time DESC LIMIT 1;
 SELECT CASE
    WHEN content LIKE '%"status":"DISPATCH_CREDENTIAL_MISSING"%'
      THEN 'DISPATCH_CREDENTIAL_MISSING'
    WHEN content LIKE '%"status":"NO_APPROVED_WAKE_READY"%'
      THEN 'BROKER_READY_IDLE'
    WHEN content LIKE '%"status":"DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN"%'
      THEN 'DELIVERY_ACCEPTED'
    WHEN content LIKE '%"status":"WAKE_BROKER_FAIL_CLOSED"%'
      THEN 'BROKER_FAIL_CLOSED'
    ELSE 'NO_VALID_BROKER_PROOF'
   END,
   created
 INTO broker_last_status,broker_last_at
 FROM net._http_response
 WHERE content LIKE '%"status":"DISPATCH_CREDENTIAL_MISSING"%'
    OR content LIKE '%"status":"NO_APPROVED_WAKE_READY"%'
    OR content LIKE '%"status":"DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN"%'
    OR content LIKE '%"status":"WAKE_BROKER_FAIL_CLOSED"%'
 ORDER BY created DESC LIMIT 1;
 RETURN jsonb_build_object('status','OWNER_GOVERNED_WAKE_READBACK',
  'wakes',records,'read_only',true,
  'production_changed',false,'execution_authorized_by_read',false,
  'watchdog',jsonb_build_object(
    'status',CASE WHEN watchdog_last_status='succeeded' AND
        watchdog_last_run>=clock_timestamp()-interval '3 minutes'
       THEN 'WATCHDOG_RECENTLY_SUCCEEDED' ELSE 'WATCHDOG_STALE_OR_UNVERIFIED' END,
    'last_run_at',watchdog_last_run,
    'broker_delivery_status',CASE
      WHEN broker_last_at>=clock_timestamp()-interval '30 minutes'
      THEN coalesce(broker_last_status,'NO_VALID_BROKER_PROOF')
      ELSE 'NO_RECENT_BROKER_PROOF' END,
    'broker_checked_at',broker_last_at,
    'delivery_ready_proven',broker_last_status IN
        ('BROKER_READY_IDLE','DELIVERY_ACCEPTED') AND
      broker_last_at>=clock_timestamp()-interval '30 minutes',
    'source','POSTGRES_CRON_AND_SIGNED_EDGE_HTTP_READBACK'
  ));
END $fn$;
REVOKE ALL ON FUNCTION public.reality_read_owner_governed_wakes_v1(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reality_read_owner_governed_wakes_v1(uuid)
 TO service_role;
