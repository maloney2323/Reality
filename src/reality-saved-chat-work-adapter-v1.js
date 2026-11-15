// Authenticated, readback-verified Reality Chat -> installed-capability router.
// Only the signed user message can be classified. Models NEVER grant authority.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readOwnerGovernedBuild,queueOwnerGovernedBuild}
 from './reality-governed-build-chat-connection-v1.0.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {classifyChatWorkIntent} from './reality-chat-work-intent-v1.js';
import {readOwnerChatWorkHandoff} from './reality-private-chat-work-readback-v1.js';
import {continueRileyCorrectiveModelIntoIndependentCI}
 from './reality-riley-auto-corrective-ci-bridge-v1.js';
import {admitOwnerNewDevelopment,readOwnerNewDevelopment}
 from './reality-chat-new-development-adapter-v1.js';

const workId=x=>/^work:[a-f0-9]{32}$/.test(String(x||''));
const SOURCE=/^supabase:reality_chat_messages:[a-f0-9-]{36}$/i;
const fail=(code,status=409)=>{throw Object.assign(new Error(code),{status})};

// These are INSTALLED server adapters, not model-suggested permissions.
// A new capability can register its adapter without adding job numbers or
// client-side branch/path rules. "Website edit" isn't registered yet.
export const CHAT_WORK_CAPABILITIES=Object.freeze([
 Object.freeze({id:'governed-original-discovery',
  description:'Queue discovery of an independently eligible existing original development job tied to the signed-in confirmed user goal. Does not install or settle.',
  effect:'owner-scoped investigation',authorizes_installation:false}),
 Object.freeze({id:'governed-original-engineering',
  description:'Build or repair source code for an explicitly referenced, already admitted and owner-authorized original software-engineering job. Reuse Reality\'s existing model-written corrective candidate and independently tested isolated GitHub CI. No new feature outside the original warrant, no installation.',
  effect:'isolated source candidate and independent CI',authorizes_installation:false}),
 Object.freeze({id:'governed-chat-new-development',
  description:'Create a genuinely new isolated Reality code development task from the currently saved explicit owner build instruction. No prior job or shift borrowed. Model code generation and independent verification are separate; production installation never authorized.',
  effect:'new isolated development admission only',authorizes_installation:false}),
 Object.freeze({id:'owner-employee-shift-briefing',
  description:'Read actual employee shift authorization, current work and steps from the owner-scoped independent ledger. Read only.',
  effect:'read only',authorizes_installation:false}),
]);
function sourceTurn({session,conversationId,requestId,messages}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||!validUuid(requestId)||
    !Array.isArray(messages))fail('CHAT_WORK_OWNER_SOURCE_UNVERIFIED',401);
 const verified=messages.filter(x=>x.request_id===requestId&&x.role==='user'&&
   SOURCE.test(x.source_ref||'')&&typeof x.text==='string'&&x.text.trim());
 if(verified.length!==1)fail('CHAT_WORK_SIGNED_USER_TURN_REQUIRED',403);
 return verified[0];
}
async function readOwnerEmployeeShift({
 session,env=process.env,dbFactory=shiftDatabase,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview')throw Error('SHIFT_PREVIEW_SCOPE_UNAVAILABLE');
 const db=dbFactory(env);
 if(!db?.strictSecrets||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('SHIFT_OWNER_PROJECT_MISMATCH');
 const read=assertShiftReadback(await callRpc(db,'reality_read_owner_employee_shifts_v1',
  {p_owner_id:session.user_id}));
 const shifts=Array.isArray(read.shifts)?read.shifts:[];
 const current=shifts.find(x=>['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.status)&&
  !x.closed_at)||shifts[0]||null;
 return Object.freeze({
  status:current?'OWNER_SHIFT_INDEPENDENTLY_READ':'NO_SHIFT_FOUND',
  shift_id:current?.shift_id||null,
  shift_status:current?.status||null,
  authorized_at:current?.authorized_at||null,
  owner_bound:true,read_only:true,
  work_step_count:Array.isArray(current?.steps)?current.steps.length:null,
  independent_shift_completion_proven:false,
 });
}
export async function inspectSavedChatWork({
 session,conversationId,requestId,messages,
 readBuild=readOwnerGovernedBuild,
 readShift=readOwnerEmployeeShift,readWork=readOwnerChatWorkHandoff,
 readNew=readOwnerNewDevelopment,classify=classifyChatWorkIntent
}={}){
 const verified=sourceTurn({session,conversationId,requestId,messages});
 let intent;
 try{intent=await classify({message:verified.text,
   registeredCapabilities:CHAT_WORK_CAPABILITIES});
 }catch{
  return Object.freeze({status:'CHAT_WORK_INTENT_UNAVAILABLE',
   request_id:requestId,source_ref:verified.source_ref,
   action_eligible:false,execution_started:false,
   installation_authorized:false,production_changed:false});
 }
 // A literal, signed request to code an exact GitHub issue or original work
 // identity wins over a vague "discover existing work" classification. This
 // narrows the destination; it cannot add an original or mint an authority.
 if(intent.kind==='WORK_REQUEST'&&intent.explicit_request===true&&
    typeof intent.source_quote==='string'&&
    verified.text.includes(intent.source_quote)&&
    /\b(?:build|code|implement|repair|fix|develop|upgrade)\b/i.test(verified.text)&&
    (/(?:https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*|\b(?:issue|job|repair)\s*#?[1-9]\d*\b|work:[a-f0-9]{32})/i)
      .test(verified.text)){
  intent={...intent,capability_id:'governed-original-engineering',
   action_eligible:true};
 }
 const common={
  request_id:requestId,source_ref:verified.source_ref,
  intent_kind:intent.kind,objective:intent.objective||null,
  source_quote:intent.source_quote||null,
  capability_id:intent.capability_id||null,
  action_eligible:false,execution_started:false,
  installation_authorized:false,production_changed:false
 };
 if(intent.kind==='CONVERSATION'||intent.kind==='UNCERTAIN')
  return Object.freeze({...common,status:intent.status==='CONVERSATION_ONLY'?
   'CHAT_WORK_CONVERSATION_ONLY':'CHAT_WORK_INTENT_NEEDS_CLARIFICATION'});
 if(intent.capability_id==='governed-chat-new-development'&&
    intent.kind==='WORK_REQUEST'&&intent.explicit_request===true&&
    intent.action_eligible===true){
  // Fresh signed Chat wording admits its OWN new source. No automatic
  // assignment of an unrelated prior repair or an existing shift warrant.
  let prior=null;
  try{prior=await readNew({session,conversationId})}catch{
   return Object.freeze({...common,status:'CHAT_WORK_NEW_DEVELOPMENT_READBACK_UNAVAILABLE'});
  }
  if(prior?.status!=='OWNER_CHAT_NEW_DEVELOPMENT_READBACK'||
     prior.owner_id!==session.user_id||
     prior.conversation_id!==conversationId||
     !Array.isArray(prior.items))
   return Object.freeze({...common,status:'CHAT_WORK_NEW_DEVELOPMENT_READBACK_UNAVAILABLE'});
  const matched=prior.items.filter(x=>
    x.request_id===requestId&&x.source_ref===verified.source_ref);
  if(matched.length>1)
   return Object.freeze({...common,status:'CHAT_WORK_NEW_DEVELOPMENT_DUPLICATE_SOURCE'});
  if(matched.length===1)return Object.freeze({...common,
   status:'CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED',
   original_work_id:matched[0].original_work_id,
   development_phase:matched[0].phase,
   development_evidence:matched[0].evidence||null});
  return Object.freeze({...common,
   status:'CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE',
   action_eligible:true,
   original_work_id:null,
   development_phase:'NOT_YET_ADMITTED',
   new_shift_started:false});
 }
 if(intent.capability_id==='governed-original-engineering'&&
    intent.kind==='WORK_REQUEST'&&intent.action_eligible===true){
  let read=null;
  try{read=await readWork({session,conversationId})}catch{}
  if(read?.status!=='OWNER_CHAT_WORK_INTAKE_READBACK'||
     read.owner_id!==session.user_id||read.conversation_id!==conversationId||
     read.installation_authorized!==false||
     read.production_changed!==false||
     !Array.isArray(read.items))
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_READBACK_UNAVAILABLE'});
  const entries=read.items.filter(x=>x.request_id===requestId&&
    x.source_ref===verified.source_ref);
  if(entries.length!==1)
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_INTAKE_PENDING'});
  const item=entries[0];
  if(item.status!=='INVESTIGATED_SCOPED')
   return Object.freeze({...common,status:item.status==='PENDING'||item.status==='CLAIMED'?
    'CHAT_WORK_ENGINEERING_INVESTIGATION_PENDING':'CHAT_WORK_ENGINEERING_SOURCE_UNQUALIFIED',
    handoff_status:item.status});
  const selected=Array.isArray(item.selected_source_refs)?
   item.selected_source_refs:[];
  const chains=Array.isArray(item.work_chain)?item.work_chain:[];
  if(selected.length!==1||chains.length!==1||
     chains[0].source_ref!==selected[0]||
     !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/.test(selected[0])||
     !workId(chains[0].original_work_id)||
     chains[0].shift_id!==item.shift_id)
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_SOURCE_UNQUALIFIED'});
  // Avoid attaching a new, unrelated Chat feature request to an older
  // authorized repair merely because both contain the word "build".
  const exactSource=verified.text.includes(selected[0])||
    verified.text.includes(chains[0].original_work_id)||
    new RegExp('\\b(?:issue|job|repair)\\s*#?'+selected[0].split('/').at(-1)+'\\b','i')
     .test(verified.text);
  if(!exactSource)
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_SOURCE_NOT_EXPLICIT',
    capability_gap:true,diagnosed_source_ref:selected[0],
    message:'This build request does not identify the current admitted original. Reality must not reuse an unrelated repair.'});
  const stage=chains[0].current_evidence_stage;
  if(stage==='ORIGINAL_SETTLEMENT_RECEIPT_PRESENT')
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_ALREADY_SETTLED',
    original_work_id:chains[0].original_work_id,stage});
  if(stage==='CORRECTIVE_CI_PASSED_AWAITING_EXACT_INSTALL_GATE')
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_TESTED_AWAITING_EXACT_APPROVAL',
    original_work_id:chains[0].original_work_id,stage,
    independent_run_url:chains[0].corrective_ci_url||null});
  if(!['CORRECTIVE_MODEL_DRAFT_AWAITING_INDEPENDENT_CI',
        'CORRECTIVE_CANDIDATE_STAGED_INDEPENDENT_CI_PENDING']
       .includes(stage))
   return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_PREPARING_DRAFT',
    original_work_id:chains[0].original_work_id,stage});
  return Object.freeze({...common,status:'CHAT_WORK_ENGINEERING_SCOPED_CI_READY',
    action_eligible:true,original_work_id:chains[0].original_work_id,
    shift_id:item.shift_id,source_ref:verified.source_ref,
    original_source_ref:selected[0],stage});
 }
 if(!intent.capability_id)
  return Object.freeze({...common,status:'CHAT_WORK_CAPABILITY_GAP',
   capability_gap:true,reviewed_not_executed:true});
 if(intent.capability_id==='owner-employee-shift-briefing'){
  try{
   const briefing=await readShift({session});
   return Object.freeze({...common,
    status:'CHAT_WORK_READ_ONLY_EVIDENCE_AVAILABLE',
    briefing,capability_gap:false,work_receipt_verified:false});
  }catch{
   return Object.freeze({...common,status:'CHAT_WORK_EXECUTOR_READBACK_UNAVAILABLE'});
  }
 }
 if(intent.capability_id!=='governed-original-discovery'||
    intent.kind!=='WORK_REQUEST'||intent.action_eligible!==true)
  return Object.freeze({...common,status:'CHAT_WORK_NOT_EXECUTABLE'});
 let eligible=null;
 try{eligible=await readBuild({session})}catch{
  return Object.freeze({...common,status:'CHAT_WORK_EXECUTOR_READBACK_UNAVAILABLE'});
 }
 const sameConversation=eligible?.original_conversation_id===conversationId;
 if(sameConversation&&eligible?.queued===true&&workId(eligible.original_work_id))
  return Object.freeze({...common,status:'ORIGINAL_JOB_ALREADY_QUEUED',
   original_work_id:eligible.original_work_id});
 const ready=sameConversation&&eligible?.phase==='NOT_QUEUED'&&
  eligible.eligible_for_investigation===true&&workId(eligible.original_work_id);
 if(ready)return Object.freeze({...common,
  status:'EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE',
  action_eligible:true,original_work_id:eligible.original_work_id});
 return Object.freeze({...common,status:'CHAT_WORK_NEEDS_A_VERIFIED_EXECUTION_ADAPTER',
  capability_gap:true});
}
export async function authorizeSavedChatExistingOriginal({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,queue=queueOwnerGovernedBuild
}={}){
 const state=await inspect({session,conversationId,requestId,messages});
 if(state.status!=='EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE'||
    state.action_eligible!==true||
    state.capability_id!=='governed-original-discovery')
  fail('CHAT_WORK_NO_VERIFIED_ELIGIBLE_ORIGINAL',409);
 const response=await queue({session,expectedOriginalWorkId:state.original_work_id});
 if(response?.original_work_id!==state.original_work_id||
    response?.installation_authorized!==false||
    response?.production_changed===true)
  fail('CHAT_WORK_EXECUTOR_OWNER_RECEIPT_UNVERIFIED',503);
 return Object.freeze({status:response.worker_dispatch_started===true?
   'CHAT_WORK_ORIGINAL_DISCOVERY_DISPATCHED':
   'CHAT_WORK_ORIGINAL_DISCOVERY_QUEUED_BLOCKED',
  original_work_id:state.original_work_id,request_id:requestId,
  source_ref:state.source_ref,
  capability_id:'governed-original-discovery',
  queue_id:response.queue_id||null,
  dispatch_requested:response.worker_dispatch_started===true,
  worker_execution_verified:false,execution_started:false,
  installation_authorized:false,production_changed:false});
}


