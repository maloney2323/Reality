import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
import {buildExactOriginalExecutorWarrantEvidence}
 from '../src/reality-original-executor-trusted-warrant-recorder-v0.1.js';
import {issueUpgradeEvidenceWarrant,verifyUpgradeEvidenceWarrant}
 from '../src/reality-upgrade-evidence-warrant-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
const WORK='work:24cda9611404e9bcb47909976067605c';
const OWNER='11111111-1111-4111-8111-111111111111';
const CONV='22222222-2222-4222-8222-222222222222';
const GOAL='user-goal:219764fa8213a41a2ba638c5c2533d5b';
const ROOT='11111111-1111-4111-8111-111111111111';
const BRANCH='33333333-3333-4333-8333-333333333333';
const REV='4b2cfa74-f466-5f38-b2f1-46cc775fb93e';
const BASE='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const files=[
 {path:'src/reality-extensions/reality-original-maintenance-repair-proposal.mjs',mode:'100644',content:'export const a=1;\n'},
 {path:'src/reality-extensions/reality-original-maintenance-executor.mjs',mode:'100644',content:'export const b=2;\n'},
];
function fixture(){
 const scope=createContinuitySpine({continuityRootId:ROOT,worldlineId:BRANCH,subjectId:OWNER});
 const owner={
  owner_id:OWNER,conversation_id:CONV,original_work_id:WORK,
  owner_goal_confirmed:true,owner_evidence_acknowledged:true,
  goal:{scope:{root:ROOT,worldline:BRANCH},
   state:{active_goal_id:GOAL,continuity_root_id:scope.continuity_root_id,
    active_goal:{status:'ACTIVE',user_confirmed:true,
     last_transition_receipt_id:REV}}},
  relevant:[
   {event_id:'44444444-4444-4444-8444-444444444444',
    entity_type:'personal_recovery_checkpoint',event_kind:'WORK',
    continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
    payload:{original_work_id:WORK,original_goal_id:GOAL,job_completed:false,
      new_external_action_authorized:false}},
   {entity_type:'personal_original_repair_capability_candidate',
    payload:{original_work_id:WORK,original_goal_id:GOAL,
     candidate_capability_id:'reality.original-repair-execution',
     ephemeral_worldline_id:'worldline:ephemeral:'+'f'.repeat(32),
     experiment_gap_id:'capability_gap:'+'a'.repeat(32),
     frozen_failure_refs:['owner-continuity:existing-failure']}},
  ],
 };
 const proof={work_id:WORK,artifact_immutable_verified:true,
  ci_run_id:40762950798,artifact_id:12849950148,
  executor_sha256:'6'.repeat(64),
  installable_candidate_sha256:fingerprintGovernedUpgradeCandidate(files),
  frozen_tests:{passed:true,case_count:10,result_sha256:'a'.repeat(64)},
  independent_holdout:{passed:true,case_count:4,result_sha256:'b'.repeat(64)},
  signed_warrant_issued:false,installation_authorized:false,original_job_completed:false,
  files};
 return {owner,proof};
}
test('original exact owner + truly independently verified frozen/holdout source yields non-authorizing HMAC evidence warrant',()=>{
 const {owner,proof}=fixture();
 const e=buildExactOriginalExecutorWarrantEvidence({owner,proof,baseSha:BASE});
 assert.equal(e.experiment.state,'SANDBOX_VERIFIED');
 assert.equal(e.experiment.work_item_id,WORK);
 assert.equal(e.experiment.verification_bundle.frozen_regression.passed,true);
 const args={experiment:e.experiment,originalWorkItem:e.originalWorkItem,
  blockedCheckpointId:e.checkpoint.event_id,goalRevision:e.goalRevision,
  ownerId:e.ownerId,conversationId:e.conversationId,baseCommitSha:e.baseSha,
  verifierReceipt:e.verifierReceipt,
  env:{REALITY_CHAT_RECEIPT_HMAC_KEY:'a-private-test-only-secret-with-minimum-32-bytes'},now:1793218000000};
 const warrant=issueUpgradeEvidenceWarrant(args);
 const valid=verifyUpgradeEvidenceWarrant({...args,warrant});
 assert.equal(valid.valid,true);
 assert.equal(valid.execution_authorized,false);
 assert.equal(valid.original_job_completed,false);
 assert.equal(warrant.candidate_sha256,proof.installable_candidate_sha256);
 assert.equal(warrant.github_execution_authorized,false);
 assert.equal(warrant.promotion_authorized,false);
});
test('tampered goal, work, approval or independent holdout never gets warrant inputs',()=>{
 const {owner,proof}=fixture();
 for(const invalid of [
  ()=>{owner.owner_goal_confirmed=false},
  ()=>{owner.owner_evidence_acknowledged=false},
  ()=>{owner.goal.state.active_goal.user_confirmed=false},
  ()=>{owner.relevant[0].payload.new_external_action_authorized=true},
  ()=>{proof.independent_holdout.passed=false},
  ()=>{proof.frozen_tests.case_count=9},
 ]){
  const x=fixture();const o=x.owner,p=x.proof;
  if(invalid.toString().includes('owner.owner_goal_confirmed'))o.owner_goal_confirmed=false;
  else if(invalid.toString().includes('owner.owner_evidence_acknowledged'))o.owner_evidence_acknowledged=false;
  else if(invalid.toString().includes('user_confirmed'))o.goal.state.active_goal.user_confirmed=false;
  else if(invalid.toString().includes('new_external_action'))o.relevant[0].payload.new_external_action_authorized=true;
  else if(invalid.toString().includes('holdout'))p.independent_holdout.passed=false;
  else p.frozen_tests.case_count=9;
  assert.throws(()=>buildExactOriginalExecutorWarrantEvidence({owner:o,proof:p,baseSha:BASE}));
 }
});
