import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html'),shell=read('reality-unified-shell-v1.js');
const api=read('api/reality/personal-time-horizon.js');
const ui=read('reality-past-present-future-v1.js');
const css=read('reality-past-present-future-v1.css');
const boundary=read('src/reality-governed-shift-boundary-v1.js');
const shellCss=read('reality-unified-shell-v1.css');
const connectCss=read('reality-connections-workspace-v1.css');
const count=(text,match)=>(text.match(match)||[]).length;

test('the ORIGINAL Reality Matrix leads Home, not a duplicated future-looking widget',()=>{
 assert.equal(count(html,/class="reality-matrix"/g),1);
 assert.equal(count(html,/id="matrixPastCount"/g),1);
 assert.equal(count(html,/id="matrixPresentCount"/g),1);
 assert.equal(count(html,/id="matrixFutureCount"/g),1);
 assert.match(html,/aria-label="Reality past present future"/);
 assert.match(html,/reality-past-present-future-v1\.js/);
 assert.match(html,/reality-past-present-future-v1\.css/);
 assert.match(shell,/timeline\.id='realityTimeHorizon'/);
 assert.match(shell,/top\.insertAdjacentElement\('afterend',timeline\)/);
 assert.match(ui,/document\.querySelector\('\.reality-matrix'\)/);
 assert.match(ui,/host\.append\(matrix\)/);
 assert.match(ui,/matrix\.dataset\.timeHorizonMounted='true'/);
 assert.match(ui,/head\?\.querySelector\('h2'\)/);
 assert.match(ui,/Past · Present · Future/);
 assert.match(css,/data-reality-route="home"/);
 assert.match(css,/main>#realityTimeHorizon:not\(\[hidden\]\)/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test('legacy work catalog cannot overwrite verified past present future counts',()=>{
 assert.match(html,/if\(!document\.body\.classList\.contains\('reality-unified-ui'\)\)/);
 assert.match(ui,/matrixPastCount/);
 assert.match(ui,/matrixPresentCount/);
 assert.match(ui,/matrixFutureCount/);
 assert.doesNotMatch(ui,/localStorage|sessionStorage|qualified\s*=\s*43|verified\s*=\s*1/i);
});
test('owner-time endpoint is only a read from three existing evidence ledgers',()=>{
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/if\(req\.method!=='GET'\)/);
 assert.match(api,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(api,/db\.url!==session\.config\?\.url/);
 for(const fn of ['reality_read_owner_final_receipts_v1',
  'reality_read_owner_employee_shifts_v1',
  'reality_read_owner_employee_discovery_v1'])
  assert.match(api,new RegExp("'"+fn+"'"));
 assert.match(api,/p_owner_id:ownerId/);
 assert.match(api,/readOwnerTimeHorizonEvidence\(\{/);
 assert.match(api,/assertShiftReadback\(value\)/);
 assert.match(boundary,/read_owner_final_receipts_v1/);
 assert.match(boundary,/read_owner_employee_shifts_v1/);
 assert.match(boundary,/read_owner_employee_discovery_v1/);
 assert.match(api,/Promise\.allSettled/);
 assert.match(api,/FULL_LOOP_INDEPENDENTLY_VERIFIED/);
 assert.match(api,/INDEPENDENT_FINAL_RECEIPT_READBACK/);
 assert.match(api,/OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK|OWNER_SHIFT_HISTORY_READBACK_VERIFIED/);
 assert.match(api,/OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY/);
 assert.match(api,/review_observations_needing_current_proof/);
 assert.match(api,/source_checked_at:value\.checked_at/);
 assert.match(api,/snapshot_stale/);
 assert.match(api,/qualified_executable_jobs:0/);
 assert.match(api,/observations_are_not_authorized_work:true/);
 assert.match(api,/approved_new_work_by_read:false/);
 assert.match(api,/shift_started_by_read:false/);
 assert.match(api,/new_jobs_created_by_read:0/);
 assert.match(api,/verified_cash_savings_usd:null/);
 assert.doesNotMatch(api,/shiftRpc\(db,\s*'(?:reality_authorize|reality_record|reality_claim|reality_settle)/i);
});
test('a failed or stale source cannot become a false achievement or active shift',()=>{
 assert.match(api,/PAST_RECEIPTS_NOT_VERIFIED/);
 assert.match(api,/PRESENT_SHIFT_NOT_VERIFIED/);
 assert.match(api,/FUTURE_DISCOVERY_NOT_VERIFIED/);
 assert.match(api,/active_shift_count:active\.length/);
 assert.match(api,/ACTIVE\.has\(s\.status\)/);
 assert.match(api,/shift_history_is_not_active_execution:true/);
 assert.match(api,/elapsed>12\*60\*60\*1000/);
 assert.match(ui,/get\('matrixFutureCount'\)\.textContent=fresh\?/);
 assert.match(ui,/No active shift verified/);
 assert.match(ui,/not an authorized job or measured savings/);
 assert.match(ui,/get\(id\)\.textContent='—'/);
 assert.match(ui,/owner_can_review_at/);
 assert.match(ui,/signed\(\)/);
 assert.match(ui,/unknown\('Signed out\. Past, Present and Future have been cleared\.'/);
 assert.match(ui,/cache:'no-store'/);
 assert.match(ui,/credentials:'same-origin'/);
});

test('original Home and other route visibility gates actually allow the lifted Matrix',()=>{
 assert.match(html,/main > :not\(\.top\):not\(#realitySimpleHome\):not\(#privateChat\):not\(#realityTimeHorizon\)/);
 assert.match(html,/main > :not\(\.top\):not\(#privateChat\):not\(#realityTimeHorizon\)/);
 assert.match(html,/main > :not\(\.top\):not\(#realityValueVerification\):not\(#realityTimeHorizon\)/);
 assert.match(shellCss,/main>:not\(\.top\):not\(#realitySimpleHome\):not\(#privateChat\):not\(#realityTimeHorizon\)/);
 assert.match(shellCss,/main>:not\(\.top\):not\(#realityUnifiedView\):not\(#workCenter\):not\(#privateChat\):not\(#realityTimeHorizon\)/);
 assert.match(shellCss,/main>:not\(\.top\):not\(#realityUnifiedView\):not\(#privateChat\):not\(#realityTimeHorizon\)/);
 assert.match(connectCss,/main>:not\(\.top\):not\(#realityUnifiedView\):not\(#realityTimeHorizon\)/);
 assert.match(css,/#realityTimeHorizon\[hidden\]\{display:none!important\}/);
});
