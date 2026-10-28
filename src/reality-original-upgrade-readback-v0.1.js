// Owner-scoped, read-only activation readiness for original Reality job #143.
// This does NOT register/install a capability or settle a job.
import {createHash} from 'node:crypto';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,continuityUuidFromSource} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {githubGet} from './reality-connector-github-v1.0.js';

export const ORIGINAL_UPGRADE_STATUS_VERSION='reality-original-upgrade-readback-v0.1';
export const ORIGINAL_WORK='work:24cda9611404e9bcb47909976067605c';
const BRANCH='experiment/reality-live-durable-adversarial-20261025';
const REPO='/repos/maloney2323/Reality';
const MODEL_SHA='7ba3cc3273c2301c6902b6b3b3d6d0247e8b6abe0398467656e5e2ca93648128';
const MODEL_PATH='src/reality-extensions/reality-original-maintenance-executor.mjs';
export const ORIGINAL_CAPABILITY_ID=continuityUuidFromSource('reality.original-repair-execution');
export const ORIGINAL_CAPABILITY_VERSION='original-repair-executor-1';
const LIVE_RUN='https://github.com/maloney2323/Reality/actions/runs/40777160879';
const ISSUE_TITLE='Reality recurring work: repair repeated Reality Governed Execution Engine v0.1 failures';
function fail(code){throw Error(code)}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function matchingEvent(event,type,ownerId,goalId){
 return event?.entity_type===type && event?.epistemic_status==='VERIFIED' &&
  event.payload?.original_work_id===ORIGINAL_WORK &&
  event.payload?.owner_id===ownerId &&
  event.payload?.original_goal_id===goalId;
}
export function projectOriginalCapabilityReadiness({events=[],github,ownerId,goalId,registryRecord=null}={}){
 if(!validUuid(ownerId)||!goalId||!Array.isArray(events)||!github)
  fail('ORIGINAL_UPGRADE_PROJECTION_INPUT_INVALID');
 const accepted=events.find(e=>matchingEvent(e,'personal_original_repair_owner_acceptance',ownerId,goalId) &&
  e.payload?.owner_confirmation==='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY' &&
  e.payload?.owner_accepted_source_correction===true &&
  e.payload?.github_write_authorized===false);
 // The old independent warrant expressly forbade promotion. Never treat it as install consent.
 const warrant=events.find(e=>e?.entity_type==='personal_upgrade_evidence_warrant' &&
  e?.payload?.original_work_id===ORIGINAL_WORK &&
  e?.payload?.warrant?.owner_id===ownerId &&
  e?.payload?.warrant?.promotion_authorized===false);
 const registered=events.find(e=>matchingEvent(e,'personal_original_executor_capability_registered',ownerId,goalId) &&
  e.payload?.source_sha256===MODEL_SHA &&
  e.payload?.owner_confirmation==='ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY' &&
  e.payload?.target_branch===BRANCH &&
  e.payload?.runtime_activation_verified===true &&
  e.payload?.registration_readback_verified===true);
 // The source-attested Continuity registration receipt is necessary but not
 // sufficient: independently retrieve the owner registry's exact active row.
 const registryRowVerified=!!registered&&
  registryRecord?.capability_id===ORIGINAL_CAPABILITY_ID&&
  registryRecord?.capability_version===ORIGINAL_CAPABILITY_VERSION&&
  registryRecord?.status==='ACTIVE'&&
  registryRecord?.admitted_event_id===registered.event_id&&
  registryRecord?.verification_basis?.owner_id===ownerId&&
  registryRecord?.verification_basis?.original_goal_id===goalId&&
  registryRecord?.verification_basis?.original_work_id===ORIGINAL_WORK&&
  registryRecord?.verification_basis?.source_sha256===MODEL_SHA&&
  registryRecord?.verification_basis?.target_branch===BRANCH&&
  registryRecord?.verification_basis?.independent_live_run_ref===LIVE_RUN&&
  registryRecord?.procedure?.runtime_import_verified===true;
 const settled=registryRowVerified&&registered&&events.find(e=>matchingEvent(e,'personal_original_job_final_settlement',ownerId,goalId) &&
  e.payload?.registration_receipt_id===registered.event_id &&
  e.payload?.outcome==='HISTORICAL_SOURCE_ALREADY_FIXED_INDEPENDENTLY_RECONCILED' &&
  e.payload?.original_job_completed===true &&
  e.payload?.external_repair_performed_by_reality===false &&
  e.payload?.independently_verified===true &&
  e.payload?.original_issue_number===143);
 const githubReady=github.pr156_merged===true &&
  github.pr157_merged===true &&
  github.current_executor_sha256===MODEL_SHA &&
  github.successful_live_run===true &&
  github.issue_number===143 &&
  github.issue_title===ISSUE_TITLE &&
  github.issue_state==='open';
 let nextAction='RECHECK_LIVE_GITHUB_AND_INSTALLED_BYTES';
 if(githubReady) nextAction=!accepted?'SOURCE_ACCEPTANCE_REQUIRED':
  !registryRowVerified?'AWAIT_EXPLICIT_OWNER_ACTIVATION_AND_DURABLE_REGISTRATION':
  !settled?'RESUME_AND_DURABLY_SETTLE_ORIGINAL_JOB':'FINISHED_VERIFIED';
 return Object.freeze({
  version:ORIGINAL_UPGRADE_STATUS_VERSION, original_work_id:ORIGINAL_WORK,
  original_issue_number:143,scope:'OWNER_ISOLATED_EXPERIMENT_ONLY',
  github_verified:githubReady,
  actual_experimental_executor_bytes_verified:github.current_executor_sha256===MODEL_SHA,
  model_source_sha256_expected:MODEL_SHA,
  independent_live_reconciliation_verified:github.successful_live_run===true,
  historical_source_fix_already_present:githubReady,
  preexisting_owner_evidence_acceptance_verified:!!accepted,
  prior_warrant_does_not_authorize_installation:!!warrant,
  owner_capability_registry_registered:registryRowVerified&&githubReady,
  owner_capability_registry_record_verified:registryRowVerified&&githubReady,
  owner_capability_registry_version:ORIGINAL_CAPABILITY_VERSION,
  original_job_final_settlement_persisted:!!settled&&githubReady,
  full_original_job_completed:!!settled&&githubReady,
  owner_activation_receipt_id:registered?.event_id||null,
  final_settlement_receipt_id:settled?.event_id||null,
  next_action:nextAction,approval_to_install_inferred:false,
  github_writes_performed:false,external_action_performed:false,
 });
}
function decodeSource(response){
 if(response?.type!=='file'||response?.path!==MODEL_PATH||
    response?.encoding!=='base64'||typeof response?.content!=='string'||
    response.content.length>230000)
  fail('ORIGINAL_UPGRADE_GITHUB_MODEL_READBACK_INVALID');
 const raw=Buffer.from(response.content.replace(/\s+/g,''),'base64');
 if(raw.length<1000||raw.length>160000)fail('ORIGINAL_UPGRADE_MODEL_BYTES_BOUNDS');
 return sha256(raw);
}
export async function inspectAuthenticatedOriginalCapabilityReadiness({
 session,conversationId,workId,env=process.env,
 readGoal=readFreshPersonalGoalState,createPersistence=createUniversePostgresPersistence,
 get=githubGet,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    workId!==ORIGINAL_WORK||env.VERCEL_ENV!=='preview')
  fail('ORIGINAL_UPGRADE_AUTHENTICATED_SCOPE_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||goal?.conversation_id!==conversationId||
    goal?.state?.active_goal?.status!=='ACTIVE'||
    goal?.state?.active_goal?.user_confirmed!==true||
    goal?.state?.active_goal_id!==goal?.state?.active_goal?.goal_id)
  fail('ORIGINAL_UPGRADE_OWNER_GOAL_NOT_VERIFIED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ORIGINAL_UPGRADE_PRIVATE_PROJECT_MISMATCH');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,subjectId:session.user_id,
 });
 if(spine.continuity_root_id!==goal.state.continuity_root_id)
  fail('ORIGINAL_UPGRADE_CONTINUITY_SCOPE_CHANGED');
 const store=createPersistence({...db});
 const [history,registryRecord,ref,pr156,pr157,issue,run]=await Promise.all([
  store.reconstruct({
   continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
  }),
  store.getCapability(ORIGINAL_CAPABILITY_ID,ORIGINAL_CAPABILITY_VERSION),
  get(REPO+'/git/ref/heads/'+BRANCH),
  get(REPO+'/pulls/156'),
  get(REPO+'/pulls/157'),
  get(REPO+'/issues/143'),
  get(REPO+'/actions/runs/40777160879'),
 ]);
 const head=String(ref?.object?.sha||'');
 if(!/^[a-f0-9]{40}$/.test(head)||ref.ref!=='refs/heads/'+BRANCH)
  fail('ORIGINAL_UPGRADE_EXPERIMENT_REF_NOT_VERIFIED');
 const source=await get(REPO+'/contents/'+MODEL_PATH+'?ref='+head);
 const github={
  pr156_merged:pr156?.merged===true&&pr156?.base?.ref===BRANCH,
  pr157_merged:pr157?.merged===true&&pr157?.base?.ref===BRANCH,
  current_executor_sha256:decodeSource(source),
  successful_live_run:run?.id===40777160879&&
   run?.conclusion==='success'&&run?.status==='completed'&&
   run?.head_branch===BRANCH,
  issue_number:issue?.number,issue_title:issue?.title,issue_state:issue?.state,
 };
 return Object.freeze({
  ...projectOriginalCapabilityReadiness({
   events:orderContinuityHistory(history),github,
   ownerId:session.user_id,goalId:goal.state.active_goal_id,registryRecord,
  }),
  github_branch_head_sha:head,provider_checked_at:new Date().toISOString(),
 });
}
