import test from 'node:test';
import assert from 'node:assert/strict';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';

const stamp='2026-10-25T15:00:00.000Z';
const vars=['VERCEL_ENV','REALITY_CONTINUOUS_RELIABILITY_ENABLED',
 'REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_DETECTOR_REPAIR_ENABLED',
 'REALITY_SEMANTIC_REVIEW_ENABLED','REALITY_DETECTOR_SHADOW_ENABLED',
 'REALITY_RELIABILITY_EXTRACTION_ENABLED','SUPABASE_URL','SUPABASE_SECRET_KEY',
 'REALITY_RELIABILITY_BENCHMARK_PROJECT_REF','REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF',
 'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL'];
async function preview(fn){
 const saved=Object.fromEntries(vars.map(v=>[v,process.env[v]]));
 Object.assign(process.env,{
  VERCEL_ENV:'preview',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',REALITY_DETECTOR_REPAIR_ENABLED:'true',
  REALITY_SEMANTIC_REVIEW_ENABLED:'true',REALITY_DETECTOR_SHADOW_ENABLED:'false',
  REALITY_RELIABILITY_EXTRACTION_ENABLED:'true',
  SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'fixture-only',
  REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 });
 try{await fn()}finally{
  for(const [k,v] of Object.entries(saved))
   if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
}
function fixture({first,revised,retryReviewIssues=[]}){
 const events=[],calls=[];
 const fetchImpl=async(url,opts={})=>{
  const u=new URL(url);
  if(u.origin==='https://api.openai.com'){
   const req=JSON.parse(opts.body),review=req.text?.format?.name==='reality_semantic_review';
   const count=calls.filter(c=>c.kind===(review?'REVIEW':'MODEL')).length;
   calls.push({kind:review?'REVIEW':'MODEL',req});
   const content=review?JSON.stringify({
    addresses_current_request:true,
    issues:count>0?retryReviewIssues:[],claims:[],actions:[],
   }):(calls.some(x=>x.kind==='REVIEW')?revised:first);
   return new Response(JSON.stringify({id:'fixture:'+calls.length,status:'completed',
    output_text:content}),{status:200});
  }
  if(u.pathname.includes('reality_universe_entries'))return new Response('[]',{status:200});
  if(u.pathname.startsWith('/rest/v1/')){
   if(opts.method==='POST'){
    const event=JSON.parse(opts.body);
    events.push(event);return new Response(JSON.stringify([event]),{status:201});
   }
   let rows=events.slice();
   for(const col of ['event_id','continuity_root_id','worldline_id']){
    const key=u.searchParams.get(col)?.replace(/^eq\./,'');
    if(key)rows=rows.filter(e=>e[col]===key);
   }
   if(u.searchParams.get('limit')==='1')rows=rows.slice(-1);
   else rows.reverse();
   return new Response(JSON.stringify(rows),{status:200});
  }
  throw Error('UNEXPECTED_FIXTURE_URL '+url);
 };
 return {fetchImpl,events,calls};
}
async function run(f){
 return runLiveIntelligenceOrchestration({
  message:'Has delivery to the buyer been proven by evidence, or only the order placement?',
  observedAt:stamp,model:'fixture-model',apiKey:'fixture-not-real',
  systemContext:{continuity_root_id:'epistemic:novel-causal-eval',
   worldline_id:'world:fulfillment',world_id:'world:fulfillment',
   conversation_id:'test:independent'},
  verifiedConversationTurns:[],fetchImpl:f.fetchImpl,
 });
}
test('unknown causal error triggers bounded correction even when semantic model falsely reports zero issues',async()=>{
 await preview(async()=>{
  const initial='An online order was placed, so the shipment reached the buyer.';
  const corrected='An online order was placed, but delivery to the buyer is not verified. Request a carrier confirmation.';
  const f=fixture({first:initial,revised:corrected});
  const result=await run(f);
  assert.equal(result.intelligence.answer,corrected);
  assert.equal(result.intelligence.reliability_intervention,'SEMANTIC_REVIEW_CORRECTED');
  const path=f.calls.map(x=>x.kind);
  const firstReview=path.indexOf('REVIEW');
  assert.ok(firstReview>0);
  assert.deepEqual(path.slice(firstReview),['REVIEW','MODEL','REVIEW']);
  const finding=result.reliability.conversational_drift.findings.find(x=>
    x.classification==='UNATTESTED_MATERIAL_ENTAILMENT');
  assert.ok(finding,'First answer must trigger generic causal-evidence Continuity finding');
  assert.ok(finding.claim_spans?.length);
  assert.equal(result.reliability.semantic_repair.independently_verified_correctness,false);
  const receipt=f.events.find(e=>e.event_id===result.reliability.semantic_repair.receipt_id);
  assert.equal(receipt.payload.event_type,'MODEL_SEMANTIC_REVIEW_AND_REPAIR');
  assert.equal(receipt.payload.structural_relation_candidates[0].classification,
    'UNATTESTED_MATERIAL_ENTAILMENT');
  assert.deepEqual(receipt.payload.post_repair_relation_findings,[]);
  assert.equal(result.execution.status,'NOT_EXECUTED');
  assert.equal(result.authority.granted,false);
 });
});
test('correct uncertainty stays unchanged; no unnecessary retries or false completion',async()=>{
 await preview(async()=>{
  const good='The order was placed. Shipment delivery is unknown until a carrier receipt is verified.';
  const f=fixture({first:good,revised:'SHOULD NEVER CALL RETRY'});
  const result=await run(f);
  assert.equal(result.intelligence.answer,good);
  const path=f.calls.map(x=>x.kind);
  const firstReview=path.indexOf('REVIEW');
  assert.ok(firstReview>0);
  assert.deepEqual(path.slice(firstReview),['REVIEW']);
  assert.equal(result.reliability.semantic_repair,undefined);
  assert.equal(result.reliability.conversational_drift.findings.length,0);
  assert.equal(result.execution.status,'NOT_EXECUTED');
 });
});
test('unrepaired evidence leap stays disclosed and never treated as proven correction',async()=>{
 await preview(async()=>{
  const broken='An online order was placed, so the shipment reached the buyer.';
  const f=fixture({first:broken,revised:broken});
  const result=await run(f);
  assert.notEqual(result.intelligence.answer,broken);
  assert.match(result.intelligence.answer,/not semantically verified/i);
  assert.equal(result.reliability.semantic_repair.status,'CORRECTION_NOT_VERIFIED');
  const receipt=f.events.find(e=>e.event_id===result.reliability.semantic_repair.receipt_id);
  assert.ok(receipt.payload.post_repair_relation_findings.length>0);
  assert.equal(receipt.payload.independently_verified_semantic_correctness,false);
  assert.equal(result.execution.status,'NOT_EXECUTED');
 });
});
