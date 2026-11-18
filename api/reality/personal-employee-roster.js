// Read-only named employee board for signed-in Reality owner.
// Reuses existing work catalog and category router; never admits jobs, starts
// shifts, installs upgrades, creates agents or grants external business authority.
import {privateChatConfig,authenticatedChatSession} from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from '../../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster} from '../../src/reality-employee-identity-roster-v1.js';
import {buildRealityShiftValuePreview} from '../../src/reality-shift-value-preview-v1.js';
import {prepareNextWeekEmployeePlan}
 from '../../src/reality-next-week-employee-plan-v1.js';
import {projectRealityWeeklyWorkloadInsight}
 from '../../src/reality-weekly-workload-insight-v1.js';
import {projectSingleModelRoleQueue}
 from '../../src/reality-single-model-role-work-router-v1.js';
import {readRealitySavedChatEmployeeProposals}
 from '../../src/reality-saved-chat-employee-proposals-v1.js';
import {readOwnerApprovedChatEmployeeAssignments}
 from '../../src/reality-owner-approved-chat-assignments-v1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {readOwnerTimeHorizonEvidence}
 from './personal-time-horizon.js';
import {projectRealityEmployeeTimeInquiryContext}
 from '../../src/reality-employee-time-inquiry-context-v1.js';
