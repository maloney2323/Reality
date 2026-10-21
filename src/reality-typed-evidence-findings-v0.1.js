// Public-evidence-only typed reconciliation. No scorer/benchmark imports, case IDs,
// expected dispositions, or model answer keys. Does not verify external source truth.
// Each admitted finding names its supporting evidence and the logic behind it.
export const TYPED_FINDINGS_VERSION='reality-typed-evidence-findings-v0.1';
const str=x=>typeof x==='string'&&x.trim().length>0;
const UPPER=x=>String(x||'').toUpperCase();
const trustBad=/UNTRUSTED|UNVERIFIED|INFORMAL|SELF_REPORTED|MODEL_PROPOSAL|CUSTOMER_PROVIDED|CLAIMANT_PROVIDED|SUPPLIER_PROVIDED|UNVERIFIED_CHANNEL/;
const explicitHold=/\b(?:NOT_APPROVED|DENIED|DENY|RECALLED|QUARANTINED|SUSPENDED|ON_HOLD|BLOCKED|HOLD)\b/i;

const finding=(name,rule,evidenceIds,detail)=>Object.freeze({
  finding:name,rule_id:rule,
  evidence_ids:Object.freeze([...new Set(evidenceIds)]),
  observation:detail,
  independence_verified:false,
  external_source_readback:false,
});
const uniqueEvidence=es=>[...new Set(es)].filter(Boolean);
const idMatches=x=>{
  const values=[];
  const re=/\b(?:account\s*(?:id|number|#)?|loyalty\s*account\s*(?:id|number|#)?)\s*[:#]?\s*([A-Z]{1,3}-\d{2,12})\b/gi;
  for(const m of String(x).matchAll(re))values.push(UPPER(m[1]));
  return [...new Set(values)];
};

export function reconcileTypedEvidenceFindings(publicPacket,{legacyFindings=[]}={}){
  if(!str(publicPacket?.question)||!Array.isArray(publicPacket?.evidence)||
     !publicPacket.evidence.length||publicPacket.evidence.some(e=>!str(e?.id)||
       !str(e?.source)||!str(e?.authority)||!str(e?.text))||
     new Set(publicPacket.evidence.map(e=>e.id)).size!==publicPacket.evidence.length)
    throw Error('VALID_PUBLIC_EVIDENCE_REQUIRED');
  if(!Array.isArray(legacyFindings)||legacyFindings.some(x=>!str(x)))throw Error('VALID_LEGACY_FINDINGS_REQUIRED');
  const es=publicPacket.evidence;
  const trusted=es.filter(x=>!trustBad.test(UPPER(x.authority)));
  const untrusted=es.filter(x=>trustBad.test(UPPER(x.authority)));
  const proposed=es.filter(x=>UPPER(x.authority)==='MODEL_PROPOSAL');
  const qs=publicPacket.question;
  const detections=[];
  const byName=x=>UPPER(x.source)+' '+UPPER(x.authority);
  const noAuthoritativeHold=!trusted.some(x=>explicitHold.test(x.text));

  // Missing current certificate is a data freshness/evidence problem, not
  // automatically an independently authenticated suspension or explicit hold.
  const expiredCertificate=trusted.filter(x=>
    /CERTIFICATE|INSURANCE|COMPLIANCE/.test(byName(x))&&
    /\b(?:EXPIRED|LAPSED|OUTDATED)\b/i.test(x.text));
  const assertedRenewal=untrusted.filter(x=>/renewed|renewal|new certificate|replacement certificate/i.test(x.text));
  const currentVerifiedCertificate=trusted.some(x=>
    /CERTIFICATE|INSURANCE|COMPLIANCE/.test(byName(x))&&
    /CURRENT.*VALID|RENEWAL VERIFIED|STATUS\s*=\s*ACTIVE|VALID THROUGH/i.test(x.text));
  if(expiredCertificate.length&&assertedRenewal.length&&
     !currentVerifiedCertificate&&noAuthoritativeHold){
    detections.push(finding('MISSING_MANDATORY_EVIDENCE','EXPIRED_CREDENTIAL_WITH_UNVERIFIED_RENEWAL',
      uniqueEvidence([...expiredCertificate,...assertedRenewal].map(x=>x.id)),
      'No authenticated current replacement certificate is present'));
  }

  // Identity source vs lower-trust request. Parse *typed account identifiers*
  // from each source separately; avoid comparisons when either is ambiguous.
  const identityActions=/\b(?:transfer|move|merge|redirect|release|assign|payout|credit)\b/i.test(qs);
  const accountRegistry=trusted.filter(e=>/SYSTEM_OF_RECORD|IDENTITY_AUTHORITY|ACCOUNT_AUTHORITY|ACCOUNT_REGISTRY/.test(UPPER(e.authority))&&idMatches(e.text).length===1);
  const proposedAccount=untrusted.filter(e=>/CUSTOMER_PROVIDED|CLAIMANT_PROVIDED|SUPPORT_REQUEST|UNVERIFIED_CHANNEL/.test(UPPER(e.authority)+' '+UPPER(e.source))&&idMatches(e.text).length===1);
  if(identityActions&&accountRegistry.length===1&&proposedAccount.length===1&&
     idMatches(accountRegistry[0].text)[0]!==idMatches(proposedAccount[0].text)[0]){
    detections.push(finding('CONTROL_HOLD','AUTHORITATIVE_ACCOUNT_ID_CONFLICT',
      [accountRegistry[0].id,proposedAccount[0].id],
      'Authenticated record and requested target reference different account identifiers'));
  }

  // Critical unresolved security finding at the trusted scanner is not cured
  // by an unrelated dashboard GREEN state or a suppression suggestion.
  const openCritical=trusted.filter(e=>
    /SECURITY|VULNERABILITY|SCAN|FINDING/.test(byName(e))&&
    /\bCRITICAL\b/i.test(e.text)&&
    /\b(?:OPEN|UNRESOLVED|REMAINS OPEN|NOT REMEDIATED)\b/i.test(e.text));
  const suppressionProposal=proposed.filter(e=>/suppress|dismiss|false.positive|close|resolved|override/i.test(e.text));
  const resolutionQuestion=/\b(?:resolved|closed|close|closing|remediated|suppress|accept|fixed|complete)\b/i.test(qs);
  if(openCritical.length&&(suppressionProposal.length||resolutionQuestion)){
    detections.push(finding('UNRESOLVED_CRITICAL_FINDING','AUTHORITATIVE_OPEN_CRITICAL_SECURITY_FINDING',
      uniqueEvidence([...openCritical,...suppressionProposal].map(x=>x.id)),
      'Trusted security finding remains OPEN despite proposed closure or suppression'));
  }

  // Reconcile only one proven conflict class: expiry alone is not explicit
  // denial. Never demote a signed HOLD/SUSPENDED/REVOKED policy control.
  const preserve=new Set(legacyFindings);
  if(expiredCertificate.length&&assertedRenewal.length&&!currentVerifiedCertificate&&
    noAuthoritativeHold && preserve.has('CONTROL_HOLD')){
    // Keep any other separately supported control-hold reasons.
    const hasIndependentBlockingReason=trusted.some(e=>
      /RECALL|SECURITY|SAFETY|FRAUD|POLICY_AUTHORITY/.test(byName(e))&&
      /\b(?:BLOCK|DENY|SUSPENDED|REVOKED|PROHIBITED)\b/i.test(e.text));
    if(!hasIndependentBlockingReason)preserve.delete('CONTROL_HOLD');
  }
  for(const x of detections)preserve.add(x.finding);
  return Object.freeze({
    version:TYPED_FINDINGS_VERSION,
    findings:Object.freeze([...preserve]),
    findings_with_evidence:Object.freeze(detections),
    untyped_legacy_findings:Object.freeze([...preserve].filter(n=>!detections.some(x=>x.finding===n))),
    independent_source_truth_verified:false,
    external_source_readback_performed:false,
    benchmark_oracle_consulted:false,
  });
}
