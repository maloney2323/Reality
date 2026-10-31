// Scoped original Reality maintenance repair executor, review candidate only.
// This DOES NOT itself issue owner grants, install an upgrade or settle a job.
// Exact job #143, one repository, one preview branch, one source path.
// The original model's proposal is imported unchanged. No fallback to a
// tracking-issue action. A pre-existing fix results in NO CHANGE.
import {createHash} from 'node:crypto';
import {proposeOriginalRepair} from './reality-original-maintenance-repair-proposal.mjs';

export const ORIGINAL_REPAIR_EXECUTOR_VERSION='reality-original-repair-executor-v0.1';
export const ORIGINAL_REPAIR_WORK='work:24cda9611404e9bcb47909976067605c';
const REPO='maloney2323/Reality';
const ROOT='/repos/'+REPO;
const REF='experiment/reality-live-durable-adversarial-20261025';
const FILE='test/reality-personal-discovered-work-handoff-v0.1.test.js';
const MODEL_SHA256='6b82acd60baa9055bfc57a70f551bac44f783fc431814ad2555927eb50f5ca16';
const HEX40=/^[0-9a-f]{40}$/,HEX64=/^[0-9a-f]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=s=>{throw Error(s)};
const digest=data=>createHash('sha256').update(data).digest('hex');
const blobHash=data=>createHash('sha1')
 .update('blob '+Buffer.byteLength(data,'utf8')+'\0').update(data).digest('hex');

function assertTrustedWork({workId,get}){
 if(workId!==ORIGINAL_REPAIR_WORK||typeof get!=='function')
  fail('ORIGINAL_EXECUTOR_ONLY_ORIGINAL_WORK_ALLOWED');
}
function sourceFile(item){
 if(item?.type!=='file'||item.path!==FILE||item.encoding!=='base64'||
  !HEX40.test(String(item.sha||''))||typeof item.content!=='string'||
  item.content.length>250000)
  fail('ORIGINAL_EXECUTOR_EXACT_GITHUB_SOURCE_REQUIRED');
 const encoded=item.content.replace(/\s+/g,'');
 const bytes=Buffer.from(encoded,'base64');
 if(!bytes.length||bytes.length>120000||bytes.toString('base64')!==encoded||
  blobHash(bytes)!==item.sha)
  fail('ORIGINAL_EXECUTOR_GITHUB_BLOB_CONTENT_MISMATCH');
 return {source:bytes.toString('utf8'),sourceSha256:digest(bytes),blobSha:item.sha};
}

// Read-only probe of the actual original repair. Never derives a repair
// target or executable code from a user-provided browser payload.
export async function prepareOriginalMaintenanceRepair({
 workId=ORIGINAL_REPAIR_WORK,get,propose=proposeOriginalRepair,
}={}){
 assertTrustedWork({workId,get});
 if(propose!==proposeOriginalRepair)
  fail('ORIGINAL_EXECUTOR_UNTRUSTED_MODEL_REPAIR_ADAPTER');
 const [branch,issue]=await Promise.all([
  get(ROOT+'/git/ref/heads/'+REF),
  get(ROOT+'/issues/143'),
 ]);
 const head=branch?.object?.sha;
 if(branch?.ref!=='refs/heads/'+REF||!HEX40.test(String(head||''))||
    issue?.number!==143||issue?.state!=='open'||!!issue.pull_request||
    issue?.html_url!=='https://github.com/'+REPO+'/issues/143'||
    typeof issue?.title!=='string'||
    !issue.title.startsWith('Reality recurring work: repair repeated Reality Governed Execution Engine'))
  fail('ORIGINAL_EXECUTOR_PINNED_BRANCH_OR_ISSUE_MISMATCH');
 const file=sourceFile(await get(ROOT+'/contents/'+FILE+'?ref='+head));
 const result=propose({workId,source:file.source});
 if(result?.file!==FILE||
    result.patchedSource!==file.source&&result.status==='ALREADY_FIXED'||
    !['ALREADY_FIXED','PATCH_PROPOSED'].includes(result?.status))
  fail('ORIGINAL_EXECUTOR_MODEL_PROPOSAL_INVALID');
 if(result.status==='ALREADY_FIXED')
  return Object.freeze({
   version:ORIGINAL_REPAIR_EXECUTOR_VERSION,
   state:'PREEXISTING_FIX_OBSERVED_NO_WRITE',
   original_work_id:workId,original_issue_number:143,base_ref:REF,
   base_head_sha:head,source_blob_sha:file.blobSha,
   source_sha256:file.sourceSha256,
   original_model_sha256:MODEL_SHA256,
   source_status:'ALREADY_FIXED',provider_write_permitted:false,
   requires_install_authorization:false,
   model_upgrade_installed:false,repair_executed_by_reality:false,
   original_job_completed:false,
   next_action:'VERIFY_EXISTING_FIX_AND_RECONCILE_SEPARATELY',
  });
 if(typeof result.patchedSource!=='string'||
    !result.patchedSource.length||result.patchedSource.length>120000||
    result.patchedSource===file.source)
  fail('ORIGINAL_EXECUTOR_PROPOSED_PATCH_INVALID');
 return Object.freeze({
  version:ORIGINAL_REPAIR_EXECUTOR_VERSION,
  state:'REPAIR_PROPOSAL_READY_SEPARATE_AUTHORIZATION_REQUIRED',
  original_work_id:workId,original_issue_number:143,
  source_path:FILE,base_ref:REF,base_head_sha:head,
  source_blob_sha:file.blobSha,source_sha256:file.sourceSha256,
  proposed_patch_sha256:digest(result.patchedSource),
  original_model_sha256:MODEL_SHA256,
  source_status:'PATCH_PROPOSED',provider_write_permitted:false,
  requires_install_authorization:true,
  model_upgrade_installed:false,repair_executed_by_reality:false,
  original_job_completed:false,
 });
}

