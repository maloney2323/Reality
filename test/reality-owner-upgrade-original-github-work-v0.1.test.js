import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fingerprintApprovedWorkItem} from '../src/reality-authority-v1.0.js';
import {appendContinuityNode,createContinuitySpine}
 from '../src/reality-continuity-spine-v2.0.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {loadAuthenticatedOriginalUpgradeWork,
 resumeOriginalOwnerGithubWork,observeOriginalOwnerGithubWork}
 from '../src/reality-owner-upgrade-original-github-work-v0.1.js';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'7'.repeat(32),
 goalId='user-goal:original',revision=randomUUID(),candidate='8'.repeat(64),
 head='9'.repeat(40),warrant='warrant:'+'a'.repeat(64);
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const home=personalGoalScope({userId:owner,conversationId});
const spine=createContinuitySpine({continuityRootId:home.root,worldlineId:home.worldline,subjectId:owner});
const plan={owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:goalId,goal_revision:revision,candidate_sha256:candidate,
 github_head_sha:head,capability_id:'extension:github-issue-parser',
 warrant_id:warrant,continuity_root_id:spine.continuity_root_id,
 worldline_id:spine.worldline_id};
const scope={ownerId:owner,conversationId,workId,goalRevision:revision,
 candidateSha:candidate,headSha:head};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:session.config.url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'unit-test-token-only',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const original={
 work_item_id:workId,workflow_id:'workflow:'+workId,
 connector:'github',operation:'create_issue',consequential:true,
 status:'AWAITING_AUTHORIZATION',action:'Track recurring maintenance failure',
 resource:REPO,inputs:{repository:REPO,
 title:'Reality recurring work: repair repeated Original Sandbox Retry',
 body:'<!-- Reality recurring work -->\n### Evidence\n- Source: original\n### Required work\n- Independently fix recurring cause'},
};
const goal={principal_id:owner,conversation_id:conversationId,scope:home,
 state:{active_goal_id:goalId,continuity_root_id:spine.continuity_root_id,
  world_id:home.world,active_goal:{goal_id:goalId,
   last_transition_receipt_id:revision,status:'ACTIVE',user_confirmed:true}}};
function sourceHarness(){
 const history=[],at='2026-10-28T13:00:00Z';
 function add(type,payload,stage='WORK',epistemic='VERIFIED',provenance={}){
  const last=history.at(-1);
  const e=appendContinuityNode({spine,stage,entityId:workId,eventId:randomUUID(),
   parentEventId:last?.event_id||null,
   priorLineageHash:last?.lineage_hash||null,
   assertionTime:at,effectiveTime:at,epistemicStatus:epistemic,
   payload,evidenceRefs:[],provenance});
  history.push({...e,entity_type:type,
   provenance:{...e.provenance,continuity_spine:{
    prior_lineage_hash:e.prior_lineage_hash,
    transformation_receipt_id:e.transformation_receipt_id}}});
  return history.at(-1);
 }
 add('original_goal',{goal_id:goalId},'RAW_SIGNAL','OBSERVED');
 add('personal_discovered_work_handoff',{
  work_id:workId,goal_id:goalId,goal_transition_receipt_id:revision,
  authority:'NOT_GRANTED',external_action_performed:false,
  work_fingerprint:fingerprintApprovedWorkItem(original),work_item:original,
 },'OBSERVATION','OBSERVED');
 const gap=add('personal_capability_gap_checkpoint',{
  original_work_id:workId,blocker_classification:'MISSING_CAPABILITY_INDEPENDENTLY_VERIFIED',
 },'WORK','VERIFIED',{source:'reality-capability-gap-detector-v1.0',principal_id:owner});
 const loadTrusted=async()=>({
  persisted_and_reobserved:true,owner_id:owner,conversation_id:conversationId,
  original_work_id:workId,original_goal_id:goalId,goal_revision:revision,
  candidate_hash:candidate,evidence_warrant_id:warrant,
  blocked_checkpoint_receipt_id:gap.event_id,original_job_completed:false,
 });
 const readGoal=async()=>goal;
 const createPersistence=()=>({reconstruct:async()=>[...history]});
 const args={session,scope,plan,env,loadTrusted,readGoal,createPersistence};
 return {args,history,add};
}
const installed={registered:true,runtime_active:true,independently_reobserved:true,
 original_work_id:workId,candidate_sha256:candidate,capability_id:plan.capability_id,
 customer_application_runtime_active:false};
const currentGoal={principal_id:owner,active_goal_id:goalId,goal_revision:revision,
 active:true,user_confirmed:true};
const resumeGrant={status:'CONSUMED_ONCE',operation:'resume_original_work',
 original_work_id:workId,owner_id:owner,conversation_id:conversationId,
 candidate_sha256:candidate,head_sha:head,goal_revision:revision,
 separate_from_install_authorization:true,grant_id:randomUUID()};
const issue={number:333,id:48123,title:original.inputs.title,
 body:original.inputs.body,state:'open',
 html_url:'https://github.com/'+REPO+'/issues/333'};
