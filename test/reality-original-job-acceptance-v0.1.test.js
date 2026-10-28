import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 getPublicOriginalRepairEvidence,
 assessAuthenticatedOriginalRepair,
 classifyOriginalRepairAcceptance,
} from '../src/reality-original-job-acceptance-v0.1.js';
const ROOT='/repos/maloney2323/Reality';
const TEST='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const OLD='c8f0b861e1fac6cda7826aed9f36a2666d124eda';
const PASS='4e88594a43ca546a1861d3c5f5812f20234bb3e3';
const WORK='work:24cda9611404e9bcb47909976067605c';
const TITLE='Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures';
const begin="test('Home checks signed-in goal before preparing source work and never silently executes'";
const old=begin+[
 'const sign=html.indexOf(',
 'const goal=html.indexOf(',
 'const prepare=html.indexOf(',
 'sign<goal&&goal<prepare&&prepare<consent&&consent<approval',
].join('\n');
const newer=begin+[
 'const guidedStart=html.indexOf(',
 'const guidedEnd=html.indexOf(',
 'const guided=html.slice(guidedStart,guidedEnd)',
 'const sign=guided.indexOf(',
 'const goal=guided.indexOf(',
 'const prepare=guided.indexOf(',
 'const approval=guided.indexOf(',
].join('\n');
const report={
 original_work_id:WORK,original_goal_id:'goal:unchanged',
 recovery_receipt_id:randomUUID(),
 original_job_completed:false,action_authorized:false,
 external_action_performed:false,
 current_decision:'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED',
 provider_status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
 provider_passing_run:'https://github.com/maloney2323/Reality/actions/runs/40607678256',
 provider_passing_sha:PASS,
};
const base='/contents/'+TEST+'?ref=';
const map=new Map([
 [ROOT+base+OLD,{type:'file',encoding:'base64',content:Buffer.from(old.repeat(20)).toString('base64')}],
 [ROOT+base+PASS,{type:'file',encoding:'base64',content:Buffer.from(newer.repeat(20)).toString('base64')}],
 [ROOT+'/issues/143',{number:143,state:'open',title:TITLE}],
]);
test('public original-repair evidence GET requires no issue-write credential or Authorization',async()=>{
 const seen=[];
 const fetchImpl=async(url,init)=>{
  seen.push({url,init});
  const resource=url.replace('https://api.github.com','');
  if(!map.has(resource))throw Error('unexpected public request');
  return {ok:true,json:async()=>map.get(resource)};
 };
 for(const path of map.keys()){
  const evidence=await getPublicOriginalRepairEvidence(path,{fetchImpl});
  assert.equal(evidence,map.get(path));
 }
 assert.equal(seen.length,3);
 for(const call of seen){
  assert.equal(call.init.method,'GET');
  assert.equal(call.init.headers.Authorization,undefined);
  assert.ok(call.url.startsWith('https://api.github.com'+ROOT));
 }
});
test('source verifier refuses foreign paths or mutable refs before networking',async()=>{
 const candidates=[
  ROOT+'/contents/'+TEST+'?ref=main',
  ROOT+'/contents/'+TEST+'?ref='+OLD+'&path=other',
  ROOT+'/contents/'+TEST+'?ref=000',
  ROOT+'/contents/index.html?ref='+OLD,
  ROOT+'/issues/142',ROOT+'/issues/143/comments',ROOT+'/pulls/149',
  '/repos/attacker/Reality/contents/'+TEST+'?ref='+OLD,
 ];
 let accesses=0;
 for(const path of candidates){
  await assert.rejects(
   getPublicOriginalRepairEvidence(path,{fetchImpl:async()=>{accesses++;throw Error('unexpected')}}),
   /ACCEPTANCE_PUBLIC_READ_PATH_OUT_OF_SCOPE/);
 }
 assert.equal(accesses,0);
});
test('public 403 or malformed evidence is unavailable, not success',async()=>{
 await assert.rejects(
  getPublicOriginalRepairEvidence(ROOT+base+PASS,{
   fetchImpl:async()=>({ok:false,status:403}),
  }),/ACCEPTANCE_GITHUB_PUBLIC_READBACK_UNAVAILABLE/);
 await assert.rejects(
  getPublicOriginalRepairEvidence(ROOT+base+PASS,{
   fetchImpl:async()=>({ok:true,json:async()=>{throw Error('invalid')}}),
  }),/ACCEPTANCE_GITHUB_PUBLIC_JSON_INVALID/);
});
test('historical scoped test correction is evidence, not owner acceptance or job completion',()=>{
 const proof=classifyOriginalRepairAcceptance({
  report,oldSource:old,newSource:newer,issue:map.get(ROOT+'/issues/143'),
 });
 assert.equal(proof.source_correction_verified,true);
 assert.equal(proof.root_cause_classification,'TEST_ASSERTION_SCOPE_NOT_RUNTIME_EXECUTOR_DEFECT');
 assert.equal(proof.assessment,'EVIDENCE_SUPPORTS_CORRECTION_AWAITING_OWNER_ACCEPTANCE');
 assert.equal(proof.full_original_job_completed,false);
 assert.equal(proof.original_issue_closed,false);
 assert.equal(proof.autonomously_generated_patch,false);
});
test('signed-in assessment rechecks exact old and passing commits plus original issue',async()=>{
 const calls=[];
 const get=async path=>{calls.push(path);return map.get(path)};
 const result=await assessAuthenticatedOriginalRepair({
  session:{user_id:randomUUID()},conversationId:randomUUID(),workId:WORK,
  env:{VERCEL_ENV:'preview'},inspect:async()=>report,get,
 });
 assert.equal(result.independently_checked_fix_commit,PASS);
 assert.equal(result.full_original_job_completed,false);
 assert.deepEqual(calls,[ROOT+base+OLD,ROOT+base+PASS,ROOT+'/issues/143']);
});
test('unverified root cause or later provider failure cannot be accepted',()=>{
 assert.throws(()=>classifyOriginalRepairAcceptance({
  report,oldSource:newer,newSource:newer,issue:map.get(ROOT+'/issues/143'),
 }),/ACCEPTANCE_HISTORICAL_TEST_CAUSE_OR_FIX_NOT_CONFIRMED/);
 assert.throws(()=>classifyOriginalRepairAcceptance({
  report:{...report,provider_status:'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW'},
  oldSource:old,newSource:newer,issue:map.get(ROOT+'/issues/143'),
 }),/ACCEPTANCE_ORIGINAL_JOB_OR_EVIDENCE_UNVERIFIED/);
});
