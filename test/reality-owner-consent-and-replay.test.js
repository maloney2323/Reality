import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, sign} from 'node:crypto';
import {
  verifyOwnerConsent, consumeOwnerConsentOnce, canonicalOwnerConsentMessage,
  OWNER_CONSENT_SCHEMA, SANDBOX_CONSENT_SCOPE,
} from '../src/reality-owner-consent-boundary-v0.1.js';
import {
  authorizeUpgradeSandbox, promoteVerifiedUpgrade, commitEvolutionLearning
} from '../src/reality-self-evolution-v0.1.js';

const keys=generateKeyPairSync('ed25519');
const previous=process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
const trusted=keys.publicKey.export({format:'pem',type:'spki'});
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trusted;
process.on('exit',()=>previous === undefined
  ? delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY
  : process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=previous);

function signed(subject, nonce='nonce:owner-101', changes={}) {
  const now=Date.now();
  const payload={
    schema:OWNER_CONSENT_SCHEMA,
    owner_id:'human-owner:101',purpose:SANDBOX_CONSENT_SCOPE,
    subject_ref:subject,
    original_task_ref:'original-customer-task:101',
    governance_kernel_ref:'immutable-kernel:101',
    consent_ref:'authorization:101',
    issued_at:new Date(now-1000).toISOString(),
    expires_at:new Date(now+60*60*1000).toISOString(),
    nonce,
    ...changes,
  };
  return {...payload,signature:sign(null,
    Buffer.from(canonicalOwnerConsentMessage(payload)),keys.privateKey).toString('base64')};
}
const expected=()=>{
  ({purpose:SANDBOX_CONSENT_SCOPE,subjectRef:'upgrade-proposal:101',
  originalTaskRef:'original-customer-task:101',
  governanceKernelRef:'immutable-kernel:101',consentRef:'authorization:101'});

test('legacy sandbox never accepts approved:true without signed owner consent',()=>{
  const state={
    state:'UPGRADE_PROPOSED',upgrade_proposal_hash:'upgrade-proposal:101',
    governance_kernel_hash:'immutable-kernel:101',objective:{id:'original-customer-task:101'},
  };
  assert.throws(()=>authorizeUpgradeSandbox({
    evolutionState:state,authorization:{approved:true,authorization_ref:'authorization:101'}
  }),/OWNER_CONSENT_SCOPE_MISMATCH/);
  const authorized=authorizeUpgradeSandbox({
    evolutionState:state,
    authorization:{approved:true,authorization_ref:'authorization:101',
      owner_approval:signed('upgrade-proposal:101')},
  });
  assert.equal(authorized.sandbox_authorization.authorized_by,'human-owner:101');
  assert.equal(authorized.sandbox_authorization.owner_consent_consumed,false);
  assert.equal(authorized.sandbox_authorization.requires_atomic_owner_consent_consumption,true);
});

test('legacy promotion cannot report a capability promoted based on approved:true',()=>{
  const state={
    state:'SANDBOX_VERIFIED',objective:{id:'original-customer-task:101'},
    governance_kernel_hash:'immutable-kernel:101',
    upgrade_verification_hash:'upgrade-verified:101',
    verified_upgrade:{capability_signature:'capability-sig:101',independent_verification_ref:'verified-by:independent:101'},
  };
  const promotion={approved:true,promotion_ref:'authorization:101'};
  assert.throws(()=>promoteVerifiedUpgrade({
    evolutionState:state,promotion
  }),/OWNER_CONSENT_SCOPE_MISMATCH/);
  const plan=promoteVerifiedUpgrade({
    evolutionState:state,promotion:{...promotion,owner_approval:signed('upgrade-verified:101','promotion:101',{
      purpose:'AUTHORIZE_SHADOW_PROMOTION_ONLY'
    })},
  });
  assert.equal(plan.state,'PROMOTION_PENDING');
  assert.equal(plan.promotion.target,'SHADOW_ONLY');
  assert.equal(plan.promotion.owner_consent_consumed,false);
  assert.equal(plan.promotion.requires_atomic_owner_consent_consumption,true);
  assert.throws(()=>commitEvolutionLearning({
    evolutionState:plan,verifiedOutcome:{kind:'VERIFIED_OUTCOME',id:'fake'},
    learningDelta:{learning_delta_id:'delta:101'}
  }),/PROMOTED_UPGRADE_REQUIRED/);
});

test('consent scoped to one original task or one candidate is not transferable',()=>{
  const approval=signed('upgrade-proposal:101');
  for(const patch of [
    {subjectRef:'other-proposal:101'},
    {originalTaskRef:'other-customer:101'},
    {governanceKernelRef:'other-kernel:101'},
    {purpose:'AUTHORIZE_CANONICAL_MERGE'},
  ]) {
    assert.throws(()=>verifyOwnerConsent(approval,{...expected(),...patch}),
      /OWNER_CONSENT_SCOPE_MISMATCH/);
  }
});

test('signature tampering, wrong key, and expiration fail closed',()=>{
  const approval=signed('upgrade-proposal:101');
  assert.throws(()=>verifyOwnerConsent({...approval,nonce:'nonce:modified'},expected()),
    /OWNER_CONSENT_SIGNATURE_INVALID/);
  const expired=signed('upgrade-proposal:101','expired:101',{
    issued_at:new Date(Date.now()-3600000).toISOString(),
    expires_at:new Date(Date.now()-3000000).toISOString(),
  });
  assert.throws(()=>verifyOwnerConsent(expired,expected()),
    /OWNER_CONSENT_EXPIRED_OR_INVALID/);
  const otherKeys=generateKeyPairSync('ed25519');
  const foreign=otherKeys.privateKey;
  const fakeApproval={...approval,signature:sign(null,
    Buffer.from(canonicalOwnerConsentMessage(approval)),foreign).toString('base64')};
  assert.throws(()=>verifyOwnerConsent(fakeApproval,{
    ...expected(),trustedPublicKey:otherKeys.publicKey.export({format:'pem',type:'spki'})
  }), /OWNER_CONSENT_SIGNATURE_INVALID/);
});

test('signed consent is not consumed by mere validation',()=>{
  const result=verifyOwnerConsent(signed('upgrade-proposal:101'),expected());
  assert.equal(result.valid,true);
  assert.equal(result.authorization_consumed,false);
  assert.equal(result.execution_permitted,false);
});

function simulatedStore() {
  // Test-only stand-in for an atomic unique-key insertion. Production
  // deployment MUST use a durable database adapter with equivalent behavior.
  const consumed=new Set();
  return {
    kind:'TRUSTED_DURABLE_OWNER_APPROVAL_STORE',
    async consumeOnce(request) {
      if(consumed.has(request.key)) return {...request,durable:true,atomic:true,
        consumed:false,already_used:true,record_ref:'already-used'};
      consumed.add(request.key);
      return {...request,durable:true,atomic:true,consumed:true,already_used:false,
        record_ref:'synthetic-readback:'+request.key};
    }
  };
}

test('same approval cannot be consumed twice, including concurrent attempts',async()=>{
  const approval=signed('upgrade-proposal:101','unique-consent:101');
  const store=simulatedStore();
  const attempts=await Promise.allSettled(Array.from({length:8},()=>consumeOwnerConsentOnce({
    approval,expected:expected(),approvalStore:store,
  })));
  const successes=attempts.filter(x=>x.status==='fulfilled');
  const refusals=attempts.filter(x=>x.status==='rejected');
  assert.equal(successes.length,1);
  assert.equal(refusals.length,7);
  assert.ok(refusals.every(r=>/OWNER_CONSENT_NOT_ATOMICALLY_CONSUMED/.test(r.reason.message)));
  assert.equal(successes[0].value.operation_completed,false);
  assert.equal(successes[0].value.external_outcome_verified,false);
});

test('missing/untrusted persistence never silently falls back to local memory',async()=>{
  const approval=signed('upgrade-proposal:101');
  await assert.rejects(()=>consumeOwnerConsentOnce({
    approval,expected:expected(),
  }),/DURABLE_APPROVAL_STORE_REQUIRED/);
  await assert.rejects(()=>consumeOwnerConsentOnce({
    approval,expected:expected(),approvalStore:{consumeOnce:async()=>({consumed:true})},
  }),/DURABLE_APPROVAL_STORE_REQUIRED/);
});
