import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const parent=process.env.REALITY_EXECUTOR_HOLDOUT_PACKAGE;
if(!['original-executor-installable-package','original-executor-security-corrected-package'].includes(parent))
 throw Error('ORIGINAL_EXECUTOR_HOLDOUT_EXACT_PACKAGE_NAME_REQUIRED');
const path='/work/'+parent+'/reality-original-maintenance-executor.mjs';
const {prepareOriginalMaintenanceRepair,executeOriginalMaintenanceRepair}
 =await import(pathToFileURL(path).href);
const WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const SOURCE='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const ROOT='/repos/maloney2323/Reality';
const FIXED='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const corrected=readFileSync('/work/test/fixtures/original-repair-corrected-source.snapshot.txt','utf8');
const historical=readFileSync('/work/test/fixtures/original-repair-historical-source.snapshot.txt','utf8');
const gitSha=src=>{const buf=Buffer.from(src,'utf8');return createHash('sha1').update('blob '+buf.length+'\0').update(buf).digest('hex');};
function build(source,issueOverrides={},fileOverrides={}){
 let getCalls=0,writeCalls=0,grantCalls=0;
 const issue={
  number:143,state:'open',
  title:'Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures',
  html_url:'https://github.com/maloney2323/Reality/issues/143',...issueOverrides,
 };
 const file={type:'file',path:SOURCE,sha:gitSha(source),
  encoding:'base64',content:Buffer.from(source).toString('base64'),...fileOverrides};
 return {
  get:async url=>{
   getCalls++;
   if(url===ROOT+'/git/ref/heads/'+BRANCH)
    return {ref:'refs/heads/'+BRANCH,object:{sha:FIXED}};
   if(url===ROOT+'/issues/143')return issue;
   if(url===ROOT+'/contents/'+SOURCE+'?ref='+FIXED)return file;
   throw Error('HOLDOUT_UNEXPECTED_READ_'+url);
  },
  write:async()=>{writeCalls++;throw Error('HOLDOUT_DENIES_ALL_EXTERNAL_GITHUB_WRITES')},
  grant:async()=>{grantCalls++;throw Error('HOLDOUT_DENIES_ALL_GRANTS')},
  count:()=>({getCalls,writeCalls,grantCalls}),
 };
}
test('fresh holdout: pinned issue number and open state never yield write authority',async()=>{
 for(const change of [{number:144},{state:'closed'}]){
  const c=build(historical,change);
  await assert.rejects(prepareOriginalMaintenanceRepair({workId:WORK,get:c.get}),
   /ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH/);
  assert.equal(c.count().writeCalls,0);assert.equal(c.count().grantCalls,0);
 }
});
test('fresh holdout: false Git blob content is rejected before proposal',async()=>{
 const c=build(historical,{}, {sha:'f'.repeat(40)});
 await assert.rejects(prepareOriginalMaintenanceRepair({get:c.get}),/source Git blob SHA mismatch/);
 assert.equal(c.count().writeCalls,0);
});
test('fresh holdout: already-fixed source never elevates an untrusted claimed owner grant',async()=>{
 const c=build(corrected);
 const status=await executeOriginalMaintenanceRepair({
  session:{user_id:'11111111-1111-4111-8111-111111111111'},
  conversationId:'22222222-2222-4222-8222-222222222222',
  get:c.get,write:c.write,consumeVerifiedGrant:c.grant,
 });
 assert.equal(status.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
 assert.equal(status.original_job_completed,false);
 assert.equal(c.count().writeCalls,0);
 assert.equal(c.count().grantCalls,0);
});
test('fresh holdout: same issue number but falsified canonical issue URL must be rejected',async()=>{
 const c=build(historical,{html_url:'https://github.com/untrusted/other/issues/143'});
 await assert.rejects(prepareOriginalMaintenanceRepair({get:c.get}),
  /ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH/);
 assert.equal(c.count().writeCalls,0);
 assert.equal(c.count().grantCalls,0);
});
