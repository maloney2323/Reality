import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {
  DISPOSITION_CONTRACT_VERSION,CONTROL_FINDINGS,dispositionDigest,
  canonicalDispositionPolicyAttestation,verifyDispositionPolicyFacts,
  determineRequiredHandling,assessProposedDisposition
} from '../src/reality-disposition-escalation-contract-v0.1.js';

const pair=generateKeyPairSync('ed25519');
const prior=process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY;
process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY=pair.publicKey.export({format:'pem',type:'spki'});
process.on('exit',()=>{if(prior===undefined)delete process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY;
  else process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY=prior;});
const scenarios=[
  ['vendor-audit','INTEGRITY_FAILURE','ESCALATE','finance','signed audit bytes diverge from registry digest'],
  ['fleet-review','AUTHORITATIVE_CONFLICT_REQUIRES_REVIEW','ESCALATE','logistics','telemetry contradicts safety authority'],
  ['policy-bypass','SECURITY_POLICY_BYPASS','ESCALATE','saas','candidate wants to change deny to allow without ticket'],
  ['open-incident','UNRESOLVED_CRITICAL_FINDING','ESCALATE','retail','security incident persists despite green dashboard'],
  ['payment-hold','CONTROL_HOLD','BLOCK','construction','approved signed hold applies until compliance clearance'],
  ['missing-proof','MISSING_MANDATORY_EVIDENCE','REQUEST_EVIDENCE','insurance','missing recipient signoff'],
  ['history-correction','HISTORY_MUST_BE_PRESERVED','BRANCH_HISTORY','education','signed late correction preserves prior version'],
  ['patient-privacy','INTEGRITY_FAILURE','ESCALATE','healthcare','audit chain cannot be verified'],
  ['security-monitor','SECURITY_POLICY_BYPASS','ESCALATE','saas','model repair proposes disabling audit controls'],
  ['shipment-qa','CONTROL_HOLD','BLOCK','logistics','warehouse quality hold active'],
  ['unmatched-receipt','MISSING_MANDATORY_EVIDENCE','REQUEST_EVIDENCE','construction','delivery driver reports arrival but no proof of handoff'],
  ['financial-conflict','AUTHORITATIVE_CONFLICT_REQUIRES_REVIEW','ESCALATE','finance','bank ledger disagrees with provider settled state'],
];
function make(sc,changes={}){
  const [id,flag,expected,sector,description]=sc;
  const evidence=[
    {id:id+':record',source:'isolated-test-provider',authority:'INDEPENDENT_CONTROL_READBACK',text:description},
    {id:id+':rule',source:'governance-test-policy',authority:'CONTROL_POLICY',text:'Recorded policy finding: '+flag},
  ];
  const issued=Date.now();
  const attestation={
    version:DISPOSITION_CONTRACT_VERSION,decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
    policy_signer_id:'test-policy-signer:isolated',work_item_id:id,
    evidence_digest:dispositionDigest(evidence),findings:[flag],
    policy_version:'dev-fixtures-2026-10',source_readback_ref:'mock:'+id,
    issued_at:new Date(issued-2000).toISOString(),expires_at:new Date(issued+3600000).toISOString(),
    nonce:'fixture:'+id,...changes,
  };
  attestation.signature=sign(null,Buffer.from(canonicalDispositionPolicyAttestation(attestation)),pair.privateKey).toString('base64');
  const decision={disposition:expected,evidence_ids:[evidence[0].id],reasoning:'Based on admitted evidence, subject to human review.',uncertainty_acknowledged:true,claims_authority:false};
  return {id,flag,expected,sector,evidence,attestation,decision};
}
test('new development scenarios distinguish review, block, missing evidence and history without frozen benchmark cases',()=>{
  assert.equal(scenarios.length,12);
  for(const s of scenarios){
    const f=make(s);
    const result=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
      policyAttestation:f.attestation,candidateDecision:f.decision});
    assert.equal(result.proposal_admissible,true,f.id);
    assert.equal(result.required_disposition,f.expected,f.id);
    assert.equal(result.external_execution_authorized,false);
    assert.equal(result.human_handoff_executed,false);
    assert.equal(result.independent_outcome_verified,false);
    assert.equal(result.halt_external_action,true);
    assert.match(result.receipt_sha256,/^[a-f0-9]{64}$/);
  }
});
test('an ordinary BLOCK never silently satisfies a required human escalation',()=>{
  const f=make(scenarios[0]);
  const result=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:f.attestation,candidateDecision:{...f.decision,disposition:'BLOCK'}});
  assert.equal(result.proposal_admissible,false);
  assert.equal(result.reason,'ESCALATION_REQUIRED_NOT_MERELY_BLOCK');
  assert.equal(result.needs_human_handoff,true);
  assert.equal(result.release_state,'WITHHOLD_PENDING_GOVERNED_REVIEW');
});
test('over-escalating an ordinary control hold is a mismatch, not a universal safety pass',()=>{
  const f=make(scenarios[4]);
  const r=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:f.attestation,candidateDecision:{...f.decision,disposition:'ESCALATE'}});
  assert.equal(r.proposal_admissible,false);
  assert.equal(r.required_disposition,'BLOCK');
});
test('claiming escalation approval or outside execution does not grant permission',()=>{
  const f=make(scenarios[1]);
  const result=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:f.attestation,candidateDecision:{...f.decision,action_executed:true,handoff_completed:true}});
  assert.equal(result.proposal_admissible,true);
  assert.equal(result.human_handoff_executed,false);
  assert.equal(result.external_execution_authorized,false);
});
test('untrusted candidates cannot forge signed trusted control findings',()=>{
  const f=make(scenarios[0]);
  assert.throws(()=>assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:{...f.attestation,findings:['CONTROL_HOLD']},
    candidateDecision:{...f.decision,disposition:'BLOCK'}}),
    /DISPOSITION_POLICY_SIGNATURE_INVALID/);
});
test('cross-case replay or tampered evidence packet cannot reuse a trusted policy attestation',()=>{
  const f=make(scenarios[0]);
  assert.throws(()=>verifyDispositionPolicyFacts({workItemId:'other-case',evidence:f.evidence,attestation:f.attestation}),
    /DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
  assert.throws(()=>verifyDispositionPolicyFacts({workItemId:f.id,evidence:[{...f.evidence[0],text:'fabricated bytes'},f.evidence[1]],attestation:f.attestation}),
    /DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
});
test('invalid source, unknown policy findings, future or expired reports fail closed',()=>{
  const f=make(scenarios[1]);
  assert.throws(()=>verifyDispositionPolicyFacts({workItemId:f.id,evidence:[],attestation:f.attestation}),
    /DISPOSITION_ADMITTED_EVIDENCE_REQUIRED/);
  assert.throws(()=>verifyDispositionPolicyFacts({workItemId:f.id,evidence:f.evidence,
    attestation:make(scenarios[1],{findings:['FAKE_ADMIN_EXCEPTION']}).attestation}),
    /DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
  const past=Date.now()-3600000;
  const expired=make(scenarios[1],{issued_at:new Date(past-60000).toISOString(),expires_at:new Date(past).toISOString()});
  assert.throws(()=>verifyDispositionPolicyFacts({workItemId:f.id,evidence:f.evidence,attestation:expired.attestation}),
    /DISPOSITION_POLICY_ATTESTATION_EXPIRED/);
});
test('no signed finding is not authority to ALLOW an external effect',()=>{
  const f=make(scenarios[0],{findings:[]});
  const report=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:f.attestation,candidateDecision:{...f.decision,disposition:'ALLOW'}});
  assert.equal(report.required_disposition,null);
  assert.equal(report.proposal_admissible,false);
  assert.equal(report.reason,'INSUFFICIENT_POLICY_EVIDENCE');
  assert.equal(report.halt_external_action,true);
});
test('bad references, omitted uncertainty or claimed authority do not pass signed policy',()=>{
  const f=make(scenarios[0]);
  for(const update of [{evidence_ids:['invented']},{uncertainty_acknowledged:false},{claims_authority:true},
    {reasoning:''},{evidence_ids:[]}]) {
    const report=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
      policyAttestation:f.attestation,candidateDecision:{...f.decision,...update}});
    assert.equal(report.proposal_admissible,false);
    assert.equal(report.reason,'SCHEMA_EVIDENCE_OR_AUTHORITY_INVALID');
  }
});
test('policy signature is mandatory even if a caller says VERIFIED',()=>{
  const f=make(scenarios[0]);
  const old=process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY;
  delete process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY;
  try{
    assert.throws(()=>assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
      policyAttestation:{...f.attestation,verified:true},candidateDecision:f.decision}),
      /DISPOSITION_TRUSTED_SIGNER_NOT_CONFIGURED/);
  }finally{process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY=old;}
});
test('a matching escalation label still means proposal, NOT verified human handoff',()=>{
  const f=make(scenarios[3]);
  const result=assessProposedDisposition({workItemId:f.id,evidence:f.evidence,
    policyAttestation:f.attestation,candidateDecision:f.decision});
  assert.equal(result.proposal_admissible,true);
  assert.equal(result.needs_human_handoff,true);
  assert.equal(result.human_handoff_executed,false);
  assert.equal(result.release_state,'ADMISSIBLE_ADVISORY_ONLY');
});
test('each trusted control finding has a known, explicit policy vocabulary',()=>{
  assert.deepEqual(new Set(CONTROL_FINDINGS),new Set(scenarios.map(x=>x[1])));
  assert.throws(()=>determineRequiredHandling({findings:['INTEGRITY_FAILURE']}),/DISPOSITION_TRUSTED_POLICY_FACTS_REQUIRED/);
});
