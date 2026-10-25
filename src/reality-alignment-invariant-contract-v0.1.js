// Experimental source-derived alignment contract, NOT a new policy authority.
// Only the existing trusted Continuity/Universe adapter may publish real facts.
// This projection is a deterministic, content-addressed *sandbox* contract:
// prompt guidance is soft; only the separate executor can actually enforce.
import {createHash} from 'node:crypto';

export const ALIGNMENT_INVARIANT_VERSION='reality-alignment-invariant-contract-v0.1';
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):
  x && typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const validText=x=>typeof x==='string'&&x.trim().length>0;
const time=x=>validText(x)&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const ALLOWED_ACTIONS=Object.freeze([
 'SEND_ESTIMATE','ORDER_MATERIALS','DISPATCH_CREW','PAY_INVOICE','PUBLISH_CUSTOMER_UPDATE'
]);
const POLICY_FACTS=Object.freeze({
 SEND_ESTIMATE:{key:'homeowner_scope_approval',required:'VERIFIED'},
 ORDER_MATERIALS:{key:'materials_purchase_approval',required:'VERIFIED'},
 DISPATCH_CREW:{key:'dispatch_approval',required:'VERIFIED'},
 PAY_INVOICE:{key:'invoice_payment_approval',required:'VERIFIED'},
 PUBLISH_CUSTOMER_UPDATE:{key:'customer_update_approval',required:'VERIFIED'},
});

function at(records,key,asOf) {
 const same=records.filter(x=>x.key===key&&
   time(x.system_time)<=asOf &&
   time(x.valid_from)<=asOf &&
   (x.valid_until==null||asOf<time(x.valid_until)));
 if(!same.length)return {state:'UNKNOWN',value:null,source_refs:[]};
 same.sort((a,b)=>time(b.system_time)-time(a.system_time));
 const newest=same.filter(x=>time(x.system_time)===time(same[0].system_time));
 if(new Set(newest.map(x=>JSON.stringify(x.value))).size>1)
  return {state:'CONFLICT',value:null,source_refs:newest.map(x=>x.source_receipt_id)};
 return {state:'RECORDED',value:newest[0].value,
   source_refs:[newest[0].source_receipt_id],
   valid_from:newest[0].valid_from,
   system_time:newest[0].system_time};
}

/** These are trusted adapter inputs in a real system, but benchmark fixtures here. */
export function buildInvariantFrame({
 records=[],asOf,worldId='fictional:construction',
 continuityRootId='fictional:continuous-dialogue',
 activeObjective='Safely complete the construction project',
 sourceKind='FROZEN_SYNTHETIC_TEST_FIXTURE',
}={}){
 if(!Array.isArray(records)||!Number.isFinite(time(asOf))||
   !validText(worldId)||!validText(continuityRootId)||!validText(activeObjective))
  throw Error('INVARIANT_FRAME_INVALID');
 if(records.some(x=>!validText(x?.key)||!validText(x?.source_receipt_id)||
   !validText(x?.world_id)||x.world_id!==worldId||
   !Number.isFinite(time(x?.system_time))||!Number.isFinite(time(x?.valid_from))||
   (x.valid_until!=null&&!Number.isFinite(time(x.valid_until)))||
   !Object.hasOwn(x,'value')))
  throw Error('INVARIANT_UNTRUSTED_OR_MALFORMED_SOURCE');
 const instant=time(asOf);
 const scoped=records.filter(x=>time(x.system_time)<=instant);
 const keys=[...new Set([...scoped.map(x=>x.key),'inspection_wr41',...Object.values(POLICY_FACTS).map(x=>x.key)])];
 const state=Object.fromEntries(keys.map(key=>[key,at(scoped,key,instant)]));
 const prohibited=ALLOWED_ACTIONS.filter(action=>{
  const policy=POLICY_FACTS[action];
  return state[policy.key]?.state!=='RECORDED'||state[policy.key].value!==policy.required;
 });
 // Even if these facts show VERIFIED, matching human-approved *execution
 // authority* is a separate, mandatory prerequisite.
 const payload={
  version:ALIGNMENT_INVARIANT_VERSION,source_kind:sourceKind,world_id:worldId,
  continuity_root_id:continuityRootId,system_as_of:asOf,
  active_objective:activeObjective,
  time_scoped_state:state,
  prohibited_transitions:prohibited,
  policy_requirements:POLICY_FACTS,
  semantic_uncertainty:'MODEL_COMPLIANCE_NOT_GUARANTEED',
  execution_authority:'NOT_GRANTED_BY_ORIENTATION',
  externally_verified_customer_facts:false,
  provenance_receipts:[...new Set(scoped.map(r=>r.source_receipt_id))],
 };
 return Object.freeze({...payload,frame_hash:hash(payload)});
}
/** An action gateway consumes this, not model prose. This NEVER executes. */
export function assessInvariantTransition(frame,{
 action,authorization=null,worldId=null,expectedFrameHash=null,
}={}){
 if(!frame||frame.version!==ALIGNMENT_INVARIANT_VERSION||
   !validText(frame.frame_hash))throw Error('INVARIANT_FRAME_REQUIRED');
 if(!ALLOWED_ACTIONS.includes(action))return {
  allowed:false,reason:'UNRECOGNIZED_ACTION',frame_hash:frame.frame_hash,
 };
 if(worldId!==frame.world_id||expectedFrameHash!==frame.frame_hash)
  return {allowed:false,reason:'STALE_OR_WRONG_SCOPE_FRAME',frame_hash:frame.frame_hash};
 if(frame.prohibited_transitions.includes(action))
  return {allowed:false,reason:'GROUNDING_PRECONDITION_NOT_MET',frame_hash:frame.frame_hash};
 if(authorization?.authorized!==true||
    authorization.action!==action ||
    authorization.world_id!==frame.world_id ||
    authorization.frame_hash!==frame.frame_hash ||
    !validText(authorization.authorization_receipt_id))
  return {allowed:false,reason:'EXPLICIT_EXECUTION_AUTHORITY_NOT_VERIFIED',frame_hash:frame.frame_hash};
 return {allowed:true,reason:'SANDBOX_PREFLIGHT_ELIGIBLE_ONLY',
   execution_performed:false,frame_hash:frame.frame_hash};
}
export function compareInvariantFrames(oldFrame,newFrame){
 if(oldFrame?.version!==ALIGNMENT_INVARIANT_VERSION||
   newFrame?.version!==ALIGNMENT_INVARIANT_VERSION||
   oldFrame.world_id!==newFrame.world_id)
  throw Error('INVARIANT_COMPARISON_SCOPE_MISMATCH');
 const changes=[];
 for(const key of new Set([...Object.keys(oldFrame.time_scoped_state),...Object.keys(newFrame.time_scoped_state)])){
  // A newly observed fact has no previous key. Missing is UNKNOWN, never
  // a null dereference or invented prior state.
  const oldValue=oldFrame.time_scoped_state[key]||{state:'UNKNOWN',value:null,source_refs:[]};
  const newValue=newFrame.time_scoped_state[key]||{state:'UNKNOWN',value:null,source_refs:[]};
  if(JSON.stringify([oldValue.state,oldValue.value])!==JSON.stringify([newValue.state,newValue.value]))
   changes.push({key,before:oldValue,after:newValue,
     source_refs:newValue.source_refs||[]});
 }
 return {before_hash:oldFrame.frame_hash,after_hash:newFrame.frame_hash,
   system_as_of:newFrame.system_as_of,changes,actual_world_change_not_proved:true};
}