// Explicit saved owner build instruction -> SAME already-governed original's
// pre-existing corrective CI broker. This endpoint never creates a job or
// shift, writes production, or installs a candidate. The broker performs its
// own independent service-role/current-source/one-shot provider checks.
export async function continueVerifiedChatEngineering({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,
 dbFactory=shiftDatabase,callRpc=shiftRpc,
 continueCI=continueRileyCorrectiveModelIntoIndependentCI,
 env=process.env,fetchImpl=fetch
}={}){
 sourceTurn({session,conversationId,requestId,messages});
 const eligibility=await inspect({session,conversationId,requestId,messages});
 if(eligibility?.status!=='CHAT_WORK_ENGINEERING_SCOPED_CI_READY'||
    eligibility.action_eligible!==true||
    eligibility.capability_id!=='governed-original-engineering'||
    !workId(eligibility.original_work_id)||!validUuid(eligibility.shift_id)||
    eligibility.source_ref!==messages.find(x=>x.role==='user'&&
      x.request_id===requestId)?.source_ref)
  fail('CHAT_WORK_ENGINEERING_NO_VERIFIED_CURRENT_ORIGINAL',409);
 if(env.VERCEL_ENV!=='preview')fail('CHAT_WORK_ENGINEERING_PREVIEW_ONLY',403);
 const db=dbFactory(env);
 if(!db?.strictSecrets||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    db.url!==session.config?.url)
  fail('CHAT_WORK_ENGINEERING_OWNER_PROJECT_MISMATCH',403);
 // Check the specific existing source against the current owner-warranted
 // graph BEFORE invoking a broker which is already independently fenced.
 const graph=await callRpc(db,'reality_read_current_shift_execution_graph_v1',
  {},{fetchImpl});
 const engineering=graph?.jobs?.filter(j=>
   j.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
   !['SETTLED','ALREADY_SETTLED'].includes(j.phase))||[];
 const same=engineering.filter(j=>
   j.original_work_id===eligibility.original_work_id&&
   j.source_ref===eligibility.original_source_ref);
 if(graph?.status!=='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'||
    graph.owner_id!==session.user_id||
    graph.shift_id!==eligibility.shift_id||
    graph.installation_authorized!==false||
    graph.production_changed!==false||
    engineering.length!==1||same.length!==1)
  fail('CHAT_WORK_ENGINEERING_CURRENT_WARRANT_DRIFT',409);
 const result=await continueCI({db,env,fetchImpl});
 if(result?.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.new_shift_started!==false||
    result.original_work_id!=null&&result.original_work_id!==eligibility.original_work_id)
  fail('CHAT_WORK_ENGINEERING_PROVIDER_ORIGINAL_MISMATCH',503);
 const candidateStarted=result?.status==='CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI'||
   result?.status==='CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED';
 return Object.freeze({
  status:candidateStarted?'CHAT_WORK_ENGINEERING_CI_DISPATCH_VERIFIED':
   'CHAT_WORK_ENGINEERING_CI_NOT_YET_VERIFIED',
  broker_status:result?.status||'UNVERIFIED',
  original_work_id:eligibility.original_work_id,
  shift_id:eligibility.shift_id,
  request_id:requestId,source_ref:eligibility.source_ref,
  candidate_started:result?.status==='CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI',
  independent_ci_verified:result?.independent_ci_verified===true,
  independent_run_url:result?.independent_run_url||null,
  execution_started:candidateStarted,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false
 });
}

