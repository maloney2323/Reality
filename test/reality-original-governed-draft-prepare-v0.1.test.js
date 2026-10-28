import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {prepareOriginalGovernedDraft}
 from '../src/reality-original-governed-draft-prepare-v0.1.js';
import {verifyPersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
const WORK='work:24cda9611404e9bcb47909976067605c';
const HASH='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';
const BASE='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const KEY='test-only-private-original-draft-proof-key-1234567890';
const fixture=()=>{
 const ownerId=randomUUID(),conversationId=randomUUID();
 const files=JSON.parse(readFileSync('evidence/reality-original-executor-model-20261028/package.json','utf8')).files;
 const state={
  principal_id:ownerId,continuity_root_id:'original-root',world_id:'original-world',
  authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,transition_count:1,
  active_goal_id:'user-goal:confirmed-original',
  active_goal:{goal_id:'user-goal:confirmed-original',status:'ACTIVE',
   user_confirmed:true,external_execution_authorized:false,
   source_user_message_ref:'user-message:original',
   last_transition_receipt_id:'goal-transition:original'},
  recent_transition_receipts:[{event_id:'goal-transition:original',
   confirmed_by_user:true,principal_id:ownerId}],
 };
 const trusted={original_work_id:WORK,owner_id:ownerId,conversation_id:conversationId,
  persisted_and_reobserved:true,verified_not_authorized:true,
  external_action_authorized:false,original_job_completed:false,
  original_goal_id:state.active_goal_id,
  goal_revision:state.active_goal.last_transition_receipt_id,
  candidate_hash:HASH,
  warrant_receipt_id:randomUUID(),
  evidence_warrant_id:'warrant:'+'9'.repeat(64),
  evidence_warrant:{warrant_id:'warrant:'+'9'.repeat(64),candidate_sha256:HASH,
   pinned_base_commit_sha:BASE},
  originalWorkItem:{id:WORK,continuity_root_id:'original-root',
   worldline_id:'original-world',status:'BLOCKED'},
  verifiedExperiment:{
   state:'SANDBOX_VERIFIED',work_item_id:WORK,
   continuity_root_id:'original-root',worldline_id:'original-world',
   production_graph_write_permitted:false,
   verification_hash:'a'.repeat(64),
   frozen_historical_failure_refs:['original-real-github-failure'],
   capability_id:'reality.original-repair-execution',
   gap_id:'original-executor-gap',ephemeral_worldline_id:'worldline:ephemeral:'+'e'.repeat(32),
   capability_contract:{verification_suite_ref:'test/reality-original-executor-autonomous-grader-v0.1.test.mjs'},
   verification_bundle:{frozen_regression:{passed:true},
    isolated_verification:{verified:true},synthesized_capability:{files}},
  },
 };
 const env={VERCEL_ENV:'preview',REALITY_CHAT_RECEIPT_HMAC_KEY:KEY};
 const session={user_id:ownerId};
 return {session,conversationId,originalWorkId:WORK,env,
  loadTrusted:async()=>trusted,
  readGoal:async()=>({principal_id:ownerId,conversation_id:conversationId,state}),
  getBase:async()=>({ref:'refs/heads/experiment/reality-live-durable-adversarial-20261025',
   object:{sha:BASE}}),trusted,state};
};
test('verified owner warrant can PREPARE exact two-file draft but never approves or writes GitHub',async()=>{
 const x=fixture();const d=await prepareOriginalGovernedDraft(x);
 assert.equal(d.status,'AWAITING_EXACT_GOVERNED_DRAFT_OWNER_APPROVAL');
 assert.equal(d.stage,'DRAFT');
 assert.equal(d.original_work_id,WORK);
 assert.equal(d.expected_candidate_hash,HASH);
 assert.equal(d.warrant_id,x.trusted.evidence_warrant_id);
 assert.equal(d.target_repository,'maloney2323/Reality');
 assert.equal(d.work_item.operation,'create_isolated_upgrade_pr');
 assert.equal(d.work_item.inputs.candidate_paths.length,2);
 assert.equal(d.work_item.inputs.production_merge_permitted,false);
 assert.equal(d.external_action_performed,false);
 assert.equal(d.approval_recorded,false);
 assert.equal(d.draft_pr_created,false);
 assert.equal(d.github_draft_dispatch_configured,false);
 assert.equal(d.installation_authorized,false);
 const proof=verifyPersonalWorkGroundingProof({proof:d.grounding_proof,
  conversationId:x.conversationId,principalId:x.session.user_id,env:x.env});
 assert.equal(proof.status,'PROOF_VALID_FOR_FRESHNESS_ONLY');
});
test('wrong original job blocks before trusted readback',async()=>{
 const x=fixture();let calls=0;
 x.originalWorkId='work:'+'f'.repeat(32);
 x.loadTrusted=async()=>{calls++;throw Error('MUST_NOT_BE_CALLED')};
 await assert.rejects(prepareOriginalGovernedDraft(x),/ORIGINAL_DRAFT_AUTHENTICATED_EXACT_PREVIEW_WORK_REQUIRED/);
 assert.equal(calls,0);
});
test('wrong candidate, stale signed base, missing goal scope fail closed before approval',async()=>{
 const a=fixture();a.trusted.candidate_hash='f'.repeat(64);
 await assert.rejects(prepareOriginalGovernedDraft(a),/ORIGINAL_DRAFT_REAL_SIGNED_WARRANT_REQUIRED/);
 const b=fixture();b.getBase=async()=>({ref:'refs/heads/experiment/reality-live-durable-adversarial-20261025',
  object:{sha:'f'.repeat(40)}});
 await assert.rejects(prepareOriginalGovernedDraft(b),/ORIGINAL_DRAFT_SIGNED_GITHUB_BASE_CHANGED/);
 const c=fixture();c.readGoal=async()=>({principal_id:c.session.user_id,conversation_id:c.conversationId,
  state:{...c.state,active_goal_id:'another-goal'}});
 await assert.rejects(prepareOriginalGovernedDraft(c),/ORIGINAL_DRAFT_OWNER_GOAL_REVISION_CHANGED/);
});
