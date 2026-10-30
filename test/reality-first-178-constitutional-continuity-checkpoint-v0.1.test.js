import test from 'node:test';
import assert from 'node:assert/strict';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {
 createGovernedSelfImprovement,acceptGovernedObservation,proposeGovernedCandidate
} from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {createFirst178ConstitutionalCheckpointService}
 from '../src/reality-first-178-constitutional-continuity-checkpoint-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111',
 conversationId='22222222-2222-4222-8222-222222222222',
 work='work:'+'a'.repeat(32),goalId='user-goal:confirmed',
 goalReceipt='33333333-3333-4333-8333-333333333333',
 originalReceipt='44444444-4444-4444-8444-444444444444';
const originalSource='personal:chat:continuity:verified';
const spine=createContinuitySpine({
 continuityRootId:originalSource,worldlineId:originalSource,subjectId:owner,
});
const scope={
 owner_id:owner,goal_id:goalId,original_work_id:work,
 continuity_root_id:spine.continuity_root_id,
 worldline_id:spine.worldline_id,
 goal_transition_receipt_ref:goalReceipt,
 goal_evidence_ref:'supabase:chat:verified-original-user-command',
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:verified-constitutional-kernel',
};
const goalState={
 principal_id:owner,conversation_id:conversationId,
 persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
 scope:{root:originalSource,worldline:originalSource,world:originalSource},
 state:{active_goal_id:goalId,
  active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true,
   last_transition_receipt_id:goalReceipt,
   source_user_message_ref:scope.goal_evidence_ref},
  continuity_root_id:spine.continuity_root_id,world_id:originalSource},
};
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const db={url:session.config.url,strictSecrets:true,secretKey:'test-isolated-server-secret'};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true'};
const sourcePayload={
 original_work_id:work,original_goal_id:goalId,
 goal_transition_receipt_ref:goalReceipt,issue_number:178,
 pinned_red_run:'https://github.com/maloney2323/Reality/actions/runs/40962921090',
 installation_authorized:false,
};
const at='2026-10-29T20:00:00.000Z';
const seed=appendContinuityNode({
 spine,stage:'RAW_SIGNAL',entityId:'customer:confirmed-goal',
 eventId:goalReceipt,effectiveTime:at,assertionTime:at,
 provenance:{source:'test:verified-owner-goal'},
 payload:{event_type:'AUTHORITATIVE_USER_GOAL_TRANSITION',goal_id:goalId},
});
const sourceEvent={
 ...appendContinuityNode({
  spine,stage:'WORK',entityId:work,eventId:originalReceipt,
  parentEventId:seed.event_id,priorLineageHash:seed.lineage_hash,
  effectiveTime:'2026-10-29T20:00:01.000Z',
  assertionTime:'2026-10-29T20:00:01.000Z',
  provenance:{source:'test:first-178-work'},
  payload:sourcePayload,
 }),
 entity_type:'personal_first_self_upgrade_customer_work',
};
function persisted(node){
 return {...structuredClone(node),provenance:{
  ...node.provenance,continuity_spine:{
   prior_lineage_hash:node.prior_lineage_hash||null,
   transformation_receipt_id:node.transformation_receipt_id||null,
  },
 }};
}
async function gap({evidenceRef='provider:trusted-gap:178',
 evidenceHash='b'.repeat(64)}={}){
 const start=createGovernedSelfImprovement({scope});
 const receipt={kind:'GAP_CONFIRMED',owner_id:owner,
  goal_id:goalId,original_work_id:work,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  capability_id:'reality.ci-failure-evidence-v1',
  failure_refs:[sourceEvent.payload.pinned_red_run],
  verification_suite_ref:'first-ci-evidence-gap-v1',
  evidence_ref:evidenceRef,
  evidence_hash:evidenceHash,
 };
 return acceptGovernedObservation(start,receipt,{verifyProvider:async ctx=>({
  verified:true,independent_provider_readback:true,
  evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
  scope_hash:ctx.scope_hash,original_work_id:work,
  attestation_ref:'provider:attested:178',
 })});
}
function harness({includeOriginal=true,goal=goalState}={}){
 const rows=includeOriginal?[persisted(seed),persisted(sourceEvent)]:[persisted(seed)];
 let writes=0;
 const createPersistence=()=>({
  reconstruct:async()=>rows.map(x=>structuredClone(x)),
  appendEvent:async e=>{writes++;rows.push(persisted(e));return e},
 });
 const adapter=createFirst178ConstitutionalCheckpointService({
  session,conversationId,originalWorkId:work,db,env,
  readGoal:async()=>goal,createPersistence,
 });
 return {adapter,rows,getWrites:()=>writes};
}
test('same constitutional state persists to existing Continuity with independent readback',async()=>{
 const h=harness();
 const g=await gap();
 const result=await h.adapter.persistCheckpoint(g);
 assert.equal(result.persisted,true);
 assert.equal(result.independent_readback_verified,true);
 assert.equal(result.original_work_id,work);
 assert.equal(result.checkpoint_hash,g.head_hash);
 assert.equal(h.getWrites(),1);
 const c=h.rows.at(-1);
 assert.equal(c.parent_event_id,originalReceipt);
 assert.equal(c.payload.driver_state.phase,'GAP_CONFIRMED');
 assert.equal(c.payload.original_source_receipt_ref,originalReceipt);
 assert.equal(c.payload.installation_authorized,false);
 assert.equal(c.payload.original_job_completed,false);
 const repeated=await h.adapter.persistCheckpoint(g);
 assert.equal(repeated.checkpoint_hash,result.checkpoint_hash);
 assert.equal(h.getWrites(),1,'idempotent replay must not duplicate a state');
});
test('persisting a generated proposal extends the exact prior hash journal',async()=>{
 const h=harness();const g=await gap();
 await h.adapter.persistCheckpoint(g);
 const c=proposeGovernedCandidate(g,{
  rationale:'Propose exact frozen fix, never authorize it',
  verification_plan_ref:'first-ci-evidence-gap-v1',
  files:[
   {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
    content:'export const missingCapability=()=>null'},
   {path:'test/reality-extensions/failure-evidence.test.js',
    content:'import test from "node:test";test("proof",()=>{});'},
  ],
 });
 const result=await h.adapter.persistCheckpoint(c);
 assert.equal(result.persisted,true);
 assert.equal(h.getWrites(),2);
 assert.equal(h.rows.at(-1).payload.driver_state.phase,'CANDIDATE_READY');
 assert.equal(h.rows.at(-1).parent_event_id,h.rows[2].event_id);
});
test('no original issue #178 work receipt cannot create a checkpoint',async()=>{
 const h=harness({includeOriginal:false});
 await assert.rejects(h.adapter.persistCheckpoint(await gap()),
  /FIRST_178_CONTINUITY_FIRST_178_SOURCE_WORK_RECEIPT_REQUIRED/);
 assert.equal(h.getWrites(),0);
});
test('changing authoritative goal blocks all checkpoint writes',async()=>{
 const changed=structuredClone(goalState);
 changed.state.active_goal.goal_id='user-goal:other';
 changed.state.active_goal_id='user-goal:other';
 const h=harness({goal:changed});
 await assert.rejects(h.adapter.persistCheckpoint(await gap()),
  /FIRST_178_CONTINUITY_GOAL_CHANGED_DURING_SELF_UPGRADE/);
 assert.equal(h.getWrites(),0);
});
test('wrong owner, previous job #143 and unauthorized terminal stages cannot persist',async()=>{
 const h=harness(),g=await gap();
 const bad=structuredClone(g);
 bad.scope.original_work_id='work:24cda9611404e9bcb47909976067605c';
 await assert.rejects(h.adapter.persistCheckpoint(bad),/SELF_IMPROVEMENT_CHECKPOINT_HASH_MISMATCH|SELF_IMPROVEMENT_CHECKPOINT_INVALID/);
 const other=harness();
 assert.throws(()=>createFirst178ConstitutionalCheckpointService({
  session,conversationId,originalWorkId:work,db,
  env:{...env,VERCEL_ENV:'production'},
 }),/FIRST_178_CONTINUITY_OWNER_DURABLE_PREVIEW_REQUIRED/);
 assert.equal(other.getWrites(),0);
});

