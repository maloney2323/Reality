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
 assert.ok(html.indexOf('id="homeOwnerAuthorizations"')<
  html.indexOf('id="privateChat"'));
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
 const home=inlineScript.slice(inlineScript.indexOf('let homeOwnerRefreshEpoch=0;'),
  inlineScript.indexOf("\$('wcEasyGenuineCancel'\).onclick="));
 assert.doesNotMatch(home,/personal-qualified-capability-approve/);
 assert.doesNotMatch(home,/OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.match(inlineScript,/if\(yes\)\{void refreshRealitySelfImprovement\(\);void homeOwnerRefresh\(\);\}/);
 assert.match(inlineScript,/if\(homeOwnerSignedIn\(\)\)void homeOwnerRefresh\(\)/);
});
test('homepage mobile layout and fail-closed sign-in behavior',()=>{
 assert.match(html,/@media\(max-width:640px\)\{\.home-owner-center/);
 assert.match(inlineScript,/if\(!homeOwnerSignedIn\(\)\)\{/);
 assert.match(inlineScript,/Sign-in required/);
 assert.match(inlineScript,/Readback unavailable/);
});
