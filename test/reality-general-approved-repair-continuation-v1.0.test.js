import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGovernedSelfImprovement}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {continueExactlyApprovedGeneralRepair}
 from '../src/reality-general-approved-repair-continuation-v1.0.js';
const owner='11111111-1111-4111-8111-111111111111',
 work='work:'+'a'.repeat(32),goal='verified:owner:goal';
const scope={owner_id:owner,goal_id:goal,
 original_work_id:work,continuity_root_id:'root:verified',
 worldline_id:'worldline:verified',
 goal_transition_receipt_ref:'universe:goal:transition',
 goal_evidence_ref:'supabase:verified:user:message',
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:verified-immutable-policy'};
const state=createGovernedSelfImprovement({scope});
const ticket={owner_id:owner,goal_id:goal,original_work_id:work,
 environment:'ISOLATED_PREVIEW',repository_branch:'feature/reality-general-repair'};
test('no approved candidate means generic installer and settlement cannot run',async()=>{
 let providerCalls=0;
 const provider=async()=>{providerCalls++;throw Error('not allowed')};
 await assert.rejects(continueExactlyApprovedGeneralRepair({
  state,ticket,session:{user_id:owner},db:{strictSecrets:true},
  branch:ticket.repository_branch,writeToken:'unused',
  verifyOwnerApproval:provider,verifyFrozenAcceptance:provider,
  executeOriginalWork:provider,verifyOriginalExecution:provider,
  verifyIndependentReceipt:provider,persistCheckpoint:provider,
 }),/GENERAL_REPAIR_CONTINUATION_SAME_ORIGINAL_OWNER_GOAL_APPROVED_SCOPE_REQUIRED/);
 assert.equal(providerCalls,0);
});
test('postapproval driver carries exact constitution-bound bytes, approval, registry and resumption',()=>{
 const driver=readFileSync('src/reality-governed-self-improvement-driver-v1.0.js','utf8');
 const spine=readFileSync('src/reality-governed-self-improvement-spine-v1.0.js','utf8');
 const bridge=readFileSync('src/reality-general-approved-repair-continuation-v1.0.js','utf8');
 for(const symbol of ['candidate:state.candidate',
  'sandbox_receipt:state.sandbox_receipt',
  'promotion_authorization:state.promotion_authorization',
  'registration:state.registration','resumption:state.resumption'])
  assert.ok(driver.includes(symbol),symbol);
 assert.ok(spine.includes('registration:state.registration,resumption:state.resumption'));
 assert.match(bridge,/installVerifiedGenericPreviewExtension/);
 assert.match(bridge,/createGeneralPreviewCapabilityRegistry/);
 assert.match(bridge,/createGenericVerifiedOriginalWorkSettlement/);
 assert.match(bridge,/continueGovernedSelfImprovement/);
 assert.doesNotMatch(bridge,/#178|ORIGINAL178|work:9b9578b3/);
});
