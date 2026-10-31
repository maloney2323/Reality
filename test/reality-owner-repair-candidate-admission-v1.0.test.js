import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {prepareVerifiedOwnerRepairCandidate}
 from '../src/reality-owner-repair-candidate-admission-v1.0.js';
import {createContinuitySpine} from '../src/reality-continuity-spine-v2.0.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const canonical=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const stableHash=x=>hash(JSON.stringify(canonical(x)));
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-local-key',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_fake',
 VERCEL_GIT_COMMIT_SHA:'b'.repeat(40)};
const owner=randomUUID(),conversation=randomUUID(),goalReceipt=randomUUID();
const session={user_id:owner,config:{url}},work='work:'+'a'.repeat(32),
 goal='user-goal:owner-source-verified',sourceReceipt=randomUUID();
const root='personal:chat:verified-owner',spine=createContinuitySpine({
 continuityRootId:root,worldlineId:root,subjectId:owner});
const files=[
 {path:'src/reality-extensions/verified.mjs',content:'export function verify(){return true}'},
 {path:'test/reality-extensions/verified.test.mjs',content:'import test from "node:test";test("check",()=>{});'},
];
const artifact=stableHash(files.map(f=>({path:f.path,content:f.content})));
const proof={independently_verified:true,original_failed_run_id:111,
 original_source_sha:'c'.repeat(40),issue_number:188,
 candidate_artifact_sha256:artifact,review_commit_sha:'d'.repeat(40),
 verified_sandbox_run_id:222,model_source_run_id:333,
 frozen_test_sha256:'e'.repeat(64),
 model_response_id:'resp_original_generated',
 files,issue_url:'https://github.com/maloney2323/Reality/issues/188',
 independent_sandbox:{log_sha256:'f'.repeat(64)}};
function fixture(){
 let latest=null,writes=0,reads=0;
 const job={state:'REAL_SOURCE_BACKED_REPAIR_PENDING',goal_still_current:true,
  original_work_id:work,issue_url:proof.issue_url,
  action_completed:true,job_completed:false,
  original_provider_failed_run_id:proof.original_failed_run_id,
  original_source_sha:proof.original_source_sha,conversation_id:conversation,
  source_receipt_id:sourceReceipt};
 const readGoal=async()=>({principal_id:owner,conversation_id:conversation,
  scope:{root,worldline:root},
  state:{continuity_root_id:spine.continuity_root_id,
   active_goal_id:goal,active_goal:{goal_id:goal,
    user_confirmed:true,status:'ACTIVE',
    source_user_message_ref:'supabase:owner:msg',
    last_transition_receipt_id:goalReceipt}}});
 const checkpointFactory=()=>({
  async readLatestCheckpoint(){
   if(!latest)throw Error('GENERAL_CHECKPOINT_NO_PERSISTED_GENERAL_CHECKPOINT');
   return {persisted:true,independent_readback_verified:true,checkpoint_hash:latest.head_hash,state:latest};
  },
  async persistCheckpoint(state){latest=state;writes++;return {
   persisted:true,independent_readback_verified:true,
   checkpoint_hash:state.head_hash,original_work_id:work,
   checkpoint_receipt_id:sourceReceipt,
  }},
  async readCheckpoint(state){reads++;return {persisted:true,
   independent_readback_verified:true,checkpoint_hash:state.head_hash,
   checkpoint_receipt_id:sourceReceipt,original_work_id:work}},
 });
 return {job,checkpointFactory,readGoal,
  listWork:async()=>({jobs:[job]}),
  providerRead:async()=>proof,writes:()=>writes,reads:()=>reads};
}
function args(f){
 return {session,expectedOriginalWorkId:work,issueNumber:188,env,
  listWork:f.listWork,readGoal:f.readGoal,providerRead:f.providerRead,
  checkpointFactory:f.checkpointFactory};
}
test('real previously generated code enters original governed Continuity and stops before owner approval',async()=>{
 const f=fixture();
 const got=await prepareVerifiedOwnerRepairCandidate(args(f));
 assert.equal(got.status,'EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL');
 assert.equal(got.candidate_artifact_hash,artifact);
 assert.equal(got.owner_installation_approved,false);
 assert.equal(got.installed,false);assert.equal(got.original_job_completed,false);
 assert.equal(f.writes(),3);
 assert.equal(f.reads(),1);
 await prepareVerifiedOwnerRepairCandidate(args(f));
 assert.equal(f.writes(),3,'no duplicate state transitions on repeat');
});
test('foreign job, changed provider candidate and unverified goal fail before a checkpoint write',async()=>{
 const f=fixture();
 await assert.rejects(prepareVerifiedOwnerRepairCandidate({...args(f),
  expectedOriginalWorkId:'work:'+'f'.repeat(32)}),
  /REAL_OWNER_CANDIDATE_ONE_SIGNED_OWNER_ORIGINAL_WORK_REQUIRED/);
 await assert.rejects(prepareVerifiedOwnerRepairCandidate({...args(f),
  providerRead:async()=>({...proof,candidate_artifact_sha256:'0'.repeat(64)})}),
  /REAL_OWNER_CANDIDATE_MODEL_GENERATED_BYTES_CHANGED_AFTER_GITHUB_TEST/);
 assert.equal(f.writes(),1,'gap checkpoint is persisted, candidate mismatch cannot advance');
});
