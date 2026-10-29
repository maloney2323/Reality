import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createGovernedSelfImprovement}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {continueVerifiedRealityUpgrade}
 from '../src/reality-upgrade-discovery-v0.1.js';
const work='work:24cda9611404e9bcb47909976067605c';
const scope={
 owner_id:'owner:reality',goal_id:'goal:original',
 goal_transition_receipt_ref:'universe:verified-goal-event',
 goal_evidence_ref:'universe:verified-user-message',
 original_work_id:work,continuity_root_id:'root:original',
 worldline_id:'worldline:original',target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:immutable-existing-constitution',
};
const discovery=(status='CAPABILITY_GAP_CANDIDATE',cap='reality.missing-instrument')=>({
 status,kind:'MISSING_INSTRUMENT_NEEDS_INDEPENDENT_VERIFICATION',
 needed_upgrade:cap,evidence_refs:['github:independent:failure'],
 original_job_completed:false,capability_installed:false,authorization_granted:false,
 sandbox_executed:false,
});
function harness({confirmedCapability='reality.missing-instrument',verified=true}={}){
 const initial=createGovernedSelfImprovement({scope,attemptLimit:3});
 const source=new Map(),checkpoints=new Map(),models=[],runs=[];
 let n=0;
 function receipt(kind,attrs={},candidate_hash=null){
  const evidence_ref='github:independent:evidence:'+ ++n;
  const evidence_hash='sha256:provider-proof:'+n;
  source.set(evidence_ref,{evidence_hash,candidate_hash,
   scope_hash:initial.scope_hash});
  return {kind,...Object.fromEntries(
   ['owner_id','goal_id','original_work_id','continuity_root_id','worldline_id']
   .map(k=>[k,scope[k]])),
   evidence_ref,evidence_hash,...attrs};
 }
 const adapters={
  async observeMissingCapability(){
   return receipt('GAP_CONFIRMED',{capability_id:confirmedCapability,
    failure_refs:['github:independent:failure'],
    verification_suite_ref:'frozen:regression:suite'});
  },
  async verifyIndependentReceipt({scope_hash,receipt:r,candidate_hash}){
   const p=source.get(r.evidence_ref);
   if(!verified||!p||p.evidence_hash!==r.evidence_hash||
      p.scope_hash!==scope_hash||p.candidate_hash!==candidate_hash)
    return {verified:false};
   return {verified:true,independent_provider_readback:true,
    scope_hash,evidence_ref:r.evidence_ref,evidence_hash:r.evidence_hash,
    original_work_id:r.original_work_id,
    attestation_ref:'provider:readback:'+r.evidence_ref};
  },
  async persistCheckpoint(state){
   checkpoints.set(state.head_hash,state);
   const actual=checkpoints.get(state.head_hash);
   return {persisted:true,independent_readback_verified:actual===state,
    checkpoint_hash:actual.head_hash,original_work_id:work};
  },
  async generateCandidate(ctx){
   models.push(ctx);
   return {rationale:'Propose missing instrument with test',verification_plan_ref:'frozen:regression:suite',
    files:[{path:'src/reality-extensions/capability.js',content:'export const level='+models.length+';'}]};
  },
  async runIsolatedSandbox(ctx){
   runs.push(ctx);
   const success=runs.length>1;
   return receipt(success?'SANDBOX_VERIFIED':'SANDBOX_FAILED',
    {artifact_hash:ctx.artifact_hash,
     independent_tests_passed:success,
     frozen_regression_passed:success,
     governance_preserved:success,
     verifier_run_ref:'github:isolated:sandbox:'+runs.length,
     ...(!success?{diagnostics:{code:'TEST_FAILED',
      output:'AssertionError: not ok 1 - original frozen test'}}:{})},
    ctx.artifact_hash);
  }
 };
 return {initial,adapters,models,runs,source,checkpoints};
}
test('Upgrades category invokes existing driver: gap -> generation -> sandbox failure -> correction -> owner approval',async()=>{
 const h=harness();
 const result=await continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:discovery(),state:h.initial,adapters:h.adapters});
 assert.equal(result.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.phase,'AWAITING_OWNER_APPROVAL');
 assert.equal(result.correction_attempts,2);
 assert.equal(h.models.length,2);
 assert.equal(h.runs.length,2);
 assert.equal(h.models[0].no_execution_authority,true);
 assert.equal(h.models[1].previous_independent_failure.classification.class,'REGRESSION');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.owner_action_required,true);
 assert.equal(result.driver.state.candidate.installed,false);
 assert.equal(result.driver.state.registration,null);
 assert.equal(result.driver.state.settlement,null);
 assert.ok(h.checkpoints.has(result.checkpoint_hash));
});
test('original #143 already corrected -> no fabricated self-upgrade and no codegen',async()=>{
 const h=harness();
 const result=await continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:discovery('NO_NEW_UPGRADE_NEEDED'),state:h.initial,adapters:h.adapters});
 assert.equal(result.status,'NO_UPGRADE_REQUIRED_CONTINUE_ORIGINAL_WORK');
 assert.equal(h.models.length,0);assert.equal(h.runs.length,0);
 assert.equal(result.original_job_completed,false);
});
test('unconfirmed candidate with no trusted adapters cannot generate',async()=>{
 const h=harness();
 await assert.rejects(continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:discovery(),state:h.initial,adapters:{}}),
 /UPGRADE_CONTINUATION_TRUSTED_ADAPTERS_REQUIRED/);
 assert.equal(h.models.length,0);
});
test('independent provider cannot confirm a different capability',async()=>{
 const h=harness({confirmedCapability:'different.capability'});
 await assert.rejects(continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:discovery(),state:h.initial,adapters:h.adapters}),
 /UPGRADE_CONTINUATION_PROVIDER_GAP_NOT_CONFIRMED/);
 assert.equal(h.models.length,0);
});
test('unverified provider evidence never reaches model generation',async()=>{
 const h=harness({verified:false});
 await assert.rejects(continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:discovery(),state:h.initial,adapters:h.adapters}),
 /SELF_IMPROVEMENT_INDEPENDENT_PROVIDER_READBACK_FAILED/);
 assert.equal(h.models.length,0);
});
test('drifted original work and a spoofed settled discovery are rejected',async()=>{
 const h=harness();
 await assert.rejects(continueVerifiedRealityUpgrade({originalWorkId:'work:'+'b'.repeat(32),
  discovery:discovery(),state:h.initial,adapters:h.adapters}),
 /UPGRADE_CONTINUATION_ORIGINAL_WORK_CHANGED/);
 await assert.rejects(continueVerifiedRealityUpgrade({originalWorkId:work,
  discovery:{...discovery(),original_job_completed:true},
  state:h.initial,adapters:h.adapters}),/UPGRADE_CONTINUATION_UNTRUSTED_DISCOVERY/);
 assert.equal(h.models.length,0);
});
test('Upgrades UI reuses the SAME original job and existing approval rather than a new dispatch',()=>{
 const html=readFileSync('index.html','utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length);
 for(const [,body] of scripts)new vm.Script(body);
 assert.match(html,/data-upgrade-original143-continue/);
 assert.match(html,/await wcLoadUnfinishedWork\(\)/);
 assert.match(html,/same\.click\(\); \/\/ existing read-only readiness handler/);
 assert.match(html,/data-original143-prepare/);
 assert.match(html,/ACTIVATE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
 assert.doesNotMatch(html,/id="privateGovernedBuildQueue"/);
});
