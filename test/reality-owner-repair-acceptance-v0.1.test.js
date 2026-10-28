import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContinuitySpine,appendContinuityNode} from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {recordAuthenticatedOwnerRepairAcceptance,SOURCE_CORRECTION_CONFIRMATION}
 from '../src/reality-owner-repair-acceptance-v0.1.js';

const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-fake-not-provider',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project};
const user=randomUUID(),conversationId=randomUUID(),
 workId='work:24cda9611404e9bcb47909976067605c',goalId='user-goal:source-test',
 goalRevision=randomUUID();
const session={user_id:user,config:{url}};
const original=personalGoalScope({userId:user,conversationId});
const spine=createContinuitySpine({
 continuityRootId:original.root,worldlineId:original.worldline,subjectId:user});
function fixture(){
 const history=[],time='2026-10-28T12:00:00.000Z';
 const add=(stage,type,payload,epistemicStatus='OBSERVED',provenance={})=>{
  const prev=history.at(-1);
  const e=appendContinuityNode({spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:prev?.event_id||null,
   priorLineageHash:prev?.lineage_hash||null,
   assertionTime:time,effectiveTime:time,
   epistemicStatus,payload,evidenceRefs:[],provenance});
  const saved={...e,entity_type:type,
   provenance:{...e.provenance,continuity_spine:{
    prior_lineage_hash:e.prior_lineage_hash,
    transformation_receipt_id:e.transformation_receipt_id}}};
  history.push(saved);return saved;
 };
 add('RAW_SIGNAL','original_goal_signal',{goal_id:goalId});
 const checkpoint=add('WORK','personal_recovery_checkpoint',{
  original_work_id:workId,job_completed:false});
 const evidence=add('WORK','personal_recovery_acceptance_evidence',{
  original_work_id:workId,original_goal_id:goalId,
  recovery_receipt_id:checkpoint.event_id,
  source_correction_verified:true,
  provider_current_success_verified:true,
  owner_accepted:false,original_issue_closed:false,
  full_original_job_completed:false,external_action_performed:false,
  assessment:'EVIDENCE_SUPPORTS_CORRECTION_AWAITING_OWNER_ACCEPTANCE',
  independently_checked_fix_commit:'3448c6d694b440a0e0c4593ff30e2fc326824cd4',
 },'CORROBORATED',{source:'reality-personal-repair-acceptance-v0.1',
  principal_id:user,conversation_id:conversationId});
 const stats={writes:0};
 const readGoal=async()=>({principal_id:user,conversation_id:conversationId,
  scope:original,state:{active_goal_id:goalId,
   continuity_root_id:spine.continuity_root_id,world_id:original.world,
   active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true,
    last_transition_receipt_id:goalRevision}}});
 const createPersistence=()=>({
  reconstruct:async()=>[...history],
  appendEvent:async e=>{
   stats.writes++;
   history.push({...e,entity_type:e.entity_type,
    payload:Object.fromEntries(Object.entries(e.payload).reverse()),
    provenance:{...e.provenance,continuity_spine:{
     prior_lineage_hash:e.prior_lineage_hash,
     transformation_receipt_id:e.transformation_receipt_id}}});
   return {status:'PERSISTED'};
  },
 });
 return {history,checkpoint,evidence,stats,readGoal,createPersistence,add,
  args:{session,conversationId,workId,
   sourceEvidenceReceiptId:evidence.event_id,
   confirmation:SOURCE_CORRECTION_CONFIRMATION,env,readGoal,createPersistence}};
}
test('owner independently confirms exact saved original source correction; receipt survives real Continuity readback',async()=>{
 const f=fixture();
 const result=await recordAuthenticatedOwnerRepairAcceptance(f.args);
 assert.equal(result.status,'SOURCE_CORRECTION_ACCEPTED_JOB_STILL_OPEN');
 assert.equal(result.owner_acceptance_saved,true);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.original_issue_closed,false);
 assert.equal(result.external_action_performed,false);
 assert.equal(f.stats.writes,1);
 const ev=f.history.at(-1);
 assert.equal(result.acceptance_receipt_id,ev.event_id);
 assert.equal(ev.event_kind,'AUTHORITY');
 assert.equal(ev.epistemic_status,'VERIFIED');
 assert.equal(ev.payload.source_evidence_receipt_id,f.evidence.event_id);
 assert.equal(ev.payload.owner_accepted_source_correction,true);
 assert.equal(ev.payload.github_write_authorized,false);
 const again=await recordAuthenticatedOwnerRepairAcceptance(f.args);
 assert.equal(again.already_recorded,true);
 assert.equal(f.stats.writes,1);
});
test('no consent, foreign principal, wrong evidence receipt, or changed current goal blocks all writes',async()=>{
 for(const update of [
  a=>({...a,confirmation:'SAVE'}),
  a=>({...a,session:{...a.session,user_id:randomUUID()}}),
  a=>({...a,sourceEvidenceReceiptId:randomUUID()}),
  a=>({...a,readGoal:async()=>({...await a.readGoal(),
   state:{...(await a.readGoal()).state,active_goal_id:'new goal'}})}),
 ]){
  const f=fixture();
  await assert.rejects(recordAuthenticatedOwnerRepairAcceptance(update(f.args)),
   /OWNER_CORRECTION_/);
  assert.equal(f.stats.writes,0);
 }
});
test('stale or contradictory saved evidence cannot become owner acceptance',async()=>{
 const mutations=[
  p=>({...p,source_correction_verified:false}),
  p=>({...p,original_issue_closed:true}),
  p=>({...p,full_original_job_completed:true}),
  p=>({...p,independently_checked_fix_commit:'0'.repeat(40)}),
 ];
 for(const mutate of mutations){
  const f=fixture(),e=f.evidence;
  f.history[f.history.length-1]={...e,payload:mutate(e.payload)};
  await assert.rejects(recordAuthenticatedOwnerRepairAcceptance(f.args),
   /RELIABILITY_HISTORY_|OWNER_CORRECTION_/);
  assert.equal(f.stats.writes,0);
 }
});
test('already-settled job or missing source checkpoint cannot be accepted',async()=>{
 const x=fixture();
 x.add('OUTCOME','personal_original_job_settlement',{
  original_work_id:workId,original_job_completed:true},'VERIFIED');
 await assert.rejects(recordAuthenticatedOwnerRepairAcceptance(x.args),
  /OWNER_CORRECTION_JOB_ALREADY_SETTLED/);
 assert.equal(x.stats.writes,0);
 const y=fixture();y.history.splice(1,1);
 await assert.rejects(recordAuthenticatedOwnerRepairAcceptance(y.args),
  /OWNER_CORRECTION_ORIGINAL_RECOVERY_CHECKPOINT_REQUIRED|RELIABILITY_HISTORY_/);
 assert.equal(y.stats.writes,0);
});
test('original source correction owner consent endpoint cannot write to GitHub or settle a job',async()=>{
 const {readFileSync}=await import('node:fs');
 const api=readFileSync(new URL('../api/reality/personal-repair-owner-acceptance.js',
  import.meta.url),'utf8');
 assert.match(api,/authenticatedChatSession/);
 assert.match(api,/assertSameOrigin/);
 assert.match(api,/ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY|SOURCE_CORRECTION_CONFIRMATION/);
 assert.match(api,/recordAuthenticatedOwnerRepairAcceptance/);
 assert.doesNotMatch(api,/githubWrite|executeAuthorizedWork|closeIssue|markOriginalJobComplete/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/Accept verified source correction · Keep repair open/);
 assert.match(html,/data-repair-source-accept/);
 assert.match(html,/personal-repair-owner-acceptance/);
 assert.match(html,/await wcLoadUnfinishedWork\(\)/);
});
