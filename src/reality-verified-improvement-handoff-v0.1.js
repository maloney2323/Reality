// Evidence-bound learning handoff. This is NOT autonomous code deployment.
// A verified issue-creation outcome proves maintenance tracking, not a fix.
// Derive an independently traceable next improvement candidate without
// promoting assistant proposals to owner-authorized objectives.
import {continuityUuidFromSource,createContinuitySpine,appendContinuityNode}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {personalGoalScope} from './reality-personal-goal-readback-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';

export const VERIFIED_IMPROVEMENT_HANDOFF_VERSION='reality-verified-improvement-handoff-v0.1';
const reject=code=>{throw Error(code)};
export function deriveNextEvidenceBoundImprovement({history,workId}={}){
 if(!/^work:[a-f0-9]{32}$/.test(String(workId||'')))
  reject('IMPROVEMENT_WORK_ID_INVALID');
 const ordered=orderContinuityHistory(history||[]);
 const outcomes=ordered.filter(x=>
  x.entity_type==='personal_issue_execution_outcome'&&
  x.payload?.work_id===workId);
 if(outcomes.length!==1)
  reject('IMPROVEMENT_ONE_VERIFIED_OUTCOME_REQUIRED');
 const outcome=outcomes[0],p=outcome.payload;
 if(outcome.event_kind!=='OUTCOME'||outcome.epistemic_status!=='VERIFIED'||
  p?.outcome_state!=='VERIFIED_OUTCOME'||p?.independently_verified!==true||
  p?.reservation_state!=='VERIFIED'||!validUuid(p?.reservation_id)||
  !Number.isSafeInteger(p?.provider_issue_number)||p.provider_issue_number<1||
  p.provider_issue_url!=='https://github.com/maloney2323/Reality/issues/'+p.provider_issue_number)
  reject('IMPROVEMENT_INDEPENDENTLY_VERIFIED_EXECUTION_REQUIRED');
 const source=ordered.find(e=>
  e.event_id===p.source_receipt_id&&
  e.entity_type==='personal_discovered_work_handoff'&&
  e.event_kind==='OBSERVATION'&&
  e.payload?.work_id===workId&&
  e.payload?.goal_id===p.goal_id&&
  e.payload?.authority==='NOT_GRANTED'&&
  e.payload?.external_action_performed===false);
 if(!source||!Array.isArray(source.payload.evidence_refs)||
  source.payload.evidence_refs.length<2||
  source.payload.work_key?.startsWith('workflow-failure:')!==true||
  !source.payload.evidence_refs.every(ref=>
   /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/\d+$/.test(ref)))
  reject('IMPROVEMENT_VERIFIED_SOURCE_LINEAGE_REQUIRED');
 const proposalId=continuityUuidFromSource(
  'verified-improvement-proposal:'+outcome.event_id);
 return Object.freeze({
  version:VERIFIED_IMPROVEMENT_HANDOFF_VERSION,
  proposal_id:proposalId,source_work_id:workId,
  source_receipt_id:source.event_id,
  verified_outcome_receipt_id:outcome.event_id,
  user_goal_id:p.goal_id,work_key:source.payload.work_key,
  verified_tracking_issue_url:p.provider_issue_url,
  evidence_refs:[...source.payload.evidence_refs,p.provider_issue_url],
  status:'PROPOSED_REQUIRES_INDEPENDENT_TEST_AND_USER_APPROVAL',
  improvement_hypothesis:'Diagnose the repeatedly failing CI workflow, propose a minimal tested repair and measure subsequent independent workflow-run outcomes.',
  observed_fact:'GitHub maintenance tracking issue was independently created and read back.',
  unknown_root_cause:true,underlying_failure_repaired:false,
  improvement_tested:false,improvement_applied:false,
  customer_business_value_verified:false,
  time_saved_minutes:null,realized_savings_usd:null,
  next_verification_requirement:'A separately authorized repair, regression tests, and fresh independent workflow-run evidence are required before claiming improvement.',
  authority:'NOT_GRANTED',may_execute:false,may_deploy:false,
  changes_user_goal:false,
 });
}
export async function recordNextEvidenceBoundImprovement({
 session,conversationId,workId,env=process.env,
 persistenceFactory=createUniversePostgresPersistence,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !validUuid(session?.user_id)||!validUuid(conversationId))
  reject('IMPROVEMENT_AUTHENTICATED_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(db?.strictSecrets!==true||!db.secretKey||
  db.url!==session.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  reject('IMPROVEMENT_ISOLATED_DATABASE_REQUIRED');
 const scope=personalGoalScope({userId:session.user_id,conversationId});
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,
  subjectId:session.user_id,
 });
 const persistence=persistenceFactory({...db});
 const read=()=>persistence.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 });
 const history=orderContinuityHistory(await read());
 const proposal=deriveNextEvidenceBoundImprovement({history,workId});
 const existing=history.find(e=>e.event_id===proposal.proposal_id);
 if(existing){
  if(existing.entity_type!=='personal_verified_improvement_proposal'||
   existing.payload?.verified_outcome_receipt_id!==proposal.verified_outcome_receipt_id||
   existing.payload?.authority!=='NOT_GRANTED')
   reject('IMPROVEMENT_PROPOSAL_EVENT_CONFLICT');
  return Object.freeze({...proposal,receipt_id:existing.event_id,already_recorded:true});
 }
 const tail=history.at(-1);
 if(!tail?.lineage_hash)
  reject('IMPROVEMENT_CONTINUITY_TAIL_REQUIRED');
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'EVALUATION',entityId:proposal.proposal_id,
  eventId:proposal.proposal_id,parentEventId:tail.event_id,
  priorLineageHash:tail.lineage_hash,effectiveTime:at,assertionTime:at,
  epistemicStatus:'CLAIMED',
  payload:proposal,evidenceRefs:proposal.evidence_refs,
  provenance:{source:VERIFIED_IMPROVEMENT_HANDOFF_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await persistence.appendEvent({
  ...node,entity_type:'personal_verified_improvement_proposal',
 });
 const confirmed=orderContinuityHistory(await read());
 const stored=confirmed.find(e=>e.event_id===proposal.proposal_id);
 if(!stored||
  stored.parent_event_id!==tail.event_id||
  stored.entity_type!=='personal_verified_improvement_proposal'||
  stored.payload?.source_work_id!==workId||
  stored.payload?.authority!=='NOT_GRANTED'||
  stored.payload?.improvement_applied!==false)
  reject('IMPROVEMENT_PROPOSAL_PERSISTENCE_READBACK_FAILED');
 return Object.freeze({...proposal,receipt_id:stored.event_id,already_recorded:false});
}
