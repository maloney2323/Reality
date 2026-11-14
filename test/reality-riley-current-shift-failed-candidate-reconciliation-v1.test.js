import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {reconcileCurrentShiftRejectedNativeModelCandidate}
 from '../src/reality-riley-current-shift-failed-candidate-reconciliation-v1.js';
const shift='9460cfff-937a-4105-9093-2e41ab39a950';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const original='work:45206a326ddf406b1c083a819da24aaa';
const issue='https://github.com/maloney2323/Reality/issues/185';
const ref='reality/riley/candidate-185-45206a326d';
const sha='a'.repeat(40);
const runId=43535469985;
const candidatePath='src/reality-riley-service-original-runtime-v1.js';
const testPath='test/reality-riley-service-original-runtime-v1.test.js';
const src=Buffer.from("export function governedSource(){return true;}\n".repeat(20));
const frozen=Buffer.from('model proposal must not underreport a real governed capability response\n'+
 'assert.equal(output.governed_code_generation_connected,true\n'+
 'original source-backed frozen test\n'.repeat(6));
const sha256=b=>'sha256:'+createHash('sha256').update(b).digest('hex');
const gitSha=b=>createHash('sha1').update('blob '+b.length+'\0')
 .update(b).digest('hex');
const asBlob=(b,path)=>({path,encoding:'base64',content:b.toString('base64'),
 size:b.length,sha:gitSha(b)});
const model='resp_01cc809f46882a6a016af7abc723b887d289205bfb430bd4d3';
const candidate={
 status:'CURRENT_OWNER_SIGNED_NATIVE_MODEL_DRAFT_READY_FOR_INDEPENDENT_CI',
 owner_id:owner,shift_id:shift,source_ref:issue,
 original_work_id:original,candidate_source_path:candidatePath,
 base_commit_sha:'b'.repeat(40),proposed_sha256:sha256(src),
 source_proof_sha256:'sha256:'+'c'.repeat(64),
 model_response_id:model,independent_source_qualification_run_id:43532232832,
 installation_authorized:false,original_job_completed:false,
 production_changed:false
};
const run={id:runId,name:'Reality Riley 185 independently tested isolated candidate',
 path:'.github/workflows/reality-riley-185-isolated-candidate-proof.yml',
 head_sha:sha,head_branch:ref,head_repository:{full_name:'maloney2323/Reality'},
 status:'completed',conclusion:'failure',
 html_url:'https://github.com/maloney2323/Reality/actions/runs/'+runId};
const jobs={jobs:[{
 name:'independently-replay-repair-acceptance',run_id:runId,
 conclusion:'failure',steps:[
  {name:'Independently verify model-written candidate syntax',conclusion:'success'},
  {name:'Test real same-original handoff and falsifiable capability flags',
   conclusion:'failure'}]}]};
