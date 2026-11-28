// Reality's proportional, READ-ONLY Chat lane: existing Signal Cleaner
// -> existing cognitive model gateway. Read-only intelligence is permitted
// without creating another shift, job, installation or authority engine.
// Final saved-reply authority remains the existing atomic owner/goal CAS
// in /api/reality/personal-chat. This module has NO provider write tools.
import {buildGovernedChatSignal}
 from './reality-governed-fragmented-signal-cleaner-v0.1.js';
import {runRealityCognitiveRuntime}
 from './reality-cognitive-runtime-v1.0.js';
import {extractReliabilityClaims} from './reality-reliability-claim-extraction-v0.1.js';
import {compileFinalOutputClaimAssessment,summarizeOutputClaimAssessment,requiresSourceRenderedOperationalReply} from './reality-final-chat-publication-proof-v0.1.js';

// Reuse only the already authenticated, structured current operational
// observations. This is a bounded comparison input, not another truth ledger.
// A missing field or missing receipt remains unknown.
function operationalClaimSnapshot({worldId,ownerContext,horizon}){
 const facts=[],refs=new Set();
 const add=(prefix,object,ref)=>{
  if(!object||typeof ref!=='string'||!ref)return;
  refs.add(ref);
  for(const [key,value] of Object.entries(object)){
   if(!['string','number','boolean'].includes(typeof value)||String(value).length>600)continue;
   facts.push({key:prefix+key,value,world_id:worldId,evidence_ref:ref});
  }
 };
 const shift=ownerContext?.currently_authorized_shift;
 if(shift?.owner_shift_authorization_recorded===true&&UUID.test(shift.active_owner_shift_id||''))
  add('shift.',{active_owner_shift_id:shift.active_owner_shift_id,shift_status:shift.shift_status,
   owner_shift_authorization_recorded:true},'reality:employee-shift:'+shift.active_owner_shift_id);
 for(const o of horizon?.present?.obligations||[]){
  if(!UUID.test(o.shift_id||'')||!/^work:[a-f0-9]{32}$/.test(o.original_work_id||'')||
   !/^sha256:[a-f0-9]{64}$/.test(o.guard_receipt_sha256||'')||o.existing_shift_authorized!==true)continue;
  add('original.'+o.original_work_id+'.',o,o.guard_receipt_sha256);
  if(o.active_release_observation?.approval_receipt_sha256)
   add('release.'+o.original_work_id+'.',o.active_release_observation,o.active_release_observation.approval_receipt_sha256);
  for(const e of o.current_events||[])if(UUID.test(e.event_id||''))
   add('event.'+e.event_id+'.',e,e.event_id);
 }
 for(const s of horizon?.past?.independent_original_settlements||[])
  if(UUID.test(s.receipt_id||''))
   add('settlement.'+s.original_work_id+'.',s,s.receipt_id);
 return {world_id:worldId,facts:facts.slice(0,100),obligations:[],authorities:[],receipts:[],
  source_receipt_ids:[...refs]};
}

// Questions about capability or feasibility are conversation, not execution.
// The independently authenticated work-intake adapter still classifies saved
// instructions and enforces the exact approval gate; Chat must answer without
// borrowing that adapter's authority or waiting for full operational replay.
const ACTION=/^(?:(?:reality[, :]+|please\s+|go ahead and\s+|i (?:want|need) you to\s+){0,2})(?:start|run|execute|install|deploy|merge|publish|send|transfer|delete|pay|purchase|authorize|approve|build|code|fix|upgrade|schedule|create)\b/i;
// Saved, explicit continuation of existing authorized work goes to the
// signed work adapter; ordinary discussion remains read-only.
const SIGNED_EXISTING_SHIFT_ACTION=/^(?:reality\s*[,.:]?\s*)?(?:please\s+)?(?:continue|resume|finish)\s+.{0,140}(?:shift|existing|original)/i;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SOURCE=/^supabase:reality_chat_messages:[0-9a-f-]{36}$/i;
const fail=code=>{throw Error('CHAT_READ_ONLY_'+code)};

