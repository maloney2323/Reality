import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {stageGeneralizedVerifiedOriginalInstallReview}
 from '../src/reality-generalized-original-install-review-v1.js';

const repo='https://api.github.com/repos/maloney2323/Reality';
const file='src/reality-riley-service-original-runtime-v1.js';
const target='reality/test-isolated-owner-preview',head='a'.repeat(40);
const originalCommit='b'.repeat(40),candidateCommit='c'.repeat(40),integratedCommit='d'.repeat(40);
const work='work:'+'e'.repeat(32);
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const attempt='788beab4-34e0-44ba-9577-1062ca459643';
const find='   typeof loaded.connector?.execute!==\x27function\x27||\n';
const before='// Real source-backed, approved owner original\n'.repeat(7)+
 '  if(loaded?.original_work_id!==ctx.original_work_id||\n'+find+
 '   typeof loaded.independent_verifier?.verify!==\x27function\x27)\n'+
 '   fail(\x27CURRENT_CONTINUITY_ORIGINAL_PRECLAIM_MISMATCH\x27);\n';
const after=before.replace(find,'');
const artifact='sha256:'+createHash('sha256').update(after).digest('hex');
const srcSha=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const fileResponse=(s)=>({path:file,sha:srcSha(s),size:Buffer.byteLength(s),
 encoding:'base64',content:Buffer.from(s).toString('base64')});
const claim={status:'PASSED_SAME_ORIGINAL_INSTALL_REVIEW_ELIGIBLE',
 attempt_id:attempt,original_work_id:work,shift_id:shift,owner_id:owner,
 source_ref:'https://github.com/maloney2323/Reality/issues/185',
 source_path:file,source_commit_sha:originalCommit,
 candidate_commit_sha:candidateCommit,candidate_artifact_sha256:artifact,
 independent_frozen_run_id:43653338050,
 replacement_find:find,replacement_with:'',
 installation_authorized:false,original_job_completed:false,
 production_changed:false};
