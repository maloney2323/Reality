// Reality Drift / Hallucination Recovery Contract v0.1.
// Independent typed assertions only. This layer does NOT parse arbitrary prose,
// establish source truth, authorize effects, or mutate the Continuity Ledger.
export const DRIFT_RECOVERY_VERSION = 'reality-drift-recovery-v0.1';
const ACTION_STATES = new Set(['AUTHORIZED','EXECUTING','EXECUTED','COMPLETED','VERIFIED']);
const COMPLETE_STATES = new Set(['COMPLETED','VERIFIED']);
const copy = value => JSON.parse(JSON.stringify(value));
const norm = value => value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(norm) : Object.fromEntries(Object.keys(value).sort().map(key => [key,norm(value[key])]))
  : value;
const same = (a,b) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));
const str = value => typeof value === 'string' ? value.trim() : '';
function assertSnapshot(snapshot){
  if (!snapshot || !str(snapshot.world_id)) throw Error('TRUSTED_WORLD_REQUIRED');
  if (!Array.isArray(snapshot.facts) || !Array.isArray(snapshot.obligations) ||
      !Array.isArray(snapshot.authorities) || !Array.isArray(snapshot.receipts))
    throw Error('TRUSTED_SNAPSHOT_ARRAYS_REQUIRED');
  for (const item of [...snapshot.facts,...snapshot.obligations]) {
    if (!str(item.evidence_ref)) throw Error('TRUSTED_EVIDENCE_REF_REQUIRED');
    if (item.world_id !== snapshot.world_id) throw Error('TRUSTED_SNAPSHOT_SCOPE_MISMATCH');
  }
  const keys = snapshot.facts.map(f=>f.key);
  if (new Set(keys).size !== keys.length) throw Error('UNRESOLVED_FACT_VERSION_CONFLICT');
  const ids = snapshot.obligations.map(o=>o.id);
  if (new Set(ids).size !== ids.length) throw Error('UNRESOLVED_OBLIGATION_VERSION_CONFLICT');
}
function assertCandidate(candidate){
  if (!candidate || !str(candidate.world_id) || !Array.isArray(candidate.claims) ||
      !Array.isArray(candidate.actions) || !Array.isArray(candidate.carried_obligation_ids))
    throw Error('STRUCTURED_CANDIDATE_REQUIRED');
}
function supportedAuthority(action,snapshot){
  return snapshot.authorities.some(a=>
    a.active === true && a.world_id === snapshot.world_id &&
    str(a.id) && a.id === action.authority_ref && a.action_type === action.action_type &&
    a.target === action.target && a.action_id === action.action_id &&
    (!a.expires_at || Date.parse(a.expires_at) > Date.parse(snapshot.as_of || '2099-01-01T00:00:00Z')));
}
function independentlyVerified(action,snapshot){
  return snapshot.receipts.some(r=>r.independent === true && r.verified === true &&
    r.world_id === snapshot.world_id && r.id === action.verification_ref &&
    r.action_id === action.action_id && r.target === action.target);
}
export function assessDrift({trustedSnapshot,candidate}={}){
  assertSnapshot(trustedSnapshot);
  assertCandidate(candidate);
  const violations=[];
  const add=(code,path,details={})=>violations.push({code,path,...copy(details)});
  const facts=new Map(trustedSnapshot.facts.map(f=>[f.key,f]));
  const evidence=new Set([
    ...trustedSnapshot.facts.map(f=>f.evidence_ref),
    ...trustedSnapshot.obligations.map(o=>o.evidence_ref),
    ...trustedSnapshot.receipts.filter(r=>r.verified===true && r.independent===true).map(r=>r.id),
  ]);
  if(candidate.world_id!==trustedSnapshot.world_id)add('WORLD_SCOPE_DRIFT','world_id');
  candidate.claims.forEach((claim,i)=>{
    const path='claims['+i+']';
    const fact=facts.get(claim.key);
    if(!fact) { add('UNSUPPORTED_CLAIM',path,{key:claim.key}); return; }
    if(!same(claim.value,fact.value))add('FACT_DRIFT',path,{key:claim.key,canonical_evidence_ref:fact.evidence_ref});
    if(!Array.isArray(claim.evidence_refs) || !claim.evidence_refs.includes(fact.evidence_ref) ||
        claim.evidence_refs.some(ref=>!evidence.has(ref)))
      add('EVIDENCE_PROVENANCE_DRIFT',path,{key:claim.key,canonical_evidence_ref:fact.evidence_ref});
  });
  if(candidate.scope === 'OPERATIONAL' || candidate.actions.length>0){
    const carried=new Set(candidate.carried_obligation_ids);
    trustedSnapshot.obligations.filter(o=>o.active===true).forEach(o=>{
      if(!carried.has(o.id))add('OBLIGATION_LOSS','carried_obligation_ids',{obligation_id:o.id,evidence_ref:o.evidence_ref});
    });
    candidate.carried_obligation_ids.forEach(id=>{
      if(!trustedSnapshot.obligations.some(o=>o.id===id && o.active===true))
        add('FABRICATED_OBLIGATION','carried_obligation_ids',{obligation_id:id});
    });
  }
  candidate.actions.forEach((action,i)=>{
    const path='actions['+i+']';
    if(ACTION_STATES.has(action.status) && !supportedAuthority(action,trustedSnapshot))
      add('AUTHORITY_ESCALATION',path,{action_id:action.action_id});
    if(COMPLETE_STATES.has(action.status) && !independentlyVerified(action,trustedSnapshot))
      add('FALSE_COMPLETION',path,{action_id:action.action_id});
  });
  const codes=[...new Set(violations.map(v=>v.code))];
  return {
    version:DRIFT_RECOVERY_VERSION, status:violations.length?'DRIFT_DETECTED':'NO_TYPED_DRIFT_DETECTED',
    tested_contract:'STRUCTURED_CLAIMS_AND_ACTIONS_ONLY',
    unstructured_free_text_scored:false,
    violations, codes, detected_count:violations.length,
    external_action_permitted:false,
    truth_source:'CALLER_SUPPLIED_TRUSTED_SNAPSHOT_NOT_MODEL_OUTPUT',
  };
}
export function proposeDriftRecovery({trustedSnapshot,candidate,assessment}={}){
  const actual=assessDrift({trustedSnapshot,candidate});
  if(assessment && !same(assessment.violations,actual.violations))throw Error('DRIFT_ASSESSMENT_MISMATCH');
  const fixed=copy(candidate), changes=[];
  if(fixed.world_id!==trustedSnapshot.world_id)
    return {version:DRIFT_RECOVERY_VERSION,status:'BLOCKED_SCOPE_RECONCILIATION',original:copy(candidate),
      proposed:null,changes:[],original_violations:actual.violations,
      external_action_permitted:false};
  const facts=new Map(trustedSnapshot.facts.map(f=>[f.key,f]));
  fixed.claims=fixed.claims.filter(claim=>{
    if(facts.has(claim.key))return true;
    changes.push({type:'QUARANTINE_UNSUPPORTED_CLAIM',key:claim.key});
    return false;
  }).map(claim=>{
    const fact=facts.get(claim.key);
    if(!same(claim.value,fact.value) || !same(claim.evidence_refs,[fact.evidence_ref])){
      changes.push({type:'RESTORE_CANONICAL_FACT_AND_PROVENANCE',key:claim.key,evidence_ref:fact.evidence_ref});
      return {...claim,value:copy(fact.value),evidence_refs:[fact.evidence_ref]};
    }
    return claim;
  });
  if(fixed.scope==='OPERATIONAL'||fixed.actions.length>0){
    const expected=trustedSnapshot.obligations.filter(o=>o.active===true).map(o=>o.id);
    if(!same([...new Set(fixed.carried_obligation_ids)].sort(),expected.slice().sort())){
      fixed.carried_obligation_ids=expected;
      changes.push({type:'REHYDRATE_ACTIVE_OBLIGATIONS',evidence_refs:trustedSnapshot.obligations
        .filter(o=>o.active===true).map(o=>o.evidence_ref)});
    }
  }
  fixed.actions=fixed.actions.map(action=>{
    if(!ACTION_STATES.has(action.status))return action;
    const authority=supportedAuthority(action,trustedSnapshot);
    const verified=independentlyVerified(action,trustedSnapshot);
    if(!authority || (COMPLETE_STATES.has(action.status) && !verified)){
      changes.push({type:'BLOCK_UNVERIFIED_OR_UNAUTHORIZED_ACTION',action_id:action.action_id});
      return {...action,status:'BLOCKED_PENDING_AUTHORITY_OR_VERIFICATION',
        authority_ref:null,verification_ref:null,external_effects_permitted:false};
    }
    return action;
  });
  return {version:DRIFT_RECOVERY_VERSION,status:changes.length?'CORRECTION_PROPOSED':'NO_CHANGE_NEEDED',
    original:copy(candidate),proposed:fixed,changes,original_violations:actual.violations,
    external_action_permitted:false,correction_is_verified:false};
}
export function verifyDriftRecovery({trustedSnapshot,manifest}={}){
  if(!manifest || !manifest.original)throw Error('RECOVERY_MANIFEST_REQUIRED');
  const before=assessDrift({trustedSnapshot,candidate:manifest.original});
  if(!same(before.violations,manifest.original_violations))throw Error('RECOVERY_BASELINE_MISMATCH');
  if(!manifest.proposed) return {verdict:'BLOCKED',before,after:null,corrected:false,external_action_permitted:false};
  const after=assessDrift({trustedSnapshot,candidate:manifest.proposed});
  const corrected=before.violations.length>0 && after.violations.length===0;
  return {verdict:corrected?'STRUCTURAL_RECOVERY_VERIFIED':after.violations.length?'STILL_DRIFTING':'NO_CORRECTION_NEEDED',
    corrected, before, after,
    independent_outcome_verified:false,
    source_truth_independently_verified_by_this_module:false,
    external_action_permitted:false};
}
// Evaluate frozen adjudicated cases. A case label must come from an independent
// fixture owner, not from the detector's own judgment.
export function gradeDriftCases(cases=[]){
  if(!Array.isArray(cases)||!cases.length)throw Error('GRADED_CASES_REQUIRED');
  let tp=0,fp=0,tn=0,fn=0,recovered=0,unsafe=0;
  const results=cases.map(c=>{
    if(typeof c.expected_drift!=='boolean')throw Error('INDEPENDENT_CASE_LABEL_REQUIRED');
    const assessment=assessDrift({trustedSnapshot:c.trustedSnapshot,candidate:c.candidate});
    const found=assessment.detected_count>0;
    if(found&&c.expected_drift)tp++;
    else if(found&&!c.expected_drift)fp++;
    else if(!found&&c.expected_drift)fn++;
    else tn++;
    const manifest=proposeDriftRecovery({trustedSnapshot:c.trustedSnapshot,candidate:c.candidate,assessment});
    const verification=verifyDriftRecovery({trustedSnapshot:c.trustedSnapshot,manifest});
    if(c.expected_drift&&verification.corrected)recovered++;
    if(verification.external_action_permitted)unsafe++;
    return {id:c.id,expected_drift:c.expected_drift,detected:found,codes:assessment.codes,
      recovery:verification.verdict,corrected:verification.corrected};
  });
  const pct=(v,n)=>n?Number((100*v/n).toFixed(2)):null;
  return {contract_version:DRIFT_RECOVERY_VERSION,source:'DETERMINISTIC_STRUCTURED_FIXTURES_NOT_LIVE_LLM',
    cases:cases.length,confusion:{tp,fp,tn,fn},recovered,recovery_success_pct:pct(recovered,tp+fn),
    detection_recall_pct:pct(tp,tp+fn),detection_precision_pct:pct(tp,tp+fp),
    false_positive_pct:pct(fp,tn+fp),missed_drift_pct:pct(fn,tp+fn),
    residual_structured_drift_pct:pct(tp+fn-recovered,tp+fn),unauthorized_actions:unsafe,results};
}
