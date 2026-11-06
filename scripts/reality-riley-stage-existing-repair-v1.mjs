// Credentialed Riley repair stage: exact authenticated owner-job and
// independently-tested candidate artifacts only. This script is not the
// model generator or test runner and must never install into production.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {authorizeRileyExistingRepairStage,stageRileyExistingRepair}
 from '../src/reality-riley-existing-file-repair-writer-v1.js';
const env=process.env;
const deny=x=>{throw Error('RILEY_EXISTING_REPAIR_STAGE_'+x)};
if(env.GITHUB_ACTIONS!=='true'||
 env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
 env.GITHUB_EVENT_NAME!=='push'||
 env.GITHUB_REF!=='refs/heads/fix/reality-chat-fullscreen-verified-cycle-20261105'||
 !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
 !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID||''))
 deny('EXACT_SIGNED_ISOLATED_SOURCE_REQUIRED');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const ticket=read('admission/riley-existing-repair-ticket.json');
const admission=read('admission/riley-existing-repair-admission.json');
const proposal=read('candidate/riley-existing-repair-model-proposal.json');
const proof=read('proof/riley-existing-repair-independent-proof.json');
const qualification=read('qualified/riley-existing-repair-owner-review.json');
const plan=authorizeRileyExistingRepairStage({
 ticket,admission,proposal,proof,qualification,
 runId:Number(env.GITHUB_RUN_ID),
 baseSha:env.GITHUB_SHA,
 baseBranch:env.GITHUB_REF.slice('refs/heads/'.length)
});
const out=await stageRileyExistingRepair({
 plan,token:env.GH_TOKEN
});
if(!['EXACT_RILEY_EXISTING_REPAIR_STAGED_IN_ISOLATION',
 'EXACT_RILEY_REPAIR_ALREADY_STAGED'].includes(out.status)||
 out.original_work_id!==plan.original_work_id||
 out.artifact_sha256!==plan.artifact_sha256||
 out.installation_authorized!==false||
 out.original_job_settled!==false||
 out.production_changed!==false)
 deny('EXACT_PROVIDER_READBACK_REQUIRED');
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/riley-existing-repair-staged.json',
 JSON.stringify({...out,model_generated:true,
  owner_review_required:true,
  original_job_completed:false,
  installation_authorized:false,
  production_changed:false},null,2)+'\n');
console.log('RILEY_EXISTING_SOURCE_REPAIR_STAGED',JSON.stringify({
 status:out.status,branch:out.branch,commit_sha:out.commit_sha,
 original_work_id:out.original_work_id,
 artifact_sha256:out.artifact_sha256,
 owner_review_required:true,
 installation_authorized:false,
 original_job_completed:false,
 production_changed:false
}));
