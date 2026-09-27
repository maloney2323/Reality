// Reality Reasoning Orchestration v0.1
// Governed multi-model reasoning. This module grants no execution authority.
// Model output is analysis, not evidence, and cannot directly authorize actions.

export const REALITY_REASONING_ORCHESTRATION_VERSION='reality-reasoning-orchestration-v0.1';
export const MODEL_OUTPUT_STATUS='MODEL_GENERATED_ANALYSIS_NOT_EVIDENCE';
export const DEFAULT_MAX_INDEPENDENT_ROUNDS=3;
export const DEFAULT_MAX_CROSS_EXAMINATION_ROUNDS=2;

function canonical(v){
  if(Array.isArray(v)) return v.map(canonical);
  if(v&&typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
  return v;
}
export function canonicalReasoningJson(v){ return JSON.stringify(canonical(v)); }
export async function digestReasoningInput(v){
  const b=new TextEncoder().encode(canonicalReasoningJson(v));
  const d=await crypto.subtle.digest('SHA-256',b);
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function buildReasoningSession({
  reasoning_session_id, continuity_state_id, input_snapshot, model_roles=[],
  reasoning_budget={}, stop_condition='EPISTEMIC_STATE_STABLE_OR_BUDGET_EXHAUSTED',
}={}){
  if(!reasoning_session_id||!continuity_state_id||input_snapshot===undefined) throw new Error('REASONING_SESSION_FIELDS_REQUIRED');
  return {
    schema:REALITY_REASONING_ORCHESTRATION_VERSION,
    reasoning_session_id,
    continuity_state_id,
    input_digest:null,
    model_roles:[...model_roles],
    independent_rounds:[],
    cross_examination_rounds:[],
    candidate_digests:[],
    challenge_digests:[],
    epistemic_changes:[],
    verification_requirements:[],
    reasoning_budget:{
      max_independent_rounds:DEFAULT_MAX_INDEPENDENT_ROUNDS,
      max_cross_examination_rounds:DEFAULT_MAX_CROSS_EXAMINATION_ROUNDS,
      ...reasoning_budget
    },
    stop_condition,
    final_epistemic_status:'UNRESOLVED',
    authority:{truth_authority:false,action_authority:false,execution_authority:false},
    input_snapshot
  };
}

export async function finalizeReasoningSession(session){
  const input_digest=await digestReasoningInput(session.input_snapshot);
  return {...session,input_digest,finalized:true};
}

export function recordIndependentRound(session,{round_id,outputs=[]}={}){
  if((session.independent_rounds||[]).length>=Number(session.reasoning_budget?.max_independent_rounds||DEFAULT_MAX_INDEPENDENT_ROUNDS))
    return {...session,stop_reason:'INDEPENDENT_ROUND_BUDGET_EXHAUSTED'};
  const normalized=outputs.map(o=>({
    ...o,
    epistemic_status:MODEL_OUTPUT_STATUS,
    execution_authority:false,
    evidence_authority:false
  }));
  return {...session,independent_rounds:[...(session.independent_rounds||[]),{round_id,outputs:normalized}]};
}

export function recordCrossExaminationRound(session,{round_id,challenges=[]}={}){
  if((session.cross_examination_rounds||[]).length>=Number(session.reasoning_budget?.max_cross_examination_rounds||DEFAULT_MAX_CROSS_EXAMINATION_ROUNDS))
    return {...session,stop_reason:'CROSS_EXAMINATION_BUDGET_EXHAUSTED'};
  return {...session,cross_examination_rounds:[...(session.cross_examination_rounds||[]),{
    round_id,
    challenges:challenges.map(c=>({...c,epistemic_status:MODEL_OUTPUT_STATUS,execution_authority:false,evidence_authority:false}))
  }]};
}

export function shouldContinueReasoning({epistemic_state_changed=false,verification_requirements_open=false,budget_exhausted=false}={}){
  if(budget_exhausted) return {continue:false,reason:'BUDGET_EXHAUSTED'};
  if(verification_requirements_open) return {continue:true,reason:'VERIFICATION_REQUIREMENTS_OPEN'};
  if(epistemic_state_changed) return {continue:true,reason:'EPISTEMIC_STATE_CHANGED'};
  return {continue:false,reason:'NO_MATERIAL_EPISTEMIC_CHANGE'};
}

export function promoteModelFinding({finding,independentVerification=false}={}){
  if(!finding) throw new Error('FINDING_REQUIRED');
  if(!independentVerification) return {...finding,epistemic_status:MODEL_OUTPUT_STATUS};
  return {...finding,epistemic_status:'SUPPORTED',support_basis:'INDEPENDENT_VERIFICATION_REQUIRED'};
}
