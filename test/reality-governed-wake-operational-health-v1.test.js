import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const health=file('sql/reality-governed-wake-private-health-projection-v1.sql');
const readback=file('sql/reality-governed-wake-owner-readback-v1.sql');
const heartbeat=file('sql/reality-governed-wake-broker-heartbeat-v1.sql');
const route=file('api/reality/personal-governed-wake-status.js');
const html=file('index.html');
test('sanitized health comes from least-privileged private read-only projection',()=>{
 assert.match(health,/SECURITY DEFINER/);
 assert.match(health,/REVOKE ALL ON FUNCTION reality_internal\.read_governed_wake_health_v1\(\)/);
 assert.match(health,/GRANT EXECUTE ON FUNCTION reality_internal\.read_governed_wake_health_v1\(\)/);
 assert.match(health,/TO service_role/);
 assert.match(health,/cron\.job_run_details/);
 assert.match(health,/net\._http_response/);
 assert.doesNotMatch(health,/secretKey|vault\.decrypted_secrets|apikey/);
 assert.match(readback,/current_user<>'service_role'/);
 assert.match(readback,/reality_internal\.read_governed_wake_health_v1\(\)/);
});
test('one-minute watchdog and fifteen-minute broker audit are independent of GitHub cron',()=>{
 assert.match(heartbeat,/cron\.schedule\('reality-governed-wake-broker-heartbeat-v1'/);
 assert.match(heartbeat,/send_governed_wake_hint_v1/);
 assert.match(heartbeat,/'audit'/);
 assert.doesNotMatch(heartbeat,/github\.com|github\.token/);
});
test('read-only customer health endpoint validates each status before rendering',()=>{
 assert.match(route,/req\.method!=='GET'/);
 assert.match(route,/authenticatedChatSession/);
 assert.match(route,/WATCHDOG_RECENTLY_SUCCEEDED/);
 assert.match(route,/WATCHDOG_STALE_OR_UNVERIFIED/);
 assert.match(route,/DISPATCH_CREDENTIAL_MISSING/);
 assert.match(route,/NO_RECENT_BROKER_PROOF/);
 assert.match(route,/delivery_ready_proven/);
 assert.match(route,/OWNER_WAKE_READBACK_UNAVAILABLE/);
});
test('idle chat never equates a clear queue with healthy dispatch',()=>{
 assert.match(html,/WATCHDOG_RECENTLY_SUCCEEDED/);
 assert.match(html,/Automatic GitHub delivery BLOCKED/);
 assert.match(html,/An empty queue does not prove execution readiness/);
 assert.match(html,/Edge-to-GitHub delivery is NOT yet proven healthy/);
});
