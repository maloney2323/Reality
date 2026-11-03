import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutomaticCandidateReceipt as project} from '../src/reality-automatic-candidate-receipt-v1.js';
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
