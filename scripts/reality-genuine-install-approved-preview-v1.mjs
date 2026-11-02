// Owner-approved capability installation. This worker may write only a NEW
// isolated preview branch. It never writes main, changes production, or runs
// untrusted generated code outside a secret-free sandbox.
import {readFileSync,mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const env=process.env;
const fail=x=>{throw Error('REALITY_PREVIEW_INSTALL_'+x)};
const sha=x=>createHash('sha256').update(x).digest('hex');
const repo='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const HASH=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/;
const sorted=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(sorted):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])]));
const github=async(method,path,body)=>{
 const tok=env.REALITY_INSTALL_JOB_GITHUB_TOKEN;
 if(typeof tok!=='string'||tok.length<25)fail('GITHUB_ACTIONS_WRITE_TOKEN_MISSING');
 const response=await fetch('https://api.github.com/repos/'+repo+path,{
  method,redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+tok,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-owner-preview-activation-v1',
   ...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)fail('GITHUB_'+method+'_'+response.status);
 return data;
};
async function signedBroker(body){
 const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL||'');
 u.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const id=await fetch(u,{headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
  cache:'no-store',redirect:'error'});
 if(!id.ok)fail('GITHUB_OIDC_IDENTITY_UNAVAILABLE');
 const jwt=(await id.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fail('GITHUB_OIDC_MISSING');
 const r=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',
 headers:{authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':env.REALITY_INSTALL_JOB_GITHUB_TOKEN},
 body:JSON.stringify(body)});
 const result=await r.json().catch(()=>null);
 if(!r.ok||result?.ok!==true)
  fail('SIGNED_BROKER_'+String(result?.error||'UNAVAILABLE').slice(0,90));
 return result;
}
if(env.GITHUB_ACTIONS!=='true'||!['push','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)||
 env.GITHUB_REPOSITORY!==repo||
 env.GITHUB_REF!=='refs/heads/'+BRANCH||!COMMIT.test(env.GITHUB_SHA))
 fail('EXACT_ISOLATED_WORKFLOW_IDENTITY_REQUIRED');
const prepared=await signedBroker({action:'installer_prepare',
 scope:{repository_sha:env.GITHUB_SHA}});
if(prepared.status==='NO_APPROVED_WORK'){
 if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'installed=false\n');
 console.log('REALITY_OWNER_APPROVAL_NOT_YET_GIVEN_NO_INSTALL');
 process.exit(0);
}
const candidate=prepared.candidate,receipt=prepared.approval_receipt;
if(prepared.status!=='OWNER_APPROVED_CANDIDATE_READY_FOR_ISOLATED_INSTALL'||
 prepared.source_repository_sha!==env.GITHUB_SHA||
 prepared.signed_run_id!==Number(env.GITHUB_RUN_ID)||
 prepared.target_environment!=='ISOLATED_PREVIEW'||
 prepared.original_work_id!==candidate?.original_work_id||
 prepared.artifact_sha256!==candidate?.artifact_sha256||
 receipt?.artifact_sha256!==candidate?.artifact_sha256||
 receipt?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
 receipt?.source_installation_completed!==false||
 !HASH.test(prepared.artifact_sha256)||
 !Array.isArray(candidate.files)||candidate.files.length<2||
 candidate.files.length>12)fail('OWNER_EXACT_INSTALL_CANDIDATE_UNVERIFIED');
const allowed=/^(?:src\/reality-extensions\/[a-zA-Z0-9._/-]+\.mjs|test\/reality-extensions\/[a-zA-Z0-9._/-]+\.test\.(?:js|mjs))$/;
const files=[...candidate.files].sort((a,b)=>String(a.path).localeCompare(String(b.path)));
for(const f of files){
 if(!allowed.test(f.path)||f.path.includes('..')||f.path.includes('//')||
  typeof f.content!=='string'||f.content.length<1||f.content.length>70000)
  fail('MODEL_GENERATED_FILE_SCOPE_UNSAFE');
}
const computed=sha(JSON.stringify(sorted(files.map(f=>({path:f.path,content:f.content})))));
if(computed!==prepared.artifact_sha256)fail('CANDIDATE_BYTES_CHANGED');
const ref=await github('GET','/git/ref/heads/'+BRANCH);
if(ref?.object?.sha!==env.GITHUB_SHA)fail('RUNNER_BASE_BRANCH_MOVED');
const installBranch='feature/reality-qualified-install-'+prepared.artifact_sha256.slice(0,12);
if(installBranch===BRANCH||!/^feature\/reality-qualified-install-[a-f0-9]{12}$/.test(installBranch))
 fail('ISOLATED_BRANCH_INVALID');