test('independently verified #178 gap is admitted in the same source-linked worldline',async()=>{
 const h=harness();
 const source={
  owner_id:owner,goal_id:goalId,original_work_id:work,
  worldline_id:spine.worldline_id,
  provider_receipt_ref:'github:actions:run:40962921090:job:123760052647',
  evidence_hash:'d'.repeat(64),
 };
 const written=await h.adapter.persistGap(source);
 assert.equal(written.committed,true);
 assert.equal(h.getWrites(),1);
 const row=h.rows.at(-1);
 assert.equal(row.entity_type,'personal_first_178_confirmed_gap');
 assert.equal(row.parent_event_id,originalReceipt);
 assert.equal(row.payload.original_work_id,work);
 assert.equal(row.payload.authorization_granted,false);
 const read=await h.adapter.readBackGap({
  owner_id:owner,goal_id:goalId,original_work_id:work,
  receipt_id:written.receipt_id,
 });
 assert.equal(read.verified,true);
 assert.equal(read.evidence_hash,source.evidence_hash);
 assert.equal(read.provider_receipt_ref,source.provider_receipt_ref);
 await h.adapter.persistGap(source);
 assert.equal(h.getWrites(),1,'same signed evidence must not create duplicate gaps');
});
test('model-asserted gap and foreign goal never get a durable source receipt',async()=>{
 const h=harness();
 for(const changes of [
  {provider_receipt_ref:'MODEL_SAYS_GAP_EXISTS'},
  {goal_id:'user-goal:foreign'},
  {original_work_id:'work:'+'e'.repeat(32)},
  {evidence_hash:'not-a-cryptographic-digest'},
 ]){
  await assert.rejects(h.adapter.persistGap({
   owner_id:owner,goal_id:goalId,original_work_id:work,
   worldline_id:spine.worldline_id,
   provider_receipt_ref:'github:actions:run:40962921090:job:123760052647',
   evidence_hash:'d'.repeat(64),...changes,
  }),/FIRST_178_CONTINUITY_PINNED_OWNER_GAP_INVALID/);
 }
 assert.equal(h.getWrites(),0);
});