// Only the server's durable owner authorization service may implement
// consumeVerifiedGrant. This method does not accept a grant from HTTP.
// Claim consumption happens BEFORE the write and is never retried here.
export async function executeOriginalMaintenanceRepair({
 session,conversationId,workId=ORIGINAL_REPAIR_WORK,
 get,write,consumeVerifiedGrant,
}={}){
 if(!UUID.test(String(session?.user_id||''))||
    !UUID.test(String(conversationId||''))||
    typeof get!=='function'||typeof write!=='function'||
    typeof consumeVerifiedGrant!=='function')
  fail('ORIGINAL_EXECUTOR_TRUSTED_OWNER_AND_GRANT_SERVICE_REQUIRED');
 const proposal=await prepareOriginalMaintenanceRepair({workId,get});
 if(proposal.state==='PREEXISTING_FIX_OBSERVED_NO_WRITE')
  return Object.freeze({...proposal,
   status:'PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY',
   independent_reconciliation_required:true,
   external_write_performed:false});
 if(proposal.state!=='REPAIR_PROPOSAL_READY_SEPARATE_AUTHORIZATION_REQUIRED')
  fail('ORIGINAL_EXECUTOR_UNVERIFIED_PROPOSAL');
 const lease=await consumeVerifiedGrant({
  session,conversationId,workId,operation:'github:repair_original_maintenance',
  repository:REPO,baseRef:REF,issueNumber:143,
  candidateSha256:proposal.original_model_sha256,
  observedHeadSha:proposal.base_head_sha,
  observedBlobSha:proposal.source_blob_sha,
  proposedPatchSha256:proposal.proposed_patch_sha256,
 });
 if(lease?.status!=='CONSUMED_ONCE'||
    lease.operation!=='github:repair_original_maintenance'||
    lease.original_work_id!==workId||lease.owner_id!==session.user_id||
    lease.conversation_id!==conversationId||
    lease.authorized_by!==session.user_id||
    lease.repository!==REPO||lease.base_ref!==REF||
    lease.issue_number!==143||lease.one_time_grant_consumed!==true||
    !UUID.test(String(lease.grant_id||''))||
    lease.candidate_sha256!==proposal.original_model_sha256||
    lease.base_head_sha!==proposal.base_head_sha||
    lease.source_blob_sha!==proposal.source_blob_sha||
    lease.proposed_patch_sha256!==proposal.proposed_patch_sha256)
  fail('ORIGINAL_EXECUTOR_DURABLE_EXACT_OWNER_GRANT_REQUIRED');
 const latest=await prepareOriginalMaintenanceRepair({workId,get});
 if(latest.state!=='REPAIR_PROPOSAL_READY_SEPARATE_AUTHORIZATION_REQUIRED'||
    latest.base_head_sha!==proposal.base_head_sha||
    latest.source_blob_sha!==proposal.source_blob_sha||
    latest.proposed_patch_sha256!==proposal.proposed_patch_sha256)
  fail('ORIGINAL_EXECUTOR_SOURCE_MOVED_AFTER_GRANT_NO_RETRY');
 const raw=sourceFile(await get(ROOT+'/contents/'+FILE+'?ref='+proposal.base_head_sha));
 const fix=proposeOriginalRepair({workId,source:raw.source});
 if(fix.status!=='PATCH_PROPOSED'||digest(fix.patchedSource)!==
    proposal.proposed_patch_sha256)
  fail('ORIGINAL_EXECUTOR_PATCH_CHANGED_AFTER_GRANT');
 const writeResult=await write(ROOT+'/contents/'+FILE,'PUT',{
  message:'Repair original Reality Governed Execution Engine source with owner-approved verified patch',
  content:Buffer.from(fix.patchedSource,'utf8').toString('base64'),
  sha:proposal.source_blob_sha,branch:REF,
 });
 const sha=writeResult?.commit?.sha;
 if(!HEX40.test(String(sha||'')))
  fail('ORIGINAL_EXECUTOR_GITHUB_WRITE_OUTCOME_UNKNOWN_NO_RETRY');
 // Independent source readback is mandatory. A PUT response proves nothing.
 const seen=sourceFile(await get(ROOT+'/contents/'+FILE+'?ref='+sha));
 if(seen.sourceSha256!==proposal.proposed_patch_sha256)
  fail('ORIGINAL_EXECUTOR_INDEPENDENT_PATCH_READBACK_FAILED_NO_RETRY');
 return Object.freeze({
  version:ORIGINAL_REPAIR_EXECUTOR_VERSION,
  status:'AUTHORIZED_PATCH_GITHUB_SOURCE_REOBSERVED',
  original_work_id:workId,original_issue_number:143,
  owner_id:session.user_id,conversation_id:conversationId,
  grant_id:lease.grant_id,model_candidate_sha256:MODEL_SHA256,
  patched_source_sha256:proposal.proposed_patch_sha256,
  original_source_sha256:proposal.source_sha256,
  resulting_commit_sha:sha,
  source_readback_independent:true,
  external_write_performed:true,
  install_grant_replayed:false,
  independent_post_commit_ci_required:true,
  original_job_completed:false,
  original_job_settlement_saved:false,
 });
}
