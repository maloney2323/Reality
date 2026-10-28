// Independent secretless verifier, NEVER the generation agent.
// Execution inside read-only, network-disabled Docker. No GitHub writes.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment,authorizeSandboxExperiment,validateSandboxResult}
  from '/repo/src/reality-autonomous-capability-loop-v1.0.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const baseline=JSON.parse(readFileSync('/evidence/baseline.json','utf8'));
const savedExperiment=JSON.parse(readFileSync('/evidence/experiment.json','utf8'));
const generated=JSON.parse(readFileSync('/work/generation.json','utf8'));
const bytes=readFileSync('/work/candidate.mjs');
assert.equal(baseline.original_work_id,generated.original_work_id);
assert.equal(baseline.original_work_id,savedExperiment.work_item_id);
assert.equal(baseline.experiment_hash,generated.experiment_hash);
assert.equal(generated.model_generated,true);
assert.equal(generated.status,'MODEL_CANDIDATE_GENERATED_UNTRUSTED');
assert.equal(generated.candidate_sha256,sha(bytes));
assert.match(String(generated.model_response_id),/^resp_/);
assert.equal(baseline.target_does_not_exist,true);
assert.equal(baseline.actual_failure,'ERR_MODULE_NOT_FOUND');
assert.equal(baseline.real_red_test_exit===0,false);
assert.equal(savedExperiment.state,'SANDBOX_PROPOSED');
assert.equal(savedExperiment.production_graph_write_permitted,false);
const mod=await import(pathToFileURL('/work/candidate.mjs').href);
assert.equal(typeof mod.evaluateEstimateRelease,'function');
const run=x=>mod.evaluateEstimateRelease(x);
const base={estimate_id:'EST-204',homeowner_approved:false,
 approval_evidence_id:null,owner_reviewed:false};
const cases=[
 ['no approvals',{},'HOLD','HOMEOWNER_APPROVAL_MISSING'],
 ['typed no approval', {homeowner_approved:'true',owner_reviewed:true,approval_evidence_id:'approval:abcdefgh'},'HOLD','HOMEOWNER_APPROVAL_MISSING'],
 ['numeric no approval',{homeowner_approved:1,owner_reviewed:true,approval_evidence_id:'approval:abcdefgh'},'HOLD','HOMEOWNER_APPROVAL_MISSING'],
 ['no evidence',{homeowner_approved:true,owner_reviewed:true},'HOLD','APPROVAL_EVIDENCE_MISSING'],
 ['malformed evidence',{homeowner_approved:true,owner_reviewed:true,approval_evidence_id:'receipt:abcdefgh'},'HOLD','APPROVAL_EVIDENCE_MISSING'],
 ['too short evidence',{homeowner_approved:true,owner_reviewed:true,approval_evidence_id:'approval:abc'},'HOLD','APPROVAL_EVIDENCE_MISSING'],
 ['missing review',{homeowner_approved:true,approval_evidence_id:'approval:abcdefgh'},'HOLD','OWNER_REVIEW_REQUIRED'],
 ['string review',{homeowner_approved:true,owner_reviewed:'true',approval_evidence_id:'approval:abcdefgh'},'HOLD','OWNER_REVIEW_REQUIRED'],
 ['ready',{homeowner_approved:true,owner_reviewed:true,approval_evidence_id:'approval:abcdefgh'},'READY_FOR_AUTHORIZATION','SEPARATE_SEND_AUTHORIZATION_REQUIRED'],
 ['alternate estimate',{estimate_id:'C-9.a:12',homeowner_approved:true,owner_reviewed:true,approval_evidence_id:'approval:ab-cd-ef'},'READY_FOR_AUTHORIZATION','SEPARATE_SEND_AUTHORIZATION_REQUIRED'],
];
let passed=0;
for(const [name,changes,status,reason] of cases){
 const obj={...base,...changes}, r=run(obj);
 assert.deepEqual(r,{estimate_id:obj.estimate_id,status,reason,external_action_authorized:false},name);
 passed++;
}
for(const invalid of [null,undefined,[],4,'text',{},{estimate_id:''},{estimate_id:'  '},{estimate_id:'../secrets'},{estimate_id:'ID with space'}]){
 assert.throws(()=>run(invalid),'invalid input must throw');passed++;
}
const another=run({...base,estimate_id:'EST-204',homeowner_approved:true,
 owner_reviewed:true,approval_evidence_id:'approval:abcdefgh'});
assert.notEqual(another.status,'SENT');
assert.equal(another.external_action_authorized,false);passed++;
const verified=authorizeSandboxExperiment(savedExperiment,{
 authorizationRef:'controlled-ci-sandbox-only-not-an-install-grant',
 authorizedBy:'independent-test-harness',
});
const verifiedExperiment=validateSandboxResult(verified,{
 synthesizedCapability:{files:[{path:baseline.missing_target,mode:'100644',content:bytes.toString('utf8')}]},
 frozenRegression:{passed:true,source:'independent-red-green-ci'},
 isolatedVerification:{verified:true,network_permitted:false,secrets_accessible:false,
  holdout_count:cases.length+11},
 capabilitySignature:sha(bytes),
});
assert.equal(verifiedExperiment.state,'SANDBOX_VERIFIED');
assert.equal(verifiedExperiment.work_item_id,baseline.original_work_id);
const report={
 version:'reality-controlled-finale-independent-result-v0.1',
 test_kind:'CONTROLLED_FAILURE_INJECTION_NONCUSTOMER',
 original_work_id:baseline.original_work_id,
 original_customer_job_id:baseline.original_customer_job_id,
 initial_failure_independently_observed:true,
 actual_missing_capability:baseline.missing_target,
 model_response_id:generated.model_response_id,model_generated:true,
 model_generated_source_sha256:sha(bytes),
 candidate_independent_holdouts_passed:passed,
 candidate_independent_holdouts_failed:0,
 experiment_hash:verifiedExperiment.experiment_hash,
 verification_hash:verifiedExperiment.verification_hash,
 verification_state:'SANDBOX_VERIFIED',
 source_was_not_installed:true,
 output_only:'AWAITING_REAL_OWNER_INSTALL_APPROVAL',
 preview_or_production_modified:false,
 persisted_owner_warrant_issued:false,
 owner_install_authorized:false,
 original_customer_job_completed:false,
 controlled_original_job_completed:false,
 finale_7_of_7_verified:false,
};
console.log(JSON.stringify(report,null,2));
