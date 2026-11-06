-- Private, read-only health projection. The owner RPC has only service-role
-- access; it cannot directly read cron/net internal schemas.
CREATE OR REPLACE FUNCTION reality_internal.read_governed_wake_health_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO '' AS $fn$
DECLARE watchdog_last_run timestamptz;
 watchdog_last_status text;
 broker_last_status text;
 broker_last_at timestamptz;
BEGIN
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
 RETURN jsonb_build_object(
   'status',CASE WHEN watchdog_last_status='succeeded' AND
      watchdog_last_run>=clock_timestamp()-interval '3 minutes'
      THEN 'WATCHDOG_RECENTLY_SUCCEEDED'
      ELSE 'WATCHDOG_STALE_OR_UNVERIFIED' END,
   'last_run_at',watchdog_last_run,
   'broker_delivery_status',CASE
      WHEN broker_last_at>=clock_timestamp()-interval '30 minutes'
      THEN coalesce(broker_last_status,'NO_VALID_BROKER_PROOF')
      ELSE 'NO_RECENT_BROKER_PROOF' END,
   'broker_checked_at',broker_last_at,
   'delivery_ready_proven',coalesce(
      broker_last_status IN ('BROKER_READY_IDLE','DELIVERY_ACCEPTED') AND
      broker_last_at>=clock_timestamp()-interval '30 minutes',false),
   'source','POSTGRES_CRON_AND_SIGNED_EDGE_HTTP_READBACK'
 );
END $fn$;
REVOKE ALL ON FUNCTION reality_internal.read_governed_wake_health_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reality_internal.read_governed_wake_health_v1()
 TO service_role;