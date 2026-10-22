import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION} from '../src/reality-trusted-observation-admission-v0.1.js';
import {inspectPersistedEpistemicDifferences} from '../src/reality-live-epistemic-diagnostics-v0.1.js';
import {runLiveIntelligenceOrchestration} from '../src/reality-live-intelligence-orchestration-v0.1.js';
const root='root:diagnostics',t='2026-10-22T12:00:00Z';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY ||= 'test-only-key';
function record(id,value,{scope=root,recorded=t,effective=t,kind='FACT'}={}){
 const obs=createObservation({
  source:'INVOICE',domain:'BUSINESS',sourceRecordId:id,observedAt:recorded,eventTime:effective,
  eventType:'CLAIM',objectRefs:['invoice:17'],provenance:{continuity_root_id:scope},
  contentOrMetadata:{epistemic_claims:[{target_state_key:'invoice.amount',claim_kind:kind,value}]},
 });
 return createUniverseEntry({
  entry_id:'stored:'+id,continuity_root_id:scope,worldline_id:'reality:primary',
  event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:recorded,effective_time:effective,source_ref:'INVOICE',
  payload:{observation:obs,source_attestation:{independently_source_read:true,observation_hash:obs.observation_hash}},
  evidence_references:['source:verified'],provenance:{source:TRUSTED_OBSERVATION_ADMISSION_VERSION},
 });
}
const conflicting=[record('old',90),record('new',100,{recorded:'2026-10-22T12:01:00Z'})];
test('native detector reports a typed conflict without asserting which value is true',()=>{
 const d=inspectPersistedEpistemicDifferences({entries:conflicting,continuityRootId:root});
 assert.equal(d.contradictions.length,1);
 assert.equal(d.contradictions[0].classification,'E_FACT_CONFLICT');
 assert.equal(d.intervention_count,0);assert.equal(d.semantic_truth_established,false);
});
test('valid new effective time means delta, not hallucination',()=>{
 const d=inspectPersistedEpistemicDifferences({entries:[
 record('prior','PENDING'),record('later','COMPLETED',{recorded:'2026-10-22T12:01:00Z',effective:'2026-10-22T12:01:00Z'})],
 continuityRootId:root});
 assert.equal(d.contradictions.length,0);
 assert.equal(d.discrepancies[0].classification,'E_DELTA');
});
test('wrong principal and untrusted observations cannot be promoted to evidence',()=>{
 const tampered={...record('forged',200),provenance:{source:'USER_CONTROLLED'}};
 const d=inspectPersistedEpistemicDifferences({entries:[conflicting[0],
 record('other',400,{scope:'root:other'}),tampered],continuityRootId:root});
 assert.equal(d.source_observation_count,1);
 assert.equal(d.ignored_untrusted_or_out_of_scope,2);
 assert.equal(d.discrepancies.length,0);
});
test('ordinary live intelligence actually receives the observation-only detector results',async()=>{
 const old=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 let model=null;const rows=new Map(conflicting.map(x=>[x.entry_id,x]));
 async function fetchImpl(url,options={}){
  const u=new URL(url);
  if(u.hostname==='api.openai.com'){
   model=JSON.parse(JSON.parse(options.body).input[1].content[0].text).system_context;
   return {ok:true,status:200,json:async()=>({id:'stub',status:'completed',output_text:'Amounts conflict.'})};
  }
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('UNEXPECTED_URL');
  if(options.method==='POST'){const x=JSON.parse(options.body);rows.set(x.entry_id,x);
   return {ok:true,status:201,json:async()=>[x]};}
  const p=u.searchParams;let all=[...rows.values()];
  for(const col of ['entry_id','continuity_root_id','event_kind']){
   const v=p.get(col);if(v?.startsWith('eq.'))all=all.filter(x=>x[col]===v.slice(3));
  }
  all.sort((a,b)=>b.assertion_time.localeCompare(a.assertion_time));
  return {ok:true,status:200,json:async()=>all.slice(0,Number(p.get('limit')||1000))};
 }
 try {
 const result=await runLiveIntelligenceOrchestration({message:'Explain the invoice.',
  observedAt:'2026-10-22T12:02:00Z',systemContext:{continuity_root_id:root},
  apiKey:'synthetic',fetchImpl});
 assert.equal(result.mode,'CONVERSATIONAL');
 assert.equal(result.context.epistemic_diagnostics.contradictions.length,1);
 assert.equal(model.epistemic_diagnostics.contradictions.length,1);
 assert.equal(result.authority.granted,false);
 assert.equal(result.context.epistemic_diagnostics.intervention_count,0);
 }finally{
  if(old===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=old;
 }
});
