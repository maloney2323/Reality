import {createHash} from 'node:crypto';
// Fail closed before consuming the owner's single-use execution reservation.
// GitHub installs extension modules from the pinned preview base. The base
// must ALREADY contain both required exact-commit safety workflows: a passing
// sandbox on a PR branch cannot replace absent CI in its installation base.
// Read only; never patch/move a base branch to make this gate pass.
export const UPGRADE_BASE_READINESS_VERSION='reality-upgrade-base-readiness-v0.1';
const ROOT='/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
export const REQUIRED_UPGRADE_CI_FILES=Object.freeze([
 '.github/workflows/reality-governed-autonomous-upgrade-v01.yml',
 '.github/workflows/reality-governed-execution-engine-v0.1.yml',
]);
const fail=message=>{throw Error(message)};
const acceptable=yaml=>{
 const parts=yaml.split(/^  pull_request:\s*$/m);
 if(parts.length!==2)return false;
 const push=parts[0],pr=parts[1].split(/^jobs:\s*$/m)[0];
 if(!/^on:\s*$/m.test(push)||!/\n  push:\s*\n/.test(push))return false;
 return ["'src/reality-extensions/**'","'test/reality-extensions/**'"]
  .every(glob=>push.includes(glob)&&pr.includes(glob));
};
export async function assertUpgradeBaseReady({
 providerGet,baseCommitSha,
}={}){
 if(typeof providerGet!=='function'||!SHA.test(String(baseCommitSha||'')))
  fail('UPGRADE_BASE_READINESS_TRUSTED_SCOPE_REQUIRED');
 let tree;
 try{
  tree=await providerGet(ROOT+'/git/trees/'+baseCommitSha+'?recursive=1');
 }catch{fail('UPGRADE_BASE_PINNED_GIT_TREE_UNAVAILABLE')}
 if(tree?.truncated!==false||!Array.isArray(tree.tree)||tree.tree.length<1||
    tree.tree.length>15000)
  fail('UPGRADE_BASE_PINNED_GIT_TREE_UNVERIFIED');
 const observed=[];
 for(const path of REQUIRED_UPGRADE_CI_FILES){
  const matches=tree.tree.filter(x=>x?.path===path);
  if(matches.length!==1||matches[0].mode!=='100644'||
     matches[0].type!=='blob'||!SHA.test(String(matches[0].sha||'')))
   fail('UPGRADE_BASE_REQUIRED_CI_WORKFLOW_UNAVAILABLE');
  const expectedBlobSha=matches[0].sha;
  let item;
  try{
   item=await providerGet(ROOT+'/git/blobs/'+expectedBlobSha);
  }catch{fail('UPGRADE_BASE_REQUIRED_CI_WORKFLOW_UNAVAILABLE')}
  if(item?.encoding!=='base64'||typeof item.content!=='string'||
     item.content.length>200000||item.sha!==expectedBlobSha||
     !Number.isSafeInteger(item.size)||item.size<100||item.size>120000)
   fail('UPGRADE_BASE_CI_WORKFLOW_SOURCE_UNVERIFIED');
  const encoded=item.content.replace(/\s+/g,'');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length!==item.size||bytes.toString('base64')!==encoded)
   fail('UPGRADE_BASE_CI_WORKFLOW_BYTES_INVALID');
  const gitBlobHash=createHash('sha1')
   .update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(gitBlobHash!==expectedBlobSha)
   fail('UPGRADE_BASE_CI_WORKFLOW_BLOB_HASH_MISMATCH');
  const yaml=bytes.toString('utf8');
  if(!acceptable(yaml))fail('UPGRADE_BASE_REQUIRED_CI_TRIGGER_MISSING');
  observed.push(Object.freeze({path,blob_sha:expectedBlobSha}));
 }
 return Object.freeze({ready:true,version:UPGRADE_BASE_READINESS_VERSION,
  pinned_base_sha:baseCommitSha,workflows:observed,
  authority_granted:false,github_write_performed:false,
  capability_installed:false,original_job_completed:false});
}
