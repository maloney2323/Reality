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
import {readExactModelRepairEvidence}
 from './reality-real-verified-repair-readback-v1.0.js';

export const PERSONAL_UNFINISHED_WORK_VERSION='reality-personal-unfinished-work-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

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
  // A verified tracking-issue outcome is not a completed job. Conversely, an
  // independently settled original #143 must not be offered for new discovery
  // or a second owner reservation. Require BOTH linked Continuity events.
  const settledOriginal143=report.work_id==='work:24cda9611404e9bcb47909976067605c'&&
   history.some(settlement=>{
    const p=settlement.payload||{};
    if(settlement.entity_type!=='personal_original_job_final_settlement'||
       settlement.event_kind!=='OUTCOME'||
       settlement.epistemic_status!=='VERIFIED'||
       p.original_work_id!==report.work_id||
       p.original_goal_id!==handoff.payload?.goal_id||
       p.original_job_completed!==true||
       p.independently_verified!==true||
       p.outcome!=='HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED'||
       p.original_issue_number!==143||
       !UUID.test(String(p.registration_receipt_id||'')))return false;
    return history.some(reg=>{
     const b=reg.payload||{};
     return reg.event_id===p.registration_receipt_id&&
      reg.entity_type==='personal_original_executor_capability_registered'&&
      reg.event_kind==='CAPABILITY'&&reg.epistemic_status==='VERIFIED'&&
      b.original_work_id===report.work_id&&
      b.original_goal_id===handoff.payload?.goal_id&&
      b.owner_id===p.owner_id&&b.conversation_id===p.conversation_id&&
      b.owner_confirmation==='ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY'&&
      b.runtime_activation_verified===true&&
      b.registration_readback_verified===true;
    });
   });
  if(settledOriginal143)continue;
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
 // New, owner-confirmed REAL missing extension issues are independent of
 // previous one-off issue-creation tracking actions. Do not reuse #178's work.
 // Require signed-in owner goal binding and an actual source-backed failure.
 for(const event of history){
  const p=event?.payload||{};
  if(event?.entity_type!=='reality_original_source_backed_repair_work'||
     event.event_kind!=='OBSERVATION'||event.epistemic_status!=='VERIFIED'||
     p.version!=='reality-original-source-backed-repair-v1'||
     !WORK.test(String(p.original_work_id||''))||
     !ISSUE.test(String(p.issue_url||''))||
     p.owner_authorized_investigation!==true||
     p.owner_authorized_installation!==false||
     p.original_job_completed!==false||
     !/^[a-f0-9]{40}$/.test(String(p.original_source_sha||''))||
     !/^[a-f0-9]{64}$/.test(String(p.frozen_test_sha256||''))||
     event.provenance?.conversation_id!==conversationId||
     event.provenance?.principal_id!==p.owner_id)continue;
  // An independently settled exact original work must disappear from new-work
  // candidates. A passing CI job or model answer is NOT a settlement.
  const settled=history.some(item=>
    item.entity_type==='reality_generic_verified_original_work_outcome'&&
    item.epistemic_status==='VERIFIED'&&
    item.payload?.original_work_id===p.original_work_id&&
    item.payload?.owner_id===p.owner_id&&
    item.payload?.independent_outcome_verified===true&&
    item.payload?.outcome==='SUCCEEDED');
  if(settled)continue;
  const current=Boolean(goal?.active_goal_id===p.original_goal_id&&
   goal?.active_goal?.goal_id===p.original_goal_id&&
   goal.active_goal.status==='ACTIVE'&&
   goal.active_goal.user_confirmed===true&&
   goal.active_goal.last_transition_receipt_id===p.goal_transition_receipt_ref);
  out.push(Object.freeze({
   work_id:p.original_work_id,original_work_id:p.original_work_id,
   conversation_id:conversationId,
   title:'Reality: repair verified missing extension for issue #'+p.issue_number,
   state:'REAL_SOURCE_BACKED_REPAIR_PENDING',
   action_completed:true,job_completed:false,
   goal_still_current:current,
   source_receipt_id:event.event_id,issue_url:p.issue_url,
   observed_at:event.assertion_time,
   original_provider_failed_run_id:p.original_provider_failed_run_id,
   original_source_sha:p.original_source_sha,
   frozen_test_path:p.frozen_test_path,
   frozen_test_sha256:p.frozen_test_sha256,
   can_save_recovery:false,can_resume_execution:false,
   external_action_performed:false,
   next_step:current?
    'Continue the same owner-authorized repair through the isolated worker.':
    'Confirm the original goal again before continuing this work.',
  }));
 }
 // Historical original customer #178 is NOT a new source-backed work item.
 // Project its existing signed Continuity work and separately VERIFIED gap
 // into the SAME work ID. Until independent provider readback enriches the
 // frozen source, this projection grants no install or execution authority.
 const original178=history.filter(e=>{
  const p=e?.payload||{};
  return e.entity_type==='personal_first_self_upgrade_customer_work'&&
   e.event_kind==='WORK'&&e.epistemic_status==='OBSERVED'&&
   p.version==='reality-personal-first-upgrade-178-v0.1'&&
   p.status==='INVESTIGATION_APPROVED_GAP_WORK_NOT_COMPLETED'&&
   p.issue_number===178&&
   p.issue_url==='https://github.com/maloney2323/Reality/issues/178'&&
   p.original_work_id==='work:9b9578b3c65427589c4c6da68fe0fc87'&&
   p.installation_authorized===false&&p.original_job_completed===false&&
   e.provenance?.conversation_id===conversationId;
 });
 if(original178.length===1){
  const source=original178[0],p=source.payload;
  const run=/^github:actions:run:([1-9][0-9]*):job:([1-9][0-9]*)$/
   .exec(String(p.gap_provider_receipt_ref||''));
  const confirmed=history.filter(e=>e.entity_type==='personal_first_178_confirmed_gap'&&
   e.event_kind==='OBSERVATION'&&e.epistemic_status==='VERIFIED'&&
   e.payload?.original_source_receipt_ref===source.event_id&&
   e.payload?.original_work_id===p.original_work_id&&
   e.payload?.provider_receipt_ref===p.gap_provider_receipt_ref&&
   e.payload?.evidence_hash===p.gap_evidence_hash&&
   e.payload?.goal_id===p.original_goal_id&&
   e.payload?.owner_id===source.provenance?.principal_id&&
   e.provenance?.conversation_id===conversationId&&
   e.provenance?.principal_id===source.provenance?.principal_id&&
   e.payload?.authorization_granted===false&&
   e.payload?.original_job_completed===false);
  const current=Boolean(goal?.active_goal_id===p.original_goal_id&&
   goal?.active_goal?.goal_id===p.original_goal_id&&
   goal.active_goal.status==='ACTIVE'&&goal.active_goal.user_confirmed===true&&
   goal.active_goal.last_transition_receipt_id===p.goal_transition_receipt_ref);
  if(run&&Number.isSafeInteger(Number(run[1]))&&confirmed.length===1&&
     p.pinned_red_run==='https://github.com/maloney2323/Reality/actions/runs/'+run[1]){
   const settled=history.some(e=>
    e.entity_type==='reality_generic_verified_original_work_outcome'&&
    e.epistemic_status==='VERIFIED'&&
    e.payload?.original_work_id===p.original_work_id&&
    e.payload?.owner_id===source.provenance?.principal_id&&
    e.payload?.independent_outcome_verified===true&&
    e.payload?.outcome==='SUCCEEDED');
   if(!settled)out.push(Object.freeze({
    work_id:p.original_work_id,original_work_id:p.original_work_id,
    conversation_id:conversationId,issue_number:178,
    title:'Reality: continue original self-repair customer job #178',
    state:'ORIGINAL_178_VERIFIED_GAP_AWAITING_CANDIDATE_READBACK',
    legacy_original_178:true,action_completed:true,job_completed:false,
    goal_still_current:current,source_receipt_id:source.event_id,
    verified_gap_receipt_id:confirmed[0].event_id,issue_url:p.issue_url,
    original_provider_failed_run_id:Number(run[1]),
    observed_at:source.assertion_time,
    can_save_recovery:false,can_resume_execution:false,
    external_action_performed:false,
    next_step:current?
     'Read the already generated candidate against original #178. Do not create a second job.':
     'Reconfirm the existing original goal before any repair action.',
   }));
  }
 }
 return Object.freeze(out);
}

