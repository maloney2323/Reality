// Exact new follow-on Reality work for the already-settled #188 historical job.
// The signed-in owner creates this new original work ONLY after deliberate POST.
// Never borrows the historical installation authorization, changes production,
// or creates an already-qualified candidate from a model claim.
import {createHash} from 'node:crypto';
import {validUuid,listPrivateConversations} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {verifyRealMissingRepairIssue}
 from './reality-real-repair-opportunity-intake-v1.0.js';

export const FOLLOWON_VERSION='reality-issue188-authenticated-followon-owner-original-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const OWNER_SOURCE='d084f46d840027acd412b67fceb1636fd35a64f2cc08b9ebb6666d470d1af43d';
const PREVIOUS_WORK='work:1eecc0d71b21492e0cfdd527f9c257f3';
const RUN=41547631404;
const REPO='maloney2323/Reality';
const fail=code=>{throw Error('FOLLOWON_188_'+code)};
const digest=x=>createHash('sha256').update(String(x)).digest('hex');
const matching=(p,session,goal,work,source)=>{
 return p?.version==='reality-original-source-backed-repair-v1'&&
 p.followon_version===FOLLOWON_VERSION&&
 p.parent_original_work_id===PREVIOUS_WORK&&
 p.owner_id===session.user_id&&p.original_work_id===work&&
 p.original_goal_id===goal.state.active_goal_id&&
 p.goal_transition_receipt_ref===goal.state.active_goal.last_transition_receipt_id&&
 p.original_model_candidate_sha256===OWNER_SOURCE&&
 p.original_source_sha===source.source_sha&&
 p.issue_number===188&&p.owner_authorized_investigation===true&&
 p.owner_authorized_installation===false&&p.original_job_completed===false&&
 p.production_changed===false;
};
async function checkNewCandidateProvider({
 fetchImpl=fetch,providerToken=null,
}={}){
 const headers={accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-fresh-owner-original-work-188-v1',
   ...(typeof providerToken==='string'&&providerToken.length>20?
    {authorization:'Bearer '+providerToken}:{})};
 const req=async path=>{
  const res=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method:'GET',redirect:'error',cache:'no-store',headers});
  if(!res.ok)fail('PINNED_CANDIDATE_PROVIDER_UNAVAILABLE');
  return res.json();
 };
 const [run,artifacts]=await Promise.all([
  req('/actions/runs/'+RUN),req('/actions/runs/'+RUN+'/artifacts?per_page=40')]);
 if(run?.id!==RUN||run.status!=='completed'||run.conclusion!=='success'||
    run.head_repository?.full_name!==REPO||
    run.head_branch!=='feature/reality-general-capability-engine-20261101'||
    !Array.isArray(artifacts.artifacts)||
    !artifacts.artifacts.some(x=>
      x.name==='reality-customer-issue188-model-research-'+RUN&&
      x.digest==='sha256:a15f718461a9af61663f10797088df28abac312bf338269bb16b16f6cd0122b4'&&
      !x.expired)||
    !artifacts.artifacts.some(x=>
      x.name==='reality-customer-issue188-independent-sandbox-'+RUN&&
      x.digest==='sha256:166309eddaef9878341871551283989b5da0d612ebb799d2647d8163d8250bdd'&&
      !x.expired))
  fail('PINNED_INDEPENDENT_CAPABILITY_PROOF_CHANGED');
 return {run_id:RUN,source_sha256:OWNER_SOURCE,
  source_ref:'https://github.com/'+REPO+'/actions/runs/'+RUN};
}
export async function createIssue188OwnerFollowon({
 session,conversationId,requestedSourceHash,
 env=process.env,fetchImpl=fetch,
 verifyIssue=verifyRealMissingRepairIssue,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 listConversations=listPrivateConversations,
 checkCandidate=checkNewCandidateProvider,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
   !validUuid(session?.user_id)||!validUuid(conversationId)||
   requestedSourceHash!==OWNER_SOURCE)
  fail('EXACT_AUTHENTICATED_SOURCE_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.project!=='hvkfreoagbrphwghjajw'||db.url!==session.config.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ISOLATED_OWNER_STORAGE_REQUIRED');
 const owned=await listConversations(session);
 if(!Array.isArray(owned)||!owned.some(x=>x.conversation_id===conversationId))
  fail('EXISTING_AUTHENTICATED_CONVERSATION_REQUIRED');
 const [goal,evidence,candidate]=await Promise.all([
  readGoal({session,conversationId,env}),
  verifyIssue({issueNumber:188,env,fetchImpl}),
  checkCandidate({fetchImpl,providerToken:env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||null})
 ]);
 if(goal?.principal_id!==session.user_id||
   goal.conversation_id!==conversationId||
   goal.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
   goal.state?.active_goal?.status!=='ACTIVE'||
   goal.state.active_goal.user_confirmed!==true||
   goal.state.active_goal_id!==goal.state.active_goal.goal_id||
   !validUuid(goal.state.active_goal.last_transition_receipt_id))
  fail('ACTIVE_CONFIRMED_OWNER_GOAL_REQUIRED');
 if(evidence?.issue_number!==188||evidence.independently_verified!==true||
   !/^[a-f0-9]{40}$/.test(String(evidence.source_sha||''))||
   !/^[a-f0-9]{64}$/.test(String(evidence.frozen_test_sha256||''))||
   evidence.source_path!=='src/reality-extensions/reality-general-execution-receipt.mjs'||
   evidence.frozen_test_path!=='test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js'||
   evidence.issue_url!=='https://github.com/'+REPO+'/issues/188'||
   !Number.isSafeInteger(evidence.original_provider_failed_run_id)||
   !Number.isSafeInteger(evidence.original_provider_failed_job_id)||
   candidate.source_sha256!==OWNER_SOURCE||candidate.run_id!==RUN)
  fail('ORIGINAL_FAILURE_OR_VERIFIED_REPAIR_SOURCE_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id)
  fail('CANONICAL_OWNER_GOAL_SCOPE_MISMATCH');
 const workId='work:'+digest(JSON.stringify([
  FOLLOWON_VERSION,session.user_id,conversationId,
  goal.state.active_goal.last_transition_receipt_id,PREVIOUS_WORK,OWNER_SOURCE,
  evidence.original_provider_failed_run_id
 ])).slice(0,32);
 if(!WORK.test(workId)||workId===PREVIOUS_WORK)
  fail('FRESH_DIFFERENT_ORIGINAL_WORK_REQUIRED');
 const eventId=continuityUuidFromSource('owner-followon-188:'+session.user_id+':'+workId);
 const goalTransition=goal.state.active_goal.last_transition_receipt_id;
 const payload={
  version:'reality-original-source-backed-repair-v1',
  followon_version:FOLLOWON_VERSION,
  parent_original_work_id:PREVIOUS_WORK,
  original_model_candidate_sha256:OWNER_SOURCE,
  model_verification_run_id:RUN,
  owner_id:session.user_id,original_work_id:workId,
  original_goal_id:goal.state.active_goal_id,goal_id:goal.state.active_goal_id,
  goal_transition_receipt_ref:goalTransition,
  issue_number:188,issue_url:evidence.issue_url,
  original_provider_failed_run_id:evidence.original_provider_failed_run_id,
  original_provider_failed_job_id:evidence.original_provider_failed_job_id,
  original_source_sha:evidence.source_sha,source_path:evidence.source_path,
  frozen_test_path:evidence.frozen_test_path,
  frozen_test_sha256:evidence.frozen_test_sha256,
  provider_failure_evidence_hash:evidence.actual_provider_failure_hash,
  owner_authorized_investigation:true,
  owner_authorized_installation:false,
  original_job_completed:false,production_changed:false
 };
 const storage=createPersistence({...db});
 const history=()=>storage.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id});
 const initial=orderContinuityHistory(await history());
 if(!initial.some(x=>x.event_id===goalTransition))
  fail('VERIFIED_GOAL_TRANSITION_MISSING');
 if(initial.some(x=>(x.payload?.original_work_id===workId)&&
    x.epistemic_status==='VERIFIED'&&
    (x.payload.original_job_completed===true||x.payload.constitutional_phase==='SETTLED')))
  fail('NEW_ORIGINAL_ALREADY_SETTLED');
 let event=initial.find(x=>x.event_id===eventId);
 if(event){
  if(event.entity_type!=='reality_original_source_backed_repair_work'||
    event.epistemic_status!=='VERIFIED'||
    event.provenance?.conversation_id!==conversationId||
    event.provenance?.principal_id!==session.user_id||
    !matching(event.payload,session,goal,workId,evidence))
   fail('FOLLOWON_EVENT_COLLISION');
 }else{
  const tail=initial.at(-1);
  if(!tail?.event_id||!tail?.lineage_hash)
   fail('CONTINUITY_TAIL_NOT_VERIFIED');
  const time=new Date().toISOString();
  const node=appendContinuityNode({
   spine,stage:'OBSERVATION',entityId:workId,eventId,
   parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
   effectiveTime:time,assertionTime:time,epistemicStatus:'VERIFIED',
   payload,
   evidenceRefs:[evidence.issue_url,candidate.source_ref,
      'github:actions:run:'+evidence.original_provider_failed_run_id],
   provenance:{source:FOLLOWON_VERSION,principal_id:session.user_id,
    conversation_id:conversationId},
  });
  await storage.appendEvent({...node,
   entity_type:'reality_original_source_backed_repair_work'});
 }
 const checked=orderContinuityHistory(await history());
 const saved=checked.filter(x=>x.event_id===eventId);
 if(saved.length!==1||saved[0].epistemic_status!=='VERIFIED'||
   saved[0].entity_type!=='reality_original_source_backed_repair_work'||
   !matching(saved[0].payload,session,goal,workId,evidence))
  fail('FRESH_FOLLOWON_POSTWRITE_READBACK_FAILED');
 return Object.freeze({
  status:'FRESH_FOLLOWON_OWNER_INVESTIGATION_BOUND',
  new_original_work_id:workId,
  original_work_event_id:eventId,
  prior_settled_work_id:PREVIOUS_WORK,
  issue_number:188,goal_id:goal.state.active_goal_id,
  model_candidate_sha256:OWNER_SOURCE,
  independent_provider_run_id:RUN,
  investigation_authorized:true,
  installation_authorized:false,
  qualification_status:'NOT_YET_IN_QUALIFIED_CANDIDATE_QUEUE',
  original_job_completed:false,production_changed:false
 });
}
