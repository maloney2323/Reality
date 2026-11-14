// Source-specific qualification for an already-signed employee shift.
// The issue and commit are fetched independently. Neither issue text nor
// model advice can create an authorization, claim success or choose a job ID.
import {createHash} from 'node:crypto';
export const SHIFT_COMMIT_TRIAGE_SOURCE_VERSION='reality-shift-commit-triage-source-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const COMMIT=/https:\/\/github\.com\/maloney2323\/Reality\/commit\/([a-f0-9]{40})(?![a-f0-9])/g;
const API='https://api.github.com/repos/maloney2323/Reality';
const fail=x=>{throw Error('SHIFT_COMMIT_TRIAGE_'+x)};
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function provider(path,{fetchImpl,token}){
 const headers={accept:'application/vnd.github+json',
  'user-agent':'Reality-Shift-Commit-Triage/1.0',
  'x-github-api-version':'2022-11-28'};
 if(typeof token==='string'&&token.length>20)headers.authorization='Bearer '+token;
 const response=await fetchImpl(API+'/'+path,{
  method:'GET',redirect:'error',cache:'no-store',headers,
  signal:AbortSignal.timeout(10000)});
 // Safe diagnostic only: public HTTP status, never credentials or response body.
 if(!response?.ok)fail('PROVIDER_HTTP_'+String(
  Number.isInteger(response?.status)&&response.status>=100&&response.status<=599?
    response.status:0));
 const body=await response.json();
 if(!body||typeof body!=='object'||Array.isArray(body))
  fail('PROVIDER_OBJECT_UNVERIFIED');
 return body;
}
export async function verifyCurrentShiftCommitTriageSource({
 graph,fetchImpl=fetch,token=null
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    !UUID.test(graph.shift_id||'')||!UUID.test(graph.owner_id||'')||
    !SHA.test(graph.plan_fingerprint||'')||
    !Array.isArray(graph.jobs)||graph.jobs.length<1||graph.jobs.length>4)
  fail('OWNER_FROZEN_WARRANT_READBACK_REQUIRED');
 const candidates=graph.jobs.filter(j=>
  j.original_kind==='SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL'&&
  j.phase==='NOT_ADMITTED'&&
  j.original_work_id==null&&
  j.independent_source_proof_verified===true&&
  SHA.test(j.source_proof_sha256||'')&&ISSUE.test(j.source_ref||''));
 for(const item of candidates){
  const issueNumber=Number(ISSUE.exec(item.source_ref)[1]);
  if(!Number.isSafeInteger(issueNumber)||issueNumber>100000)
   fail('ISSUE_NUMBER_UNVERIFIED');
  const issue=await provider('issues/'+issueNumber,{fetchImpl,token});
  if(issue.number!==issueNumber||issue.state!=='open'||issue.pull_request||
     issue.html_url!==item.source_ref||
     issue.repository_url!==API||
     typeof issue.title!=='string'||typeof issue.body!=='string'||
     issue.body.length>50000)
   fail('CURRENT_ISSUE_IDENTITY_UNVERIFIED');
  // A general engineering objective is NOT a commit-triage original.
  const body=issue.body;
  if(!/^Review needed: commit [a-f0-9]{7,40} lacks issue reference$/i.test(issue.title)||
     !/please associate this commit with an appropriate issue, or confirm no issue is needed/i.test(body))
   continue;
  const commitShas=[...new Set([...body.matchAll(COMMIT)].map(m=>m[1]))];
  if(commitShas.length!==1)fail('ONE_EXACT_COMMIT_REFERENCE_REQUIRED');
  const commitSha=commitShas[0];
  const commit=await provider('commits/'+commitSha,{fetchImpl,token});
  if(commit.sha!==commitSha||
     commit.html_url!=='https://github.com/maloney2323/Reality/commit/'+commitSha||
     typeof commit.commit?.message!=='string'||
     commit.commit.message.length>20000||
     !Array.isArray(commit.files)||commit.files.length<1||commit.files.length>30||
     commit.files.some(x=>typeof x.filename!=='string'||x.filename.length>240||
       !/^[a-zA-Z0-9_.\/-]+$/.test(x.filename)||x.filename.includes('..')))
   fail('EXACT_COMMIT_PROVIDER_READBACK_UNVERIFIED');
  return Object.freeze({
   version:SHIFT_COMMIT_TRIAGE_SOURCE_VERSION,
   status:'INDEPENDENT_COMMIT_REFERENCE_TRIAGE_SOURCE_VERIFIED',
   shift_id:graph.shift_id,owner_id:graph.owner_id,
   plan_fingerprint:graph.plan_fingerprint,
   source_ref:item.source_ref,
   source_step_index:item.source_step_index,
   source_proof_sha256:item.source_proof_sha256,
   commit_sha:commitSha,commit_url:commit.html_url,
   issue_body_sha256:digest(body),
   commit_content_sha256:digest({
    message:commit.commit.message,
    files:commit.files.map(f=>({path:f.filename,status:f.status}))
   }),
   file_count:commit.files.length,
   qualified_kind:'COMMIT_ISSUE_ASSOCIATION_TRIAGE',
   next_action:'ADMIT_EXACT_OWNER_SHIFT_COMMIT_TRIAGE_ORIGINAL',
   independent_provider_readback_verified:true,
   original_job_admitted:false,original_job_completed:false,
   installation_authorized:false,production_changed:false
  });
 }
 return Object.freeze({
  version:SHIFT_COMMIT_TRIAGE_SOURCE_VERSION,
  status:'NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE',
  independent_provider_readback_verified:false,
  original_job_admitted:false,original_job_completed:false,
  installation_authorized:false,production_changed:false
 });
}
