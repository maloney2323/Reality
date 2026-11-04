/* Reality one-button full-loop customer controller.
   Reuses existing authenticated, exact-owner real job and worker routes.
   A single click initiates investigation; owner approval of a later,
   independently verified exact candidate stays inside Reality Chat.
   This UI never signs that approval or invents a settled receipt. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SOURCE=/^[a-f0-9]{40}$/;
const button=$('simpleRunFullLoop'),status=$('simpleFullLoopStatus'),receiptBox=$('simpleFullLoopReceipt');
if(!button||!status||!receiptBox)return;
let startedWork=null,requesting=false,observing=false,approvalPrompted=false;
const historicalNoOpIds=new Set(),previousOriginalFailures=new Set();
function exactFailureKey(issue,run,sha){
 if(!Number.isSafeInteger(Number(issue))||Number(issue)<1||
    !Number.isSafeInteger(Number(run))||Number(run)<1||
    !SOURCE.test(String(sha||'')))return null;
 return String(issue)+':'+String(run)+':'+String(sha);
}
const setStatus=text=>{status.textContent=text};
const signedIn=()=>typeof window.homeOwnerSignedIn==='function'&&
 window.homeOwnerSignedIn()===true;
const exactWork=x=>WORK.test(String(x||''));
const currentConversation=()=>typeof window.realityActiveConversationId==='function'?
 window.realityActiveConversationId():null;
function setReceipt(workId){
 receiptBox.replaceChildren();
 if(!exactWork(workId))return;
 const link=document.createElement('a');
 link.href='/api/reality/personal-genuine-final-receipt-pdf?work_id='+encodeURIComponent(workId);
 link.textContent='Verified final settlement receipt (PDF)';
 receiptBox.append(link);
}
async function read(path){
 const response=await fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.ok!==true)
  throw Error(String(result?.error||'OWNER_SOURCE_READBACK_UNAVAILABLE'));
 return result;
}
async function write(path,body){
 const response=await fetch(path,{method:'POST',credentials:'same-origin',
  cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.ok!==true)
  throw Error(String(result?.error||'OWNER_JOB_OUTCOME_UNCERTAIN_DO_NOT_REPEAT'));
 return result;
}
function activeJob(j){
 return exactWork(j?.original_work_id)&&
  !(j?.historical_reconciliation?.status==='HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT'&&
    j?.historical_reconciliation?.independent_database_readback===true&&
    j?.historical_reconciliation?.current_job_settled===false)&&
  typeof j.phase==='string'&&
  !['SETTLED_ISOLATED','SETTLED','ESCALATED','CANCELLED','REJECTED'].includes(j.phase)&&
  j.independently_settled!==true;
}
async function observe(){
 if(observing||!signedIn())return {kind:'UNAVAILABLE'};
 observing=true;
 try{
  const state=await read('/api/reality/personal-genuine-loop-status');
  if(!Array.isArray(state.jobs)||state.jobs.length>12||
    !Array.isArray(state.independent_final_receipts)||state.independent_final_receipts.length>12||
    state.production_changed!==false||state.external_action_performed!==false)
   throw Error('OWNER_LOOP_RECEIPTS_NOT_VERIFIED');
  for(const job of state.jobs){
   const k=exactFailureKey(job.source_issue_number,job.source_failed_run_id,
    job.source_commit_sha);
   if(k)previousOriginalFailures.add(k);
   if(job.owner_install_approved===true&&
      job.historical_reconciliation?.status==='HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT'&&
      job.historical_reconciliation?.independent_database_readback===true&&
      job.historical_reconciliation?.current_job_settled===false)
    historicalNoOpIds.add(job.original_work_id);
  }
  if(startedWork&&historicalNoOpIds.has(startedWork))startedWork=null;
  if(startedWork){
   const receipt=state.independent_final_receipts.find(r=>
    r.original_work_id===startedWork&&
    r.status==='FULL_LOOP_INDEPENDENTLY_VERIFIED'&&
    r.production_changed===false);
   if(receipt){
    setStatus('FULL LOOP COMPLETED · Independent final settlement receipt verified.');
    setReceipt(startedWork);return {kind:'SETTLED',workId:startedWork};
   }
  }
  const work=startedWork?
   state.jobs.find(j=>j.original_work_id===startedWork):
   state.jobs.find(activeJob);
  if(work&&activeJob(work)){
   startedWork=work.original_work_id;
   if(work.owner_install_approved===true&&
      work.historical_reconciliation?.status==='HISTORICAL_RECONCILIATION_ALREADY_VERIFIED_NO_NEW_EFFECT'&&
      work.historical_reconciliation?.independent_database_readback===true&&
      work.historical_reconciliation?.current_job_settled===false)
    setStatus('HISTORICAL SETTLEMENT VERIFIED · Reality independently confirmed the earlier original job is already settled. No replay or additional approval. The current repair job did not execute a new settlement and does not have a final full-loop receipt.');
   else if(work.owner_install_approved===true)
    setStatus('Owner approval already recorded. Reality is continuing installation, original-job recovery and independent settlement verification. Do not approve twice.');
   else if(work.candidate_verified===true){
    setStatus('Real repair independently tested. Checking the in-chat installation approval gate.');
    try{
     const ready=await read('/api/reality/personal-qualified-capabilities');
     const exact=(ready.entries||[]).find(e=>e.original_work_id===startedWork);
     if(exact?.full_loop_preflight?.approval_gate_open===true&&!exact.approval){
      setStatus('Your exact upgrade is READY FOR APPROVAL in Reality Chat. Click Approve there once; Reality finishes the rest automatically.');
      if(!approvalPrompted&&typeof window.realityOpenChatDock==='function'){
       approvalPrompted=true;window.realityOpenChatDock(false);
       if(typeof window.homeOwnerRefresh==='function')void window.homeOwnerRefresh();
      }
     }else{
      // An independently green sandbox is not equivalent to a qualifying
      // provider-backed holdout or a complete install-to-settlement protocol.
      // Show the specific owner's read-only preflight, never a false approval.
      const gate=exact?.full_loop_preflight;
      const reasons={
       MANDATORY_HOLDOUT_NOT_VERIFIED:
        'Candidate sandbox passed, but the mandatory independent real-provider holdout has not qualified this exact artifact. Installation approval is locked until signed requalification succeeds.',
       EXACT_INSTALL_TO_SETTLEMENT_PROTOCOL_MISSING:
        'Candidate passed isolated checks, but no verified same-job installation, resumption and settlement protocol is established. Installation approval remains locked.',
       SIGNED_SOURCE_AND_COMPLETE_EXECUTION_PRECHECK_NOT_VERIFIED:
        'Signed source and full execution prechecks are incomplete. Installation approval is locked.',
       NOT_VERIFIED_OR_NOT_PENDING:
        'The candidate is not currently independently qualified for installation approval.',
       ALREADY_OWNER_APPROVED_DO_NOT_REAPPROVE:
        'The exact approval was already recorded. Reality must continue from its durable worker receipt; do not approve again.'
      };
      const note=reasons[gate?.status]||
       ('Installation preflight blocked: '+String(gate?.status||'EVIDENCE_UNAVAILABLE').slice(0,90));
      setStatus(note+' No installation or final settlement is claimed.');
     }
    }catch{
     setStatus('Upgrade tested, but approval readiness readback is unavailable. No install permission inferred.');
    }
   }else setStatus('Reality is working on the original job · '+work.phase.replaceAll('_',' ').toLowerCase()+
    '. No installation or settlement claimed yet.');
   return {kind:'ACTIVE',workId:startedWork};
  }
  if(startedWork){
   // The genuine installation ledger contains only jobs admitted to its
   // separate upgrade pipeline. Missing there is NOT proof the original
   // source-backed discovery job disappeared. Reverify its own queue.
   try{
    const continuity=await read('/api/reality/personal-original-continuity-status');
    if(continuity.status!=='OWNER_ORIGINAL_CONTINUITY_VERIFIED_READ_ONLY'||
       continuity.installation_authorized!==false||
       continuity.original_job_completed!==false||
       !Array.isArray(continuity.jobs)||continuity.jobs.length>12)
     throw Error('ORIGINAL_CONTINUITY_OWNER_RECEIPT_INVALID');
    const exact=continuity.jobs.find(j=>j.original_work_id===startedWork);
    if(exact){
     const progress={
      SAFE_FIRST_DISPATCH:'Original queue verified. First worker dispatch is still required.',
      VERIFIED_OWNER_ORIGINAL_AWAITING_FIRST_QUEUE:'Original job verified. Worker queue has not been admitted.',
      WORKER_RUNNING_MONITOR_SAME_JOB:'Exact worker run observed. Monitoring the same original job.',
      DISCOVERY_EXECUTED_NOT_FINAL_SETTLEMENT:'Discovery worker completed. Capability construction, installation and settlement are not yet proven.',
      WORKER_FAILED_RECOVERY_REVIEW_REQUIRED:'Worker failed. Preserve the original job; recovery requires independent evidence.',
      DISPATCH_DELIVERY_UNCONFIRMED_NO_REPLAY:'Worker delivery not independently observed. No duplicate dispatch.',
      WORKER_READBACK_UNAVAILABLE_NO_REPLAY:'Worker readback unavailable. No execution or settlement inferred.',
      DISPATCH_RECEIPT_RECONCILIATION_REQUIRED:'Dispatch receipt incomplete. No unverified replay.',
      PREVIOUS_EXECUTION_RECONCILIATION_REQUIRED:'Previously claimed work must be verified before continuation.',
      EXISTING_JOB_BLOCKED_NO_REPLAY:'Existing job is blocked. No duplicate execution.',
      SETTLEMENT_REQUIRES_INDEPENDENT_FINAL_RECEIPT:'Settlement requires a matching independent final receipt.'
     };
     setStatus('Original job '+startedWork+' · '+
      (progress[exact.decision]||'Continuity decision: '+String(exact.decision).slice(0,80))+
      ' Any installation approval stays in Reality Chat.');
     return {kind:'OWNER_ORIGINAL_OBSERVED',workId:startedWork};
    }
   }catch{
    setStatus('Original job '+startedWork+
     ' · independent continuity readback is unavailable. No duplicate job will be started.');
    return {kind:'UNAVAILABLE'};
   }
   setStatus('Original job '+startedWork+
    ' has no matching current continuity entry. Do not replay or claim settlement.');
   return {kind:'NEEDS_RECONCILIATION'};
  }
  return {kind:'NO_ACTIVE'};
 }catch(error){
  setStatus('Reality cannot verify the current job ledger: '+String(error.message||'UNKNOWN')+
   '. No duplicate job or false completion will be created.');
  return {kind:'UNAVAILABLE'};
 }finally{observing=false}
}
async function start(){
 if(requesting)return;
 if(!signedIn()){
  setStatus('Sign in to Reality Chat first. No work has started.');
  if(typeof window.realityOpenChatDock==='function')window.realityOpenChatDock(false);
  return;
 }
 requesting=true;button.disabled=true;receiptBox.replaceChildren();
 try{
  setStatus('Checking current jobs and final receipts to avoid duplicate execution…');
  const current=await observe();
  if(current.kind!=='NO_ACTIVE')return;
  // Check the exact owner-goal queue first. Never adopt a new issue while
  // an existing original-job discovery request may already be dispatched.
  let known=null;
  try{known=await read('/api/reality/personal-governed-build')}
  catch(error){
   if(String(error?.message)!=='GOVERNED_BUILD_FRESH_ELIGIBILITY_REQUIRED')
    throw error;
  }
  if(known?.queued===true&&exactWork(known.original_work_id)){
   startedWork=known.original_work_id;
   setStatus('Existing original job found: '+startedWork+
    '. Reality will continue this queue without creating another authorization.');
   return;
  }
  // Fresh owner goal admission is performed only by the existing server.
  // Discover a genuine provider-backed failed source, not a research idea.
  setStatus('Finding a genuine independently verified capability failure…');
  const discovered=await read('/api/reality/personal-real-repair-opportunities');
  if(!Array.isArray(discovered.opportunities)||discovered.opportunities.length>30)
   throw Error('PROVIDER_DISCOVERY_NOT_TRUSTED');
  const candidate=discovered.opportunities.find(x=>x.independently_verified===true&&
   Number.isSafeInteger(x.issue_number)&&x.issue_number>0&&
   Number.isSafeInteger(x.original_provider_failed_run_id)&&x.original_provider_failed_run_id>0&&
   SOURCE.test(String(x.source_sha||''))&&
   /^src\/reality-extensions\//.test(String(x.source_path||'')));
  if(candidate){
   const conversationId=currentConversation();
   if(!UUID.test(String(conversationId||'')))
    throw Error('REALITY_CONFIRMED_CONVERSATION_REQUIRED');
   setStatus('Original failure independently verified. Authorizing this one original-job investigation and waking the worker…');
   const joined=await write('/api/reality/personal-real-repair-opportunities',{
    intent:'AUTHORIZE_SOURCE_VERIFIED_ORIGINAL_REPAIR',
    conversation_id:conversationId,
    issue_number:candidate.issue_number,
    expected_failed_run_id:candidate.original_provider_failed_run_id,
    expected_source_sha:candidate.source_sha
   });
   if(!exactWork(joined.original_work_id)||joined.installation_authorized!==false||
    joined.original_job_completed!==false||joined.production_changed!==false)
    throw Error('ORIGINAL_JOB_RECEIPT_NOT_VERIFIED_DO_NOT_RETRY');
   startedWork=joined.original_work_id;
   setStatus(joined.worker_dispatch_started===true?
    'Exact original job dispatched. Verifying worker continuation and independent receipts.':
    joined.continuity_decision?
     'Existing original job retained · '+String(joined.continuity_decision).replaceAll('_',' ').toLowerCase()+'. No duplicate worker execution.':
    joined.worker_dispatch_error?
     'Original job saved. Worker blocked: '+String(joined.worker_dispatch_error).slice(0,100)+'.':
     'Original job saved; independent worker acknowledgment is still pending.');
   if(typeof window.homeOwnerRefresh==='function')void window.homeOwnerRefresh();
   return;
  }
  // If none of the current provider issues qualifies, resume an ALREADY
  // identified original job; do not invent a customer work item.
  setStatus('No new source-qualified issue. Checking previously authorized unfinished work…');
  if(known?.phase==='NOT_QUEUED'&&known.eligible_for_investigation===true&&
   exactWork(known.original_work_id)){
   setStatus('Queuing your verified unfinished original job with the existing autonomous worker…');
   const result=await write('/api/reality/personal-governed-build',{
    intent:'QUEUE_SAFE_AUTONOMOUS_DISCOVERY',
    expected_original_work_id:known.original_work_id
   });
   if(result.original_work_id!==known.original_work_id||
    result.installation_authorized!==false||result.production_changed!==false)
    throw Error('GOVERNED_ORIGINAL_QUEUE_UNVERIFIED_DO_NOT_RETRY');
   startedWork=result.original_work_id;
   setStatus(result.worker_dispatch_started===true?
    'Original job queued and worker dispatched. Reality is running independent discovery and repair verification.':
    'Original job queued, but worker wake is blocked: '+String(result.dispatch_error||'UNKNOWN')+
     '. No second job was created.');
   return;
  }
  setStatus('No independently qualified new gap or eligible unfinished original job exists. Reality stopped safely rather than inventing an upgrade or receipt.');
 }catch(error){
  setStatus('Full-loop start blocked: '+String(error?.message||'UNKNOWN')+
   '. Reality cannot claim installation or settlement; reconcile this job before trying again.');
 }finally{requesting=false;button.disabled=false;}
}
button.addEventListener('click',start);
// Poll read-only state; real autonomous execution occurs in the existing
// durable worker, not in a browser timer.
setInterval(()=>{if(signedIn()&&startedWork)void observe()},12000);
})();
