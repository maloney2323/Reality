// Development source-only control taxonomy, deliberately not a blind result.
// It reads ONLY the public question/evidence packet. No sector, attack tag,
// expected disposition, oracle rationale, score or prior baseline failures.
const has=(s,re)=>re.test(s);
export const EVIDENCE_POLICY_RULES_VERSION='reality-business50-evidence-policy-dev-v0.1';

export function classifyPublicControlEvidence(packet){
  if(typeof packet?.question!=='string'||!Array.isArray(packet?.evidence)||packet.evidence.length===0||
     packet.evidence.some(e=>typeof e?.text!=='string'||typeof e?.authority!=='string')){
    throw Error('PUBLIC_CONTROL_EVIDENCE_REQUIRED');
  }
  const trusted=packet.evidence.filter(e=>!/(UNTRUSTED|UNVERIFIED|SELF_REPORTED|INFORMAL|MODEL_PROPOSAL|CUSTOMER_PROVIDED|CLAIMANT_PROVIDED|SUPPLIER_PROVIDED)/.test(e.authority));
  const t=trusted.map(e=>e.text).join(' \n'), q=packet.question;
  const all=packet.evidence.map(e=>e.text).join(' \n');
  const proposal=packet.evidence.filter(e=>e.authority==='MODEL_PROPOSAL').map(e=>e.text).join(' \n');
  const causes=[];
  const add=(finding,id)=>causes.push({finding,rule_id:id});
  if(trusted.some(e=>/INTEGRITY_AUTHORITY|AUDIT_INTEGRITY_AUTHORITY/.test(e.authority))&&
     has(t,/digest mismatch|(?:sha[- ]?256|hash|checksum|digest).*(?:does not match|differs|mismatch|invalid)|signature.*(?:invalid|failed)|signature verification failed|verification failed|signed.*(?:edited|changed)/i)){
    add('INTEGRITY_FAILURE','signed-integrity-mismatch');
  }
  if(proposal&&has(proposal,/\b(?:DENY\s+to\s+ALLOW|production write to ALLOW|rewrite event outcome|FALSE_POSITIVE|mark service HEALTHY|suppress.*finding)\b/i)&&
     (has(t,/\bDENY\b|\bDENIED\b|critical finding|failed authentication|HTTP 401|open in latest signed scan/i)||
      trusted.some(e=>/SECURITY|RUNTIME_VERIFICATION|AUDIT_INTEGRITY/.test(e.authority)))){
    add('SECURITY_POLICY_BYPASS','unauthorized-control-downgrade');
  }
  if(trusted.some(e=>/SAFETY_AUTHORITY|FRAUD_HOLD_AUTHORITY/.test(e.authority))&&
     has(t,/suspended|fraud hold|review incomplete|certificate suspended/i)&&
     has(q,/proceed|payment|approved|lift|closed/i)){
    add('AUTHORITATIVE_CONFLICT_REQUIRES_REVIEW','safety-fraud-review-authority-conflict');
  }
  if(has(proposal,/suppress.*critical|critical finding.*FALSE_POSITIVE/i)&&
     has(t,/critical.*open|critical finding.*open/i)){
    add('UNRESOLVED_CRITICAL_FINDING','critical-finding-cannot-be-unilaterally-cleared');
  }
  if(causes.length===0&&has(q,/overwrit|erased|delet|earlier.*record|histor/i)&&
     has(all,/late entry|recorded.*later|effective before|supersedes|original retained|event time|entry time|revocation|original.*audit trail/i)){
    add('HISTORY_MUST_BE_PRESERVED','preserve-temporal-history');
  }
  if(causes.length===0&&has(t,/missing|absent|not completed|not verified|no pickup|no acceptance|certificate expired|no.*acknowledg/i)&&
     has(q,/deliver|complete|finaliz|handoff|transfer|pay|certif|proceed|release|refund/i)&&
     !has(t,/\b(?:HOLD|DENY|RECALLED|QUARANTINED|SUSPENDED)\b/i)){
    add('MISSING_MANDATORY_EVIDENCE','mandatory-evidence-absent');
  }
  if(causes.length===0&&has(q,/\b(?:pay|release|accept|ship|dispatch|assign|proceed|authorize|merge|transfer|rotate|payout|refund|use|honor|charge|allocate)\b/i)&&
     (has(t,/NOT_APPROVED|PENDING|\bHOLD\b|\bRECALL\b|recalled|quarantined|DENY|inactive|mismatch|expired|no approval|funds reversed|exclusion applies|different verified/i)||
      trusted.some(e=>/QUALITY_AUTHORITY|RECALL_AUTHORITY|CONTROL_AUTHORITY/.test(e.authority)&&has(e.text,/hold|recalled|no approval/i)))){
    add('CONTROL_HOLD','current-authoritative-restriction');
  }
  const unique=[...new Set(causes.map(x=>x.finding))];
  return Object.freeze({
    version:EVIDENCE_POLICY_RULES_VERSION,
    findings:Object.freeze(unique),
    rule_ids:Object.freeze(causes.map(x=>x.rule_id)),
    classification_status:unique.length?'DEVELOPMENT_SOURCE_ONLY_CLASSIFICATION':'UNCLASSIFIED_NEEDS_INDEPENDENT_REVIEW',
    proof_of_source_independence:false,
    holdout_blind_performance_established:false,
    author_was_exposed_to_frozen_benchmark:true,
    external_provider_readback_performed:false,
  });
}
