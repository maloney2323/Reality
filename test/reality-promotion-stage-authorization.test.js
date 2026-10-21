import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import {
  advancePromotion, canonicalStageAdvanceApprovalMessage,
  PROMOTION_STAGE_APPROVAL_VERSION,
} from '../src/reality-promotion-controller-v0.2.js';

const keys=generateKeyPairSync('ed25519');
const trusted=keys.publicKey.export({type:'spki',format:'pem'});
const previous=process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trusted;
process.on('exit',()=>{
  if(previous===undefined) delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  else process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=previous;
});
const evidence={
  passed:true,independent:true,verification_ref:'readback:stage-17',
  evidence_digest:'sha256:stage-17',observedBenefit:0.2,
};
const scope={
  candidate_id:'candidate:stage-17',
  capability_signature:'signature:stage-17',
  promotion_ref:'promotion:stage-17',
  constitution_hash:'constitution:stage-17',
};
function grant(from='shadow',to='canary',changes={}) {
  const now=Date.now();
  const approval={
    schema:PROMOTION_STAGE_APPROVAL_VERSION,
    decision:'APPROVE_STAGE_TRANSITION',
    owner_id:'human-owner:17',
    ...scope,
    from_state:from,to_state:to,
    evidence_digest:evidence.evidence_digest,
    verification_ref:evidence.verification_ref,
    issued_at:new Date(now-1000).toISOString(),
    expires_at:new Date(now+3600000).toISOString(),
    nonce:'test-nonce-17',
    ...changes,
  };
  return {...scope,human_approval:{
    ...approval,
    signature:sign(null,Buffer.from(canonicalStageAdvanceApprovalMessage(approval)),
      keys.privateKey).toString('base64')
  }};
}

test('legacy passed:true alone cannot advance any stage',()=>{
  for(const state of ['shadow','canary','limited']){
    const r=advancePromotion({currentState:state,evidence});
    assert.equal(r.state,state);
    assert.equal(r.action,'HOLD');
    assert.equal(r.reason,'STAGE_OWNER_APPROVAL_REQUIRED');
  }
});
test('fresh signed consent proposes exact next state, never mutates current state',()=>{
  const r=advancePromotion({currentState:'shadow',evidence,authorization:grant()});
  assert.equal(r.state,'shadow');
  assert.equal(r.action,'AUTHORIZED_TRANSITION_PENDING_EXECUTION');
  assert.equal(r.target_state,'canary');
  assert.equal(r.production_deploy_authorized,false);
  assert.equal(r.customer_task_execution_authorized,false);
  assert.equal(r.durable_nonce_consumption_required,true);
  assert.equal(r.independent_transition_readback_required,true);
});
test('a shadow to canary signature cannot authorize later canary to limited',()=>{
  const r=advancePromotion({currentState:'canary',evidence,authorization:grant()});
  assert.equal(r.reason,'STAGE_OWNER_APPROVAL_REQUIRED');
  assert.equal(r.state,'canary');
});
test('fresh owner signature can authorize proposed canary to limited only',()=>{
  const r=advancePromotion({currentState:'canary',evidence,authorization:grant('canary','limited')});
  assert.equal(r.action,'AUTHORIZED_TRANSITION_PENDING_EXECUTION');
  assert.equal(r.target_state,'limited');
  assert.equal(r.state,'canary');
});
test('general remains terminal for stage advancement',()=>{
  const r=advancePromotion({currentState:'general',evidence,authorization:grant('general','general')});
  assert.equal(r.action,'HOLD');
  assert.equal(r.reason,'ALREADY_GENERAL');
});
test('untrusted score without separate verified evidence is rejected',()=>{
  const r=advancePromotion({currentState:'shadow',evidence:{...evidence,independent:false},authorization:grant()});
  assert.equal(r.reason,'INDEPENDENT_STAGE_EVIDENCE_REQUIRED');
  assert.equal(r.state,'shadow');
});
test('missing evidence digest or readback reference is rejected',()=>{
  for(const patch of [{evidence_digest:null},{verification_ref:null},{passed:false}]){
    const r=advancePromotion({currentState:'shadow',evidence:{...evidence,...patch},authorization:grant()});
    assert.equal(r.action,'HOLD');
    assert.equal(r.reason,'INDEPENDENT_STAGE_EVIDENCE_REQUIRED');
  }
});
test('benefit threshold prevents advancement despite approved upgrade',()=>{
  const r=advancePromotion({currentState:'shadow',evidence,thresholds:{minimumBenefit:.3},authorization:grant()});
  assert.equal(r.reason,'BENEFIT_THRESHOLD_NOT_MET');
});
test('fake nonfinite benefit cannot pass comparison by coercion',()=>{
  for(const val of [undefined,'999999',NaN,Infinity]){
    const r=advancePromotion({currentState:'shadow',evidence:{...evidence,observedBenefit:val},authorization:grant()});
    assert.equal(r.reason,'INVALID_BENEFIT_METRIC');
  }
});
test('a signed approval for another candidate cannot authorize this candidate',()=>{
  const other=grant('shadow','canary',{candidate_id:'candidate:other'});
  const r=advancePromotion({currentState:'shadow',evidence,authorization:other});
  assert.equal(r.reason,'STAGE_OWNER_APPROVAL_REQUIRED');
});
test('tampering with signed nonce is rejected',()=>{
  const proposal=grant();
  proposal.human_approval.nonce='changed-after-sign';
  const r=advancePromotion({currentState:'shadow',evidence,authorization:proposal});
  assert.equal(r.reason,'STAGE_OWNER_SIGNATURE_INVALID');
});
test('expired approval is rejected',()=>{
  const approval=grant('shadow','canary',{
    issued_at:new Date(Date.now()-4*60*60*1000).toISOString(),
    expires_at:new Date(Date.now()-3*60*60*1000).toISOString()
  });
  const r=advancePromotion({currentState:'shadow',evidence,authorization:approval});
  assert.equal(r.reason,'STAGE_OWNER_APPROVAL_EXPIRED');
});
test('no pinned owner public key fails closed',()=>{
  delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  try{
    const r=advancePromotion({currentState:'shadow',evidence,authorization:grant()});
    assert.equal(r.reason,'TRUSTED_STAGE_OWNER_KEY_REQUIRED');
  }finally{
    process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trusted;
  }
});
