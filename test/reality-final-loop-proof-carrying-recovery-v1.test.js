import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRecoveryContract,fingerprintRecoveryStrategy,
 decideNextRecoveryTransition,CASE_REPAIR_PROOFS,projectRecoveryContractFromFinalLoop}
 from '../src/reality-final-loop-proof-carrying-recovery-v1.js';
const uid=x=>x.repeat(8)+'-'+x.repeat(4)+'-4'+x.repeat(3)+'-8'+x.repeat(3)+'-'+x.repeat(12);
const sha=x=>'sha256:'+x.repeat(64);
const owner=uid('a'),shift=uid('b'),root=uid('c'),maker=uid('d'),reviewer=uid('e');
const work='work:'+'1'.repeat(32),pr='https://github.com/maloney2323/Reality/pull/307';
const rev='f'.repeat(40);
const obligation={owner_id:owner,shift_id:shift,obligation_id:work,continuity_root_id:root,
 continuity_head_sha256:sha('a'),source_ref:pr,source_revision:rev,
 independent_source_proof_verified:true};
const blocker={classification:'EVIDENCE',kind:'CASE_SPECIFIC_FROZEN_RED_MISSING',
 signature:'MISSING_INDEPENDENT_FROZEN_TEST',target_scope:'ORIGINAL_SOURCE_BOUND_MAINTENANCE',
 evidence_sha256:sha('b'),independent_evidence_observed:true};
const contract=()=>prepareRecoveryContract({obligation,blocker});
const frozen=c=>({status:'RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED',
 contract_id:c.contract_id,contract_fingerprint:c.contract_fingerprint,
 obligation_id:work,continuity_root_id:root,freeze_receipt_sha256:sha('c'),
 independently_observed:true});
const warrant=(effect=null)=>({source:'SIGNED_WARRANT_LEDGER_READBACK',
 valid:true,obligation_id:work,continuity_root_id:root,source_revision:rev,
 warrant_receipt_sha256:sha(effect?'e':'d'),...(effect?{effect}:{})});
const strategy=(hyp='ISOLATED_SOURCE_REPRODUCTION',overrides={})=>({
 capability_id:'RUN_CASE_SPECIFIC_FROZEN_RED',hypothesis_class:hyp,
 target_scope_sha256:sha('f'),source_revision:rev,env_state_hash:sha('1'),
 proposed_changed_files:0,estimated_wall_seconds:30,estimated_cost_units:2,
 isolated_sandbox_verified:true,
 environment_proof:{source:'INDEPENDENT_SIGNED_SOURCE_EPOCH_READBACK',
  independent_verified:true,source_revision:rev,env_state_hash:sha('1'),
  receipt_sha256:sha('2')},...overrides});
const input=(c=contract(),more={})=>{
 const attempts=more.failedAttempts||[];
 const budgetLedger={source:'INDEPENDENT_SIGNED_RECOVERY_BUDGET_LEDGER_READBACK',
  independent_verified:true,contract_id:c.contract_id,obligation_id:work,
  continuity_root_id:root,receipt_sha256:sha('b'),
  total_attempts:attempts.length,
  spent_wall_seconds:attempts.reduce((n,x)=>n+x.wall_seconds,0),
  spent_cost_units:attempts.reduce((n,x)=>n+x.cost_units,0),
  cumulative_touched_files:attempts.reduce((n,x)=>n+x.changed_files,0)};
 return {contract:c,durableFreeze:frozen(c),
  strategy:strategy(),proofReceipts:[],failedAttempts:[],
  budgetLedger,diagnosticWarrant:warrant(),mutationWarrant:null,
  registeredCapabilities:['RUN_CASE_SPECIFIC_FROZEN_RED'],...more};
};
const failed=(c,s,failure_class='WRONG_TARGET')=>({
 contract_id:c.contract_id,obligation_id:work,
 strategy_fingerprint:fingerprintRecoveryStrategy(c,s),failure_class,
 independent_failure_receipt_sha256:sha('9'),
 executor_worker_run_id:maker,verifier_worker_run_id:reviewer,
 independent_failure_verified:true,
 source:'INDEPENDENT_SIGNED_VERIFIER_LEDGER_READBACK',
 wall_seconds:20,cost_units:2,changed_files:0});
