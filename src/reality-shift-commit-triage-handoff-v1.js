// Bridge an independently re-read source into the CURRENT signed shift.
// The fresh provider readback is only a qualification. The existing
// service-role RPC owns durable original identity, lease and evidence state.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {verifyCurrentShiftCommitTriageSource}
 from './reality-shift-commit-triage-source-v1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('SHIFT_COMMIT_TRIAGE_HANDOFF_'+x)};
const empty=Object.freeze({
 status:'NO_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED',
 original_job_admitted:false,original_job_completed:false,
 installation_authorized:false,production_changed:false
});
export async function admitVerifiedCurrentShiftCommitTriage({
 graph,db,fetchImpl=fetch,token=null,callRpc=shiftRpc,
 verifySource=verifyCurrentShiftCommitTriageSource
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    typeof callRpc!=='function'||typeof verifySource!=='function'||!db)
  fail('TRUSTED_SHIFT_AND_ADAPTER_REQUIRED');
 const qualification=await verifySource({graph,fetchImpl,token});
 if(qualification?.status==='NO_INDEPENDENTLY_VERIFIED_COMMIT_TRIAGE_SOURCE')
  return Object.freeze({qualification,original:empty});
 if(qualification?.status!=='INDEPENDENT_COMMIT_REFERENCE_TRIAGE_SOURCE_VERIFIED'||
    qualification.shift_id!==graph.shift_id||
    qualification.owner_id!==graph.owner_id||
    qualification.plan_fingerprint!==graph.plan_fingerprint||
    qualification.independent_provider_readback_verified!==true||
    qualification.original_job_admitted!==false||
    qualification.original_job_completed!==false||
    qualification.installation_authorized!==false||
    qualification.production_changed!==false)
  fail('INDEPENDENT_SOURCE_AND_OWNER_IDENTITY_CHANGED');
 const ticket=await callRpc(db,'reality_admit_verified_shift_commit_triage_v1',{
  p_source_ref:qualification.source_ref,
  p_source_proof_sha256:qualification.source_proof_sha256,
  p_commit_sha:qualification.commit_sha,
  p_issue_body_sha256:qualification.issue_body_sha256,
  p_commit_content_sha256:qualification.commit_content_sha256
 },{fetchImpl});
 if(ticket?.status==='NO_CURRENT_FROZEN_COMMIT_TRIAGE_SOURCE_TO_ADMIT')
  return Object.freeze({qualification,original:empty});
 if(ticket?.status!=='EXACT_OWNER_SHIFT_COMMIT_TRIAGE_ORIGINAL_ADMITTED'||
    ticket.shift_id!==graph.shift_id||ticket.owner_id!==graph.owner_id||
    ticket.source_ref!==qualification.source_ref||
    ticket.source_proof_sha256!==qualification.source_proof_sha256||
    ticket.commit_sha!==qualification.commit_sha||
    !WORK.test(ticket.original_work_id||'')||
    ticket.original_job_admitted!==true||
    ticket.original_job_completed!==false||
    ticket.installation_authorized!==false||
    ticket.production_changed!==false)
  fail('DURABLE_SOURCE_BOUND_ORIGINAL_ID_UNVERIFIED');
 const evidence=await callRpc(db,'reality_record_verified_shift_commit_triage_v1',{
  p_original_work_id:ticket.original_work_id,
  p_commit_sha:qualification.commit_sha,
  p_issue_body_sha256:qualification.issue_body_sha256,
  p_commit_content_sha256:qualification.commit_content_sha256
 },{fetchImpl});
 if(evidence?.status!=='EXACT_SHIFT_COMMIT_TRIAGE_PROVIDER_EVIDENCE_RECORDED'||
    evidence.shift_id!==graph.shift_id||
    evidence.original_work_id!==ticket.original_work_id||
    evidence.source_ref!==ticket.source_ref||
    evidence.commit_sha!==qualification.commit_sha||
    evidence.phase!=='EVIDENCE_VERIFIED'||
    evidence.independent_provider_readback_verified!==true||
    evidence.original_job_completed!==false||
    evidence.installation_authorized!==false||
    evidence.production_changed!==false)
  fail('DURABLE_PROVIDER_EVIDENCE_READBACK_UNVERIFIED');
 return Object.freeze({qualification,original:Object.freeze({
  ...evidence,original_job_admitted:true,final_receipt_verified:false
 })});
}

/**
 * Independently reconcile an actual provider-side commit-triage disposition.
 * The GitHub comment originated from an owner-directed connector action,
 * NOT the employee model. The same signed shift retains authority and identity.
 */
