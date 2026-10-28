import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const candidate=process.env.REALITY_ORIGINAL_EXECUTOR_CANDIDATE;
if(candidate!=='/work/owner-original-repair-executor/candidate.mjs')throw Error('ISOLATED_GENERATED_EXECUTOR_REQUIRED');
const {ORIGINAL_REPAIR_WORK,prepareOriginalMaintenanceRepair,executeOriginalMaintenanceRepair}=await import(pathToFileURL(candidate).href);
const REPO='/repos/maloney2323/Reality';
const REF='experiment/reality-live-durable-adversarial-20261025';
const PATH='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const SHA='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const RESULT='5555555555555555555555555555555555555555';
const OWNER='11111111-1111-4111-8111-111111111111';
const CONV='22222222-2222-4222-8222-222222222222';
const sha=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
function fakeFile(text){return {type:'file',path:PATH,sha:sha(text),encoding:'base64',
 content:Buffer.from(text).toString('base64')};}
const historical=readFileSync('test/fixtures/original-repair-historical-source.snapshot.txt','utf8');
const corrected=readFileSync('test/fixtures/original-repair-corrected-source.snapshot.txt','utf8');
function provider(source,{moving=false,movingEarly=false,issueOpen=true}={}){
 let writes=0;let reads=0;let current=source;let grantConsumed=false;
 const get=async path=>{
  reads++;
  if(path===REPO+'/git/ref/heads/'+REF)
   return {ref:'refs/heads/'+REF,object:{sha:((moving&&grantConsumed)||(movingEarly&&reads>3))?'f'.repeat(40):SHA}};
  if(path===REPO+'/issues/143')
   return {number:143,state:issueOpen?'open':'closed',
    title:'Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures',
    html_url:'https://github.com/maloney2323/Reality/issues/143'};
  if(path===REPO+'/contents/'+PATH+'?ref='+SHA)return fakeFile(current);
  if(path===REPO+'/contents/'+PATH+'?ref='+RESULT ||
     path===REPO+'/contents/'+PATH+'?ref='+('f'.repeat(40)))return fakeFile(current);
  throw Error('UNEXPECTED_GET_'+path);
 };
 const write=async(path,method,body)=>{
  writes++;
  assert.equal(path,REPO+'/contents/'+PATH);assert.equal(method,'PUT');
  assert.equal(body.branch,REF);
  assert.equal(body.sha,sha(current));
  current=Buffer.from(body.content,'base64').toString('utf8');
  return {commit:{sha:RESULT}};
 };
 return {get,write,markGrantConsumed(){grantConsumed=true},get writes(){return writes},get reads(){return reads}};
}
const session={user_id:OWNER};
const conversationId=CONV;
function consumer({alter=false}={}){
 let calls=0;
 return {get count(){return calls},fn:async input=>{
  calls++;
  return {...input,status:'CONSUMED_ONCE',owner_id:OWNER,
   authorized_by:OWNER,conversation_id:CONV,
   original_work_id:ORIGINAL_REPAIR_WORK,base_ref:REF,repository:'maloney2323/Reality',
   issue_number:143,one_time_grant_consumed:true,
   base_head_sha:alter?'f'.repeat(40):input.observedHeadSha,
   source_blob_sha:input.observedBlobSha,
   proposed_patch_sha256:input.proposedPatchSha256,
   candidate_sha256:input.candidateSha256,
   grant_id:'33333333-3333-4333-8333-333333333333',
   operation:'github:repair_original_maintenance'};
 }};
}
test('real current original source -> ALREADY_FIXED, never write, never self-credit',async()=>{
 const v=provider(corrected),c=consumer();
 const plan=await prepareOriginalMaintenanceRepair({get:v.get});
 assert.equal(plan.state,'PREEXISTING_FIX_OBSERVED_NO_WRITE');
 assert.equal(plan.original_work_id,ORIGINAL_REPAIR_WORK);
 assert.equal(plan.model_upgrade_installed,false);
 const res=await executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:c.fn});
 assert.equal(res.status,'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY');
 assert.equal(res.original_job_completed,false);
 assert.equal(res.repair_executed_by_reality,false);
 assert.equal(res.external_write_performed,false);
 assert.equal(v.writes,0);assert.equal(c.count,0);
});
test('frozen actual original failure -> exact model PATCH_PROPOSED, no approval implied',async()=>{
 const v=provider(historical);
 const plan=await prepareOriginalMaintenanceRepair({get:v.get});
 assert.equal(plan.state,'REPAIR_PROPOSAL_READY_SEPARATE_AUTHORIZATION_REQUIRED');
 assert.equal(plan.source_status,'PATCH_PROPOSED');
 assert.equal(plan.provider_write_permitted,false);
 assert.equal(plan.requires_install_authorization,true);
 assert.match(plan.proposed_patch_sha256,/^[a-f0-9]{64}$/);
 assert.equal(v.writes,0);
});
test('original repair candidate with separately consumed owner grant can update exact source only',async()=>{
 const v=provider(historical),c=consumer();
 const r=await executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:c.fn});
 assert.equal(r.status,'AUTHORIZED_PATCH_GITHUB_SOURCE_REOBSERVED');
 assert.equal(r.resulting_commit_sha,RESULT);
 assert.equal(r.source_readback_independent,true);
 assert.equal(r.external_write_performed,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.original_job_settlement_saved,false);
 assert.equal(v.writes,1);assert.equal(c.count,1);
});
test('no owner grant service -> never write',async()=>{
 const v=provider(historical);
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write}),
 /ORIGINAL_EXECUTOR_TRUSTED_OWNER_AND_GRANT_SERVICE_REQUIRED/);
 assert.equal(v.writes,0);
});
test('wrong original work or unknown owner is never accepted',async()=>{
 const v=provider(historical),c=consumer();
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,workId:'work:8f71513a2c1955569e84c0e9af0962ec',
  get:v.get,write:v.write,consumeVerifiedGrant:c.fn}),
 /ORIGINAL_EXECUTOR_ONLY_ORIGINAL_WORK_ALLOWED/);
 await assert.rejects(executeOriginalMaintenanceRepair({
  session:{user_id:'not-an-owner'},conversationId,
  get:v.get,write:v.write,consumeVerifiedGrant:c.fn}),
 /ORIGINAL_EXECUTOR_TRUSTED_OWNER_AND_GRANT_SERVICE_REQUIRED/);
 assert.equal(v.writes,0);
});
test('wrong grant base sha after consume -> fail closed without write',async()=>{
 const v=provider(historical),c=consumer({alter:true});
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:c.fn}),
 /ORIGINAL_EXECUTOR_DURABLE_EXACT_OWNER_GRANT_REQUIRED/);
 assert.equal(v.writes,0);assert.equal(c.count,1);
});
test('unexpected issue state prevents any grant consumption',async()=>{
 const v=provider(historical,{issueOpen:false}),c=consumer();
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:c.fn}),
 /ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH/);
 assert.equal(v.writes,0);assert.equal(c.count,0);
});
test('moving target after grant -> no write or silent retry',async()=>{
 const v=provider(historical,{moving:true}),c=consumer();
 const afterGrant=async input=>{const consumed=await c.fn(input);v.markGrantConsumed();return consumed};
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:afterGrant}),
 /ORIGINAL_EXECUTOR_SOURCE_MOVED_AFTER_GRANT_NO_RETRY/);
 assert.equal(v.writes,0);assert.equal(c.count,1);
});
test('branch moving before a one-time grant is safely rejected without consuming authority',async()=>{
 const v=provider(historical,{movingEarly:true}),c=consumer();
 await assert.rejects(executeOriginalMaintenanceRepair({
  session,conversationId,get:v.get,write:v.write,consumeVerifiedGrant:c.fn}),
 /ORIGINAL_EXECUTOR_SOURCE_MOVED_AFTER_GRANT_NO_RETRY/);
 assert.equal(v.writes,0);assert.equal(c.count,0);
});
test('executor does not authorize or declare completed work on GH write response alone',()=>{
 const source=readFileSync(candidate,'utf8');
 assert.doesNotMatch(source,/original_job_completed\s*:\s*true/);
 assert.match(source,/consumeVerifiedGrant/);
 assert.match(source,/source_readback_independent\s*:\s*true/);
 assert.match(source,/original_job_settlement_saved\s*:\s*false/);
 assert.doesNotMatch(source,/githubWrite\(.*issues/);
});
