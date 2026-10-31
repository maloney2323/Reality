import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createGovernedSelfImprovement,proposeGovernedCandidate,
 acceptGovernedObservation
} from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {projectVerifiedSelfRepairOpportunity}
 from '../src/reality-upgrade-discovery-v0.1.js';
import {
 strategyFromConstitutionalJournal,
 strategyFromVerifiedFailureSummary,
 extractVerifiedFailureAssertions
} from '../src/reality-self-repair-strategy-v1.0.js';

const scope={owner_id:'owner:reality-test',goal_id:'user-goal:8fc58cf1bba093651cb18b8c9aefe471',
 original_work_id:'work:9b9578b3c65427589c4c6da68fe0fc87',
 continuity_root_id:'root:test',worldline_id:'worldline:test',
 goal_transition_receipt_ref:'receipt:confirmed-goal',
 goal_evidence_ref:'source:user-message',
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'sha256:immutable'};
let n=0;
async function receive(state,kind,extra={}){
 const ref='trusted:provider:receipt:'+ ++n;
 const receipt={...Object.fromEntries(['owner_id','goal_id','original_work_id',
 'continuity_root_id','worldline_id'].map(k=>[k,state.scope[k]])),
 kind,evidence_ref:ref,evidence_hash:'trusted:hash:'+n,...extra};
 return acceptGovernedObservation(state,receipt,{verifyProvider:async data=>({
  verified:true,independent_provider_readback:true,
  evidence_ref:data.receipt.evidence_ref,evidence_hash:data.receipt.evidence_hash,
  original_work_id:state.scope.original_work_id,scope_hash:state.scope_hash,
  attestation_ref:'attestor:'+ref
 })});
}
const source=n=>({rationale:'Correct the independently verified failure',
 verification_plan_ref:'frozen:test',files:[
 {path:'src/reality-extensions/example.js',content:'export const x='+n+';'},
 {path:'test/reality-extensions/example.test.js',content:'export const t='+n+';'}]});
const output=[
 '[FROZEN independent sandbox diagnostics]',
 'not ok 2 - absent provider provenance or incomplete exact hash cannot start generation',
 "    + 'MISSING_CAPABILITY'","    - 'INSUFFICIENT_EVIDENCE'",
 'not ok 6 - foreign repository, stale SHA, owner/goal contamination never authorize generation',
 '    true !== false','# fail 2'].join('\n');
async function setup(){
 let state=createGovernedSelfImprovement({scope,attemptLimit:3});
 state=await receive(state,'GAP_CONFIRMED',{capability_id:'reality.ci-failure-evidence-v1',
  failure_refs:['github:actions:failure'],verification_suite_ref:'suite:frozen'});
 return state;
}
async function fail(state,index){
 const proposed=proposeGovernedCandidate(state,source(index));
 return receive(proposed,'SANDBOX_FAILED',{
  artifact_hash:proposed.candidate.artifact_hash,
  diagnostics:{code:'TEST_FAILED',output},
 });
}
test('initial gap creates a non-authoritative repair plan without executing or installing',async()=>{
 const state=await setup();
 const plan=strategyFromConstitutionalJournal(state);
 assert.equal(plan.strategy,'TARGETED_ASSERTION_REPAIR');
 assert.equal(plan.original_work_id,scope.original_work_id);
 assert.equal(plan.model_may_propose,true);
 assert.equal(plan.discovered_work.category,'upgrades_and_improvements');
 assert.equal(plan.discovered_work.execution_authorized,false);
 assert.equal(plan.installation_authorized,false);
});
test('independent repeated failures change source-level strategy; history stays immutable',async()=>{
 let s=await setup();
 s=await fail(s,1);
 const first=strategyFromConstitutionalJournal(s);
 assert.equal(first.attempt_count,1);
 assert.equal(first.latest_failing_tests.length,2);
 assert.ok(first.root_cause_hypotheses.some(x=>x.includes('INSUFFICIENT_EVIDENCE')));
 const firstHash=s.head_hash;
 s=await fail(s,2);
 const repeated=strategyFromConstitutionalJournal(s);
 assert.equal(repeated.strategy,'SYSTEMIC_VALIDATION_REDESIGN');
 assert.equal(repeated.recurring_failures.length,2);
 assert.equal(repeated.evidence_refs.length,2);
 assert.equal(repeated.model_may_propose,true);
 assert.equal(s.journal.some(x=>x.event_hash===firstHash),true);
 s=await fail(s,3);
 const exhausted=strategyFromConstitutionalJournal(s);
 assert.equal(exhausted.strategy,'EVIDENCE_BOUND_REDESIGN_REQUIRED');
 assert.equal(exhausted.automatic_reexecution_permitted,false);
 assert.equal(exhausted.discovered_work.status,'BLOCKED_REQUIRES_NEW_AUTHORITY');
 assert.equal(exhausted.original_job_completed,false);
});
test('repair is visible as an upgrade discovery for the SAME original job, with zero new authority',async()=>{
 let s=await setup();
 s=await fail(s,1);
 const opportunity=projectVerifiedSelfRepairOpportunity({state:s});
 assert.equal(opportunity.discovery_status,'SOURCE_VERIFIED_REPAIR_DISCOVERY');
 assert.equal(opportunity.original_work_id,scope.original_work_id);
 assert.equal(opportunity.discovered_work.original_work_id,scope.original_work_id);
 assert.equal(opportunity.discovered_work.category,'upgrades_and_improvements');
 assert.equal(opportunity.discovered_work.execution_authorized,false);
 assert.equal(opportunity.new_job_created,false);
 assert.equal(opportunity.installation_authorized,false);
});
test('treat regression log as data, never self-approve or treat wrong value as real authority',()=>{
 const parsed=extractVerifiedFailureAssertions(output);
 assert.equal(parsed.failing_tests.length,2);
 assert.ok(parsed.expected_values.includes("'INSUFFICIENT_EVIDENCE'"));
 assert.ok(parsed.actual_values.includes("'MISSING_CAPABILITY'"));
 assert.throws(()=>strategyFromVerifiedFailureSummary({
  originalWorkId:scope.original_work_id,attemptCount:8,attemptLimit:8,
  checkpointHash:'0'.repeat(64),evidenceRef:'model:claimed-readback',
  diagnostics:output}),/INDEPENDENT_SUMMARY_NOT_VERIFIED/);
 const p=strategyFromVerifiedFailureSummary({
  originalWorkId:scope.original_work_id,attemptCount:8,attemptLimit:8,
  checkpointHash:'0'.repeat(64),
  evidenceRef:'vercel:provider-verified:sbx_valid:cmd_frozen:cmd_model',
  diagnostics:output});
 assert.equal(p.model_may_propose,false);
 assert.equal(p.original_job_completed,false);
});
test('tampered constitutional checkpoint cannot create source-verified repair strategy',async()=>{
 const s=await setup();
 assert.throws(()=>strategyFromConstitutionalJournal({...s,attempt_count:5}),
 /SELF_IMPROVEMENT_CHECKPOINT_INVALID|SELF_IMPROVEMENT_JOURNAL_PHASE_INVARIANT_VIOLATED/);
});
