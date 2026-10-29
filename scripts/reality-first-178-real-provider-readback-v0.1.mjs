// Read-only live GitHub Actions proof for fixed customer issue #178.
// CI identity here is a test fixture, not the owner's authenticated worldline.
// No model, DB write, installation, GitHub mutation or job settlement.
import {observeFirstGapFromGithub,FIRST_GAP_PROOF}
 from '../src/reality-first-gap-handoff-v0.1.js';
const token=String(process.env.GH_PROVIDER_READ_TOKEN||'');
if(token.length<20)throw Error('REALITY_FIRST_GAP_CI_READ_TOKEN_REQUIRED');
const scope={
 owner_id:'CI_FIXTURE_NO_REAL_OWNER',
 goal_id:'CI_FIXTURE_NO_REAL_GOAL',
 original_work_id:'work:'+'e'.repeat(32),
 original_issue_number:178,
 continuity_root_id:'CI_FIXTURE_NO_WORLD',
 worldline_id:'CI_FIXTURE_NO_WORLDLINE',
 goal_transition_receipt_ref:'CI_FIXTURE_NO_REAL_GOAL_TRANSITION',
 goal_evidence_ref:'CI_FIXTURE_NO_USER_MESSAGE',
 environment:'ISOLATED_PREVIEW',user_confirmed:true,
 owner_session_verified:true,goal_current_verified:true,
};
const found=await observeFirstGapFromGithub({scope,apiToken:token});
if(found?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
   found.run_id!==FIRST_GAP_PROOF.run_id||
   found.run_sha!==FIRST_GAP_PROOF.run_head_sha||
   found.provider_receipt_ref!=='github:actions:run:40962921090:job:123760052647'||
   found.installation_authorized!==false||
   found.model_generated!==false||
   found.original_job_settled!==false)
 throw Error('REALITY_FIRST_GAP_CI_INDEPENDENT_READBACK_MISMATCH');
console.log('REALITY_REAL_PROVIDER_GAP_OBSERVED '+JSON.stringify({
 source:'INDEPENDENT_GITHUB_ACTIONS_PROVIDER',
 run_id:found.run_id,source_sha:found.run_sha,
 job_id:found.job_id,log_sha256:found.log_sha256,
 frozen_manifest_sha256:found.manifest_sha256,
 evidence_hash:found.evidence_hash,
 owner_identity:'FIXTURE_ONLY_NOT_REAL_OWNER',
 durable_goal_admitted:false,model_generated:false,
 installation_authorized:false,original_job_settled:false,
}));
