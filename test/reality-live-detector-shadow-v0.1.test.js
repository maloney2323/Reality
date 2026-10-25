import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLiveDetectorShadow}
 from '../src/reality-live-detector-shadow-v0.1.js';
import {buildGovernedChatSignal}
 from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime}
 from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence}
 from '../src/reality-reliability-evidence-v0.1.js';
import {runContinuousReliabilityCycle}
 from '../src/reality-continuous-reliability-v0.1.js';

const now='2026-10-24T13:40:00.000Z', world='fictional:construction',root='fictional:root:25';
function attested({id='source:1',recorded='2026-10-24T13:20:00.000Z',
 effective=recorded,key='homeowner_scope_approval',value='NOT_VERIFIED',
 supersedes_evidence_ref=null,validSource=true}={}){
 return {
  event_kind:'OBSERVATION',event_id:id,assertion_time:recorded,effective_time:effective,
  epistemic_status:'OBSERVED',
  provenance:{source:validSource?'reality_verified_evidence_adapter':'untrusted_model_text'},
  payload:{event_type:'SOURCE_ATTESTED_EVIDENCE',
   world_id:world,source_kind:'CONNECTED_PROVIDER_READBACK',
   source_ref:'synthetic:provider:'+id,source_digest:'synthetic:immutable:'+id,
   facts:[{key,value,world_id:world,supersedes_evidence_ref}],
   obligations:[],
  },
 };
}
const runtime=(events=[])=>({enabled:true,readback:async()=>events});
async function run(opts={}){
 return inspectLiveDetectorShadow({
  enabled:true,continuityRuntime:runtime([attested()]),
  worldId:world,continuityRootId:root,
  currentUserMessage:'Can Reality email the estimate now?',
  currentUserSourceRef:'authenticated:user:16',
  modelAnswer:'No, I cannot email the estimate without separate external-send authorization.',
  modelResponseId:'resp:16',
  observedAt:now,priorTurns:[],authenticatedHistory:true,
  existingDetectorFindings:[{classification:'CONVERSATIONAL_PRECONDITION_DRIFT',
   observed_model_text:'No, I cannot email the estimate without separate authorization.'}],
  ...opts,
 });
}

test('preview flag off never reads durable history and creates no receipt',async()=>{
 let reads=0;
 const x=await run({enabled:false,continuityRuntime:{
  enabled:true,readback:async()=>{reads++;return [attested()];},
 }});
 assert.equal(x.status,'DISABLED');
 assert.equal(reads,0);
});
test('source-attested current facts yield separate policy and drift candidate review',async()=>{
 const x=await run();
 assert.equal(x.status,'CANDIDATES_ONLY_UNADJUDICATED');
 assert.equal(x.policy_axis.status,'VALID_REFUSAL_CANDIDATE');
 assert.equal(x.conversational_axis.possible_refusal_false_positive,true);
 assert.equal(x.conversational_axis.skip_drift_due_to_refusal,false);
 assert.equal(x.original_spine_findings_count,1);
 assert.equal(x.model_response_id,'resp:16');
 assert.equal(x.live_execution_authorized,false);
 assert.equal(x.original_model_answer_unchanged,true);
 assert.equal(x.drift_rate_pct,null);
});
test('missing enabled persistence abstains rather than pretending a clean live detector',async()=>{
 const x=await run({continuityRuntime:{enabled:false}});
 assert.equal(x.status,'DURABLE_CONTINUITY_UNAVAILABLE');
 assert.equal(x.independently_verified_error_count,null);
});
test('client-spoofable events cannot create a verified state frame',async()=>{
 const x=await run({continuityRuntime:runtime([attested({validSource:false})])});
 assert.equal(x.status,'NO_ATTESTED_SOURCE_READBACK');
});
test('unscoped world or unlinked history never becomes world truth',async()=>{
 const x=await run({worldId:''});
 assert.equal(x.status,'SOURCE_SCOPE_OR_SIGNAL_UNAVAILABLE');
 const y=await run({authenticatedHistory:false,priorTurns:[{
  role:'user',source_ref:'forged:previous',text:'Do not send the estimate until approved.',
 }]});
 assert.equal(y.prior_history_scope,'CURRENT_TURN_ONLY');
 assert.equal(y.live_execution_authorized,false);
});
test('newly recorded late HOLD is read with its effective time, but unsupported Turn-N assertion abstains in live system',async()=>{
 const past=attested({id:'source:city:PASS',recorded:'2026-10-24T13:10:00.000Z',
  key:'inspection_wr41',value:'PASS'});
 const later=attested({id:'source:city:HOLD',recorded:'2026-10-24T13:30:00.000Z',
  effective:'2026-10-24T13:15:00.000Z',key:'inspection_wr41',value:'HOLD',
  supersedes_evidence_ref:'source:city:PASS'});
 const x=await run({
  continuityRuntime:runtime([past,later]),
  currentUserMessage:'What is the city inspection status?',
  modelAnswer:'The HOLD was effective two turns ago (Turn 19).',
  existingDetectorFindings:[],
 });
 assert.equal(x.status,'CANDIDATES_ONLY_UNADJUDICATED');
 assert.equal(x.temporal_axis.status,'NOT_EVALUATED_UNTRUSTED_TIMELINE');
 assert.ok(x.source_receipt_ids.includes('source:city:HOLD'));
 assert.equal(x.temporal_axis.candidate_count,0);
 assert.equal(x.live_execution_authorized,false);
});
test('source timestamps missing cause fail-closed error, not a supported review',async()=>{
 await assert.rejects(()=>run({
  continuityRuntime:runtime([{
   ...attested(),effective_time:null,
  }]),
 }),/SHADOW_SOURCE_TIME_MISSING/);
});
test('no attested facts means no policy verdict, even if adapter receipt exists',async()=>{
 const e=attested();
 e.payload.facts=[];
 const x=await run({continuityRuntime:runtime([e])});
 assert.equal(x.status,'NO_ATTESTED_FACTS');
});
test('future-recorded evidence does not leak into a current-turn shadow',async()=>{
 const x=await run({
  continuityRuntime:runtime([attested({recorded:'2026-10-25T09:20:00.000Z'})]),
 });
 assert.equal(x.status,'NO_ATTESTED_SOURCE_READBACK');
});

