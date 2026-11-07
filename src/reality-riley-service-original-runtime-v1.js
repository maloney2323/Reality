// TRUSTED SERVICE-ONLY original-job adapters for Riley's approved shift.
// No session cookie or model text is accepted. Owner + conversation context
// comes from a service-role DB readback of the exact existing Universe event
// joined to the owner shift, current goal epoch, source digest and queue.
// This never creates a job, a shift, permission, receipt or installation.
import {shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {createGenuineSourceBackedJobAdapters}
 from './reality-genuine-source-backed-job-v1.js';
import {createGenuineOriginalWorkRunner}
 from './reality-genuine-capability-execution-runtime-v1.js';

export const RILEY_SERVICE_ORIGINAL_RUNTIME_VERSION=
 'reality-riley-service-original-executor-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const fail=x=>{throw Error('RILEY_SERVICE_ORIGINAL_'+x)};
function verifyReadback(ctx,requested){
 const match=ISSUE.exec(requested.source_ref||'');
 if(ctx?.status!=='SHIFT_ORIGINAL_TRUSTED_CONTEXT_READY'||
  ctx.shift_id!==requested.shift_id||
  ctx.owner_id!==requested.owner_id||
  ctx.original_work_id!==requested.original_work_id||
  ctx.trigger_id!==requested.trigger_id||
  ctx.source_ref!==requested.source_ref||
  ctx.owner_scope_verified!==true||ctx.source_checked!==true||
  ctx.source_proof_sha256!==requested.source_proof_sha256||
  !UUID.test(ctx.conversation_id||'')||
  !UUID.test(ctx.original_work_event_id||'')||
  typeof ctx.goal_id!=='string'||ctx.goal_id.length<8||
  !WORK.test(ctx.original_work_id||'')||
  !match||ctx.source_step_index<2||ctx.source_step_index>5||
  ctx.original_job_settled!==false||
  ctx.execution_claim_consumed!==false||
  ctx.installation_authorized!==false||
  ctx.production_changed!==false)
  fail('SIGNED_SHIFT_OWNER_GOAL_SOURCE_READBACK_REQUIRED');
 return ctx;
}
export function createRileyServiceOriginalRuntime({
 db,env=process.env,fetchImpl=fetch,
 loadSourceAdapters=createGenuineSourceBackedJobAdapters,
 makeOriginalRunner=createGenuineOriginalWorkRunner,
 callRpc=shiftRpc,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  typeof db?.url!=='string'||!db.url.startsWith('https://')||
  typeof db.secretKey!=='string'||db.secretKey.length<8||
  env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!==db.project||
  [fetchImpl,loadSourceAdapters,makeOriginalRunner,callRpc]
   .some(x=>typeof x!=='function'))
  fail('PREVIEW_SERVICE_DATABASE_BOUNDARY_REQUIRED');
 async function readShift({db:actual,ownerId}){
  if(actual!==db||!UUID.test(ownerId||''))
   fail('OWNER_SCOPED_SHIFT_READBACK_REQUIRED');
  const raw=assertShiftReadback(await callRpc(db,
   'reality_read_owner_employee_shifts_v1',{p_owner_id:ownerId},
   {fetchImpl}));
  return raw;
 }
 async function readOwner({db:actual,ownerId}){
  if(actual!==db||!UUID.test(ownerId||''))
   fail('EXACT_OWNER_READBACK_REQUIRED');
  const raw=await callRpc(db,'reality_read_owner_genuine_loop_v1',
   {p_owner_id:ownerId},{fetchImpl});
  if(raw?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
    raw.owner_installation_authorized_by_read!==false||
    raw.external_action_performed!==false||
    raw.production_changed!==false||
    !Array.isArray(raw.jobs)||raw.jobs.length>12)
   fail('ORIGINAL_OWNER_LEDGER_UNTRUSTED');
  return raw;
 }
 // Authenticate the source of the service request through the worker's
 // separate server token + DB service key, NOT by fabricating signed-in
 // browser identity. The 'user_id' passed to existing Continuity helpers
 // is the independently matched DB principal, not a client assertion.
 async function loadOriginal(args){
  if(!UUID.test(args?.owner_id||'')||
   !UUID.test(args?.shift_id||'')||
   !UUID.test(args?.trigger_id||'')||
   !WORK.test(args?.original_work_id||'')||
   !ISSUE.test(args?.source_ref||'')||
   args.read_only!==true||args.preflight_only!==true||
   args.claim_id!==null)
   fail('EXACT_PRECLAIM_WORK_SCOPE_REQUIRED');
  const current=await callRpc(db,'reality_read_shift_original_execution_context_v1',{
   p_shift_id:args.shift_id,p_original_work_id:args.original_work_id,
   p_trigger_id:args.trigger_id},{fetchImpl});
  const ctx=verifyReadback(current,args);
  const sessionContext=Object.freeze({
   user_id:ctx.owner_id,config:Object.freeze({url:db.url})
  });
  const githubToken=String(env.REALITY_GITHUB_TOKEN||env.GITHUB_TOKEN||'');
  const githubFetch=async(url,options={})=>{
   // The existing source-backed provider must only read the specific
   // GitHub API host; no credential can be forwarded to another endpoint.
   const u=new URL(url);
   if(u.origin!=='https://api.github.com'||
    !u.pathname.startsWith('/repos/maloney2323/Reality/'))
    fail('GITHUB_SOURCE_HOST_NOT_ALLOWED');
   const headers={...(options.headers||{})};
   if(githubToken.length>20)headers.authorization='Bearer '+githubToken;
   return fetchImpl(url,{...options,headers});
  };
  const adapters=loadSourceAdapters({
   session:sessionContext,conversationId:ctx.conversation_id,
   env,fetchImpl:githubFetch
  });
  if(typeof adapters?.loadAuthorizedInternalJob!=='function'||
    typeof adapters?.makeProviderReadback!=='function')
   fail('EXISTING_SOURCE_JOB_ADAPTERS_NOT_CONNECTED');
  // Independently reproject current owner goal + Continuity source BEFORE
  // the durable one-shot claim is consumed.
  const loaded=await adapters.loadAuthorizedInternalJob(Object.freeze({
   original_work_id:args.original_work_id,
   owner_id:ctx.owner_id,
   conversation_id:ctx.conversation_id,
   read_only:true,
  }));
  if(loaded?.original_work_id!==ctx.original_work_id||
   loaded.original_source_event_id!==ctx.original_work_event_id||
   loaded.owner_id!==ctx.owner_id||
   loaded.conversation_id!==ctx.conversation_id||
   loaded.original_job_settled!==false||
   loaded.goal_still_authorized!==true||
   loaded.work_item?.work_item_id!==ctx.original_work_id||
   loaded.work_item.connector!==null||
   loaded.work_item.consequential!==false||
   typeof loaded.connector?.execute!=='function'||
   typeof loaded.independent_verifier?.verify!=='function')
   fail('CURRENT_CONTINUITY_ORIGINAL_PRECLAIM_MISMATCH');
  const observed=await loaded.independent_verifier.verify({
   workItem:loaded.work_item,read_only:true,preflight_only:true
  });
  if(observed?.original_work_id!==ctx.original_work_id||
   observed.independent!==true||
   observed.independently_verified!==true||
   observed.evidence_kind!=='OBSERVED_FAILURE'||
   observed.blocker_class!=='MISSING_INSTRUMENT'||
   observed.provider_effect_may_have_occurred!==false||
   observed.external_action_performed!==false)
   fail('SOURCE_PROVIDER_PREFLIGHT_NOT_REPRODUCED_NO_CLAIM');
  return Object.freeze({
   source_context:ctx,sessionContext,sourceAdapters:adapters,
   qualifiedOriginal:Object.freeze({
    original_work_id:ctx.original_work_id,owner_id:ctx.owner_id,
    source_issue_number:Number(ISSUE.exec(ctx.source_ref)[1]),
    original_job_authorized:true,independently_qualified:true,
    independently_settled:false,installation_authorized:false,
    provider_effect_may_have_occurred:false,production_changed:false,
    environment:'ISOLATED_PREVIEW'
   }),
   workItem:loaded.work_item,
   scope:Object.freeze({
    owner_id:ctx.owner_id,original_work_id:ctx.original_work_id,
    goal_id:ctx.goal_id,target_environment:'ISOLATED_PREVIEW'
   }),
   preclaim_verified_source_digest:ctx.source_proof_sha256,
   source_adapter_read_only:true,
  });
 }
 async function runOriginal({
  source_context,sessionContext,sourceAdapters,qualifiedOriginal,
  ownerId,shiftId,shiftReadback,ownerLedgerReadback,workItem,
  scope,preclaim_verified_source_digest
 }={}){
  const current=assertShiftReadback(shiftReadback);
  if(!source_context||source_context.owner_id!==ownerId||
   source_context.shift_id!==shiftId||
   source_context.original_work_id!==qualifiedOriginal?.original_work_id||
   source_context.source_proof_sha256!==preclaim_verified_source_digest||
   scope?.owner_id!==ownerId||scope?.original_work_id!==qualifiedOriginal.original_work_id||
   !current.shifts.some(s=>s.shift_id===shiftId&&
    ['RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)||
    s.shift_id===shiftId&&s.status==='AWAITING_EXACT_ORIGINAL_WORK')||
   ownerLedgerReadback?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
   !ownerLedgerReadback.jobs.some(j=>
    j.original_work_id===qualifiedOriginal.original_work_id&&
    j.independently_settled===false)||
   workItem?.work_item_id!==qualifiedOriginal.original_work_id)
   fail('CURRENT_TRUSTED_ORIGINAL_POSTCLAIM_SCOPE_REQUIRED');
  // The EXISTING nonconsequential source-backed job runner invokes the
  // Reality governed executor, the independent GitHub verifier and Genuine
  // Capability Engine. The owner approval remains with existing Reality Chat.
  const runner=makeOriginalRunner({
   session:sessionContext,conversationId:source_context.conversation_id,
   env,
   loadAuthorizedInternalJob:sourceAdapters.loadAuthorizedInternalJob,
   makeProviderReadback:sourceAdapters.makeProviderReadback,
  });
  if(typeof runner!=='function')fail('SOURCE_BACKED_EXECUTOR_NOT_CONNECTED');
  const outcome=await runner({originalWorkId:qualifiedOriginal.original_work_id});
  if(outcome?.original_work_id!==qualifiedOriginal.original_work_id||
   !['BLOCKED','UNRESOLVED','VERIFIED'].includes(outcome.execution_status)||
   outcome.original_job_completed!==false||
   outcome.new_job_created!==false||
   outcome.production_changed!==false)
   fail('GOVERNED_EXECUTOR_ORIGINAL_OUTCOME_UNTRUSTED');
  const status=outcome.execution_status==='BLOCKED'?
   'ORIGINAL_JOB_AUTHORIZATION_BLOCKED':
   outcome.capability_response?
    'SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF':
   outcome.execution_status==='VERIFIED'?
    'ORIGINAL_JOB_OUTCOME_NEEDS_DURABLE_SETTLEMENT':
    'ORIGINAL_JOB_UNRESOLVED_NO_UNSAFE_RETRY';
  return Object.freeze({
   original_work_id:qualifiedOriginal.original_work_id,
   shift_id:shiftId,status,
   existing_reality_governed_executor_used:true,
   source_verified_from_current_continuity:true,
   owner_approval_required:status==='SAME_ORIGINAL_JOB_SHARED_REPAIR_HANDOFF',
   installation_authorized_by_employee:false,
   original_job_settled:false,
   independently_verified_final_receipt:false,
   no_new_original_job_created:true,
   verified_human_hours_saved:null,
   production_changed:false,
  });
 }
 return Object.freeze({
  loadShiftReadback:readShift,
  loadOwnerLedgerReadback:readOwner,
  loadTrustedAuthorizedOriginal:loadOriginal,
  runOriginal,
  job_authority_owned_by:'EXISTING_GOAL_CONTINUITY_AND_ATOMIC_SHIFT_CLAIM',
  model_mints_execution_authority:false,
  installation_authorized:false,
 });
}
