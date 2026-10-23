// Universe-native Epistemic Metabolism primitive v1.
// Projects bounded ignorance from validated, scoped source observations and
// frozen detector-failure evidence. It neither trains an LLM, executes tools,
// makes truth claims, modifies authority, nor deploys code.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry}
 from './reality-universe-persistence-contract-v1.0.js';
import {verifyObservationEnvelope,TRUSTED_OBSERVATION_ADMISSION_VERSION}
 from './reality-trusted-observation-admission-v0.1.js';

export const IGNORANCE_MANIFEST_VERSION='reality-universe-ignorance-manifest-v1.0';
const text=x=>typeof x==='string'&&x.trim().length>0;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const fail=x=>{throw Error(x)};
const arr=x=>Array.isArray(x)?x:[];
const eq=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const iso=x=>text(x)&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const MAX_ENTRIES=200;
const SAFE_INTELLIGENCE=Object.freeze(['REASON','DRAFT','ANALYZE','PROPOSE_ALTERNATIVES']);
function requireScope(s){
 if(!text(s?.continuity_root_id)||!text(s?.worldline_id)||!text(s?.entity_ref)||
    !text(s?.state_key)||!iso(s?.as_of))fail('IGNORANCE_SCOPE_REQUIRED');
 return {continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
  entity_ref:s.entity_ref,state_key:s.state_key,as_of:iso(s.as_of)};
}
function checkedRow(row,scope){
 if(row?.event_kind!=='SOURCE_OBSERVATION')return null;
 if(row.continuity_root_id!==scope.continuity_root_id||
    row.worldline_id!==scope.worldline_id||
    row.provenance?.source!==TRUSTED_OBSERVATION_ADMISSION_VERSION)return null;
 try{validateUniverseEntry(row);}catch{return null;}
 const ob=row.payload?.observation,att=row.payload?.source_attestation;
 if(att?.independently_source_read!==true||!text(att.verification_ref)||
    !arr(row.evidence_references).includes(att.verification_ref)||
    att.observation_hash!==ob?.observation_hash)return null;
 try{verifyObservationEnvelope(ob,{continuityRootId:scope.continuity_root_id});}
 catch{return null;}
 if(arr(ob.object_refs).length!==1||ob.object_refs[0]!==scope.entity_ref||
    !iso(ob.observed_at)||!iso(ob.event_time)||
    Date.parse(ob.observed_at)>Date.parse(scope.as_of)||
    Date.parse(ob.event_time)>Date.parse(scope.as_of)||
    Date.parse(row.assertion_time)>Date.parse(scope.as_of))return null;
 return {row,ob,att};
}
// The caller selects one typed coordinate. Never collapse unrelated projects,
// tenants, domains, or timestamps. Source readback attests the observed record
// only, not the truth of the asserted physical-world state.
export function assessUniverseCoordinate({
 scope,ledgerEntries=[],requiredValue,requiredEvidenceKind=null,
}={}){
 const normalized=requireScope(scope);
 if(!Array.isArray(ledgerEntries)||ledgerEntries.length>MAX_ENTRIES)
  fail('IGNORANCE_SOURCE_BOUNDS_EXCEEDED');
 if(!Object.hasOwn({requiredValue},'requiredValue')||requiredValue===undefined)
  fail('IGNORANCE_EXPECTED_VALUE_REQUIRED');
 if(typeof requiredValue==='object'||typeof requiredValue==='function'||
   (typeof requiredValue==='number'&&!Number.isFinite(requiredValue)))
  fail('IGNORANCE_EXPECTED_VALUE_INVALID');
 const records=[],rejected=[];
 for(const row of ledgerEntries){
  const valid=checkedRow(row,normalized);
  if(!valid){rejected.push(String(row?.entry_id||'untracked'));continue;}
  const {ob,att}=valid;
  for(const c of arr(ob.content_or_metadata?.epistemic_claims)){
   if(c?.target_state_key!==normalized.state_key||!Object.hasOwn(c,'value')||
      !['FACT','OUTCOME'].includes(c.claim_kind))continue;
   const val=c.value;
   if((typeof val!=='string'&&typeof val!=='number'&&typeof val!=='boolean')||
     (typeof val==='number'&&!Number.isFinite(val)))continue;
   records.push({
    source_entry_id:row.entry_id,source_entry_hash:row.ledger_entry_hash,
    observation_id:ob.observation_id,observation_hash:ob.observation_hash,
    source_name:ob.source,source_record_id:ob.source_record_id,
    readback_receipt_id:att.verification_ref,asserted_value:val,
    claim_kind:c.claim_kind,effective_at:iso(ob.event_time),
    source_readback_verified:true,real_world_truth_verified:false,
   });
  }
 }
 records.sort((a,b)=>a.source_entry_id.localeCompare(b.source_entry_id));
 const distinct=[...new Set(records.map(r=>JSON.stringify(canonical(r.asserted_value))))];
 const epistemicState=!records.length?'UNKNOWN':
    distinct.length>1?'CONFLICTING':'SOURCE_CONSISTENT_NOT_GROUND_TRUTH';
 const conditionSatisfied=distinct.length===1&&eq(records[0].asserted_value,requiredValue);
 // A matching source value is NOT approval, outcome proof, or authorization.
 const requirementMet=conditionSatisfied&&records.length>0&&
   requiredEvidenceKind===null ? 'CANDIDATE_SOURCE_MATCH_NO_INDEPENDENT_AUTHORITY'
   : 'NOT_VERIFIED';
 const body={
  version:IGNORANCE_MANIFEST_VERSION,
  scope:normalized,epistemic_state:epistemicState,
  desired_precondition_value:requiredValue,
  required_evidence_kind:requiredEvidenceKind,
  source_observations:records,
  source_rejected_count:rejected.length,
  rejected_source_entry_refs:rejected,
  related_attested_source_count:records.length,
  values_in_disagreement:distinct.length,
  unverified_business_precondition:!conditionSatisfied,
  condition_evaluation:requirementMet,
  source_trust_semantics:'READBACK_PROVES_SOURCE_RECORDED_CLAIM_NOT_WORLD_TRUTH',
  authority_granted:false,action_executed:false,
 };
 return Object.freeze({...body,assessment_hash:digest(body)});
}
// A manifest is a hash-bound projection of the assessed Universe coordinate.
// Even a strong match is not sufficient for consequential execution: that is
// decided by separately authenticated, narrowly-scoped policy/execution gates.
export function createUniverseIgnoranceManifest({
 assessment,consequentialActions=[],requiredEvidence,discoveryProbe=null,
}={}){
 const {assessment_hash,...body}=assessment||{};
 if(!text(assessment_hash)||digest(body)!==assessment_hash||
    body.version!==IGNORANCE_MANIFEST_VERSION)
  fail('IGNORANCE_ASSESSMENT_HASH_MISMATCH');
 if(!Array.isArray(consequentialActions)||consequentialActions.length>16||
   consequentialActions.some(x=>!text(x)||x.length>100)||
   !text(requiredEvidence)||requiredEvidence.length>300)
  fail('IGNORANCE_MANIFEST_CONTRACT_INVALID');
 if(discoveryProbe!==null&&(!text(discoveryProbe?.operation)||
    discoveryProbe?.access!=='READ_ONLY'||discoveryProbe?.authorized===true))
  fail('IGNORANCE_DISCOVERY_PROBE_NOT_PROVEN_SAFE');
 const status=body.epistemic_state==='CONFLICTING'?'CONFLICTING':
   body.epistemic_state==='UNKNOWN'?'UNKNOWN':'EVIDENCE_INSUFFICIENT_FOR_EXECUTION';
 const scope=body.scope;
 const content={
  version:IGNORANCE_MANIFEST_VERSION,
  manifest_kind:'BUSINESS_EVIDENCE_GAP',
  target_coordinate:scope,
  epistemic_state:status,
  cause_assessment_hash:assessment_hash,
  supporting_sources:body.source_observations.map(r=>({
    source_entry_id:r.source_entry_id,source_entry_hash:r.source_entry_hash,
    readback_receipt_id:r.readback_receipt_id,
    asserted_value:r.asserted_value,
    evidence_type:'SOURCE_READBACK_NOT_REAL_WORLD_TRUTH',
  })),
  permitted_intelligence:SAFE_INTELLIGENCE,
  // Proposed UI limitations. A consumer must separately enforce these at its
  // actual action boundary; this object has no authority over a connector.
  consequential_action_review_required:[...new Set(consequentialActions)].sort(),
  reconciliation_protocol:{
    required_evidence:requiredEvidence,
    discovery_probe:discoveryProbe?{
      operation:discoveryProbe.operation,access:'READ_ONLY',
      authorization_status:'NOT_GRANTED_BY_MANIFEST',
    }:null,
    next_step:'OBTAIN_AUTHENTICATED_SOURCE_AND_REASSESS_COORDINATE',
  },
  competence_promotion:'NOT_AUTHORIZED',
  scoped_execution_gate_wired:false,
  customer_action_authorized:false,
  independent_outcome_verified:false,
  model_intelligence_restricted:false,
 };
 const manifest_id='ignorance:'+digest(content).slice(7,39);
 return Object.freeze({...content,manifest_id,
   manifest_receipt_hash:digest(content)});
}
export function verifyUniverseIgnoranceManifest(manifest){
 if(!manifest||manifest.version!==IGNORANCE_MANIFEST_VERSION||
   !text(manifest.manifest_id)||!text(manifest.manifest_receipt_hash))
  fail('IGNORANCE_MANIFEST_REQUIRED');
 const {manifest_id,manifest_receipt_hash,...content}=manifest;
 if(manifest_id!=='ignorance:'+digest(content).slice(7,39)||
    manifest_receipt_hash!==digest(content)||
    manifest.customer_action_authorized!==false||
    manifest.competence_promotion!=='NOT_AUTHORIZED'||
    manifest.scoped_execution_gate_wired!==false)
  fail('IGNORANCE_MANIFEST_INTEGRITY_OR_AUTHORITY_INVALID');
 return Object.freeze({valid:true,manifest_id});
}
export function makeIgnoranceUniverseEntry({manifest}={}){
 verifyUniverseIgnoranceManifest(manifest);
 if(manifest.manifest_kind!=='BUSINESS_EVIDENCE_GAP')
  fail('IGNORANCE_UNIVERSE_ENTRY_KIND_INVALID');
 const scope=manifest.target_coordinate;
 return createUniverseEntry({
  entry_id:'universe:'+manifest.manifest_id,
  continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
  event_kind:'IGNORANCE_MANIFEST_OBSERVED',epistemic_kind:'UNCERTAINTY',
  assertion_time:scope.as_of,effective_time:scope.as_of,
  source_ref:IGNORANCE_MANIFEST_VERSION,
  payload:{manifest,interpretation:'DIAGNOSTIC_NOT_AUTHORIZED_EXECUTION'},
  evidence_references:[manifest.cause_assessment_hash,
    ...manifest.supporting_sources.map(r=>r.source_entry_id)],
  provenance:{source:IGNORANCE_MANIFEST_VERSION,
    authority:'NONE',persistence:'CALLER_MUST_APPEND_SEPARATELY'},
 });
}
// A missed frozen adversarial probe is a candidate internal competence gap,
// not proof of a real customer error. This shape can share the Universe
// continuity vocabulary without self-upgrading or silently retraining.
export function createDetectorCapabilityGap({
 continuityRootId,worldlineId='reality:primary',
 benchmarkId,faultProbeId,expectedClassification,observedClassifications=[],
 evaluationReceiptRef,assessedAt,
}={}){
 if(!text(continuityRootId)||!text(worldlineId)||!text(benchmarkId)||
    !text(faultProbeId)||!text(expectedClassification)||
    !text(evaluationReceiptRef)||!iso(assessedAt)||
    !Array.isArray(observedClassifications)||observedClassifications.length>32||
    observedClassifications.some(x=>!text(x)))
  fail('IGNORANCE_CAPABILITY_GAP_EVIDENCE_REQUIRED');
 const escaped=!observedClassifications.includes(expectedClassification);
 const basis={version:IGNORANCE_MANIFEST_VERSION,manifest_kind:'DETECTOR_CAPABILITY_GAP',
  continuity_root_id:continuityRootId,worldline_id:worldlineId,
  target_coordinate:'reality:detector:'+expectedClassification,
  epistemic_state:escaped?'CANDIDATE_COVERAGE_GAP':'EXPECTED_CLASS_DETECTED',
  benchmark_id:benchmarkId,fault_probe_id:faultProbeId,
  expected_classification:expectedClassification,
  actual_detector_classifications:[...observedClassifications],
  evaluation_receipt_ref:evaluationReceiptRef,assessed_at:iso(assessedAt),
  test_origin:'FROZEN_SYNTHETIC_FAULT_NOT_LIVE_OPENAI_FAILURE',
  reconciliation_protocol:{
   proposed_action:'SANDBOX_GENERALIZABLE_FIX_AND_REGRESSION_TESTS',
   independent_new_corpus_required:true,
   positive_control_regressions_required:true,
   external_approval_for_promotion:true,
  },
  independent_truth_adjudication:'NOT_PERFORMED',
  proposed_upgrade_only:true,autonomous_deploy:false,
  competence_promotion:'NOT_AUTHORIZED',
 };
 return Object.freeze({...basis,manifest_id:'ignorance:'+digest(basis).slice(7,39),
  manifest_receipt_hash:digest(basis)});
}
