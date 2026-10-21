import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import { canonicalOwnerConsentMessage, OWNER_CONSENT_SCHEMA, SANDBOX_CONSENT_SCOPE } from '../src/reality-owner-consent-boundary-v0.1.js';
import {
  detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment,
  authorizeSandboxExperiment,validateSandboxResult,authorizeWorldlineMerge,
  registerVerifiedCapability,canonicalOwnerWorldlineMergeApprovalMessage,
  OWNER_WORLDLINE_MERGE_APPROVAL_VERSION
} from '../src/reality-autonomous-capability-loop-v0.1.js';

const keys=generateKeyPairSync('ed25519');
const oldKey=process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
const trusted=keys.publicKey.export({type:'spki',format:'pem'});
process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trusted;
process.on('exit',()=>{
  if(oldKey===undefined) delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  else process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=oldKey;
});
const detected=detectCapabilityGap({
  consequence:{gap:'MISSING_CAPABILITY',subject:'reader:customer-89'},
  workItem:{id:'work:customer-89',continuity_root_id:'root:89',worldline_id:'world:89'},
});
const confirmed=confirmCapabilityGap(detected,{
  historicalFailureRefs:['fail:89'],verificationSuiteRef:'suite:89',
});
const experiment=createSandboxExperiment({confirmedGap:confirmed,primaryWorldlineId:'world:89'});
const sandboxApproval={
  schema:OWNER_CONSENT_SCHEMA, owner_id:'test-owner', purpose:SANDBOX_CONSENT_SCOPE,
  subject_ref:experiment.experiment_hash, original_task_ref:experiment.original_work_item_id,
  governance_kernel_ref:null, consent_ref:'test-sandbox-auth:89',
  issued_at:new Date(Date.now()-1000).toISOString(), expires_at:new Date(Date.now()+3600000).toISOString(),
  nonce:'sandbox:89',
};
const sandbox=authorizeSandboxExperiment(experiment,{
  authorizationRef:'test-sandbox-auth:89',authorizedBy:'test-owner',
  ownerApproval:{...sandboxApproval,signature:sign(null,
    Buffer.from(canonicalOwnerConsentMessage(sandboxApproval)),keys.privateKey).toString('base64')},
});
const verified=validateSandboxResult(sandbox,{
  synthesizedCapability:{id:'reader:customer-89'},
  frozenRegression:{passed:true},
  isolatedVerification:{verified:true},
  capabilitySignature:'capability-signature:89',
});
function signed(patch={}) {
  const now=Date.now();
  const a={
    schema:OWNER_WORLDLINE_MERGE_APPROVAL_VERSION,
    decision:'APPROVE_CANONICAL_CAPABILITY_MERGE',
    owner_id:'human-owner:89',gap_id:verified.gap_id,
    capability_id:verified.capability_id,
    capability_signature:verified.capability_signature,
    experiment_hash:verified.experiment_hash,
    verification_hash:verified.verification_hash,
    primary_worldline_id:verified.primary_worldline_id,
    ephemeral_worldline_id:verified.ephemeral_worldline_id,
    target:'CANONICAL_CAPABILITY_REGISTRY',
    issued_at:new Date(now-1000).toISOString(),
    expires_at:new Date(now+3600000).toISOString(),
    nonce:'approval:89',
    ...patch,
  };
  return {...a,signature:sign(null,Buffer.from(canonicalOwnerWorldlineMergeApprovalMessage(a)),keys.privateKey).toString('base64')};
}
const verifier=()=>({approved:true});
const plan=(ownerApproval=signed())=>authorizeWorldlineMerge(verified,{ownerApproval,mergeVerifier:verifier});

