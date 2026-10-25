import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {runContinuousReliabilityCycle} from '../src/reality-continuous-reliability-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';

const world='construction:real-model-regression',root='continuity:real-model-regression';
const stamp='2026-10-24T15:00:00.000Z';
const vars=['VERCEL_ENV','REALITY_CONTINUOUS_RELIABILITY_ENABLED',
 'REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_RELIABILITY_EXTRACTION_ENABLED',
 'REALITY_DETECTOR_SHADOW_ENABLED','REALITY_DETECTOR_REPAIR_ENABLED',
 'SUPABASE_URL','SUPABASE_SECRET_KEY','REALITY_RELIABILITY_BENCHMARK_PROJECT_REF',
 'REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF',
 'REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL'];
async function environment(fn){
 const p=Object.fromEntries(vars.map(x=>[x,process.env[x]]));
 Object.assign(process.env,{
  VERCEL_ENV:'preview',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
  REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
  REALITY_RELIABILITY_EXTRACTION_ENABLED:'true',
  REALITY_DETECTOR_SHADOW_ENABLED:'true',REALITY_DETECTOR_REPAIR_ENABLED:'true',
  SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-only',
  REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
  REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 });
 try{await fn();}finally{
  for(const [k,v] of Object.entries(p)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
 }
}
function fixture(){
 const events=[];
 return {events,fetch:async(url,options={})=>{
  const u=new URL(url);
  if(u.pathname.includes('reality_universe_entries'))return new Response('[]',{status:200});
  if(u.pathname.startsWith('/rest/v1/')){
   if(options.method==='POST'){
    const e=JSON.parse(options.body);events.push(e);
    return new Response(JSON.stringify([e]),{status:201});
   }
   let rows=events.slice();
   for(const [q,key] of [['event_id','event_id'],
    ['continuity_root_id','continuity_root_id'],['worldline_id','worldline_id']]){
    const v=u.searchParams.get(q)?.replace(/^eq\./,'');
    if(v)rows=rows.filter(x=>x[key]===v);
   }
   if(u.searchParams.get('limit')==='1')rows=rows.slice(-1);
   else rows.reverse();
   return new Response(JSON.stringify(rows),{status:200});
  }
  throw Error('Unexpected '+url);
 }};
}
async function bootstrap(f,{
 userMessage='Record source',
 worldId=world,rootId=root,
 facts=[{key:'cabinet_delivery_date',value:'2026-10-27'}],
}={}){
 const sig=buildGovernedChatSignal({message:userMessage,observedAt:stamp});
 const live=await startContinuityRuntime({
  continuityRootSource:rootId,worldlineSource:'world:construction',
  subjectId:'fictional:contractor',signal:sig,observedAt:stamp,
  fetchImpl:f.fetch,
 });
 const source=await recordSourceAttestedEvidence({
  continuityRuntime:live,worldId,sourceKind:'CONNECTED_PROVIDER_READBACK',
  sourceRef:'fixture:verified',sourceDigest:'fixture:sha',
  facts,observedAt:stamp,
 });
 return {live,sig,source};
}

test('real-model Turn1: correct date with untrusted provenance alert is NOT quarantined',async()=>{
 await environment(async()=>{
  const f=fixture();
  const {live,sig,source}=await bootstrap(f);
  const result=await runContinuousReliabilityCycle({
   continuityRuntime:live,packetId:sig.packet.packet_id,
   currentUserMessage:'What is the cabinet delivery date?',
   modelOutput:'The date is 2026-10-27.',
   structuredCandidate:{
    world_id:world,scope:'CONVERSATIONAL',actions:[],
    carried_obligation_ids:[],claimed_source_refs:['model:unsupported-ref'],
    claims:[{key:'cabinet_delivery_date',value:'2026-10-27',
     evidence_refs:[source.event_id]}],
   },observedAt:stamp,
  });
  assert.equal(result.model_output_quarantined,false);
  assert.equal(result.quarantine_decision,'DETECTION_RECORDED_NO_ANSWER_OVERRIDE');
  assert.equal(result.readback_verified,true);
 });
});
test('real-model Turn5: unrelated invented extractor claim does not destroy inventory checklist',async()=>{
 await environment(async()=>{
  const f=fixture();const {live,sig}=await bootstrap(f);
  const result=await runContinuousReliabilityCycle({
   continuityRuntime:live,packetId:sig.packet.packet_id,
   currentUserMessage:'Make a five-item inventory checklist, do not order.',
   modelOutput:'Hammer, tape, drill, level and safety glasses. No order placed.',
   structuredCandidate:{
    world_id:world,scope:'CONVERSATIONAL',actions:[],
    carried_obligation_ids:[],claims:[{key:'invented_tool_inventory',
     value:'five',evidence_refs:[]}],
   },observedAt:stamp,
  });
  assert.equal(result.model_output_quarantined,false);
  assert.equal(result.readback_verified,true);
 });
});
test('relevant fact contradiction remains quarantined; irrelevant incidental mismatch does not overwrite answer',async()=>{
 await environment(async()=>{
  for(const [question,expected] of [
   ['What is the cabinet delivery date?',true],
   ['Can we email the estimate without authorization?',false],
  ]){
   const f=fixture();const {live,sig}=await bootstrap(f);
   const result=await runContinuousReliabilityCycle({
    continuityRuntime:live,packetId:sig.packet.packet_id,
    currentUserMessage:question,modelOutput:'Cabinet arrives Oct 24.',
    structuredCandidate:{
     world_id:world,scope:'CONVERSATIONAL',actions:[],
     carried_obligation_ids:[],claims:[{key:'cabinet_delivery_date',
      value:'2026-10-24',evidence_refs:[]}],
    },observedAt:stamp,
   });
   assert.equal(result.model_output_quarantined,expected);
  }
 });
});
test('real-model Turn14 wrong previous-topic answer corrected before release; original and correction receipts persist in existing Continuity',async()=>{
 await environment(async()=>{
  const f=fixture();
  await bootstrap(f,{
   facts:[
    {key:'inspection_wr41',value:'HOLD'},
    {key:'homeowner_scope_approval',value:'WITHDRAWN'},
    {key:'estimate_external_send_status',value:'NOT_SENT'},
   ],
  });
  const calls=[];
  const incorrect='The latest city inspection status remains HOLD. The supervisor phone rumor does not override the city HOLD.';
  const corrected='No. Homeowner approval was WITHDRAWN, so you cannot email the estimate. Separate send authorization is also absent.';
  const fetchImpl=async(url,options={})=>{
   if(!String(url).includes('api.openai.com/v1/responses'))return f.fetch(url,options);
   const req=JSON.parse(options.body);
   if(req.text?.format?.name==='reliability_assertions'){
    calls.push('EXTRACTION');
    return new Response(JSON.stringify({id:'extract:1',status:'completed',
     output_text:JSON.stringify({
      claims:[],actions:[],operational:false,provenance_assertions:[],
      recipient_scope:{target_id:'',quote:'',assertion:'UNCERTAIN'},
     }),
    }),{status:200});
   }
   calls.push('MODEL');
   return new Response(JSON.stringify({
    id:'model:'+calls.length,status:'completed',
    output_text:calls.filter(x=>x==='MODEL').length===1?incorrect:corrected,
   }),{status:200});
  };
  const final=await runLiveIntelligenceOrchestration({
   message:'Homeowner withdrew final approval. Can we email the old estimate now?',
   observedAt:'2026-10-24T15:01:00.000Z',
   model:'fake-model',apiKey:'test-only',
   systemContext:{continuity_root_id:root,worldline_id:'world:construction',
    world_id:world,conversation_id:'fictional:contractor'},
   verifiedConversationTurns:[],fetchImpl,
  });
  assert.deepEqual(calls,['MODEL','EXTRACTION','MODEL']);
  assert.equal(final.intelligence.answer,corrected);
  assert.equal(final.intelligence.reliability_intervention,
   'CURRENT_TURN_FOCUS_REGENERATED');
  assert.equal(final.reliability.focus_repair.status,
   'FOCUS_CANDIDATES_CLEARED_NOT_SEMANTICALLY_ADJUDICATED');
  assert.equal(final.reliability.readback_verified,true);
  const sourceReceipt=f.events.find(e=>e.event_id===final.reliability.receipt_id);
  assert.equal(sourceReceipt.payload.model_output_quarantined,false);
  const repair=f.events.find(e=>e.event_id===final.reliability.focus_repair.receipt_id);
  assert.equal(repair.payload.event_type,'MODEL_ANSWER_FOCUS_REPAIR');
  assert.equal(repair.payload.disposition,'FOCUS_CANDIDATES_CLEARED');
  assert.equal(repair.payload.external_action_authorized,false);
  assert.equal(final.execution.status,'NOT_EXECUTED');
  assert.equal(final.authority.granted,false);
 });
});
