import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const broker=read('supabase/functions/reality-governed-wake-broker-v1/index.ts');
const life=read('supabase/functions/reality-governed-worker-life-v1/index.ts');
const run=read('scripts/reality-governed-worker-proof-of-life-v1.mjs');
const wf=read('.github/workflows/reality-genuine-capability-auto-trigger-v1.yml');
const sql=read('sql/reality-governed-wake-notifier-watchdog-v1.sql');
const acknowledgement=read('sql/reality-governed-worker-proof-of-life-v1.sql');
const route=read('api/reality/personal-governed-wake-status.js');
const html=read('index.html');
test('approval triggers a durable outbox and signed notification only',()=>{
 assert.match(sql,/AFTER INSERT ON reality_internal\.governed_execution_wake_outbox_v1/);
 assert.match(sql,/net\.http_post/);
 assert.match(sql,/extensions\.hmac/);
 assert.match(sql,/vault\.decrypted_secrets/);
 assert.match(sql,/SIGNED_WAKE_HINT_VERIFIED/);
 assert.match(sql,/WAKE_HINT_REPLAY_BLOCKED/);
 assert.match(sql,/\* \* \* \* \*/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/WAKE_HINT_SERVICE_ROLE_REQUIRED/);
 assert.doesNotMatch(sql,/GITHUB_TOKEN|owner_approve_qualified_preview_v1/);
});
test('broker validates signed wake before any GitHub dispatch or leasing',()=>{
 const signed=broker.indexOf("reality_authenticate_governed_wake_hint_v1");
 const claim=broker.indexOf("reality_claim_governed_wake_v1");
 const githubWrite=broker.indexOf("method:'PUT'");
 const relay=broker.indexOf("reality_issue_governed_wake_relay_v1");
 assert.ok(signed>0&&relay>signed&&claim>signed&&githubWrite>claim);
 assert.match(broker,/PRODUCTION_RELAY_NOT_READY/);
 assert.match(broker,/worker_started:false/);
 assert.match(broker,/dispatch_fence/);
 assert.match(broker,/-attempt-/);
 assert.match(broker,/reality_record_governed_delivery_v1/);
 assert.match(broker,/EXISTING_WAKE_FILE_COLLISION/);
 assert.match(broker,/reality_issue_governed_wake_relay_v1/);
 assert.ok(broker.includes('reality-blond.vercel.app/api/reality/governed-wake-relay'));
 assert.match(broker,/owner_approval_created!==false/);
 assert.match(broker,/signed_hint_verified:true/);
});
test('worker OIDC identity verifies official GitHub signature, claims and provider run',()=>{
 assert.match(life,/token\.actions\.githubusercontent\.com/);
 assert.match(life,/claims\.repository_id/);
 assert.match(life,/claims\.workflow_ref!==FULL_REF/);
 assert.match(life,/claims\.run_attempt/);
 assert.match(life,/crypto\.subtle\.verify/);
 assert.match(life,/GITHUB_PROVIDER_RUN_NOT_CONSISTENT/);
 assert.match(life,/reality_ack_governed_worker_alive_v1/);
 assert.match(life,/reality_validate_governed_worker_freshness_v1/);
 assert.match(life,/execution_authorized:false/);
});
test('worker only allows provider-confirmed fenced wake files, never a manual chat message',()=>{
 const check=spawnSync(process.execPath,['--check',
  new URL('../scripts/reality-governed-worker-proof-of-life-v1.mjs',import.meta.url).pathname],
  {encoding:'utf8'});
 assert.equal(check.status,0,check.stderr);
 assert.match(run,/\/commits\/'/);
 assert.match(run,/p\.status==='added'/);
 assert.match(run,/DURABLE_OWNER_RECEIPT_READBACK_REQUIRED/);
 assert.match(run,/await callBroker\('alive'\)/);
 assert.match(run,/await callBroker\('ready'\)/);
 assert.match(run,/setReady\('true'\)/);
 assert.doesNotMatch(run,/reality_owner_approve_qualified_preview_v1/);
});
test('GitHub installation step is blocked until the actual OIDC runner gate passes',()=>{
 const start=wf.indexOf('  activate_owner_approved_preview:');
 const end=wf.indexOf('  monitor_owner_approved_preview:',start);
 assert.ok(start>0&&end>start);
 const block=wf.slice(start,end);
 assert.match(block,/id-token: write/);
 assert.match(block,/actions: read/);
 assert.match(block,/id: worker_life/);
 assert.match(block,/scripts\/reality-governed-worker-proof-of-life-v1\.mjs/);
 assert.match(block,/if: steps\.worker_life\.outputs\.ready == 'true'/);
 assert.ok(block.indexOf('id: worker_life')<block.indexOf('id: isolated_install'));
});
test('stale or replayed worker identity cannot become execution authority',()=>{
 assert.match(acknowledgement,/FOR UPDATE/);
 assert.match(acknowledgement,/STALE_APPROVAL_BLOCKED/);
 assert.match(acknowledgement,/FRESHNESS_WORKER_LIFE_NOT_VERIFIED/);
 assert.match(acknowledgement,/p_fence/);
 assert.match(acknowledgement,/e\.last_transition_event_id IS DISTINCT/);
 assert.match(acknowledgement,/a\.pre_state_hash IS DISTINCT/);
 assert.match(acknowledgement,/EXECUTE ON FUNCTION public\.reality_ack_governed_worker_alive_v1/);
 assert.doesNotMatch(acknowledgement,/SECURITY DEFINER/);
});
test('conversation sees owner-scoped, read-only wake and retry evidence',()=>{
 assert.match(route,/authenticatedChatSession/);
 assert.match(route,/req\.method!=='GET'/);
 assert.match(route,/reality_read_owner_governed_wakes_v1/);
 assert.match(route,/p_owner_id:session\.user_id/);
 assert.match(route,/production_changed:false/);
 assert.match(html,/id="realityChatWakeStatus"/);
 assert.match(html,/async function realityChatReadWakeStatus\(\)/);
 assert.match(html,/fetch\('\/api\/reality\/personal-governed-wake-status'/);
 assert.match(html,/Automatic retry pending/);
 assert.match(html,/No execution or receipt is inferred/);
});
test('non-Action and non-approved pushes cannot install any source',()=>{
 const p=spawnSync(process.execPath,
 [new URL('../scripts/reality-governed-worker-proof-of-life-v1.mjs',import.meta.url).pathname],
 {encoding:'utf8',env:{...process.env,GITHUB_ACTIONS:'false'}});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/NOT_A_BROKER_WAKE/);
});
