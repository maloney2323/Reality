import test from 'node:test';
import assert from 'node:assert/strict';
import {
  issueTemporaryRepairWindow,evaluateTemporaryRepairWindow,
  TEMPORARY_REPAIR_SCOPE,WINDOW_MS,
} from '../src/reality-temporary-isolated-repair-window-v1.0.js';
const ownerId='11111111-1111-4111-8111-111111111111';
const originalWorkId='work:'+'b'.repeat(32);
const otherWorkId='work:'+'c'.repeat(32);
const branch='feature/reality-ten-minute-isolated-repair-lease-20261031';
const commit='d'.repeat(40),artifact='e'.repeat(64),createdAt='2026-10-31T06:00:00.000Z';
function grant(){return issueTemporaryRepairWindow({
  owner:{user_id:ownerId,authenticated:true,identity_source:'SIGNED_IN_REALITY_SESSION'},
  workScope:{owner_id:ownerId,original_work_id:originalWorkId,
   goal_id:'confirmed:user:goal',continuity_root_id:'root:trusted',
   worldline_id:'world:trusted',goal_confirmed:true,observed_failure_verified:true},
  branch,commitSha:commit,createdAt,
});}
function args(g=grant()){
 return {grant:g,ownerId,originalWorkId,goalId:g.goal_id,branch,commitSha:commit,
  artifactHash:artifact,now:'2026-10-31T06:05:00.000Z',
  verifiedSandbox:{artifact_hash:artifact,frozen_regression_passed:true,
   independent_tests_passed:true,governance_preserved:true,independently_verified:true},
  independentGrantReadback:{verified:true,grant_hash:g.grant_hash,
   original_work_id:originalWorkId,owner_id:ownerId,
   status:'OWNER_ISSUED_AND_DURABLY_RECORDED'},
  atomicSingleUseConsumption:{consumed_once:true,grant_id:g.grant_id,
   artifact_hash:artifact,target_environment:'ISOLATED_PREVIEW',
   production_changed:false,verified_by:'TRUSTED_ATOMIC_PROVIDER'},
 };
}
test('one signed-in owner issues only a ten-minute, one-preview-install, scope-bound grant',()=>{
 const g=grant();
 assert.equal(Date.parse(g.expires_at)-Date.parse(g.issued_at),WINDOW_MS);
 assert.equal(g.authorization_scope,TEMPORARY_REPAIR_SCOPE);
 assert.equal(g.maximum_attempts,3);
 assert.equal(g.installation_authorized,false);
 assert.equal(g.forbidden_operations.includes('PRODUCTION_DEPLOY'),true);
 assert.equal(g.forbidden_operations.includes('CONSTITUTIONAL_OR_IDENTITY_CHANGE'),true);
 assert.equal(evaluateTemporaryRepairWindow(args(g)).status,
  'ONE_PREVIEW_EXTENSION_ACTIVATION_PERMITTED');
});
test('model, unsigned owner or unverified original failure cannot issue a lease',()=>{
 const owner={user_id:ownerId,authenticated:true,identity_source:'MODEL_GENERATION'};
 assert.throws(()=>issueTemporaryRepairWindow({owner}),/AUTHENTICATED_OWNER_REQUIRED/);
 assert.throws(()=>issueTemporaryRepairWindow({owner:{...owner,identity_source:'SIGNED_IN_REALITY_SESSION'}}),
   /ORIGINAL_JOB_AND_GAP_PROVENANCE_REQUIRED/);
});
test('expiry and scope drift fail closed',()=>{
 const a=args();
 for(const patch of [
  {now:'2026-10-31T06:10:00.000Z'},
  {now:'2026-10-31T05:59:59.999Z'},
  {originalWorkId:otherWorkId},
  {commitSha:'a'.repeat(40)},
  {branch:'main'},
  {goalId:'other'},
 ]){
  assert.throws(()=>evaluateTemporaryRepairWindow({...a,...patch}),/REPAIR_WINDOW_/);
 }
});
test('a test pass is not a grant: independent owner readback and atomic consumption both mandatory',()=>{
 const a=args();
 assert.throws(()=>evaluateTemporaryRepairWindow({...a,independentGrantReadback:null}),
  /TRUSTED_OWNER_GRANT_READBACK_REQUIRED/);
 assert.throws(()=>evaluateTemporaryRepairWindow({...a,atomicSingleUseConsumption:null}),
  /SINGLE_USE_ATOMIC_CONSUMPTION_REQUIRED/);
 assert.throws(()=>evaluateTemporaryRepairWindow({...a,atomicSingleUseConsumption:{
  ...a.atomicSingleUseConsumption,consumed_once:false}}),
  /SINGLE_USE_ATOMIC_CONSUMPTION_REQUIRED/);
 assert.throws(()=>evaluateTemporaryRepairWindow({...a,verifiedSandbox:{
  ...a.verifiedSandbox,governance_preserved:false}}),
  /EXACT_INDEPENDENTLY_VERIFIED_EXTENSION_REQUIRED/);
});
test('a preview lease is not automatically an installed capability or settled job',()=>{
 const p=evaluateTemporaryRepairWindow(args());
 assert.equal(p.installed,false);
 assert.equal(p.job_completed,false);
 assert.equal(p.production_changed,false);
 assert.equal(p.shared_registry_write_authorized,false);
 assert.equal(p.preview_only,true);
});
