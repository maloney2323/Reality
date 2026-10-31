import test from 'node:test';
import assert from 'node:assert/strict';
import {createGovernedSelfImprovement,proposeGovernedCandidate,
 acceptGovernedObservation,recoverGovernedEscalation,verifySelfImprovementJournal}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
const scope={owner_id:'owner:verified',goal_id:'goal:verified',
 original_work_id:'work:9b9578b3c65427589c4c6da68fe0fc87',
 continuity_root_id:'root:verified',worldline_id:'worldline:verified',
 goal_evidence_ref:'user:original',goal_transition_receipt_ref:'goal:transition',
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'kernel:sha'};
const refs=new Map(),n=[0];
const verification=async({receipt,scope_hash})=>{
 const p=refs.get(receipt.evidence_ref);
 return {verified:p===receipt.evidence_hash,independent_provider_readback:true,
  evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
  scope_hash,original_work_id:scope.original_work_id,attestation_ref:'attestor:'+receipt.evidence_ref};
};
const failure=async(state,i)=>{
 const c={rationale:'Correct frozen failure '+i,verification_plan_ref:'frozen:unchanged',
  files:[{path:'src/reality-extensions/replay.mjs',content:'export const i='+i+';'}]};
 state=proposeGovernedCandidate(state,c);
 const ref='provider:sandbox:'+i,hash='sha:provider:'+i;refs.set(ref,hash);
 return acceptGovernedObservation(state,{
  kind:'SANDBOX_FAILED',...Object.fromEntries(['owner_id','goal_id',
   'original_work_id','continuity_root_id','worldline_id'].map(k=>[k,scope[k]])),
  artifact_hash:state.candidate.artifact_hash,
  diagnostics:{code:'TEST_FAILED',output:'not ok 2 - frozen validation mismatch'},
  evidence_ref:ref,evidence_hash:hash,
 },{verifyProvider:verification});
};
const proof=(state,step,ownerConfirmed=false)=>({
 verified:true,independent_provider_readback:true,
 owner_id:scope.owner_id,original_work_id:scope.original_work_id,
 goal_id:scope.goal_id,checkpoint_hash:state.head_hash,
 reservation_id:'database:reservation:'+step,
 checkpoint_receipt_id:'continuity:failed-checkpoint:'+step,
 failure_evidence_ref:state.independent_failure.evidence_ref,
 installation_authorized:false,
 ...(ownerConfirmed?{owner_confirmed:true,
  authorization_scope:'ONE_ORIGINAL178_REDESIGN_ATTEMPT'}:{}),
});
test('recovery at 8/8 requires explicit owner authority and preserves all eight historical failures',async()=>{
 let s=createGovernedSelfImprovement({scope});
 const ref='provider:gap:1';refs.set(ref,'hash:gap:1');
 s=await acceptGovernedObservation(s,{
  kind:'GAP_CONFIRMED',...Object.fromEntries(['owner_id','goal_id','original_work_id',
   'continuity_root_id','worldline_id'].map(k=>[k,scope[k]])),
  capability_id:'reality.ci-failure-evidence-v1',
  failure_refs:['github:run:40962921090'],verification_suite_ref:'suite:frozen',
  evidence_ref:ref,evidence_hash:'hash:gap:1',
 },{verifyProvider:verification});
 for(let i=1;i<=8;i++){
  s=await failure(s,i);
  if([3,5,7].includes(i))
   s=recoverGovernedEscalation(s,proof(s,i));
 }
 assert.equal(s.phase,'ESCALATED');assert.equal(s.attempt_count,8);
 assert.equal(s.attempt_limit,8);
 const historical=structuredClone(s.journal);
 assert.throws(()=>recoverGovernedEscalation(s,proof(s,8)),
  /GOVERNED_RECOVERY_RESERVATION_REQUIRED/);
 assert.throws(()=>proposeGovernedCandidate(s,{rationale:'NO',
  verification_plan_ref:'test',files:[]}),/GAP_OR_REPAIR_REQUIRED/);
 const resumed=recoverGovernedEscalation(s,proof(s,8,true));
 assert.equal(resumed.attempt_limit,9);
 assert.equal(resumed.attempt_count,8);
 assert.equal(resumed.phase,'REPAIR_REQUIRED');
 assert.deepEqual(resumed.journal.slice(0,historical.length),historical);
 assert.equal(resumed.recovery_redesign_authorization.owner_confirmed,true);
 assert.equal(verifySelfImprovementJournal(resumed),true);
 const ninth=await failure(resumed,9);
 assert.equal(ninth.phase,'ESCALATED');assert.equal(ninth.attempt_count,9);
 assert.equal(verifySelfImprovementJournal(ninth),true);
 assert.throws(()=>recoverGovernedEscalation(ninth,proof(ninth,9,true)),
  /EXACT_REPAIRABLE_EXHAUSTION_REQUIRED/);
});
