import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope}
 from '../src/reality-personal-goal-readback-v0.1.js';
import {saveOwnerUpgradeDraftReceipt,loadAuthenticatedVerifiedUpgradeDraftReceipt}
 from '../src/reality-owner-upgrade-draft-continuity-v0.1.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={
 VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-dummy-secret-not-provider',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
};
const user=randomUUID(),conversationId=randomUUID(),workId='work:'+'2'.repeat(32);
const session={user_id:user,config:{url}};
const s=personalGoalScope({userId:user,conversationId});
const spine=createContinuitySpine({continuityRootId:s.root,
 worldlineId:s.worldline,subjectId:user});
const goalId='user-goal:'+'f'.repeat(32),goalRevision=randomUUID();
const candidate='a'.repeat(64),verification='b'.repeat(64);
const warrantId='warrant:'+'c'.repeat(64);
const base='d'.repeat(40),head='e'.repeat(40);
const branch='reality/build/build-'+'1'.repeat(32);
function source(warrantReceiptId){return {
 owner_id:user,conversation_id:conversationId,
 original_work_id:workId,original_goal_id:goalId,goal_revision:goalRevision,
 evidence_warrant_id:warrantId,warrant_receipt_id:warrantReceiptId,
 evidence_warrant:{candidate_sha256:candidate,pinned_base_commit_sha:base},
 originalWorkItem:{id:workId,continuity_root_id:spine.continuity_root_id,
  worldline_id:spine.worldline_id},
 verifiedExperiment:{verification_hash:verification},
 persisted_and_reobserved:true,
};}
const dispatch={
 status:'DRAFT_PR_VERIFIED_AND_RESERVATION_SETTLED',
 draft_pr_verified:true,reservation_status:'VERIFIED',
 provider_action_performed:true,independent_post_pr_ci_verified:false,
 capability_promoted:false,original_job_resumed:false,original_job_completed:false,
 original_work_id:workId,
 original_continuity_root_id:spine.continuity_root_id,
 original_worldline_id:spine.worldline_id,
 verification_hash:verification,candidate_hash:candidate,
 warrant_id:warrantId,goal_revision:goalRevision,pinned_base_sha:base,
 github_commit_sha:head,github_branch:branch,github_pr_number:1550,
 github_pr_url:'https://github.com/maloney2323/Reality/pull/1550',
};
const at='2026-10-27T22:00:00.000Z';
function fixture(){
 const history=[];
 const add=(stage,entityType,payload)=>{
  const prev=history.at(-1);
  const event=appendContinuityNode({
   spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:prev?.event_id||null,
   priorLineageHash:prev?.lineage_hash||null,
   effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
   payload,evidenceRefs:[],
  });
  const saved={...event,entity_type:entityType,
   provenance:{...event.provenance,continuity_spine:{
    prior_lineage_hash:event.prior_lineage_hash,
    transformation_receipt_id:event.transformation_receipt_id,
   }}};
  history.push(saved);return saved;
 };
 add('RAW_SIGNAL','initial_user_goal',{goal_id:goalId});
 const warrant=add('VERIFICATION','personal_upgrade_evidence_warrant',{
  original_work_id:workId,warrant:{warrant_id:warrantId},
 });
 let writes=0;
 const createPersistence=()=>({
  reconstruct:async()=>[...history],
  appendEvent:async event=>{
   writes++;
   const saved={...event,provenance:{...event.provenance,
    continuity_spine:{prior_lineage_hash:event.prior_lineage_hash,
     transformation_receipt_id:event.transformation_receipt_id}}};
   // Simulate PostgreSQL jsonb key reordering on the next read.
   saved.payload=Object.fromEntries(Object.entries(saved.payload).reverse());
   history.push(saved);return {...saved,status:'PERSISTED'};
  },
 });
 const readGoal=async()=>({
  principal_id:user,conversation_id:conversationId,scope:s,
  state:{continuity_root_id:spine.continuity_root_id,world_id:s.world,
   active_goal_id:goalId,active_goal:{
    goal_id:goalId,status:'ACTIVE',user_confirmed:true,
    last_transition_receipt_id:goalRevision,
   }},
 });
 return {history,warrantReceiptId:warrant.event_id,createPersistence,
  readGoal,get writes(){return writes}};
}
function params(h){
 return {session,conversationId,originalWorkId:workId,env,
  loadTrusted:async()=>source(h.warrantReceiptId),
  readGoal:h.readGoal,createPersistence:h.createPersistence};
}
test('authorized draft PR is durably appended and independently reconstructed in original owner worldline',async()=>{
 const h=fixture();
 const saved=await saveOwnerUpgradeDraftReceipt({...params(h),dispatch});
 assert.equal(saved.durably_recorded,true);
 assert.equal(saved.independently_reobserved,true);
 assert.equal(saved.already_recorded,false);
 assert.equal(h.writes,1);
 const stored=h.history.at(-1);
 assert.equal(stored.parent_event_id,h.history.at(-2).event_id);
 assert.equal(stored.entity_type,'personal_upgrade_draft_pr_verified');
 assert.equal(stored.continuity_root_id,spine.continuity_root_id);
 assert.equal(stored.worldline_id,spine.worldline_id);
 assert.equal(stored.payload.production_merge_authorized,false);
 assert.equal(stored.payload.original_job_completed,false);
 const loaded=await loadAuthenticatedVerifiedUpgradeDraftReceipt({
  session,conversationId,originalWorkId:workId,env,
  readGoal:h.readGoal,createPersistence:h.createPersistence,
 });
 assert.equal(loaded.receipt_id,saved.receipt_id);
 assert.equal(loaded.independently_reobserved,true);
 assert.equal(loaded.candidate_sha256,candidate);
 assert.equal(loaded.github_commit_sha,head);
 assert.equal(loaded.original_work_id,workId);
 const second=await saveOwnerUpgradeDraftReceipt({...params(h),dispatch});
 assert.equal(second.already_recorded,true);
 assert.equal(h.writes,1);
});
test('unverified GitHub PR / forged candidate is rejected before any DB append',async()=>{
 for(const mutation of [
  x=>({...x,status:'UNRESOLVED_NO_RETRY'}),
  x=>({...x,original_work_id:'work:'+'a'.repeat(32)}),
  x=>({...x,candidate_hash:'0'.repeat(64)}),
  x=>({...x,goal_revision:'unrelated'}),
  x=>({...x,reservation_status:'UNCERTAIN'}),
  x=>({...x,capability_promoted:true}),
  x=>({...x,original_job_completed:true}),
  x=>({...x,github_pr_url:'https://attacker.example/pr/1550'}),
 ]){
  const h=fixture();
  await assert.rejects(saveOwnerUpgradeDraftReceipt({
   ...params(h),dispatch:mutation(dispatch),
  }),/UPGRADE_DRAFT_RECEIPT_EXACT_VERIFIED_DISPATCH_REQUIRED/);
  assert.equal(h.writes,0);
 }
});
test('no genuine original warrant event means no durable claim',async()=>{
 const h=fixture();h.history.splice(1,1);
 await assert.rejects(saveOwnerUpgradeDraftReceipt({...params(h),dispatch}),
  /UPGRADE_DRAFT_RECEIPT_ORIGINAL_WARRANT_CHAIN_REQUIRED/);
 assert.equal(h.writes,0);
});
test('changed owner goal stops saving and reading prior signed draft',async()=>{
 const h=fixture();
 await saveOwnerUpgradeDraftReceipt({...params(h),dispatch});
 const fresh=async()=>({...await h.readGoal(),state:{
  ...(await h.readGoal()).state,active_goal_id:'user-goal:other',
 }});
 await assert.rejects(loadAuthenticatedVerifiedUpgradeDraftReceipt({
  session,conversationId,originalWorkId:workId,env,
  readGoal:fresh,createPersistence:h.createPersistence,
 }),/UPGRADE_DRAFT_RECEIPT_SCOPE_OR_EVIDENCE_CHANGED|UPGRADE_DRAFT_RECEIPT_ORIGINAL_GOAL_CHANGED/);
});
test('any cross-owner draft event or source-lineage tampering is rejected',async()=>{
 const h=fixture();await saveOwnerUpgradeDraftReceipt({...params(h),dispatch});
 const ev=h.history.at(-1);
 ev.provenance.principal_id=randomUUID();
 await assert.rejects(loadAuthenticatedVerifiedUpgradeDraftReceipt({
  session,conversationId,originalWorkId:workId,env,
  readGoal:h.readGoal,createPersistence:h.createPersistence,
 }),/UPGRADE_DRAFT_RECEIPT_OWNER_DURABLE_SOURCE_MISSING|UPGRADE_DRAFT_RECEIPT_CONTINUITY_CHAIN_INVALID|RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
