import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inlineScript=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
function section(){
 const start=html.indexOf('<section class="home-owner-center"');
 const end=html.indexOf('</section>',start);
 return html.slice(start,end+10);
}
test('homepage JavaScript stays syntactically valid',()=>{
 assert.ok(inlineScript.length>150000,'real inline app script must be parsed');
 assert.doesNotThrow(()=>new Script(inlineScript,{filename:'Reality homepage'}));
});
test('one owner authorization source is relocated to the actual conversation',()=>{
 assert.equal((html.match(/id="homeOwnerAuthorizations"/g)||[]).length,1);
 assert.match(section(),/Owner Authorizations/);
 assert.match(html,/id="homeChatApprovalShortcut"/);
 assert.match(html,/id="homeOpenApprovalChat"/);
 assert.match(html,/id="realityChatApprovalLegacyContainer"/);
 assert.match(inlineScript,/appendChild\(homeOwnerCenter\)/);
 assert.match(section(),/id="homeOwnerItems"/);
 assert.match(section(),/id="homeOwnerStatus"/);
});
test('the original approval dialogs are moved into the chat modal layer',()=>{
 assert.match(inlineScript,/appendChild\(homeOwnerDialogs\)/);
 assert.match(inlineScript,/homeOwnerDialogs\.appendChild\(\$\('wcEasyGenuineApproval'\)\)/);
 assert.match(inlineScript,/homeOwnerDialogs\.appendChild\(homeLegacyExactDialog\)/);
 assert.match(inlineScript,/homeLegacyInstallSlot\.append\(/);
 assert.match(inlineScript,/\$\('wcInstallSettlementPanel'\)/);
});
test('home list is server-owned and never trusts an unsaved model proposal',()=>{
 assert.match(inlineScript,/fetch\('\/api\/reality\/personal-qualified-capabilities'/);
 assert.match(inlineScript,/credentials:'same-origin'/);
 assert.match(inlineScript,/entry\.phase==='AWAITING_OWNER_APPROVAL'/);
 assert.match(inlineScript,/q\.installation_authorized===false/);
 assert.match(inlineScript,/q\.original_job_completed===false/);
 assert.match(inlineScript,/q\.real_provider_holdout_verified===true/);
 assert.match(inlineScript,/q\.real_provider_holdout_artifact_sha256===q\.artifact_sha256/);
 assert.match(inlineScript,/matching\.length!==1/);
 assert.match(inlineScript,/matching\[0\]\.approval/);
 assert.match(inlineScript,/matching\[0\]\.qualification\.artifact_sha256!==expectedHash/);
});
test('old shortcuts navigate home instead of triggering install authorization',()=>{
 const quick=inlineScript.slice(inlineScript.indexOf("\$('wcEasyRepairMain'\).onclick="));
 assert.match(inlineScript,/async function wcEasyReviewQualified\(job\)\{[\s\S]*?homeOwnerFocus\(\);[\s\S]*?\}/);
 assert.ok((inlineScript.match(/homeOwnerFocus\(\);/g)||[]).length>=3);
 assert.doesNotMatch(inlineScript,/await wcEasyReviewQualified\(existing\)/);
});
test('exact one-time authenticated approval route and explicit checkbox are retained',()=>{
 assert.match(html,/id="wcEasyGenuineApprovalCheck"/);
 assert.match(html,/id="wcEasyGenuineConfirm"/);
 assert.match(inlineScript,/fetch\('\/api\/reality\/personal-qualified-capability-approve'/);
 assert.match(inlineScript,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(inlineScript,/APPROVE EXACT VERIFIED UPGRADE IN ISOLATED PREVIEW/);
 assert.match(inlineScript,/!\$\('wcEasyGenuineApprovalCheck'\)\.checked/);
});
test('no auto-approval on page load, session refresh or queue readback',()=>{
 const refresh=inlineScript.slice(inlineScript.indexOf('async function homeOwnerRefresh()'),
  inlineScript.indexOf('async function realityChatApproveOnce('));
 assert.doesNotMatch(refresh,/personal-qualified-capability-approve/);
 assert.doesNotMatch(refresh,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(inlineScript,/if\(yes\)\{void refreshRealitySelfImprovement\(\);void homeOwnerRefresh\(\);void realityChatRefreshEvents\(\);void realityBusinessRefresh\(\);void wcInvestigateMarket\(\{restore:true\}\);\}/);
 assert.doesNotMatch(inlineScript,/if\(yes\)\{[^}]*OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(inlineScript,/if\(homeOwnerSignedIn\(\)\)void homeOwnerRefresh\(\)/);
});
test('homepage mobile layout and fail-closed sign-in behavior',()=>{
 assert.match(html,/@media\(max-width:640px\)\{\.home-owner-center/);
 assert.match(inlineScript,/if\(!homeOwnerSignedIn\(\)\)\{/);
 assert.match(inlineScript,/Sign-in required/);
 assert.match(inlineScript,/Readback unavailable/);
});


test('homepage explains the actual settlement repair before the authorization button',()=>{
 const pos=inlineScript.indexOf('const reconciler=entry.capability_id');
 assert.ok(pos>0);
 const card=inlineScript.slice(pos,inlineScript.indexOf("list.appendChild(card);",pos));
 for(const label of ['What problem did Reality find?','What did Reality actually do?',
   'Independent test results','What happens if you approve?',
   'NOT DONE: No installation approved. Original job not resumed. No final Universe settlement',
   'Approve once · Install in preview & continue job'])
   assert.ok(card.includes(label),'missing plain-language milestone: '+label);
 assert.ok(card.indexOf("What problem did Reality find?") <
   card.indexOf("What did Reality actually do?"));
 assert.ok(card.indexOf("What did Reality actually do?") <
   card.indexOf('Approve once · Install in preview & continue job'));
});
test('frozen, candidate and historical test results are read from signed qualification not hardcoded',()=>{
 const pos=inlineScript.indexOf("const counts=[['Original regression tests'");
 assert.ok(pos>0);
 const proof=inlineScript.slice(pos,pos+1300);
 assert.match(proof,/\['New capability tests','candidate_pass'\]/);
 assert.match(proof,/\['Historical evidence tests','holdout_pass'\]/);
 assert.match(proof,/Number\.isSafeInteger\(q\[key\]\)&&q\[key\]>0&&verified/);
 assert.match(proof,/These results verify the candidate against the checked tests/);
});
test('conversation decisions and detailed legacy records keep source hashes collapsible',()=>{
 const p=inlineScript.indexOf("const evidence=document.createElement('details')");
 assert.ok(p>0);
 const chat=inlineScript.slice(p,p+1500);
 assert.match(chat,/summary\.textContent='Exact source hash and original job'/);
 assert.match(chat,/Source SHA-256/);
 assert.match(chat,/evidence\.append\(summary,exact\)/);
 const older=inlineScript.indexOf("const evidence=document.createElement('details')",p+20);
 assert.ok(older>p);
 const details=inlineScript.slice(older,older+1150);
 assert.match(details,/summary\.textContent='View technical evidence and exact source'/);
 assert.match(details,/Exact source SHA-256/);
 assert.match(details,/evidence\.append\(summary,work,hash\)/);
 assert.match(inlineScript,/card\.appendChild\(notDone\)/);
});

test('Home opens Reality chat and all approvals live in the signed-in conversation',()=>{
 assert.match(html,/id="homeOpenApprovalChat"/);
 assert.match(html,/id="realityChatApprovalInbox"/);
 assert.match(html,/id="realityChatApprovalItems"/);
 assert.match(html,/id="privateTranscript"/);
 assert.match(html,/id="privatePrompt"/);
 assert.match(inlineScript,/function homeOwnerFocus\(\)\{[\s\S]*?realityOpenChatDock\(false\)/);
 assert.match(inlineScript,/homeOpenApprovalChat'\)\.addEventListener\('click',\(\)=>homeOwnerFocus\(\)\)/);
 assert.doesNotMatch(inlineScript,/if\(\$\('privateChat'\)\.dataset\.open==='true'\)realityCloseChatDock\(\)/);
});
test('one customer approval click verifies exact source and uses existing authenticated endpoint',()=>{
 const from=inlineScript.indexOf('async function realityChatApproveOnce(');
 const to=inlineScript.indexOf('async function realityChatRefreshEvents()',from);
 assert.ok(from>0&&to>from);
 const method=inlineScript.slice(from,to);
 assert.match(method,/realityChatApprovalInFlight=true/);
 assert.match(method,/await homeOwnerRead\(\)/);
 assert.match(method,/matching.length!==1/);
 assert.match(method,/matching\[0\]\.qualification\.artifact_sha256!==expectedHash/);
 assert.match(method,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(method,/APPROVE EXACT VERIFIED UPGRADE IN ISOLATED PREVIEW/);
 assert.match(method,/original_job_completed!==false/);
 assert.match(method,/production_changed!==false/);
 assert.match(method,/DO_NOT_RETRY/);
 assert.doesNotMatch(method,/showModal\(\)/);
});
test('chat live work progress relies on authenticated read-only worker evidence',()=>{
 const from=inlineScript.indexOf('async function realityChatRefreshEvents()');
 const to=inlineScript.indexOf('async function homeOwnerOpen(',from);
 assert.ok(from>0&&to>from);
 const method=inlineScript.slice(from,to);
 assert.match(method,/personal-genuine-loop-status/);
 assert.match(method,/data.status!=='OWNER_GOVERNED_LOOP_READBACK'/);
 assert.match(method,/j.universe_settlement_verified===true&&/);
 assert.match(method,/j.full_loop_independently_verified===true/);
 assert.match(method,/Final independent completion check pending/);
 assert.match(method,/Live worker readback unavailable/);
 assert.doesNotMatch(method,/method:'POST'/);
});

test('saved conversation, work updates and chat approvals precede composer and settings',()=>{
 const ready=html.indexOf('<div id="privateReady"');
 const transcript=html.indexOf('id="privateTranscript"',ready);
 const progress=html.indexOf('id="realityChatActivityEntries"',transcript);
 const approvals=html.indexOf('id="realityChatApprovalInbox"',progress);
 const prompt=html.indexOf('id="privatePrompt"',approvals);
 const send=html.indexOf('id="privateSend"',prompt);
 const extras=html.indexOf('id="realityChatSettings"',send);
 const goal=html.indexOf('id="privateGoalText"',extras);
 assert.ok(ready>=0&&ready<transcript&&transcript<progress&&
  progress<approvals&&approvals<prompt&&prompt<send&&send<extras&&extras<goal);
 assert.match(inlineScript,/\$\('realityChatSettings'\)\.open=true/);
});
test('Business Reality money and verified value lead the customer home',()=>{
 const business=html.indexOf('id="businessHome"'),chat=html.indexOf('id="privateChat"');
 assert.ok(business>0&&business<chat);
 assert.match(html,/Your Business Reality/);
 for(const id of ['businessRevenue','businessExpenses','businessCash','businessVerifiedValue',
  'businessFinancialStatus','businessTrackedJobs','businessPendingApprovals','businessVerifiedCompletions'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/Money, operations & verified value/);
 assert.match(html,/Where your money goes/);
 assert.match(html,/What Reality is working on/);
});
test('money is explicitly unknown without a connected source, never modeled from worker tests',()=>{
 const start=inlineScript.indexOf('function realityBusinessResetMoney()');
 const end=inlineScript.indexOf('async function realityBusinessRefresh()',start);
 assert.ok(start>0&&end>start);
 const reset=inlineScript.slice(start,end);
 for(const field of ['businessRevenue','businessExpenses','businessCash'])
  assert.match(reset,new RegExp(field+"'\\)\\.textContent='Not connected'"));
 assert.match(reset,/businessVerifiedValue'\)\.textContent='Not measured'/);
 assert.match(reset,/Financial sources not connected/);
 assert.match(reset,/cannot verify costs or savings yet/);
});
test('work counters use owner-authenticated read-only evidence and refuse false completions',()=>{
 const start=inlineScript.indexOf('async function realityBusinessRefresh()');
 const end=inlineScript.indexOf('const SPEECH_STATE=',start);
 const method=inlineScript.slice(start,end);
 assert.ok(start>0&&end>start);
 assert.match(method,/personal-genuine-loop-status/);
 assert.match(method,/data.status!=='OWNER_GOVERNED_LOOP_READBACK'/);
 assert.match(method,/j.universe_settlement_verified===true&&/);
 assert.match(method,/j.full_loop_independently_verified===true/);
 assert.match(method,/data.production_changed!==false/);
 assert.match(method,/businessOperationsStatus/);
 assert.doesNotMatch(method,/method:'POST'/);
});
test('Reality Chat is one tap from any part of the dashboard without losing the conversation',()=>{
 assert.match(html,/id="realityChatDockOpen"/);
 assert.match(html,/id="businessAskReality"/);
 assert.match(html,/id="realityChatDockClose"/);
 assert.match(html,/id="privateTranscript"/);
 assert.match(html,/id="privatePrompt"/);
 assert.match(html,/#privateChat\[data-open="true"\]/);
 assert.match(inlineScript,/function realityOpenChatDock\(focusPrompt=false\)/);
 assert.match(inlineScript,/function realityCloseChatDock\(\)/);
 assert.match(inlineScript,/businessAskReality'\)\.addEventListener\('click'/);
 assert.match(inlineScript,/accountShortcut'\)\.addEventListener\('click'/);
 assert.match(inlineScript,/e.key==='Escape'/);
});

test('after one approval the chat reports actual worker wake or recovery, never an invented execution',()=>{
 const start=inlineScript.indexOf('async function realityChatApproveOnce(');
 const end=inlineScript.indexOf('async function realityChatRefreshEvents()',start);
 const source=inlineScript.slice(start,end);
 assert.match(source,/SIGNED_DB_OUTBOX_EDGE_WATCHDOG_V1/);
 assert.match(source,/receipt\.retry_owner_approval===false/);
 assert.match(source,/worker start is not verified/);
 assert.match(source,/No second approval needed/);
 assert.match(source,/delivery is not proof of execution/i);
 assert.doesNotMatch(source,/worker_execution_started=true/);
});
test('chat displays every verifiable stage and refuses unproven final outcome or financial savings',()=>{
 const start=inlineScript.indexOf('async function realityChatRefreshEvents()');
 const end=inlineScript.indexOf('async function homeOwnerOpen(',start);
 const source=inlineScript.slice(start,end);
 for(const stage of ['Missing capability identified','Upgrade generated and tested',
  'Owner authorization','Isolated installation','Original job settlement','Final Universe verification'])
   assert.ok(source.includes(stage),'missing evidence stage: '+stage);
 assert.match(source,/j\.isolated_installed===true/);
 assert.match(source,/j\.independently_settled===true/);
 assert.match(source,/j\.universe_settlement_verified===true/);
 assert.match(source,/Financial value: not yet measured/);
 assert.match(source,/No verified full-loop completion is being claimed/);
 assert.match(source,/full_loop_independently_verified===true/);
});

test('Reality chat renders source-scoped approvals with one explicit click and no model authority',()=>{
 const from=inlineScript.indexOf('function realityChatRenderApprovalInbox(');
 const to=inlineScript.indexOf('async function homeOwnerRefresh()',from);
 assert.ok(from>0&&to>from);
 const render=inlineScript.slice(from,to);
 assert.match(render,/homeOwnerEntryVerified\(e\)/);
 assert.match(render,/approval_gate_open===true/);
 assert.match(render,/!e\.approval/);
 assert.match(render,/realityChatApproveOnce\(entry\.original_work_id,q\.artifact_sha256\)/);
 assert.match(render,/Isolated preview/);
 assert.match(render,/No production changes/);
 assert.doesNotMatch(render,/personal-qualified-capability-approve/);
 assert.match(inlineScript,/realityChatRenderApprovalInbox\(entries\)/);
});
test('chat refresh rechecks the signed-in owner and keeps ambiguous approvals fail-closed',()=>{
 assert.match(html,/id="realityChatApprovalStatus"/);
 assert.match(html,/id="realityChatApprovalEvidence"/);
 assert.match(html,/id="realityChatApprovalDialogs"/);
 assert.match(inlineScript,/worker start is not verified/);
 assert.match(inlineScript,/SIGNED_DB_OUTBOX_EDGE_WATCHDOG_V1/);
 assert.match(inlineScript,/Approval uncertain\. No automatic retry/);
 assert.match(inlineScript,/if\(\$\('privateReady'\)\?\.style\.display==='block'\)/);
});
