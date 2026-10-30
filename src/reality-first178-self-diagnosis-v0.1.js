// Reality's own read-only failure triage for the SAME original customer #178.
// No model is authorized to turn analysis into a new claim, install or settlement.
// Canonical persisted owner scope wins over a browser-selected conversation.
import {resolveOriginalFirst178OwnerQueue}
 from './reality-first178-single-action-v0.1.js';
import {original178OwnerApprovalView}
 from './reality-first178-live-owner-completion-v0.1.js';
import {validUuid}
 from './reality-private-chat-store-v0.1.js';

const ORIGINAL='work:9b9578b3c65427589c4c6da68fe0fc87';
const fixed=Object.freeze({read_only:true,auto_retry_allowed:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,owner_approval_inferred:false});
const safe=x=>typeof x==='string'&&/^[A-Z0-9_]{4,150}$/.test(x)?x:
 'CANONICAL_OWNER_READBACK_UNRESOLVED';
export function classifyFirst178Diagnosis({original,view,viewError,
 selectedConversationId=null}={}){
 const same=validUuid(selectedConversationId)?
  selectedConversationId===original?.conversation_id:null;
 if(!original||original.original_work_id!==ORIGINAL||
    original.issue_number!==178||!validUuid(original.conversation_id))
  return Object.freeze({...fixed,status:'CANONICAL_ORIGINAL_NOT_VERIFIED',
   finding:'No canonical, owner-verified original job was returned.',
   proposed_next_step:'Investigate original-job ownership and queue persistence without creating new work.'});
 const source=Object.freeze({
  original_work_id:ORIGINAL,queue_id:original.queue_id,
  selected_conversation_matches_original:same,
  original_conversation_verified:true,
 });
 if(viewError)return Object.freeze({...fixed,...source,
  status:'ORIGINAL_SCOPE_READBACK_BLOCKED',
  failure_code:safe(String(viewError?.message||'')),
  finding:same===false?
   'The browser is inspecting a different conversation than the persisted original job. Canonical readback also needs reconciliation.':
   'The original job exists, but its authoritative goal/checkpoint could not be independently reconstructed.',
  proposed_next_step:'Reconcile the original owner goal transition, Continuity lineage and queue source before any retry.'});
 if(view?.original_work_id!==ORIGINAL||
    view?.installation_authorized!==false||
    view?.original_job_completed!==false)
  return Object.freeze({...fixed,...source,status:'ORIGINAL_STATE_UNVERIFIED',
   finding:'Live original-job readback did not satisfy the canonical status contract.',
   proposed_next_step:'Reconcile the conflicting readbacks; do not infer success.'});
 if(view.status==='EXHAUSTED_CORRECTION_ATTEMPTS')
  return Object.freeze({...fixed,...source,status:'BLOCKED_REPAIR_BUDGET_EXHAUSTED',
   attempts_used:view.attempts_used,
   checkpoint_receipt_id:view.checkpoint_receipt_id,
   checkpoint_hash:view.checkpoint_hash,
   last_failure_kind:view.last_failure_kind||null,
   last_failure_next:view.last_failure_next||null,
   last_failure_evidence_ref:view.last_failure_evidence_ref||null,
   failing_tests:Array.isArray(view.last_failure_test_names)?
    view.last_failure_test_names.slice(0,6):[],
   // Reuse the same normalized, constitutional repair strategy that the model
   // receives. A UI explanation cannot independently grant another attempt.
   self_repair_strategy:view.self_repair_strategy||null,
   finding:'The original job exhausted independently checked correction attempts without a verified passing candidate.'+
    (view.last_failure_kind?' Final independent failure: '+view.last_failure_kind+'.':'')+
    (same===false?' The browser selected a different conversation; this is separate from the sandbox failure.':''),
   proposed_next_step:view.self_repair_strategy?.root_cause_hypotheses?.length?
    'Reality identified source-level repair hypotheses from its full Continuity history. '+view.self_repair_strategy.root_cause_hypotheses.slice(0,3).join(' ')+
    ' Do not consume another attempt until a materially different proposal is independently verified.':
    view.last_failure_kind==='REGRESSION'&&
    view.last_failure_next==='REPAIR_CODE_FROM_TEST_FAILURE'?
     'Inspect the frozen regression failure and model-authored source, find why eight corrections failed, and design a materially different bounded repair before requesting any new execution authority.':
     'Analyze the last independently observed sandbox failure and the model correction source; propose an evidence-backed capability change before requesting any new bounded recovery authority.'});
 if(view.status==='GOVERNED_RECOVERY_READY')
  return Object.freeze({...fixed,...source,status:'EXISTING_RECOVERY_AVAILABLE',
   attempts_used:view.attempts_used,
   checkpoint_receipt_id:view.checkpoint_receipt_id,
   checkpoint_hash:view.checkpoint_hash,
   finding:'An existing bounded recovery is independently authorized, but it has not yet proved a passing candidate.',
   proposed_next_step:'Continue only the same already-approved one-use recovery through the trusted worker.'});
 if(view.status==='AWAITING_EXACT_OWNER_APPROVAL')
  return Object.freeze({...fixed,...source,status:'EXACT_OWNER_APPROVAL_REQUIRED',
   candidate_artifact_hash:view.candidate_artifact_hash,
   finding:'An independently verified candidate exists; installation is not authorized.',
   proposed_next_step:'Show the exact verified candidate for a separate owner installation decision.'});
 return Object.freeze({...fixed,...source,status:'ORIGINAL_PROGRESS_UNSETTLED',
  current_state:view.status,
  finding:'The original job has not supplied a verified independent terminal settlement.',
  proposed_next_step:'Follow the existing journal, reconcile provider actions independently, and present only verified receipts.'});
}
export async function diagnoseOriginal178Self({
 session,env=process.env,selectedConversationId=null,
 resolve=resolveOriginalFirst178OwnerQueue,
 readView=original178OwnerApprovalView,
}={}){
 const original=await resolve({session,env});
 if(!original)return classifyFirst178Diagnosis({original});
 let view=null,viewError=null;
 try{view=await readView({session,env})}catch(e){viewError=e}
 return classifyFirst178Diagnosis({original,view,viewError,
  selectedConversationId});
}
