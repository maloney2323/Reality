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
import {projectSingleModelRoleQueue}
 from '../../src/reality-single-model-role-work-router-v1.js';
import {readRealitySavedChatEmployeeProposals}
 from '../../src/reality-saved-chat-employee-proposals-v1.js';
import {readOwnerApprovedChatEmployeeAssignments}
 from '../../src/reality-owner-approved-chat-assignments-v1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
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
  const single_model_role_routing=projectSingleModelRoleQueue(next_week_plan);
  const saved_chat_employee_proposals=await savedChatPromise;
  const approved_chat_employee_assignments=await approvedAssignmentsPromise;
  return res.status(200).json({ok:true,...roster,value_preview,
   next_week_plan,single_model_role_routing,saved_chat_employee_proposals,
   approved_chat_employee_assignments,
   approved_chat_employee_assignments_status:approved_chat_employee_assignments?
    'OWNER_DURABLE_CHAT_JOB_LIST_READBACK':'APPROVED_CHAT_JOB_LIST_UNVERIFIED',
   saved_chat_employee_proposals_status:saved_chat_employee_proposals?
    'AUTHENTICATED_SAVED_CHAT_READBACK':'SAVED_CHAT_READBACK_UNAVAILABLE',
   next_week_background_open_issue_count:backgroundSourceIssueCount,
   upstream_source_qualification:qualification,
   weekly_employee_investigation_receipts:weeklyInvestigationReceipts,
   current_shift_engineering_originals:signedOriginals,
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
