import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {
 classifyOriginalExecutorWarrantEligibility,
 ORIGINAL_OWNER_VERIFIER_VERSION,
} from '../src/reality-original-owner-verifier-v0.1.js';

const id='work:24cda9611404e9bcb47909976067605c';
const sourceSha='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
function fixture(){
 return {
  ownerContext:{original_work_id:id,owner_goal_confirmed:true},
  github:{exact_llm_source_verified:true,sandbox_success:true,
   historical_fixed_source_verified:true,original_fix_preexisted_model_installation:true,
   review_pr_merged:false,original_candidate_sha256:sourceSha,
   independent_review_run_url:'https://github.com/maloney2323/Reality/actions/runs/40726401585'},
  runtime:{original_work_id:id,independently_reobserved:true,
   executor_status:'MISSING',missing_scope:'EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH',
   bridge_admission_failure:'PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE',
   current_registered_capabilities:0,original_job_completed:false,external_action_performed:false},
 };
}
test('real patch-proposal verification does not issue execution capability warrant',()=>{
 const p=classifyOriginalExecutorWarrantEligibility(fixture());
 assert.equal(p.status,'PROPOSAL_VERIFIED_EXECUTOR_CAPABILITY_NOT_VERIFIED');
 assert.equal(p.original_work_id,id);
 assert.equal(p.runtime_gap_verified,true);
 assert.equal(p.proposal_source_verified,true);
 assert.equal(p.original_repair_execution_capability_verified,false);
 assert.equal(p.sandbox_execution_contract_verified,false);
 assert.equal(p.eligible_for_signed_execution_warrant,false);
 assert.equal(p.execution_warrant_issued,false);
 assert.equal(p.install_approval_available,false);
 assert.equal(p.original_job_completed,false);
});
for(const [label,mutate] of [
 ['wrong job',p=>{p.runtime.original_work_id='work:8f71513a2c1955569e84c0e9af0962ec'}],
 ['unconfirmed owner goal',p=>{p.ownerContext.owner_goal_confirmed=false}],
 ['changed source hash',p=>{p.github.original_candidate_sha256='0'.repeat(64)}],
 ['forged model test success',p=>{p.github.sandbox_success=false}],
 ['historical source fix unverified',p=>{p.github.historical_fixed_source_verified=false}],
 ['already merged without owner warrant',p=>{p.github.review_pr_merged=true}],
 ['different execution adapter failure',p=>{p.runtime.bridge_admission_failure='SOME_OTHER_FAILURE'}],
 ['claim that gap is installed already',p=>{p.runtime.executor_status='INSTALLED'}],
 ['runtime registry unexpectedly populated',p=>{p.runtime.current_registered_capabilities=1}],
 ['external side effect already occurred',p=>{p.runtime.external_action_performed=true}],
]){
 test('fail closed: '+label,()=>{
  const p=fixture();mutate(p);
  assert.throws(()=>classifyOriginalExecutorWarrantEligibility(p),
   /OWNER_VERIFIER_EXACT_ORIGINAL_RUNTIME_AND_MODEL_PROOF_REQUIRED/);
 });
}
test('warrant verifier route requires signed-in owner and refuses caller-supplied proof',()=>{
 const source=readFileSync('api/reality/personal-original-repair-verifier.js','utf8');
 assert.match(source,/authenticatedChatSession/);
 assert.match(source,/assertSameOrigin/);
 assert.match(source,/Object\.keys\(b\)\.sort\(\)\.join/);
 assert.match(source,/VERIFY_ORIGINAL_EXECUTOR_ELIGIBILITY_AND_RECORD_GAP/);
 assert.doesNotMatch(source,/issueUpgradeEvidenceWarrant/);
 assert.doesNotMatch(source,/createPullRequest|githubWrite|merge_pull/);
});
test('UI displays exact verifier finding and never calls a warrant issuer',()=>{
 const s=readFileSync('owner-repair.html','utf8');
 assert.match(s,/id="verifyExecutor"/);
 assert.match(s,/personal-original-repair-verifier/);
 assert.match(s,/PROPOSAL_VERIFIED_EXECUTOR_CAPABILITY_NOT_VERIFIED/);
 assert.match(s,/d\.execution_warrant_issued!==false/);
 assert.match(s,/DO NOT RETRY/);
 assert.doesNotMatch(s,/\/api\/reality\/issue-warrant/);
 const js=s.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(js);
 assert.doesNotThrow(()=>new Script(js[1]));
});
test('verifier version and operation are specific to ORIGINAL Reality maintenance',()=>{
 assert.equal(ORIGINAL_OWNER_VERIFIER_VERSION,'reality-original-owner-verifier-v0.1');
 assert.match(readFileSync('src/reality-original-owner-verifier-v0.1.js','utf8'),
  /personal_original_warrant_eligibility/);
 assert.doesNotMatch(readFileSync('src/reality-original-owner-verifier-v0.1.js','utf8'),
  /entity_type:'personal_upgrade_evidence_warrant'/);
});
