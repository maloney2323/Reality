import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRealMissingRepairIssue,readSignedOwnerIssueWitness,discoverRealRepairOpportunities}
 from '../src/reality-real-repair-opportunity-intake-v1.0.js';

const project='hvkfreoagbrphwghjajw';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://'+project+'.supabase.co',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test_only_never_real_credential'
};
const expectedWork='work:'+createHash('sha256').update('reality:issue:201')
 .digest('hex').slice(0,32);
function fixture(){
 return {
  status:'SOURCE_PINNED_MISSING_EXTENSION_READY_FOR_OWNER_REVIEW',
  issue_number:201,issue_title:'Reconcile independently settled work',
  issue_url:'https://github.com/maloney2323/Reality/issues/201',
  original_provider_failed_run_id:41393750252,
  original_provider_failed_job_id:125110528607,
  source_sha:'56efd753e23a910a86336c3dda6c754b16e947ac',
  source_path:'src/reality-extensions/reality-continuity-settlement-reconciler.mjs',
  frozen_test_path:'test/reality-frozen-regressions/reality-continuity-settlement-reconciler-v1.test.js',
  frozen_test_sha256:'03480c22c0ad896e732b5782c7f4edd9d0576c34dec42a2911db90c63dd31fe9',
  actual_provider_failure_hash:'a'.repeat(64),
  original_work_id_for_provider_observation:expectedWork,
  independently_verified:true,owner_goal_bound:false,
  installation_authorized:false,job_completed:false,production_changed:false,
  signed_witness_run_id:41395869795,
  witnessed_at:new Date().toISOString(),
  source:'SIGNED_GITHUB_OIDC_PROVIDER_REVERIFY_READBACK'
 };
}
function fetchWithWitness(witness,githubStatus=403){
 return async (url,options)=>{
  if(String(url).startsWith('https://api.github.com/'))
   return {ok:false,status:githubStatus};
  assert.match(String(url),/\/rest\/v1\/rpc\/reality_read_genuine_owner_issue_witness_v1$/);
  assert.equal(options.method,'POST');
  assert.equal(JSON.parse(options.body).p_issue_number,201);
  assert.ok(options.headers.authorization.includes('test_only_never_real_credential'));
  return {ok:true,json:async()=>witness};
 };
}
test('preview GitHub 403 accepts only recent signed independent source witness; never owner approval',async()=>{
 const found=await verifyRealMissingRepairIssue({
  issueNumber:201,env,fetchImpl:fetchWithWitness(fixture())});
 assert.equal(found.issue_number,201);
 assert.equal(found.source,'SIGNED_GITHUB_OIDC_PROVIDER_REVERIFY_READBACK');
 assert.equal(found.owner_goal_bound,false);
 assert.equal(found.installation_authorized,false);
 assert.equal(found.job_completed,false);
});
test('signed witness is never accepted for a non-403 GitHub failure',async()=>{
 await assert.rejects(verifyRealMissingRepairIssue({
  issueNumber:201,env,fetchImpl:fetchWithWitness(fixture(),404)}),
  /GITHUB_PROVIDER_SOURCE_READBACK_404/);
});
test('expired witness, wrong SHA, forged owner approval and changed source fail closed',async()=>{
 for(const alter of [
  v=>v.witnessed_at=new Date(Date.now()-7200000).toISOString(),
  v=>v.source_sha='not-a-sha',
  v=>v.owner_goal_bound=true,
  v=>v.installation_authorized=true,
  v=>v.original_work_id_for_provider_observation='work:'+'f'.repeat(32),
  v=>v.actual_provider_failure_hash='invalid',
 ]){
  const v=fixture();alter(v);
  await assert.rejects(readSignedOwnerIssueWitness({
   issueNumber:201,env,fetchImpl:fetchWithWitness(v)}),
  /SIGNED_OWNER_WITNESS_FRESH_PROVIDER_READBACK_REQUIRED/);
 }
});
test('witness refuses non-preview, wrong project, or storage-off contexts',async()=>{
 for(const change of [
  x=>x.VERCEL_ENV='production',
  x=>x.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF='another-project',
  x=>x.REALITY_UNIVERSE_PERSISTENCE_ENABLED='false'
 ]){
  const e={...env};change(e);
  await assert.rejects(readSignedOwnerIssueWitness({
    issueNumber:201,env:e,fetchImpl:fetchWithWitness(fixture())
  }),/SIGNED_OWNER_WITNESS_/);
 }
});

test('GitHub issue-list 403 still presents only recent independently signed opportunities',async()=>{
 const witness=fixture();
 const fetchImpl=async(url,options)=>{
  if(String(url).startsWith('https://api.github.com/'))
   return {ok:false,status:403};
  if(String(url).endsWith('/rpc/reality_list_genuine_owner_issue_witnesses_v1'))
   return {ok:true,json:async()=>[201]};
  if(String(url).endsWith('/rpc/reality_read_genuine_owner_issue_witness_v1'))
   return {ok:true,json:async()=>witness};
  throw Error('UNEXPECTED_READ_'+url);
 };
 const discovered=await discoverRealRepairOpportunities({env,fetchImpl});
 assert.equal(discovered.opportunities.length,1);
 assert.equal(discovered.opportunities[0].issue_number,201);
 assert.equal(discovered.opportunities[0].installation_authorized,false);
 assert.equal(discovered.external_action_performed,false);
});
