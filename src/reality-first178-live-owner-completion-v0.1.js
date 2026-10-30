// One customer action, one original #178 Continuity driver: authenticated
// approval -> exact immutable model source -> actual GitHub frozen tests ->
// installed preview capability -> original execution -> settlement.
// Provider data is evidence, never authority. No production branch writes.
import {createHash} from 'node:crypto';
import {dbFor,rpc,verifiedOwnerScope}
 from './reality-personal-first-upgrade-178-v0.1.js';
import {resolveOriginalFirst178OwnerQueue}
 from './reality-first178-single-action-v0.1.js';
import {createFirst178ConstitutionalCheckpointService}
 from './reality-first-178-constitutional-continuity-checkpoint-v0.1.js';
import {createFirst178GithubInstallationProvider,verifyFirst178ScopedGithubWrite}
 from './reality-first178-isolated-github-install-v0.1.js';
import {describeOriginal178OwnerApproval,finishOriginal178AfterExactApproval}
 from './reality-first178-approved-completion-v0.1.js';
const fail=x=>{throw Error('FIRST178_LIVE_OWNER_COMPLETION_'+x)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x);
const SHA40=/^[a-f0-9]{40}$/;
const previewInstallToken=env=>String(env.REALITY_FIRST178_GITHUB_INSTALL_TOKEN||
 env.REALITY_GITHUB_TOKEN||'');
