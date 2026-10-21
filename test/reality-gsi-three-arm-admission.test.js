import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {
 freezeThreeArmContract,createThreeArmReport,canonicalTrainingAttestation,
 verifyThreeArmAdmission,TRAINING_ADMISSION_VERSION
} from '../src/reality-gsi-three-arm-admission-v0.1.js';
import {promoteLearningCandidate} from '../src/reality-gsi-training-ground-v0.1.js';
import {canonicalOwnerConsentMessage,OWNER_CONSENT_SCHEMA} from '../src/reality-owner-consent-boundary-v0.1.js';

const evaluatorKeys=generateKeyPairSync('ed25519');
const ownerKeys=generateKeyPairSync('ed25519');
process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY=evaluatorKeys.publicKey.export({type:'spki',format:'pem'});
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=ownerKeys.publicKey.export({type:'spki',format:'pem'});
const cases=['case-1','case-2','hidden-3','hidden-4'];
const contract=freezeThreeArmContract({
  model:'synthetic-test-only-model',provider:'test-only',model_version:'frozen-v1',parameters_hash:'config-sha',
  benchmark_version:'v1',case_ids:cases,heldout_case_ids:['hidden-3','hidden-4'],scorer_hash:'scorer-locked-v1',
  seed:'seed-locked-v1',governance_kernel_hash:'kernel-locked-v1',
  allowed_candidate_capability:'supplier-lookup-verified',baseline_id:'baseline:v1',candidate_id:'candidate:v1',
  candidate_hash:'candidate-hash:v1',baseline_tool_manifest_hash:'tools:base',
  improved_tool_manifest_hash:'tools:base+approved-supplier-lookup'
});
const baseGood=new Set(['case-1']);
const govGood=new Set(['case-1','case-2']);
const upgradeGood=new Set(['case-1','case-2','hidden-3']);
function arm(phase,{completed,toolManifest=null,model='synthetic-test-only-model',badClaims=false,extra={}}={}){
  return {
    model,provider:contract.provider,model_version:contract.model_version,parameters_hash:contract.parameters_hash,
    tool_manifest_hash:toolManifest||(phase==='C_GOVERNED_IMPROVED'?contract.improved_tool_manifest_hash:contract.baseline_tool_manifest_hash),
    ...(phase==='C_GOVERNED_IMPROVED'?{activated_capability_id:contract.allowed_candidate_capability}:{}),
    case_results:cases.map((case_id,i)=>({
      case_id,receipt_ref:phase+':receipt:'+case_id,trace_hash:phase+':trace:'+case_id,
      completed:completed.has(case_id),
      hallucination_escape:badClaims && i===1,
      drift_failure:badClaims && i===2,
      unauthorized_action:false,false_block:false,recovered:phase!=='A_BASELINE'&&i===0,
    })),
    ...extra,
  };
}
function normalArms(){return {
  A_BASELINE:arm('A_BASELINE',{completed:baseGood,badClaims:true}),
  B_GOVERNED:arm('B_GOVERNED',{completed:govGood}),
  C_GOVERNED_IMPROVED:arm('C_GOVERNED_IMPROVED',{completed:upgradeGood}),
};}
function report(arms=normalArms()){
  return createThreeArmReport({contract,arms,training_case_ids:['case-1','case-2']});
}
function signedEvaluator(r,patch={}){
  const now=Date.now();
  const body={version:TRAINING_ADMISSION_VERSION,decision:'INDEPENDENTLY_ATTEST_THREE_ARM_RESULTS',
    evaluator_id:'mock-evaluator-harness:unit-test',report_hash:r.report_hash,
    baseline_id:r.baseline_id,candidate_id:r.candidate_id,
    evidence_root_hash:'evidence-root:mock',independent_readback_ref:'mock-readback:local',
    issued_at:new Date(now-2000).toISOString(),expires_at:new Date(now+3600000).toISOString(),
    nonce:'mock-attestation:'+r.report_hash.slice(0,16),...patch};
  return {...body,signature:sign(null,Buffer.from(canonicalTrainingAttestation(body)),evaluatorKeys.privateKey).toString('base64')};
}
function signedOwner(r){
  const now=Date.now();const body={
    schema:OWNER_CONSENT_SCHEMA,owner_id:'owner:unit-test',
    purpose:'AUTHORIZE_SHADOW_PROMOTION_ONLY',
    subject_ref:r.report_hash,original_task_ref:contract.baseline_id,
    governance_kernel_ref:contract.governance_kernel_hash,consent_ref:'promotion:unit-test',
    issued_at:new Date(now-2000).toISOString(),expires_at:new Date(now+3600000).toISOString(),
    nonce:'unit-test-owner:one-time'};
  return {...body,signature:sign(null,Buffer.from(canonicalOwnerConsentMessage(body)),ownerKeys.privateKey).toString('base64')};
}
const fakeEvaluation={
  verdict:'PROVISIONAL_PASS_REQUIRES_EXTERNAL_ATTESTATION',
  evidence:{baseline_id:contract.baseline_id,candidate_id:contract.candidate_id,
    candidate_hash:contract.candidate_hash,governance_kernel_hash:contract.governance_kernel_hash},
  metrics:{hidden_generalization_delta:.2,regression_passed:true,governance_preserved:true}
};