const proof=(c,gate,last=null,more={})=>({
 contract_id:c.contract_id,gate,obligation_id:work,continuity_root_id:root,
 source_revision:rev,receipt_sha256:sha(String(CASE_REPAIR_PROOFS.indexOf(gate)+1)),
 artifact_sha256:sha(String(CASE_REPAIR_PROOFS.indexOf(gate)+4)),
 origin_worker_run_id:maker,verifier_worker_run_id:reviewer,
 source:'INDEPENDENT_SIGNED_VERIFIER_LEDGER_READBACK',
 independent_verified:true,proof_delta_verified:true,
 test_reproduces_exact_failure:gate==='RED',
 frozen_red_test_status:gate==='RED'?'FAILED_AS_EXPECTED':null,
 isolated_write_quarantined:gate==='REPAIR_ISOLATED',
 touched_file_count:gate==='REPAIR_ISOLATED'?1:0,
 isolated_candidate_receipt_sha256:sha('a'),
 frozen_red_test_passed_after_repair:gate==='GREEN',
 same_isolated_repair_artifact_sha256:sha('5'),
 regression_isolation_verified:gate==='REGRESSION',
 protected_regression_suite_passed:gate==='REGRESSION',
 canonical_continuity_return_verified:gate==='CONTINUATION',
 independent_next_action_receipt_sha256:sha('8'),
 ...(last?{previous_gate_receipt_sha256:last.receipt_sha256}:{}),...more});
test('contract proposal is deterministic, budget bounded and NEVER a persisted freeze',()=>{
 const c=contract();
 assert.equal(c.contract_id,contract().contract_fingerprint);
 assert.equal(c.ledger_freeze_verified,false);
 assert.equal(c.freeze_state,'CANDIDATE_NOT_DURABLE');
 assert.deepEqual([...c.required_proofs],[...CASE_REPAIR_PROOFS]);
 assert.throws(()=>prepareRecoveryContract({obligation,blocker:{...blocker,
  independent_evidence_observed:false}}));
 assert.throws(()=>prepareRecoveryContract({obligation,blocker,budget:{
  max_attempts:999,max_wall_seconds:30,max_cost_units:5,max_changed_files:1}}));
});
test('signed claim never becomes eligible before matching durable freeze',()=>{
 const c=contract();
 assert.equal(decideNextRecoveryTransition(input(c,{durableFreeze:{
  ...frozen(c),contract_id:sha('0')}})).status,
 'RECOVERY_CONTRACT_NOT_DURABLY_FROZEN');
 const r=decideNextRecoveryTransition(input(c));
 assert.equal(r.status,'RECOVERY_SIGNED_CAPABILITY_CLAIM_ELIGIBLE_NOT_DISPATCHED');
 assert.equal(r.execution_authorized,false);
 assert.equal(r.claim_created,false);
});
test('identical failed strategy is blocked and a distinct hypothesis can pivot',()=>{
 const c=contract(),s=strategy(),old=failed(c,s);
 const blocked=decideNextRecoveryTransition(input(c,{failedAttempts:[old]}));
 assert.equal(blocked.status,'RECOVERY_IDENTICAL_FAILED_STRATEGY_REJECTED');
 assert.equal(blocked.execution_authorized,false);
 const pivot=decideNextRecoveryTransition(input(c,{failedAttempts:[old],
  strategy:strategy('NARROW_CAUSAL_REPRODUCTION')}));
 assert.equal(pivot.status,'RECOVERY_SIGNED_CAPABILITY_CLAIM_ELIGIBLE_NOT_DISPATCHED');
 assert.notEqual(pivot.strategy_fingerprint,old.strategy_fingerprint);
});
test('budget ledger is mandatory and counts previous successful substeps',()=>{
 const c=contract();
 assert.equal(decideNextRecoveryTransition(input(c,{budgetLedger:null})).status,
  'RECOVERY_BUDGET_LEDGER_UNVERIFIED');
 assert.equal(decideNextRecoveryTransition(input(c,{budgetLedger:{
  ...input(c).budgetLedger,total_attempts:3,spent_wall_seconds:100,
  spent_cost_units:20,cumulative_touched_files:0
 }})).status,'RECOVERY_BUDGET_EXHAUSTED');
 assert.equal(decideNextRecoveryTransition(input(c,{budgetLedger:{
  ...input(c).budgetLedger,total_attempts:1,spent_wall_seconds:200,
  spent_cost_units:15,cumulative_touched_files:1
 },strategy:strategy('EXPENSIVE_RETRY',{estimated_cost_units:6})})).status,
  'RECOVERY_PROPOSED_STRATEGY_EXCEEDS_BUDGET');
});

