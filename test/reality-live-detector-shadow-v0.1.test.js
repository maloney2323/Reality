import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLiveDetectorShadow}
 from '../src/reality-live-detector-shadow-v0.1.js';

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
