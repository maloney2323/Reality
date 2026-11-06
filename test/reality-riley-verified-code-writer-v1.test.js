import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFoundationalBuildTicket,validateFoundationalCandidate}
 from '../src/reality-foundational-build-loop-v1.0.js';
import {authorizeRileyCandidateStage,stageRileyVerifiedCandidate}
 from '../src/reality-riley-verified-code-writer-v1.js';
const BASE='a'.repeat(40),TREE='b'.repeat(40),STAGED='c'.repeat(40);
const COMMIT='d'.repeat(40),WORK='work:'+'e'.repeat(32);
const ART='f'.repeat(64),ID='11111111-2222-4333-8444-555555555555';
const RUN=12345,ROOT='https://api.github.com/repos/maloney2323/Reality';
function fixture(){
 const ticket=createFoundationalBuildTicket({
  owner_id:ID,goal_id:'goal:test',
  goal_transition_receipt_ref:'goal-transition:test',
  goal_evidence_ref:'continuity:goal-transition:test',
  original_work_id:WORK,continuity_root_id:'root:test',
  worldline_id:'worldline:test',
  confirmed_gap_receipt_ref:'continuity:gap:test',
  confirmed_gap_evidence_hash:ART,
  frozen_regression_manifest_ref:'verified_issue_gap',
  frozen_regression_sha256:ART,
  frozen_regression_contract_kind:'PINNED_SINGLE_TEST',
  frozen_test_path:'test/reality-frozen-regressions/verified-gap.test.js',
  repository_base_sha:BASE,
  repository_branch:'feature/reality-general-capability-engine-20261101',
  source_entrypoint:'src/reality-extensions/riley-verified-gap.mjs',
  environment:'ISOLATED_PREVIEW',max_attempts:3,
  confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
  allowed_source_roots:['src/reality-extensions/','test/reality-extensions/']
 });
 const candidate=validateFoundationalCandidate(ticket,{
  ticket_hash:ticket.ticket_hash,original_work_id:WORK,
  model_response_id:'resp_real_model_1',
  rationale:'Fix the independently reproduced missing instrument.',
  files:[
   {path:'src/reality-extensions/riley-verified-gap.mjs',
    content:'export const verifiedCapability = true;\n'},
   {path:'test/reality-extensions/riley-verified-gap.test.js',
    content:"import test from 'node:test';import assert from 'node:assert/strict';test('repair',()=>assert.ok(true));\n"}
  ]
 });
 const admission={repository_sha:BASE,installation_authorized:false,
  queued:[{trigger_id:ID,source_event_id:ID,original_work_id:WORK}],
  previously_claimed:[]};
 const proposal={ticket,candidate,source:'REAL_OPENAI_MODEL_GENERATION',
  installation_authorized:false,original_job_completed:false};
 const proof={schema:'reality-genuine-sandbox-v1',
  original_work_id:WORK,artifact_sha256:candidate.artifact_sha256,
  ticket_hash:ticket.ticket_hash,model_response_id:candidate.model_response_id,
  frozen_test_path:ticket.frozen_test_path,
  frozen_suite_sha256:ticket.frozen_regression_sha256,
  workflow_run_id:String(RUN),runner_git_sha:BASE,
  runner_isolation:'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS',
  passed:true,
  frozen_result:{exit_code:0,tests:17,fail:0},
  candidate_result:{exit_code:0,tests:2,fail:0},
  installation_authorized:false,original_job_completed:false,
  production_changed:false};
 const qualification={status:'AWAITING_OWNER_APPROVAL',
  original_work_id:WORK,artifact_sha256:candidate.artifact_sha256,
  pre_state_hash:ART,post_state_hash:ART,
  valid_time:'2026-11-06T14:15:00Z',
  transaction_time:'2026-11-06T14:15:01Z',
  installation_authorized:false,original_job_completed:false};
 return {admission,proposal,proof,qualification,runId:RUN,
  baseCommitSha:BASE};
}
function gitProvider(plan,{collision=false,baseMoved=false,already=false}={}){
 let created=already;const calls=[];
 const reply=(value,status=200)=>({ok:status<400,status,
  json:async()=>value});
 const branch='/git/ref/heads/'+plan.branch;
 const handle=async(url,options={})=>{
  const path=url.slice(ROOT.length),method=options.method||'GET';
  calls.push({path,method,body:options.body?JSON.parse(options.body):null});
  if(path==='/git/ref/heads/feature/reality-general-capability-engine-20261101')
   return reply({object:{sha:baseMoved?'f'.repeat(40):BASE}});
  if(path==='/git/commits/'+BASE)
   return reply({sha:BASE,tree:{sha:TREE},parents:[]});
  if(path==='/git/trees/'+TREE+'?recursive=1')
   return reply({sha:TREE,truncated:false,
    tree:collision?[{path:plan.files[0].path}]:[]});
  if(path===branch){
   if(!created)return reply({},404);
   return reply({object:{sha:COMMIT}});
  }
  if(path==='/git/commits/'+COMMIT)
   return reply({sha:COMMIT,tree:{sha:STAGED},
    parents:[{sha:BASE}]});
  if(path==='/git/trees/'+STAGED+'?recursive=1')
   return reply({sha:STAGED,truncated:false,
    tree:plan.files.map(f=>({path:f.path}))});
  if(path.startsWith('/contents/')){
   const f=plan.files.find(x=>path.startsWith('/contents/'+x.path+'?'));
   return f?reply({path:f.path,content:Buffer.from(f.content).toString('base64')}):
    reply({},404);
  }
  if(path==='/git/trees'&&method==='POST'){
   assert.equal(options.body&&JSON.parse(options.body).base_tree,TREE);
   return reply({sha:STAGED});
  }
  if(path==='/git/commits'&&method==='POST')
   return reply({sha:COMMIT,tree:{sha:STAGED},parents:[{sha:BASE}]});
  if(path==='/git/refs'&&method==='POST'){
   created=true;
   return reply({ref:'refs/heads/'+plan.branch,object:{sha:COMMIT}});
  }
  throw Error('MOCK_GIT_UNEXPECTED_'+method+'_'+path);
 };
 return {calls,fetchImpl:handle};
}
test('Riley refuses unfrozen, foreign or unapproved generated code',()=>{
 const f=fixture();
 const plan=authorizeRileyCandidateStage(f);
 assert.equal(plan.original_work_id,WORK);
 assert.equal(plan.independent_verification_passed,true);
 assert.equal(plan.files.length,2);
 assert.equal(plan.owner_installation_approved,false);
 assert.equal(plan.installation_performed,false);
 assert.equal(plan.original_job_settled,false);
 assert.match(plan.branch,/^reality\/riley\/verified-/);
 for(const changed of [
  {proof:{...f.proof,passed:false}},
  {proof:{...f.proof,workflow_run_id:'999'}},
  {proof:{...f.proof,runner_isolation:'HOST_NETWORK_ENABLED'}},
  {proposal:{...f.proposal,source:'SIMULATED_MODEL'}},
  {qualification:{...f.qualification,status:'MODEL_SAYS_APPROVED'}},
  {qualification:{...f.qualification,original_work_id:'work:'+'a'.repeat(32)}},
  {admission:{...f.admission,queued:[],previously_claimed:[]}},
  {admission:{...f.admission,installation_authorized:true}},
  {baseCommitSha:'b'.repeat(40)}
 ]){
  assert.throws(()=>authorizeRileyCandidateStage({...f,...changed}),
   /RILEY_VERIFIED_WRITER_|FOUNDATION_/);
 }
});
test('credentialed writer rejects caller-forged approval flags and immutable file mutation',async()=>{
 const plan=authorizeRileyCandidateStage(fixture());
 assert.equal(Object.isFrozen(plan),true);
 assert.equal(Object.isFrozen(plan.files),true);
 assert.equal(Object.isFrozen(plan.files[0]),true);
 assert.throws(()=>plan.files.push({path:'src/reality-extensions/unverified.mjs',
  content:'unverified'}),TypeError);
 const forged={...plan,code_staging_permitted:true};
 let providerCalls=0;
 await assert.rejects(stageRileyVerifiedCandidate({
  plan:forged,token:'isolated-gh-token-without-production-install',
  fetchImpl:async()=>{providerCalls++;throw Error('PROVIDER_NOT_ALLOWED')}
 }),/RILEY_VERIFIED_WRITER_TRUSTED_VERIFIED_CANDIDATE/);
 assert.equal(providerCalls,0);
});
test('a verified candidate becomes actual Git source on a new isolated branch',async()=>{
 const plan=authorizeRileyCandidateStage(fixture());
 const provider=gitProvider(plan);
 const output=await stageRileyVerifiedCandidate({plan,
  token:'isolated-gh-token-without-production-install',fetchImpl:provider.fetchImpl});
 assert.equal(output.status,'EXACT_VERIFIED_RILEY_CODE_STAGED_IN_ISOLATION');
 assert.equal(output.commit_sha,COMMIT);
 assert.equal(output.branch,plan.branch);
 assert.equal(output.model_generated,true);
 assert.equal(output.independent_verification_passed,true);
 assert.equal(output.new_branch_created,true);
 assert.equal(output.installation_authorized,false);
 assert.equal(output.original_job_settled,false);
 assert.equal(output.production_changed,false);
 const writes=provider.calls.filter(c=>c.method==='POST');
 assert.deepEqual(writes.map(x=>x.path),['/git/trees','/git/commits','/git/refs']);
 assert.deepEqual(writes.at(-1).body,{
  ref:'refs/heads/'+plan.branch,sha:COMMIT
 });
 assert.equal(writes[0].body.tree.length,2);
});
test('idempotent wake with already staged branch is no new execution',async()=>{
 const plan=authorizeRileyCandidateStage(fixture());
 const provider=gitProvider(plan,{already:true});
 const result=await stageRileyVerifiedCandidate({
  plan,token:'isolated-gh-token-without-production-install',fetchImpl:provider.fetchImpl});
 assert.equal(result.status,'EXACT_VERIFIED_RILEY_CODE_ALREADY_STAGED');
 assert.equal(result.new_branch_created,false);
 assert.equal(provider.calls.some(x=>x.method==='POST'),false);
});
test('moved base, existing target code and provider uncertainty stop before branch creation',async()=>{
 const plan=authorizeRileyCandidateStage(fixture());
 for(const scenario of [{baseMoved:true},{collision:true}]){
  const provider=gitProvider(plan,scenario);
  await assert.rejects(stageRileyVerifiedCandidate({
   plan,token:'isolated-gh-token-without-production-install',fetchImpl:provider.fetchImpl
  }),/RILEY_VERIFIED_WRITER_/);
  assert.equal(provider.calls.some(x=>x.method==='POST'),false);
 }
 const bad={...plan,installation_performed:true};
 await assert.rejects(stageRileyVerifiedCandidate({
  plan:bad,token:'isolated-gh-token-without-production-install',
  fetchImpl:async()=>{throw Error('must not fetch')}
 }),/RILEY_VERIFIED_WRITER_TRUSTED_VERIFIED_CANDIDATE/);
});
test('writer stage is isolated from OpenAI keys and independent sandbox secrets',()=>{
 const script=readFileSync(new URL(
  '../scripts/reality-riley-stage-verified-code-v1.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL(
  '../.github/workflows/reality-genuine-capability-auto-trigger-v1.yml',
  import.meta.url),'utf8');
 assert.match(script,/GITHUB_REF!=='refs\/heads\/feature\/reality-general-capability-engine-20261101'/);
 assert.match(script,/authorizeRileyCandidateStage/);
 assert.match(script,/stageRileyVerifiedCandidate/);
 assert.match(script,/owner_installation_pending:true/);
 assert.doesNotMatch(script,/OPENAI_API_KEY|installApproved|mergeToMain/);
 assert.match(workflow,/stage_riley_verified_source:/);
 assert.match(workflow,/needs: qualify_verified_capability/);
 assert.match(workflow,/scripts\/reality-riley-stage-verified-code-v1.mjs/);
 assert.match(workflow,/reality-owner-review-receipt-\$\{\{ github.run_id \}\}/);
 assert.match(workflow,/reality-riley-verified-source-\$\{\{ github.run_id \}\}/);
 assert.match(workflow,/contents: write/);
});
