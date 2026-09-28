import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_AUTOMATION_DISCOVERY_INGEST_VERSION = 'reality-automation-discovery-ingest-v0.1';
export const DISCOVERY_INGEST_AUTHORITY = 'CANDIDATE_TO_OVERSIGHT_RECORD_ONLY';

function text(value,max=2000){return typeof value==='string'?value.trim().slice(0,max):'';}
function list(value,max=20){return Array.isArray(value)?[...new Set(value.map((v)=>text(v,500)).filter(Boolean))].slice(0,max):[];}

export async function buildOversightDiscoveryFromCandidate(candidate,{created_at=new Date().toISOString()}={}) {
  if(!candidate?.candidate_id) throw new Error('CANDIDATE_ID_REQUIRED');
  if(candidate.status!=='CANDIDATE' || candidate.model_candidate_only!==true) throw new Error('CANDIDATE_STATE_INVALID');
  if(candidate.automation_authorized!==false || candidate.action_authorized!==false || candidate.external_effects_permitted!==false) throw new Error('CANDIDATE_AUTHORITY_VIOLATION');
  if(!candidate.source_ref) throw new Error('CANDIDATE_SOURCE_REF_REQUIRED');

  const evidenceRefs=list([candidate.source_ref,...(candidate.source_capsule_refs||[])],16);
  if(!evidenceRefs.length) throw new Error('CANDIDATE_EVIDENCE_REQUIRED');

  const sourceKind = candidate.source_kind==='DOCUMENT_EVIDENCE' ? 'INSPECTION'
    : candidate.source_kind==='OBSERVED_PATTERN' ? 'RUNTIME_RECEIPT'
    : 'CHAT';
  const worldKind = String(candidate.world_id||'').startsWith('self:') ? 'SELF' : 'CUSTOMER_BUSINESS';
  const confidence = ['LOW','MEDIUM','HIGH'].includes(candidate.confidence) ? candidate.confidence : 'INSUFFICIENT_EVIDENCE';
  const now=created_at;
  const dedupeKey=await sha256Hex(canonicalJson({
    world_id:candidate.world_id,
    discovery_type:'AUTOMATION_OPPORTUNITY',
    subject:candidate.title,
    evidence_refs:evidenceRefs,
  }));

  return Object.freeze({
    record_version:'oversight-discovery-v0.1',
    discovery_id:`oversight-automation:${candidate.candidate_id}`,
    user_id:candidate.user_id,
    world_id:candidate.world_id,
    world_kind:worldKind,
    is_self_world:worldKind==='SELF',
    discovery_type:'AUTOMATION_OPPORTUNITY',
    subject:text(candidate.title,500),
    summary:text(candidate.workflow_summary,2400),
    evidence_refs:evidenceRefs,
    source_kind:sourceKind,
    severity:confidence==='HIGH'?'HIGH':confidence==='MEDIUM'?'MEDIUM':'LOW',
    priority:confidence==='HIGH'?'P1':confidence==='MEDIUM'?'P2':'P3',
    urgency:'NONE',
    consequence_impact:text(candidate.approval_boundary,1200),
    confidence,
    uncertainty:list([
      'Candidate status does not establish recurrence.',
      'Human frequency and handling time remain unverified.',
      text(candidate.what_to_observe_next,900),
    ],10),
    owner_required:true,
    status:'OPEN',
    dedupe_key:dedupeKey,
    recommended_next_step:text(candidate.what_to_observe_next,1200)||'Observe the workflow again before treating it as recurring.',
    authority_state:'NONE',
    verification_state:'EVIDENCE_GROUNDED',
    freshness_class:'UNKNOWN',
    stale:false,
    contradiction_refs:[],
    notification_state:'NOT_DELIVERABLE',
    notification_gap_reason:'No notification delivery authority is granted by discovery ingestion.',
    surfaced_at:null,
    dismissed_at:null,
    authority:'OVERSIGHT_DISCOVERY_CANDIDATE_NOT_AUTHORITY',
    truth_authorized:false,
    action_authorized:false,
    external_effects_permitted:false,
    produced_at:now,
    as_of:now,
  });
}

export function verifyDiscoveryIngest(record){
  const failures=[];
  if(record?.discovery_type!=='AUTOMATION_OPPORTUNITY') failures.push('DISCOVERY_TYPE');
  if(record?.authority_state!=='NONE') failures.push('AUTHORITY_STATE');
  if(record?.truth_authorized!==false) failures.push('TRUTH_AUTHORITY');
  if(record?.action_authorized!==false) failures.push('ACTION_AUTHORITY');
  if(record?.external_effects_permitted!==false) failures.push('EXTERNAL_EFFECT_AUTHORITY');
  if(record?.status!=='OPEN') failures.push('STATUS');
  if(!Array.isArray(record?.evidence_refs)||record.evidence_refs.length===0) failures.push('EVIDENCE');
  return Object.freeze({valid:failures.length===0,failures});
}