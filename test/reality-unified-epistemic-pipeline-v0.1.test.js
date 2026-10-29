import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCognitionContinuityHandoff} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {buildCanonicalEpistemicFrame,recordCanonicalEpistemicFrame} from '../src/reality-canonical-epistemic-frame-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
const at='2026-10-25T19:00:00.000Z';
const question='What has actually been confirmed about the invoice?';
const report="Accounts says the bank transferred the payment, but nobody has a bank receipt.";
function frameTest(history,opts={}){
 const governedSignal=buildGovernedChatSignal({message:question,observedAt:at});
 const continuity=buildCognitionContinuityHandoff({
  governedSignal,latestMessage:question,verifiedConversationTurns:history,
 });
 return buildCanonicalEpistemicFrame({governedSignal,conversationContinuity:continuity,
  continuityRootId:'root:test',worldId:'work:operations',
  observedAt:at,...opts});
}
test('one epistemic state preserves source report as NOT independently verified, while separate attested facts keep receipt',()=>{
 const f=frameTest([{role:'user',text:report,source_ref:'auth:turn:3'}],{
  sourceAttestedSnapshot:{world_id:'work:operations',
   facts:[{key:'inspection_status',value:'HOLD',evidence_ref:'trusted-provider:receipt-1'}]},
 });
 assert.equal(f.reported_claims.length,1);
 assert.equal(f.reported_claims[0].source_ref,'auth:turn:3');
 assert.equal(f.reported_claims[0].factual_status,'UNKNOWN_UNTIL_INDEPENDENTLY_ATTESTED');
 assert.equal(f.reported_claims[0].action_authority,false);
 assert.ok(f.reported_claims[0].source_modalities.includes('HEARSAY'));
 assert.equal(f.source_attested_facts.length,1);
 assert.equal(f.source_attested_facts[0].source_receipt_id,'trusted-provider:receipt-1');
 assert.equal(f.execution_authorized,false);
 assert.equal(f.independently_verified_answer_correctness,false);
 assert.equal(f.conversation_evidence.candidates[0].source_ref,f.reported_claims[0].source_ref);
});
test('the current user report is typed even without any prior authenticated conversation history',()=>{
 const message='Dispatcher says the van was delivered; we have no signed delivery receipt.';
 const signal=buildGovernedChatSignal({message,observedAt:at});
 const handoff=buildCognitionContinuityHandoff({governedSignal:signal,latestMessage:message});
 const f=buildCanonicalEpistemicFrame({
  governedSignal:signal,conversationContinuity:handoff,continuityRootId:'ephemeral:'+signal.packet.packet_id,observedAt:at,
 });
 assert.ok(f.reported_claims.some(x=>x.source_modalities.includes('HEARSAY')));
 assert.equal(f.history_incomplete,true);
 assert.equal(f.source_history_scope,'NOT_ATTESTED');
});
test('canonical frame rejects a cross-world source and persists immutable proof with readback',async()=>{
 assert.throws(()=>frameTest([],{sourceAttestedSnapshot:{
  world_id:'world:someone-else',facts:[{key:'invoice_status',value:'PAID',evidence_ref:'fake'}]}}),
 /CANONICAL_EPISTEMIC_CROSS_WORLD_FACT/);
 const frame=frameTest([{role:'user',text:report,source_ref:'auth:3'}]);
 const rows=[],spine={continuity_root_id:'root:test',worldline_id:'world:test'};
 const runtime={
  enabled:true,spine,
  appendStage:async args=>{
   const row={event_id:args.eventId,payload:args.payload,event_kind:args.stage};
   rows.push(row);return row;
  },
  readback:async()=>rows.slice(),
 };
 const saved=await recordCanonicalEpistemicFrame({frame,continuityRuntime:runtime});
 assert.equal(saved.status,'PERSISTED_AND_READBACK_VERIFIED');
 assert.equal(rows.length,1);
 assert.equal(rows[0].payload.frame.frame_hash,frame.frame_hash);
 rows[0].payload.frame_hash='tampered';
 await assert.rejects(()=>recordCanonicalEpistemicFrame({frame,continuityRuntime:{
  ...runtime,appendStage:async x=>({event_id:x.eventId})}}),/READBACK_UNVERIFIED/);
});
const vars=['VERCEL_ENV','REALITY_UNIVERSE_PERSISTENCE_ENABLED',
 'REALITY_CONTINUOUS_RELIABILITY_ENABLED','REALITY_SEMANTIC_REVIEW_ENABLED',
 'REALITY_DETECTOR_REPAIR_ENABLED','REALITY_RELIABILITY_EXTRACTION_ENABLED',
 'REALITY_DETECTOR_SHADOW_ENABLED','SUPABASE_URL','SUPABASE_SECRET_KEY',
 'REALITY_RELIABILITY_BENCHMARK_PROJECT_REF','REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF',
 'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL'];
