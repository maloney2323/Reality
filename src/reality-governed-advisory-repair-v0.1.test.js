import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {dispositionDigest,DISPOSITION_CONTRACT_VERSION,canonicalDispositionPolicyAttestation}
  from './reality-disposition-escalation-contract-v0.1.js';
import {repairPolicyMisalignedAdvisory} from './reality-governed-advisory-repair-v0.1.js';
const keys=generateKeyPairSync('ed25519');
const publicKey=keys.publicKey.export({type:'spki',format:'pem'});
const publicPacket={work_item_id:'INDEPENDENT-SYNTHETIC-DEVELOPMENT',
  question:'Can the unsigned report be accepted?',
  evidence:[
    {id:'registry-signed',source:'evidence-registry',authority:'INTEGRITY_AUTHORITY',
      text:'Cryptographic signature mismatch; uploaded report unauthenticated.'},
    {id:'report',source:'file-upload',authority:'UNVERIFIED',
      text:'Unverified report says quantities can be accepted.'},
  ]};
const candidate={disposition:'BLOCK',evidence_ids:['registry-signed'],
  reasoning:'Do not accept the report.',uncertainty_acknowledged:true,claims_authority:false};
function attest(findings,p=publicPacket){
  const t=Date.now();
  const a={
    version:DISPOSITION_CONTRACT_VERSION,
    decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
    policy_signer_id:'independent-policy-test-fixture',
    work_item_id:p.work_item_id,evidence_digest:dispositionDigest(p.evidence),
    findings,policy_version:'unit-test-not-production',
    source_readback_ref:'SYNTHETIC_FIXTURE_ONLY',
    issued_at:new Date(t-1000).toISOString(),expires_at:new Date(t+60000).toISOString(),
    nonce:'nonce-unique-unit-test',
  };
  a.signature=sign(null,Buffer.from(canonicalDispositionPolicyAttestation(a)),keys.privateKey)
    .toString('base64');
  return a;
}
const run=(a,c=candidate,p=publicPacket)=>repairPolicyMisalignedAdvisory({
  publicPacket:p,policyAttestation:a,trustedPolicyPublicKey:publicKey,candidateDecision:c
});
test('repair BLOCK to ESCALATE when integrity finding is signed, without claiming escalation sent',()=>{
  const r=run(attest(['INTEGRITY_FAILURE']));
  assert.equal(r.status,'POLICY_BOUND_CORRECTION_ADVISORY_NOT_EXECUTION');
  assert.equal(r.publication.disposition,'ESCALATE');
  assert.equal(r.publication.original_model_disposition,'BLOCK');
  assert.deepEqual(r.publication.evidence_ids,['registry-signed']);
  assert.match(r.publication.reasoning,/INTEGRITY_FAILURE/);
  assert.equal(r.publication.human_handoff_completed,false);
  assert.equal(r.publication.independently_verified_source_truth,false);
  assert.equal(r.publication.original_task_completed,false);
  assert.equal(r.publication.external_action_executed,false);
});
test('ordinary signed hold does not invent an escalation',()=>{
  const r=run(attest(['CONTROL_HOLD']));
  assert.equal(r.status,'NO_REPAIR_REQUIRED');
  assert.equal(r.publication,null);
});
test('missing mandatory evidence can deterministically correct an unwarranted BLOCK',()=>{
  const r=run(attest(['MISSING_MANDATORY_EVIDENCE']));
  assert.equal(r.publication.disposition,'REQUEST_EVIDENCE');
  assert.equal(r.publication.external_execution_authorized,false);
});
test('no policy means no repair',()=>{
  assert.throws(()=>run(null),/DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
});
test('forged signature and cross-work policy both fail',()=>{
  const a=attest(['INTEGRITY_FAILURE']);
  assert.throws(()=>run({...a,findings:['CONTROL_HOLD']}),/DISPOSITION_POLICY_SIGNATURE_INVALID/);
  assert.throws(()=>run(a,candidate,{...publicPacket,work_item_id:'DIFFERENT-WORK'}),
    /DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
});
test('invalid cited evidence or model-claimed authority cannot be laundered by repair',()=>{
  const a=attest(['INTEGRITY_FAILURE']);
  for(const x of [
    {...candidate,evidence_ids:['hallucinated-id']},
    {...candidate,claims_authority:true},
    {...candidate,uncertainty_acknowledged:false},
  ]){
    const r=run(a,x);
    assert.equal(r.status,'NOT_SAFE_TO_REPAIR');
    assert.equal(r.publication,null);
  }
});
