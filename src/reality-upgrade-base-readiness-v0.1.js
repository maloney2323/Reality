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
 const observed=[];
 for(const path of REQUIRED_UPGRADE_CI_FILES){
  let item;
  try{
   item=await providerGet(ROOT+'/contents/'+path+'?ref='+baseCommitSha);
  }catch{fail('UPGRADE_BASE_REQUIRED_CI_WORKFLOW_UNAVAILABLE')}
  if(item?.type!=='file'||item.path!==path||
    item.encoding!=='base64'||typeof item.content!=='string'||
    item.content.length>200000||!SHA.test(String(item.sha||'')))
   fail('UPGRADE_BASE_CI_WORKFLOW_SOURCE_UNVERIFIED');
  const bytes=Buffer.from(item.content.replace(/\s+/g,''),'base64');
  if(bytes.length<100||bytes.length>120000||bytes.toString('base64')!==
     item.content.replace(/\s+/g,''))
   fail('UPGRADE_BASE_CI_WORKFLOW_BYTES_INVALID');
  const yaml=bytes.toString('utf8');
  if(!acceptable(yaml))fail('UPGRADE_BASE_REQUIRED_CI_TRIGGER_MISSING');
  observed.push(Object.freeze({path,blob_sha:item.sha}));
 }
 return Object.freeze({ready:true,version:UPGRADE_BASE_READINESS_VERSION,
  pinned_base_sha:baseCommitSha,workflows:observed,
  authority_granted:false,github_write_performed:false,
  capability_installed:false,original_job_completed:false});
}
