// Reality Proof Lab dual-column evidence projection.
// Never label an independent CI failure or synthetic sandbox step an LLM error.
// No verdict is inferred from a model self-report, proposed fix, or passing workflow.
import crypto from 'node:crypto';
import {verifyFullLoopProofReceipts} from './reality-full-loop-sandbox-proof-v0.1.js';

export const INCIDENT_COMPARISON_VERSION='reality-incident-comparison-v0.1';
const key=v=>crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,20);
const safeText=v=>typeof v==='string'?v.slice(0,320):'';
const pct=(a,b)=>b>0?Number((100*a/b).toFixed(2)):null;
const SPECIFIC_DRIFT=new Set(['FACT_DRIFT','OBLIGATION_LOSS','WORLD_SCOPE_DRIFT','EVIDENCE_PROVENANCE_DRIFT']);
const HALLUCINATION_SUSPECT=new Set(['UNSUPPORTED_CLAIM','UNSUPPORTED_PROVENANCE','FALSE_COMPLETION','FABRICATED_OBLIGATION','EVIDENCE_PROVENANCE_DRIFT']);
const VALID_VERDICTS=new Set(['CORRECT','INCORRECT','UNADJUDICATED']);

export function projectDurableReliabilityIncidents(history=[]){
  if(!Array.isArray(history))throw Error('INCIDENT_HISTORY_ARRAY_REQUIRED');
  const findings=[];
  for(const event of history){
    const payload=event?.payload;
    if(event?.event_kind!=='VERIFICATION'||payload?.event_type!=='MODEL_OUTPUT_ASSESSMENT')continue;
    const turn=payload.turn;
    if(!Number.isInteger(turn)||turn<1||!event.event_id)throw Error('INCIDENT_ASSESSMENT_IDENTITY_REQUIRED');
    // A turn may contain several typed violations; each is its own finding.
    const violations=Array.isArray(payload.violation_details)?payload.violation_details:[];
    const missingDetails=violations.length===0&&
      ((payload.drift?.length||0)+(payload.hallucination_suspected?.length||0))>0;
    for(let n=0;n<violations.length;n++){
      const v=violations[n];
      if(!v||!safeText(v.code)||!safeText(v.path))throw Error('INCIDENT_VIOLATION_DETAIL_INVALID');
      const code=v.code;
      findings.push(Object.freeze({
        incident_id:key(event.event_id+'|'+n+'|'+code+'|'+v.path),
        origin_receipt_id:event.event_id, model_output_digest:payload.model_output_digest||null,
        worldline_id:event.worldline_id||null,
        origin_turn:turn, detection_turn:turn,
        origin_layer:'UNDERLYING_MODEL_STRUCTURED_OUTPUT',
        detection_layer:'REALITY_DETERMINISTIC_DRIFT_ASSESSMENT',
        original_output_location:v.path, finding_code:code,
        claim_key:safeText(v.key)||null,
        evidence_refs:[...new Set([v.canonical_evidence_ref,...(event.evidence_refs||[])]
          .filter(x=>typeof x==='string'&&x.length))],
        discrepancy_status:'SOURCE_ATTESTED_STRUCTURED_DISCREPANCY',
        drift_category:SPECIFIC_DRIFT.has(code),
        hallucination_suspected:HALLUCINATION_SUSPECT.has(code),
        hallucination_confirmed:null,
        suspected_cause:'NOT_ESTABLISHED',root_cause_verified:false,
        correction_proposed_turn:payload.correction_proposed?turn:null,
        structural_correction_verified:payload.structural_correction_verified===true,
        // Structural correction cannot be equated to a verified model or real-world recovery.
        independently_verified_repair_turn:null,
        repair_outcome:'NOT_INDEPENDENTLY_VERIFIED',
        published_to_world:payload.correction_published_to_active_state===true,
        observed_at:event.assertion_time||null,
      }));
    }
    if(missingDetails){
      findings.push(Object.freeze({
        incident_id:key(event.event_id+'|legacy-unlocalized'),
        origin_receipt_id:event.event_id,origin_turn:turn,detection_turn:turn,
        origin_layer:'UNDERLYING_MODEL_STRUCTURED_OUTPUT',
        detection_layer:'REALITY_DETERMINISTIC_DRIFT_ASSESSMENT',
        original_output_location:null,
        finding_code:'HISTORICAL_FINDINGS_NOT_INDIVIDUALLY_LOCALIZED',
        contained_codes:[...new Set([...(payload.drift||[]),...(payload.hallucination_suspected||[])])],
        discrepancy_status:'DETAILS_MISSING',root_cause_verified:false,
        correction_proposed_turn:payload.correction_proposed?turn:null,
        independently_verified_repair_turn:null,repair_outcome:'NOT_INDEPENDENTLY_VERIFIED',
        observed_at:event.assertion_time||null,
      }));
    }
  }
  return Object.freeze(findings);
}

