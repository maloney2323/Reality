// One customer action, one original #178 Continuity driver: authenticated
// approval -> exact immutable model source -> actual GitHub frozen tests ->
// installed preview capability -> original execution -> settlement.
// Provider data is evidence, never authority. No production branch writes.
import {createHash} from 'node:crypto';
import {strategyFromConstitutionalJournal}
 from './reality-self-repair-strategy-v1.0.js';
import {projectVerifiedSelfRepairOpportunity}
 from './reality-upgrade-discovery-v0.1.js';
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
import {createOriginal178CapabilityRegistry}
 from './reality-first178-real-capability-registry-v0.1.js';
import {createOriginal178VerifiedSettlement}
 from './reality-first178-real-outcome-settlement-v0.1.js';
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
  // Reality itself reads the COMPLETE existing constitutional failure history.
  // The strategy is a diagnosis/proposal, NOT another retry reservation.
  const repair=strategyFromConstitutionalJournal(result.state);
  const discovered=projectVerifiedSelfRepairOpportunity({state:result.state});
  return Object.freeze({
   status:'EXHAUSTED_CORRECTION_ATTEMPTS',
   self_repair_strategy:{
    version:repair.version,strategy:repair.strategy,
    recurring_failures:repair.recurring_failures,
    root_cause_hypotheses:repair.root_cause_hypotheses,
    latest_failing_tests:repair.latest_failing_tests,
    evidence_refs:repair.evidence_refs,
    discovered_work:discovered.discovered_work,
    discovery_status:discovered.discovery_status,
    automatic_reexecution_permitted:false,
    execution_authorized:false,
   },
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
      .slice(0,12000).matchAll(/^not ok [0-9]+ - (.{1,150})$/gm)]
      .slice(0,6).map(m=>m[1]):[],
   one_click_job_attempted:true,owner_approval_required:false,
   cannot_auto_retry_consumed_claim:true,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,
   reason:'All '+String(result.state.attempt_count)+' recorded model candidates failed independent sandbox tests. '+
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
 // A separately authorized one-attempt redesign can be IN PROGRESS,
 // even though the previous 8/8 checkpoint is still the last durable phase.
 // The original queue and its one-use owner consent must be read back.
 if(queue.phase==='RUNNING_CONSTITUTIONAL'&&
    uuid(queue.report?.redesign_recovery_reservation_id)&&
    queue.report?.redesign_recovery_owner_consent===
     'AUTHENTICATED_OWNER_EXPLICIT_ACTION'){
  const receipt=await call(db,'reality_read_first178_one_redesign_v1',{
   p_owner_id:session.user_id,p_conversation_id:conversationId,
   p_queue_id:queue.queue_id,p_original_work_id:scope.original_work_id,
  });
  if(receipt?.reserved_once!==true||
     receipt.queue_id!==queue.queue_id||
     receipt.original_work_id!==scope.original_work_id||
     receipt.reservation_id!==queue.report.redesign_recovery_reservation_id||
     receipt.owner_confirmed!==true||
     receipt.authorization_scope!=='ONE_ORIGINAL178_REDESIGN_ATTEMPT'||
     receipt.installation_authorized!==false||
     receipt.job_completed!==false)
   fail('REDESIGN_OWNER_RESERVATION_READBACK_REQUIRED');
  if(state.phase!=='ESCALATED'&&
     !['REPAIR_REQUIRED','CANDIDATE_READY'].includes(state.phase))
   fail('REDESIGN_LATEST_CHECKPOINT_UNRECONCILED');
  if(state.attempt_count<8||state.attempt_count>9||
     ![8,9].includes(state.attempt_limit))
   fail('REDESIGN_ATTEMPT_HISTORY_CHANGED');
  return Object.freeze({
   status:'REDESIGN_RECOVERY_IN_PROGRESS',
   original_work_id:scope.original_work_id,queue_id:queue.queue_id,
   reservation_id:receipt.reservation_id,
   attempt_count:state.attempt_count,attempt_limit:state.attempt_limit,
   checkpoint_receipt_id:restored.continuity_receipt_id,
   checkpoint_hash:restored.checkpoint_hash,
   owner_confirmation_consumed:true,
   original_claim_preserved:true,original_history_preserved:true,
   installation_authorized:false,original_job_completed:false,
   production_changed:false,automatic_regrant_allowed:false,
  });
 }
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
 registryFactory=createOriginal178CapabilityRegistry,
 settlementFactory=createOriginal178VerifiedSettlement,
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
 let github=null,installed=null,ci=null,registered=null,executed=null;
 let registry=null,settlement=null;
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
 const registrationProvider=()=>{
  if(!current.promotion_authorization?.consumed_once)
   fail('PRIOR_EXACT_OWNER_APPROVAL_REQUIRED_FOR_REGISTRY');
  registry ||= registryFactory({db,ownerId:session.user_id,
   originalWorkId:scope.original_work_id,
   artifactHash:artifact,verifiedGoalId:scope.goal_id,
   worldlineId:scope.worldline_id,
   approvalRef:current.promotion_authorization.reservation_ref});
  return registry;
 };
 const outcomeProvider=()=>{
  settlement ||= settlementFactory({
   session,scope:{...scope,target_environment:'ISOLATED_PREVIEW'},
   db});
  return settlement;
 };
 const readRegistered=async()=>{
  if(registered)return registered;
  if(!current.registration||current.registration.status!=='ACTIVE')
   fail('ACTUAL_REGISTRATION_RECEIPT_REQUIRED');
  const prior=current.registration;
  const dbProof=await registrationProvider().verify({
   evidenceHash:prior.evidence_hash});
  if(dbProof?.verified!==true||
     dbProof.registry_receipt_ref!==prior.registry_receipt_ref)
   fail('RECOVERED_REGISTRATION_NOT_INDEPENDENTLY_VERIFIED');
  registered=Object.freeze({verified:true,status:'ACTIVE',
   original_work_id:scope.original_work_id,artifact_hash:artifact,
   registry_receipt_ref:prior.registry_receipt_ref,
   evidence_hash:prior.evidence_hash,
   installed_commit_sha:prior.installed_commit_sha,
   production_changed:false,original_job_completed:false});
  return registered;
 };
 const readExecuted=async()=>{
  if(executed)return executed;
  if(!current.resumption?.executor_run_ref)
   fail('ACTUAL_ORIGINAL_JOB_EXECUTION_REQUIRED');
  const prior=current.resumption;
  const g=provision();
  const source=prior.installed_commit_sha||(
   await requireCI()).installed_commit_sha;
  const proof=await g.observeOriginalExecution(source);
  if(proof?.verified!==true||
     proof.executor_run_ref!==prior.executor_run_ref||
     proof.evidence_hash!==prior.evidence_hash)
   fail('RECOVERED_ORIGINAL_EXECUTION_NOT_INDEPENDENTLY_VERIFIED');
  executed=proof;return proof;
 };
 // The frozen GitHub CI run verifies candidate code only. It cannot attest
 // registration, resumed original customer execution, observation or settlement.
 // The previous adapter constructed three distinct-looking receipts from that
 // same CI run; remove that false success path until separate provider
 // operations and their independent readbacks are connected.
 const verifyIndependentReceipt=async({receipt,scope_hash})=>{
  if(receipt?.owner_id!==session.user_id||
     receipt?.goal_id!==scope.goal_id||
     receipt?.original_work_id!==scope.original_work_id||
     (receipt.artifact_hash&&receipt.artifact_hash!==artifact))
   return {verified:false};
  let source=null;
  try{
  if(receipt.kind==='PROMOTION_AUTHORIZED'){
   const proof=await readExactOwnerApproval();
   if(proof?.verified===true&&
      approvalRef(proof.reservation_id)===receipt.evidence_ref&&
      approvalEvidence(proof.reservation_id)===receipt.evidence_hash&&
      receipt.reservation_ref===receipt.evidence_ref)
    source='VERIFIED_OWNER_APPROVAL_DATABASE';
  }else if(receipt.kind==='CAPABILITY_REGISTERED'){
   const proof=await registrationProvider().verify({
    evidenceHash:receipt.evidence_hash});
   if(proof?.verified===true&&
      proof.registry_receipt_ref===receipt.registry_receipt_ref&&
      proof.registry_receipt_ref===receipt.evidence_ref&&
      receipt.status==='ACTIVE')
    source='INDEPENDENT_CAPABILITY_REGISTRY_DATABASE_READBACK';
  }else if(receipt.kind==='ORIGINAL_JOB_RESUMED'){
   const registryProof=await readRegistered();
   const proof=await provision().observeOriginalExecution(
    receipt.installed_commit_sha);
   if(registryProof.verified===true&&proof?.verified===true&&
      proof.executor_run_ref===receipt.executor_run_ref&&
      proof.executor_run_ref===receipt.evidence_ref&&
      proof.evidence_hash===receipt.evidence_hash&&
      receipt.registration_ref===registryProof.registry_receipt_ref&&
      proof.provider_run_id!==ci?.provider_run_id)
    source='INDEPENDENT_DISTINCT_GITHUB_ORIGINAL_WORK_READBACK';
  }else if(receipt.kind==='ORIGINAL_JOB_SETTLED'){
   const proof=await outcomeProvider().verify({
    registration:await readRegistered(),execution:await readExecuted()});
   if(proof?.verified===true&&
      proof.settlement_receipt_ref===receipt.settlement_receipt_ref&&
      proof.settlement_receipt_ref===receipt.evidence_ref&&
      proof.evidence_hash===receipt.evidence_hash)
    source='INDEPENDENT_DURABLE_CONTINUITY_OUTCOME_READBACK';
  }
  }catch{return {verified:false,
    reason:'DISTINCT_PROVIDER_READBACK_UNAVAILABLE'}}
  if(!source)return {verified:false,
   reason:'DISTINCT_VERIFIABLE_PROVIDER_OPERATION_REQUIRED'};
  return {verified:true,independent_provider_readback:true,
   evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
   original_work_id:scope.original_work_id,scope_hash,
   attestation_ref:'reality:provider-confirmed:'+source+':'+receipt.evidence_ref};
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
   const acceptance=await requireCI();
   const latest=await checkpoint.readLatestCheckpoint();
   if(latest?.verified!==true||
      latest.state?.phase!=='PROMOTION_AUTHORIZED'||
      latest.checkpoint_hash!==current.head_hash||
      latest.original_work_id!==scope.original_work_id)
    fail('PROMOTION_CHECKPOINT_NOT_DURABLY_READ_BACK');
   const record=await registrationProvider().admitted({
    installed,acceptance,
    approvalCheckpointReceiptId:latest.continuity_receipt_id});
   if(record?.verified!==true||record.status!=='ACTIVE'||
      record.original_work_id!==scope.original_work_id||
      record.artifact_hash!==artifact)
    fail('REAL_CAPABILITY_REGISTRY_READBACK_REQUIRED');
   registered=record;
   return Object.freeze({
    kind:'CAPABILITY_REGISTERED',
    owner_id:session.user_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    continuity_root_id:scope.continuity_root_id,
    worldline_id:scope.worldline_id,
    artifact_hash:artifact,status:'ACTIVE',
    authorization_ref:current.promotion_authorization.evidence_ref,
    target_worldline_id:scope.worldline_id,
    registry_receipt_ref:record.registry_receipt_ref,
    installed_commit_sha:record.installed_commit_sha,
    evidence_ref:record.registry_receipt_ref,
    evidence_hash:record.evidence_hash,
   });
  },
  resumeOriginalWork:async()=>{
   const cap=await readRegistered();
   await requireCI();
   if(cap.installed_commit_sha!==installed?.installed_commit_sha)
    fail('REPLAY_SOURCE_NOT_SAME_REGISTERED_ARTIFACT');
   const g=provision();
   let observed=null;
   for(let attempt=0;attempt<15;attempt++){
    const p=await g.observeOriginalExecution(cap.installed_commit_sha);
    if(p.status==='ORIGINAL_EXECUTION_FAILED')
     fail('REAL_ORIGINAL_JOB_PROVIDER_REPLAY_FAILED');
    if(p.verified===true){observed=p;break}
    if(attempt<14)await new Promise(resolve=>setTimeout(resolve,4000));
   }
   if(observed?.verified!==true||
      observed.original_work_id!==scope.original_work_id||
      observed.provider_run_id===ci.provider_run_id)
    fail('DISTINCT_ORIGINAL_JOB_EXECUTION_REQUIRES_RECONCILIATION');
   executed=observed;
   return Object.freeze({
    kind:'ORIGINAL_JOB_RESUMED',
    owner_id:session.user_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    continuity_root_id:scope.continuity_root_id,
    worldline_id:scope.worldline_id,
    artifact_hash:artifact,
    registration_ref:cap.registry_receipt_ref,
    real_execution_observed:true,
    installed_commit_sha:cap.installed_commit_sha,
    executor_run_ref:observed.executor_run_ref,
    evidence_ref:observed.executor_run_ref,
    evidence_hash:observed.evidence_hash,
    original_job_completed:false,
   });
  },
  settleAndReobserve:async()=>{
   const cap=await readRegistered();
   const originalExecution=await readExecuted();
   const receipt=await outcomeProvider().recordAndReadback({
    registration:cap,execution:originalExecution});
   if(receipt?.verified!==true||
      receipt.independent_outcome_verified!==true||
      receipt.durable_settlement_readback!==true||
      receipt.original_work_id!==scope.original_work_id)
    fail('REAL_ORIGINAL_JOB_OUTCOME_NOT_DURABLY_VERIFIED');
   return Object.freeze({
    kind:'ORIGINAL_JOB_SETTLED',
    owner_id:session.user_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    continuity_root_id:scope.continuity_root_id,
    worldline_id:scope.worldline_id,
    artifact_hash:artifact,
    resumption_ref:originalExecution.executor_run_ref,
    durable_settlement_readback:true,
    independent_outcome_verified:true,
    settlement_receipt_ref:receipt.settlement_receipt_ref,
    evidence_ref:receipt.settlement_receipt_ref,
    evidence_hash:receipt.evidence_hash,
    customer_acceptance_recorded:false,
   });
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
