// Real Riley code-writer stage for the EXISTING independently verified
// capability pipeline. Not a model executor; no keys reach generated files.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {authorizeRileyCandidateStage,stageRileyVerifiedCandidate}
 from '../src/reality-riley-verified-code-writer-v1.js';

const env=process.env;
const deny=x=>{throw Error('RILEY_VERIFIED_CODE_STAGE_'+x)};
if(env.GITHUB_ACTIONS!=='true'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
 !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||''))
 deny('EXACT_ISOLATED_SIGNED_WORKFLOW_REQUIRED');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const plan=authorizeRileyCandidateStage({
 admission:read('admission/genuine-capability-admitted-queue.json'),
 proposal:read('candidate/genuine-capability-model-proposal.json'),
 proof:read('proof/genuine-capability-sandbox-verification.json'),
 qualification:read('qualified/genuine-capability-owner-review.json'),
 runId:Number(env.GITHUB_RUN_ID),
 baseCommitSha:env.GITHUB_SHA,
 baseBranch:env.GITHUB_REF.slice('refs/heads/'.length)
});
// This credential is granted ONLY to this stage. Model generation and
// untrusted Docker sandboxes run in independent jobs without it.
const staged=await stageRileyVerifiedCandidate({
 plan,token:env.GH_TOKEN
});
if(!['EXACT_VERIFIED_RILEY_CODE_STAGED_IN_ISOLATION',
 'EXACT_VERIFIED_RILEY_CODE_ALREADY_STAGED'].includes(staged.status)||
 staged.original_work_id!==plan.original_work_id||
 staged.artifact_sha256!==plan.artifact_sha256||
 staged.installation_authorized!==false||
 staged.original_job_settled!==false||
 staged.production_changed!==false)
 deny('STAGED_CODE_PROVIDER_RECEIPT_REQUIRED');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/riley-staged-verified-code.json',
 JSON.stringify({
  ...staged,
  run_id:plan.run_id,
  candidate_ticket_hash:read('candidate/genuine-capability-model-proposal.json')
   .ticket.ticket_hash,
  installation_authorized:false,
  owner_installation_pending:true,
  original_job_settled:false,
  production_changed:false
 },null,2)+'\n');
console.log('REALITY_RILEY_VERIFIED_CODE_STAGED',JSON.stringify({
 status:staged.status,original_work_id:staged.original_work_id,
 branch:staged.branch,commit_sha:staged.commit_sha,
 source_files_staged:staged.files.length,
 verified_model_artifact_sha256:staged.artifact_sha256,
 installation_authorized:false,original_job_settled:false,
 production_changed:false
}));
