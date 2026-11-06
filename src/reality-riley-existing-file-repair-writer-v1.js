// Riley's existing-file repair writer. Separate from the extension-only
// capability writer. Stages a pinned existing src file + a NEW regression
// test on a unique isolated Git branch. It is never an installation.
import {createHash} from 'node:crypto';
export const RILEY_EXISTING_REPAIR_VERSION='reality-riley-existing-repair-writer-v1';
const REPO='maloney2323/Reality';
const BASE='fix/reality-chat-fullscreen-verified-cycle-20261105';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const sourcePath=p=>typeof p==='string'&&
 /^src\/[a-zA-Z0-9._/-]+\.(?:js|mjs)$/.test(p)&&
 !p.includes('//')&&!p.split('/').includes('..')&&!p.split('/').includes('.')&&
 !p.includes('/node_modules/')&&!p.startsWith('src/reality-extensions/');
const regressionPath=p=>typeof p==='string'&&
 /^test\/reality-riley-repairs\/[a-zA-Z0-9._-]+\.test\.(?:js|mjs)$/.test(p)&&
 !p.includes('..');
const deny=x=>{throw Error('RILEY_EXISTING_REPAIR_'+x)};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const gitBlob=x=>{
 const data=Buffer.from(x,'utf8');
 return createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
};
const trustedPlans=new WeakSet();
const branchName=(work,artifact)=>
 'reality/riley/repair-'+work.slice(5,17)+'-'+artifact.slice(0,12);