test('A/B/C report measures gains separately but never self-attests',()=>{
  const r=report();
  assert.equal(r.reported_metrics.A_BASELINE.completed,1);
  assert.equal(r.reported_metrics.B_GOVERNED.completed,2);
  assert.equal(r.reported_metrics.C_GOVERNED_IMPROVED.completed,3);
  assert.equal(r.reported_deltas.governance_completed_delta,1);
  assert.equal(r.reported_deltas.approved_upgrade_completed_delta,1);
  assert.equal(r.reported_deltas.hidden_upgrade_completed_delta,1);
  assert.equal(r.reported_deltas.hallucination_escape_reduction,1);
  assert.equal(r.reported_deltas.drift_reduction,1);
  assert.equal(r.evidence_status,'REPORTED_RECEIPTS_NOT_INDEPENDENTLY_ATTESTED');
  assert.equal(r.candidate_activation_authorized,false);
  assert.ok(Object.values(r.admission_checks).every(Boolean));
});
test('same model, model params and tools required for unbiased comparisons',()=>{
  let a=normalArms();a.B_GOVERNED.model='unfair-model';
  assert.throws(()=>report(a),/UNDERLYING_MODEL_PARITY_FAILED/);
  a=normalArms();a.B_GOVERNED.tool_manifest_hash='extra-secret-tools';
  assert.throws(()=>report(a),/TRAINING_TOOLS_NOT_DISCLOSED_OR_NOT_PARITY/);
  a=normalArms();a.C_GOVERNED_IMPROVED.activated_capability_id='unapproved-new-tool';
  assert.throws(()=>report(a),/UNDECLARED_CAPABILITY_UPGRADE/);
});
test('missing and duplicate case receipts and contradictory completion block',()=>{
  let a=normalArms();a.B_GOVERNED.case_results.pop();
  assert.throws(()=>report(a),/ARM_CASE_PARITY_FAILED/);
  a=normalArms();a.B_GOVERNED.case_results[1].case_id=a.B_GOVERNED.case_results[0].case_id;
  assert.throws(()=>report(a),/ARM_CASE_PARITY_FAILED/);
  a=normalArms();a.B_GOVERNED.case_results[0].receipt_ref='';
  assert.throws(()=>report(a),/TRAINING_CASE_RECEIPT_REQUIRED/);
  a=normalArms();a.B_GOVERNED.case_results[0].false_block=true;
  assert.throws(()=>report(a),/TRAINING_CONTRADICTORY_OUTCOME/);
});
test('heldout leakage rejects candidate report',()=>{
  assert.throws(()=>createThreeArmReport({contract,arms:normalArms(),
    training_case_ids:['case-1','hidden-3']}),/TRAINING_HELDOUT_CONTAMINATION/);
});
test('regressions remain visible and block admission',()=>{
  const a=normalArms();a.C_GOVERNED_IMPROVED.case_results[0].completed=false;
  a.C_GOVERNED_IMPROVED.case_results[1].completed=false;
  a.C_GOVERNED_IMPROVED.case_results[3].completed=false;
  const r=report(a);assert.equal(r.admission_checks.no_upgrade_completion_regression,false);
  assert.throws(()=>verifyThreeArmAdmission({report:r,attestation:signedEvaluator(r),
    baseline_id:r.baseline_id,candidate_id:r.candidate_id,candidate_hash:r.candidate_hash}),
    /TRAINING_GENERALIZATION_OR_SAFETY_GATE_FAILED/);
});
test('false positives are measured and block a governance-weakening upgrade',()=>{
  const a=normalArms();a.C_GOVERNED_IMPROVED.case_results[3].false_block=true;
  const r=report(a);
  assert.equal(r.admission_checks.no_false_block_regression,false);
  assert.equal(r.reported_deltas.false_block_delta,0); // delta compares B with A, candidate checked separately
  assert.throws(()=>verifyThreeArmAdmission({report:r,attestation:signedEvaluator(r),
    baseline_id:r.baseline_id,candidate_id:r.candidate_id,candidate_hash:r.candidate_hash}),
    /TRAINING_GENERALIZATION_OR_SAFETY_GATE_FAILED/);
});
test('self-reported passed scores are not independent verification',()=>{
  const r=report();
  assert.throws(()=>verifyThreeArmAdmission({report:r,baseline_id:r.baseline_id,
    candidate_id:r.candidate_id,candidate_hash:r.candidate_hash}),
    /TRAINING_INDEPENDENT_ATTESTATION_REQUIRED/);
  const fake={...signedEvaluator(r),signature:'AA'};
  assert.throws(()=>verifyThreeArmAdmission({report:r,attestation:fake,baseline_id:r.baseline_id,
    candidate_id:r.candidate_id,candidate_hash:r.candidate_hash}),
    /TRAINING_INDEPENDENT_SIGNATURE_INVALID/);
});
test('tampering score after independent signature is rejected',()=>{
  const r=report();const changed={...r,reported_deltas:{...r.reported_deltas,approved_upgrade_completed_delta:99}};
  assert.throws(()=>verifyThreeArmAdmission({report:changed,attestation:signedEvaluator(r),
    baseline_id:r.baseline_id,candidate_id:r.candidate_id,candidate_hash:r.candidate_hash}),
    /TRAINING_REPORT_TAMPERED/);
});
test('training-ground cannot return PROMOTED from approved:true, only signed shadow proposal',()=>{
  const r=report(),attestation=signedEvaluator(r);
  assert.throws(()=>promoteLearningCandidate({evaluation:fakeEvaluation,promotionRef:'promotion:unit-test',
    promotionAuthority:{approved:true,authorized_by:'claimed-human'},trainingReport:r,trainingAttestation:attestation}),
    /OWNER_CONSENT_SCOPE_MISMATCH/);
  const proposal=promoteLearningCandidate({evaluation:fakeEvaluation,promotionRef:'promotion:unit-test',
    promotionAuthority:{approved:true,owner_approval:signedOwner(r)},trainingReport:r,trainingAttestation:attestation});
  assert.equal(proposal.state,'PROMOTION_PENDING');
  assert.equal(proposal.production_deploy_authorized,false);
  assert.equal(proposal.original_task_execution_authorized,false);
  assert.equal(proposal.owner_consent_consumed,false);
  assert.equal(proposal.customer_task_completed,false);
  assert.equal(proposal.training_report_hash,r.report_hash);
});
test('promotion binds to exact candidate hash and original baseline',()=>{
  const r=report(),attestation=signedEvaluator(r);
  assert.throws(()=>promoteLearningCandidate({evaluation:{...fakeEvaluation,evidence:{...fakeEvaluation.evidence,candidate_hash:'unrelated'}},
    promotionAuthority:{approved:true,owner_approval:signedOwner(r)},promotionRef:'promotion:unit-test',
    trainingReport:r,trainingAttestation:attestation}),/TRAINING_ADMISSION_SCOPE_MISMATCH/);
});
