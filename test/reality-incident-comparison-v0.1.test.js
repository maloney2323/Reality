import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {runFullLoopSandboxProof} from '../src/reality-full-loop-sandbox-proof-v0.1.js';
import {scoreFullLoopProof} from '../src/reality-proof-telemetry-v0.1.js';
import {
 buildSandboxEvidenceComparison,scoreAdjudicatedModelTurns,
 projectDurableReliabilityIncidents,
} from '../src/reality-incident-comparison-v0.1.js';
import handler from '../api/reality/full-loop-sandbox-proof.js';

for(const config of [
 {name:'successful isolated recovery',args:{},expectedVerified:1},
 {name:'withheld authorization',args:{ownerApproval:false},expectedVerified:0},
 {name:'withheld read-back',args:{denyIndependentReadback:true},expectedVerified:0},
]){
 test(config.name+' has an honest two-sided evidence projection',async()=>{
  const proof=await runFullLoopSandboxProof(config.args);
  const telemetry=scoreFullLoopProof(proof);
  const c=buildSandboxEvidenceComparison({proof,telemetry});
  assert.equal(c.model.status,'NO_MODEL_REQUEST_IN_THIS_PROOF');
  assert.equal(c.model.correct_turns,null);
  assert.equal(c.model.drift_rate_pct,null);
  assert.equal(c.model.hallucination_rate_pct,null);
  assert.deepEqual(c.model.events,[]);
  assert.equal(c.reality.sandbox_verified_recoveries,config.expectedVerified);
  assert.equal(c.reality.events.length,(proof.receipts||proof.steps).length);
  assert.equal(c.roi.independently_verified_dollars_saved,null);
  assert.equal(c.roi.real_supervision_minutes_saved,null);
  assert.equal(c.matched_model_comparison,false);
  assert.equal(c.incidents[0].origin_turn,null);
  assert.equal(c.incidents[0].repair_verified_turn,null);
  assert.equal(c.incidents[0].model_attribution,'NO_UNDERLYING_MODEL_REQUEST');
  assert.equal(Boolean(c.incidents[0].sandbox_outcome_verified_step),Boolean(config.expectedVerified));
 });
}

test('tamper/no read-back cannot be converted into a valid comparative ROI claim',async()=>{
 const proof=await runFullLoopSandboxProof();
 const telemetry=scoreFullLoopProof(proof);
 const fake={...proof,receipts:proof.receipts.map(x=>({...x}))};
 fake.receipts[0].hash='not-a-real-hash';
 assert.throws(()=>buildSandboxEvidenceComparison({proof:fake,telemetry}),
   /COMPARISON_VERIFIED_SANDBOX_RECEIPTS_REQUIRED/);
 assert.throws(()=>buildSandboxEvidenceComparison({proof,telemetry:{...telemetry,receipt_chain_valid:false}}),
   /COMPARISON_VERIFIED_SANDBOX_RECEIPTS_REQUIRED/);
});

test('only independently adjudicated turns count as model correct or incorrect',()=>{
 const scored=scoreAdjudicatedModelTurns([
  {turn_id:'1',verdict:'CORRECT',independent_adjudication:true,source_receipt_id:'truth:1'},
  {turn_id:'2',verdict:'INCORRECT',independent_adjudication:true,source_receipt_id:'truth:2'},
  {turn_id:'3',verdict:'UNADJUDICATED'},
 ]);
 assert.equal(scored.correct_model_turns,1);
 assert.equal(scored.incorrect_model_turns,1);
 assert.equal(scored.unadjudicated_turns,1);
 assert.equal(scored.model_error_rate_pct,50);
 assert.equal(scoreAdjudicatedModelTurns([{turn_id:'1',verdict:'UNADJUDICATED'}]).model_error_rate_pct,null);
 assert.throws(()=>scoreAdjudicatedModelTurns([{turn_id:'1',verdict:'CORRECT'}]),
  /MODEL_VERDICT_NEEDS_INDEPENDENT_EVIDENCE/);
 assert.throws(()=>scoreAdjudicatedModelTurns([
  {turn_id:'1',verdict:'UNADJUDICATED'},{turn_id:'1',verdict:'UNADJUDICATED'}]),
  /MODEL_DUPLICATE_TURN_ID/);
});

