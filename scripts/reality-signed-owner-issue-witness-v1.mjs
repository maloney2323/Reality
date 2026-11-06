// True read-only GitHub provenance -> signed broker -> isolated durable issue witness.
// Never binds to a personal owner or authorizes a capability installation.
import {mkdirSync,writeFileSync} from 'node:fs';
import {verifyRealMissingRepairIssue} from '../src/reality-real-repair-opportunity-intake-v1.0.js';
const env=process.env;
function fail(x){throw Error('OWNER_ISSUE_WITNESS_'+x)}
if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  env.GITHUB_REF!=='refs/heads/feature/reality-general-capability-engine-20261101'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !/^[1-9]\d{5,18}$/.test(env.GITHUB_RUN_ID||'')||
  !env.ACTIONS_ID_TOKEN_REQUEST_URL||
  !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||
  !env.GH_TOKEN)
 fail('EXACT_SIGNED_ISOLATED_WORKER_REQUIRED');
const headers={accept:'application/vnd.github+json',
 'x-github-api-version':'2022-11-28','user-agent':'Reality-signed-owner-witness-v1',
 authorization:'Bearer '+env.GH_TOKEN};
const issuesResponse=await fetch('https://api.github.com/repos/maloney2323/Reality/issues?state=open&per_page=70',{
 redirect:'error',cache:'no-store',headers});
if(!issuesResponse.ok)fail('CURRENT_GITHUB_ISSUES_PROVIDER_READBACK_'+issuesResponse.status);
const issues=await issuesResponse.json();
if(!Array.isArray(issues)||issues.length>70)fail('ISSUE_PROVIDER_RESPONSE_INVALID');
const matches=issues.filter(x=>!x.pull_request&&
 typeof x.body==='string'&&
 x.body.includes('src/reality-extensions/')&&
 x.body.includes('test/reality-frozen-regressions/')).slice(0,8);
const tokenUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
tokenUrl.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
const idResponse=await fetch(tokenUrl,{cache:'no-store',redirect:'error',
 headers:{authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
if(!idResponse.ok)fail('SIGNED_GITHUB_OIDC_NOT_AVAILABLE');
const jwt=(await idResponse.json()).value;
if(typeof jwt!=='string'||jwt.length<300)fail('OIDC_IDENTITY_NOT_SIGNED');
const verified=[];
for(const issue of matches){
 let proof;
 try{
  proof=await verifyRealMissingRepairIssue({issueNumber:issue.number,
   env:{REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:env.GH_TOKEN}});
 }catch(e){
  console.log('OWNER_WITNESS_ISSUE_NOT_QUALIFIED',issue.number,
   String(e?.message||'READBACK_NOT_VERIFIED').slice(0,90));
  continue;
 }
 if(proof?.independently_verified!==true||
    proof?.original_provider_failed_job_id<1||
    proof?.installation_authorized!==false)
  continue;
 const response=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit',{
 method:'POST',redirect:'error',cache:'no-store',headers:{
  authorization:'Bearer '+jwt,
  'content-type':'application/json',
  'x-reality-github-provider-token':env.GH_TOKEN
 },body:JSON.stringify({
   action:'owner_source_attest',
   scope:{repository_sha:env.GITHUB_SHA},
   proof
 })});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.ok!==true||
    result?.status!=='SIGNED_PROVIDER_WITNESS_VERIFIED'||
    result?.issue_number!==issue.number||
    result?.signed_witness_run_id!==Number(env.GITHUB_RUN_ID)||
    result?.original_provider_failed_run_id!==proof.original_provider_failed_run_id||
    result?.installation_authorized!==false||
    result?.production_changed!==false)
  fail('SIGNED_PROVIDER_DATABASE_ADMISSION_'+issue.number+'_'+String(result?.error||'UNVERIFIED').slice(0,90));
 verified.push({issue_number:proof.issue_number,failed_run:proof.original_provider_failed_run_id,
  source_sha:proof.source_sha,frozen_test_sha256:proof.frozen_test_sha256,
  status:'AWAITING_OWNER_SIGNED_INVESTIGATION',installation_authorized:false});
}
if(!verified.length)fail('NO_VERIFIED_OWNER_REPAIR_ISSUES');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-owner-issue-witnesses.json',JSON.stringify({
 schema:'reality-signed-owner-handoff-evidence-v1',
 witnessed_by:'GITHUB_OIDC_INDEPENDENT_PROVIDER_RECHECK',
 signed_run_id:Number(env.GITHUB_RUN_ID),
 witnesses:verified,
 owner_work_created:false,installation_authorized:false,
 production_changed:false
},null,2)+'\n');
console.log('REALITY_SIGNED_OWNER_WITNESSES_DURABLE',JSON.stringify({
 witnessed:verified.map(x=>x.issue_number),
 owner_work_created:false,installation_authorized:false,
 production_changed:false
}));