test('160 authenticated turns share one persisted epistemic frame in Cognition and VERIFICATION without 80-turn crash',async()=>{
 const prev=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{
  VERCEL_ENV:'preview',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
  REALITY_SEMANTIC_REVIEW_ENABLED:'true',
  REALITY_DETECTOR_REPAIR_ENABLED:'false',
  REALITY_RELIABILITY_EXTRACTION_ENABLED:'false',
  REALITY_DETECTOR_SHADOW_ENABLED:'false',
  SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
  SUPABASE_SECRET_KEY:'fixture-key',
  REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 });
 const history=Array.from({length:160},(_,i)=>({
  role:i%2?'assistant':'user',source_ref:'user-or-model:'+i,
  text:i===0?report:i%2?'Earlier assistant remark is not provider proof.':'Need to review checklist '+i+'.',
 }));
 const persisted=[],requests=[];
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url);
  if(u.pathname.startsWith('/rest/v1/')){
   if(options.method==='POST'){
    const evt=JSON.parse(options.body);persisted.push(evt);
    return new Response(JSON.stringify([evt]),{status:201});
   }
   const root=u.searchParams.get('continuity_root_id')?.replace(/^eq\./,'');
   const worldline=u.searchParams.get('worldline_id')?.replace(/^eq\./,'');
   const id=u.searchParams.get('event_id')?.replace(/^eq\./,'');
   let events=persisted.filter(e=>(!id||e.event_id===id)&&
    (!root||e.continuity_root_id===root)&&
    (!worldline||e.worldline_id===worldline));
   if(u.searchParams.get('limit')==='1')events=events.slice(-1);
   // Return provider-order ledger records, never a fake event for an ID lookup.
   return new Response(JSON.stringify(events),{status:200});
  }
  if(u.origin!=='https://api.openai.com')throw Error('UNEXPECTED_FETCH '+url);
  const req=JSON.parse(options.body);
  requests.push(req);
  if(req.text?.format?.name==='reality_semantic_review'){
   const evidence=JSON.parse(req.input[1].content[0].text).conversation_evidence;
   const checks=(evidence?.candidates||[]).map(c=>({
    source_ref:c.source_ref,clause_id:c.clause_id,relation:'NOT_MENTIONED',
    answer_quote:'',verified_source_ref:'',reason:'Not mentioned in this answer.',
   }));
   return new Response(JSON.stringify({
    id:'test-review',status:'completed',
    output_text:JSON.stringify({
      addresses_current_request:true,issues:[],claims:[],actions:[],provenance_checks:checks,
    }),
   }),{status:200});
  }
  return new Response(JSON.stringify({
   id:'test-cognition',status:'completed',
   output_text:'The invoice cannot yet be confirmed paid. Verify the bank receipt.',
  }),{status:200});
 };
 try{
  const result=await runLiveIntelligenceOrchestration({
   message:question,observedAt:at,
   model:'test-only',apiKey:'fixture',
   systemContext:{continuity_root_id:'root:operations-160',
    worldline_id:'world:operations-160',
    conversation_id:'conversation:operations-160',
    world_id:'world:operations'},
   verifiedConversationTurns:history,fetchImpl,
  });
  const first=requests.find(x=>!x.text?.format);
  const modelFrame=JSON.parse(first.input[1].content[0].text)
   .system_context.canonical_epistemic_state;
  assert.equal(modelFrame.prior_message_count,160);
  assert.ok(modelFrame.reported_claims.some(x=>x.source_ref==='user-or-model:0'));
  assert.equal(result.reliability.canonical_epistemic_state.frame_hash,modelFrame.frame_hash);
  assert.equal(result.reliability.canonical_epistemic_state.status,'PERSISTED_AND_READBACK_VERIFIED');
  const canonicalEvents=persisted.filter(x=>x.payload?.event_type==='CANONICAL_EPISTEMIC_FRAME');
  assert.equal(canonicalEvents.length,1);
  const assessment=persisted.find(x=>x.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT');
  assert.ok(assessment);
  assert.equal(assessment.payload.canonical_epistemic_frame.frame_hash,modelFrame.frame_hash);
  assert.equal(assessment.payload.canonical_epistemic_frame.source_receipt_id,canonicalEvents[0].event_id);
  assert.equal(result.execution.status,'NOT_EXECUTED');
  assert.equal(result.authority.granted,false);
 }finally{
  for(const [k,v] of Object.entries(prev)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
});