export function authorizeRileyExistingRepairStage({
 ticket,admission,proposal,proof,qualification,runId,baseSha,
 baseBranch=BASE
}={}){
 if(!Number.isSafeInteger(runId)||runId<1||
  !SHA40.test(baseSha||'')||baseBranch!==BASE||
  ticket?.schema!=='reality-riley-existing-source-repair-v1'||
  ticket.repository!=='maloney2323/Reality'||
  ticket.repository_branch!==BASE||ticket.repository_base_sha!==baseSha||
  !UUID.test(ticket.owner_id||'')||
  !WORK.test(ticket.original_work_id||'')||
  !Number.isSafeInteger(ticket.issue_number)||ticket.issue_number<1||
  ticket.issue_url!=='https://github.com/'+REPO+'/issues/'+ticket.issue_number||
  !ticket.goal_transition_receipt_ref||
  !ticket.continuity_root_id||!ticket.worldline_id||
  !sourcePath(ticket.existing_source_path)||
  !SHA40.test(ticket.existing_source_blob_sha||'')||
  !/^test\/reality-frozen-regressions\/[a-zA-Z0-9._-]+\.test\.js$/.test(
   ticket.frozen_test_path||'')||
  !SHA64.test(ticket.frozen_test_sha256||'')||
  !Number.isSafeInteger(ticket.failed_provider_run_id)||
  ticket.failed_provider_run_id<1)
  deny('PINNED_OWNER_SOURCE_TICKET_REQUIRED');
 if(admission?.status!=='CURRENT_OWNER_ORIGINAL_JOB_INDEPENDENTLY_QUALIFIED'||
  admission.owner_id!==ticket.owner_id||
  admission.original_work_id!==ticket.original_work_id||
  admission.source_issue_number!==ticket.issue_number||
  admission.goal_transition_receipt_ref!==ticket.goal_transition_receipt_ref||
  admission.installation_authorized!==false||
  admission.original_job_completed!==false||
  admission.production_changed!==false||
  proposal?.source!=='REAL_OPENAI_MODEL_GENERATION'||
  proposal.original_work_id!==ticket.original_work_id||
  !/^resp_[a-zA-Z0-9_-]{4,150}$/.test(proposal.model_response_id||'')||
  !Array.isArray(proposal.files)||proposal.files.length!==2||
  proposal.installation_authorized!==false||
  proposal.original_job_completed!==false)
  deny('EXACT_OWNER_GENERATED_REPAIR_REQUIRED');
 const files=proposal.files;
 if(files[0]?.path!==ticket.existing_source_path||
  !regressionPath(files[1]?.path)||
  files.some(f=>typeof f.content!=='string'||f.content.length<1||
   f.content.length>70000)||
  gitBlob(files[0].content)===ticket.existing_source_blob_sha||
  proposal.artifact_sha256!==digest(files))
  deny('EXACT_REPAIR_AND_NEW_TEST_BYTES_REQUIRED');
 if(proof?.schema!=='reality-riley-existing-source-repair-proof-v1'||
  proof.github_run_id!==runId||
  proof.runner_git_sha!==baseSha||
  proof.original_work_id!==ticket.original_work_id||
  proof.owner_id!==ticket.owner_id||
  proof.source_issue_number!==ticket.issue_number||
  proof.existing_source_blob_sha!==ticket.existing_source_blob_sha||
  proof.frozen_test_sha256!==ticket.frozen_test_sha256||
  proof.frozen_test_path!==ticket.frozen_test_path||
  proof.candidate_artifact_sha256!==proposal.artifact_sha256||
  proof.model_response_id!==proposal.model_response_id||
  proof.runner_isolation!=='DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'||
  proof.passed!==true||
  proof.frozen_result?.exit_code!==0||proof.frozen_result?.fail!==0||
  !Number.isInteger(proof.frozen_result?.tests)||proof.frozen_result.tests<1||
  proof.candidate_result?.exit_code!==0||proof.candidate_result?.fail!==0||
  !Number.isInteger(proof.candidate_result?.tests)||proof.candidate_result.tests<1||
  proof.installation_authorized!==false||
  proof.production_changed!==false||
  proof.original_job_completed!==false)
  deny('INDEPENDENT_FROZEN_REPAIR_PROOF_REQUIRED');
 if(qualification?.status!=='AWAITING_EXACT_OWNER_INSTALL_APPROVAL'||
  qualification.owner_id!==ticket.owner_id||
  qualification.original_work_id!==ticket.original_work_id||
  qualification.artifact_sha256!==proposal.artifact_sha256||
  qualification.frozen_test_sha256!==ticket.frozen_test_sha256||
  !SHA64.test(qualification.pre_state_hash||'')||
  !SHA64.test(qualification.post_state_hash||'')||
  qualification.installation_authorized!==false||
  qualification.original_job_completed!==false||
  qualification.production_changed!==false)
  deny('DURABLE_OWNER_REVIEW_REQUIRED');
 const plan=Object.freeze({
  version:RILEY_EXISTING_REPAIR_VERSION,
  base_sha:baseSha,base_branch:BASE,
  branch:branchName(ticket.original_work_id,proposal.artifact_sha256),
  owner_id:ticket.owner_id,original_work_id:ticket.original_work_id,
  issue_number:ticket.issue_number,
  source_blob_sha:ticket.existing_source_blob_sha,
  artifact_sha256:proposal.artifact_sha256,
  files:Object.freeze(files.map(f=>Object.freeze({
   path:f.path,content:f.content}))),
  installation_authorized:false,original_job_settled:false,
  production_changed:false
 });
 trustedPlans.add(plan);
 return plan;
}
export async function stageRileyExistingRepair({
 plan,token,fetchImpl=fetch
}={}){
 if(!plan||!trustedPlans.has(plan)||
  plan.version!==RILEY_EXISTING_REPAIR_VERSION||
  plan.base_branch!==BASE||!SHA40.test(plan.base_sha||'')||
  !WORK.test(plan.original_work_id||'')||
  !SHA64.test(plan.artifact_sha256||'')||
  plan.branch!==branchName(plan.original_work_id,plan.artifact_sha256)||
  !Array.isArray(plan.files)||plan.files.length!==2||
  !sourcePath(plan.files[0].path)||
  !regressionPath(plan.files[1].path)||
  gitBlob(plan.files[0].content)===plan.source_blob_sha||
  digest(plan.files)!==plan.artifact_sha256||
  plan.installation_authorized!==false||
  plan.original_job_settled!==false||
  plan.production_changed!==false||
  typeof token!=='string'||token.length<25||
  typeof fetchImpl!=='function')
  deny('TRUSTED_STAGE_PLAN_AND_CREDENTIAL_REQUIRED');
 async function git(path,{method='GET',body,missing=false}={}){
  const r=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method,cache:'no-store',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    authorization:'Bearer '+token,
    'content-type':'application/json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-Riley-Existing-Source-Repair-v1'},
   signal:AbortSignal.timeout(15000),
   body:body===undefined?undefined:JSON.stringify(body)
  });
  if(r.status===404&&missing)return null;
  if(!r.ok)deny('GITHUB_PROVIDER_EFFECT_UNKNOWN');
  const out=await r.json().catch(()=>null);
  if(!out||typeof out!=='object')deny('GITHUB_READBACK_INVALID');
  return out;
 }
 const head=await git('/git/ref/heads/'+BASE);
 if(head?.object?.sha!==plan.base_sha)deny('BASE_BRANCH_DRIFT');
 const base=await git('/git/commits/'+plan.base_sha);
 if(base?.sha!==plan.base_sha||!SHA40.test(base.tree?.sha||''))
  deny('PINNED_BASE_TREE_REQUIRED');
 const tree=await git('/git/trees/'+base.tree.sha+'?recursive=1');
 if(tree?.sha!==base.tree.sha||tree.truncated!==false||
  !Array.isArray(tree.tree))deny('COMPLETE_BASE_TREE_REQUIRED');
 const existing=tree.tree.filter(x=>x.path===plan.files[0].path);
 if(existing.length!==1||existing[0].type!=='blob'||
  existing[0].sha!==plan.source_blob_sha||
  tree.tree.some(x=>x.path===plan.files[1].path))
  deny('SOURCE_CHANGED_OR_REGRESSION_TEST_ALREADY_EXISTS');
 const ref='/git/ref/heads/'+plan.branch;
 const already=await git(ref,{missing:true});
 if(already){
  if(!SHA40.test(already.object?.sha||''))
   deny('EXISTING_BRANCH_READBACK_INVALID');
  const commit=await git('/git/commits/'+already.object.sha);
  if(commit?.sha!==already.object.sha||
    commit.parents?.length!==1||
    commit.parents[0].sha!==plan.base_sha)
   deny('EXISTING_BRANCH_DRIFT');
  const staged=await git('/git/trees/'+commit.tree.sha+'?recursive=1');
  if(staged?.truncated!==false||!Array.isArray(staged.tree)||
   plan.files.some(file=>staged.tree.filter(x=>x.path===file.path&&
     x.sha===gitBlob(file.content)).length!==1))
   deny('EXISTING_BRANCH_CONTENT_CHANGED');
  return Object.freeze({status:'EXACT_RILEY_REPAIR_ALREADY_STAGED',
   branch:plan.branch,commit_sha:commit.sha,
   original_work_id:plan.original_work_id,
   artifact_sha256:plan.artifact_sha256,already_staged:true,
   installation_authorized:false,original_job_settled:false,
   production_changed:false});
 }
 const createdTree=await git('/git/trees',{method:'POST',
  body:{base_tree:base.tree.sha,tree:plan.files.map(file=>({
   path:file.path,mode:'100644',type:'blob',content:file.content
  }))}});
 if(!SHA40.test(createdTree?.sha||''))deny('TREE_WRITE_UNVERIFIED');
 const commit=await git('/git/commits',{method:'POST',body:{
  message:'Riley: independently verified uninstalled repair '+plan.original_work_id,
  tree:createdTree.sha,parents:[plan.base_sha]
 }});
 if(!SHA40.test(commit?.sha||'')||
  commit.tree?.sha!==createdTree.sha||
  commit.parents?.length!==1||
  commit.parents[0].sha!==plan.base_sha)
  deny('COMMIT_WRITE_UNVERIFIED');
 const created=await git('/git/refs',{method:'POST',body:{
  ref:'refs/heads/'+plan.branch,sha:commit.sha
 }});
 if(created?.ref!=='refs/heads/'+plan.branch||
  created.object?.sha!==commit.sha)
  deny('ISOLATED_BRANCH_WRITE_UNVERIFIED');
 const confirmed=await git(ref);
 if(confirmed.object?.sha!==commit.sha)
  deny('ISOLATED_BRANCH_FINAL_READBACK_REQUIRED');
 const finalTree=await git('/git/trees/'+commit.tree.sha+'?recursive=1');
 if(finalTree?.truncated!==false||!Array.isArray(finalTree.tree)||
  plan.files.some(file=>finalTree.tree.filter(x=>
   x.path===file.path&&x.sha===gitBlob(file.content)).length!==1))
  deny('FINAL_STAGED_SOURCE_BYTES_UNVERIFIED');
 return Object.freeze({
  status:'EXACT_RILEY_EXISTING_REPAIR_STAGED_IN_ISOLATION',
  branch:plan.branch,commit_sha:commit.sha,
  original_work_id:plan.original_work_id,
  source_path:plan.files[0].path,
  regression_test_path:plan.files[1].path,
  artifact_sha256:plan.artifact_sha256,
  already_staged:false,installation_authorized:false,
  original_job_settled:false,production_changed:false
 });
}