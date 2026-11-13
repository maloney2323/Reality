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
