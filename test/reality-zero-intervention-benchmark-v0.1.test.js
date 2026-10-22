import test from 'node:test';
import assert from 'node:assert/strict';
import { createObservation } from '../src/reality-world-observation-fabric-v0.1.js';
import { inspectEpistemicDifferences } from '../src/reality-epistemic-difference-detector-v0.1.js';
import { reconstructUniverse } from '../src/reality-universe-reconstruction-v0.1.js';
const earlier='2026-10-20T10:00:00Z',later='2026-10-21T10:00:00Z';
function observation(id,value,options={}) {
 const {kind='FACT',effective=earlier,observed=effective,extra={},textOnly=false}=options;
 return createObservation({
  source:'ZIB_FIXTURE',domain:'BUSINESS',sourceRecordId:id,
  observedAt:observed,eventTime:effective,eventType:'ZIB_ASSERTION',
  objectRefs:['case:one'],provenance:{continuity_root_id:'zib:isolated-case'},
  contentOrMetadata:textOnly ? {message:String(value)} : {epistemic_claims:[{
   claim_kind:kind,target_state_key:'case.one.status',value,...extra,
  }]},
 });
}
const fixtures=[
 {
  name:'Valid reframing of a problem with new reasoning',
  observations:[observation('old','draft-only'),
    observation('new','change strategy after evidence',{kind:'REFRAMING',observed:later})],
  allowed:[],
 },
 {
  name:'Fact evolution at later effective time',
  observations:[observation('pending','PENDING'),
    observation('completed','COMPLETED',{effective:later})],
  allowed:['E_DELTA'],
 },
 {
  name:'Analogy and nonliteral metaphor',
  observations:[observation('a','old'),
    observation('b','The continuity ledger is a black box recorder',{kind:'METAPHOR',observed:later})],
  allowed:[],
 },
 {
  name:'Valid counterfactual thought experiment',
  observations:[observation('a','current'),
    observation('b','What if the budget doubled?',{kind:'COUNTERFACTUAL',observed:later})],
  allowed:['E_HYPOTHESIS'],
 },
 {
  name:'User-authorized goal revision with explicit reason',
  observations:[observation('a','ship original design'),
    observation('b','ship alternate design',{kind:'GOAL_REVISION',observed:later,
       extra:{change_reason:'old hardware proved unavailable'}})],
  allowed:['E_DELTA'],
 },
];
for(const fixture of fixtures) {
 test('ZIB mandatory zero-intervention: '+fixture.name,()=>{
  const result=inspectEpistemicDifferences({observations:fixture.observations});
  assert.deepEqual(result.epistemic_discrepancies.map(e=>e.classification),fixture.allowed);
  assert.equal(result.mode,'OBSERVATION_ONLY');
  assert.equal(result.intervention_count,0);
  assert.equal(result.authority_mutations,0);
  assert.equal(result.truth_promotions,0);
  assert.ok(result.epistemic_discrepancies.every(e=>
    e.observation_only===true &&
    e.enforcement_requested===false &&
    e.blocks_intelligence===false &&
    e.alters_authority===false));
  const reconstructed=reconstructUniverse({observations:fixture.observations,now:later});
  assert.equal(reconstructed.detector_summary.intervention_count,0);
  assert.deepEqual(reconstructed.contradictions,[]);
 });
}
test('ZIB is not vacuous: same-effective-time positive conflict still detected passively',()=>{
 const old=observation('invoice-a',90);
 const conflicting=observation('invoice-b',100,{observed:later});
 const result=inspectEpistemicDifferences({observations:[old,conflicting]});
 assert.equal(result.contradictions.length,1);
 assert.equal(result.contradictions[0].classification,'E_FACT_CONFLICT');
 assert.equal(result.intervention_count,0);
 assert.equal(result.contradictions[0].enforcement_requested,false);
});
test('ZIB is not vacuous: unsupported execution claim is recorded without interfering with reasoning',()=>{
 const event=observation('completed','COMPLETED',{kind:'EXECUTION_COMPLETION',
   extra:{verification_receipt_id:'receipt:not-independently-observed'}});
 const r=inspectEpistemicDifferences({observations:[event]});
 assert.equal(r.epistemic_discrepancies[0].classification,'E_UNATTESTED');
 assert.equal(r.intervention_count,0);
});
