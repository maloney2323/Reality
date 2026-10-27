// Source-verified DISCOVERY -> authenticated personal GoalState handoff.
// PREVIEW ONLY. Never accepts a browser-supplied executable work item or goal.
// Discovery is rerun from Reality's GitHub provider before selecting an ID.
// Persists non-authorizing observed-work receipts in the SAME personal Continuity,
// preserving the original work/evidence/goal relationship for future stages.
import {createHash} from 'node:crypto';
import {runRealityStewardshipPass} from './reality-stewardship-pass-v1.0.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {bindWorkToAuthenticatedGoal} from './reality-execution-goal-grounding-v0.1.js';
import {issuePersonalWorkGroundingProof} from './reality-personal-work-grounding-proof-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {fingerprintApprovedWorkItem} from './reality-authority-v1.0.js';

export const PERSONAL_DISCOVERED_WORK_HANDOFF_VERSION='reality-personal-discovered-work-handoff-v0.1';
const REPO='maloney2323/Reality';
const fail=(code)=>{throw Error(code)};
const str=x=>typeof x==='string'&&x.trim().length>0;
function stableId(principal,conversation,workId,goalReceipt,fingerprint){
 const hex=createHash('sha256').update(JSON.stringify([
  'personal-discovered-work-handoff-v1',principal,conversation,workId,
  goalReceipt,fingerprint,
 ])).digest('hex').split('');
 hex[12]='5';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);
 const s=hex.join('');
 return [s.slice(0,8),s.slice(8,12),s.slice(12,16),
  s.slice(16,20),s.slice(20,32)].join('-');
}
function trustedDiscovery(work){
 if(work?.kind!=='SYSTEM_MAINTENANCE'||work.state!=='QUALIFIED'||
   work.authorization_required!==true||work.recurring!==true||
   !Number.isSafeInteger(work.recurrence_count)||work.recurrence_count<2||
   !str(work.work_id)||!/^work:[a-f0-9]{32}$/.test(work.work_id)||
   !str(work.work_key)||!work.work_key.startsWith('workflow-failure:')||
   !Array.isArray(work.evidence_refs)||work.evidence_refs.length<2||
   !Array.isArray(work.source_observation_ids)||
   work.source_observation_ids.length<2)
  fail('DISCOVERED_WORK_NOT_SOURCE_QUALIFIED');
 for(const ref of work.evidence_refs){
  let u;try{u=new URL(ref)}catch{fail('DISCOVERED_WORK_SOURCE_URL_INVALID')}
  if(u.origin!=='https://github.com'||
     !u.pathname.startsWith('/'+REPO+'/actions/runs/'))
   fail('DISCOVERED_WORK_SOURCE_OUT_OF_SCOPE');
 }
 const wi=work.execution_work_item;
 if(wi?.work_item_id!==work.work_id||
    wi.workflow_id!=='workflow:'+work.work_id||
    wi.connector!=='github'||wi.operation!=='create_issue'||
    wi.inputs?.repository!==REPO||
    wi.consequential!==true||
    wi.status!=='AWAITING_AUTHORIZATION'||
    !str(wi.inputs?.title)||!str(wi.inputs?.body)||
    wi.inputs.title.length>200||wi.inputs.body.length>10000)
  fail('DISCOVERED_WORK_OPERATION_NOT_APPROVABLE');
 return Object.freeze({
  ...wi,
  // These are SERVER-ORIGIN references, not browser assertions.
  discovered_work_id:work.work_id,
  discovery_work_key:work.work_key,
  discovery_source:'github_actions',
  discovery_source_observation_ids:[...work.source_observation_ids],
  discovery_evidence_refs:[...work.evidence_refs],
  discovery_observed_at:work.last_observed_at||null,
 });
}
export async function preparePersonalDiscoveredWorkHandoff({
 session,conversationId,discoveredWorkId,
 env=process.env,
 discover=runRealityStewardshipPass,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 issueProof=issuePersonalWorkGroundingProof,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !/^work:[a-f0-9]{32}$/.test(String(discoveredWorkId||'')))
  fail('DISCOVERED_WORK_AUTHENTICATED_SCOPE_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('DISCOVERED_WORK_DURABLE_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(db?.url!==session?.config?.url||
    db?.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db?.strictSecrets!==true||!db?.secretKey)
  fail('DISCOVERED_WORK_ISOLATED_PROJECT_REQUIRED');
 // Do not trust a remembered browser catalog. Re-observe the same provider.
 const result=await discover({owner:'maloney2323',repo:'Reality'});
 const options=Array.isArray(result?.work)?result.work:[];
 const work=options.find(w=>w.work_id===discoveredWorkId);
 if(!work)fail('DISCOVERED_WORK_SOURCE_NO_LONGER_CURRENT');
 const workItem=trustedDiscovery(work);
 const latest=await readGoal({session,conversationId,env});
 if(latest.principal_id!==session.user_id||
    latest.conversation_id!==conversationId||
    !latest.scope?.root||!latest.scope?.worldline)
  fail('DISCOVERED_WORK_CONTINUITY_SCOPE_NOT_VERIFIED');
 const binding=bindWorkToAuthenticatedGoal({
  workItem,authoritativeState:latest.state,
  serverVerifiedPrincipalId:session.user_id,
 });
 if(binding.status!=='BOUND_FOR_FRESHNESS_CHECK')
  fail(binding.reason||'DISCOVERED_WORK_CONFIRMED_GOAL_REQUIRED');
 const fp=fingerprintApprovedWorkItem(workItem);
 const receiptId=stableId(session.user_id,conversationId,
  discoveredWorkId,binding.goal_transition_receipt_id,fp);
 const store=createPersistence({...db});
 const past=await store.reconstruct({
  continuityRootId:latest.scope.root,worldlineId:latest.scope.worldline,
 });
 let event=past.find(x=>x.event_id===receiptId)||null;
 const payload={
  version:PERSONAL_DISCOVERED_WORK_HANDOFF_VERSION,
  work_id:discoveredWorkId,work_fingerprint:fp,
  work_key:work.discovery_work_key||work.work_key,
  work_item:workItem,
  goal_id:binding.goal_id,goal_revision:binding.goal_revision,
  goal_transition_receipt_id:binding.goal_transition_receipt_id,
  user_goal_source_ref:binding.goal_source_user_message_ref,
  source_observation_ids:[...work.source_observation_ids],
  evidence_refs:[...work.evidence_refs],
  authority:'NOT_GRANTED',external_action_performed:false,
 };
 if(event){
  if(event.entity_type!=='personal_discovered_work_handoff'||
     event.payload?.work_fingerprint!==fp||
     event.payload?.goal_transition_receipt_id!==binding.goal_transition_receipt_id||
     event.payload?.work_id!==discoveredWorkId||
     event.payload?.authority!=='NOT_GRANTED')
   fail('DISCOVERED_WORK_RECEIPT_CONFLICT');
 }else{
  const at=new Date().toISOString();
  event=await store.appendEvent({
   event_id:receiptId,event_kind:'observation',
   entity_type:'personal_discovered_work_handoff',
   entity_id:discoveredWorkId,
   continuity_root_id:latest.scope.root,
   worldline_id:latest.scope.worldline,
   parent_event_id:null,
   effective_time:at,assertion_time:at,
   epistemic_status:'OBSERVED',
   payload,evidence_refs:[...work.evidence_refs],
   provenance:{source:PERSONAL_DISCOVERED_WORK_HANDOFF_VERSION,
    observer:'github_actions',principal_id:session.user_id,
    conversation_id:conversationId},
  });
  // Never claim a durable work receipt without independent readback.
  const confirmed=await store.reconstruct({
   continuityRootId:latest.scope.root,worldlineId:latest.scope.worldline,
  });
  const saved=confirmed.find(x=>x.event_id===receiptId);
  if(!saved||saved.entity_type!=='personal_discovered_work_handoff'||
     saved.payload?.work_fingerprint!==fp||
     saved.payload?.goal_transition_receipt_id!==binding.goal_transition_receipt_id)
   fail('DISCOVERED_WORK_HANDOFF_READBACK_FAILED');
 }
 // Receipt is observation only; signed proof is FRESHNESS ONLY, never approval.
 const groundingProof=issueProof({
  binding,conversationId,principalId:session.user_id,env,
 });
 return Object.freeze({
  status:'DISCOVERED_WORK_GOAL_GROUNDED_PENDING_APPROVAL',
  discovered_work_id:discoveredWorkId,
  work_item:workItem,
  goal_id:binding.goal_id,
  work_fingerprint:fp,
  continuity_receipt_id:receiptId,
  grounding_proof:groundingProof,
  evidence_refs:[...work.evidence_refs],
  action_approved:false,
  execution_authorized:false,
  external_action_performed:false,
 });
}

export async function listPersonalDiscoveredWorkHandoffs({
 session,conversationId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId))
  fail('DISCOVERED_WORK_AUTHENTICATED_SCOPE_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('DISCOVERED_WORK_DURABLE_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(db?.url!==session?.config?.url||
    db?.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db?.strictSecrets!==true||!db?.secretKey)
  fail('DISCOVERED_WORK_ISOLATED_PROJECT_REQUIRED');
 const latest=await readGoal({session,conversationId,env});
 if(latest.principal_id!==session.user_id||
    latest.conversation_id!==conversationId||
    !latest.scope?.root||!latest.scope?.worldline)
  fail('DISCOVERED_WORK_CONTINUITY_SCOPE_NOT_VERIFIED');
 const history=await createPersistence({...db}).reconstruct({
  continuityRootId:latest.scope.root,worldlineId:latest.scope.worldline,
 });
 const current=latest.state?.active_goal;
 const all=history.filter(e=>
  e.entity_type==='personal_discovered_work_handoff'&&
  e.continuity_root_id===latest.scope.root&&
  e.worldline_id===latest.scope.worldline&&
  e.provenance?.principal_id===session.user_id&&
  e.provenance?.conversation_id===conversationId&&
  e.payload?.version===PERSONAL_DISCOVERED_WORK_HANDOFF_VERSION&&
  e.payload?.authority==='NOT_GRANTED'&&
  e.payload?.external_action_performed===false&&
  e.payload?.work_id===e.entity_id&&
  e.payload?.work_item?.discovered_work_id===e.entity_id&&
  e.payload?.work_item?.work_item_id===e.entity_id&&
  e.payload?.work_fingerprint===fingerprintApprovedWorkItem(e.payload.work_item)
 ).sort((a,b)=>String(b.assertion_time).localeCompare(String(a.assertion_time)));
 const seen=new Set();
 return Object.freeze({
  status:'READ_ONLY_DISCOVERED_WORK_CONTINUITY',
  conversation_id:conversationId,
  items:all.filter(e=>{
   if(seen.has(e.entity_id))return false;
   seen.add(e.entity_id);return true;
  }).slice(0,20).map(e=>Object.freeze({
   work_id:e.entity_id,
   continuity_receipt_id:e.event_id,
   goal_id:e.payload.goal_id,
   work_fingerprint:e.payload.work_fingerprint,
   source_observation_ids:e.payload.source_observation_ids||[],
   evidence_refs:e.payload.evidence_refs||[],
   goal_still_current:Boolean(
    current?.goal_id===e.payload.goal_id&&
    current?.status==='ACTIVE'&&
    current?.last_transition_receipt_id===e.payload.goal_transition_receipt_id
   ),
   action_approved_by_handoff:false,
   external_action_performed:false,
  })),
  execution_authorized:false,
  external_action_performed:false,
 });
}