const db={strictSecrets:true,project:'preview'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'preview'};
const provider=(overrides={})=>async url=>{
 let body;
 if(url.endsWith('/git/ref/heads/'+ref))
  body={ref:'refs/heads/'+ref,object:{sha}};
 else if(url.endsWith('/git/commits/'+sha))
  body={sha,parents:[{sha:'b'.repeat(40)}]};
 else if(url.includes('/actions/runs?branch='))
  body={workflow_runs:[overrides.run||run]};
 else if(url.endsWith('/contents/'+candidatePath+'?ref='+sha))
  body=overrides.sourceBlob||asBlob(src,candidatePath);
 else if(url.endsWith('/contents/'+testPath+'?ref='+sha))
  body=asBlob(frozen,testPath);
 else if(url.endsWith('/actions/runs/'+runId))
  body=overrides.run||run;
 else if(url.includes('/actions/runs/'+runId+'/jobs?'))
  body=overrides.jobs||jobs;
 else throw Error('Unexpected provider request '+url);
 return {ok:true,json:async()=>body};
};
test('independent frozen provider RED persists one exact failure on SAME warrant-bound original',async()=>{
 let recorded=0;
 const result=await reconcileCurrentShiftRejectedNativeModelCandidate({
  db,env,fetchImpl:provider(),
  callRpc:async(_,name,args)=>{
   if(name==='reality_read_current_shift_native_candidate_for_frozen_verification_v1')
    return candidate;
   assert.equal(name,'reality_record_current_shift_native_candidate_ci_failure_v1');
   assert.equal(args.p_original_work_id,original);
   assert.equal(args.p_model_response_id,model);
   assert.equal(args.p_proposed_sha256,sha256(src));
   assert.equal(args.p_tested_commit_sha,sha);
   assert.equal(args.p_independent_run_id,runId);
   assert.equal(args.p_frozen_test_sha256,sha256(frozen).slice(7));
   recorded++;
   return {status:'SAME_SIGNED_ORIGINAL_REPAIR_DRAFT_INDEPENDENT_CI_REJECTED',
    original_work_id:original,model_response_id:model,
    shift_id:shift,owner_id:owner,independent_run_id:runId,
    independent_run_url:run.html_url,
    installation_authorized:false,original_job_completed:false,
    production_changed:false};
  }
 });
 assert.equal(result.independent_failure_recorded,true);
 assert.equal(result.new_shift_created,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(recorded,1);
});
test('source checksum mismatch fails BEFORE service-role failure receipt',async()=>{
 let recorded=0;
 await assert.rejects(()=>reconcileCurrentShiftRejectedNativeModelCandidate({
  db,env,fetchImpl:provider({sourceBlob:asBlob(Buffer.from('forged'.repeat(300)),
   candidatePath)}),
  callRpc:async(_,name)=>{
   if(name==='reality_read_current_shift_native_candidate_for_frozen_verification_v1')
    return candidate;
   recorded++;throw Error('UNAUTHORIZED_RECORD');
  }
 }),/RILEY_SHIFT_FROZEN_CANDIDATE_MODEL_CANDIDATE_SHA_OR_FROZEN_ACCEPTANCE_DRIFT/);
 assert.equal(recorded,0);
});
test('passing, incomplete, or stale CI cannot become corrective authority',async()=>{
 let recorded=0;
 for(const changed of [
  {...run,conclusion:'success'},
  {...run,status:'in_progress',conclusion:null},
  {...run,head_sha:'f'.repeat(40)}
 ]){
  const result=await reconcileCurrentShiftRejectedNativeModelCandidate({
   db,env,fetchImpl:provider({run:changed}),
   callRpc:async(_,name)=>{
    if(name==='reality_read_current_shift_native_candidate_for_frozen_verification_v1')
     return candidate;
    recorded++;throw Error('FORBIDDEN');
   }
  });
  assert.equal(result.independent_failure_recorded,false);
 }
 assert.equal(recorded,0);
});
test('no unsettled exact owner original makes no provider or database write',async()=>{
 const result=await reconcileCurrentShiftRejectedNativeModelCandidate({
  db,env,fetchImpl:async()=>{throw Error('FORBIDDEN')},
  callRpc:async(_,name)=>{
   assert.equal(name,'reality_read_current_shift_native_candidate_for_frozen_verification_v1');
   return {status:'CURRENT_ORIGINAL_FAILURE_ALREADY_INDEPENDENTLY_RECORDED'};
  }
 });
 assert.equal(result.independent_failure_recorded,false);
});
test('worker retains frozen failure before corrective model and only service-role RPCs',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261114_same_shift_native_candidate_failure_recovery_v1.sql',
  import.meta.url),'utf8');
 const i=worker.indexOf('await reconcileCurrentShiftRejectedNativeModelCandidate(');
 const j=worker.indexOf('await reviseCurrentRileyNativeRepair(');
 assert.ok(i>0&&j>i);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/SAME_SIGNED_ORIGINAL_REPAIR_DRAFT_INDEPENDENT_CI_REJECTED/);
 assert.match(sql,/independent_frozen_test_sha256/);
 assert.match(sql,/on conflict\(original_work_id\) do nothing/);
 assert.doesNotMatch(sql,/grant execute[^;]*to authenticated/);
});