test('legacy merge refuses a model/caller approved:true without owner consent',()=>{
  assert.throws(()=>authorizeWorldlineMerge(verified,{mergeVerifier:verifier}),
    /WORLDLINE_OWNER_APPROVAL_SCOPE_MISMATCH/);
});
test('separate valid owner approval can create a NON-executing merge proposal',()=>{
  const r=plan();
  assert.equal(r.state,'WORLDLINE_MERGE_PENDING');
  assert.equal(r.production_merge_executed,false);
  assert.equal(r.durable_owner_nonce_consumption_required,true);
  assert.equal(r.independent_merge_readback_required,true);
});
test('an approval for another worldline or another capability is rejected',()=>{
  for(const patch of [{primary_worldline_id:'world:someone-else'},
    {capability_id:'capability:other'},
    {verification_hash:'other'}, {target:'PRODUCTION_DEPLOY'}]){
    assert.throws(()=>plan(signed(patch)),/WORLDLINE_OWNER_APPROVAL_SCOPE_MISMATCH/);
  }
});
test('tampering approval after signing is rejected',()=>{
  const a=signed();a.nonce='tampered';
  assert.throws(()=>plan(a),/WORLDLINE_OWNER_SIGNATURE_INVALID/);
});
test('expired human approval is rejected',()=>{
  const a=signed({
    issued_at:new Date(Date.now()-24*3600000).toISOString(),
    expires_at:new Date(Date.now()-23*3600000).toISOString()
  });
  assert.throws(()=>plan(a),/WORLDLINE_OWNER_APPROVAL_EXPIRED/);
});
test('without pinned owner verification key, merge is blocked',()=>{
  delete process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY;
  try{ assert.throws(()=>plan(),/WORLDLINE_TRUSTED_OWNER_SIGNATURE_REQUIRED/); }
  finally{process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY=trusted;}
});
test('unsigned fake readback cannot register capability',async()=>{
  const proposed=plan();
  let calls=0;
  const registry={register:()=>{calls++;return {registered:true}}};
  await assert.rejects(()=>registerVerifiedCapability(proposed,{
    capabilityRegistry:registry,
    mergeResult:{merged:true},
  }),/WORLDLINE_MERGE_INDEPENDENT_READBACK_REQUIRED/);
  assert.equal(calls,0);
});
test('mismatching provider merge readback is rejected before registry write',async()=>{
  const proposed=plan();
  let calls=0;
  const registry={register:()=>{calls++;return {registered:true}}};
  const base={
    merged:true,independent:true,readback_verified:true,
    verification_hash:proposed.verification_hash,
    capability_id:proposed.capability_id,
    target_worldline_id:proposed.primary_worldline_id,
    provider_execution_id:'provider-exec:89',
    readback_observation_id:'readback:89',
  };
  for(const patch of [
    {verification_hash:'hash:other'},
    {capability_id:'capability:other'},
    {target_worldline_id:'world:other'},
    {readback_verified:false},
    {independent:false},
    {readback_observation_id:''},
  ]) {
    await assert.rejects(()=>registerVerifiedCapability(proposed,{
      capabilityRegistry:registry,
      mergeResult:{...base,...patch}
    }),/WORLDLINE_MERGE_INDEPENDENT_READBACK_REQUIRED/);
  }
  assert.equal(calls,0);
});
test('signed proposal plus bound simulated independent readback admits registry adapter',async()=>{
  const proposed=plan();
  let calls=0;
  const registry={register:(args)=>{
    calls++;
    assert.equal(args.signature,proposed.capability_signature);
    assert.equal(args.worldline_id,proposed.ephemeral_worldline_id);
    return {registered:true,receipt:'unit-test-only'};
  }};
  const simulatedDurableStore={kind:'TRUSTED_DURABLE_OWNER_APPROVAL_STORE',
    consumeOnce:async req=>({...req,durable:true,atomic:true,consumed:true,already_used:false,record_ref:'local-store-receipt:89'})};
  const result=await registerVerifiedCapability(proposed,{
    capabilityRegistry:registry,
    approvalStore:simulatedDurableStore,
    mergeResult:{
      merged:true,independent:true,readback_verified:true,
      verification_hash:proposed.verification_hash,
      capability_id:proposed.capability_id,
      target_worldline_id:proposed.primary_worldline_id,
      provider_execution_id:'provider-exec:89',
      readback_observation_id:'readback:89',
    }
  });
  assert.equal(calls,1);
  assert.equal(result.state,'REGISTERED');
  assert.equal(result.registration.registered,true);
  assert.equal(result.owner_approval_consumption_ref,'local-store-receipt:89');
});