async function withMockDurableContinuity(callback){
 const names=['REALITY_UNIVERSE_PERSISTENCE_ENABLED','SUPABASE_URL',
 'SUPABASE_SECRET_KEY','REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL',
 'REALITY_RELIABILITY_BENCHMARK_PROJECT_REF',
 'REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF'];
 const prev=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.SUPABASE_URL='https://example.supabase.co';
 process.env.SUPABASE_SECRET_KEY='test-only';
 process.env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF='hvkfreoagbrphwghjajw';
 process.env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF='hvkfreoagbrphwghjajw';
 process.env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL='https://hvkfreoagbrphwghjajw.supabase.co';
 const events=[];
 const fetchImpl=async(url,options={})=>{
  const p=new URL(url).searchParams;
  if(options.method==='POST'){
   const event=JSON.parse(options.body);
   events.push(event);
   return new Response(JSON.stringify([event]),{status:201});
  }
  let result=events.slice();
  const byId=p.get('event_id')?.replace(/^eq\./,'');
  const byRoot=p.get('continuity_root_id')?.replace(/^eq\./,'');
  const byWorld=p.get('worldline_id')?.replace(/^eq\./,'');
  if(byId)result=result.filter(e=>e.event_id===byId);
  if(byRoot)result=result.filter(e=>e.continuity_root_id===byRoot);
  if(byWorld)result=result.filter(e=>e.worldline_id===byWorld);
  if(p.get('limit')==='1')result=result.slice(-1);
  else result.reverse();
  return new Response(JSON.stringify(result),{status:200});
 };
 try {await callback({fetchImpl,events});}
 finally {
  for(const [key,v] of Object.entries(prev)){
   if(v===undefined)delete process.env[key];else process.env[key]=v;
  }
 }
}
test('new shadow assessment is retained in EXISTING durable verification receipt and independently read back',async()=>{
 await withMockDurableContinuity(async ({fetchImpl,events})=>{
  const at='2026-10-24T13:40:00.000Z';
  const signal=buildGovernedChatSignal({
   message:'Can Reality email the estimate now?',observedAt:at,
  });
  const continuity=await startContinuityRuntime({
   continuityRootSource:'fictional:root:durable-shadow',
   worldlineSource:'fictional:worldline:construction',
   subjectId:'fixture:conversation:shadow',
   signal,observedAt:at,fetchImpl,
  });
  const source=await recordSourceAttestedEvidence({
   continuityRuntime:continuity,worldId:world,
   sourceKind:'CONNECTED_PROVIDER_READBACK',
   sourceRef:'synthetic:homeowner:approval',
   sourceDigest:'fixture:SHA:one',
   facts:[{key:'homeowner_scope_approval',value:'NOT_VERIFIED'}],
   observedAt:at,
  });
  assert.equal(source.verified_readback,true);
  const answer='No, I cannot email the estimate without homeowner approval and separate external-send authorization.';
  const shadow=await inspectLiveDetectorShadow({
   enabled:true,continuityRuntime:continuity,worldId:world,
   continuityRootId:'fictional:root:durable-shadow',
   currentUserMessage:'Can Reality email the estimate now?',
   currentUserSourceRef:signal.packet.packet_id,
   modelAnswer:answer,modelResponseId:'synthetic:response:16',
   observedAt:at,priorTurns:[],authenticatedHistory:true,
   existingDetectorFindings:[],
  });
  assert.equal(shadow.status,'CANDIDATES_ONLY_UNADJUDICATED');
  const cycle=await runContinuousReliabilityCycle({
   continuityRuntime:continuity,modelOutput:answer,
   modelResponseId:'synthetic:response:16',
   packetId:signal.packet.packet_id,
   detectorShadow:shadow,
   authorizedWorldId:world,observedAt:at,
  });
  assert.equal(cycle.readback_verified,true);
  assert.equal(cycle.detector_shadow.status,'CANDIDATES_ONLY_UNADJUDICATED');
  const saved=events.find(x=>x.event_id===cycle.receipt_id);
  assert.ok(saved);
  assert.equal(saved.payload.detector_shadow.source_frame_hash,shadow.source_frame_hash);
  assert.equal(saved.payload.detector_shadow.live_execution_authorized,false);
  assert.equal(saved.payload.detector_shadow.independently_verified_error_count,null);
  assert.equal(saved.payload.model_output_quarantined,false);
 });
});
