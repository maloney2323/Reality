// Independent, read-only admission of the REAL controlled finale evidence.
// Never accepts a caller-supplied candidate, PR, work ID, job receipt or grant.
// This is a verifier, NOT an authorization or an installation implementation.
import {createHash} from 'node:crypto';

export const CONTROLLED_FINALE_WORK='work:8f71513a2c1955569e84c0e9af0962ec';
export const CONTROLLED_FINALE_SOURCE_SHA256='c0f0fc86cd2ed11fe7e8c01484ebaf1b698143028c9c81ff323c6b7f8cd857ae';
export const CONTROLLED_FINALE_PATH='src/reality-extensions/construction-estimate-approval-gate.mjs';
export const CONTROLLED_FINALE_PR=152;
const REPO='maloney2323/Reality';
const API='https://api.github.com/repos/'+REPO;
const BASE='experiment/reality-full-loop-finale-20261028';
const HEAD='review/reality-finale-exact-model-candidate-20261028';
const PINNED_HEAD='757404f5891a0fa73258833ea4a477cb01ae8862';
const CORRECTION_HEAD='acbc3160ced0525ea73ef4d0184da5fdae50337c';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const fail=c=>{throw Error(c)};
const RUNS=Object.freeze([
 {id:40715822942,head:'4f1a3a23fe28d738ccf863754c76234c4d1b1929',
  conclusion:'failure',name:'Reality Finale - Controlled Live Model Recovery (Noncustomer)'},
 {id:40716279333,head:CORRECTION_HEAD,conclusion:'success',
  name:'Reality Finale - Real Model Self-Correction and Independent Retest'},
 {id:40717353722,head:PINNED_HEAD,conclusion:'success',
  name:'Reality Finale - Exact Model Candidate Review Installation Readback'},
]);
const ARTIFACTS=Object.freeze([
 {id:12829060866,run:40716279333,name:'reality-finale-second-real-model-correction',
  digest:'sha256:f60d5d8bea0661521a005c2afbec510141e854e3e52c584ee8b7e2ebcd54d829'},
 {id:12827359427,run:40716279333,name:'reality-finale-second-independent-sandbox',
  digest:'sha256:c9c32585e933f6b917e6c668632d39405916e890f28eee81f543aa9a92527e72'},
]);
export const CONTROLLED_FINALE_VERIFIER_VERSION='reality-controlled-finale-independent-admission-v0.1';