export async function original178OwnerApprovalView({
 session,env=process.env,resolve=resolveOriginalFirst178OwnerQueue,
 call=rpc,checkpointFactory=createFirst178ConstitutionalCheckpointService,
 scopeReader=verifiedOwnerScope,dbReader=dbFor,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==
    'feature/first178-live-single-claim-execution-20261029')
  fail('ISOLATED_BRANCH_REQUIRED');
 const original=await resolve({session,env});
 if(!original||original.issue_number!==178||!uuid(original.conversation_id))
  fail('ORIGINAL_OWNER_JOB_NOT_FOUND');
 const conversationId=original.conversation_id;
 const scope=await scopeReader({session,conversationId,env});
 if(scope.owner_id!==session.user_id||
    scope.original_work_id!==original.original_work_id||
    scope.goal_id!==original.goal_id)
  fail('CURRENT_OWNER_GOAL_CHANGED');
 const db=dbReader(session,env);
 const queue=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
 });
 if(queue?.queue_id!==original.queue_id||
    queue.original_work_id!==scope.original_work_id||
    queue.goal_id!==scope.goal_id)
  fail('ORIGINAL_QUEUE_READBACK_MISMATCH');
 // Read the exact durable outcome of an exhausted original job.
 // This is NOT an unconsumed GAP and may not be silently re-claimed.
 if(queue.phase==='ESCALATED'){
  const receipt=queue.report?.checkpoint_receipt_id;
  const digest=queue.report?.checkpoint_hash;
  if(queue.report?.state!=='ESCALATED'||!uuid(receipt)||
     !/^[a-f0-9]{64}$/.test(String(digest||''))||
     queue.report?.original_work_id!==scope.original_work_id||
     queue.report?.installation_authorized!==false||
     queue.report?.job_completed!==false)
   fail('ESCALATED_QUEUE_DURABLE_RECEIPT_UNVERIFIED');
  const checkpoint=checkpointFactory({
   session,conversationId,originalWorkId:scope.original_work_id,db,env,
  });
  const result=await checkpoint.readLatestCheckpoint();
  if(result?.verified!==true||
     result.checkpoint_hash!==digest||
     result.continuity_receipt_id!==receipt||
     result.original_work_id!==scope.original_work_id||
     result.state.phase!=='ESCALATED')
   fail('EXHAUSTED_CONTINUITY_NOT_SOURCE_VERIFIED');
  const recoverable=(
   (result.state.attempt_count===3&&result.state.attempt_limit===3)||
   (result.state.attempt_count===5&&result.state.attempt_limit===5&&
    result.state.recovery_authorization?.verified===true)||
   (result.state.attempt_count===7&&result.state.attempt_limit===7&&
    result.state.recovery_continuation_authorization?.verified===true))&&
   result.state.independent_failure?.classification?.retry_source_without_dependency===true;
  if(recoverable)return Object.freeze({
   status:'GOVERNED_RECOVERY_READY',
   original_work_id:scope.original_work_id,queue_id:queue.queue_id,
   attempt_limit:result.state.attempt_limit+(result.state.attempt_count===7?1:2),
   attempts_used:result.state.attempt_count,
   additional_attempts:result.state.attempt_count===7?1:2,
   checkpoint_receipt_id:receipt,checkpoint_hash:digest,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,original_claim_preserved:true,
   autonomous_recovery_eligible:true,
  });
  return Object.freeze({
   status:'EXHAUSTED_CORRECTION_ATTEMPTS',
   original_work_id:scope.original_work_id,queue_id:queue.queue_id,
   attempt_limit:result.state.attempt_limit,
   attempts_used:result.state.attempt_count,
   checkpoint_receipt_id:receipt,checkpoint_hash:digest,
   // Source is the independently reconstructed constitutional checkpoint,
   // not the model or browser. Expose only typed provider failure metadata.
   last_failure_kind:
    result.state.independent_failure?.attempt===result.state.attempt_count&&
    /^[A-Z_]{3,60}$/.test(String(result.state.independent_failure?.classification?.class||''))?
     result.state.independent_failure.classification.class:null,
   last_failure_next:
    result.state.independent_failure?.attempt===result.state.attempt_count&&
    /^[A-Z_]{3,80}$/.test(String(result.state.independent_failure?.classification?.next||''))?
     result.state.independent_failure.classification.next:null,
   last_failure_evidence_ref:
    result.state.independent_failure?.attempt===result.state.attempt_count&&
    /^vercel:provider-verified:[a-zA-Z0-9:_-]{25,250}$/.test(
      String(result.state.independent_failure?.evidence_ref||''))?
     result.state.independent_failure.evidence_ref:null,
   // These failing test names are taken exclusively from the last
   // verified, checkpoint-bound independent sandbox diagnostics. They are
   // evidence for diagnosis, never instructions or execution authority.
   last_failure_test_names:
    result.state.independent_failure?.attempt===result.state.attempt_count?
     [...String(result.state.independent_failure?.diagnostics?.output||'')
      .slice(0,12000).matchAll(/^not ok [0-9]+ - ([^\\r\\n]{1,150})/gm)]
      .slice(0,6).map(m=>m[1]):[],
   one_click_job_attempted:true,owner_approval_required:false,
   cannot_auto_retry_consumed_claim:true,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
   reason:'All three model candidates failed independent sandbox tests. '+
    'The original job is preserved but NOT completed.',
  });
 }
 const checkpoint=checkpointFactory({
  session,conversationId,originalWorkId:scope.original_work_id,db,env,
 });
 const restored=await checkpoint.readLatestCheckpoint();
 if(restored?.verified!==true||
    restored.original_work_id!==scope.original_work_id||
    restored.checkpoint_hash!==restored.state?.head_hash)
  fail('CURRENT_CONSTITUTIONAL_CHECKPOINT_UNVERIFIED');
 const state=restored.state;
 if(queue.phase==='SETTLED'&&state.phase==='SETTLED')
  return Object.freeze({
   status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
   original_work_id:scope.original_work_id,
   candidate_artifact_hash:state.candidate.artifact_hash,
   checkpoint_receipt_id:restored.continuity_receipt_id,
   final_settlement_receipt_ref:state.settlement.settlement_receipt_ref,
   original_job_completed:true,production_changed:false,
  });
 if(queue.phase!=='AWAITING_OWNER_APPROVAL')
  fail('CANDIDATE_NOT_YET_VERIFIED');
 if(state.phase==='AWAITING_OWNER_APPROVAL'&&
     queue.report?.installation_approval_reservation_id){
  return Object.freeze({
   status:'AUTOMATIC_COMPLETION_IN_PROGRESS',
   original_work_id:scope.original_work_id,
   candidate_artifact_hash:state.candidate.artifact_hash,
   checkpoint_hash:state.head_hash,
   checkpoint_receipt_id:restored.continuity_receipt_id,
   install_connection_ready:await verifyFirst178ScopedGithubWrite({token:previewInstallToken(env)}),
   recovery_no_new_approval:true,original_job_completed:false,
   production_changed:false,
  });
 }
 if(state.phase==='AWAITING_OWNER_APPROVAL'){
  const ready=describeOriginal178OwnerApproval({state,queue,session});
  return Object.freeze({...ready,
   // NO approval action when installation provider is not configured.
   install_connection_ready:
    await verifyFirst178ScopedGithubWrite({token:previewInstallToken(env)}),
   original_job_completed:false});
 }
 if(!['PROMOTION_AUTHORIZED','CAPABILITY_REGISTERED',
     'ORIGINAL_JOB_RESUMED'].includes(state.phase)||
    !queue.report?.installation_approval_reservation_id)
  fail('PREVIOUS_APPROVAL_STATE_INVALID');
 return Object.freeze({
  status:'AUTOMATIC_COMPLETION_IN_PROGRESS',
  original_work_id:scope.original_work_id,
  candidate_artifact_hash:state.candidate.artifact_hash,
  checkpoint_receipt_id:restored.continuity_receipt_id,
  checkpoint_hash:state.head_hash,
  install_connection_ready:true,original_job_completed:false,
  recovery_no_new_approval:true,production_changed:false,
 });
}
export async function runOriginal178OneApproval({
 session,ownerAction=null,env=process.env,
 call=rpc,resolve=resolveOriginalFirst178OwnerQueue,
 checkpointFactory=createFirst178ConstitutionalCheckpointService,
 scopeReader=verifiedOwnerScope,dbReader=dbFor,
 githubFactory=createFirst178GithubInstallationProvider,
 completion=finishOriginal178AfterExactApproval,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==
    'feature/first178-live-single-claim-execution-20261029'||
    !SHA40.test(env.VERCEL_GIT_COMMIT_SHA||''))
  fail('ISOLATED_RELEASE_REQUIRED');
 const writeToken=previewInstallToken(env);
 if(!(await verifyFirst178ScopedGithubWrite({token:writeToken})))
  fail('SCOPED_GITHUB_INSTALL_WRITE_PERMISSION_NOT_VERIFIED');
 const original=await resolve({session,env});
 if(!original||original.issue_number!==178||!uuid(original.conversation_id))
  fail('ORIGINAL_OWNER_JOB_NOT_FOUND');
 const conversationId=original.conversation_id;
 const scope=await scopeReader({session,conversationId,env});
 if(scope.owner_id!==session.user_id||
    scope.original_work_id!==original.original_work_id||
    scope.goal_id!==original.goal_id)
  fail('CURRENT_OWNER_GOAL_CHANGED');
 const db=dbReader(session,env);
 const queue=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
 });
 if(queue?.queue_id!==original.queue_id||
    queue.original_work_id!==scope.original_work_id||
    queue.goal_id!==scope.goal_id||
    queue.phase!=='AWAITING_OWNER_APPROVAL')
  fail('ORIGINAL_RUNNING_QUEUE_NOT_READY_FOR_APPROVAL');
 const checkpoint=checkpointFactory({
  session,conversationId,originalWorkId:scope.original_work_id,db,env,
 });
 const restored=await checkpoint.readLatestCheckpoint();
 if(restored?.verified!==true||
    restored.original_work_id!==scope.original_work_id)
  fail('OWNER_CONSTITUTIONAL_JOURNAL_UNVERIFIED');
 const state=restored.state;
 const artifact=state.candidate?.artifact_hash;
 const approvalRef=id=>'supabase:owner-approval:'+id;
 const approvalEvidence=id=>hash({
  authority:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  reservation:id,owner_id:session.user_id,
  original_work_id:scope.original_work_id,artifact_hash:artifact,
 });
 const readExactOwnerApproval=async()=>{
  const r=await call(db,'reality_read_first178_exact_approval_v1',{
   p_owner_id:session.user_id,p_conversation_id:conversationId,
   p_queue_id:queue.queue_id,p_original_work_id:scope.original_work_id,
   p_candidate_hash:artifact,
  });
  return r;
 };
 const reserveExactOwnerApproval=async request=>{
  if(state.phase!=='AWAITING_OWNER_APPROVAL'||
     request.artifact_hash!==artifact||
     request.original_work_id!==scope.original_work_id||
     request.checkpoint_hash!==state.head_hash)
   fail('EXACT_VERIFIED_CANDIDATE_NOT_READY');
  let claimed;
  try{
   claimed=await call(db,'reality_authorize_first178_exact_upgrade_v1',{
    p_owner_id:session.user_id,p_conversation_id:conversationId,
    p_queue_id:queue.queue_id,p_original_work_id:scope.original_work_id,
    p_candidate_hash:artifact,p_checkpoint_hash:state.head_hash,
    p_checkpoint_receipt_id:restored.continuity_receipt_id,
   });
  }catch{
   // An uncertain first response never becomes a second grant.
   // The only recovery is independent readback of the exact original grant.
   const previously=await readExactOwnerApproval();
   if(previously?.verified!==true)fail('OWNER_APPROVAL_RESULT_UNRESOLVED');
   claimed={reservation_id:previously.reservation_id,
    candidate_hash:previously.candidate_hash,approved_exact_candidate:true};
  }
  const proof=await readExactOwnerApproval();
  if(proof?.verified!==true||
    proof.reservation_id!==claimed.reservation_id||
    proof.candidate_hash!==artifact||
    proof.owner_id!==session.user_id)
   fail('OWNER_APPROVAL_PROVIDER_READBACK_FAILED');
  return Object.freeze({
   kind:'PROMOTION_AUTHORIZED',
   owner_id:session.user_id,goal_id:scope.goal_id,
   original_work_id:scope.original_work_id,
   continuity_root_id:scope.continuity_root_id,
   worldline_id:scope.worldline_id,
   artifact_hash:artifact,
   approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
   consumed_once:true,reservation_ref:approvalRef(proof.reservation_id),
   installation_target:'ISOLATED_PREVIEW',
   evidence_ref:approvalRef(proof.reservation_id),
   evidence_hash:approvalEvidence(proof.reservation_id),
  });
 };
 let current=state;
 let github=null,installed=null,ci=null;
 const provision=()=>{
  const approval=current.promotion_authorization;
  if(!approval||approval.consumed_once!==true)
   fail('SINGLE_USE_OWNER_APPROVAL_NOT_DURABLE');
  github ||= githubFactory({
   ownerId:session.user_id,originalWorkId:scope.original_work_id,
   approval,candidate:current.candidate,
   writeToken,readToken:env.REALITY_FIRST178_GITHUB_READ_TOKEN||writeToken,
  });
  return github;
 };
 const providerCI=async()=>{
  const g=provision();
  installed ||= await g.writeAndReadback();
  if(installed?.artifact_hash!==artifact||
     installed.original_work_id!==scope.original_work_id||
     installed.production_changed!==false)
   fail('PREVIEW_INSTALLATION_READBACK_MISMATCH');
  // Bounded in-request provider observation. If the job is still pending,
  // the consumed human approval and Continuity checkpoint remain intact.
  for(let n=0;n<15;n++){
   const seen=await g.observeFrozenAcceptance(installed.installed_commit_sha);
   if(seen.status==='FROZEN_ACCEPTANCE_FAILED')
    fail('ACTUAL_FROZEN_CUSTOMER_TEST_FAILED');
   if(seen.verified===true){
    ci=seen;return seen;
   }
   if(n<14)await new Promise(resolve=>setTimeout(resolve,4000));
  }
  fail('FROZEN_PROVIDER_OUTCOME_PENDING_RECONCILIATION');
 };
 const requireCI=async()=>{
  if(ci?.verified===true)return ci;
  return providerCI();
 };
 // The frozen GitHub CI run verifies candidate code only. It cannot attest
 // registration, resumed original customer execution, observation or settlement.
 // The previous adapter constructed three distinct-looking receipts from that
 // same CI run; remove that false success path until separate provider
 // operations and their independent readbacks are connected.
 const verifyIndependentReceipt=async({receipt,scope_hash})=>{
  if(receipt.owner_id!==session.user_id||
     receipt.goal_id!==scope.goal_id||
     receipt.original_work_id!==scope.original_work_id||
     (receipt.artifact_hash&&receipt.artifact_hash!==artifact))
   return {verified:false};
  if(receipt.kind!=='PROMOTION_AUTHORIZED')
   return {verified:false,
    reason:'DISTINCT_CONSEQUENCE_PROVIDER_READBACK_REQUIRED'};
  const proof=await readExactOwnerApproval();
  if(proof?.verified!==true||
     approvalRef(proof.reservation_id)!==receipt.evidence_ref||
     approvalEvidence(proof.reservation_id)!==receipt.evidence_hash||
     receipt.reservation_ref!==receipt.evidence_ref)
   return {verified:false};
  return {verified:true,independent_provider_readback:true,
   evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
   original_work_id:scope.original_work_id,scope_hash,
   attestation_ref:'reality:original178:owner:'+receipt.evidence_ref};
 };
 const adapter={
  reserveExactOwnerApproval,readExactOwnerApproval,
  verifyIndependentReceipt,
  persistCheckpoint:async newState=>{
   const saved=await checkpoint.persistCheckpoint(newState);
   if(saved?.persisted===true&&saved.independent_readback_verified===true)
    current=newState;
   return saved;
  },
  registerAndReobserve:async()=>{
   // Installation and frozen acceptance are necessary but insufficient.
   // A separate durable capability-registry mutation/readback is not yet
   // wired. Never construct a registration receipt from the CI run.
   await requireCI();
   fail('DISTINCT_CAPABILITY_REGISTRY_READBACK_REQUIRED');
  },
  resumeOriginalWork:async()=>{
   // Requires actual re-execution of the SAME original work, with its own
   // executor operation ID, observed result and provider readback.
   fail('DISTINCT_ORIGINAL_JOB_EXECUTION_READBACK_REQUIRED');
  },
  settleAndReobserve:async()=>{
   // Requires independently observed original-job outcome, reconciliation,
   // and separate durable settlement, not a GitHub acceptance step.
   fail('DISTINCT_OUTCOME_RECONCILIATION_READBACK_REQUIRED');
  },
  recordAndReobserveFinalSettlement:async result=>{
   const saved=await call(db,'reality_settle_first178_exact_owner_work_v1',{
    p_owner_id:session.user_id,p_conversation_id:conversationId,
    p_queue_id:queue.queue_id,p_original_work_id:scope.original_work_id,
    p_candidate_hash:artifact,p_checkpoint_hash:result.checkpoint_hash,
    p_continuity_receipt_id:current?
     (await checkpoint.readLatestCheckpoint()).continuity_receipt_id:null,
   });
   if(saved?.settled!==true||saved?.readback_verified!==true)
    fail('INDEPENDENT_TERMINAL_QUEUE_READBACK_MISSING');
   return saved;
  },
 };
 return completion({state,queue,session,ownerAction,adapters:adapter});
}
