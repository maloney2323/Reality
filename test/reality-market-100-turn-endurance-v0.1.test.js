// 100 turns of cross-workstream persistence, verification and retrospective
// auditing. SCRIPTED attempts; no LLM, customer operation, or published correction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIXED_BUSINESS_SCENARIOS,initialBusinessWorld,candidateFromScenario,
} from '../src/reality-market-proof-gauntlet-v0.1.js';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence,readGroundedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {runContinuousReliabilityCycle,orderContinuityHistory} from '../src/reality-continuous-reliability-v0.1.js';
import {scoreIndependentReliability,scorePaidBusinessSupervision} from '../src/reality-business-proof-scoring-v0.1.js';

function freshMock(){
 const events=[];
 return {events,fetchImpl:async(url,opts={})=>{
   const u=new URL(url),q=u.searchParams;
   if(opts.method==='POST'){
     const row=JSON.parse(opts.body);
     if(events.some(e=>e.event_id===row.event_id))
       return new Response('Duplicate event ID',{status:409});
     events.push(row);return new Response(JSON.stringify([row]),{status:201});
   }
   let rows=events.slice();
   const id=q.get('event_id')?.replace(/^eq\./,'');
   const root=q.get('continuity_root_id')?.replace(/^eq\./,'');
   const world=q.get('worldline_id')?.replace(/^eq\./,'');
   if(id)rows=rows.filter(e=>e.event_id===id);
   if(root)rows=rows.filter(e=>e.continuity_root_id===root);
   if(world)rows=rows.filter(e=>e.worldline_id===world);
   return new Response(JSON.stringify(q.get('limit')==='1'?rows.slice(-1):rows.reverse()),
     {status:200});
 }};
}
async function isolatedRun(fn){
 const keys=['REALITY_UNIVERSE_PERSISTENCE_ENABLED','REALITY_CONTINUOUS_RELIABILITY_ENABLED',
  'VERCEL_ENV','SUPABASE_URL','SUPABASE_SECRET_KEY'];
 const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='false';
 process.env.VERCEL_ENV='development';
 process.env.SUPABASE_URL='https://mock.invalid';
 process.env.SUPABASE_SECRET_KEY='mock-key-not-real';
 try{return await fn()}finally{
  for(const [key,value] of Object.entries(before)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
}
async function run100(){
 const db=freshMock(),world=initialBusinessWorld();
 const failures=[],checkpoints=[],proposals=[];
 for(let turn=1;turn<=100;turn++){
   const at=new Date(Date.UTC(2026,9,24,12,0,0)+turn*60000).toISOString();
   const scenario=MIXED_BUSINESS_SCENARIOS[(turn-1)%25];
   const signal=buildGovernedChatSignal({
     message:'Synthetic operational workload '+turn+' / '+scenario.lane+': '+scenario.title,
     observedAt:at,
   });
   const runtime=await startContinuityRuntime({
     continuityRootSource:'100-turn-synthetic-market-proof',
     worldlineSource:'contractor-and-operations-single-world',
     subjectId:'synthetic-owner-workload',
     signal,observedAt:at,fetchImpl:db.fetchImpl,
   });
   if(turn>1 && runtime.prior_event_count<4)
     failures.push({turn,reason:'LOST_PRIOR_LEDGER'});
   if(turn===1){
     await recordSourceAttestedEvidence({
       continuityRuntime:runtime,worldId:world.world_id,
       sourceKind:'AUTHORIZED_USER_POLICY',
       sourceRef:'fixture:initial-policies-and-facts',
       sourceDigest:'frozen-fixture-v0.1',
       facts:world.facts.map(f=>({key:f.key,value:f.value})),
       obligations:world.obligations.map(o=>({id:o.id,active:o.active})),observedAt:at,
     });
   }
   if((turn-1)%25===19){
     const history=orderContinuityHistory(await runtime.readback());
     const prior=readGroundedEvidence(history,{worldId:world.world_id});
     const existing=prior.facts.find(f=>f.key==='cabinet_delivery');
     const newDate='2026-10-'+String(27+Math.floor((turn-1)/25)).padStart(2,'0');
     await recordSourceAttestedEvidence({
       continuityRuntime:runtime,worldId:world.world_id,
       sourceKind:'CONNECTED_PROVIDER_READBACK',
       sourceRef:'fixture:supplier-supersession:'+turn,
       sourceDigest:'supplier-update-round-'+Math.ceil(turn/25),
       facts:[{key:'cabinet_delivery',value:newDate,
         supersedes_evidence_ref:existing.evidence_ref}],observedAt:at,
     });
   }
   const history=orderContinuityHistory(await runtime.readback());
   const source=readGroundedEvidence(history,{worldId:world.world_id});
   const candidate=candidateFromScenario(scenario,source);
   const cycle=await runContinuousReliabilityCycle({
     continuityRuntime:runtime,modelOutput:'SCRIPTED state candidate for '+scenario.title,
     packetId:signal.packet.packet_id,structuredCandidate:candidate,
     authorizedWorldId:world.world_id,observedAt:at,
   });
   if(!cycle.readback_verified || cycle.turn!==turn)
     failures.push({turn,reason:'RECEIPT_OR_TURN_MISMATCH'});
   if(cycle.correction_proposed){
     proposals.push({turn,receipt_id:cycle.receipt_id});
     if(cycle.correction_published_to_active_state!==false)
       failures.push({turn,reason:'UNAUTHORIZED_RECOVERY_PUBLICATION'});
   }
   if(turn%25===0){
     const cp=cycle.checkpoint;
     assert.ok(cp,'Missing checkpoint at turn '+turn);
     assert.equal(cp.window_end,turn);
     assert.equal(cp.window_start,turn===25?1:turn-25);
     assert.equal(cp.raw_turns_in_window,turn===25?25:26);
     assert.equal(cp.recorded_assessments,turn===25?25:26);
     assert.equal(cp.source_attested_structured_turns,turn===25?25:26);
     assert.equal(cp.independently_evaluated_turns,0);
     assert.equal(cp.readback_verified,true);
     assert.equal(cp.drift_rate_pct,null);
     assert.equal(cp.hallucination_rate_pct,null);
     const back=orderContinuityHistory(await runtime.readback());
     assert.equal(back.filter(e=>e.event_kind==='RAW_SIGNAL').length,turn);
     checkpoints.push({
       turn,start:cp.window_start,end:cp.window_end,
       source_checked:cp.source_attested_structured_turns,
       temporal_discrepancies:cp.retrospective_discrepancies.length,
       independent_truth_adjudications:cp.independently_evaluated_turns,
       verified_chain:cp.readback_verified,
     });
   }
   // The next request reconstructs fresh state. Do not treat a proposed
   // correction as a published fact; authoritative source evidence survives.
   const after=readGroundedEvidence(
     orderContinuityHistory(await runtime.readback()),{worldId:world.world_id});
   assert.ok(after.obligations.some(o=>
     o.id==='homeowner_approval_before_estimate_send'&&o.active===true));
   assert.ok(after.facts.some(f=>f.key==='customer_id'&&f.value==='CUST-104'));
   assert.ok(after.facts.find(f=>f.key==='cabinet_delivery'));
 }
 const chain=orderContinuityHistory(db.events);
 const tampered=JSON.parse(JSON.stringify(db.events));
 tampered[1].payload.unauthorized_change='yes';
 assert.throws(()=>orderContinuityHistory(tampered),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
 return {
   status:'SCRIPTED_100_TURNS_WITH_MOCK_PERSISTENCE_ONLY',
   turns:100,workstreams:new Set(MIXED_BUSINESS_SCENARIOS.map(x=>x.lane)).size,
   checkpoints,proposed_structural_corrections:proposals.length,
   independent_operational_corrections_verified:0,
   independent_hallucination_rate_pct:null,independent_drift_rate_pct:null,
   events_written:chain.length,tamper_detected:true,
   failed_turns:failures,external_actions:0,real_model_calls:0,
 };
}
test('100-turn multi-workstream endurance rehydrates evidence and audits 1–25,25–50,50–75,75–100',async()=>{
 await isolatedRun(async()=>{
  const report=await run100();
  assert.equal(report.turns,100);
  assert.equal(report.failed_turns.length,0);
  assert.deepEqual(report.checkpoints.map(x=>[x.start,x.end]),[
   [1,25],[25,50],[50,75],[75,100],
  ]);
  assert.equal(report.workstreams,7);
  assert.equal(report.external_actions,0);
  assert.equal(report.real_model_calls,0);
  assert.equal(report.tamper_detected,true);
  assert.equal(report.independent_operational_corrections_verified,0);
  assert.equal(report.independent_hallucination_rate_pct,null);
  console.log('RELIABILITY_100_TURN_ENDURANCE',JSON.stringify(report));
 });
});
test('100 real-world supervision and verified hallucination scores remain unmeasured until actual receipts exist',()=>{
 const errors=scoreIndependentReliability({expectedTurns:100,observations:[]});
 const supervision=scorePaidBusinessSupervision({matchedTasks:[]});
 assert.equal(errors.customer_drift_rate_pct,null);
 assert.equal(errors.customer_hallucination_rate_pct,null);
 assert.equal(errors.missing_or_unadjudicated_turns,100);
 assert.equal(supervision.net_supervision_minutes_saved,null);
 assert.equal(supervision.verified_net_labor_value_usd,null);
});
