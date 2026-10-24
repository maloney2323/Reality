import test from 'node:test';
import assert from 'node:assert/strict';
import {screenStandaloneMaterialDelivery,extractExplicitInspectionClaims}
 from '../src/reality-standalone-material-delivery-v1.0.js';
import {processStandaloneChat}
 from '../src/reality-standalone-chat-v0.1.js';
import {createStandaloneConversationScope}
 from '../src/reality-standalone-auth-v0.1.js';
import {createMaterialEvidenceEvent}
 from '../src/reality-universe-material-claim-verifier-v1.0.js';
import {validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
const user='e83340ec-4266-4c95-a6cd-929bc58b445e';
const scope=createStandaloneConversationScope({userId:user,conversationId:'job-1'});
const time='2026-11-17T10:30:00Z';
const materialScope={
 continuity_root_id:scope.continuity_root_id,
 worldline_id:scope.worldline_id,
 owner_user_id:scope.authenticated_user_id,
 work_item_id:scope.conversation_id,as_of:time,
};
const pass=createMaterialEvidenceEvent({
 scope:materialScope,entryId:'trusted-city:WR-41:PASS-01',
 subjectRef:'job:WR-41',stateKey:'inspection.current_clearance',
 value:'PASS',effectiveAt:'2026-11-16T08:00:00Z',
 knownAt:'2026-11-16T08:00:00Z',sourceRef:'provider:city:verified:WR-41',
});
const futureHold=createMaterialEvidenceEvent({
 scope:materialScope,entryId:'trusted-city:WR-41:HOLD-02',
 subjectRef:'job:WR-41',stateKey:'inspection.current_clearance',
 value:'SAFETY_HOLD',effectiveAt:'2026-11-18T08:00:00Z',
 knownAt:'2026-11-18T08:00:00Z',sourceRef:'provider:city:verified:WR-41',
});
const otherJobHold=createMaterialEvidenceEvent({
 scope:materialScope,entryId:'trusted-city:OT-9:HOLD',
 subjectRef:'job:OT-9',stateKey:'inspection.current_clearance',
 value:'SAFETY_HOLD',effectiveAt:'2026-11-17T08:00:00Z',
 knownAt:'2026-11-17T08:00:00Z',sourceRef:'provider:city:verified:OT-9',
});
const assertion='The city inspection status for WR-41 remains unchanged and has not yet received a PASS.';
const verify=async({evidence_entry:e})=>({
 verified:true,authenticated_entry_id:e.entry_id,
 authenticated_entry_hash:e.ledger_entry_hash,
 authenticated_source_ref:e.source_ref,
 attestation_receipt_id:'external-provider-readback:'+e.entry_id,
});
const noProof=async()=>({verified:false});
function storeWithEvidence(evidence=[pass,futureHold,otherJobHold]){
 const rows=new Map(evidence.map(e=>[e.entry_id,e]));
 const store=async e=>{validateUniverseEntry(e);rows.set(e.entry_id,e);
  return {status:'PERSISTED',entry:e};};
 const load=async ({continuityRootId,worldlineId,eventKind,limit})=>{
  assert.equal(continuityRootId,scope.continuity_root_id);
  assert.equal(worldlineId,scope.worldline_id);
  const entries=[...rows.values()].filter(x=>
   (!eventKind||x.event_kind===eventKind)&&
   x.continuity_root_id===continuityRootId&&
   x.worldline_id===worldlineId).slice(0,limit||500);
  return {status:'AVAILABLE',entries};
 };
 const lookup=async({entryId})=>rows.get(entryId)||null;
 return {rows,store,load,lookup};
}
const opts=(answer=assertion,evidence=[pass,futureHold,otherJobHold])=>{
 const db=storeWithEvidence(evidence);
 return {db,params:{scope,rawAnswer:answer,displayedAnswer:answer,
  modelResponseId:'real:model:turn79',observedAt:time,
  load:db.load,store:db.store,lookup:db.lookup,fetchImpl:async()=>null,
  independentSourceAttestor:verify}};
};
test('real Turn 79 sentence is extracted as assertion with exact job and source span',()=>{
 const x=extractExplicitInspectionClaims(assertion);
 assert.equal(x.length,1);
 assert.equal(x[0].subject_ref,'job:WR-41');
 assert.equal(x[0].asserted_value,'PENDING');
 assert.equal(x[0].source_span,assertion);
});
test('quoted document, hypothetical, and unrelated drafts never promoted to claims',()=>{
 const txt=['> The city inspection status for WR-41 has not yet received a PASS.',
  'Someone says the WR-41 inspection has not yet received a PASS.',
  'If the WR-41 inspection has not yet received a PASS, we should ask.',
  'This is a friendly homeowner update without city certification.',
 ].join('\n');
 assert.equal(extractExplicitInspectionClaims(txt).length,0);
});
test('previously missed Turn79 stale factual claim is withheld before displayed answer and original retained',async()=>{
 const {db,params}=opts();
 const r=await screenStandaloneMaterialDelivery(params);
 assert.equal(r.status,'MATERIAL_CONTRADICTION_WITHHELD_BEFORE_DELIVERY');
 assert.ok(!r.response.includes('has not yet received a PASS'));
 assert.match(r.response,/PASS/);
 assert.equal(r.contradictory_claims,1);
 assert.equal(r.verified_readback,true);
 const audit=db.rows.get(r.verification_receipt_id);
 assert.ok(audit);
 assert.equal(audit.payload.report.findings[0].status,
  'CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
 assert.equal(audit.payload.report.model_answer_original_unchanged,true);
});
test('a hash-valid but unauthenticated city claim must not cause a false customer-visible rewrite',async()=>{
 const {params}=opts();
 const r=await screenStandaloneMaterialDelivery({
  ...params,independentSourceAttestor:noProof,
 });
 assert.equal(r.response,assertion);
 assert.equal(r.status,'MATERIAL_CLAIMS_EVALUATED_COVERAGE_INCOMPLETE');
 assert.equal(r.material_claim_coverage_verified,false);
});
test('a valid answer referring to WR-41 PASS is preserved despite conflicting other-job/future evidence',async()=>{
 const a='The WR-41 municipal inspection has received a PASS; the separate crew booking still requires confirmation.';
 const {params}=opts(a);
 const r=await screenStandaloneMaterialDelivery(params);
 assert.equal(r.response,a);
 assert.equal(r.contradictory_claims,0);
 assert.equal(r.external_actions_executed,0);
});
test('no extracted claims does not become 100% coverage or force a boilerplate refusal',async()=>{
 const a='Here are three ideas for a friendly homeowner email draft.';
 const {params}=opts(a);
 const r=await screenStandaloneMaterialDelivery(params);
 assert.equal(r.response,a);
 assert.equal(r.material_claim_coverage_verified,false);
 assert.equal(r.verification_receipt_id,null);
});
test('live standalone persistence seam stores model original and verified display separately',async()=>{
 const db=storeWithEvidence();
 const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
 REALITY_STANDALONE_MATERIAL_VERIFIER_ENABLED:'true',
 };
 const req={headers:{authorization:'Bearer signed-session-test-token-abc123'},
  body:{message:'What is the WR-41 inspection status?',
   conversation_id:'job-1',turn_id:'turn-79'}};
 const auth=async(url)=>({
  ok:true,status:200,json:async()=>({id:user,is_anonymous:false})});
 let runs=0;
 const r=await processStandaloneChat(req,{
  env,fetchImpl:auth,now:()=>time,
  load:db.load,store:db.store,obligationLookup:db.lookup,
  materialSourceAttestor:verify,
  run:async()=>{runs++;return {
   intelligence:{raw_model_answer:assertion,answer:assertion,
    response_id:'provider:real-replay:turn79'},
   context:{continuity:{root_id:scope.continuity_root_id,
    cognitive_readback_verified:true,signal_handoff_status:'STORED_AND_READ_BACK',
    event_id:'cognition:79'}},
  };},
 });
 assert.equal(runs,1);
 assert.ok(!r.response.includes('has not yet received a PASS'));
 assert.equal(r.receipt.material_claim_gate.status,
  'MATERIAL_CONTRADICTION_WITHHELD_BEFORE_DELIVERY');
 assert.equal(r.receipt.material_claim_gate.verified_readback,true);
 const persistedAssistant=[...db.rows.values()].find(e=>
  e.event_kind==='AUTHENTICATED_CONVERSATION_MESSAGE'&&e.payload.role==='assistant');
 assert.equal(persistedAssistant.payload.text,assertion);
 assert.equal(persistedAssistant.payload.display_text,r.response);
 const audits=[...db.rows.values()].filter(e=>e.event_kind==='MATERIAL_CLAIM_AUDIT');
 assert.equal(audits.length,1);
 assert.equal(r.external_action_executed,false);
});
test('no authenticated source leaves original response intact with explicitly unknown coverage',async()=>{
 const db=storeWithEvidence([pass]);
 const env={
 SUPABASE_URL:'https://reality-example.supabase.co',
 SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example_public_key',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_STANDALONE_CHAT_ENABLED:'true',
 REALITY_STANDALONE_EXPECTED_PROJECT_REF:'reality-example',
 REALITY_UNIVERSE_PERSISTENCE_URL:'https://reality-example.supabase.co',
 REALITY_UNIVERSE_PERSISTENCE_KEY:'sb_secret_TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_STANDALONE_OPENAI_API_KEY:'sk-TEST_ONLY_NOT_REAL_abcdefgh123456789',
 REALITY_OPENAI_MODEL:'gpt-4.1-mini',VERCEL_ENV:'preview',
 REALITY_STANDALONE_MATERIAL_VERIFIER_ENABLED:'true',
 };
 const r=await processStandaloneChat({
  headers:{authorization:'Bearer signed-session-test-token-abc123'},
  body:{message:'Summarize inspection.',conversation_id:'job-1',turn_id:'turn-80'},
 },{
  env,fetchImpl:async()=>({status:200,ok:true,
   json:async()=>({id:user,is_anonymous:false})}),now:()=>time,
  load:db.load,store:db.store,obligationLookup:db.lookup,
  run:async()=>({
   intelligence:{raw_model_answer:assertion,answer:assertion,response_id:'test:unknown'},
   context:{continuity:{root_id:scope.continuity_root_id,
    cognitive_readback_verified:true,signal_handoff_status:'STORED_AND_READ_BACK',
    event_id:'cognition:80'}}}),
 });
 assert.equal(r.response,assertion);
 assert.equal(r.receipt.material_claim_gate.independent_full_answer_coverage_verified,false);
 assert.equal(r.receipt.material_claim_gate.contradictory_claims,0);
});
