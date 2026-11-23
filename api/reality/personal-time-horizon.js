// One owner-scoped Past / Present / Future projection of Reality's EXISTING
// durable ledgers. This read cannot approve, create, dispatch or settle work.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {projectOwnerFinalLoopTimeReadback,
 projectFinalLoopOwnerReviewedRecoveryGuidance}
 from '../../src/reality-final-loop-owner-time-bridge-v1.js';
import {projectFinalLoopUniverseFeedback}
 from '../../src/reality-final-loop-universe-feedback-v1.js';
export const maxDuration=18;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const EMPLOYEES=new Set(['Avery','Riley','Quinn','Taylor','Casey',
 'Morgan','Jordan','Sage']);
const ACTIVE=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK']);
const shiftStillActive=(s,now)=>ACTIVE.has(s.status)&&
 (s.planned_end_at==='infinity'||
  (Number.isFinite(Date.parse(s.planned_end_at||''))&&
   Date.parse(s.planned_end_at)>now));
const goodDate=value=>typeof value==='string'&&
 Number.isFinite(Date.parse(value));
function pastReceiptProjection(value){
 if(value?.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
  value.does_not_authorize_actions!==true||
  !Array.isArray(value.receipts)||value.receipts.length>30||
  value.receipts.some(r=>
   r.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
   !WORK.test(r.original_work_id||'')||
   !goodDate(r.verified_at)||
   !/^[a-f0-9]{64}$/.test(r.artifact_sha256||'')||
   !SHA.test(r.verifier_artifact_digest||'')||
   !UUID.test(r.settlement_event_id||'')||
   r.production_changed!==false||
   !Number.isSafeInteger(r.provider_run_id)||r.provider_run_id<1))
  return null;
 const latest=value.receipts.reduce((n,r)=>
  !n||Date.parse(r.verified_at)>Date.parse(n)?r.verified_at:n,null);
 return {status:'INDEPENDENT_HISTORY_VERIFIED',
  verified_final_loop_receipts:value.receipts.length,
  most_recent_verified_at:latest,
  receipt_scope:'INDEPENDENT_SETTLED_FULL_LOOP_ONLY',
  owner_can_review_at:'/value#results'};
}
function presentShiftProjection(value,now){
 let read;
 try{read=assertShiftReadback(value)}catch{return null}
 const active=read.shifts.filter(s=>shiftStillActive(s,now));
 return {status:'OWNER_SHIFT_HISTORY_READBACK_VERIFIED',
  active_shift_count:active.length,
  active_shift_status:active[0]?.status||null,
  latest_shift_status:read.shifts[0]?.status||null,
  last_five_shift_count:read.shifts.length,
  shift_history_is_not_active_execution:true,
  owner_can_review_at:'/shifts'};
}
function futureDiscoveryProjection(value,now){
 if(value?.status!=='OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY'||
  !UUID.test(value.owner_id||'')||
  value.qualified_jobs!==0||value.shift_authorized!==false||
  value.installation_authorized!==false||value.production_changed!==false||
  !goodDate(value.checked_at)||
  !Array.isArray(value.roles)||value.roles.length!==8||
  new Set(value.roles.map(x=>x.employee)).size!==8||
  !value.roles.every(x=>EMPLOYEES.has(x.employee)&&
   ['CURRENT_PROOF_REQUIRED','HISTORICAL_SOURCES_REQUIRE_REFRESH',
    'NO_CONNECTED_ROLE_SOURCE_EVIDENCE'].includes(x.coverage_state)&&
   ['candidate_source_count','historical_source_count','settled_source_count']
    .every(k=>Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=150)&&
   x.qualified_jobs===0&&x.execution_authorized===false)||
  !Array.isArray(value.items)||value.items.length>150||
  value.source_count!==value.items.length||
  !value.items.every(x=>
   EMPLOYEES.has(x.employee)&&
   ['GITHUB_ISSUE','GITHUB_PULL_REQUEST','MARKET_ASSESSMENT',
    'CAPABILITY_AUDIT','ROI_EVIDENCE_GAP'].includes(x.source_family)&&
   ['NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED',
    'SETTLED_NO_REPLAY'].includes(x.disposition)&&
   SHA.test(x.evidence_sha256||'')&&
   x.qualified_job===false&&x.execution_authorized===false))
  return null;
 const count=status=>value.items.filter(x=>x.disposition===status).length;
 const candidate=count('NEEDS_CURRENT_VALIDATION'),
  historical=count('HISTORICAL_REVALIDATION_REQUIRED'),
  settled=count('SETTLED_NO_REPLAY');
 if(candidate!==value.roles.reduce((sum,r)=>sum+r.candidate_source_count,0)||
  historical!==value.roles.reduce((sum,r)=>sum+r.historical_source_count,0)||
  settled!==value.roles.reduce((sum,r)=>sum+r.settled_source_count,0)||
  candidate+historical+settled!==value.items.length)
  return null;
 const elapsed=now-Date.parse(value.checked_at);
 return {status:'OWNER_DISCOVERY_OBSERVATIONS_VERIFIED',
  source_checked_at:value.checked_at,
  snapshot_stale:elapsed>12*60*60*1000||elapsed<(-5*60*1000),
  review_observations_needing_current_proof:candidate,
  historical_observations_needing_refresh:historical,
  settled_observations_not_to_replay:settled,
  employee_roles_with_source_lenses:
   value.roles.filter(r=>r.candidate_source_count+
    r.historical_source_count>0).length,
  employee_roles_total:8,qualified_executable_jobs:0,
  observations_are_not_authorized_work:true,
  owner_can_review_at:'/employees'};
}