export async function verifyControlledFinaleIndependentEvidence({
 fetchImpl=fetch,env=process.env,
}={}){
 if(typeof fetchImpl!=='function')fail('FINALE_TRUSTED_GITHUB_READER_REQUIRED');
 const headers={
  accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Reality-Controlled-Finale-Independent-Admission',
 };
 const token=typeof env.REALITY_GITHUB_TOKEN==='string'?env.REALITY_GITHUB_TOKEN.trim():'';
 if(token)headers.authorization='Bearer '+token;
 const get=async path=>{
  const response=await fetchImpl(API+path,{method:'GET',redirect:'error',headers});
  if(response?.ok!==true)fail('FINALE_GITHUB_READBACK_UNAVAILABLE');
  const raw=await response.text();
  if(raw.length>260000)fail('FINALE_GITHUB_RESPONSE_TOO_LARGE');
  try{return JSON.parse(raw)}catch{fail('FINALE_GITHUB_RESPONSE_INVALID')}
 };
 const [old,corrected,review,pr,artifacts,content,baseRef]=await Promise.all([
  ...RUNS.map(r=>get('/actions/runs/'+r.id)),
  get('/pulls/'+CONTROLLED_FINALE_PR),
  get('/actions/runs/40716279333/artifacts?per_page=100'),
  get('/contents/'+CONTROLLED_FINALE_PATH+'?ref='+PINNED_HEAD),
  get('/git/ref/heads/'+BASE),
 ]);
 for(let i=0;i<RUNS.length;i++){
  const r=RUNS[i],actual=[old,corrected,review][i];
  if(actual.id!==r.id||actual.name!==r.name||
     actual.repository?.full_name!==REPO||
     actual.status!=='completed'||actual.conclusion!==r.conclusion||
     actual.head_sha!==r.head)
    fail('FINALE_PINNED_ACTION_RUN_CHANGED');
 }
 if(pr.number!==CONTROLLED_FINALE_PR||pr.state!=='open'||
    pr.draft!==true||pr.merged!==false||
    pr.head?.repo?.full_name!==REPO||pr.base?.repo?.full_name!==REPO||
    pr.head?.ref!==HEAD||pr.head?.sha!==PINNED_HEAD||
    pr.base?.ref!==BASE||
    baseRef?.ref!=='refs/heads/'+BASE||
    !/^[a-f0-9]{40}$/.test(String(baseRef?.object?.sha||''))||
    !/^[a-f0-9]{40}$/.test(String(pr.base?.sha||''))||
    pr.html_url!=='https://github.com/'+REPO+'/pull/'+CONTROLLED_FINALE_PR)
  fail('FINALE_DRAFT_SCOPE_OR_BASE_MOVED');
 if(!Array.isArray(artifacts.artifacts)||artifacts.total_count>100)
  fail('FINALE_ARTIFACT_HISTORY_UNVERIFIABLE');
 for(const expected of ARTIFACTS){
  const matches=artifacts.artifacts.filter(a=>a.id===expected.id);
  if(matches.length!==1||matches[0].name!==expected.name||
     matches[0].digest!==expected.digest||matches[0].expired!==false||
     matches[0].workflow_run?.id!==expected.run||
     matches[0].workflow_run?.head_sha!==CORRECTION_HEAD)
   fail('FINALE_ACTUAL_MODEL_PROOF_ARTIFACT_MISMATCH');
 }
 if(content?.type!=='file'||content.path!==CONTROLLED_FINALE_PATH||
    content.encoding!=='base64'||typeof content.content!=='string')
  fail('FINALE_GITHUB_SOURCE_CONTENT_UNAVAILABLE');
 const encoded=content.content.replace(/\s+/g,'');
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.toString('base64')!==encoded||bytes.length>12000||
    SHA(bytes)!==CONTROLLED_FINALE_SOURCE_SHA256)
  fail('FINALE_MODEL_GENERATED_SOURCE_CHANGED');
 const source=bytes.toString('utf8');
 if(!source.includes('export function evaluateEstimateRelease(')||
    !source.includes('external_action_authorized: false'))
  fail('FINALE_SOURCE_SCOPE_MISMATCH');
 return Object.freeze({
  version:CONTROLLED_FINALE_VERIFIER_VERSION,
  state:pr.base.sha===baseRef.object.sha?
   'EXACT_MODEL_CORRECTION_INDEPENDENTLY_VERIFIED_OWNER_ADMISSION_PENDING':
   'REVALIDATION_REQUIRED_BASE_MOVED',
  test_kind:'CONTROLLED_NONCUSTOMER',
  original_work_id:CONTROLLED_FINALE_WORK,
  original_customer_work_id:'work:24cda9611404e9bcb47909976067605c',
  source_path:CONTROLLED_FINALE_PATH,
  source_sha256:CONTROLLED_FINALE_SOURCE_SHA256,
  actual_model_source_bytes:source,
  approved_destination_base:BASE,
  observed_base_sha:baseRef.object.sha,
  review_pr_base_sha:pr.base.sha,
  target_base_moved_since_review:pr.base.sha!==baseRef.object.sha,
  github_pr_number:CONTROLLED_FINALE_PR,
  pinned_review_head_sha:PINNED_HEAD,
  independent_run_ids:RUNS.map(r=>r.id),
  frozen_cases_passed:6,additional_holdout_cases_passed:21,
  candidate_code_installed:false,
  owner_bound_warrant_issued:false,
  installation_authorized:false,
  owner_resumption_authorized:false,
  durable_job_settlement:false,
  controlled_job_completed:false,
  customer_job_completed:false,
 });
}