export async function listAuthenticatedUnfinishedWork({
 session,env=process.env,
 listConversations=listPrivateConversations,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 readLegacyCandidate=readExactModelRepairEvidence,
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
 // Only provider-verified ORIGINAL evidence may upgrade the historical #178
 // projection to a candidate ready for review. The model cannot invent a new
 // customer work record, and a failed readback leaves installation disabled.
 const jobs=await Promise.all(all.map(async item=>{
  if(item.legacy_original_178!==true||item.goal_still_current!==true)
   return item;
  try{
   const proof=await readLegacyCandidate({issueNumber:178,env});
   if(proof?.independently_verified!==true||
    proof.issue_number!==178||proof.issue_url!==item.issue_url||
    proof.original_failed_run_id!==item.original_provider_failed_run_id||
    !/^[a-f0-9]{40}$/.test(String(proof.original_source_sha||''))||
    !/^[a-f0-9]{64}$/.test(String(proof.frozen_test_sha256||''))||
    proof.installed!==false||proof.original_job_completed!==false||
    proof.installation_authorized!==false||proof.production_changed!==false)
    return item;
   return Object.freeze({...item,
    state:'REAL_SOURCE_BACKED_REPAIR_PENDING',
    original_source_sha:proof.original_source_sha,
    frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
    frozen_test_sha256:proof.frozen_test_sha256,
    next_step:'The original #178 model candidate is source-verified and ready for owner review.',
   });
  }catch{return item;}
 }));
 return Object.freeze({
  version:PERSONAL_UNFINISHED_WORK_VERSION,
  status:unreadable?'PARTIAL_COVERAGE':'SCOPED_READ_ONLY',
  scanned_conversations:selected.length,unreadable_conversations:unreadable,
  coverage_limited:ids.length>selected.length||available.length>=50,
  unfinished_count:all.length,
  jobs:Object.freeze(jobs.slice(0,30)),
  result_truncated:all.length>30,
  execution_authorized:false,external_action_performed:false,
 });
}