const reservation=await signedBroker({action:'installer_reserve',scope:{
 repository_sha:env.GITHUB_SHA,trigger_id:prepared.trigger_id,
 approval_id:prepared.approval_id,artifact_sha256:prepared.artifact_sha256}});
if(reservation.status!=='AUTHORIZED_INSTALL_RESERVATION_CONSUMED_ONCE'||
 reservation.original_work_id!==prepared.original_work_id||
 reservation.run_id!==env.GITHUB_RUN_ID||
 reservation.target_environment!=='ISOLATED_PREVIEW'||
 reservation.installation_verified!==false||
 reservation.original_job_completed!==false||
 reservation.production_changed!==false)
 fail('EXACT_ONE_TIME_APPROVAL_NOT_CONSUMED');
const created=await github('POST','/git/refs',{
 ref:'refs/heads/'+installBranch,sha:env.GITHUB_SHA});
if(created?.ref!=='refs/heads/'+installBranch||
 created?.object?.sha!==env.GITHUB_SHA)
 fail('ISOLATED_BRANCH_CREATION_NOT_VERIFIED');
let commit=env.GITHUB_SHA;
for(const file of files){
 const body={
  message:'Reality verified capability '+prepared.artifact_sha256.slice(0,12)+
   ' (owner-approved isolated source only)',
  branch:installBranch,
  content:Buffer.from(file.content,'utf8').toString('base64')};
 const written=await github('PUT','/contents/'+file.path,body);
 if(!COMMIT.test(written?.commit?.sha))fail('INSTALL_COMMIT_SHA_UNVERIFIED');
 commit=written.commit.sha;
 const read=await github('GET','/contents/'+file.path+'?ref='+installBranch);
 if(read?.path!==file.path||read?.encoding!=='base64'||
  typeof read?.content!=='string'||
  sha(Buffer.from(read.content.replace(/\s/g,''),'base64'))!==sha(file.content))
  fail('GITHUB_INSTALLED_BYTES_READBACK_FAILED');
}
const head=await github('GET','/git/ref/heads/'+installBranch);
if(head?.object?.sha!==commit)
 fail('INSTALL_BRANCH_FINAL_COMMIT_MISMATCH');
const proof={
 schema:'reality-owner-approved-preview-source-install-v1',
 original_work_id:prepared.original_work_id,
 original_trigger_id:prepared.trigger_id,
 approval_id:prepared.approval_id,
 artifact_sha256:prepared.artifact_sha256,
 source_branch:BRANCH,source_sha:env.GITHUB_SHA,
 installed_branch:installBranch,installed_commit_sha:commit,
 source_paths:files.map(f=>f.path),
 file_sha256:files.map(f=>({path:f.path,sha256:sha(f.content)})),
 installer_run_id:env.GITHUB_RUN_ID,
 approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
 source_installation_verified:true,activation_verified:false,
 probation_eligible:false,original_job_completed:false,
 production_changed:false
};
mkdirSync('artifact',{recursive:true});
writeFileSync('artifact/reality-owner-approved-preview-install.json',
 JSON.stringify(proof,null,2)+'\n');
if(env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,'installed=true\n');
console.log('REALITY_OWNER_APPROVED_SOURCE_INSTALLED_ISOLATED',JSON.stringify({
 original_work_id:proof.original_work_id,source_sha:proof.source_sha,
 installed_branch:proof.installed_branch,installed_commit_sha:proof.installed_commit_sha,
 artifact_sha256:proof.artifact_sha256,original_job_completed:false,
 production_changed:false
}));
