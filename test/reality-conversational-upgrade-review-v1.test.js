import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {readVerifiedResearchUpgradeForChat}
 from '../src/reality-verified-repair-chat-context-v1.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/reality/personal-chat.js',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const a=script.indexOf('// Verified candidate review lives inside Reality Chat');
const b=script.indexOf('async function realityChatRefreshEvents()',a);
assert.ok(a>0&&b>a);
const review=script.slice(a,b);
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const db={url:'https://hvkfreoagbrphwghjajw.supabase.co',
 project:'hvkfreoagbrphwghjajw',strictSecrets:true,secretKey:'fake-only'};
const session={user_id:owner,config:{url:db.url}};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const proof={
 key:'research:'+'6'.repeat(64),receipt_id:'43b0ecf1-1b05-4d41-b0e3-6d7cb3a60e76',
 finding_fingerprint:'6'.repeat(64),
 status:'FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED',
 proof_kind:'EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT',
 frozen_test_sha256:'f'.repeat(64),
 baseline_commit_sha:'a'.repeat(40),
 repair_commit_sha:'b'.repeat(40),
 pull_request_number:211,baseline_run_id:41712961166,green_run_id:41713111625,
 proven_defect_scope:'A real budget-integrity implementation defect',
 corrected_behavior:'Budget-bound identity and pre-evaluator call quotas',
 remaining_unproven:'Original-job settlement and complete provider token metering',
 observed_at:'2026-11-03T20:44:27Z',
 installed:false,owner_install_authorized:false,fresh_original_work_verified:false,
 production_changed:false,
 independent_red_assertion_failures:3,independent_green_assertion_passes:5,
 candidate_created_by:'ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH'
};
function authResult(p=proof){
 return {ok:true,status:'SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK',
  owner_id:owner,read_only:true,
  installation_authorized:false,production_changed:false,items:[p]};
}
function gapResult(p=proof){
 return {ok:true,read_only:true,
 installation_authorized:false,work_started:false,production_changed:false,
 counts:{verified_implementation_defects:1},
 items:[{key:p.key,kind:'RESEARCH_OPPORTUNITY',
   verified_missing_capability:false,installation_authorized:false,
   potential_value:'Potentially prevent excess evaluation calls',
   pros:['Safe execution budget'],cons:['Requires frozen provider tests'],
   repair_proof:p}]};
}
test('complete chat page parses and existing exact owner approval stays in chat',()=>{
 assert.doesNotThrow(()=>new vm.Script(script));
 assert.match(html,/id="realityChatVerifiedRepairReview"/);
 assert.match(html,/id="realityChatRepairReviewItems"/);
 assert.match(script,/void realityChatVerifiedRepairReview\(\)/);
 assert.match(script,/realityChatRenderApprovalInbox\(entries\)/);
 assert.match(script,/realityChatApproveOnce\(entry.original_work_id,q.artifact_sha256\)/);
 assert.match(script,/personal-qualified-capability-approve/);
});
test('trusted owner source creates a nonauthorizing model observation',async()=>{
 let requests=[];
 const r=await readVerifiedResearchUpgradeForChat({
  session,message:'Reality can I approve the budget upgrade in chat?',env,db,
  fetchImpl:async(url,opt)=>{
   requests.push({url,opt});return {ok:true,json:async()=>authResult()};
  }
 });
 assert.equal(r.length,1);
 assert.equal(r[0].owner_approval_eligible,false);
 assert.equal(r[0].installation_completed,false);
 assert.match(r[0].summary,/NOT authorized/);
 assert.match(r[0].summary,/must NOT be sent to GitHub/);
 assert.equal(requests[0].url,db.url+'/rest/v1/rpc/reality_read_owner_market_repair_proofs_v1');
 assert.equal(JSON.parse(requests[0].opt.body).p_owner_id,owner);
 assert.match(api,/readVerifiedResearchUpgradeForChat/);
 assert.match(api,/connected_world_observations:\[/);
 assert.match(api,/action_authorized:false,execution_authorized:false/);
});
test('forged source, claimed installation or wrong owner fail closed',async()=>{
 for(const bad of [
  {...proof,installed:true},
  {...proof,owner_install_authorized:true},
  {...proof,fresh_original_work_verified:true},
  {...proof,repair_commit_sha:'not-repair'},
 ]){
  const r=await readVerifiedResearchUpgradeForChat({
   session,message:'Can Reality install this?',env,db,
   fetchImpl:async()=>({ok:true,json:async()=>authResult(bad)})
  });
  assert.equal(r.length,0);
 }
 const r=await readVerifiedResearchUpgradeForChat({
  session,message:'Reality repair?',env,db,
  fetchImpl:async()=>({ok:true,json:async()=>({...authResult(),owner_id:'wrong'})})
 });
 assert.equal(r.length,0);
});
test('no query for unrelated conversation or if outside isolated Preview',async()=>{
 let count=0;
 const fetchImpl=async()=>{count++;return {ok:true,json:async()=>authResult()}};
 const a=await readVerifiedResearchUpgradeForChat({
  session,message:'Tell me about frogs',env,db,fetchImpl
 });
 const b=await readVerifiedResearchUpgradeForChat({
  session,message:'Can I install it?',env:{...env,VERCEL_ENV:'production'},db,fetchImpl
 });
 assert.deepEqual(a,[]);assert.deepEqual(b,[]);
 assert.equal(count,0);
});
function element(tag='div'){
 return {tag,textContent:'',children:[],className:'',
  append(...parts){this.children.push(...parts)},
  replaceChildren(...parts){this.children=[...parts]},
  listeners:{},addEventListener(type,fn){this.listeners[type]=fn},
  focus(){this.focused=true}
 };
}
function fixture(payload=gapResult(),signed=true){
 const nodes={
  realityChatRepairReviewItems:element(),
  realityChatRepairReviewStatus:element(),
  privatePrompt:element('textarea'),
  privateSend:{clicks:0,click(){this.clicks++}}
 };
 const state={fetches:0,ready:signed};
 const ctx={
  $:id=>nodes[id],document:{createElement:element},
  homeOwnerSignedIn:()=>state.ready,
  fetch:async(url,options)=>{state.fetches++;return {
   ok:true,json:async()=>payload}},
 };
 vm.createContext(ctx);vm.runInContext(review,ctx);
 return {ctx,state,nodes};
}
test('conversation card shows verified repair, risks and opens ordinary chat without granting approval',async()=>{
 const f=fixture();
 await vm.runInContext('realityChatVerifiedRepairReview()',f.ctx);
 assert.equal(f.nodes.realityChatRepairReviewItems.children.length,1);
 const card=f.nodes.realityChatRepairReviewItems.children[0];
 assert.match(card.children[0].textContent,/real repair/);
 assert.match(card.children[1].textContent,/Budget-bound/);
 assert.match(card.children[2].textContent,/Potential value/);
 assert.match(card.children[3].textContent,/Drawbacks/);
 assert.match(card.children[4].textContent,/3 frozen failures/);
 assert.match(card.children[6].textContent,/not GitHub/);
 assert.equal(card.children[7].textContent,'Talk to Reality about this upgrade');
 assert.equal(card.children.some(x=>/Approve this exact upgrade/.test(x.textContent)),false);
 card.children[7].listeners.click();
 assert.equal(f.nodes.privateSend.clicks,1);
 assert.match(f.nodes.privatePrompt.value,/explain the verified budget-integrity repair/);
 assert.match(f.nodes.privatePrompt.value,/our conversation/);
 assert.equal(f.state.fetches,1);
});
test('client rejects fabricated install and does not offer review',async()=>{
 const a=gapResult({...proof,installed:true});
 const f=fixture(a);
 await vm.runInContext('realityChatVerifiedRepairReview()',f.ctx);
 assert.equal(f.nodes.realityChatRepairReviewItems.children.length,0);
 assert.match(f.nodes.realityChatRepairReviewStatus.textContent,/unavailable/);
});
test('signed out chat never reads private review evidence',async()=>{
 const f=fixture(gapResult(),false);
 await vm.runInContext('realityChatVerifiedRepairReview()',f.ctx);
 assert.equal(f.state.fetches,0);
 assert.match(f.nodes.realityChatRepairReviewStatus.textContent,/Sign in/);
});
