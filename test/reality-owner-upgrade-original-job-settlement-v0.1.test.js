import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {appendVerifiedOwnerUpgradeJobSettlement,readVerifiedOwnerUpgradeJobSettlement}
 from '../src/reality-owner-upgrade-original-job-settlement-v0.1.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-dummy-not-provider',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const user=randomUUID(),conversationId=randomUUID(),workId='work:'+'1'.repeat(32);
const session={user_id:user,config:{url}};
const home=personalGoalScope({userId:user,conversationId});
const spine=createContinuitySpine({continuityRootId:home.root,
 worldlineId:home.worldline,subjectId:user});
const goalId='user-goal:'+'3'.repeat(32),goalRev=randomUUID();
const candidate='4'.repeat(64),head='5'.repeat(40),merged='6'.repeat(40);
const scope={ownerId:user,conversationId,workId,goalRevision:goalRev,
 candidateSha:candidate,headSha:head};
const plan={owner_id:user,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:goalId,goal_revision:goalRev,
 continuity_root_id:spine.continuity_root_id,worldline_id:spine.worldline_id,
 candidate_sha256:candidate,github_head_sha:head,
 capability_id:'extension.workflow-repair',original_job_completed:false};
const installed={original_work_id:workId,candidate_sha256:candidate,
 head_sha:head,independent:true,installed:true,
 merge_commit_sha:merged,production_deployment_performed:false};
const active={original_work_id:workId,candidate_sha256:candidate,
 registered:true,runtime_active:true,independently_reobserved:true,
 capability_id:plan.capability_id,merge_commit_sha:merged};
const outcome={original_work_id:workId,work_id:workId,
 owner_id:user,conversation_id:conversationId,goal_revision:goalRev,
 original_goal_id:goalId,capability_sha256:candidate,head_sha:head,
 independent:true,original_job_completed:true,
 execution_receipt_id:'github:execution:immutable:123',
 evidence_ref:'https://github.com/maloney2323/Reality/issues/143'};
function fixture(){
 const history=[];const at='2026-10-28T11:00:00.000Z';
 function add(stage,entityType,payload){
  const prev=history.at(-1);
  const e=appendContinuityNode({
   spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:prev?.event_id||null,
   priorLineageHash:prev?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,
   epistemicStatus:'VERIFIED',payload,evidenceRefs:[],
  });
  const saved={...e,entity_type:entityType,
   provenance:{...e.provenance,continuity_spine:{
    prior_lineage_hash:e.prior_lineage_hash,
    transformation_receipt_id:e.transformation_receipt_id,
   }}};
  history.push(saved);return saved;
 }
 add('RAW_SIGNAL','user_goal',{goal_id:goalId});
 add('VERIFICATION','personal_upgrade_evidence_warrant',{
  original_work_id:workId});
 add('WORK','personal_upgrade_draft_pr_verified',{
  original_work_id:workId,candidate_sha256:candidate,
  github_commit_sha:head});
 let writes=0;
 const readGoal=async()=>({
  principal_id:user,conversation_id:conversationId,scope:home,
  state:{active_goal_id:goalId,active_goal:{
   goal_id:goalId,status:'ACTIVE',user_confirmed:true,
   last_transition_receipt_id:goalRev}},
 });
 const createPersistence=()=>({
  reconstruct:async()=>[...history],
  appendEvent:async event=>{
   writes++;
   const saved={...event,
    provenance:{...event.provenance,continuity_spine:{
     prior_lineage_hash:event.prior_lineage_hash,
     transformation_receipt_id:event.transformation_receipt_id,
    }}};
   saved.payload=Object.fromEntries(Object.entries(saved.payload).reverse());
   history.push(saved);return {...saved,status:'PERSISTED'};
  },
 });
 return {history,readGoal,createPersistence,get writes(){return writes}};
}
function args(h){return {session,scope,plan,installed,active,outcome,
 env,readGoal:h.readGoal,createPersistence:h.createPersistence};}
test('original job completed ONLY after independent install, active runtime, task verification and original-worldline readback',async()=>{
 const h=fixture();
 const first=await appendVerifiedOwnerUpgradeJobSettlement(args(h));
 assert.equal(first.already_recorded,false);
 assert.equal(h.writes,1);
 assert.equal(h.history.at(-1).parent_event_id,h.history.at(-2).event_id);
 const saved=await readVerifiedOwnerUpgradeJobSettlement(args(h));
 assert.equal(saved.original_job_completed,true);
 assert.equal(saved.original_work_id,workId);
 assert.equal(saved.independently_reobserved,true);
 assert.equal(saved.continuity_root_id,plan.continuity_root_id);
 assert.equal(saved.worldline_id,plan.worldline_id);
 assert.equal(saved.settlement_receipt_id,first.receipt_id);
 const replay=await appendVerifiedOwnerUpgradeJobSettlement(args(h));
 assert.equal(replay.already_recorded,true);
 assert.equal(h.writes,1);
});
test('unverified runtime, alternative work, fabricated outcome or changed goal cannot settle',async()=>{
 const mutants=[
  a=>({...a,installed:{...a.installed,independent:false}}),
  a=>({...a,installed:{...a.installed,installed:false}}),
  a=>({...a,active:{...a.active,runtime_active:false}}),
  a=>({...a,active:{...a.active,merge_commit_sha:'b'.repeat(40)}}),
  a=>({...a,outcome:{...a.outcome,independent:false}}),
  a=>({...a,outcome:{...a.outcome,original_job_completed:false}}),
  a=>({...a,outcome:{...a.outcome,work_id:'work:'+'9'.repeat(32)}}),
  a=>({...a,outcome:{...a.outcome,evidence_ref:null}}),
  a=>({...a,plan:{...a.plan,goal_revision:'stale'}}),
 ];
 for(const mutate of mutants){
  const h=fixture(),m=mutate(args(h));
  await assert.rejects(appendVerifiedOwnerUpgradeJobSettlement(m),
   /UPGRADE_SETTLEMENT_/);
  assert.equal(h.writes,0);
 }
});
test('absent original warrant or saved draft cannot close recovered job',async()=>{
 for(const kind of ['personal_upgrade_evidence_warrant','personal_upgrade_draft_pr_verified']){
  const h=fixture();
  const idx=h.history.findIndex(e=>e.entity_type===kind);
  h.history.splice(idx,1);
  await assert.rejects(appendVerifiedOwnerUpgradeJobSettlement(args(h)),
   /UPGRADE_SETTLEMENT_ORIGINAL_APPROVAL_LINEAGE_MISSING|RELIABILITY_HISTORY_/);
  assert.equal(h.writes,0);
 }
});
test('modified prior settlement can never be re-used for competing result',async()=>{
 const h=fixture();
 await appendVerifiedOwnerUpgradeJobSettlement(args(h));
 await assert.rejects(appendVerifiedOwnerUpgradeJobSettlement({
  ...args(h),outcome:{...outcome,execution_receipt_id:'other'},
 }),/UPGRADE_SETTLEMENT_CONFLICTING_PRIOR_COMPLETION/);
 assert.equal(h.writes,1);
});