export async function reconcileVerifiedCurrentShiftCommitTriage({
 graph,db,fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||!db||
  typeof fetchImpl!=='function'||typeof callRpc!=='function')
  fail('SETTLEMENT_CURRENT_AUTHORIZED_SHIFT_REQUIRED');
 const candidates=graph.jobs.filter(j=>
  j.original_kind==='REAL_COMMIT_REFERENCE_TRIAGE_ORIGINAL'&&
  j.phase==='EVIDENCE_VERIFIED'&&WORK.test(j.original_work_id||''));
 if(candidates.length===0)return Object.freeze({
  status:'NO_UNSETTLED_VERIFIED_COMMIT_TRIAGE_ORIGINAL',
  original_job_completed:false,installation_authorized:false,
  production_changed:false});
 if(candidates.length!==1)fail('SETTLEMENT_MULTIPLE_ORIGINALS_AMBIGUOUS');
 const j=candidates[0];
 if(j.source_ref!=='https://github.com/maloney2323/Reality/issues/62'||
  j.original_work_id!=='work:90353feca9e44feafa8df0a1bf272a2a'||
  j.independent_source_proof_verified!==true)
  fail('SETTLEMENT_EXACT_SOURCE_NOT_VERIFIED');
 const api='https://api.github.com/repos/maloney2323/Reality';
 const get=async path=>{
  const res=await fetchImpl(api+'/'+path,{
   method:'GET',redirect:'error',cache:'no-store',
   headers:{accept:'application/vnd.github+json',
    'user-agent':'Reality-Isolated-Commit-Triage-Receipt/1.0',
    'x-github-api-version':'2022-11-28'},
   signal:AbortSignal.timeout(9500)});
  if(!res?.ok)fail('SETTLEMENT_PROVIDER_READBACK_UNAVAILABLE');
  return res.json();
 };
 const issue=await get('issues/62');
 if(issue?.number!==62||issue.state!=='closed'||
  issue.state_reason!=='completed'||issue.pull_request||
  issue.html_url!==j.source_ref||issue.repository_url!==api||
  typeof issue.body!=='string'||!issue.body.includes(
   '939914571be04ba519e2d644fe5e7c37e57c734d')||
  !Number.isInteger(issue.comments)||issue.comments<1||
  issue.comments>100)
  fail('SETTLEMENT_SOURCE_ISSUE_CLOSED_STATE_UNVERIFIED');
 const comments=await get('issues/62/comments?per_page=100');
 if(!Array.isArray(comments)||comments.length!==issue.comments)
  fail('SETTLEMENT_PROVIDER_COMMENT_LIST_UNVERIFIED');
 const matching=comments.filter(c=>
  Number.isSafeInteger(c.id)&&c.id>0&&
  c.user?.login==='maloney2323'&&
  c.author_association==='OWNER'&&
  c.issue_url===api+'/issues/62'&&
  c.html_url===j.source_ref+'#issuecomment-'+c.id&&
  typeof c.body==='string'&&c.body.includes(j.original_work_id)&&
  c.body.includes('939914571be04ba519e2d644fe5e7c37e57c734d')&&
  c.body.includes('Verified commit-reference triage')&&
  c.body.includes('not automatically authored by Reality')&&
  !Number.isNaN(Date.parse(c.created_at)));
 if(matching.length!==1)fail('SETTLEMENT_EXACT_OWNER_PROVIDER_DISPOSITION_MISSING');
 const c=matching[0];
 const receipt=await callRpc(db,'reality_settle_verified_shift_commit_triage_v1',{
  p_original_work_id:j.original_work_id,
  p_commit_sha:'939914571be04ba519e2d644fe5e7c37e57c734d',
  p_issue_state:issue.state,p_issue_state_reason:issue.state_reason,
  p_issue_closed_at:issue.closed_at,
  p_comment_id:c.id,p_comment_url:c.html_url,p_comment_body:c.body,
  p_comment_created_at:c.created_at,
  p_author:c.user.login,p_author_association:c.author_association
 },{fetchImpl});
 if(receipt?.status!=='EXACT_COMMIT_TRIAGE_ORIGINAL_INDEPENDENTLY_SETTLED'||
  receipt.shift_id!==graph.shift_id||
  receipt.original_work_id!==j.original_work_id||
  receipt.provider_comment_url!==c.html_url||
  receipt.execution_origin!=='OWNER_DIRECTED_CHATGPT_GITHUB_ACTION'||
  receipt.independent_provider_readback_verified!==true||
  receipt.original_job_completed!==true||
  receipt.installation_authorized!==false||
  receipt.production_changed!==false||
  !/^supabase:riley_commit_reference_triage_originals_v1:[a-f0-9-]{36}$/.test(
   receipt.settlement_receipt_ref||''))
  fail('SETTLEMENT_EXACT_FINAL_RECEIPT_UNVERIFIED');
 return Object.freeze(receipt);
}