// The read-only model has no execution tools. Treat claims of actions taken
// during *this* Chat turn as unsupported unless an independent provider receipt
// is explicitly returned by a separate work adapter. Historical quotations and
// suggestions are not authority. Reconcile the saved owner shift before any
// model-authored claim that the owner must start or authorize a new shift.
export function reconcileReadOnlyOperationalAnswer({answer,ownerContext,operationalTimeHorizon=null}={}){
 const a=String(answer||'');
 const s=ownerContext?.currently_authorized_shift;
 const current=operationalTimeHorizon?.present?.obligations||[];
 const exactShifts=[...new Set(current.filter(o=>o.existing_shift_authorized===true&&UUID.test(o.shift_id||'')).map(o=>o.shift_id))];
 const active=s?.owner_shift_authorization_recorded===true&&
  s?.shift_start_command_already_satisfied===true&&
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.shift_status)&&
  UUID.test(s.active_owner_shift_id||'')?
  s.active_owner_shift_id:exactShifts.length===1?exactShifts[0]:null;
 const unsupportedRun=
  /\b(?:sandbox(?:ed)? (?:deployment )?simulation|simulation results|independent (?:acceptance )?tests?|test assertions|production installation)\b[^.!?\n]{0,150}\b(?:completed|passed|verified|executed|succeeded|successful|activated|installed|deployed)\b/i.test(a)||
  /\b(?:completed|passed|verified|executed|succeeded|successful|activated|installed|deployed)\b[^.!?\n]{0,150}\b(?:sandbox(?:ed)? (?:deployment )?simulation|simulation results|independent (?:acceptance )?tests?|test assertions|production installation)\b/i.test(a);
 const unsupportedPromise=
  /\b(?:I|we|Reality)\s+(?:will now|am now|are now|have now)\s+(?:prepare and )?(?:run|execute|deploy|install|activate|simulate|initiate)\b/i.test(a);
 const unsupportedApproval=
  /\b(?:owner |installation |production )?approval\s+(?:has been|was|is)\s+(?:recorded|verified|granted|received|confirmed)\b/i.test(a);
 const contradictedShift=active!==null&&
  /\b(?:no|not an?)\s+(?:authorized\s+)?(?:active\s+)?(?:shift|owner shift)\s+(?:exists|is available|is running|has been authorized)\b/i.test(a);
 const unnecessaryShift=active!==null&&
  /\b(?:start|schedule|authorize|approve)\s+(?:an?\s+)?(?:new\s+)?(?:authorized\s+)?shift\b/i.test(a)&&
  /\b(?:must|need|require|first|next step|formal)\b/i.test(a);
 if(!unsupportedRun&&!unsupportedPromise&&!unsupportedApproval&&
    !contradictedShift&&!unnecessaryShift)
  return Object.freeze({answer:a,disposition:'CONVERSATIONAL_CLAIMS_UNCHANGED'});
 const exact=current.length===1?current[0]:null;
 const currentTruth=exact?' Current original '+exact.original_work_id+' is at Continuity revision '+exact.continuity_revision+'. '+
  (exact.active_release_observation?'The recorded release is '+exact.active_release_observation.release_sha+' (approval receipt '+exact.active_release_observation.approval_receipt_sha256+'). ':'')+
  (exact.current_events?.some(e=>e.interpretation==='WORKER_FINISHED_EVIDENCE_NOT_ACCEPTED')?'A worker invocation finished but its evidence is not yet accepted. ':'')+
  'Current next action: '+exact.operational_next_action+'.': '';
 const truth=active?
  'The existing owner-authorized shift '+active+
  ' is open. It does not need a second start or shift approval for work already covered by its warrant.':
  'I cannot verify an active signed shift from the owner-scoped evidence available to this Chat turn.';
 return Object.freeze({
  answer:truth+currentTruth+' This Chat response did not run a sandbox simulation, install code, record an approval event or independently verify an operational result. '+
   'Existing owner permission and source-backed work should be reconciled by the governed executor against the exact scoped warrant and any tested installation artifact. '+
   'I can explain the next evidence-backed action, but must not claim it has executed without a provider and ledger receipt.',
  disposition:'UNSUPPORTED_OPERATIONAL_CLAIM_REPLACED_WITH_OWNER_SCOPED_TRUTH'
 });
}
export function isProportionalReadOnlyChat({message,goalCommand=null,publicResearch=false}={}){
 return goalCommand==null&&publicResearch!==true&&
  typeof message==='string'&&message.trim().length>0&&
  !ACTION.test(message.trim())&&
  !SIGNED_EXISTING_SHIFT_ACTION.test(message.trim());
}
// Only the acknowledgement uses this lane. The saved authenticated user
// turn still enters the original signed work inbox; no worker authority is added.
export function isExistingWorkContinuationReply({message,goalCommand=null,publicResearch=false}={}){
 return goalCommand==null&&publicResearch!==true&&typeof message==='string'&&
  SIGNED_EXISTING_SHIFT_ACTION.test(message.trim());
}
export function prepareExistingWorkContinuationReply({ownerId,conversationId,requestId,sourceRef,handoff=null,shift=null}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(conversationId||'')||
    !UUID.test(requestId||'')||!SOURCE.test(sourceRef||''))fail('TRUSTED_CURRENT_TURN_REQUIRED');
 const valid=handoff?.status==='OWNER_CHAT_WORK_INTAKE_READBACK'&&
  handoff.source==='AUTHENTICATED_OWNER_SCOPED_SERVICE_READBACK'&&
  handoff.owner_id===ownerId&&handoff.conversation_id===conversationId&&
  handoff.new_shift_started===false&&handoff.installation_authorized===false&&
  handoff.production_changed===false&&Array.isArray(handoff.items);
 const matches=valid?handoff.items.filter(x=>x.request_id===requestId&&x.source_ref===sourceRef&&
  x.execution_authorized_by_chat===false&&x.installation_authorized===false&&x.production_changed===false):[];
 const item=matches.length===1?matches[0]:null;
 const descriptions={
  PENDING:'Your instruction is in the existing work inbox, waiting for the worker to claim it.',
  CLAIMED:'The existing worker has claimed your instruction. Its result is not verified yet.',
  INVESTIGATED_SCOPED:'The worker has recorded a scoped investigation. That is not a completed repair.',
  NEEDS_AUTHORIZED_SCOPE:'The worker recorded a scope restriction. The exact missing permission has not been established by this reply.',
  CONVERSATION_ONLY:'The saved instruction was classified as conversation, not executable work.',
  PROVIDER_UNVERIFIED:'The worker could not verify its provider evidence. No completed work is established.'
 };
 const current=item&&Object.prototype.hasOwnProperty.call(descriptions,item.status)?item:null;
 let answer=current?descriptions[current.status]:'Your instruction is saved. I could not confirm its worker handoff yet.';
 if(shift?.owner_shift_authorization_recorded===true&&UUID.test(shift.active_owner_shift_id||'')&&
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(shift.shift_status))
  answer+=' Your existing shift remains authorized; this instruction does not require starting it again.';
 answer+=' This reply does not install anything or certify a completed job.';
 return Object.freeze({answer,output_claim_assessment:null,work_handoff:current?{
  status:current.status,source_ref:sourceRef,request_id:requestId,
  shift_id:UUID.test(current.shift_id||'')?current.shift_id:null,
  execution_authorized_by_chat:false,installation_authorized:false,production_changed:false
 }:null,execution_authorized:false,installation_authorized:false,external_actions_authorized:false});
}
// The existing owner-scoped fallback is also the deterministic publication
// renderer for operational requests. No model-authored bytes are appended.
function renderSourceBoundOperationalReply({snapshot,operationalTimeHorizon,claimAssessment}){
   // Do not repeat unverified model prose. A source-attested status can
   // still be reported from the exact existing owner readback, not from
   // the failed extractor. The original draft's coverage remains unknown.
   const fact=snapshot.facts.find(f=>f.key==='shift.shift_status');
   const id=snapshot.facts.find(f=>f.key==='shift.active_owner_shift_id');
   const statusVerified=fact&&id&&fact.evidence_ref===id.evidence_ref&&
    UUID.test(id.value||'')&&['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(fact.value);
   let released='I cannot independently establish the operational assertions in my draft. I have withheld it. ';
   if(statusVerified){
    const statusText={QUEUED:'queued',RUNNING:'running',AWAITING_EXACT_ORIGINAL_WORK:'awaiting exact original work'}[fact.value];
    released+='The authenticated shift record '+id.value+' is '+statusText+'. ';
    claimAssessment=Object.freeze({...claimAssessment,released_source_fact_refs:[fact.evidence_ref],
     released_source_facts:[fact,id].map(f=>({key:f.key,value:f.value,evidence_ref:f.evidence_ref}))});
   }
   // A canonical guard may survive even when the separate shift briefing
   // is unavailable. Render only the existing exact guarded facts; never
   // infer a shift status or outcome from an original's admission.
   const originals=(operationalTimeHorizon?.present?.obligations||[]).slice(0,3);
   const recordedFacts=[];
   for(const o of originals){
    if(o.existing_shift_authorized!==true||o.read_only!==true||
       o.execution_authorized!==false||o.installation_authorized!==false||
       o.production_changed!==false||!UUID.test(o.shift_id||'')||
       !/^work:[a-f0-9]{32}$/.test(o.original_work_id||'')||
       !/^sha256:[a-f0-9]{64}$/.test(o.guard_receipt_sha256||'')||
       !Number.isSafeInteger(o.continuity_revision)||o.continuity_revision<1)continue;
    const prefix='original.'+o.original_work_id+'.';
    const fields=['shift_id','original_work_id','continuity_revision','existing_shift_authorized'];
    if(/^[A-Z][A-Z0-9_]{2,119}$/.test(o.operational_next_action||''))fields.push('operational_next_action');
    const rows=fields.map(key=>snapshot.facts.find(f=>f.key===prefix+key&&f.value===o[key]&&f.evidence_ref===o.guard_receipt_sha256));
    if(rows.some(f=>!f))continue;
    released+='The current guarded original '+o.original_work_id+' is at Continuity revision '+o.continuity_revision+
     ' under existing authorized shift '+o.shift_id+'. ';
    if(fields.includes('operational_next_action'))
     released+='The recorded next action is '+o.operational_next_action.toLowerCase().replaceAll('_',' ')+'. ';
    recordedFacts.push(...rows.map(f=>({key:f.key,value:f.value,evidence_ref:f.evidence_ref})));
   }
   if(recordedFacts.length){
    const rows=[...(claimAssessment.released_source_facts||[]),...recordedFacts];
    claimAssessment=Object.freeze({...claimAssessment,released_source_facts:rows,
     released_source_fact_refs:[...new Set(rows.map(f=>f.evidence_ref))]});
   }
   released+='No new work, installation or original-job completion is established by this reply.';
 return {released,claimAssessment};
}

export async function generateProportionalReadOnlyReply({
 message,conversationId,requestId,ownerId,sourceRef,
 verifiedPriorTurns=[],worldlineId,ownerContext=null,
 verifiedUniverseObservations=[],operationalTimeHorizon=null,apiKey,model='gpt-4.1-mini',
 runtime=runRealityCognitiveRuntime,fetchImpl=fetch,recordClaimAssessment=null
}={}){
 if(typeof message!=='string'||!message.trim()||
    !UUID.test(conversationId||'')||!UUID.test(requestId||'')||
    !UUID.test(ownerId||'')||!SOURCE.test(sourceRef||'')||
    typeof apiKey!=='string'||!apiKey.trim()||
    typeof runtime!=='function'||!Array.isArray(verifiedPriorTurns)||
    !Array.isArray(verifiedUniverseObservations)||
    verifiedUniverseObservations.length>150)
  fail('TRUSTED_CURRENT_TURN_REQUIRED');
 const prior=verifiedPriorTurns.filter(t=>
  ['user','assistant'].includes(t?.role)&&
  typeof t.text==='string'&&
  t.text.length<=12000&&
  UUID.test(t.request_id||'')&&
  SOURCE.test(t.source_ref||'')).slice(-18).map(t=>({
   role:t.role,text:t.text,source_ref:t.source_ref,
   request_id:t.request_id
  }));
 const signal=buildGovernedChatSignal({message,observedAt:new Date().toISOString()});
 const result=await runtime({
  message,governedSignal:signal,
  systemContext:{
   conversation_id:conversationId,
   worldline_id:worldlineId,
   current_owner_request_id:requestId,
   exact_authenticated_user_source_ref:sourceRef,
   current_message_authenticated:true,
   conversation_continuity:{
    status:'AUTHENTICATED_SAVED_CONVERSATION_HISTORY',
    source:'OWNER_RLS_READBACK',
    source_message_count:prior.length,
    recent_exchanges:prior
   },
   owner_business_context:ownerContext,
   operational_time_horizon:operationalTimeHorizon,
   governance_proportionality:{
    mode:'READ_ONLY_CONVERSATION',
    answer_and_planning_allowed_without_new_job_or_shift:true,
    missing_worker_authorization_does_not_forbid_a_chat_answer:true,
    existing_work_authority_not_extended:true,
    external_actions_authorized:false,
    execution_authorized:false,
    installation_authorized:false,
    source_independent_verification_not_inferred_from_model:true
   }
  },
  universeEntries:verifiedUniverseObservations.slice(0,90),
  cognitionEffort:'CONVERSATION',model,apiKey,
  publicResearchEnabled:false
 });
 if(result?.mode!=='FAST'||result?.authority_granted!==false||
    result?.execution_authorized!==false||
    typeof result.answer!=='string'||!result.answer.trim()||
    result.answer.length>12000)
  fail('MODEL_OUTPUT_OR_EXECUTION_BOUNDARY_UNVERIFIED');
 const reconciled=reconcileReadOnlyOperationalAnswer({answer:result.answer,ownerContext,operationalTimeHorizon});
 let released=reconciled.answer,claimAssessment=null;
 // Only owner-operational status turns need the extra bounded extraction.
 // Greetings/advice without operational context stay on the ordinary fast lane.
 const strictOperational=requiresSourceRenderedOperationalReply(message);
 const operational=strictOperational||Boolean(ownerContext?.currently_authorized_shift||
  operationalTimeHorizon?.present?.obligations?.length);
 if(operational&&(strictOperational||reconciled.disposition==='CONVERSATIONAL_CLAIMS_UNCHANGED')){
  const snapshot=operationalClaimSnapshot({worldId:worldlineId,ownerContext,horizon:operationalTimeHorizon});
  const draft=strictOperational?result.answer:released;
  try{
   const extraction=await extractReliabilityClaims({modelOutput:draft,worldId:worldlineId,
    snapshot,apiKey,model,fetchImpl,allowEmptyEvidence:true});
   claimAssessment=compileFinalOutputClaimAssessment({answer:draft,candidate:extraction.candidate,
    snapshot,review:{unassessed_claims:extraction.unadjudicated_claims},
    extractionStatus:extraction.extraction_status});
   // An explicitly operational extraction with no assessed assertion is
   // not a clean bill of health. Withhold this candidate without treating
   // empty extraction as a false claim or as verified semantic coverage.
   const missingOperationalCoverage=extraction.candidate.scope==='OPERATIONAL'&&
    claimAssessment.status==='CLAIM_COVERAGE_UNVERIFIED';
   if(strictOperational){
    // Even a falsely CONVERSATIONAL or partially correct extraction does not
    // permit free-form operational assertions. Retain the model assessment
    // as diagnostic evidence, then publish only exact source facts.
    claimAssessment=Object.freeze({...claimAssessment,publication_contract:'SOURCE_RENDERED_OPERATIONAL_REPORT'});
    ({released,claimAssessment}=renderSourceBoundOperationalReply({snapshot,operationalTimeHorizon,claimAssessment}));
   }else if(claimAssessment.unsupported_assertion_detected||missingOperationalCoverage)
    released='The available owner-scoped evidence does not establish the operational assertion in my draft. I have withheld that assertion; the actual outcome remains unverified.';
  }catch(error){
   // Preserve only allowlisted diagnostic categories, not model/provider
   // prose, credentials, or arbitrary error bodies. The draft stays withheld.
   const rawCode=String(error?.message||'');
   const failureCode=/^RELIABILITY_EXTRACTION_(?:PREREQUISITES|PROVIDER_ERROR_[1-5][0-9]{2}|MALFORMED_OUTPUT|INVALID_SHAPE|OVERSIZED|QUOTE_NOT_IN_MODEL_OUTPUT|ASSERTION_INVALID)$/.test(rawCode)?
    rawCode:['TimeoutError','AbortError'].includes(error?.name)?'RELIABILITY_EXTRACTION_TIMEOUT':
    'RELIABILITY_EXTRACTION_OR_ASSESSMENT_UNCLASSIFIED_FAILURE';
   claimAssessment=Object.freeze({...compileFinalOutputClaimAssessment({
    answer:draft,snapshot,extractionStatus:'EXTRACTION_UNAVAILABLE'}),extraction_failure_code:failureCode,
    ...(strictOperational?{publication_contract:'SOURCE_RENDERED_OPERATIONAL_REPORT'}:{})});
   ({released,claimAssessment}=renderSourceBoundOperationalReply({snapshot,operationalTimeHorizon,claimAssessment}));
  }
 }
 // The server adapter supplies the existing durable ledger writer. Pure
 // controlled calls can still inspect the uncommitted assessment.
 if(claimAssessment&&typeof recordClaimAssessment==='function'){
  try{
   const receipt=await recordClaimAssessment({answer:released,assessment:claimAssessment});
   if(receipt?.readback_verified!==true||!receipt.ledger_receipt_id)
    fail('CLAIM_LEDGER_READBACK_REQUIRED');
   claimAssessment=receipt;
  }catch{
   // An unavailable secondary audit write must not silence authenticated
   // source facts. Do not release the unverified model draft.
   const snapshot=operationalClaimSnapshot({worldId:worldlineId,ownerContext,horizon:operationalTimeHorizon});
   ({released,claimAssessment}=renderSourceBoundOperationalReply({snapshot,operationalTimeHorizon,claimAssessment}));
   released+=' The separate output-audit receipt is unavailable.';
  }
 }
 return Object.freeze({
  status:'READ_ONLY_AUTHENTICATED_MODEL_REPLY_PREPARED',
  answer:released,
  output_claim_assessment:summarizeOutputClaimAssessment(claimAssessment),
  model:result.model||model,
  semantic_correctness_independently_verified:false,
  independent_business_outcome_verified:false,
  external_actions_authorized:false,
  execution_authorized:false,installation_authorized:false
 });
}