test('hash-only fake environment mutation cannot defeat anti-loop',()=>{
 const c=contract(),s=strategy(),a=failed(c,s);
 const r=decideNextRecoveryTransition(input(c,{failedAttempts:[a],
  strategy:strategy('ISOLATED_SOURCE_REPRODUCTION',{env_state_hash:sha('7')})}));
 assert.equal(r.status,'RECOVERY_ENVIRONMENT_EPOCH_ATTESTATION_REQUIRED');
});
test('old diagnostic, wrong gate, same-worker certification are rejected as proof',()=>{
 const c=contract();
 for(const list of [
  [proof(c,'GREEN')],
  [proof(c,'RED',null,{verifier_worker_run_id:maker})],
  [proof(c,'RED',null,{test_reproduces_exact_failure:false})],
  [proof(c,'RED',null,{independent_verified:false})]
 ]){
  assert.equal(decideNextRecoveryTransition(input(c,{proofReceipts:list})).status,
   'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED');
 }
 const f=failed(c,strategy());f.verifier_worker_run_id=maker;
 assert.equal(decideNextRecoveryTransition(input(c,{failedAttempts:[f]})).status,
  'RECOVERY_FAILED_STRATEGY_LEDGER_UNVERIFIED');
});
test('RED verified before REPAIR, and read-only review does not imply mutation warrant',()=>{
 const c=contract(),red=proof(c,'RED');
 const x=input(c,{proofReceipts:[red],
  strategy:strategy('ISOLATED_REPAIR_FROM_RED',{
   capability_id:'ISOLATED_REPAIR_CANDIDATE',proposed_changed_files:1}),
  registeredCapabilities:['ISOLATED_REPAIR_CANDIDATE']});
 assert.equal(decideNextRecoveryTransition(x).status,
  'RECOVERY_EXACT_MUTATION_WARRANT_REQUIRED');
 const y={...x,mutationWarrant:warrant('ISOLATED_REPAIR_CANDIDATE_ONLY')};
 assert.equal(decideNextRecoveryTransition(y).status,
  'RECOVERY_SIGNED_CAPABILITY_CLAIM_ELIGIBLE_NOT_DISPATCHED');
 assert.equal(decideNextRecoveryTransition({...y,strategy:{...y.strategy,
  isolated_sandbox_verified:false}}).status,'RECOVERY_SANDBOX_QUARANTINE_REQUIRED');
 assert.equal(decideNextRecoveryTransition({...y,mutationWarrant:warrant('GITHUB_PUBLISH')}).status,
  'RECOVERY_EXACT_MUTATION_WARRANT_REQUIRED');
});
test('exhaustion and missing registered capability produce bounded transitions',()=>{
 const c=contract(),s=strategy();
 assert.equal(decideNextRecoveryTransition(input(c,{
  registeredCapabilities:[]})).status,'RECOVERY_CAPABILITY_ACQUISITION_REQUIRED');
 assert.equal(decideNextRecoveryTransition(input(c,{
  failedAttempts:[failed(c,s),failed(c,strategy('ALT_ONE')),failed(c,strategy('ALT_TWO'))],
  strategy:strategy('ALT_THREE')})).status,'RECOVERY_BUDGET_EXHAUSTED');
 assert.equal(decideNextRecoveryTransition(input(c,{failedAttempts:[failed(c,s)],
  strategy:strategy('NEW_ANGLE',{estimated_cost_units:19})})).status,
  'RECOVERY_PROPOSED_STRATEGY_EXCEEDS_BUDGET');
 assert.equal(decideNextRecoveryTransition(input(c,{
  strategy:strategy('NEW_SOURCE',{source_revision:'0'.repeat(40)})})).status,
  'RECOVERY_SOURCE_EPOCH_CHANGED_REFREEZE_REQUIRED');
});
test('fake GREEN or failed protected regression cannot advance proof delta',()=>{
 const c=contract(),red=proof(c,'RED'),repair=proof(c,'REPAIR_ISOLATED',red);
 const green=proof(c,'GREEN',repair,{
  same_frozen_red_artifact_sha256:red.artifact_sha256});
 assert.equal(decideNextRecoveryTransition(input(c,{proofReceipts:[
  red,repair,{...green,frozen_red_test_passed_after_repair:false}]})).status,
  'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED');
 const regress=proof(c,'REGRESSION',green,{protected_regression_suite_passed:false});
 assert.equal(decideNextRecoveryTransition(input(c,{proofReceipts:[
  red,repair,green,regress]})).status,'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED');
 assert.equal(decideNextRecoveryTransition(input(c,{
  proofReceipts:[red],
  strategy:strategy('REPAIR_FROM_RED',{
   capability_id:'ISOLATED_REPAIR_CANDIDATE',proposed_changed_files:0}),
  registeredCapabilities:['ISOLATED_REPAIR_CANDIDATE'],
  mutationWarrant:warrant('ISOLATED_REPAIR_CANDIDATE_ONLY')
 })).status,'RECOVERY_REPAIR_SCOPE_HAS_NO_CHANGED_FILES');
});

