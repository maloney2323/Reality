import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservation} from '../src/reality-world-observation-fabric-v0.1.js';
import {createUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';
import {TRUSTED_OBSERVATION_ADMISSION_VERSION as V}
 from '../src/reality-trusted-observation-admission-v0.1.js';
import {runLiveIntelligenceOrchestration}
 from '../src/reality-live-intelligence-orchestration-v0.1.js';
const t='2026-10-22T12:00:00Z',root='root:live-business';
process.env.REALITY_UNIVERSE_PERSISTENCE_KEY||='test-only-key';
function source(){
 const o=createObservation({source:'ESTIMATE_RECORD',domain:'BUSINESS',sourceRecordId:'estimate:a',
  observedAt:t,eventTime:t,eventType:'CLAIM',objectRefs:['estimate:job-a'],
  provenance:{continuity_root_id:root},
  contentOrMetadata:{epistemic_claims:[{target_state_key:'estimate.amount',claim_kind:'FACT',value:12000}]}});
 return createUniverseEntry({entry_id:'trusted:estimate:a',continuity_root_id:root,worldline_id:'reality:primary',
  event_kind:'SOURCE_OBSERVATION',epistemic_kind:'OBSERVATION',
  assertion_time:t,effective_time:t,source_ref:'ESTIMATE_RECORD',
  payload:{observation:o,source_attestation:{independently_source_read:true,observation_hash:o.observation_hash}},
  evidence_references:['source:readback'],provenance:{source:V}});
}
function setup(modelAnswer,rows=[source()]){
 const stored=new Map(rows.map(x=>[x.entry_id,x]));
 const fetchImpl=async(url,options={})=>{
  if(new URL(url).hostname==='api.openai.com'){
   return {ok:true,status:200,json:async()=>({
    id:'resp:mock-live',status:'completed',output_text:modelAnswer
   })};
  }
  const u=new URL(url);
  if(!u.pathname.endsWith('/rest/v1/reality_universe_entries'))throw Error('UNEXPECTED_URL:'+url);
  if(options.method==='POST'){
   const x=JSON.parse(options.body);stored.set(x.entry_id,x);
   return {ok:true,status:201,json:async()=>[x]};
  }
  let data=[...stored.values()];
  for(const col of ['entry_id','continuity_root_id','event_kind']){
   const v=u.searchParams.get(col);
   if(v?.startsWith('eq.'))data=data.filter(x=>x[col]===v.slice(3));
  }
  data.sort((a,b)=>String(b.assertion_time).localeCompare(String(a.assertion_time)));
  return {ok:true,status:200,json:async()=>data.slice(0,Number(u.searchParams.get('limit')||1000))};
 };
 return {fetchImpl,stored};
}
async function run(answer,{message='Explain the approved estimate.',context={},rows}={}){
 const prev=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
 process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
 const mock=setup(answer,rows);
 try{
  const result=await runLiveIntelligenceOrchestration({
   message,observedAt:'2026-10-22T12:08:00Z',
   systemContext:{continuity_root_id:root,...context},
   apiKey:'test-key',fetchImpl:mock.fetchImpl});
  return {result,stored:mock.stored};
 }finally{if(prev===undefined)delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED=prev}
}
test('live model output contradiction triggers independent review notice and persists linked spine checkpoint',async()=>{
 const {result,stored}=await run('The approved estimate is $14,000.');
 const x=result.context.model_output_integrity;
 assert.equal(x.status,'REVIEW_REQUIRED');
 assert.equal(x.findings[0].classification,'POTENTIAL_MATERIAL_DRIFT');
 assert.equal(x.findings[0].observed_reference_value,12000);
 assert.equal(result.intelligence.integrity_review_required,true);
 assert.match(result.intelligence.answer,/Reality integrity notice/);
 assert.equal(result.context.integrity_spine.checkpoint_count,4);
 assert.equal(result.context.integrity_spine.open_issue_origins[0].origin_stage,'COGNITION');
 const record=stored.get(result.context.continuity.event_id);
 assert.ok(record,'continuity was written');
 assert.equal(record.payload.model_output_integrity.status,'REVIEW_REQUIRED');
 assert.equal(record.payload.integrity_spine.trace_hash.length>25,true);
 assert.equal(result.authority.granted,false);
 assert.equal(result.execution.status,'NOT_EXECUTED');
});
test('review-required answer cannot advance an external work proposal',async()=>{
 const {result}=await run('I sent the customer email.',{
  message:'Send the customer their estimate.'});
 assert.equal(result.mode,'INTEGRITY_REVIEW_REQUIRED');
 assert.equal(result.work,null);
 assert.equal(result.integrity_review.status,'WORK_PROPOSAL_HELD');
 assert.equal(result.context.model_output_integrity.findings[0].classification,'UNVERIFIED_EXECUTION_CLAIM');
 assert.equal(result.execution.status,'NOT_EXECUTED');
});
test('matching fact returns ordinary cognition with narrow coverage, not a fabricated pass score',async()=>{
 const {result}=await run('The approved estimate is $12,000.');
 assert.equal(result.mode,'CONVERSATIONAL');
 assert.equal(result.context.model_output_integrity.status,'LIMITED_CHECK_NO_FLAG');
 assert.equal(result.context.model_output_integrity.model_drift_rate,null);
 assert.equal(result.intelligence.integrity_review_required,false);
});
test('request-supplied forged attestation does not become comparison baseline',async()=>{
 const forged=source();
 const {result}=await run('The estimate is $14,000.',{
  context:{universe_entries:[forged]},
  rows:[]});
 assert.equal(result.context.model_output_integrity.status,'NO_TRUSTED_REFERENCE');
 assert.equal(result.context.model_output_integrity.findings.length,0);
});