// A signed, direct Chat request is sufficient for isolated build admission.
export async function authorizeSavedChatNewDevelopment({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,admit=admitOwnerNewDevelopment
}={}){
 const source=sourceTurn({session,conversationId,requestId,messages});
 const review=await inspect({session,conversationId,requestId,messages});
 if(review?.status==='CHAT_WORK_NEW_DEVELOPMENT_ALREADY_ADMITTED'&&
    workId(review.original_work_id))
  return Object.freeze({...review,request_id:requestId,
   source_ref:source.source_ref,execution_started:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false});
 if(review?.status!=='CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE'||
    review.action_eligible!==true||
    review.capability_id!=='governed-chat-new-development'||
    typeof review.source_quote!=='string'||
    typeof review.objective!=='string')
  fail('CHAT_WORK_NEW_DEVELOPMENT_NO_SIGNED_INSTRUCTION',409);
 const result=await admit({session,conversationId,requestId,messages,
  sourceQuote:review.source_quote,expectedObjective:review.objective});
 if(result?.status!=='CHAT_WORK_NEW_DEVELOPMENT_DURABLY_ADMITTED'||
    result.request_id!==requestId||
    result.source_ref!==source.source_ref||
    !workId(result.original_work_id)||
    result.installation_authorized!==false||
    result.production_changed!==false||result.new_shift_started!==false)
  fail('CHAT_WORK_NEW_DEVELOPMENT_ADMISSION_RECEIPT_UNVERIFIED',503);
 return result;
}