test('ordered five-gate proof chain does not itself certify original settlement',()=>{
 const c=contract(),chain=[];
 for(const gate of CASE_REPAIR_PROOFS){
  chain.push(proof(c,gate,chain.at(-1),gate==='GREEN'?{
   same_frozen_red_artifact_sha256:chain[0].artifact_sha256}:{}));
 }
 for(let i=0;i<chain.length;i++){
  const x=decideNextRecoveryTransition(input(c,{proofReceipts:chain.slice(0,i)}));
  assert.equal(x.next_required_proof,CASE_REPAIR_PROOFS[i]);
  assert.equal(x.original_job_completed,false);
 }
 const end=decideNextRecoveryTransition(input(c,{proofReceipts:chain}));
 assert.equal(end.status,'RECOVERY_PROOF_CHAIN_INDEPENDENTLY_RECEIPTED');
 assert.equal(end.parent_settled,false);
 assert.equal(end.original_job_completed,false);
 const altered=chain.map(x=>({...x}));
 altered[3].previous_gate_receipt_sha256=sha('0');
 assert.equal(decideNextRecoveryTransition(input(c,{proofReceipts:altered})).status,
  'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED');
});
test('signed worker can propose contract from original Continuity, never freeze itself',()=>{
 const h={source_ref:pr,original_work_id:work,continuity_identity_verified:true,
  qualifier_digest_verified:true,qualifier_receipt_sha256:sha('b'),
  unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED']};
 const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,shift_id:shift,
  jobs:[{source_ref:pr,original_work_id:work,independent_source_proof_verified:true}]};
 const continuityReturn={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
  owner_id:owner,shift_id:shift,continuity_head_sha256:sha('a'),
  shared_continuity_guard:{status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
   continuity_root_id:root,handoffs:[h]}};
 const stagedRoutes={status:'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',
  routes:[{source_ref:pr,parent_original_work_id:work,source_head_sha:rev}]};
 const ownerPackets={status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
  owner_id:owner,shift_id:shift,packets:[{source_ref:pr,
   parent_original_work_id:work,approved:true}]};
 const r=projectRecoveryContractFromFinalLoop({graph,continuityReturn,
  stagedRoutes,ownerPackets});
 assert.equal(r.status,'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE');
 assert.equal(r.contract_candidate.obligation_id,work);
 assert.equal(r.read_only_review_approved,true);
 assert.equal(r.contract_candidate.ledger_freeze_verified,false);
 assert.equal(r.install_authorized,false);
 assert.equal(projectRecoveryContractFromFinalLoop({graph,continuityReturn,
  stagedRoutes:{...stagedRoutes,routes:[]},ownerPackets}).status,
 'RECOVERY_SOURCE_OR_PARENT_IDENTITY_AMBIGUOUS');
});