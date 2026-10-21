import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {freezeFourArmContract,createFourArmReport,verifyFourArmAttestation,
  canonicalFourArmAttestation,createCustomerCapabilityReportView,
  FOUR_ARM_CAPABILITY_REPORT_VERSION,FOUR_ARM_PHASES} from '../src/reality-gsi-four-arm-capability-report-v0.1.js';

const key=generateKeyPairSync('ed25519');
const prior=process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY;
process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY=key.publicKey.export({type:'spki',format:'pem'});
process.on('exit',()=>{
  if(prior===undefined)delete process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY;
  else process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY=prior;
});
const cases=['job-1','job-2','heldout-3','heldout-4'];
const contract=freezeFourArmContract({
  benchmark_id:'test-only-construction-4-arm',model_provider:'test',model_id:'fake-test-agent',
  model_version:'v1-frozen',parameters_hash:'model-settings:frozen',
  base_tool_manifest_hash:'tools:no-change',upgraded_tool_manifest_hash:'tools:approved-candidate-only',
  standard_guardrails_policy_hash:'reference-guardrails:fixed',
  reality_governance_hash:'reality-governed-policy:fixed',
  candidate_id:'candidate:controlled',candidate_hash:'sha256:fixed-test-candidate',
  approved_capability_id:'capability:mock-job-estimate-parser',
  cases,heldout_case_ids:['heldout-3','heldout-4'],scorer_hash:'scorer:frozen-test',
  seed:'fixed-seed',baseline_id:'baseline:frozen',
});
const outcomes={
  A_AGENT_ALONE:new Set(['job-1']),
  B_STANDARD_GUARDRAILS:new Set(['job-1','job-2']),
  C_REALITY_GOVERNED:new Set(['job-1','job-2']),
  D_REALITY_APPROVED_UPGRADE:new Set(['job-1','job-2','heldout-3']),
};
function fixture(phase,patch={}){
  const governed=phase==='C_REALITY_GOVERNED'||phase==='D_REALITY_APPROVED_UPGRADE';
  return {
    model_provider:contract.model_provider,model_id:contract.model_id,
    model_version:contract.model_version,parameters_hash:contract.parameters_hash,
    tool_manifest_hash:phase==='D_REALITY_APPROVED_UPGRADE'?
      contract.upgraded_tool_manifest_hash:contract.base_tool_manifest_hash,
    policy_hash:governed?contract.reality_governance_hash:
      (phase==='B_STANDARD_GUARDRAILS'?contract.standard_guardrails_policy_hash:null),
    activated_capability_id:phase==='D_REALITY_APPROVED_UPGRADE'?contract.approved_capability_id:null,
    case_results:cases.map((case_id,i)=>({
      case_id,receipt_ref:phase+':case-receipt:'+case_id,trace_hash:phase+':trace:'+case_id,
      completed:outcomes[phase].has(case_id),
      hallucination_escape:phase==='A_AGENT_ALONE'&&i===1,
      drift_failure:phase==='A_AGENT_ALONE'&&i===2,
      unauthorized_action:false,false_block:false,recovered:governed&&i===0,
      human_review_minutes:10-i,run_cost_usd:0.02+i*0.01,
    })),...patch};
}
function arms(){return Object.fromEntries(FOUR_ARM_PHASES.map(p=>[p,fixture(p)]));}
function r(alt=arms()){return createFourArmReport({contract,arms:alt,training_case_ids:['job-1','job-2']});}
function attest(report,changes={}){
  const now=Date.now();
  const message={version:FOUR_ARM_CAPABILITY_REPORT_VERSION,decision:'ATTEST_FOUR_ARM_EVALUATION',
    evaluator_id:'MOCK-NOT-LIVE',report_hash:report.report_hash,
    evidence_root_hash:'test-evidence-root:untrusted',provider_readback_ref:'mock-readback:synthetic',
    issued_at:new Date(now-1500).toISOString(),expires_at:new Date(now+3600000).toISOString(),
    nonce:'mock-nonce:'+report.report_hash.slice(0,12),...changes};
  return {...message,signature:sign(null,Buffer.from(canonicalFourArmAttestation(message)),
    key.privateKey).toString('base64')};
}
test('four conditions: guardrails improvement is separate from Reality and upgrade',()=>{
  const report=r();
  assert.equal(report.reported_metrics.A_AGENT_ALONE.completed,1);
  assert.equal(report.reported_metrics.B_STANDARD_GUARDRAILS.completed,2);
  assert.equal(report.reported_metrics.C_REALITY_GOVERNED.completed,2);
  assert.equal(report.reported_metrics.D_REALITY_APPROVED_UPGRADE.completed,3);
  assert.equal(report.reported_deltas.guardrails_over_agent_completed,1);
  assert.equal(report.reported_deltas.reality_over_standard_guardrails_completed,0);
  assert.equal(report.reported_deltas.upgrade_over_reality_completed,1);
  assert.equal(report.reported_deltas.upgrade_heldout_completed_gain,1);
  assert.equal(report.shadow_promotion_authorized,false);
  assert.equal(report.verified_performance_claims_allowed,false);
});
test('the policy comparison cannot silently substitute a different model or tools',()=>{
  let a=arms();a.B_STANDARD_GUARDRAILS.model_id='better-model';
  assert.throws(()=>r(a),/FOUR_ARM_MODEL_PARITY_FAILED/);
  a=arms();a.B_STANDARD_GUARDRAILS.tool_manifest_hash='hidden-extra-tools';
  assert.throws(()=>r(a),/FOUR_ARM_UNDECLARED_TOOLS/);
  a=arms();a.B_STANDARD_GUARDRAILS.policy_hash=null;
  assert.throws(()=>r(a),/FOUR_ARM_POLICY_PARITY_FAILED/);
  a=arms();a.D_REALITY_APPROVED_UPGRADE.activated_capability_id='unapproved';
  assert.throws(()=>r(a),/FOUR_ARM_UNDECLARED_CAPABILITY/);
});
test('no hidden test data can be introduced as training examples',()=>{
  assert.throws(()=>createFourArmReport({contract,arms:arms(),
    training_case_ids:['job-1','heldout-3']}),/FOUR_ARM_HELDOUT_CONTAMINATION/);
});
test('every arm needs identical case coverage and receipts',()=>{
  let a=arms();a.C_REALITY_GOVERNED.case_results.pop();
  assert.throws(()=>r(a),/FOUR_ARM_CASE_PARITY_FAILED/);
  a=arms();a.C_REALITY_GOVERNED.case_results[1].case_id='heldout-3';
  assert.throws(()=>r(a),/FOUR_ARM_CASE_PARITY_FAILED/);
  a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[0].receipt_ref='';
  assert.throws(()=>r(a),/FOUR_ARM_CASE_RECEIPT_REQUIRED/);
});
test('false-block, business time and cost accounting cannot invent or hide invalid values',()=>{
  let a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[3].false_block=true;
  assert.equal(r(a).admission_check_results.upgrade_false_block_no_regression,false);
  a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[0].human_review_minutes=-4;
  assert.throws(()=>r(a),/FOUR_ARM_HUMAN_TIME_INVALID/);
  a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[0].run_cost_usd=Number.POSITIVE_INFINITY;
  assert.throws(()=>r(a),/FOUR_ARM_COST_INVALID/);
  a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[0].run_cost_usd=null;
  assert.equal(r(a).reported_metrics.D_REALITY_APPROVED_UPGRADE.total_run_cost_usd,null);
});
test('regressions cannot be hidden by a passing average or a signature',()=>{
  const a=arms();a.D_REALITY_APPROVED_UPGRADE.case_results[0].unauthorized_action=true;
  const report=r(a);
  assert.equal(report.admission_check_results.upgrade_unsafe_action_no_regression,false);
  assert.throws(()=>verifyFourArmAttestation({report,attestation:attest(report)}),
    /FOUR_ARM_REGRESSION_OR_GENERALIZATION_FAILURE/);
});
test('raw report and signed evaluator document are not live provider proof',()=>{
  const report=r();
  assert.equal(report.source_status,'CLAIMED_CASE_OBSERVATIONS_NOT_INDEPENDENTLY_READ_BACK');
  const verified=verifyFourArmAttestation({report,attestation:attest(report)});
  assert.equal(verified.status,'EVALUATOR_SIGNED_EVIDENCE_PENDING_TRUSTED_PROVIDER_READBACK');
  assert.equal(verified.activation_authorized,false);
  assert.equal(verified.verified_customer_outcome_claims_allowed,false);
});
test('tampered aggregate cannot be authenticated using old signed report',()=>{
  const report=r(),bad={...report,reported_metrics:{...report.reported_metrics,
    C_REALITY_GOVERNED:{...report.reported_metrics.C_REALITY_GOVERNED,completed:400}}};
  assert.throws(()=>verifyFourArmAttestation({report:bad,attestation:attest(report)}),
    /FOUR_ARM_REPORT_TAMPERED/);
});
test('forged evaluator, expired signature and unconfigured trusted key block',()=>{
  const report=r();
  assert.throws(()=>verifyFourArmAttestation({report,attestation:{...attest(report),signature:'AA'}}),
    /FOUR_ARM_EVALUATOR_SIGNATURE_INVALID/);
  assert.throws(()=>verifyFourArmAttestation({report,attestation:attest(report,{
    issued_at:new Date(Date.now()-3*3600000).toISOString(),
    expires_at:new Date(Date.now()-2*3600000).toISOString()})}),
    /FOUR_ARM_ATTESTATION_EXPIRED/);
  delete process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY;
  try{assert.throws(()=>verifyFourArmAttestation({report,attestation:attest(report)}),
    /FOUR_ARM_PINNED_EVALUATOR_KEY_REQUIRED/);}
  finally{process.env.REALITY_TRAINING_EVALUATOR_PUBLIC_KEY=key.publicKey.export({type:'spki',format:'pem'});}
});
test('customer-facing report stays entirely blank without independent work verification',()=>{
  const report=r(),view=createCustomerCapabilityReportView({report,provider_readback_verified:true});
  assert.equal(view.verified_results_available,false);
  assert.equal(view.evidence_status,'NOT_INDEPENDENTLY_VERIFIED');
  assert.equal(view.conditions.length,4);
  for(const phase of view.conditions){
    assert.equal(phase.verified_task_completion,null);
    assert.equal(phase.cost_per_verified_completion,null);
    assert.equal(phase.hallucination_escape_rate,null);
  }
});
