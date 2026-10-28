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
  // Acceptance evidence is a separate CORROBORATED original-work stage.
  // It is not approval to close an issue, restart work or mark completion.
  const acceptance=history.filter(e=>
   e.entity_type==='personal_recovery_acceptance_evidence'&&
   e.payload?.original_work_id===report.work_id);
  if(acceptance.length>1)throw Error('UNFINISHED_REPAIR_ACCEPTANCE_DUPLICATE');
  const savedEvidence=acceptance[0]||null;
  if(savedEvidence){
   if(!checkpointSaved||
      savedEvidence.event_kind!=='WORK'||
      savedEvidence.epistemic_status!=='CORROBORATED'||
      savedEvidence.provenance?.source!=='reality-personal-repair-acceptance-v0.1'||
      savedEvidence.provenance?.conversation_id!==conversationId||
      savedEvidence.payload?.recovery_receipt_id!==checkpoint.event_id||
      savedEvidence.payload?.original_goal_id!==handoff.payload?.goal_id||
      savedEvidence.payload?.source_correction_verified!==true||
      savedEvidence.payload?.provider_current_success_verified!==true||
      savedEvidence.payload?.assessment!=='EVIDENCE_SUPPORTS_CORRECTION_AWAITING_OWNER_ACCEPTANCE'||
      savedEvidence.payload?.owner_accepted!==false||
      savedEvidence.payload?.full_original_job_completed!==false||
      savedEvidence.payload?.original_issue_closed!==false||
      savedEvidence.payload?.external_action_performed!==false||
      !/^[a-f0-9-]{36}$/i.test(String(savedEvidence.event_id||'')))
    throw Error('UNFINISHED_REPAIR_ACCEPTANCE_PROVENANCE_INVALID');
  }
  const ownerAcceptance=history.filter(e=>
   e.entity_type==='personal_original_repair_owner_acceptance'&&
   e.payload?.original_work_id===report.work_id);
  if(ownerAcceptance.length>1)throw Error('UNFINISHED_OWNER_ACCEPTANCE_DUPLICATE');
  const ownerAccepted=ownerAcceptance[0]||null;
  if(ownerAccepted){
   if(!savedEvidence||!goalCurrent||
      ownerAccepted.event_kind!=='AUTHORITY'||
      ownerAccepted.epistemic_status!=='VERIFIED'||
      ownerAccepted.provenance?.source!=='reality-owner-repair-acceptance-v0.1'||
      ownerAccepted.provenance?.conversation_id!==conversationId||
      ownerAccepted.provenance?.principal_id!==savedEvidence.provenance?.principal_id||
      ownerAccepted.payload?.owner_id!==savedEvidence.provenance?.principal_id||
      ownerAccepted.payload?.conversation_id!==conversationId||
      ownerAccepted.payload?.source_evidence_receipt_id!==savedEvidence.event_id||
      ownerAccepted.payload?.original_recovery_receipt_id!==checkpoint.event_id||
      ownerAccepted.payload?.original_goal_id!==handoff.payload?.goal_id||
      ownerAccepted.payload?.owner_confirmation!=='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY'||
      ownerAccepted.payload?.owner_accepted_source_correction!==true||
      ownerAccepted.payload?.original_repair_job_completed!==false||
      ownerAccepted.payload?.original_issue_closed!==false||
      ownerAccepted.payload?.github_write_authorized!==false||
      ownerAccepted.payload?.external_action_performed!==false)
    throw Error('UNFINISHED_OWNER_ACCEPTANCE_PROVENANCE_INVALID');
  }
  // Same original-worldline evidence of Reality independently recognizing
  // its own missing repair execution path. NOT a verified build warrant or
  // an authorization to write code / conclude the underlying business job.
  const candidates=history.filter(e=>
   e.entity_type==='personal_original_repair_capability_candidate'&&
   e.payload?.original_work_id===report.work_id);
  if(candidates.length>1)
   throw Error('UNFINISHED_ORIGINAL_CAPABILITY_CANDIDATE_DUPLICATE');
  const candidate=candidates[0]||null;
  if(candidate){
   if(!checkpointSaved||!goalCurrent||
      candidate.event_kind!=='WORK'||
      candidate.epistemic_status!=='CORROBORATED'||
      candidate.provenance?.source!=='reality-original-repair-capability-candidate-v0.1'||
      candidate.provenance?.conversation_id!==conversationId||
      candidate.provenance?.principal_id!==handoff.provenance?.principal_id||
      candidate.payload?.original_goal_id!==handoff.payload?.goal_id||
      candidate.payload?.recovery_receipt_id!==checkpoint.event_id||
      candidate.payload?.candidate_capability_id!=='reality.original-repair-execution'||
      candidate.payload?.missing_scope!=='EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH'||
      candidate.payload?.proof_ref!=='owner-continuity:'+handoff.event_id||
      candidate.payload?.candidate_state!=='SANDBOX_PROPOSED_AWAITING_AUTHORIZATION'||
      candidate.payload?.code_generated!==false||
      candidate.payload?.verified_upgrade_installed!==false||
      candidate.payload?.installation_authorized!==false||
      candidate.payload?.external_action_performed!==false||
      candidate.payload?.original_job_completed!==false)
    throw Error('UNFINISHED_ORIGINAL_CAPABILITY_CANDIDATE_SCOPE_INVALID');
  }
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
   capability_candidate_saved:Boolean(candidate),
   capability_candidate_receipt_id:candidate?.event_id||null,
   capability_candidate_id:candidate?.payload?.candidate_capability_id||null,
   can_auto_investigate_original_repair:checkpointSaved&&goalCurrent&&!candidate&&
    report.work_id==='work:24cda9611404e9bcb47909976067605c',
   repair_evidence_saved:Boolean(savedEvidence),
   repair_evidence_receipt_id:savedEvidence?.event_id||null,
   repair_evidence_status:savedEvidence?
    'SOURCE_CORRECTION_VERIFIED_AWAITING_OWNER_ACCEPTANCE':'NOT_YET_VERIFIED',
   owner_repair_accepted:Boolean(ownerAccepted),
   owner_repair_acceptance_receipt_id:ownerAccepted?.event_id||null,
   can_accept_source_correction:goalCurrent&&Boolean(savedEvidence)&&!ownerAccepted&&
    report.work_id==='work:24cda9611404e9bcb47909976067605c',
   goal_still_current:goalCurrent,
   can_save_recovery:actionVerified&&!checkpointSaved&&goalCurrent,
   can_resume_execution:false,
   external_action_performed:false,
   next_step:!actionVerified?
    'Prior provider attempt unresolved. Read-only reconciliation required; do not retry.':
    ownerAccepted?
    'Owner accepted the verified source correction. Original repair acceptance and final settlement remain separate; GitHub issue still OPEN.':
    savedEvidence?
    'Source correction evidence verified and saved. Owner acceptance and final repair settlement remain pending; no issue was closed.':
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