// One signed Chat instruction -> exactly one installed governed work adapter.
// The model chooses only among registered capabilities; it cannot mint a
// warrant. Reuse the SAME inspection in the chosen adapter, instead of
// classifying a source twice and drifting between inspection and admission.
// This action never grants installation or starts another employee shift.
export async function processSignedSavedChatWork({
 session,conversationId,requestId,messages,
 inspect=inspectSavedChatWork,
 admitNew=authorizeSavedChatNewDevelopment,
 readNew=readOwnerNewDevelopment,
 queueOriginal=authorizeSavedChatExistingOriginal,
 continueEngineering=continueVerifiedChatEngineering
}={}){
 const signed=sourceTurn({session,conversationId,requestId,messages});
 const args={session,conversationId,requestId,messages};
 const eligible=await inspect(args);
 if(!eligible||typeof eligible.status!=='string')
  fail('CHAT_WORK_PROCESS_INSPECTION_UNVERIFIED',503);
 if(eligible.source_ref!==signed.source_ref||
    eligible.request_id!==requestId||
    eligible.installation_authorized!==false||
    eligible.production_changed!==false)
  fail('CHAT_WORK_PROCESS_SOURCE_OR_AUTHORITY_MISMATCH',503);
 const inspection=async()=>eligible;
 if(eligible.status==='CHAT_WORK_NEW_DEVELOPMENT_ELIGIBLE'&&
    eligible.capability_id==='governed-chat-new-development'&&
    eligible.action_eligible===true){
  const admitted=await admitNew({...args,inspect:inspection});
  if(admitted?.status!=='CHAT_WORK_NEW_DEVELOPMENT_DURABLY_ADMITTED'||
     !workId(admitted.original_work_id)||
     admitted.request_id!==requestId||
     admitted.source_ref!==signed.source_ref||
     admitted.installation_authorized!==false||
     admitted.production_changed!==false||
     admitted.new_shift_started!==false)
   fail('CHAT_WORK_PROCESS_ADMISSION_RECEIPT_UNVERIFIED',503);
  // Independent owner-scoped service readback. A failed read MUST NOT
  // cause a second admission attempt or erase the committed source identity.
  let read=null;
  try{read=await readNew({session,conversationId})}catch{}
  const matches=read?.status==='OWNER_CHAT_NEW_DEVELOPMENT_READBACK'&&
    read.owner_id===session.user_id&&
    read.conversation_id===conversationId&&
    read.installation_authorized===false&&
    read.production_changed===false&&
    Array.isArray(read.items)?
   read.items.filter(x=>x.request_id===requestId&&
    x.source_ref===signed.source_ref&&
    x.original_work_id===admitted.original_work_id&&
    x.installation_authorized===false&&
    x.production_changed===false):[];
  return Object.freeze({
   status:matches.length===1?
    'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_AND_READ_BACK':
    'CHAT_WORK_NEW_DEVELOPMENT_ADMITTED_READBACK_PENDING',
   capability_id:'governed-chat-new-development',
   request_id:requestId,source_ref:signed.source_ref,
   original_work_id:admitted.original_work_id,
   development_phase:matches.length===1?matches[0].phase:
    admitted.development_phase,
   admission_receipt_verified:true,independent_readback_verified:matches.length===1,
   work_execution_verified:false,execution_started:false,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  });
 }
 if(eligible.status==='CHAT_WORK_ENGINEERING_SCOPED_CI_READY'&&
    eligible.capability_id==='governed-original-engineering'&&
    eligible.action_eligible===true)
  return await continueEngineering({...args,inspect:inspection});
 if(eligible.status==='EXISTING_ORIGINAL_DISCOVERY_ELIGIBLE'&&
    eligible.capability_id==='governed-original-discovery'&&
    eligible.action_eligible===true)
  return await queueOriginal({...args,inspect:inspection});
 // Existing work, conversational questions and missing capabilities cause
 // no writes. Never infer authority from a model explanation.
 return Object.freeze({...eligible,request_id:requestId,
  source_ref:signed.source_ref,
  execution_started:false,installation_authorized:false,
  production_changed:false,new_shift_started:false});
}
