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
test('exactly one homepage Owner Authorizations location is prominent',()=>{
 assert.equal((html.match(/id="homeOwnerAuthorizations"/g)||[]).length,1);
 assert.match(section(),/Owner Authorizations/);
 assert.ok(html.indexOf('id="privateChat"')<
  html.indexOf('id="homeOwnerAuthorizations"'));
 assert.match(section(),/id="homeOwnerItems"/);
 assert.match(section(),/id="homeOwnerStatus"/);
});
test('both prior self-repair installation consent dialogs are physically moved into home center',()=>{
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
 assert.match(inlineScript,/if\(yes\)\{void refreshRealitySelfImprovement\(\);void homeOwnerRefresh\(\);void realityChatRefreshEvents\(\);\}/);
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
test('technical hashes and original work ids are collapsible while meaningful outcome stays visible',()=>{
 const p=inlineScript.indexOf("const evidence=document.createElement('details')");
 assert.ok(p>0);
 const content=inlineScript.slice(p,p+1150);
 assert.match(content,/summary\.textContent='View technical evidence and exact source'/);
 assert.match(content,/Exact source SHA-256/);
 assert.match(content,/evidence\.append\(summary,work,hash\)/);
 assert.match(inlineScript,/card\.appendChild\(notDone\)/);
});

test('existing persistent chat is the primary above-dashboard customer interface',()=>{
 assert.ok(html.indexOf('<section id="privateChat"')<
  html.indexOf('<section class="home-owner-center"'));
 assert.ok(html.indexOf('<section id="privateChat"')<
  html.indexOf('<section id="startFlow"'));
 assert.match(html,/id="privateTranscript"/);
 assert.match(html,/id="privatePrompt"/);
 assert.match(html,/id="realityChatActivityEntries"/);
 assert.match(inlineScript,/insertBefore\(homeOwnerCenter,\$\('privatePrompt'\)\)/);
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
 assert.match(method,/j.independently_settled===true&&j.universe_settlement_verified===true/);
 assert.match(method,/Final Universe proof still required/);
 assert.match(method,/Live worker readback unavailable/);
 assert.doesNotMatch(method,/method:'POST'/);
});
