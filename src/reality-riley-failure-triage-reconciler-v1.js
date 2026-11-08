// Complete the SECOND real Riley/Taylor job on the owner's already signed
// shift. Independently read GitHub issue #143 comment AND current CI runs,
// then use only the service-role RPC to record a durable non-repair outcome.
// A historical error that no longer reproduces is NOT a repaired code defect.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const BASE='https://api.github.com/repos/maloney2323/Reality';
const SOURCE='https://github.com/maloney2323/Reality/issues/143';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const mark=id=>'<!-- reality-riley-triage-original:'+id+' -->';
const hash=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const skip=(status)=>Object.freeze({status,original_job_completed:false,
 code_repair_completed:false,installation_authorized:false,
 production_changed:false});
const fail=reason=>{throw Error('RILEY_SHIFT_TRIAGE_'+reason)};
async function github(relative,{fetchImpl}){
 if(!/^\/(?:issues\/143\/comments\?per_page=100|actions\/runs\/[1-9]\d+)$/.test(relative))
  fail('EXACT_GITHUB_EVIDENCE_ENDPOINT_REQUIRED');
 const res=await fetchImpl(BASE+relative,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(15000),
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Riley-Owner-Shift-Triage-Readback'}
 });
 if(!res?.ok)fail('GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 return res.json();
}
export async function reconcileOwnerShiftFailureTriage143({
 db,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(!db?.strictSecrets||typeof callRpc!=='function'||
  typeof fetchImpl!=='function')fail('TRUSTED_SERVICE_ONLY_REQUIRED');
 const claim=await callRpc(db,'reality_admit_shift_failure_triage_143_v1',
  {},{fetchImpl});
 if(claim?.status==='NO_CURRENT_AUTHORIZED_TRIAGE_SOURCE')
  return skip(claim.status);
 if(claim?.status==='EXISTING_VERIFIED_TRIAGE_RECEIPT_NO_REPLAY')
  return skip('EXISTING_143_TRIAGE_RECEIPT_PRESERVED');
 if(claim?.status!=='EXACT_OWNER_SHIFT_TRIAGE_JOB_ADMITTED'||
  !UUID.test(claim.shift_id||'')||!WORK.test(claim.original_work_id||'')||
  !SHA.test(claim.source_proof_sha256||'')||
  claim.source_ref!==SOURCE||
  claim.installation_authorized!==false||claim.production_changed!==false||
  claim.original_job_completed!==false)
  fail('TRUSTED_OWNER_SOURCE_ADMISSION_REQUIRED');
 const comments=await github('/issues/143/comments?per_page=100',{fetchImpl});
 if(!Array.isArray(comments)||comments.length>100)
  fail('GITHUB_COMMENT_READBACK_NOT_COMPLETE');
 const selected=comments.filter(c=>
  typeof c?.body==='string'&&c.body.includes(mark(claim.original_work_id)));
 if(selected.length>1)fail('DUPLICATE_PROVIDER_EFFECT_REQUIRES_INDEPENDENT_REVIEW');
 if(selected.length!==1){
  if(comments.length===100)return skip('GITHUB_COMMENT_PAGINATION_UNVERIFIED');
  return skip('AWAITING_AUTONOMOUS_TRIAGE_PROVIDER_PUBLICATION');
 }
 const c=selected[0];
 if(!Number.isSafeInteger(c.id)||c.id<1||
  c.html_url!==SOURCE+'#issuecomment-'+c.id||
  c.issue_url!==BASE+'/issues/143'||
  !c.body.includes('Original job: `'+claim.original_work_id+'`')||
  !c.body.includes('Source issue: '+SOURCE))
  fail('EXACT_REAL_GITHUB_COMMENT_IDENTITY_INVALID');
 const historic=40591283500;
 const h=(c.body.match(/Historical failure run: `([1-9]\d+)`/)||[])[1];
 const current=(c.body.match(/Current success run IDs: `([1-9]\d+),([1-9]\d+),([1-9]\d+)`/)||[]).slice(1);
 const ids=current.map(Number);
 if(Number(h)!==historic||ids.length!==3||
  new Set(ids).size!==3||ids.some(id=>!Number.isSafeInteger(id)||id<=historic))
  fail('CURRENT_AND_HISTORIC_PROVIDER_RUNS_REQUIRED');
 const results=await Promise.all([historic,...ids].map(id=>
  github('/actions/runs/'+id,{fetchImpl})));
 const [old,...recent]=results;
 if(old?.id!==historic||old?.name!=='Reality Governed Execution Engine v0.1'||
  old?.conclusion!=='failure'||old.status!=='completed'||
  old.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+historic||
  recent.some((r,i)=>
   r?.id!==ids[i]||r.name!==old.name||
   r.status!=='completed'||r.conclusion!=='success'||
   r.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+ids[i]||
   Date.parse(r.created_at)<=Date.parse(old.created_at)))
  fail('INDEPENDENT_FRESH_CI_RUN_CLASSIFICATION_FAILED');
 // These exact GitHub provider successes support only an observed
 // CURRENT status; they do not prove the October defect was code-fixed.
 const settled=await callRpc(db,'reality_settle_shift_failure_triage_143_v1',{
  p_original_work_id:claim.original_work_id,
  p_provider_comment_id:c.id,
  p_provider_comment_url:c.html_url,
  p_provider_body_sha256:hash(c.body),
  p_historical_failed_run_id:historic,
  p_verified_current_success_run_ids:ids
 },{fetchImpl});
 if(settled?.status!=='EXACT_OWNER_SHIFT_TRIAGE_DISPOSITION_INDEPENDENTLY_SETTLED'||
  settled.original_work_id!==claim.original_work_id||
  settled.original_job_completed!==true||
  settled.code_repair_completed!==false||
  settled.historical_root_cause_proven_fixed!==false||
  settled.installation_authorized!==false||
  settled.production_changed!==false||
  !/^supabase:riley_shift_failure_triage_v1:[a-f0-9-]{36}$/.test(
   settled.settlement_receipt_ref||''))
  fail('DURABLE_OWNER_TRIAGE_RECEIPT_UNVERIFIED');
 return Object.freeze({...settled,
  independent_github_provider_observation:true,
  observed_current_success_run_ids:ids,
  repaired_historical_issue:false});
}
