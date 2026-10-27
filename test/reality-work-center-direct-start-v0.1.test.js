import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(js,'inline Work Center script must exist');

test('Work Center inline script parses without running connector calls',()=>{
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'index.html'}));
});

test('direct start appears directly under one selected finding, not batch authorization',()=>{
 const item=js.indexOf('function wcRender()');
 const direct=js.indexOf('class="wc-direct-action"',item);
 const handler=js.indexOf("querySelectorAll('[data-wc-start]')",direct);
 assert.ok(item>=0&&direct>item&&handler>direct);
 assert.match(js,/wcPicked\.size===1&&wcPicked\.has\(wcKey\(w\)\)/);
 assert.match(js,/wcEligibleForDirectStart\(w\)\?'Authorize & Start Job':'Executable job plan required'/);
});

test('only exact supported GitHub tracking work is directly runnable',()=>{
 const fn=js.match(/function wcEligibleForDirectStart\(w\)\{([\s\S]*?)\n\}/)?.[0];
 assert.ok(fn);
 const eligible=vm.runInNewContext('('+fn+')');
 const base={kind:'SYSTEM_MAINTENANCE',work_id:'work:'+'a'.repeat(32),
  authorization_required:true,execution_work_item:{connector:'github',operation:'create_issue'}};
 assert.equal(eligible(base),true);
 assert.equal(eligible({...base,kind:'REVIEW_FINDING'}),false);
 assert.equal(eligible({...base,authorization_required:false}),false);
 assert.equal(eligible({...base,work_id:'issue:72'}),false);
 assert.equal(eligible({...base,execution_work_item:{connector:'github',operation:'merge_pull_request'}}),false);
});

test('authorization is explicitly scoped and precedes single-use RUN',()=>{
 const start=js.indexOf('async function wcAuthorizeAndStart');
 const finish=js.indexOf("let wcCoverage=",start);
 const body=js.slice(start,finish);
 const order=["intent:'HISTORY_CHECK'","intent:'PREPARE'","window.confirm(consent)",
  "'APPROVE_THIS_EXACT_WORK_ITEM'","intent:'CHECK',conversation_id:conv,work_item:exact",
  "intent:'CHECK',conversation_id:conv,discovered_work_id:w.work_id",
  "wcJobAttemptLocked.add(workId)","intent:'RUN'"];
 let before=-1;
 for(const token of order){
  const pos=body.indexOf(token);
  assert.ok(pos>before,'Expected ordered contract: '+token);before=pos;
 }
 assert.match(body,/exact\.inputs\?\.repository!=='maloney2323\/Reality'/);
 assert.match(body,/wcJobAttemptLocked\.has\(workId\)/);
 assert.match(body,/providerDispatchRequested=true/);
 assert.match(body,/Do NOT retry/);
 assert.match(body,/underlying repair is NOT completed/);
});

test('page does not label unknown jobs as fully automated',()=>{
 assert.match(html,/This is a finding, not a runnable job yet/);
 assert.match(html,/Current supported action: create one source-backed GitHub tracking issue/);
});
test('account link and secure sign-in status remain visible before Work Center even if session fails',()=>{
 assert.match(html,/<a href="#privateChat" id="accountShortcut"/);
 assert.match(html,/<section id="privateChat" class="console-card"/);
 assert.match(html,/id="privateAccountState"/);
 assert.match(html,/id="privateRetrySession"/);
 assert.ok(html.indexOf('id="privateChat"')<html.indexOf('id="workCenter"'));
 assert.match(js,/el\('privateRetrySession'\)\.onclick=\(\)=>\{void init\(\)\}/);
 assert.match(js,/el\('privateAccountState'\)\.textContent='Account connection unavailable:/);
});

test('verified GitHub outcome replaces stale approved-but-not-run status',()=>{
 const start=js.indexOf('async function revealGap3Action');
 const end=js.indexOf('Owner-only read-only Preview token diagnostic',start);
 assert.ok(start>=0&&end>start);
 const result=js.slice(start,end);
 assert.match(result,/out\.status==='VERIFIED'&&out\.verified===true/);
 assert.match(result,/out\.outcome_receipt_id&&out\.reservation_id/);
 assert.match(result,/verifiedIssue=true/);
 assert.match(result,/setWorkStep\(card,4,'complete','GitHub issue created · Verified; repair pending'\)/);
 assert.match(result,/approvalOnly\.textContent='GitHub action completed and verified/);
 assert.match(result,/setupButton\.textContent='GitHub issue verified · Repair pending'/);
 assert.match(result,/underlying investigation and repair are still pending/);
 assert.match(result,/Do not retry/);
});
