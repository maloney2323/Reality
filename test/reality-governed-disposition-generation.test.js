import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {runGovernedDispositionGeneration} from '../src/reality-governed-disposition-generation-v0.1.js';
import {DISPOSITION_CONTRACT_VERSION,dispositionDigest,canonicalDispositionPolicyAttestation}
  from '../src/reality-disposition-escalation-contract-v0.1.js';

const pair=generateKeyPairSync('ed25519');
process.env.REALITY_DISPOSITION_POLICY_PUBLIC_KEY=pair.publicKey.export({format:'pem',type:'spki'});
function input(finding='AUTHORITATIVE_CONFLICT_REQUIRES_REVIEW'){
  const evidence=[
    {id:'rev-1',authority:'SIGNED_STATE',source:'dev-fixture-provider',text:'Control ledger differs from second independently held value',observed_at:'2026-10-20T10:00:00Z'},
    {id:'rev-2',authority:'SIGNED_STATE',source:'dev-fixture-provider-b',text:'Second authoritative record conflicts with first',observed_at:'2026-10-20T10:05:00Z'},
  ];
  const t=Date.now();
  const att={version:DISPOSITION_CONTRACT_VERSION,decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
    policy_signer_id:'independent-test-signer',work_item_id:'dev-task-random-not-frozen',
    evidence_digest:dispositionDigest(evidence),findings:[finding],policy_version:'dev-policy-v2',
    source_readback_ref:'test-readback:dev-task',issued_at:new Date(t-2000).toISOString(),
    expires_at:new Date(t+600000).toISOString(),nonce:'nonce:dev-only'};
  att.signature=sign(null,Buffer.from(canonicalDispositionPolicyAttestation(att)),pair.privateKey).toString('base64');
  const packet={work_item_id:'dev-task-random-not-frozen',question:'Can this conflicting record be used to close the work?',
    evidence,expected_disposition:'HIDDEN_ANSWER_MUST_NOT_LEAK',oracle_rationale:'NOT_FOR_MODEL'};
  return {packet,att};
}
test('governed generator receives admitted facts only, not hidden benchmark answer or policy label',async()=>{
  const {packet,att}=input();
  let gatewayCalls=0;
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async publicFacts=>{
      gatewayCalls++;
      assert.equal(publicFacts.expected_disposition,undefined);
      assert.equal(publicFacts.oracle_rationale,undefined);
      assert.equal(publicFacts.attestation,undefined);
      assert.equal(publicFacts.evidence[0].observed_at,'2026-10-20T10:00:00Z');
      return {disposition:'ESCALATE',uncertainty_acknowledged:true,
        claims_authority:false,reasoning:'Independent review required.',evidence_ids:['rev-1','rev-2']};
    }}});
  assert.equal(gatewayCalls,1);
  assert.equal(out.status,'ADVISORY_READY_NO_EXTERNAL_COMPLETION');
  assert.equal(out.publication.disposition,'ESCALATE');
  assert.equal(out.publication.next_action,'REQUIRE_VERIFIED_HUMAN_HANDOFF');
  assert.equal(out.publication.human_handoff_completed,false);
  assert.equal(out.external_action_executed,false);
});
test('wrong BLOCK is withheld, never leaked as a public answer',async()=>{
  const {packet,att}=input();
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async()=>({disposition:'BLOCK',uncertainty_acknowledged:true,
      claims_authority:false,reasoning:'Block temporarily.',evidence_ids:['rev-1']})}});
  assert.equal(out.status,'WITHHELD_PENDING_GOVERNED_REVIEW');
  assert.equal(out.publication,null);
  assert.equal(out.assessment_receipt.reason,'ESCALATION_REQUIRED_NOT_MERELY_BLOCK');
  assert.equal(out.customer_work_completed,false);
});
test('invalid policy fails before paid model invocation or release',async()=>{
  const {packet,att}=input();let calls=0;
  await assert.rejects(()=>runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:{...att,evidence_digest:'forged'},
    modelGateway:{generateDisposition:async()=>{calls++;return {disposition:'ESCALATE'};}}
  }),/DISPOSITION_POLICY_SCOPE_OR_FINDINGS_INVALID/);
  assert.equal(calls,0);
});
test('model failure is unresolved and never called a safe completed action',async()=>{
  const {packet,att}=input();
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async()=>{throw Error('mock model timeout');}}});
  assert.equal(out.status,'MODEL_GENERATION_FAILED_UNRESOLVED');
  assert.equal(out.publication,null);
  assert.equal(out.external_action_executed,false);
  assert.equal(out.error_code,'MODEL_PROVIDER_FAILURE');
});
test('ordinary hold returns BLOCK advisory rather than forcing unnecessary escalation',async()=>{
  const {packet,att}=input('CONTROL_HOLD');
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async()=>({disposition:'BLOCK',uncertainty_acknowledged:true,
      claims_authority:false,reasoning:'Control hold remains active.',evidence_ids:['rev-1']})}});
  assert.equal(out.status,'ADVISORY_READY_NO_EXTERNAL_COMPLETION');
  assert.equal(out.publication.next_action,'MAINTAIN_CONTROL_HOLD');
});
test('model cannot claim work completed, add untrusted citations or change disposition after gate',async()=>{
  const {packet,att}=input();
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async()=>({disposition:'ESCALATE',uncertainty_acknowledged:true,
      claims_authority:false,reasoning:'Must be reviewed.',evidence_ids:['rev-2'],
      external_action_executed:true,original_task_completed:true,release_authorized:true})}});
  assert.equal(out.publication.original_task_completed,false);
  assert.equal(out.publication.external_action_executed,false);
  assert.equal(out.publication.claims_authority,false);
  assert.equal(out.customer_work_completed,false);
});


test('signed policy alone cannot publish false completed-action claims in narrative',async()=>{
  const {packet,att}=input('CONTROL_HOLD');
  const out=await runGovernedDispositionGeneration({
    publicPacket:packet,verifiedPolicyAttestation:att,
    modelGateway:{generateDisposition:async()=>({
      disposition:'BLOCK',uncertainty_acknowledged:true,claims_authority:false,
      evidence_ids:['rev-1'],reasoning:'We successfully transferred the money to the payee.'
    })}
  });
  assert.equal(out.status,'WITHHELD_UNSAFE_MODEL_STATEMENT');
  assert.equal(out.publication,null);
  assert.equal(out.customer_work_completed,false);
  assert.ok(out.statement_integrity_receipt.reason_codes.includes('UNVERIFIED_EXTERNAL_EXECUTION_CLAIM'));
});