// Shared owner-scoped readback for Home and employee inquiry context.
// This reads existing ledgers; it cannot qualify, approve, create or dispatch work.
export async function readOwnerTimeHorizonEvidence({
 ownerId,db,call=shiftRpc,now=Date.now(),env=process.env
}={}){
 if(!UUID.test(ownerId||'')||!db||!Number.isFinite(now))
  throw Error('REALITY_TIME_OWNER_READ_INPUT_UNVERIFIED');
  const checks=await Promise.allSettled([
   call(db,'reality_read_owner_final_receipts_v1',
    {p_owner_id:ownerId}),
   call(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:ownerId}),
   call(db,'reality_read_owner_employee_discovery_v1',
    {p_owner_id:ownerId})
  ]);
  const past=checks[0].status==='fulfilled'?
   pastReceiptProjection(checks[0].value):null;
  const present=checks[1].status==='fulfilled'?
   presentShiftProjection(checks[1].value,now):null;
  const potential=checks[2].status==='fulfilled'&&
   checks[2].value?.owner_id===ownerId?
   futureDiscoveryProjection(checks[2].value,now):null;
  // Existing owner-visible Past / Present / Future remains sourced from
  // the original three readbacks. This optional FOURTH read is a strict
  // same-owner, same-active-shift Final Loop proof projection, not a new
  // customer job, active worker or CEO agent. It cannot change card counts.
  let finalLoopOwner={
   status:'FINAL_LOOP_OWNER_TIME_VIEW_NOT_ENABLED',
   read_only:true,owner_scope_verified:false,
   executive:null,time_horizon:null,
   original_job_completed:false,external_execution_authorized:false
  };
  if(env.VERCEL_ENV==='preview'&&
     env.REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED==='true'){
   try{
    const shifts=checks[1].status==='fulfilled'?
     assertShiftReadback(checks[1].value).shifts:[];
    const active=shifts.filter(s=>shiftStillActive(s,now));
    if(active.length!==1){
     finalLoopOwner={
      status:active.length===0?
       'FINAL_LOOP_NO_ACTIVE_SIGNED_OWNER_SHIFT':
       'FINAL_LOOP_MULTIPLE_ACTIVE_SHIFT_SCOPE_UNVERIFIED',
      read_only:true,owner_scope_verified:false,
      executive:null,time_horizon:null,
      original_job_completed:false,external_execution_authorized:false
     };
    }else{
     const proof=await call(db,
      'reality_read_current_final_loop_proof_envelope_v1',
      {p_shift_id:active[0].shift_id},{timeoutMs:6000});
     finalLoopOwner=projectOwnerFinalLoopTimeReadback({
      ownerId,shiftId:active[0].shift_id,
      expectedPlanFingerprint:active[0].plan_fingerprint,
      proof,independentHistory:past,now
     });
    }
   }catch{
    finalLoopOwner={
     status:'FINAL_LOOP_CANONICAL_PROOF_READER_NOT_INSTALLED_OR_UNAVAILABLE',
     read_only:true,owner_scope_verified:false,
     executive:null,time_horizon:null,
     original_job_completed:false,external_execution_authorized:false
    };
   }
  }
  // Optional same-owner, same-frozen-shift source-plan readback.
  // Proposed eight-file scopes remain Present evidence obligations, NEVER
  // accepted originals, approved Future work or independently settled Past.
  let finalLoopSourcePlans={
   status:'FINAL_LOOP_SOURCE_PLAN_OWNER_VIEW_NOT_ENABLED',
   read_only:true,owner_scope_verified:false,
   plans:[],execution_authorized:false,child_originals_admitted:0,
   original_job_completed:false
  };
  if(env.VERCEL_ENV==='preview'&&
     env.REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED==='true'&&
     env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_OWNER_VIEW_ENABLED==='true'&&
     finalLoopOwner?.status==='FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY'&&
     finalLoopOwner.owner_scope_verified===true){
   try{
    const p=await call(db,'reality_read_final_loop_pr_source_plans_v1',{
     p_shift_id:finalLoopOwner.shift_id
    },{timeoutMs:6000});
    const expected=finalLoopOwner.time_horizon?.present?.obligations||[];
    if(p?.schema==='reality-final-loop-pr-source-plans-readback-v1'&&
       p.status==='FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE'&&
       p.owner_id===ownerId&&
       p.shift_id===finalLoopOwner.shift_id&&
       p.plan_fingerprint===finalLoopOwner.time_horizon?.present?.plan_fingerprint&&
       p.read_only===true&&p.execution_authorized===false&&
       p.original_job_completed===false&&
       p.child_originals_admitted===0&&
       Array.isArray(p.plans)&&p.plans.length<=32&&
       p.plans.every(x=>
        expected.some(j=>j.source_ref===x.source_ref&&
         (j.original_work_id??null)===(x.parent_original_work_id??null))&&
        x.state==='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'&&
        x.independent_source_review_verified===false&&
        x.owner_acceptance_verified===false&&
        x.child_originals_admitted===0&&
        /^sha256:[a-f0-9]{64}$/.test(x.source_manifest_sha256||'')&&
        /^[a-f0-9]{40}$/.test(x.source_head_sha||'')&&
        Number.isSafeInteger(x.file_count)&&x.file_count>=9&&x.file_count<=500&&
        Number.isSafeInteger(x.proposed_scope_count)&&
        x.proposed_scope_count>=2&&x.proposed_scope_count<=63)){
     finalLoopSourcePlans={
      status:'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY',
      owner_id:ownerId,shift_id:p.shift_id,
      read_only:true,owner_scope_verified:true,
      plans:p.plans,
      execution_authorized:false,child_originals_admitted:0,
      original_job_completed:false
     };
    }
   }catch{
    finalLoopSourcePlans={
     status:'FINAL_LOOP_SOURCE_PLAN_PROOF_READER_NOT_INSTALLED',
     read_only:true,owner_scope_verified:false,
     plans:[],execution_authorized:false,child_originals_admitted:0,
     original_job_completed:false
    };
   }
  }
  // Read the SAME signed shift's verified recovery and owner-packet evidence
  // into Past/Present/Future and CEO guidance. Do not change canonical
  // completion or authorization, and never self-certify this as settlement.
  let finalLoopRecoveryGuidance={
   status:'FINAL_LOOP_OWNER_RECOVERY_GUIDANCE_NOT_ENABLED',
   read_only:true,original_job_completed:false,authority_granted:false
  };
  if(env.VERCEL_ENV==='preview'&&
     env.REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED==='true'&&
     env.REALITY_FINAL_LOOP_PR_SOURCE_PLAN_OWNER_VIEW_ENABLED==='true'&&
     env.REALITY_FINAL_LOOP_RECOVERY_OWNER_GUIDANCE_ENABLED==='true'&&
     finalLoopOwner.status==='FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY'&&
     finalLoopSourcePlans.status===
      'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY'){
   try{
    const [preflight,recoveryActions,ownerPackets]=await Promise.all([
     call(db,'reality_read_final_loop_child_approval_preflight_v1',{
      p_shift_id:finalLoopOwner.shift_id},{timeoutMs:6000}),
     call(db,'reality_read_owner_signed_shift_recovery_actions_v1',{
      p_owner_id:ownerId},{timeoutMs:6000}),
     call(db,'reality_read_owner_final_loop_child_approvals_v1',{
      p_owner_id:ownerId,p_shift_id:finalLoopOwner.shift_id
     },{timeoutMs:6000})
    ]);
    finalLoopRecoveryGuidance=projectFinalLoopOwnerReviewedRecoveryGuidance({
     ownerView:finalLoopOwner,sourcePlans:finalLoopSourcePlans,
     preflight,recoveryActions,ownerPackets
    });
    if(finalLoopRecoveryGuidance.status===
       'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY')
     finalLoopOwner=Object.freeze({...finalLoopOwner,
      recovery_guidance:finalLoopRecoveryGuidance});
   }catch{
    finalLoopRecoveryGuidance={
     status:'FINAL_LOOP_OWNER_RECOVERY_GUIDANCE_INDEPENDENT_READBACK_FAILED',
     read_only:true,original_job_completed:false,authority_granted:false
    };
   }
  }
  // Separately verified native+Universe parent settlement becomes Past
  // evidence. Pending parent delivery remains Present, never invented Past.
  let finalLoopParentOutcomes={
   status:'FINAL_LOOP_PARENT_OUTCOME_OWNER_VIEW_NOT_ENABLED',
   owner_scope_verified:false,read_only:true,outcomes:[],
   parent_delivery_count:null,verified_parent_count:null,
   unfinished_parent_count:null,execution_authorized:false
  };
  if(env.VERCEL_ENV==='preview'&&
     env.REALITY_FINAL_LOOP_PARENT_OUTCOME_OWNER_VIEW_ENABLED==='true'&&
     checks[1].status==='fulfilled'){
   try{
    const shifts=assertShiftReadback(checks[1].value).shifts;
    const active=shifts.filter(v=>shiftStillActive(v,now));
    if(active.length===1){
     const r=await call(db,
      'reality_read_owner_final_loop_parent_outcomes_v1',{
       p_owner_id:ownerId,p_shift_id:active[0].shift_id
      },{timeoutMs:6000});
     const items=r?.outcomes;
     const valid=r?.status==='FINAL_LOOP_OWNER_PARENT_OUTCOMES_READ_ONLY'&&
      r.owner_id===ownerId&&r.shift_id===active[0].shift_id&&
      r.owner_scope_verified===true&&r.read_only===true&&
      r.execution_authorized===false&&r.shift_completed_by_read===false&&
      Array.isArray(items)&&items.length<=16&&
      Number.isSafeInteger(r.parent_delivery_count)&&
      r.parent_delivery_count===items.length&&
      Number.isSafeInteger(r.verified_parent_count)&&
      Number.isSafeInteger(r.unfinished_parent_count)&&
      r.verified_parent_count+r.unfinished_parent_count===items.length&&
      r.verified_parent_count===
       items.filter(x=>x.original_job_completed===true).length&&
      items.every(x=>
       WORK.test(x.original_work_id||'')&&
       /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(
        x.source_ref||'')&&
       SHA.test(x.source_manifest_sha256||'')&&
       typeof x.independent_universe_verified==='boolean'&&
       x.independent_universe_verified===x.original_job_completed&&
       (x.original_job_completed?
        x.status==='INDEPENDENTLY_SETTLED_UNIVERSE_PAST'&&
        /^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*#issuecomment-[1-9]\d*$/.test(
         x.verified_provider_comment_url||'')&&
        UUID.test(x.verified_universe_outcome_event_id||'')&&
        UUID.test(x.parent_settlement_receipt_id||''):
        x.status==='PARENT_DELIVERY_UNFINISHED_PRESENT'&&
        x.verified_provider_comment_url==null&&
        x.verified_universe_outcome_event_id==null));
     if(valid)finalLoopParentOutcomes={
      status:'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ',
      owner_id:ownerId,shift_id:r.shift_id,
      owner_scope_verified:true,read_only:true,
      outcomes:items,parent_delivery_count:r.parent_delivery_count,
      verified_parent_count:r.verified_parent_count,
      unfinished_parent_count:r.unfinished_parent_count,
      execution_authorized:false
     };
    }
   }catch{
    finalLoopParentOutcomes={
     status:'FINAL_LOOP_PARENT_OUTCOME_PROOF_NOT_INSTALLED_OR_UNAVAILABLE',
     owner_scope_verified:false,read_only:true,outcomes:[],
     parent_delivery_count:null,verified_parent_count:null,
     unfinished_parent_count:null,execution_authorized:false
    };
   }
  }
  // One owner/shift/root-bound Universe feedback projection over the
  // INDEPENDENT native+Universe settlement reader and canonical Continuity.
  // The same result can inform CEO and Chat, but grants no new authority.
  let finalLoopUniverseFeedback={
   status:'FINAL_LOOP_UNIVERSE_FEEDBACK_NOT_ENABLED',
   read_only:true,universe_readback_verified:false,
   execution_authorized:false,original_job_completed:false
  };
  if(env.VERCEL_ENV==='preview'&&
     env.REALITY_FINAL_LOOP_UNIVERSE_FEEDBACK_ENABLED==='true'&&
     finalLoopOwner.status===
      'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY'&&
     finalLoopParentOutcomes.status===
      'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ'){
   finalLoopUniverseFeedback=projectFinalLoopUniverseFeedback({
    canonicalView:finalLoopOwner,parentOutcomes:finalLoopParentOutcomes,
    recoveryGuidance:finalLoopRecoveryGuidance
   });
   if(finalLoopUniverseFeedback.status===
      'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY')
    finalLoopOwner=Object.freeze({...finalLoopOwner,
     universe_feedback:finalLoopUniverseFeedback});
  }

  // Each horizon can fail independently; never represent missing evidence as
  // zero jobs, zero receipts, a completed task, or a fresh plan.
  return Object.freeze({
   ok:true,status:'REALITY_OWNER_TIME_HORIZON_READ_ONLY',
   owner_scope_verified:true,read_only:true,
   checked_at:new Date(now).toISOString(),
   past:past||{status:'PAST_RECEIPTS_NOT_VERIFIED'},
   present:present||{status:'PRESENT_SHIFT_NOT_VERIFIED'},
   future:potential||{status:'FUTURE_DISCOVERY_NOT_VERIFIED'},
   final_loop_owner:finalLoopOwner,
   final_loop_source_plans:finalLoopSourcePlans,
   final_loop_parent_outcomes:finalLoopParentOutcomes,
   final_loop_universe_feedback:finalLoopUniverseFeedback,
   final_loop_recovery_guidance:finalLoopRecoveryGuidance,
   approved_new_work_by_read:false,shift_started_by_read:false,
   deployment_changed_by_read:false,billing_changed_by_read:false,
   new_jobs_created_by_read:0,verified_cash_savings_usd:null
  });
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).setHeader('Allow','GET')
  .json({ok:false,error:'REALITY_TIME_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'REALITY_TIME_QUERY_SCOPE_DENIED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'REALITY_TIME_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'REALITY_TIME_PROJECT_MISMATCH'});
  const data=await readOwnerTimeHorizonEvidence({
   ownerId:session.user_id,db
  });
  return res.status(200).json(data);
 }catch(e){
  console.warn('REALITY_TIME_OWNER_READBACK_UNAVAILABLE');
  return res.status(503).json({
   ok:false,error:'REALITY_TIME_OWNER_READBACK_UNAVAILABLE',
   owner_scope_verified:false,approved_new_work_by_read:false
  });
 }
}