test('one verified original GAP checkpoint restores with same hash and no new work',async()=>{
 const h=harness();
 const source={
  owner_id:owner,goal_id:goalId,original_work_id:work,
  worldline_id:spine.worldline_id,
  provider_receipt_ref:'github:actions:run:40962921090:job:123760052647',
  evidence_hash:'d'.repeat(64),
 };
 const gapReceipt=await h.adapter.persistGap(source);
 const checkpoint=await gap({evidenceRef:gapReceipt.receipt_id,
  evidenceHash:source.evidence_hash});
 const recorded=await h.adapter.persistCheckpoint(checkpoint);
 const writes=h.getWrites();
 const restored=await h.adapter.readLatestCheckpoint();
 assert.equal(restored.verified,true);
 assert.equal(restored.original_work_id,work);
 assert.equal(restored.checkpoint_hash,checkpoint.head_hash);
 assert.equal(restored.continuity_receipt_id,recorded.continuity_receipt_id);
 assert.equal(restored.state.phase,'GAP_CONFIRMED');
 assert.equal(restored.state.attempt_count,0);
 assert.equal(h.getWrites(),writes,'readback cannot write or claim');
});
test('candidate source checkpoint restores only as unverified sandbox work',async()=>{
 const h=harness();
 const src={
  owner_id:owner,goal_id:goalId,original_work_id:work,
  worldline_id:spine.worldline_id,
  provider_receipt_ref:'github:actions:run:40962921090:job:123760052647',
  evidence_hash:'d'.repeat(64),
 };
 const gapReceipt=await h.adapter.persistGap(src);
 const checkpoint=await gap({evidenceRef:gapReceipt.receipt_id,
  evidenceHash:src.evidence_hash});
 await h.adapter.persistCheckpoint(checkpoint);
 const candidate=proposeGovernedCandidate(checkpoint,{
  rationale:'Generate model-authored candidate',
  verification_plan_ref:'first-ci-evidence-gap-v1',
  files:[
   {path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
    content:'export const valid=()=>true'},
   {path:'test/reality-extensions/valid.test.js',
    content:'import test from "node:test";test("original",()=>{});'},
  ],
 });
 await h.adapter.persistCheckpoint(candidate);
 const restored=await h.adapter.readLatestCheckpoint();
 assert.equal(restored.verified,true);
 assert.equal(restored.state.phase,'CANDIDATE_READY');
 assert.equal(restored.state.attempt_count,1);
 assert.equal(restored.state.sandbox_receipt,null);
 assert.equal(restored.state.candidate.artifact_hash,candidate.candidate.artifact_hash);
 assert.equal(restored.state.candidate.installed,false);
 assert.equal(restored.state.candidate.authorized,false);
});
