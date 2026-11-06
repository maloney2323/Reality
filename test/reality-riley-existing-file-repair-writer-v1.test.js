import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {authorizeRileyExistingRepairStage,stageRileyExistingRepair}
 from '../src/reality-riley-existing-file-repair-writer-v1.js';
const OWNER='11111111-2222-4333-8444-555555555555';
const ORIGINAL='work:'+'a'.repeat(32);
const BASE='b'.repeat(40),TREE='c'.repeat(40);
const RESULT_TREE='d'.repeat(40),COMMIT='e'.repeat(40);
const SHAS='f'.repeat(64);
const branch='fix/reality-chat-fullscreen-verified-cycle-20261105';
const gitBlob=x=>{
 const data=Buffer.from(x,'utf8');
 return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fixture(){
 const original='export function compute(){return 1;}\n';
 const repair='export function compute(){return 2;}\n';
 const source='src/reality-riley-demo-logic.js';
 const files=[
  {path:source,content:repair},
  {path:'test/reality-riley-repairs/verified-demo.test.js',content:
    "import test from 'node:test';import assert from 'node:assert/strict';test('repair',()=>assert.equal(2,2));"}
 ];
 const ticket={schema:'reality-riley-existing-source-repair-v1',
  repository:'maloney2323/Reality',repository_branch:branch,
  repository_base_sha:BASE,owner_id:OWNER,
  original_work_id:ORIGINAL,issue_number:263,
  issue_url:'https://github.com/maloney2323/Reality/issues/263',
  goal_transition_receipt_ref:'goal:transition:verified',
  continuity_root_id:'root:verified',worldline_id:'worldline:verified',
  existing_source_path:source,existing_source_blob_sha:gitBlob(original),
  frozen_test_path:'test/reality-frozen-regressions/verified-demo.test.js',
  frozen_test_sha256:SHAS,failed_provider_run_id:1000};
 const admission={
  status:'CURRENT_OWNER_ORIGINAL_JOB_INDEPENDENTLY_QUALIFIED',
  owner_id:OWNER,original_work_id:ORIGINAL,source_issue_number:263,
  goal_transition_receipt_ref:ticket.goal_transition_receipt_ref,
  installation_authorized:false,original_job_completed:false,
  production_changed:false
 };
 const proposal={source:'REAL_OPENAI_MODEL_GENERATION',files,
  original_work_id:ORIGINAL,model_response_id:'resp_model_verified_12345',
  artifact_sha256:digest(files),installation_authorized:false,
  original_job_completed:false};
 const proof={schema:'reality-riley-existing-source-repair-proof-v1',
  github_run_id:123,runner_git_sha:BASE,original_work_id:ORIGINAL,
  owner_id:OWNER,source_issue_number:263,
  existing_source_blob_sha:ticket.existing_source_blob_sha,
  frozen_test_sha256:SHAS,frozen_test_path:ticket.frozen_test_path,
  candidate_artifact_sha256:proposal.artifact_sha256,
  model_response_id:proposal.model_response_id,
  runner_isolation:'DOCKER_NETWORK_NONE_READONLY_NO_SECRETS',
  passed:true,frozen_result:{exit_code:0,fail:0,tests:15},
  candidate_result:{exit_code:0,fail:0,tests:2},
  installation_authorized:false,production_changed:false,
  original_job_completed:false};
 const qualification={status:'AWAITING_EXACT_OWNER_INSTALL_APPROVAL',
  owner_id:OWNER,original_work_id:ORIGINAL,
  artifact_sha256:proposal.artifact_sha256,frozen_test_sha256:SHAS,
  pre_state_hash:SHAS,post_state_hash:SHAS,
  installation_authorized:false,original_job_completed:false,
  production_changed:false};
 return {ticket,admission,proposal,proof,qualification,runId:123,
  baseSha:BASE,baseBranch:branch};
}
function gitMock(plan,{moved=false,overwritten=false,already=false,drift=false}={}){
 const calls=[],ROOT='https://api.github.com/repos/maloney2323/Reality';
 let created=already;
 const pathHead='/git/ref/heads/'+branch;
 const pathCandidate='/git/ref/heads/'+plan.branch;
 const originalSha=overwritten?'0'.repeat(40):plan.source_blob_sha;
 const oldTree=[
  {path:plan.files[0].path,type:'blob',sha:originalSha}
 ];
 const newTree=[{path:plan.files[0].path,type:'blob',
  sha:gitBlob(plan.files[0].content)},
  {path:plan.files[1].path,type:'blob',
   sha:gitBlob(plan.files[1].content)}];
 const response=(status,j)=>({status,ok:status>=200&&status<300,
  json:async()=>j});
 async function fetchImpl(url,options={}){
  const path=url.slice(ROOT.length),method=options.method||'GET';
  const body=options.body?JSON.parse(options.body):null;
  calls.push({path,method,body});
  if(path===pathHead)return response(200,{object:{sha:moved?'7'.repeat(40):BASE}});
  if(path==='/git/commits/'+BASE)
   return response(200,{sha:BASE,tree:{sha:TREE}});
  if(path==='/git/trees/'+TREE+'?recursive=1')
   return response(200,{sha:TREE,truncated:false,tree:oldTree});
  if(path===pathCandidate)
   return created?response(200,{object:{sha:COMMIT}}):response(404,{});
  if(path==='/git/commits/'+COMMIT)
   return response(200,{sha:COMMIT,tree:{sha:RESULT_TREE},
    parents:[{sha:drift?'6'.repeat(40):BASE}]});
  if(path==='/git/trees/'+RESULT_TREE+'?recursive=1')
   return response(200,{sha:RESULT_TREE,truncated:false,tree:newTree});
  if(path==='/git/trees'&&method==='POST')
   return response(201,{sha:RESULT_TREE});
  if(path==='/git/commits'&&method==='POST')
   return response(201,{sha:COMMIT,tree:{sha:RESULT_TREE},
    parents:[{sha:BASE}]});
  if(path==='/git/refs'&&method==='POST'){
   created=true;return response(201,{ref:'refs/heads/'+plan.branch,
    object:{sha:COMMIT}});
  }
  throw Error('UNEXPECTED_GITHUB_'+path+' '+method);
 }
 return {fetchImpl,calls};
}
test('pinned repair and independent frozen-proof permit staging only on isolated branch',()=>{
 const f=fixture(),plan=authorizeRileyExistingRepairStage(f);
 assert.match(plan.branch,/^reality\/riley\/repair-/);
 assert.equal(plan.original_work_id,ORIGINAL);
 assert.equal(plan.installation_authorized,false);
 assert.equal(plan.original_job_settled,false);
});
test('forged owner, model, tests, file paths and old baseline are rejected',()=>{
 const f=fixture();
 const changes=[
  {ticket:{...f.ticket,owner_id:'someone-else'}},
  {ticket:{...f.ticket,existing_source_path:'api/reality/personal-chat.js'}},
  {ticket:{...f.ticket,frozen_test_path:'test/unsafe.test.js'}},
  {admission:{...f.admission,installation_authorized:true}},
  {admission:{...f.admission,original_job_completed:true}},
  {proposal:{...f.proposal,source:'SIMULATED_OPENAI'}},
  {proposal:{...f.proposal,artifact_sha256:SHAS}},
  {proposal:{...f.proposal,files:[{path:'src/reality-riley-demo-logic.js',
     content:'malicious replacement'},f.proposal.files[1]]}},
  {proposal:{...f.proposal,files:[f.proposal.files[0],
     {...f.proposal.files[1],path:'test/reality-frozen-regressions/verified-demo.test.js'}]}},
  {proof:{...f.proof,passed:false}},
  {proof:{...f.proof,runner_isolation:'NETWORK_ON_SECRETS_PRESENT'}},
  {proof:{...f.proof,frozen_test_sha256:'0'.repeat(64)}},
  {qualification:{...f.qualification,installation_authorized:true}},
  {baseBranch:'main'}
 ];
 for(const change of changes)
  assert.throws(()=>authorizeRileyExistingRepairStage({...f,...change}),
   /RILEY_EXISTING_REPAIR_/);
});
test('verified existing-source code and new regression test become a new Git branch',async()=>{
 const plan=authorizeRileyExistingRepairStage(fixture());
 const p=gitMock(plan);
 const result=await stageRileyExistingRepair({
  plan,token:'long-isolated-github-test-credential',fetchImpl:p.fetchImpl});
 assert.equal(result.status,'EXACT_RILEY_EXISTING_REPAIR_STAGED_IN_ISOLATION');
 assert.equal(result.commit_sha,COMMIT);
 assert.equal(result.source_path,plan.files[0].path);
 assert.equal(result.regression_test_path,plan.files[1].path);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_settled,false);
 assert.deepEqual(p.calls.filter(x=>x.method==='POST').map(x=>x.path),
  ['/git/trees','/git/commits','/git/refs']);
 assert.equal(p.calls.filter(x=>x.path==='/git/refs').length,1);
});
test('same isolated repair re-read without reexecution or a second Git write',async()=>{
 const plan=authorizeRileyExistingRepairStage(fixture()),p=gitMock(plan,{already:true});
 const result=await stageRileyExistingRepair({
  plan,token:'long-isolated-github-test-credential',fetchImpl:p.fetchImpl});
 assert.equal(result.status,'EXACT_RILEY_REPAIR_ALREADY_STAGED');
 assert.equal(result.already_staged,true);
 assert.equal(p.calls.filter(x=>x.method==='POST').length,0);
});
test('base drift, source changed, branch drift and forged plan stop all writes',async()=>{
 const plan=authorizeRileyExistingRepairStage(fixture());
 for(const options of [{moved:true},{overwritten:true},
  {already:true,drift:true}]){
  const p=gitMock(plan,options);
  await assert.rejects(stageRileyExistingRepair({
   plan,token:'long-isolated-github-test-credential',fetchImpl:p.fetchImpl
  }),/RILEY_EXISTING_REPAIR_/);
  assert.equal(p.calls.filter(x=>x.method==='POST').length,0);
 }
 const forged={...plan,installation_authorized:true};
 const p=gitMock(plan);
 await assert.rejects(stageRileyExistingRepair({
  plan:forged,token:'long-isolated-github-test-credential',fetchImpl:p.fetchImpl
 }),/RILEY_EXISTING_REPAIR_/);
 assert.equal(p.calls.length,0);
});
test('existing-file source writer never writes production or modifies frozen tests',()=>{
 const src=readFileSync(new URL(
  '../src/reality-riley-existing-file-repair-writer-v1.js',import.meta.url),'utf8');
 assert.match(src,/INDEPENDENT_FROZEN_REPAIR_PROOF_REQUIRED/);
 assert.match(src,/BASE_BRANCH_DRIFT/);
 assert.match(src,/SOURCE_CHANGED_OR_REGRESSION_TEST_ALREADY_EXISTS/);
 assert.match(src,/ISOLATED_BRANCH_FINAL_READBACK_REQUIRED/);
 assert.doesNotMatch(src,/refs\/heads\/main/);
});
