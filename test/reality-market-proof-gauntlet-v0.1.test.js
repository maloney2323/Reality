import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_PROOF_TURNS,MIXED_BUSINESS_SCENARIOS,initialBusinessWorld,
  candidateFromScenario,runMixedBusinessFixtureGauntlet,
} from '../src/reality-market-proof-gauntlet-v0.1.js';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence,readGroundedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {runContinuousReliabilityCycle,orderContinuityHistory} from '../src/reality-continuous-reliability-v0.1.js';

const mockStore=()=>{
 const events=[];
 const fetchImpl=async(url,options={})=>{
   const u=new URL(url),sp=u.searchParams;
   if(options.method==='POST'){
     const event=JSON.parse(options.body);
     if(events.some(e=>e.event_id===event.event_id))return new Response('duplicate',{status:409});
     events.push(event);return new Response(JSON.stringify([event]),{status:201});
   }
   let rows=events.slice();
   const id=sp.get('event_id')?.replace(/^eq\./,'');
   const root=sp.get('continuity_root_id')?.replace(/^eq\./,'');
   const world=sp.get('worldline_id')?.replace(/^eq\./,'');
   if(id)rows=rows.filter(e=>e.event_id===id);
   if(root)rows=rows.filter(e=>e.continuity_root_id===root);
   if(world)rows=rows.filter(e=>e.worldline_id===world);
   if(sp.get('limit')==='1')rows=rows.slice(-1);
   else rows.reverse();
   return new Response(JSON.stringify(rows),{status:200});
 };
 return {events,fetchImpl};
};
async function isolatedSimulation(fn){
 const names=['REALITY_UNIVERSE_PERSISTENCE_ENABLED','SUPABASE_URL','SUPABASE_SECRET_KEY',
   'REALITY_CONTINUOUS_RELIABILITY_ENABLED','VERCEL_ENV'];
 const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 process.env.SUPABASE_URL='https://isolated-fixture.invalid';
 process.env.SUPABASE_SECRET_KEY='scripted-fixture-not-an-api-key';
 process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='false';
 process.env.VERCEL_ENV='development';
 try{return await fn()}finally{
   for(const [key,value] of Object.entries(before)){
     if(value===undefined)delete process.env[key]; else process.env[key]=value;
   }
 }
}
function assertNoLivePretenses(report){
 assert.equal(report.benchmark_kind,'FROZEN_SCRIPTED_ATTEMPTS_NOT_LIVE_LLM');
 assert.equal(report.actual_model_calls,0);
 assert.equal(report.actual_customer_savings_usd,null);
 assert.equal(report.real_model_drift_rate_pct,null);
 assert.equal(report.real_model_hallucination_rate_pct,null);
 assert.equal(report.coverage.outcome_verified_repairs,0);
}
test('one mixed business benchmark spans 25 turns and multiple independent categories',()=>{
 const result=runMixedBusinessFixtureGauntlet();
 assertNoLivePretenses(result);
 assert.equal(MARKET_PROOF_TURNS,25);
 assert.equal(result.case_results.length,25);
 assert.ok(result.coverage.workstreams.length>=5);
 assert.ok(result.coverage.adversarial>=12);
 assert.ok(result.coverage.clean_controls>=4);
 assert.ok(result.coverage.expected_drift_cases>0);
 assert.ok(result.coverage.independently_labeled_false_claim_cases>0);
 assert.ok(result.coverage.unsafe_action_scenarios>0);
 assert.ok(result.coverage.unsupported_claim_cases>0);
 assert.ok(result.coverage.hypothetical_roi_usd===undefined);
});
test('market proof exposes the natural-language and hallucination-classification blind spots',()=>{
 const result=runMixedBusinessFixtureGauntlet();
 const prose=result.case_results.find(c=>c.turn===15);
 assert.ok(prose.expected.hallucination_confirmed);
 assert.equal(prose.observed_detector_miss,true);
 assert.equal(prose.flags.hallucination_confirmed_by_reality,false);
 assert.ok(result.coverage.detector_missed_expectations>0);
 assert.equal(result.coverage.confirmed_hallucination_classification_recall_pct,0);
 assert.equal(result.economics.actual_customer_savings_usd,undefined);
});
test('Reality live cycle: 25 mixed turns, source changes, readbacks, verified checkpoint and no effects',async()=>{
 await isolatedSimulation(async()=>{
   const db=mockStore();
   const root='business:mixed-reliability-fixture',lineage='reality:owner-operator-mixed';
   const fixtureWorld=initialBusinessWorld();
   let last=null,original=[];
   for(const scenario of MIXED_BUSINESS_SCENARIOS){
     const at=new Date(Date.UTC(2026,9,24,13,0,scenario.turn)).toISOString();
     const signal=buildGovernedChatSignal({
       message:'Mixed business operation '+scenario.turn+': '+scenario.title,observedAt:at,
     });
     const runtime=await startContinuityRuntime({
       continuityRootSource:root,worldlineSource:lineage,subjectId:'synthetic-contractor-owner',
       signal,observedAt:at,fetchImpl:db.fetchImpl,
     });
     if(scenario.turn===1){
       await recordSourceAttestedEvidence({
         continuityRuntime:runtime,worldId:fixtureWorld.world_id,
         sourceKind:'AUTHORIZED_USER_POLICY',
         sourceRef:'synthetic-fixture:v1',sourceDigest:'fixture-sha-25',
         facts:fixtureWorld.facts.map(f=>({key:f.key,value:f.value})),
         obligations:fixtureWorld.obligations.map(o=>({id:o.id,active:true})),observedAt:at,
       });
     }
     if(scenario.change.source_update){
       const change=scenario.change.source_update;
       const before=readGroundedEvidence(
         orderContinuityHistory(await runtime.readback()),{worldId:fixtureWorld.world_id});
       const existing=before.facts.find(f=>f.key===change.key);
       assert.ok(existing);
       await recordSourceAttestedEvidence({
         continuityRuntime:runtime,worldId:fixtureWorld.world_id,
         sourceKind:'CONNECTED_PROVIDER_READBACK',
         sourceRef:'synthetic-fixture:supplier-update',
         sourceDigest:'fixture-supersession-20',
         facts:[{key:change.key,value:change.value,supersedes_evidence_ref:existing.evidence_ref}],
         observedAt:at,
       });
     }
     const source=readGroundedEvidence(
       orderContinuityHistory(await runtime.readback()),{worldId:fixtureWorld.world_id});
     assert.ok(source.source_receipt_ids.length>0);
     const candidate=candidateFromScenario(scenario,source);
     const outcome=await runContinuousReliabilityCycle({
       continuityRuntime:runtime,
       modelOutput:'Scripted—not a live model—'+scenario.title+
         (scenario.change.free_text?' '+scenario.change.free_text:''),
       packetId:signal.packet.packet_id,structuredCandidate:candidate,
       authorizedWorldId:fixtureWorld.world_id,observedAt:at,
     });
     assert.equal(outcome.turn,scenario.turn);
     assert.equal(outcome.evaluation_status,'EVALUATED_AGAINST_SOURCE_ATTESTATION');
     assert.equal(outcome.readback_verified,true);
     assert.equal(outcome.hallucination_rate_pct,null);
     assert.equal(outcome.drift_rate_pct,null);
     assert.equal(outcome.correction_published_to_active_state,false);
     if(scenario.turn===8||scenario.turn===23)
       assert.ok(outcome.drift.includes('WORLD_SCOPE_DRIFT'));
     original.push(outcome.receipt_id);
     last=outcome;
   }
   assert.equal(new Set(original).size,25);
   assert.ok(last.checkpoint);
   assert.equal(last.checkpoint.window_start,1);
   assert.equal(last.checkpoint.window_end,25);
   assert.equal(last.checkpoint.recorded_assessments,25);
   assert.equal(last.checkpoint.source_attested_structured_turns,25);
   assert.equal(last.checkpoint.independently_evaluated_turns,0);
   assert.equal(last.checkpoint.readback_verified,true);
   assert.ok(last.checkpoint.retrospective_discrepancies.length>0);
   const history=orderContinuityHistory(db.events);
   assert.equal(history.filter(x=>x.event_kind==='RAW_SIGNAL').length,25);
   assert.equal(history.filter(x=>x.payload?.event_type==='HISTORICAL_BACKCHECK').length,1);
   assert.equal(history.filter(x=>x.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT').length,25);
   assert.equal(history.filter(x=>x.payload?.event_type==='SOURCE_ATTESTED_EVIDENCE').length,2);
 });
});
