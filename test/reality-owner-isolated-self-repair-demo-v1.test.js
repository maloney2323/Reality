import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runIsolatedOwnerRepairDemo as run}
 from '../api/reality/personal-self-repair-demo.js';
const owner='11111111-2222-4333-8444-555555555555';
const work='work:'+'f'.repeat(32);
const warrant_id='22222222-3333-4444-8555-666666666666';
const grant={
 status:'OWNER_EXACT_ISOLATED_REPAIR_WARRANT_ACTIVE',
 owner_id:owner,original_work_id:work,warrant_id,
 scope:'ISOLATED_NONCONSEQUENTIAL_INTERNAL_REPAIR',
 owner_approved:true,revoked:false,
 allowed_steps:['repair','resume'],
 expires_at:'2099-12-31T00:00:00Z',
 demo_only:true,installation_authorized:false,
 production_changed:false
};
const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'isolated-test'
};
const db={project:'isolated-test',strictSecrets:true};
const model=async()=>({
 proposed:{operation:'multiply',operand:2},
 model_response_id:'resp_isolatedTest001'
});
function mocks({candidate=model}={}){
 const args=[];return{
  args,model:candidate,
  call:async(_db,name,payload)=>{
   args.push({name,payload});
   if(name!=='reality_settle_one_isolated_self_repair_demo_v1')
    throw Error('UNAUTHORIZED_RPC');
   assert.equal(payload.p_owner_id,owner);
   assert.equal(payload.p_warrant_id,warrant_id);
   assert.equal(payload.p_original_work_id,work);
   assert.match(payload.p_failure_hash,/^sha256:[a-f0-9]{64}$/);
   assert.match(payload.p_candidate_hash,/^sha256:[a-f0-9]{64}$/);
   assert.match(payload.p_resumed_hash,/^sha256:[a-f0-9]{64}$/);
   assert.match(payload.p_final_receipt_sha256,/^sha256:[a-f0-9]{64}$/);
   assert.equal(payload.p_model_response_id,'resp_isolatedTest001');
   return {
    status:'EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED',
    owner_id:owner,original_work_id:work,
    warrant_id,final_receipt_sha256:payload.p_final_receipt_sha256,
    independently_verified:true,external_action_performed:false,
    production_changed:false,demo_only:true,customer_job_completed:false
   };
  }
 };
}
test('owner-initiated isolated model candidate really patches temp source through Reality governed executor and resumes same original',async()=>{
 const m=mocks();
 const r=await run({ownerId:owner,grant,db,env,
  call:m.call,model:m.model});
 assert.equal(r.status,'EXACT_ORIGINAL_ISOLATED_SELF_REPAIR_VERIFIED');
 assert.equal(r.existing_governed_executor_used,true);
 assert.equal(r.original_work_resumed,true);
 assert.equal(r.independent_final_receipt_verified,true);
 assert.equal(r.original_job_completed,true);
 assert.equal(r.production_changed,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.demo_only,true);
 assert.equal(r.customer_job_completed,false);
 assert.match(r.final_receipt_sha256,/^sha256:[a-f0-9]{64}$/);
 assert.equal(m.args.length,1);
});
test('unverified model candidate fails isolated red/green without granting receipt',async()=>{
 const m=mocks({candidate:async()=>({
  proposed:{operation:'add',operand:1},
  model_response_id:'resp_isolatedTest001'
 })});
 await assert.rejects(run({ownerId:owner,grant,db,env,call:m.call,
  model:m.model}),/ISOLATED_DEMO_INDEPENDENT_CANDIDATE_GREEN_REQUIRED/);
 assert.equal(m.args.length,0);
});
test('invalid isolated grant, wrong owner and production environment fail before model or any write',async()=>{
 for(const opts of [
  {grant:{...grant,owner_approved:false}},
  {grant:{...grant,scope:'EVIDENCE_ONLY_EMPLOYEE_DISCOVERY_V1'}},
  {grant:{...grant,installation_authorized:true}},
  {grant:{...grant,owner_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}},
  {env:{...env,VERCEL_ENV:'production'}}
 ]){
  let modelCalls=0,dbCalls=0;
  await assert.rejects(run({
   ownerId:owner,grant:opts.grant||grant,env:opts.env||env,db,
   model:async()=>{modelCalls++;return model()},
   call:async()=>{dbCalls++;return {}}
  }),/ISOLATED_DEMO_/);
  assert.equal(modelCalls,0);assert.equal(dbCalls,0);
 }
});
test('owner POST and database refuse public clients, excessive retries and production writes',()=>{
 const api=readFileSync(new URL('../api/reality/personal-self-repair-demo.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../supabase/migrations/20261117_governed_self_repair_isolated_demo_v1.sql',import.meta.url),'utf8');
 const orchestrator=readFileSync(new URL('../src/reality-governed-operational-self-repair-v1.js',import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession\(req,res\)/);
 assert.match(api,/assertSameOrigin\(req\)/);
 assert.match(api,/RUN_ONE_ISOLATED_SELF_REPAIR_DEMO/);
 assert.match(api,/maxDuration=60/);
 assert.match(api,/continueGovernedOperationalSelfRepair/);
 assert.match(api,/model_response_id/);
 assert.match(sql,/v_count>=2/);
 assert.match(sql,/interval '10 minutes'/);
 assert.match(sql,/revoke execute on function public.reality_authorize_one_isolated_self_repair_demo_v1/);
 assert.match(orchestrator,/executeAuthorizedWork/);
 assert.match(orchestrator,/loadOriginalResumeAdapter/);
 assert.match(orchestrator,/SAME_ORIGINAL_JOB_INDEPENDENTLY_RESUMED/);
 assert.doesNotMatch(api,/GITHUB_TOKEN|STRIPE_SECRET/);
});
