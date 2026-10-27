// Owner-scoped read-only Unfinished Work overview across saved conversations.
// No new work authority, execution adapter, automation, model, or provider
// write. A completed tracking action is not a completed original repair job.
import {listPrivateConversations,validUuid}
 from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {projectPersonalCompletionReports}
 from './reality-completion-report-v0.1.js';

export const PERSONAL_UNFINISHED_WORK_VERSION='reality-personal-unfinished-work-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/;

export function projectUnfinishedFromConversation({
 conversationId,events=[],goal=null,
}={}){
 if(!validUuid(conversationId))throw Error('UNFINISHED_CONVERSATION_SCOPE_INVALID');
 const history=orderContinuityHistory(events);
 const reports=projectPersonalCompletionReports({events:history,limit:30});
 const out=[];
 for(const report of reports){
  if(!WORK.test(String(report.work_id||''))||
      report.full_job_completed!==false||report.type!=='ACTION')continue;
  const related=history.filter(e=>e.entity_type==='personal_discovered_work_handoff'&&
   e.payload?.work_id===report.work_id);
  if(related.length!==1)continue;
  const handoff=related[0];
  const relevant=history.filter(e=>e.entity_type==='personal_recovery_checkpoint'&&
   e.payload?.original_work_id===report.work_id);
  if(relevant.length>1)throw Error('UNFINISHED_CHECKPOINT_DUPLICATE_REVIEW');
  const checkpoint=relevant[0]||null;
  if(checkpoint&&(checkpoint.event_kind!=='WORK'||
    checkpoint.payload?.verified_tracking_outcome_receipt_id!==report.receipt_id||
    checkpoint.payload?.source_receipt_id!==handoff.event_id||
    checkpoint.payload?.new_external_action_authorized!==false||
    checkpoint.payload?.job_completed!==false||
    checkpoint.payload?.retry_original_issue_creation!==false))
   throw Error('UNFINISHED_CHECKPOINT_CONFLICT');
  const goalCurrent=Boolean(
   goal?.active_goal_id&&
   goal.active_goal_id===handoff.payload?.goal_id&&
   goal.active_goal?.goal_id===goal.active_goal_id&&
   goal.active_goal?.status==='ACTIVE'&&
   goal.active_goal?.user_confirmed===true
  );
  const actionVerified=report.action_completed===true&&
   report.status==='ACTION_VERIFIED_JOB_OPEN'&&
   ISSUE.test(String(report.issue_url||''));
  const checkpointSaved=Boolean(checkpoint)&&actionVerified;
  out.push(Object.freeze({
   work_id:report.work_id,conversation_id:conversationId,
   title:String(report.title||'Unfinished job').slice(0,200),
   state:!actionVerified?'PRIOR_ACTION_UNRESOLVED':
    checkpointSaved?'RECOVERY_CHECKPOINT_SAVED':'TRACKING_DONE_REPAIR_UNFINISHED',
   action_completed:actionVerified,
   job_completed:false,
   original_work_id:report.work_id,
   issue_url:actionVerified?report.issue_url:null,
   observed_at:report.observed_at||null,
   source_receipt_id:report.receipt_id,
   recovery_receipt_id:checkpointSaved?checkpoint.event_id:null,
   goal_still_current:goalCurrent,
   can_save_recovery:actionVerified&&!checkpointSaved&&goalCurrent,
   can_resume_execution:false,
   external_action_performed:false,
   next_step:!actionVerified?
    'Prior provider attempt unresolved. Read-only reconciliation required; do not retry.':
    checkpointSaved?
    'Recovery checkpoint saved. The actual repair is still unfinished.':
    goalCurrent?
    'Save the original job for recovery. This does not run a repair.':
    'Review the original conversation goal before recovery can be saved.',
  }));
 }
 return Object.freeze(out);
}

export async function listAuthenticatedUnfinishedWork({
 session,env=process.env,
 listConversations=listPrivateConversations,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 maxConversations=50,
}={}){
 if(!validUuid(session?.user_id)||!session?.config?.url||
   env.VERCEL_ENV!=='preview'||
   env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw Error('UNFINISHED_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('UNFINISHED_ISOLATED_PROJECT_INVALID');
 if(!Number.isInteger(maxConversations)||maxConversations<1||maxConversations>50)
  throw Error('UNFINISHED_SCAN_LIMIT_INVALID');
 const available=await listConversations(session);
 if(!Array.isArray(available))throw Error('UNFINISHED_CONVERSATION_LIST_UNVERIFIED');
 const ids=[...new Set(available.map(c=>c?.conversation_id))];
 if(ids.some(id=>!validUuid(id)))throw Error('UNFINISHED_CONVERSATION_ID_INVALID');
 const selected=ids.slice(0,maxConversations);
 const persistence=createPersistence({...db});
 const entries=[];
 let unreadable=0;
 // Fixed concurrency and bounded scan: avoid turning one UI read into
 // unbounded DB work or leaking internal errors to the client.
 let next=0;
 const scan=async()=>{
  while(next<selected.length){
   const index=next++;
   const conversationId=selected[index];
   try{
    const grounded=await readGoal({session,conversationId,env});
    if(grounded.principal_id!==session.user_id||
       grounded.conversation_id!==conversationId||
       !grounded.scope?.root||!grounded.scope?.worldline)
      throw Error('UNFINISHED_GOAL_SCOPE_UNVERIFIED');
    const spine=createContinuitySpine({
     continuityRootId:grounded.scope.root,
     worldlineId:grounded.scope.worldline,
     subjectId:session.user_id,
    });
    if(grounded.state?.continuity_root_id!==spine.continuity_root_id||
       grounded.state?.world_id!==grounded.scope.world)
      throw Error('UNFINISHED_CANONICAL_SCOPE_INVALID');
    const history=await persistence.reconstruct({
     continuityRootId:spine.continuity_root_id,
     worldlineId:spine.worldline_id,
    });
    entries.push(...projectUnfinishedFromConversation({
     conversationId,events:history,goal:grounded.state,
    }));
   }catch{unreadable++;}
  }
 };
 await Promise.all(Array.from({length:Math.min(3,selected.length)},()=>scan()));
 const unique=new Map();
 for(const item of entries){
  // Prefer a saved checkpoint and a verified action if multiple conversations
  // happen to refer to the same original provider work. Do not duplicate work.
  const current=unique.get(item.work_id);
  if(!current||Number(item.action_completed)>Number(current.action_completed)||
     Number(item.recovery_receipt_id!==null)>Number(current.recovery_receipt_id!==null))
   unique.set(item.work_id,item);
 }
 const all=[...unique.values()].sort((a,b)=>
  String(b.observed_at||'').localeCompare(String(a.observed_at||'')));
 return Object.freeze({
  version:PERSONAL_UNFINISHED_WORK_VERSION,
  status:unreadable?'PARTIAL_COVERAGE':'SCOPED_READ_ONLY',
  scanned_conversations:selected.length,unreadable_conversations:unreadable,
  coverage_limited:ids.length>selected.length||available.length>=50,
  unfinished_count:all.length,
  jobs:Object.freeze(all.slice(0,30)),
  result_truncated:all.length>30,
  execution_authorized:false,external_action_performed:false,
 });
}