export function scoreAdjudicatedModelTurns(turns=[]){
  if(!Array.isArray(turns))throw Error('MODEL_TURNS_ARRAY_REQUIRED');
  if(new Set(turns.map(t=>t?.turn_id)).size!==turns.length)throw Error('MODEL_DUPLICATE_TURN_ID');
  for(const t of turns){
    if(!t?.turn_id||!VALID_VERDICTS.has(t.verdict))throw Error('MODEL_TURN_VERDICT_REQUIRED');
    if(t.verdict!=='UNADJUDICATED'&&
      !(t.independent_adjudication===true&&t.source_receipt_id))
      throw Error('MODEL_VERDICT_NEEDS_INDEPENDENT_EVIDENCE');
  }
  const scored=turns.filter(t=>t.verdict!=='UNADJUDICATED');
  const correct=scored.filter(t=>t.verdict==='CORRECT').length;
  const mistakes=scored.length-correct;
  return Object.freeze({
    observed_turns:turns.length,
    independently_adjudicated_turns:scored.length,
    correct_model_turns:correct,
    incorrect_model_turns:mistakes,
    unadjudicated_turns:turns.length-scored.length,
    model_error_rate_pct:pct(mistakes,scored.length),
    model_correct_rate_pct:pct(correct,scored.length),
    denominator:'INDEPENDENTLY_ADJUDICATED_MODEL_TURNS_ONLY',
  });
}

export function buildSandboxEvidenceComparison({proof,telemetry}={}){
  const events=proof?.receipts||proof?.steps;
  if(!verifyFullLoopProofReceipts(events)||telemetry?.receipt_chain_valid!==true||
      telemetry.evidence_scope!=='EPHEMERAL_SANDBOX_RECONSTRUCTION')
    throw Error('COMPARISON_VERIFIED_SANDBOX_RECEIPTS_REQUIRED');
  const steps=events.map((e,i)=>Object.freeze({
    evidence_id:e.hash,sequence:i+1,turn:null,
    category:e.step,detail:safeText(JSON.stringify(e.detail||{})),
    source_scope:'ISOLATED_SYNTHETIC_SANDBOX',verified_receipt:true,
  }));
  const tookAction=steps.some(s=>s.category==='ORIGINAL_WORK_RETRIED');
  const independentlyVerified=proof.independent_sandbox_readback_verified===true &&
    telemetry.verified_sandbox_recoveries===1;
  const contained=steps.some(s=>s.category==='ORIGINAL_WORK_BLOCKED');
  const original=steps.find(s=>s.category==='ORIGINAL_WORK_BLOCKED');
  const detection=steps.find(s=>s.category==='ORIGINAL_WORK_BLOCKED');
  const remediation=steps.find(s=>s.category==='SANDBOX_CAPABILITY_VERIFIED');
  const resolution=steps.find(s=>s.category==='INDEPENDENT_SANDBOX_RECONSTRUCTION');
  const incident=Object.freeze({
    incident_id:key((original?.evidence_id||events[0].hash)+'|sandbox-authorization'),
    type:'SYNTHETIC_AUTHORIZATION_GATE',
    model_attribution:'NO_UNDERLYING_MODEL_REQUEST',
    root_cause:'TEST_FIXTURE_WITHHELD_AUTHORIZATION',root_cause_scope:'SYNTHETIC_FIXTURE_ONLY',
    origin_turn:null,detected_turn:null,correction_proposed_turn:null,repair_verified_turn:null,
    origin_step:original?.sequence||null,detected_step:detection?.sequence||null,
    remediation_step:remediation?.sequence||null,
    sandbox_outcome_verified_step:independentlyVerified?resolution?.sequence||null:null,
    detected_by:'REALITY_SANDBOX_AUTHORITY_GATE',
    repair_kind:independentlyVerified?'VERIFIED_SANDBOX_RECONSTRUCTION':
       tookAction?'OUTCOME_NOT_VERIFIED':'STOPPED_BEFORE_ACTION',
    completed_real_world_action:false,
    evidence_refs:[original?.evidence_id,remediation?.evidence_id,resolution?.evidence_id].filter(Boolean),
  });
  return Object.freeze({
    version:INCIDENT_COMPARISON_VERSION,source_scope:'SYNTHETIC_SANDBOX_ONLY',
    baseline_available:false,matched_model_comparison:false,
    model:{
      status:'NO_MODEL_REQUEST_IN_THIS_PROOF',events:[],
      correct_turns:null,incorrect_turns:null,drift_rate_pct:null,
      hallucination_rate_pct:null,
      explanation:'This synthetic recovery test does not call an underlying LLM. No model behavior may be inferred.',
    },
    reality:{
      status:'VERIFIED_SANDBOX_RECEIPT_TRACE',events:steps,
      authority_gate_blocked:contained,
      sandbox_attempts:telemetry.attempted_retries,
      sandbox_verified_recoveries:telemetry.verified_sandbox_recoveries,
      sandbox_unverified_completion_claims:telemetry.unresolved_completion_claims,
      sandbox_recovery_yield_pct:telemetry.verified_recovery_yield_pct,
    },
    incidents:[incident],
    roi:{
      real_model_errors_prevented:null,
      verified_customer_tasks_recovered:null,
      real_human_interventions:null,
      real_supervision_minutes_saved:null,
      independently_verified_dollars_saved:null,
      actual_model_tokens:null,
      cost_per_verified_real_recovery:null,
      scope:'REAL_CUSTOMER_ROI_NOT_YET_MEASURED',
    },
  });
}