export const maxDuration=45;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({ok:false,error:'EMPLOYEE_ROSTER_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'EMPLOYEE_ROSTER_CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'EMPLOYEE_ROSTER_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'EMPLOYEE_ROSTER_PREVIEW_ONLY'});
  // Existing authenticated Chat is the durable archive. Project suggestions
  // separately from verified source work, without creating a shift or job.
  // A missing Chat readback must not erase the independently sourced roster.
  const savedChatPromise=readRealitySavedChatEmployeeProposals(session).catch(()=>null);
  const approvedAssignmentsPromise=
   readOwnerApprovedChatEmployeeAssignments(session).catch(()=>null);
  // Private owner-scoped readback of the durable 15-minute role calendar.
  // Fresh evidence, prior verified research, pending self-repair and
  // signed-shift requirements remain separate; no "40 hour" fiction.
  const operatingSchedulePromise=(async()=>{
   const db=shiftDatabase(process.env);
   if(db.url!==session.config?.url)return null;
   const schedule=await shiftRpc(db,
    'reality_read_owner_employee_operating_schedule_v1',{
     p_owner_id:session.user_id
    });
   const names=new Set(['Avery','Riley','Quinn','Taylor','Casey',
    'Morgan','Jordan','Sage']);
   const states=new Set([
    'CURRENT_SOURCE_REVIEW_REQUIRED','HISTORICAL_REVALIDATION_REQUIRED',
    'SOURCE_EPOCH_REVIEW_REQUIRED','SOURCE_NO_LONGER_CURRENT',
    'SOURCE_SETTLED_NO_REPLAY','EVIDENCE_REVIEW_VERIFIED',
    'MAINTENANCE_AWAITING_SIGNED_SHIFT','MAINTENANCE_IN_SIGNED_SHIFT',
    'MAINTENANCE_VERIFIED'
   ]);
   const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
   const hash=/^sha256:[a-f0-9]{64}$/;
   if(!schedule||!['OWNER_EIGHT_ROLE_WORK_CALENDAR_CURRENT',
      'OWNER_EIGHT_ROLE_WORK_CALENDAR_STALE'].includes(schedule.status)||
      schedule.owner_id!==session.user_id||
      schedule.owner_scope_verified!==true||
      schedule.role_count!==8||
      !Array.isArray(schedule.roles)||schedule.roles.length!==8||
      new Set(schedule.roles.map(r=>r.employee)).size!==8||
      !schedule.roles.every(r=>names.has(r.employee)&&
       Number.isSafeInteger(r.work_records)&&r.work_records>=0&&
       Number.isSafeInteger(r.planned_source_reviews)&&
       r.planned_source_reviews>=0&&
       Number.isSafeInteger(r.current_evidence_verified)&&
       r.current_evidence_verified>=0&&
       Number.isSafeInteger(r.unfinished_internal_repairs)&&
       r.unfinished_internal_repairs>=0)||
      !Array.isArray(schedule.items)||schedule.items.length>160||
      schedule.work_records!==schedule.items.length||
      !Number.isSafeInteger(schedule.planned_investigations)||
      schedule.planned_investigations<0||
      !Number.isSafeInteger(schedule.unfinished_internal_repairs)||
      !Number.isSafeInteger(schedule.independently_verified_current_evidence_reviews)||
      schedule.planned_dates_are_not_exec_authority!==true||
      schedule.scheduled_executable_original_jobs!==0||
      schedule.new_original_customer_jobs_created!==0||
      schedule.shift_authorized_by_read!==false||
      schedule.installation_authorized!==false||
      schedule.production_changed!==false||
      schedule.items.some(j=>!names.has(j.employee)||
       !/^schedule:[a-f0-9]{64}$/.test(j.work_key||'')||
       !['SOURCE_INVESTIGATION','INTERNAL_MAINTENANCE'].includes(j.work_kind)||
       !states.has(j.work_state)||
       typeof j.title!=='string'||!j.title||j.title.length>240||
       typeof j.source_ref!=='string'||j.source_ref.length>1024||
       !hash.test(j.source_evidence_sha256||'')||
       typeof j.independently_verified_current_evidence!=='boolean'||
       (j.previous_independent_evidence_receipt_sha256!==null&&
        !hash.test(j.previous_independent_evidence_receipt_sha256||''))||
       (j.planned_business_date!==null&&
        !/^20\d{2}-[01]\d-[0-3]\d$/.test(j.planned_business_date||''))||
       (j.daily_order===null)!==(j.planned_business_date===null)||
       (j.daily_order!==null&&
        (!Number.isSafeInteger(j.daily_order)||j.daily_order<1||j.daily_order>4))||
       (j.work_kind==='INTERNAL_MAINTENANCE'&&
        (!uuid.test(j.incident_id||'')||!uuid.test(j.origin_shift_id||'')))||
       j.independently_verified_current_evidence!==(
        j.work_state==='EVIDENCE_REVIEW_VERIFIED')))
    return null;
   const roleSum=field=>schedule.roles.reduce((n,r)=>n+r[field],0);
   if(roleSum('work_records')!==schedule.work_records||
      roleSum('planned_source_reviews')!==schedule.planned_investigations||
      roleSum('unfinished_internal_repairs')!==schedule.unfinished_internal_repairs||
      roleSum('current_evidence_verified')!==
        schedule.independently_verified_current_evidence_reviews||
      new Set(schedule.items.map(x=>x.work_key)).size!==schedule.items.length||
      schedule.items.filter(x=>x.planned_business_date!==null).length!==
        schedule.planned_investigations)
    return null;
   return {...schedule,read_only:true,no_customer_originals_authorized:true};
  })().catch(()=>null);
  const discoveryPromise=(async()=>{
   const db=shiftDatabase(process.env);
   if(db.url!==session.config?.url)return null;
   const data=await shiftRpc(db,'reality_read_owner_employee_discovery_v1',{
    p_owner_id:session.user_id});
   const names=new Set(['Avery','Riley','Quinn','Taylor','Casey',
     'Morgan','Jordan','Sage']);
   if(data?.status!=='OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY'||
    data.owner_id!==session.user_id||
    data.shift_authorized!==false||
    data.installation_authorized!==false||
    data.production_changed!==false||
    data.qualified_jobs!==0||
    !Number.isFinite(Date.parse(data.checked_at||''))||
    !Array.isArray(data.roles)||data.roles.length!==8||
    new Set(data.roles.map(x=>x.employee)).size!==8||
    !data.roles.every(x=>
     names.has(x.employee)&&
     ['CURRENT_PROOF_REQUIRED','HISTORICAL_SOURCES_REQUIRE_REFRESH',
      'NO_CONNECTED_ROLE_SOURCE_EVIDENCE'].includes(x.coverage_state)&&
     Number.isSafeInteger(x.candidate_source_count)&&
     x.candidate_source_count>=0&&x.candidate_source_count<=150&&
     Number.isSafeInteger(x.historical_source_count)&&
     x.historical_source_count>=0&&x.historical_source_count<=150&&
     Number.isSafeInteger(x.settled_source_count)&&
     x.settled_source_count>=0&&x.settled_source_count<=150&&
     x.execution_authorized===false&&x.qualified_jobs===0)||
    !Array.isArray(data.items)||data.items.length>150||
    data.source_count!==data.items.length||
    !data.items.every(x=>
     names.has(x.employee)&&
     ['GITHUB_ISSUE','GITHUB_PULL_REQUEST','MARKET_ASSESSMENT',
      'CAPABILITY_AUDIT','ROI_EVIDENCE_GAP'].includes(x.source_family)&&
     ['NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED',
      'SETTLED_NO_REPLAY'].includes(x.disposition)&&
     /^sha256:[a-f0-9]{64}$/.test(x.evidence_sha256||'')&&
     typeof x.title==='string'&&x.title.length>0&&x.title.length<=240&&
     typeof x.source_ref==='string'&&x.source_ref.length<=1024&&
     x.qualified_job===false&&x.execution_authorized===false))
    return null;
   return {
    ...data,read_only:true,qualified_executable_jobs:0,
    employee_discovery_not_actual_shift:true
   };
  })().catch(()=>null);
  // The existing Home time view is an owner-scoped read, not a new queue.
  const timePromise=(async()=>{
   const db=shiftDatabase(process.env);
   if(db.url!==session.config?.url)return null;
   return readOwnerTimeHorizonEvidence({ownerId:session.user_id,db});
  })().catch(()=>null);
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const roster=buildRealityNamedEmployeeRoster(brief);
  const value_preview=buildRealityShiftValuePreview(roster);
  let verifiedSource=null,backgroundSourceIssueCount=null;
  let weeklyInvestigationReceipts=null;
  // Scheduled private Supabase prep is a SOURCE snapshot, never owner job
  // authority. Losing that readback degrades to an explicitly on-demand draft.
  try{
   const db=shiftDatabase(process.env);
   if(db.url===session.config?.url){
    const prepared=await shiftRpc(db,'reality_read_next_week_source_snapshot_v1',{});
    if(prepared?.status==='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'&&
       prepared.shift_execution_authorized===false&&
       prepared.installation_authorized===false&&
       prepared.production_changed===false){
      verifiedSource=prepared;
      backgroundSourceIssueCount=prepared.open_issue_count;
    }
   }
  }catch{
   // Never claim the unattended refresh succeeded on readback failure.
  }
  // Read back the SAME signed worker's actual provider investigation
  // receipts, NOT the unexecuted weekly work-planning projection.
  // A source investigation is not an authorized repair or saved labor.
  if(verifiedSource?.status==='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'){
   try{
    const db=shiftDatabase(process.env);
    if(db.url===session.config?.url){
     const checked=await shiftRpc(db,
      'reality_read_current_shift_weekly_investigations_v1',{});
     if(checked?.status==='CURRENT_SIGNED_WEEKLY_INVESTIGATION_READBACK'&&
      checked.owner_id===session.user_id&&
      checked.snapshot_sha256===verifiedSource.source_sha256&&
      checked.execution_authorized===false&&
      checked.installation_authorized===false&&
      checked.production_changed===false&&
      Array.isArray(checked.items)&&checked.items.length<=30&&
      new Set(checked.items.map(x=>x.source_ref)).size===checked.items.length&&
      checked.items.every(x=>
       /^[1-9][0-9]*$/.test(String(x?.issue_number||''))&&
       x.source_ref==='https://github.com/maloney2323/Reality/issues/'+
         x.issue_number&&
       ['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
        .includes(x.employee)&&
       /^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$/
        .test(x.investigation_receipt_ref||'')&&
       typeof x.investigation_status==='string'&&
       x.investigation_status.length>=24&&
       /^sha256:[a-f0-9]{64}$/.test(x.provider_evidence_sha256||'')))
      weeklyInvestigationReceipts={
       status:'SIGNED_WORKER_EMPLOYEE_INVESTIGATIONS_INDEPENDENTLY_RECEIPTED',
       count:checked.items.length,
       receipts:checked.items,
       source_investigation_only:true,
       new_executable_jobs_authorized:0,
       installation_authorized:false,production_changed:false
      };
    }
   }catch{
    // An unavailable readback MUST NOT become a claimed completed task.
   }
  }
  // The approved worker can now AUTO-ADMIT a real ORIGINAL after frozen RED.
  // Show the current signed source without inventing an install or final receipt.
  let signedOriginals=null;
  try{
   const db=shiftDatabase(process.env);
   if(db.url===session.config?.url){
    const graph=await shiftRpc(db,
     'reality_read_current_shift_execution_graph_v1',{});
    if(graph?.status==='OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED'&&
       graph.owner_id===session.user_id&&
       graph.completion_bound===true&&
       graph.execution_scope_from_owner_warrant_only===true&&
       graph.installation_authorized===false&&
       graph.production_changed===false&&
       Array.isArray(graph.jobs)&&graph.jobs.length<=4){
     const rows=graph.jobs.filter(x=>
      x.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
      ['SOURCE_ADMITTED','CANDIDATE_TESTING',
       'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'].includes(x.phase)&&
      /^work:[a-f0-9]{32}$/.test(x.original_work_id||'')&&
      /^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/
       .test(x.source_ref||'')&&
      /^sha256:[a-f0-9]{64}$/.test(x.source_proof_sha256||'')&&
      x.independent_source_proof_verified===true&&
      x.capability_installation_authorized===false);
     signedOriginals={
      status:'CURRENT_OWNER_SHIFT_ENGINEERING_ORIGINALS_SOURCE_BOUND',
      count:rows.length,
      shift_id:graph.shift_id,
      items:rows.map(x=>({
       source_ref:x.source_ref,
       original_work_id:x.original_work_id,
       phase:x.phase,
       next_governed_action:x.next_governed_action,
       assigned_employee:'Riley',
       installation_authorized:false,
       original_job_completed:false
      })),
      owner_scope_verified:true,
      new_shift_started:false,
      installation_authorized:false,
      production_changed:false
     };
    }
   }
  }catch{
   // Never infer live admission from a stale issue or last worker pulse.
  }
  // Existing signed background planner now qualifies each GitHub source
  // BEFORE it reaches owner-facing employee Discovery. This is an investigation
  // assignment only, not permission to start or install an original job.
  const rawAssignments=verifiedSource?.qualification_status===
   'CURRENT_SOURCE_INSPECTED_BEFORE_OWNER_DISCOVERY'&&
   Number.isSafeInteger(verifiedSource.upstream_inspected_count)&&
   verifiedSource.upstream_inspected_count===verifiedSource.open_issue_count&&
   Array.isArray(verifiedSource.employee_source_investigation_assignments)&&
   verifiedSource.employee_source_investigation_assignments.length===
     verifiedSource.open_issue_count?
    verifiedSource.employee_source_investigation_assignments:null;
  const qualification=rawAssignments===null?{
   status:'UPSTREAM_SOURCE_QUALIFICATION_UNVERIFIED',
   inspected_count:0,investigation_assignment_count:0,
   already_settled_no_replay_count:0,items:[]
  }:(()=>{
   const seen=new Set(),valid=rawAssignments.every(x=>{
    if(!Number.isSafeInteger(x?.issue_number)||x.issue_number<1||
       seen.has(x.issue_number)||
       x.source_url!=='https://github.com/maloney2323/Reality/issues/'+
        x.issue_number||
       typeof x.title!=='string'||x.title.length<1||x.title.length>200||
       !['PRIOR_ORIGINAL_SETTLED_NO_REPLAY',
        'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
        'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
        'CURRENT_FAILURE_REPRODUCTION_REQUIRED',
        'SOURCE_REVIEW_NEEDS_CURRENT_PROOF'].includes(x.status)||
       !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
        .includes(x.assigned_employee)||
       typeof x.next_proof!=='string'||x.next_proof.length<20||
       x.executable_original!==false||
       x.execution_authorized!==false||
       x.installation_authorized!==false)return false;
    seen.add(x.issue_number);return true;
   });
   if(!valid)throw Error('EMPLOYEE_UPSTREAM_SOURCE_PROOF_UNVERIFIED');
   return {
    status:'UPSTREAM_PROVIDER_SOURCES_QUALIFIED_FOR_INVESTIGATION',
    inspected_count:rawAssignments.length,
    investigation_assignment_count:rawAssignments.filter(x=>
     x.status!=='PRIOR_ORIGINAL_SETTLED_NO_REPLAY').length,
    already_settled_no_replay_count:rawAssignments.filter(x=>
     x.status==='PRIOR_ORIGINAL_SETTLED_NO_REPLAY').length,
    items:rawAssignments,
    new_original_jobs_authorized:0,
    capability_installations_authorized:0,
    production_changed:false
   };
  })();
  const next_week_plan=prepareNextWeekEmployeePlan(roster,{
   preparedSource:verifiedSource
  });
  const weekly_workload_insight=projectRealityWeeklyWorkloadInsight(next_week_plan);
  const single_model_role_routing=projectSingleModelRoleQueue(next_week_plan);
  const saved_chat_employee_proposals=await savedChatPromise;
  const approved_chat_employee_assignments=await approvedAssignmentsPromise;
  const [employee_discovery,timeEvidence,employee_operating_schedule]=
   await Promise.all([discoveryPromise,timePromise,operatingSchedulePromise]);
  let employee_time_inquiry_context=null;
  if(employee_discovery&&timeEvidence){
   try{
    employee_time_inquiry_context=projectRealityEmployeeTimeInquiryContext({
     ownerId:session.user_id,roster,time:timeEvidence,
     discovery:employee_discovery
    });
   }catch{
    // A mismatched owner/source is not transformed into an inquiry or job.
   }
  }
  return res.status(200).json({ok:true,...roster,value_preview,
   next_week_plan,weekly_workload_insight,single_model_role_routing,saved_chat_employee_proposals,
   approved_chat_employee_assignments,
   approved_chat_employee_assignments_status:approved_chat_employee_assignments?
    'OWNER_DURABLE_CHAT_JOB_LIST_READBACK':'APPROVED_CHAT_JOB_LIST_UNVERIFIED',
   saved_chat_employee_proposals_status:saved_chat_employee_proposals?
    'AUTHENTICATED_SAVED_CHAT_READBACK':'SAVED_CHAT_READBACK_UNAVAILABLE',
   next_week_background_open_issue_count:backgroundSourceIssueCount,
   upstream_source_qualification:qualification,
   weekly_employee_investigation_receipts:weeklyInvestigationReceipts,
   current_shift_engineering_originals:signedOriginals,
   employee_discovery,
   employee_operating_schedule,
   employee_operating_schedule_status:employee_operating_schedule?
    'OWNER_DURABLE_EIGHT_ROLE_CALENDAR_VERIFIED':
    'OWNER_DURABLE_EIGHT_ROLE_CALENDAR_UNVERIFIED',
   employee_time_inquiry_context,
   employee_time_inquiry_status:employee_time_inquiry_context?.status||
    'TIME_EVIDENCE_OR_DISCOVERY_NOT_VERIFIED',
   employee_discovery_status:employee_discovery?
    'SIGNED_OWNER_EIGHT_ROLE_DISCOVERY_READBACK':
    'EMPLOYEE_DISCOVERY_READBACK_UNVERIFIED',
   owner_scope_verified:true,
   source_data_partial:brief.status==='SOURCE_BACKED_DISCOVERY_PARTIAL',
   worker_execution_authorized:false});
 }catch(e){
  console.warn('EMPLOYEE_ROSTER_READ_ONLY',
   /^EMPLOYEE_ROSTER_[A-Z0-9_]+$/.test(e?.message||'')?e.message:'SOURCE_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'EMPLOYEE_ROSTER_SOURCE_OR_SESSION_UNAVAILABLE',
   worker_execution_authorized:false,production_changed:false});
 }
}
