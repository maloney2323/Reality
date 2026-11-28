import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerFinalLoopChildApproval} from '../api/reality/owner-final-loop-child-approval.js';
const id='11111111-1111-4111-8111-111111111111',shift='22222222-2222-4222-8222-222222222222',packet='33333333-3333-4333-8333-333333333333';
const h=c=>'sha256:'+c.repeat(64);
const env={VERCEL_ENV:'preview',REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false',REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'fixture',REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'fixture',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:'isolated',REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:id,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift};
const body={intent:'APPROVE_BOUNDED_SAME_OBLIGATION_RECOVERY',packet_id:packet,proposal_fingerprint:h('a'),source_manifest_sha256:h('b')};
const readback={status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',owner_id:id,shift_id:shift,read_only:true,execution_authorized:false,original_job_completed:false,
 packets:[{packet_id:packet,source_manifest_sha256:h('b'),state:'EFFECT_RESERVED_RECONCILE_ONLY',
 recovery_qualification:{status:'SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION',proposal_sha256:h('a'),execution_authorized:false,
 new_attempt_authorized:false,replay_authorized:false,proposal:{historical_invocation_replay_authorized:false,new_budget_authorized:false}}}]};
const approved={status:'FINAL_LOOP_SAME_OBLIGATION_RECOVERY_APPROVED_ONCE',owner_id:id,shift_id:shift,packet_id:packet,source_manifest_sha256:h('b'),
 proposal_sha256:h('a'),historical_invocation_replay_authorized:false,approved:true,execution_authorized:false,child_originals_admitted:0,
 original_job_completed:false,production_changed:false,approval_receipt_sha256:h('c')};
async function run({request={},environment=env,session={user_id:id,config:{url:'https://fixture.invalid'}},read=readback,result=approved}={}){
 const calls=[];const res={code:0,value:null,setHeader(){return this},status(n){this.code=n;return this},json(x){this.value=x;return this}};
 await ownerFinalLoopChildApproval({method:'POST',headers:{origin:'https://reality.example',host:'reality.example'},body,query:{},...request},res,{
 env:environment,config:()=>{},authenticate:async()=>session,database:()=>({url:'https://fixture.invalid',project:'fixture',strictSecrets:true}),
 call:async(_db,name,args)=>{calls.push({name,args});return name==='reality_read_owner_final_loop_child_approvals_v1'?read:result}});
 return {res,calls};
}
test('authenticated exact recovery approval uses existing owner endpoint and service RPC once',async()=>{
 const {res,calls}=await run();assert.equal(res.code,200);assert.equal(res.value.historical_invocation_replay_authorized,false);
 assert.equal(res.value.execution_authorized,false);assert.equal(calls.length,2);
 assert.equal(calls[1].name,'reality_owner_approve_final_loop_child_v1');assert.equal(calls[1].args.p_owner_id,id);
 assert.equal(calls[1].args.p_proposal_fingerprint,h('a'));
});
test('foreign origin, owner, production, stale proposal and absent session cannot allocate a new approval',async()=>{
 for(const opts of [{request:{headers:{origin:'https://foreign.example',host:'reality.example'}}},{request:{headers:{host:'reality.example'}}},
 {environment:{...env,VERCEL_ENV:'production'}},{session:null},{session:{user_id:packet,config:{url:'https://fixture.invalid'}}},
 {request:{body:{...body,proposal_fingerprint:h('d')}}},{read:{...readback,packets:[]}},
 {request:{body:{...body,owner_id:packet}}}]){
  const {res,calls}=await run(opts);assert.notEqual(res.code,200);assert.equal(calls.filter(x=>x.name==='reality_owner_approve_final_loop_child_v1').length,0);
 }
});
test('uncertain or mismatched approval does not report success',async()=>{
 const {res}=await run({result:{...approved,proposal_sha256:h('d')}});assert.equal(res.code,409);
});
