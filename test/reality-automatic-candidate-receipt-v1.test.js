import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutomaticCandidateReceipt as project,independentlyReadBackReleasedCandidate as readback} from '../src/reality-automatic-candidate-receipt-v1.js';
const SHA='a'.repeat(40),SOURCE='b'.repeat(64),D1='c'.repeat(64),D2='d'.repeat(64),ID=41547631404;
const run={id:ID,status:'completed',conclusion:'success',head_sha:SHA,
 head_repository:{full_name:'maloney2323/Reality'},
 head_branch:'feature/reality-general-capability-engine-20261101'};
const artifacts={artifacts:[
 {name:'reality-customer-issue188-model-research-'+ID,digest:'sha256:'+D1,expired:false},
 {name:'reality-customer-issue188-independent-sandbox-'+ID,digest:'sha256:'+D2,expired:false},
]};
const args={run,artifacts,expectedRunId:ID,expectedSourceSha256:SOURCE,
 expectedProposalDigest:D1,expectedVerifierDigest:D2,expectedTests:21,
 ownerScopeVerified:true};
test('automatic independent receipt is deterministically derived, never owner installation',()=>{
 const a=project(args),b=project(args);
 assert.deepEqual(a,b);
 assert.match(a.receipt_id,/^candidate-receipt:[a-f0-9]{32}$/);
 assert.equal(a.verification_checks_passed,21);
 assert.equal(a.new_owner_job_created,false);
 assert.equal(a.owner_work_authorized,false);
 assert.equal(a.installation_authorized,false);
 assert.equal(a.installed,false);
 assert.equal(a.original_job_settled_by_candidate,false);
 assert.equal(a.production_changed,false);
 assert.equal(a.saved_provider_artifact_receipt,true);
});
test('forged status, scope, archive hash and branch do not mint a receipt',()=>{
 for(const bad of [
  {...args,ownerScopeVerified:false},
  {...args,run:{...run,status:'in_progress'}},
  {...args,run:{...run,conclusion:'failure'}},
  {...args,run:{...run,head_repository:{full_name:'other/Reality'}}},
  {...args,run:{...run,head_branch:'main'}},
  {...args,artifacts:{artifacts:[artifacts.artifacts[0]]}},
  {...args,artifacts:{artifacts:artifacts.artifacts.map(a=>({...a,expired:true}))}},
  {...args,expectedVerifierDigest:'e'.repeat(64)},
 ])assert.throws(()=>project(bad),/REALITY_AUTO_RECEIPT_/);
});

test('durable readback independently matches full receipt and rejects foreign or invented release',()=>{
 const candidate=project(args),hash='f'.repeat(64);
 const released={receipt_id:candidate.receipt_id,
  status:'RELEASED_VERIFIED_PROVIDER_EVIDENCE',
  source_issue:188,source_sha256:SOURCE,provider_run_id:ID,
  verified_checks_passed:21,verifier_archive_sha256:D2,
  verifier_report_sha256:hash,durable_readback_verified:true,
  owner_work_binding_verified:false,installation_authorized:false,
  installed:false,original_job_settled_by_this_receipt:false,
  production_changed:false,released_at:'2026-11-03T00:31:57Z'};
 const owner={schema:'reality-owner-released-capability-receipts-v1',
  receipts:[released],owner_work_authorized_by_receipts:false,
  installation_authorized:false,production_changed:false};
 const result=readback({candidateReceipt:candidate,ownerReadback:owner,
  expectedVerifierReportSha256:hash});
 assert.equal(result.status,'INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED');
 assert.equal(result.durable_release_readback_verified,true);
 assert.equal(result.record_is_immutable,true);
 assert.equal(result.installation_authorized,false);
 for(const wrong of [
  {...owner,receipts:[]},
  {...owner,receipts:[released,released]},
  {...owner,receipts:[{...released,verified_checks_passed:22}]},
  {...owner,receipts:[{...released,installation_authorized:true}]},
  {...owner,receipts:[{...released,verifier_report_sha256:'0'.repeat(64)}]},
  {...owner,owner_work_authorized_by_receipts:true},
 ])assert.throws(()=>readback({candidateReceipt:candidate,ownerReadback:wrong,
  expectedVerifierReportSha256:hash}),/REALITY_AUTO_RECEIPT_/);
});
