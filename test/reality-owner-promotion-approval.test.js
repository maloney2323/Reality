import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createEvolutionConstitution } from '../src/reality-evolution-constitution-v0.2.js';
import {
  authorizePromotion, canonicalPromotionApprovalMessage,
  PROMOTION_OWNER_APPROVAL_VERSION,
} from '../src/reality-promotion-controller-v0.2.js';

const constitution = createEvolutionConstitution();
const keys = generateKeyPairSync('ed25519');
const trustedPem = keys.publicKey.export({type:'spki',format:'pem'});
const originalEnv = process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY = trustedPem;
process.on('exit',()=>{
  if(originalEnv === undefined) delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  else process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY = originalEnv;
});
const evaluation={passed:true,evidence_digest:'digest:frozen-suite-7'};
const independentVerification={verified:true,independent:true,verification_ref:'readback:case-7'};
const candidate={
  approved:true,promotion_ref:'promotion:case-7',
  candidate_id:'candidate:case-7',capability_signature:'cap-signature:case-7',
  rollbackVersion:'previous-version:case-6',
};

function signedApproval(patch={}) {
  const now=Date.now();
  const approval={
    schema:PROMOTION_OWNER_APPROVAL_VERSION,
    decision:'APPROVE_SHADOW_PROMOTION',
    owner_id:'owner:human-7',
    candidate_id:candidate.candidate_id,
    capability_signature:candidate.capability_signature,
    promotion_ref:candidate.promotion_ref,
    evaluation_digest:evaluation.evidence_digest,
    verification_ref:independentVerification.verification_ref,
    constitution_hash:constitution.constitution_hash,
    release_target:'SHADOW_ONLY',
    issued_at:new Date(now-60_000).toISOString(),
    expires_at:new Date(now+60*60_000).toISOString(),
    nonce:'nonce:case-7',
    ...patch,
  };
  const signature=sign(null,Buffer.from(canonicalPromotionApprovalMessage(approval)),
    keys.privateKey).toString('base64');
  return {...approval,signature};
}
function assess(promotion={...candidate,human_approval:signedApproval()},other={}) {
  return authorizePromotion({
    evaluation,independentVerification,constitution,promotion,...other
  });
}

test('valid Ed25519 approval is restricted to the exact shadow candidate',()=>{
  const outcome=assess();
  assert.equal(outcome.approved,true);
  assert.equal(outcome.state,'shadow');
  assert.equal(outcome.candidate_id,candidate.candidate_id);
  assert.equal(outcome.production_deploy_authorized,false);
  assert.equal(outcome.customer_task_execution_authorized,false);
});
test('untrusted approved:true without actual signed human approval cannot promote',()=>{
  assert.equal(assess(candidate).approved,false);
  assert.equal(assess(candidate).reason,'OWNER_APPROVAL_SCOPE_MISMATCH');
});
test('forged model self-certification cannot become owner approval',()=>{
  const approval=signedApproval();
  approval.signature='AAAA';
  assert.deepEqual(assess({...candidate,human_approval:approval}).reason,'OWNER_SIGNATURE_INVALID');
});
test('tampering with candidate, verification and constitution binds fail closed',()=>{
  for(const patch of [
    {candidate_id:'candidate:other'},
    {capability_signature:'cap-signature:other'},
    {evaluation_digest:'digest:wrong'},
    {verification_ref:'readback:other'},
    {constitution_hash:'constitution:other'},
    {release_target:'PRODUCTION'},
    {promotion_ref:'promotion:other'},
  ]) {
    const approval=signedApproval(patch);
    assert.equal(assess({...candidate,human_approval:approval}).approved,false,JSON.stringify(patch));
  }
});
test('mutating a signed field after signature issuance fails cryptographically',()=>{
  const approval=signedApproval();
  const outcome=assess({...candidate,human_approval:{...approval,nonce:'nonce:tampered'}});
  assert.equal(outcome.reason,'OWNER_SIGNATURE_INVALID');
});
test('expired or excessive approval validity fails closed',()=>{
  const old=new Date(Date.now()-12*60*60_000);
  const approval=signedApproval({
    issued_at:new Date(old.valueOf()-60_000).toISOString(),
    expires_at:old.toISOString()
  });
  assert.equal(assess({...candidate,human_approval:approval}).reason,'OWNER_APPROVAL_EXPIRED_OR_INVALID');
  const tooLong=signedApproval({
    expires_at:new Date(Date.now()+9*24*60*60_000).toISOString()
  });
  assert.equal(assess({...candidate,human_approval:tooLong}).reason,'OWNER_APPROVAL_EXPIRED_OR_INVALID');
});
test('no pinned trusted owner public key fails closed',()=>{
  delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  try {
    assert.equal(assess().reason,'TRUSTED_OWNER_SIGNATURE_REQUIRED');
  } finally {
    process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trustedPem;
  }
});
test('incomplete independent verification or evidence cannot promote',()=>{
  assert.equal(assess(undefined,{independentVerification:{verified:true,independent:false,verification_ref:'readback:case-7'}}).reason,'INDEPENDENT_VERIFICATION_REQUIRED');
  assert.equal(assess(undefined,{independentVerification:{verified:true,independent:true}}).reason,'INDEPENDENT_VERIFICATION_REQUIRED');
  assert.equal(assess(undefined,{evaluation:{passed:true}}).reason,'PROMOTION_EVIDENCE_BINDING_REQUIRED');
});
