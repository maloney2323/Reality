import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {continueGovernedOperationalSelfRepair as run}
 from '../src/reality-governed-operational-self-repair-v1.js';
const owner='11111111-2222-4333-8444-555555555555';
const work='work:'+'b'.repeat(32);
const warrantId='22222222-3333-4444-8555-666666666666';
const failureId='33333333-4444-4555-8666-777777777777';
const candidateId='44444444-5555-4666-8777-888888888888';
const resumedId='55555555-6666-4777-8888-999999999999';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const bad='function calculate(amount) { return amount + 1; }';
const good='function calculate(amount) { return amount * 2; }';
const original={
 status:'ORIGINAL_OWNER_WORK_AUTHORIZED',owner_id:owner,
 original_work_id:work,execution_authorized:true,
 nonconsequential:true,settled:false,production_changed:false
};
const grant={
 status:'OWNER_EXACT_ISOLATED_REPAIR_WARRANT_ACTIVE',
 warrant_id:warrantId,owner_id:owner,original_work_id:work,
 scope:'ISOLATED_NONCONSEQUENTIAL_INTERNAL_REPAIR',
 owner_approved:true,revoked:false,
 allowed_steps:['repair','resume'],
 expires_at:'2099-11-17T12:00:00Z',
 installation_authorized:false,production_changed:false
};
const calculation=source=>{
 const ctx={};runInNewContext(source+'\nthis.testOutput=calculate(5);',ctx);
 return ctx.testOutput;
};
async function demo({mode='pass',authorized=grant,originalJob=original}={}){
 const dir=await mkdtemp(path.join(tmpdir(),'reality-autorepair-'));
 const target=path.join(dir,'isolated-original-job.js');
 await writeFile(target,bad,'utf8');
 let applyCount=0, originalRunCount=0,verifyCount=0,savedCount=0;
 const actions=[];
 const adapters={
  original:originalJob,warrant:authorized,
  observeFrozenFailure:async()=>{
   const src=await readFile(target,'utf8');
   assert.equal(src,bad);assert.notEqual(calculation(src),10);
   actions.push('observed_independent_red');
   return {
    status:'CURRENT_ORIGINAL_FAILURE_REPRODUCED',
    owner_id:owner,original_work_id:work,
    independent:true,verified:false,frozen_test_failed:true,
    evidence_sha256:sha(src+':expected=10:observed='+calculation(src)),
    receipt_id:failureId,
    external_action_performed:false,provider_effect_may_have_occurred:false
   };
  },
  independentlyTestCandidate:async request=>{
   assert.equal(request.failure_receipt_id,failureId);
   // "Model candidate" is injected as data. It is NOT executed as a function
   // or treated as authority. A separate VM checks the candidate first.
   const proposed=mode==='badcandidate'?bad:good;
   const actual=calculation(proposed);
   if(actual!==10) return {
    status:'FROZEN_CANDIDATE_RED',independent:true
   };
   actions.push('candidate_independently_green');
   return {
    status:'INDEPENDENT_CANDIDATE_RED_TO_GREEN_VERIFIED',
    owner_id:owner,original_work_id:work,
    failure_receipt_id:request.failure_receipt_id,
    candidate_sha256:sha(proposed),
    candidate_test_sha256:sha('calculate(5)===10'),
    receipt_id:candidateId,independent:true,
    external_action_performed:false,production_changed:false
   };
  },
  loadRepairAdapter:async ({candidate})=>{
   const workItem={work_item_id:work,workflow_id:'workflow:'+work,
    connector:null,operation:'isolated_repair',consequential:false};
   return {
    candidate_sha256:candidate.candidate_sha256,
    original_work_id:work,workItem,
    authorization:{authorization_id:warrantId,authorized:true},
    connector:{execute:async()=>{
     applyCount++;
     actions.push('existing_engine_applied_isolated_patch');
     await writeFile(target,good,'utf8');
     return {providerExecutionId:'isolated:patch',
      observation:{candidate_sha256:sha(good)}};
    }},
    independentVerifier:{verify:async()=>{
     verifyCount++;
     const src=await readFile(target,'utf8');
     return {verified:src===good&&calculation(src)===10,
      independent:true,basis:'independently reopened isolated file',
      observedState:{sha256:sha(src),output:calculation(src)}};
    }}
   };
  },
  loadOriginalResumeAdapter:async()=>{
   const workItem={work_item_id:work,workflow_id:'workflow:'+work,
    connector:null,operation:'read',consequential:false};
   return {
    original_work_id:work,workItem,
    authorization:{authorization_id:warrantId,authorized:true},
    connector:{execute:async()=>{
     originalRunCount++;actions.push('same_original_job_resumed');
     const src=await readFile(target,'utf8');
     return {providerExecutionId:'isolated:original-read',
      observation:{result:calculation(src)}};
    }},
    independentVerifier:{verify:async()=>{
     const src=await readFile(target,'utf8');
     return {verified:calculation(src)===10&&
      runInNewContext(src+'\ncalculate(7)')===14,
      independent:true,basis:'independently read the original source',
      observedState:{result5:calculation(src),result7:14}};
    }}
   };
  },
  independentlyResumeOriginal:async data=>{
   assert.equal(data.original_execution.status,'VERIFIED');
   assert.equal(data.original_execution.verification.independent,true);
   assert.equal(originalRunCount,1);
   actions.push('original_independently_verified');
   return {
    status:'SAME_ORIGINAL_JOB_INDEPENDENTLY_RESUMED',
    receipt_id:resumedId,owner_id:owner,original_work_id:work,
    candidate_sha256:data.candidate_sha256,
    original_execution_authorized:true,
    independent:true,verified:true,
    external_action_performed:false,
    evidence_sha256:sha('original resumed after '+data.candidate_sha256)
   };
  },
  settleOriginal:async x=>{
   savedCount++;
   assert.equal(x.failure_receipt_id,failureId);
   assert.equal(x.resumed_receipt_id,resumedId);
   assert.equal(x.production_changed,false);
   const receipt={
    ...x,status:'EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED',
    independently_verified:true,external_action_performed:false,
    final_receipt_sha256:sha(JSON.stringify(x))
   };
   const file=path.join(dir,'independent-final-receipt.json');
   await writeFile(file,JSON.stringify(receipt));
   assert.deepEqual(JSON.parse(await readFile(file,'utf8')),receipt);
   actions.push('durable_final_receipt_read_back');
   return receipt;
  }
 };
 try{
  let result=null,error=null;
  try{result=await run(adapters)}catch(e){error=e}
  return {result,error,actions,applyCount,originalRunCount,verifyCount,savedCount,
   source:await readFile(target,'utf8')};
 }finally{await rm(dir,{recursive:true,force:true})}
}
test('controlled REAL isolated red -> tested candidate -> existing governed repair engine -> same original -> independently verified final receipt',async()=>{
 const a=await demo();
 assert.equal(a.error,null);
 assert.equal(a.result.status,'EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED');
 assert.equal(a.result.existing_governed_executor_used,true);
 assert.equal(a.result.original_work_resumed,true);
 assert.equal(a.result.independent_final_receipt_verified,true);
 assert.equal(a.result.production_changed,false);
 assert.equal(a.result.installation_authorized,false);
 assert.equal(a.applyCount,1);
 assert.equal(a.originalRunCount,1);
 assert.equal(a.verifyCount,1);
 assert.equal(a.savedCount,1);
 assert.equal(a.source,good);
 assert.deepEqual(a.actions,[
  'observed_independent_red','candidate_independently_green',
  'existing_engine_applied_isolated_patch','same_original_job_resumed',
  'original_independently_verified','durable_final_receipt_read_back'
 ]);
});
test('unverified independent candidate never patches original or attempts resumption',async()=>{
 const a=await demo({mode:'badcandidate'});
 assert.match(a.error?.message||'',/INDEPENDENT_SCOPED_CANDIDATE_TEST_REQUIRED/);
 assert.equal(a.applyCount,0);
 assert.equal(a.originalRunCount,0);
 assert.equal(a.savedCount,0);
 assert.equal(a.source,bad);
});
test('no owner grant, revoked grant or wrong owner never attempts source change',async()=>{
 for(const badGrant of [
  {...grant,revoked:true},
  {...grant,owner_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},
  {...grant,allowed_steps:['repair']},
  {...grant,scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'},
  {...grant,owner_approved:false}
 ]){
  const a=await demo({authorized:badGrant});
  assert.match(a.error?.message||'',/EXACT_BOUND_ACTIVE_OWNER_WARRANT_REQUIRED/);
  assert.equal(a.applyCount,0);assert.equal(a.savedCount,0);
  assert.equal(a.source,bad);
 }
});
test('an invented original job never becomes an authorized repair',async()=>{
 const a=await demo({originalJob:{...original,execution_authorized:false}});
 assert.match(a.error?.message||'',/EXACT_EXISTING_OWNER_ORIGINAL_REQUIRED/);
 assert.equal(a.applyCount,0);
});
