// Authenticated Preview post-model, pre-delivery material verification seam.
// Source provenance and claim coverage must not be asserted without an
// independent attestor. No artificial correction or added model calls.
import {createHash} from 'node:crypto';
import {auditAndReceiptMaterialClaims}
 from './reality-universe-material-claim-verifier-v1.0.js';
export const MATERIAL_DELIVERY_VERSION='reality-standalone-material-delivery-v1.0';
const sha=x=>createHash('sha256').update(String(x)).digest('hex');
const fail=x=>{throw Error(x)};
const jobId=/\b(?:WR|OT|CX|JF|HM)-\d+\b/i;
export function extractExplicitInspectionClaims(answer){
 if(typeof answer!=='string')fail('MATERIAL_DELIVERY_ANSWER_REQUIRED');
 const out=[];let fenced=false,offset=0;
 for(const line of answer.split('\n')){
  if(/^\s*```/.test(line)){fenced=!fenced;offset+=line.length+1;continue;}
  if(fenced||/^\s*>/.test(line)){offset+=line.length+1;continue;}
  for(const m of line.matchAll(/[^.!?]+[.!?]?/g)){
   const span=m[0].trim();
   if(!span||/^[\s"']/.test(m[0])||
    /\b(?:according to|someone says|worker claims|rumor|hypothetically|what if|could|might|may|would|if the|example)\b/i.test(span)||
    /["“”]/.test(span))continue;
   const id=span.match(jobId)?.[0]?.toUpperCase();
   if(!id||!/\b(?:inspection|municipal|city|permit)\b/i.test(span))continue;
   const pending=/\b(?:has not yet (?:received|obtained|gotten)|hasn't (?:received|obtained)|not yet (?:received|obtained))\s+(?:an?\s+)?PASS\b|\binspection.{0,95}\b(?:pending|not passed)\b/i.test(span);
   const passed=!pending&&/\b(?:inspection|municipal|city).{0,110}\b(?:has passed|has received a PASS|is passed|PASS(?:ED)?)\b/i.test(span);
   const hold=!pending&&!passed&&/\b(?:inspection|municipal|city).{0,110}\b(?:safety hold|on hold|clearance revoked)\b/i.test(span);
   if(!pending&&!passed&&!hold)continue;
   out.push({claim_id:'inspection-claim:'+sha([offset,m.index,span].join('|')).slice(0,24),
    subject_ref:'job:'+id,state_key:'inspection.current_clearance',
    asserted_value:pending?'PENDING':passed?'PASS':'SAFETY_HOLD',
    source_span:span,speech_act:'ASSERTED_FACT'});
  }
  offset+=line.length+1;
 }
 return out;
}
function scoped(s,observedAt){
 if(!s?.authenticated_user_id||!s.continuity_root_id||
  !s.worldline_id||!s.conversation_id||
  !Number.isFinite(Date.parse(observedAt)))fail('MATERIAL_DELIVERY_SERVER_SCOPE_REQUIRED');
 return {continuity_root_id:s.continuity_root_id,
  worldline_id:s.worldline_id,owner_user_id:s.authenticated_user_id,
  work_item_id:s.conversation_id,as_of:observedAt};
}
export async function screenStandaloneMaterialDelivery({
 scope,rawAnswer,displayedAnswer,modelResponseId,
 observedAt,load,store,lookup,fetchImpl,independentSourceAttestor,
}={}){
 const s=scoped(scope,observedAt);
 if(typeof rawAnswer!=='string'||!rawAnswer.trim()||
  typeof displayedAnswer!=='string'||typeof load!=='function'||
  typeof store!=='function'||typeof lookup!=='function'||
  typeof independentSourceAttestor!=='function')
  fail('MATERIAL_DELIVERY_INPUT_INVALID');
 const claims=extractExplicitInspectionClaims(rawAnswer);
 if(!claims.length)return Object.freeze({
  response:displayedAnswer,status:'COVERAGE_NOT_ESTABLISHED_NO_EXTRACTED_INSPECTION_CLAIM',
  detected_claims:0,material_claim_coverage_verified:false,
  verification_receipt_id:null,external_actions_executed:0});
 const readKind=async kind=>{
  const r=await load({continuityRootId:scope.continuity_root_id,
   worldlineId:scope.worldline_id,eventKind:kind,
   assertionTime:observedAt,limit:300,fetchImpl});
  if(r?.status!=='AVAILABLE'||!Array.isArray(r.entries))
   fail('MATERIAL_DELIVERY_SOURCE_LEDGER_UNAVAILABLE');
  if(r.entries.length>=300)fail('MATERIAL_DELIVERY_SOURCE_SCAN_INCOMPLETE');
  return r.entries;
 };
 const entries=[...await readKind('MATERIAL_EVIDENCE_ASSERTED'),
  ...await readKind('MATERIAL_EVIDENCE_REVOKED')];
 const ledger={append:async e=>store(e,{fetchImpl}),
  read:async entryId=>lookup({entryId,fetchImpl})};
 const audit=await auditAndReceiptMaterialClaims({
  ledger,scope:s,modelAnswer:rawAnswer,
  modelResponseId:modelResponseId||'untracked:'+sha(rawAnswer).slice(0,24),
  claims,entries,validAt:observedAt,knownAt:observedAt,
  independentSourceAttestor,consequential:true});
 const conflicts=audit.report.findings.filter(x=>
  x.status==='CONTRADICTS_CURRENT_ATTESTED_EVIDENCE');
 const blocked=conflicts.length>0;
 const detail=conflicts.map(x=>x.subject_ref+' '+x.state_key+
  ': current independently attested source '+String(x.current_attested_value)).join('; ');
 const response=blocked
  ?'Reality verification withheld a contradictory material claim from the model answer. Source state: '+
    detail+'. The original remains in the audit trail. No external action was performed. Review the underlying evidence before acting.'
  :displayedAnswer;
 return Object.freeze({response,
  status:blocked?'MATERIAL_CONTRADICTION_WITHHELD_BEFORE_DELIVERY':
   'MATERIAL_CLAIMS_EVALUATED_COVERAGE_INCOMPLETE',
  detected_claims:claims.length,contradictory_claims:conflicts.length,
  material_claim_coverage_verified:audit.report.independently_audited_complete_coverage,
  verification_receipt_id:audit.receipt_id,
  verification_receipt_hash:audit.receipt_hash,
  verified_readback:audit.verified_readback,external_actions_executed:0});
}