test('one durable typed violation gets origin, exact location, detector, source and verified repair unknown',()=>{
 const incidents=projectDurableReliabilityIncidents([{
  event_id:'receipt:7',event_kind:'VERIFICATION',worldline_id:'construction:site-a',
  assertion_time:'2026-10-24T20:00:00Z',evidence_refs:['supplier:receipt'],
  payload:{event_type:'MODEL_OUTPUT_ASSESSMENT',turn:7,model_output_digest:'abc',
   violation_details:[{code:'FACT_DRIFT',path:'claims[2]',key:'cabinet_date',
       canonical_evidence_ref:'supplier:receipt'}],
   correction_proposed:true,structural_correction_verified:true,
   correction_published_to_active_state:false},
 }]);
 assert.equal(incidents.length,1);
 assert.equal(incidents[0].origin_turn,7);
 assert.equal(incidents[0].detection_turn,7);
 assert.equal(incidents[0].original_output_location,'claims[2]');
 assert.equal(incidents[0].correction_proposed_turn,7);
 assert.equal(incidents[0].independently_verified_repair_turn,null);
 assert.equal(incidents[0].repair_outcome,'NOT_INDEPENDENTLY_VERIFIED');
 assert.equal(incidents[0].root_cause_verified,false);
 assert.ok(incidents[0].evidence_refs.includes('supplier:receipt'));
});

test('legacy unlabeled finding remains visible as unlocalized, never scored clean',()=>{
 const items=projectDurableReliabilityIncidents([{
  event_id:'receipt:old',event_kind:'VERIFICATION',payload:{
    event_type:'MODEL_OUTPUT_ASSESSMENT',turn:4,drift:['OBLIGATION_LOSS'],
    hallucination_suspected:[],correction_proposed:false,
  }
 }]);
 assert.equal(items.length,1);
 assert.equal(items[0].finding_code,'HISTORICAL_FINDINGS_NOT_INDIVIDUALLY_LOCALIZED');
 assert.equal(items[0].original_output_location,null);
});

test('proof UI includes both evidence columns and executable JS',()=>{
 const html=readFileSync('full-loop-proof.html','utf8');
 assert.match(html,/id="model-column"/);
 assert.match(html,/id="reality-column"/);
 assert.match(html,/id="incident-lineage"/);
 assert.match(html,/id="comparison-roi"/);
 assert.match(html,/renderComparison\(body\.comparison\)/);
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script);
 assert.doesNotThrow(()=>new vm.Script(script[1]));
});

test('new preview branch produces source-scoped comparison; production rejects it',async()=>{
 const saved={env:process.env.VERCEL_ENV,ref:process.env.VERCEL_GIT_COMMIT_REF};
 const invoke=async()=>{
  const req={method:'POST',body:{mode:'success'}};
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},
   status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
  await handler(req,res);return res;
 };
 try{
  process.env.VERCEL_ENV='preview';
  process.env.VERCEL_GIT_COMMIT_REF='feature/reality-incident-lifecycle-evidence-v1-20261024';
  const ok=await invoke();
  assert.equal(ok.statusCode,200);
  assert.equal(ok.body.comparison.source_scope,'SYNTHETIC_SANDBOX_ONLY');
  process.env.VERCEL_ENV='production';
  const blocked=await invoke();
  assert.equal(blocked.statusCode,404);
 }finally{
  for(const [k,v] of [['VERCEL_ENV',saved.env],['VERCEL_GIT_COMMIT_REF',saved.ref]])
    if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
});