function providerHarness(){
 const src=sourceHarness(),calls=[],effects=[];
 const loadWork=async()=>({
  original_work_item:original,no_previous_provider_effect_verified:true,
 });
 const get=async path=>{
  calls.push(path);
  if(path===ROOT+'/issues?state=open&per_page=100')return [];
  if(path===ROOT+'/issues/333')return issue;
  throw Error('UNEXPECTED_GITHUB_READ_'+path);
 };
 const write=async(path,method,body)=>{
  effects.push({path,method,body});
  assert.equal(path,ROOT+'/issues');
  assert.equal(method,'POST');
  assert.deepEqual(body,{title:original.inputs.title,body:original.inputs.body});
  return issue;
 };
 return {src,args:{session,scope,plan,active:installed,goal:currentGoal,
  resumeGrant,env,loadWork,get,write},calls,effects};
}
test('original exact signed-in work action is reconstructed from owner Continuity and independent missing-capability gap',async()=>{
 const h=sourceHarness();
 const r=await loadAuthenticatedOriginalUpgradeWork(h.args);
 assert.equal(r.no_previous_provider_effect_verified,true);
 assert.equal(r.original_work_item.work_item_id,workId);
 assert.equal(r.original_work_item.operation,'create_issue');
 assert.equal(r.blocked_gap_receipt_id,h.history.at(-1).event_id);
});
test('real original action uses existing GitHub connector and separate independent provider readback',async()=>{
 const h=providerHarness();
 const issued=await resumeOriginalOwnerGithubWork(h.args);
 assert.equal(issued.provider_claim_not_independent,true);
 assert.equal(issued.original_job_completed,false);
 assert.equal(h.effects.length,1);
 assert.equal(h.effects[0].path,ROOT+'/issues');
 const r=await observeOriginalOwnerGithubWork({...h.args,resumed:issued});
 assert.equal(r.independent,true);
 assert.equal(r.original_job_completed,true);
 assert.equal(r.original_work_id,workId);
 assert.equal(r.evidence_ref,issue.html_url);
 assert.equal(r.original_action_operation,'github:create_issue');
 assert.equal(h.calls.at(-1),ROOT+'/issues/333');
});
test('missing consumed original authorization or inactive exact capability causes ZERO provider calls',async()=>{
 const variants=[
  x=>({...x,resumeGrant:{...resumeGrant,grant_id:'wrong'}}),
  x=>({...x,resumeGrant:{...resumeGrant,operation:'github:create_issue'}}),
  x=>({...x,active:{...installed,runtime_active:false}}),
  x=>({...x,scope:{...scope,candidateSha:'b'.repeat(64)}}),
  x=>({...x,session:{user_id:randomUUID()}}),
 ];
 for(const variant of variants){
  const h=providerHarness();
  await assert.rejects(resumeOriginalOwnerGithubWork(variant(h.args)),
   /ORIGINAL_RESUME_/);
  assert.equal(h.effects.length,0);
  assert.equal(h.calls.length,0);
 }
});
test('already completed, uncertain, different goal and unverified missing capability never execute original work again',async()=>{
 const scenarios=[
  h=>h.add('personal_issue_execution_outcome',{work_id:workId,outcome_state:'UNRESOLVED'}),
  h=>h.add('personal_original_job_settlement',{original_work_id:workId,original_job_completed:true}),
  h=>{h.history.splice(2,1)},
  h=>{const e=h.history[2];h.history[2]={...e,
   payload:{...e.payload,blocker_classification:'GITHUB_HTTP_403'}}},
 ];
 for(const change of scenarios){
  const h=sourceHarness();change(h);
  await assert.rejects(loadAuthenticatedOriginalUpgradeWork(h.args),
   /ORIGINAL_RESUME_|RELIABILITY_HISTORY_/);
 }
});
test('provider duplicate or different issue prevents effect, no blind retry',async()=>{
 const h=providerHarness();
 h.args.get=async path=>{
  h.calls.push(path);
  if(path===ROOT+'/issues?state=open&per_page=100')return [issue];
  throw Error('READ_NOT_EXPECTED');
 };
 await assert.rejects(resumeOriginalOwnerGithubWork(h.args),
  /PERSONAL_GITHUB_TRACKING_ISSUE_ALREADY_EXISTS_REVIEW_FIRST/);
 assert.equal(h.effects.length,0);
});
test('a provider POST claim with wrong content cannot be marked complete',async()=>{
 const h=providerHarness();const issued=await resumeOriginalOwnerGithubWork(h.args);
 h.args.get=async path=>path===ROOT+'/issues/333'?
  {...issue,body:'changed content'}:[];
 await assert.rejects(observeOriginalOwnerGithubWork({...h.args,resumed:issued}),
  /ORIGINAL_RESUME_PROVIDER_READBACK_NOT_VERIFIED/);
});
test('the underlying repair described IN the issue is not claimed complete by issue creation',async()=>{
 const h=providerHarness();const issued=await resumeOriginalOwnerGithubWork(h.args);
 const r=await observeOriginalOwnerGithubWork({...h.args,resumed:issued});
 assert.equal(r.original_action_operation,'github:create_issue');
 assert.equal(r.original_action_verified,true);
 assert.equal(r.evidence_ref,'https://github.com/'+REPO+'/issues/333');
 assert.equal(r.maintenance_repair_completed,undefined);
});