const runID=43655077082;
const run={id:runID,status:'completed',conclusion:'success',event:'pull_request',
 head_sha:integratedCommit,head_branch:'reality/isolated-source-only-tested',
 name:'Reality — Isolated governed OpenAI gateway proof',
 path:'.github/workflows/reality-governed-openai-gateway-isolated-20261108.yml',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/'+runID};
const pr={number:304,state:'open',draft:true,
 base:{ref:target,repo:{full_name:'maloney2323/Reality'}},
 head:{ref:run.head_branch,sha:integratedCommit,repo:{full_name:'maloney2323/Reality'}}};
const db={strictSecrets:true,project:'hvkfreoagbrphwghjajw',
 secretKey:'service-isolated-test-secret-credentials'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:db.project,
 VERCEL_GIT_COMMIT_REF:target,VERCEL_GIT_COMMIT_SHA:head};
function rig({drifted=false,unrelatedFile=false,badPR=false,badRun=false,
 unsupportedClaim=false}={}){
 const requests=[];
 const callRpc=async(_db,name,args)=>{
  requests.push({rpc:name,args});
  if(name==='reality_read_next_generalized_verified_install_review_v1')
   return unsupportedClaim?{...claim,candidate_artifact_sha256:'sha256:'+'f'.repeat(64)}:claim;
  if(name==='reality_stage_generalized_original_install_review_v1'){
   assert.equal(args.p_attempt_id,attempt);
   assert.equal(args.p_target_branch,target);
   assert.equal(args.p_preinstall_blob,srcSha(before));
   assert.equal(args.p_installed_blob,srcSha(after));
   assert.equal(args.p_integration_commit,integratedCommit);
   assert.equal(args.p_integration_run_id,runID);
   assert.equal(args.p_integration_pr,304);
   return {status:'GENERALIZED_ORIGINAL_EXACT_REVIEW_STAGED_TRANSPORT_NOT_YET_READY',
    original_work_id:work,attempt_id:attempt,shift_id:shift,
    candidate_commit_sha:candidateCommit,candidate_artifact_sha256:artifact,
    independent_frozen_run_id:claim.independent_frozen_run_id,
    integrated_test_run_id:runID,
    expected_preinstall_blob_sha:srcSha(before),
    expected_installed_blob_sha:srcSha(after),
    owner_approval_ready:false,installation_authorized:false,
    original_job_completed:false,production_changed:false};
  }
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const fetchImpl=async(url,opts)=>{
  assert.ok(url.startsWith(repo),url);
  assert.equal(opts.method,'GET');
  requests.push({url});
  const route=url.slice(repo.length);
  let data;
  if(route==='/git/ref/heads/'+target)
   data={ref:'refs/heads/'+target,object:{sha:head}};
  else if(route.startsWith('/contents/'+file+'?ref=')){
   const ref=route.split('?ref=')[1];
   data=fileResponse(ref===integratedCommit?after:
    drifted&&ref===head?before+'drift':ref===candidateCommit?after:before);
  }else if(route.startsWith('/pulls?state=open&base='))
   data=[badPR?{...pr,draft:false}:pr];
  else if(route==='/pulls/304/files?per_page=100')
   data=unrelatedFile?[{filename:'src/other.js',status:'modified'}]:
    [{filename:file,status:'modified'}];
  else if(route==='/actions/runs?event=pull_request&per_page=100')
   data={workflow_runs:[badRun?{...run,conclusion:'failure'}:run]};
  else if(route==='/actions/runs/'+runID)
   data=run;
  else if(route==='/actions/runs/'+runID+'/jobs?per_page=60')
   data={jobs:[{run_id:runID,name:'boundary-tests',
    status:'completed',conclusion:'success',steps:[{
     name:'Verify Reality model boundary and original tool-continuation regressions',
     conclusion:'success'}]}]};
  else throw Error('UNEXPECTED_GITHUB_'+route);
  return {ok:true,json:async()=>data};
 };
 return {requests,fetchImpl,callRpc};
}
test('valid frozen original and source-only green integration CI stage an unapproved review',async()=>{
 const h=rig();
 const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
  db,env,fetchImpl:h.fetchImpl,callRpc:h.callRpc});
 assert.equal(outcome.status,'GENERALIZED_VERIFIED_ORIGINAL_INSTALL_REVIEW_STAGED');
 assert.equal(outcome.attempt_id,attempt);
 assert.equal(outcome.original_work_id,work);
 assert.equal(outcome.independent_integration_ci_run_id,runID);
 assert.equal(outcome.owner_approval_ready,false);
 assert.equal(outcome.installation_authorized,false);
 assert.equal(outcome.original_job_completed,false);
 assert.equal(h.requests.filter(x=>x.rpc==='reality_stage_generalized_original_install_review_v1').length,1);
 assert.equal(h.requests.some(x=>x.url&&x.url.includes('/contents/')&&
  x.method==='PUT'),false);
});
test('target preview source drift refuses to stage, install or approve',async()=>{
 const h=rig({drifted:true});
 const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
  db,env,fetchImpl:h.fetchImpl,callRpc:h.callRpc});
 assert.equal(outcome.status,'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED');
 assert.equal(h.requests.some(x=>x.rpc==='reality_stage_generalized_original_install_review_v1'),false);
});
test('integration PR must change exactly the trusted file',async()=>{
 const h=rig({unrelatedFile:true});
 const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
  db,env,fetchImpl:h.fetchImpl,callRpc:h.callRpc});
 assert.equal(outcome.owner_approval_ready,false);
 assert.equal(outcome.status,'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED');
 assert.equal(h.requests.some(x=>x.rpc==='reality_stage_generalized_original_install_review_v1'),false);
});
test('an unapproved PR or failed general CI cannot be promoted to owner review',async()=>{
 for(const flags of [{badPR:true},{badRun:true}]){
  const h=rig(flags);
  const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
   db,env,fetchImpl:h.fetchImpl,callRpc:h.callRpc});
  assert.equal(outcome.status,'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED');
  assert.equal(h.requests.some(x=>x.rpc==='reality_stage_generalized_original_install_review_v1'),false);
 }
});
test('a model supplied artifact hash not matching actual exact candidate bytes is rejected',async()=>{
 const h=rig({unsupportedClaim:true});
 const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
  db,env,fetchImpl:h.fetchImpl,callRpc:h.callRpc});
 assert.equal(outcome.status,'GENERALIZED_REVIEW_PROVIDER_SOURCE_OR_RELEASE_PROOF_UNVERIFIED');
 assert.equal(h.requests.some(x=>x.rpc==='reality_stage_generalized_original_install_review_v1'),false);
});
test('without preview service identity, no provider calls or staging occur',async()=>{
 const h=rig();
 const outcome=await stageGeneralizedVerifiedOriginalInstallReview({
  db,env:{...env,VERCEL_ENV:'production'},
  fetchImpl:h.fetchImpl,callRpc:h.callRpc});
 assert.equal(outcome.status,'GENERALIZED_REVIEW_ISOLATED_SERVICE_UNVERIFIED');
 assert.equal(h.requests.length,0);
});
test('generalized original preapproval database forbids authenticated clients and early installation',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_generalized_verified_original_install_handoff_v1.sql',
  import.meta.url),'utf8');
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(sql,/riley_same_original_frozen_ci_attestations_v1/);
 assert.match(sql,/governed_employee_completion_warrants_v1|reality_read_current_shift_execution_graph_v1/);
 assert.match(sql,/no_claimed_readiness_without_all_three_gates/);
 assert.match(sql,/owner_approval_ready',false/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.doesNotMatch(sql,/GRANT EXECUTE[^;]*authenticated/i);
 assert.doesNotMatch(sql,/DELETE FROM reality_internal|DROP TABLE/i);
 assert.match(worker,/stageGeneralizedVerifiedOriginalInstallReview/);
 assert.match(worker,/generalized_original_install_review:generalizedInstallReview/);
});
