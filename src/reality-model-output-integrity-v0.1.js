// This is the MODEL OUTPUT adapter for Reality's existing shared epistemic
// difference engine + Continuous Integrity Spine. Not an independent detector
// or truth oracle. It NEVER trusts user-provided context as a verified source.
import {createHash} from 'node:crypto';
import {createObservation} from './reality-world-observation-fabric-v0.1.js';
import {inspectEpistemicDifferences} from './reality-epistemic-difference-detector-v0.1.js';
import {verifyObservationEnvelope,TRUSTED_OBSERVATION_ADMISSION_VERSION}
  from './reality-trusted-observation-admission-v0.1.js';

export const MODEL_OUTPUT_INTEGRITY_VERSION='reality-model-output-integrity-v0.1';
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const norm=x=>String(x??'').trim().toLowerCase();
const isDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
function trustedObservations({entries,root,worldline}){
 const admitted=[],seen=new Set();let excluded=0;
 for(const row of entries||[]){
  if(row?.event_kind!=='SOURCE_OBSERVATION')continue;
  const o=row.payload?.observation;
  if(!root||row.continuity_root_id!==root||row.worldline_id!==worldline||
    row.provenance?.source!==TRUSTED_OBSERVATION_ADMISSION_VERSION||
    row.payload?.source_attestation?.independently_source_read!==true||
    row.payload?.source_attestation?.observation_hash!==o?.observation_hash){
   excluded++;continue;
  }
  try{verifyObservationEnvelope(o,{continuityRootId:root});}
  catch{excluded++;continue;}
  if(!seen.has(o.observation_id)){seen.add(o.observation_id);admitted.push({entry:row,observation:o});}
 }
 return {admitted,excluded};
}
function kindOf(key){
 if(/^(?:invoice|estimate)\.amount$/i.test(key))return 'AMOUNT';
 if(key==='cabinet.color'||key==='cabinets.color')return 'CABINET_COLOR';
 return null; // intentionally narrow. Unrecognized claims are NOT marked correct.
}
function amount(v){
 if(typeof v==='number'&&Number.isFinite(v))return v;
 const x=String(v??'').replace(/[$,\s]/g,'');
 return /^\d+(?:\.\d{1,2})?$/.test(x)?Number(x):null;
}
function clauses(answer) {
 // Do not treat quoted examples, code, or markdown quote blocks as assertions
 // by the model about the operational world.
 const output=[];let pos=0,code=false;
 for(const line of answer.split(/\n/)){
  const start=pos;pos+=line.length+1;
  if(/^\s*```/.test(line)){code=!code;continue;}
  if(code||/^\s*>/.test(line))continue;
  let cleaned=line.replace(/`[^`]*`/g,' ').replace(/"[^"\n]*"|'[^'\n]*'/g,' ');
  const chunks=cleaned.split(/(?<=[.!?])\s+/);
  for(const chunk of chunks){
   const s=chunk.trim();
   if(s)output.push({text:s,offset:start+Math.max(0,line.indexOf(chunk))});
  }
 }
 return output;
}
function uncertain(s) {
 return /\b(?:if|what if|could|might|may|maybe|possibly|perhaps|hypothetical|suppose|suggest|recommend|consider|propose|example|illustrat|would|should|don't|do not|not|never|without confirmation|unverified|uncertain|unknown|disputed)\b/i.test(s)
  || /\?/g.test(s);
}
function matchValue(kind,text){
 if(kind==='AMOUNT') {
  if(!/\b(?:invoice|estimate)\b/i.test(text))return null;
  const m=text.match(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/);
  if(!m)return null;
  if(!/\b(?:amount|total|approved|is|was|equals|for|at|of|charged|quoted)\b|[:=]/i.test(text))return null;
  return amount(m[1]);
 }
 if(kind==='CABINET_COLOR'){
  if(!/\bcabinets?\b/i.test(text))return null;
  const colors='white|gray|grey|black|blue|green|red|brown';
  const a=text.match(new RegExp('\\bcabinets?\\s+(?:(?:are|is|will be|were|color is|finish is)\\s+)?('+colors+')\\b','i'));
  const b=text.match(new RegExp('\\b('+colors+')\\s+cabinets?\\b','i'));
  if(!a&&!b)return null;
  if(!/\b(?:is|are|was|were|approved|selected|ordered|will be|color|finish)\b/i.test(text))return null;
  const c=norm((a||b)[1]);return c==='grey'?'gray':c;
 }
 return null;
}
function normalized(kind,v){
 if(kind==='AMOUNT')return amount(v);
 const s=norm(v);return s==='grey'?'gray':s;
}
function completedAction(text){
 const x=text.match(/\b(?:I|Reality|we)\s+(?:(?:have|has|already)\s+)*(sent|emailed|paid|purchased|ordered|published|deployed|deleted|transferred)\b/i);
 return x?.[1]?.toUpperCase()||null;
}
export function inspectModelOutputWithContinuity({
 answer,ledgerEntries=[],continuityRootId=null,worldlineId='reality:primary',
 modelResponseId='untracked',observedAt=new Date().toISOString(),
}={}){
 if(typeof answer!=='string')throw Error('MODEL_OUTPUT_ANSWER_REQUIRED');
 if(!Array.isArray(ledgerEntries))throw Error('MODEL_OUTPUT_LEDGER_ENTRIES_INVALID');
 if(!isDate(observedAt))throw Error('MODEL_OUTPUT_TIMESTAMP_INVALID');
 const {admitted,excluded}=trustedObservations({
  entries:ledgerEntries,root:continuityRootId,worldline:worldlineId});
 const sources=new Map();
 for(const item of admitted){
  const o=item.observation,entity=String(o.object_refs?.[0]||'');
  for(const c of o.content_or_metadata?.epistemic_claims||[]){
   const key=String(c?.target_state_key||''),kind=kindOf(key);
   if(!kind||!entity||!Object.hasOwn(c,'value'))continue;
   const groupKey=JSON.stringify([entity,key]),arr=sources.get(groupKey)||[];
   arr.push({...item,claim:c,entity,key,kind});sources.set(groupKey,arr);
  }
 }
 const reference=[],contested=[];
 for(const rows of sources.values()){
  const sorted=rows.slice().sort((a,b)=>
   Date.parse(b.observation.event_time)-Date.parse(a.observation.event_time) ||
   Date.parse(b.observation.observed_at)-Date.parse(a.observation.observed_at));
  const latestTime=sorted[0].observation.event_time;
  const current=sorted.filter(x=>x.observation.event_time===latestTime);
  const values=new Set(current.map(x=>JSON.stringify(normalized(x.kind,x.claim.value))));
  if(values.size!==1||sorted.length>1&&new Set(sorted.map(x=>
   JSON.stringify(normalized(x.kind,x.claim.value)))).size>1){
   contested.push({entity:sorted[0].entity,key:sorted[0].key,
    source_entry_refs:sorted.map(x=>x.entry.entry_id),
    status:'SOURCE_CHANGE_REQUIRES_ADJUDICATION'});
  } else reference.push(sorted[0]);
 }
 const findings=[],candidateObservations=[],examined=[];
 const candidates=clauses(answer);
 for(let i=0;i<candidates.length;i++){
  const p=candidates[i];
  if(uncertain(p.text)){examined.push({offset:p.offset,status:'EXCLUDED_UNCERTAIN_OR_NEGATED'});continue;}
  const action=completedAction(p.text);
  if(action){
   findings.push({
    issue_id:'model-integrity:'+hash([modelResponseId,p.offset,'EXECUTION',action]).slice(0,32),
    classification:'UNVERIFIED_EXECUTION_CLAIM',
    origin_stage:'COGNITION',source_receipt_refs:['model-response:'+modelResponseId],
    excerpt:p.text.slice(0,240),offset:p.offset,
    recommended_action:'REQUIRE_INDEPENDENT_EXECUTION_READBACK',
    independently_adjudicated:false,verified_hallucination:false,
   });
  }
  // Conflicting source histories are themselves an unresolved condition.
  // Do not silently accept the latest amount as verified or report "no drift".
  for(const conflicted of contested){
   const kind=kindOf(conflicted.key);
   if(!kind)continue;
   const value=matchValue(kind,p.text);
   if(value===null)continue;
   const similar=[...reference.filter(x=>x.kind===kind),
     ...contested.filter(x=>kindOf(x.key)===kind)];
   if(similar.length!==1)continue; // A model phrase cannot select ambiguous entities.
   findings.push({
     issue_id:'model-integrity:'+hash([modelResponseId,p.offset,conflicted.entity,conflicted.key,'CONTESTED']).slice(0,32),
     classification:'CONTESTED_SOURCE_REFERENCE',origin_stage:'COGNITION',
     entity_ref:conflicted.entity,target_state_key:conflicted.key,
     source_receipt_refs:conflicted.source_entry_refs,
     model_response_id:modelResponseId,model_claim_value:value,
     excerpt:p.text.slice(0,240),offset:p.offset,
     recommended_action:'INDEPENDENTLY_RECONCILE_SOURCE_CHANGE',
     independently_adjudicated:false,verified_hallucination:false,
   });
  }
  const matches=[];
  for(const ref of reference){
   const v=matchValue(ref.kind,p.text);
   if(v===null)continue;
   const sameKind=reference.filter(x=>x.kind===ref.kind);
   if(sameKind.length!==1){examined.push({offset:p.offset,status:'AMBIGUOUS_ENTITY'});continue;}
   matches.push({ref,value:v});
  }
  for(const m of matches){
   const {ref,value}=m;
   examined.push({offset:p.offset,status:'EXPLICIT_MATERIAL_CLAIM_EXTRACTED',key:ref.key});
   if(normalized(ref.kind,value)===normalized(ref.kind,ref.claim.value))continue;
   // Build a synthetic comparison observation with aligned effective time.
   // This is *not* a source fact and must never be admitted to the ledger.
   const synthetic=createObservation({
    source:'MODEL_OUTPUT_UNVERIFIED',domain:'BUSINESS',
    sourceRecordId:'model:'+modelResponseId+':'+i,
    observedAt,eventTime:ref.observation.event_time,eventType:'MODEL_CANDIDATE',
    objectRefs:[ref.entity],provenance:{continuity_root_id:continuityRootId,worldline_id:worldlineId},
    contentOrMetadata:{epistemic_claims:[{target_state_key:ref.key,
      claim_kind:'FACT',value}]},
   });
   const comparisons=inspectEpistemicDifferences({
    observations:[ref.observation,synthetic]});
   if(!comparisons.epistemic_discrepancies.some(x=>x.classification==='E_FACT_CONFLICT'))
    continue; // No independent discrepancy, no promoted claim.
   candidateObservations.push(synthetic);
   findings.push({
    issue_id:'model-integrity:'+hash([modelResponseId,p.offset,ref.entity,ref.key,value]).slice(0,32),
    classification:'POTENTIAL_MATERIAL_DRIFT',origin_stage:'COGNITION',
    entity_ref:ref.entity,target_state_key:ref.key,
    source_receipt_refs:[ref.entry.entry_id,ref.observation.observation_id],
    source_observation_hash:ref.observation.observation_hash,
    model_response_id:modelResponseId,model_claim_value:value,
    observed_reference_value:ref.claim.value,excerpt:p.text.slice(0,240),offset:p.offset,
    recommended_action:'VERIFY_REVISION_BEFORE_USING_MODEL_VALUE',
    independently_adjudicated:false,verified_hallucination:false,
   });
  }
 }
 return Object.freeze({
  version:MODEL_OUTPUT_INTEGRITY_VERSION,
  status:findings.length?'REVIEW_REQUIRED':
    admitted.length?'LIMITED_CHECK_NO_FLAG':'NO_TRUSTED_REFERENCE',
  reference_scope:'ATTESTED_SOURCE_OBSERVATIONS_IN_RETRIEVED_WORKING_WINDOW',
  semantic_detection_scope:'NARROW_EXPLICIT_MATERIAL_ASSERTIONS_ONLY',
  response_id:modelResponseId,
  source_admitted_count:admitted.length,
  source_rejected_count:excluded,
  protected_reference_count:reference.length,
  contested_reference_count:contested.length,
  contested_references:contested,
  statements_considered:candidates.length,
  claim_extraction_events:examined,
  findings,
  // The candidate is only a transient comparator, not an attested source.
  candidate_observations: candidateObservations,
  independent_truth_adjudication:'NOT_PERFORMED',
  unassessed_answer_claims_possible:true,
  model_drift_rate:null,detector_recall:null,
  customer_roi_usd:null,authority_granted:false,
 });
}
