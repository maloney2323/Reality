// Universe Post-Composition Verifier V1
// The underlying LLM can misrepresent even correctly composed Universe state.
// Independently verify typed operational status against a scoped trusted
// preflight, regenerate once, and retain immutable original/repair receipts.
// This checks *consistency with a preflight*, not external factual truth.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry}
 from './reality-universe-persistence-contract-v1.0.js';

export const POST_COMPOSITION_VERIFIER_VERSION='reality-postcomposition-verifier-v1.0';
const sorted=a=>[...a].sort();
const text=x=>typeof x==='string'&&x.trim();
const fail=x=>{throw Error(x)};
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
function requirePreflight(scope,plan,preflight){
 if(!scope||!text(scope.continuity_root_id)||!text(scope.worldline_id)||
  !text(scope.owner_user_id)||!text(scope.work_item_id)||
  !Number.isFinite(Date.parse(scope.as_of))||
  plan?.scope?.continuity_root_id!==scope.continuity_root_id||
  plan?.scope?.worldline_id!==scope.worldline_id||
  plan?.scope?.owner_user_id!==scope.owner_user_id||
  plan?.scope?.work_item_id!==scope.work_item_id||
  !text(plan?.manifest_hash)||
  preflight?.status!=='SANDBOX_COMPOSED_DRAFT_ONLY'||
  preflight.target_id!==plan.target_id||
  !Array.isArray(preflight.execution_trace)||
  preflight.execution_trace.length!==plan.ordered_form_ids.length||
  preflight.execution_trace.some((r,i)=>r.id!==plan.ordered_form_ids[i])||
  !Array.isArray(preflight.result?.blockers)||
  preflight.result?.kind!=='DRAFT_ONLY'||
  preflight.result?.confirmable!==false||
  typeof preflight.result?.eligible_for_owner_authorization!=='boolean'||
  preflight.external_actions!==0)
   fail('POSTCOMPOSITION_TRUSTED_PREFLIGHT_REQUIRED');
 if(preflight.result.eligible_for_owner_authorization!==
   (preflight.result.blockers.length===0))
  fail('POSTCOMPOSITION_PREFLIGHT_CONTRADICTION');
 return preflight.result;
}
export function evaluateComposedAnswer({
 scope,plan,preflight,modelAnswer,modelResponseId,
}={}){
 const certified=requirePreflight(scope,plan,preflight);
 if(!text(modelResponseId))fail('POSTCOMPOSITION_MODEL_ID_REQUIRED');
 const expected=sorted(certified.blockers);
 const actual=Array.isArray(modelAnswer?.blockers)?modelAnswer.blockers:[];
 const missing=expected.filter(x=>!actual.includes(x));
 const extra=actual.filter(x=>!expected.includes(x));
 const duplicates=actual.filter((x,i)=>actual.indexOf(x)!==i);
 const expectedDecision=certified.eligible_for_owner_authorization?
  'READY_FOR_OWNER_AUTHORIZATION':'BLOCKED';
 const findings=[
  ...missing.map(b=>({kind:'OMITTED_VERIFIED_FORM_BLOCKER',blocker:b})),
  ...extra.map(b=>({kind:'INVENTED_OPERATIONAL_BLOCKER',blocker:b})),
  ...duplicates.map(b=>({kind:'DUPLICATED_OPERATIONAL_BLOCKER',blocker:b})),
 ];
 if(modelAnswer?.decision!==expectedDecision)
  findings.push({kind:'INCORRECT_OPERATIONAL_DECISION',
   expected:expectedDecision,observed:modelAnswer?.decision??null});
 if(modelAnswer?.real_action_executed!==false)
  findings.push({kind:'UNVERIFIED_EXTERNAL_ACTION_EFFECT'});
 const verdict=findings.length?'REPAIR_REQUIRED':'PASS_TYPED_PREFLIGHT_ONLY';
 const body={version:POST_COMPOSITION_VERIFIER_VERSION,verdict,
  expected_blockers:expected,actual_blockers:actual,
  expected_decision:expectedDecision,
  model_response_id:modelResponseId,
  preflight_manifest_hash:plan.manifest_hash,
  model_answer_hash:hash(modelAnswer),findings,
  external_factual_truth_proven:false,semantic_accuracy_proven:false,
  action_authority_granted:false};
 return Object.freeze({...body,verification_hash:hash(body)});
}
function makeReceipt({scope,kind,payload,ref,at,depends=[]}){
 const stamp=at||scope.as_of;
 return createUniverseEntry({
  entry_id:'postcomposition:'+hash([scope.continuity_root_id,ref,kind,payload]).slice(7,39),
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:kind,epistemic_kind:'OBSERVATION',
  assertion_time:stamp,effective_time:stamp,source_ref:ref,
  payload,evidence_references:depends,
  provenance:{source:POST_COMPOSITION_VERIFIER_VERSION,
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id,
   origin:'SANDBOX_COMPOSITION_NO_CUSTOMER_WRITE',
   authority:'NONE'},
 });
}
async function writeChecked(ledger,row){
 if(typeof ledger?.append!=='function'||typeof ledger?.read!=='function')
  fail('POSTCOMPOSITION_LEDGER_REQUIRED');
 const receipt=await ledger.append(row);
 if(!['APPENDED_SANDBOX','PERSISTED','DUPLICATE_IDENTICAL',
  'DUPLICATE_IDENTICAL_CONCURRENT'].includes(receipt?.status))
  fail('POSTCOMPOSITION_APPEND_FAILED');
 const read=await ledger.read(row.entry_id);
 validateUniverseEntry(read);
 if(read.ledger_entry_hash!==row.ledger_entry_hash||
   read.entry_id!==row.entry_id)
  fail('POSTCOMPOSITION_LEDGER_READBACK_FAILED');
 return Object.freeze({entry_id:row.entry_id,hash:row.ledger_entry_hash,
  readback_verified:true});
}
export async function verifyAndRepairComposedAnswer({
 scope,plan,preflight,original,modelResponseId,
 generateRealModelRepair=null,ledger,at,
}={}){
 requirePreflight(scope,plan,preflight);
 const first=evaluateComposedAnswer({
  scope,plan,preflight,modelAnswer:original,modelResponseId,
 });
 const receipts=[];
 const save=async(kind,payload,ref,depends=[])=>{
  const row=makeReceipt({scope,kind,payload,ref,at,depends});
  const receipt=await writeChecked(ledger,row);
  receipts.push({kind,...receipt});return receipt;
 };
 const originalSaved=await save('COMPOSITION_MODEL_ORIGINAL',
  {modelResponseId,answer:original,verified:false},
  'model:'+modelResponseId);
 await save('COMPOSITION_MODEL_ASSESSMENT',first,
  'verifier:'+first.verification_hash,[originalSaved.entry_id]);
 let chosen=original,verdict=first,status='ORIGINAL_PASSED_TYPED_PREFLIGHT';
 if(first.verdict!=='PASS_TYPED_PREFLIGHT_ONLY'){
  status='REPAIR_REQUIRED';
  if(typeof generateRealModelRepair==='function'){
   const repaired=await generateRealModelRepair({
    original,original_model_response_id:modelResponseId,
    verified_source_preflight:{
     expected_blockers:first.expected_blockers,
     expected_decision:first.expected_decision,
     no_external_action_receipt:true,
     form_manifest_hash:plan.manifest_hash,
    },
    findings:first.findings,
    instruction:'Correct the complete operational reply. Retain useful natural explanation and source distinctions. Reflect the typed evidence state; do not invent or omit blockers, and never claim tool execution. This does not authorize business actions.',
   });
   if(repaired&&text(repaired.response_id)&&repaired.answer){
    const repairSaved=await save('COMPOSITION_MODEL_REPAIR_PROPOSAL',
     {modelResponseId:repaired.response_id,answer:repaired.answer,
      original_id:originalSaved.entry_id},
     'model:'+repaired.response_id,[originalSaved.entry_id]);
    verdict=evaluateComposedAnswer({
     scope,plan,preflight,modelAnswer:repaired.answer,
     modelResponseId:repaired.response_id,
    });
    await save('COMPOSITION_MODEL_REPAIR_ASSESSMENT',verdict,
     'verifier:'+verdict.verification_hash,[repairSaved.entry_id]);
    if(verdict.verdict==='PASS_TYPED_PREFLIGHT_ONLY'){
     chosen=repaired.answer;status='REPAIRED_PASS_TYPED_PREFLIGHT_ONLY';
    }
   }
  }
  if(status!=='REPAIRED_PASS_TYPED_PREFLIGHT_ONLY'){
   // Preserve truthful structured evidence status, never deliver the known
   // contradictory model answer. Do not erase useful model output from receipts.
   chosen={
    decision:first.expected_decision,
    blockers:first.expected_blockers,
    real_action_executed:false,
    explanation:'The current independently evaluated sandbox preflight supports only these stated readiness conditions. This is an unsent advisory draft, not an actual schedule confirmation. Human review and authenticated source checks are required before any business action.',
   };
   status='UNCERTAINTY_FALLBACK_NOT_REAL_MODEL_REPAIR';
  }
 }
 const deliver=await save('COMPOSITION_VERIFIED_DELIVERY',
  {chosen,original_model_response_id:modelResponseId,
   delivery_status:status,
   verified_against_typed_preflight:true,
   independent_semantic_accuracy:false,
   real_business_action_performed:false},
  'postcomposition:delivery',
  receipts.filter(r=>r.kind.includes('ASSESSMENT')).map(r=>r.entry_id));
 return Object.freeze({
  status,original_answer:original,delivered_answer:chosen,
  original_findings:first.findings,
  final_typed_findings:status==='REPAIRED_PASS_TYPED_PREFLIGHT_ONLY'?
   verdict.findings:[],
  corrected_model_proved_semantically_right:false,
  original_model_response_id:modelResponseId,
  repair_generated_by_live_model:status==='REPAIRED_PASS_TYPED_PREFLIGHT_ONLY',
  original_retained:true,
  delivery_receipt_id:deliver.entry_id,
  receipts,external_actions_executed:0,
 });
}
