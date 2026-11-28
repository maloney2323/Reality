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

test('authenticated canonical Chat reads its pinned shift without a dashboard read',async()=>{
 const {res,calls}=await run({request:{method:'GET',query:{}}});
 assert.equal(res.code,200);assert.equal(res.value.shift_id,shift);assert.equal(res.value.execution_authorized,false);
 assert.equal(calls.length,1);assert.equal(calls[0].name,'reality_read_owner_final_loop_child_approvals_v1');
 assert.equal(calls[0].args.p_owner_id,id);assert.equal(calls[0].args.p_shift_id,shift);
 for(const opts of [{request:{method:'GET',query:{shift_id:packet}}},{request:{method:'GET',query:{owner_id:packet}}},{request:{method:'GET',query:{}},session:null},{request:{method:'GET',query:{}},environment:{...env,VERCEL_ENV:'production'}},{request:{method:'GET',query:{}},session:{user_id:packet,config:{url:'https://fixture.invalid'}}}]){
 const x=await run(opts);assert.notEqual(x.res.code,200);assert.equal(x.calls.length,0);
 }
});

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('bounded continuation appears in main Chat when broad shift status is unavailable',async()=>{
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.hidden=false;this.disabled=false;this.events={};this.textContent='';}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(){}
  contains(n){return this.children.includes(n);}
  insertBefore(n,b){this.children.splice(this.children.indexOf(b),0,n);n.parentNode=this;}
  replaceChildren(...nodes){this.children=nodes;}

  addEventListener(k,f){this.events[k]=f;}
 }
 const ready=new Node('div');ready.style.display='block';const thread=new Node('div'),composer=new Node('form'),main=new Node('div');main.append(thread,composer);composer.parentNode=main;
 const calls=[];
 const fixture={packet_id:packet,source_ref:'https://github.com/maloney2323/Reality/pull/307',parent_original_work_id:'work:'+'1'.repeat(32),
 source_manifest_sha256:h('b'),approval_fingerprint:h('d'),acceptance_contract_sha256:h('e'),effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',file_count:34,proposed_scope_count:5,
 state:'EFFECT_RESERVED_RECONCILE_ONLY',approved:true,recovery_qualification:{status:'SAME_ORIGINAL_MISSING_REVIEW_WORK_QUALIFIED_FOR_EXACT_OWNER_DECISION',proposal_sha256:h('a'),execution_authorized:false,new_attempt_authorized:false,replay_authorized:false,
 proposal:{packet_id:packet,original_work_id:'work:'+'1'.repeat(32),source_manifest_sha256:h('b'),historical_invocation_replay_authorized:false,new_budget_authorized:false,prior_budget_preserved:true,missing_scope_count:4,preserved_verified_scope_count:1,proposed_max_new_provider_calls:8,proposed_max_new_prepare_calls:4,proposed_max_new_independent_verify_calls:4}}};
 vm.runInNewContext(readFileSync('reality-chat-final-loop-child-approval-v1.js','utf8'),{
 location:{pathname:'/chat'},document:{getElementById:k=>k==='privateReady'?ready:k==='privateTranscript'?thread:k==='realityChatComposer'?composer:null,createElement:k=>new Node(k),addEventListener(){}},
 window:{addEventListener(){}},MutationObserver:class{observe(){}},AbortSignal,encodeURIComponent,
 fetch:async (url,options)=>{calls.push(url);const root='/api/reality/owner-final-loop-child-approval';
 if(options.method==='POST'){
  assert.equal(url,root);assert.deepEqual(JSON.parse(options.body),body);
  return {ok:true,status:200,json:async()=>({...approved,ok:true,parent_original_work_id:fixture.parent_original_work_id})};
 }
 if(calls.length===1)return {ok:false,status:503,json:async()=>({ok:false,error:'FINAL_LOOP_CHILD_OWNER_APPROVAL_SERVICE_UNAVAILABLE'})};
 if(calls.length===4){
  assert.equal(url,root+'?shift_id='+shift);
  return {ok:true,status:200,json:async()=>({ok:true,shift_id:shift,packets:[{...fixture,recovery_approval:{approved:true,proposal_sha256:h('a'),approval_receipt_sha256:h('c')}}],owner_scope_verified:true,read_only:true,execution_authorized:false})};
 }
 assert.equal(url,root);
 return {ok:true,status:200,json:async()=>({ok:true,shift_id:shift,packets:[fixture],owner_scope_verified:true,read_only:true,execution_authorized:false})}}
 });
 const card=main.children[1];assert.equal(card.hidden,false);
 const flatten=x=>[x,...x.children.flatMap(flatten)];
 assert.deepEqual(calls,[]);
 const check=flatten(card).find(x=>x.textContent==='Check review decision');assert.ok(check&&!check.disabled);
 check.events.click();thread.replaceChildren(new Node('p'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['/api/reality/owner-final-loop-child-approval']);
 assert.equal(main.children[1],card);assert.equal(card.hidden,false);
 assert.ok(flatten(card).some(x=>x.textContent.includes('failed or timed out')));
 assert.equal(check.disabled,false);check.events.click();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['/api/reality/owner-final-loop-child-approval','/api/reality/owner-final-loop-child-approval']);
 assert.ok(flatten(card).some(x=>x.textContent==='Approve bounded continuation'&&!x.disabled&&!x.hidden));
 assert.ok(flatten(card).some(x=>x.textContent.includes('8 new read-only model calls')));
 const button=flatten(card).find(x=>x.textContent==='Approve bounded continuation');
 await button.events.click();
 assert.deepEqual(calls,['/api/reality/owner-final-loop-child-approval','/api/reality/owner-final-loop-child-approval','/api/reality/owner-final-loop-child-approval','/api/reality/owner-final-loop-child-approval?shift_id='+shift]);
 assert.ok(flatten(card).some(x=>x.textContent.includes('approval independently read back')));
 assert.equal(button.disabled,true);assert.equal(check.disabled,false);
 await button.events.click();assert.equal(calls.length,4);
});
