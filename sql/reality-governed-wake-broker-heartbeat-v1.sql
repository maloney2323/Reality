-- Independent signed broker health audit. No owner approvals or executions.
-- This proves an idle worker delivery path is not silently misreported healthy.
SELECT cron.schedule('reality-governed-wake-broker-heartbeat-v1',
 '*/15 * * * *',
 'SELECT reality_internal.send_governed_wake_hint_v1(''audit'');');