// Bind Reality's real employee shift status to authenticated Chat
// observations. This does NOT grant authority or let the model update a job.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {buildRealityShiftConversationBrief}
 from './reality-shift-conversation-brief-v1.js';
import {projectOwnerInternalMaintenanceContinuity}
 from './reality-owner-internal-maintenance-continuity-v1.js';
import {buildRealityEvidenceGroundedSelfAudit,summarizeRealitySelfAuditForModel}
 from './reality-evidence-grounded-self-audit-v1.js';
import {buildRealityWorkCatalog} from './reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from './reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from './reality-employee-identity-roster-v1.js';
import {prepareNextWeekEmployeePlan}
 from './reality-next-week-employee-plan-v1.js';
import {projectRealityWeeklyWorkloadInsight}
 from './reality-weekly-workload-insight-v1.js';
import {assessRealityWorkdayTeam,assessRealityCompanyWorkforce,routeRealityWorkCategoriesToEmployees} from './reality-workday-team-assessment-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const relevant=text=>/\b(shift|workday|work day|employee|employees|staff|staffing|team|headcount|roles|jobs|hire|workers|what did|did you do|doing now|next|progress|task|status|schedule|approval|approved|authorize|authorized|authorization|maintenance|repairs?|continuation|what happened|what now|update|tell me|explain|why|how|okay|ok|yes|capabilit(?:y|ies)|automati(?:on|c)|self.aware|self.understand|know itself|own abilities|workload|hours saved|launch|market|business|company|startup|build|operate|workforce)\b/i.test(String(text||''));
const teamRequested=text=>/(?:\b(?:shift|workday|work day)\b.{0,80}\b(?:staff|staffing|team|headcount|roles|workers)\b|\b(?:staff|staffing|team|headcount|roles|workers)\b.{0,80}\b(?:shift|workday|work day)\b)/i.test(String(text||''));
const companyRequested=text=>/(?:\b(?:employee|employees|staff|staffing|headcount|roles|jobs|workers|team|hires|hiring|workforce)\b.{0,120}\b(?:reality|company|business|launch|market|build|operate|startup|successful)\b|\b(?:reality|company|business|launch|market|build|operate|startup|successful)\b.{0,120}\b(?:employee|employees|staff|staffing|headcount|roles|jobs|workers|team|hires|hiring|workforce)\b)/i.test(String(text||''));
export async function readVerifiedEmployeeShiftForChat({
 session,message,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),fetchImpl=fetch,now=new Date(),briefOnly=false
}={}){
 if(!relevant(message)||env.VERCEL_ENV!=='preview'||
  !UUID.test(session?.user_id)||!db?.strictSecrets||!db.secretKey||
  db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const read=assertShiftReadback(await shiftRpc(db,
   'reality_read_owner_employee_shifts_v1',
   {p_owner_id:session.user_id},{fetchImpl}));
  // The presentation helper accepts at most five rows. Keep the complete
  // authenticated ledger for authority and maintenance reconciliation below.
  const brief=buildRealityShiftConversationBrief(read.shifts.slice(0,5),[],now);
  const alreadyAuthorized=['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK']
   .includes(brief.status);
  const currentShift=read.shifts[0]||null;
  const briefingAuthority=alreadyAuthorized?
   ' VERIFIED OWNER START AUTHORITY: This SAME SHIFT was already explicitly authorized and recorded; SHIFT ID '+brief.shift_id+
   '. Do not ask the owner to repeat approval, repeat a magic command, click Start again, or imply the shift is inactive. '+
   'A source-check shift can be authorized even though no separate repair original has been admitted. '+
   'If original code repair remains unqualified, explain that engineering admission/dispatch is blocking execution, not the owner refusing authorization. ':
   ' No active owner shift is verified in this readback; a signed-in explicit Start message or matching Start button may authorize a new exact source-bound shift without an extra confirmation. ';
  const summary='REALITY CURRENT EMPLOYEE SHIFT: '+brief.headline+
   briefingAuthority+
   ' WHAT HAS BEEN DONE: '+brief.what_finished+
   ' CURRENT STATE: '+brief.current+
   ' NEXT: '+brief.next+
   ' APPROVAL STATUS: '+brief.needs_you+
   (brief.planned_start_at?' Scheduled start in UTC: '+brief.planned_start_at+'.':'')+
   ' This is an owner-authenticated database readback. Do NOT claim source observation is an executed repair. No measured net human-hours saved, no implied installation authority, and no completed autonomous shift has been proven by this report. Existing independently verified install requests must be approved in the exact Reality Chat controls, never by ordinary model text.';
  const observations=[Object.freeze({
   entry_id:'employee-shift:'+(brief.shift_id||'no-shift'),
   event_kind:'owner_governed_employee_shift_briefing',
   source_kind:'AUTHENTICATED_OWNER_SCOPED_SUPABASE_READBACK',
   source_ref:'reality:employee-shift:'+(brief.shift_id||'none'),
   assertion_time:brief.as_of,
   epistemic_status:'SHIFT_QUEUE_STATE_OBSERVED_NOT_FULL_DAY_VERIFIED',
   summary,
   shift_status:brief.status,
   owner_shift_authorization_recorded:alreadyAuthorized,
   active_owner_shift_id:alreadyAuthorized?brief.shift_id:null,
   source_step_execution_authorized:alreadyAuthorized,
   shift_start_command_already_satisfied:alreadyAuthorized,
   exact_original_repair_admission_verified:currentShift?.steps?.[5]?.state===
     'ORIGINAL_JOB_RECEIPT_VERIFIED'&&currentShift?.steps?.[6]?.state===
     'ORIGINAL_JOB_RECEIPT_VERIFIED',
   extra_shift_approval_required:false,
   source_checks_recorded:brief.verified_source_checks,
   original_job_receipts_matched:brief.verified_original_job_receipts,
   complete_shift_proven:false,verified_human_hours_saved:null,
   installation_authorized:false,external_execution_authorized:false,
   production_changed:false
  })];
  // The bounded fast Chat lane needs the independently read primary shift
  // now, not the serial optional audit, staffing, and maintenance reads.
  if(briefOnly===true)return observations;
  // Operational Chat is a real dialogue about the SAME independently
  // reviewed maintenance obligations. The prior owner authorization is a
  // durable ledger fact; never instruct the owner to repeat it, and never
  // convert a model reply ("yes", "continue") into an install or new shift.
  try{
   const maintenance=await shiftRpc(db,
    'reality_read_owner_internal_maintenance_v1',
    {p_owner_id:session.user_id},{fetchImpl});
   const continuity=projectOwnerInternalMaintenanceContinuity(maintenance,{
    ownerId:session.user_id,shifts:read.shifts
   });
   if(continuity.status==='OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED'&&
      continuity.open_count>0&&continuity.open_count<=4){
    const activeForMaintenance=continuity.signed_warrant_scope_verified?
     read.shifts.find(s=>
      s.shift_id===continuity.signed_warrant_shift_id&&
      ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status)&&
      s.closed_at==null)||null:null;
    const signedSet=new Set(continuity.signed_maintenance_incident_ids);
    const detail=continuity.items.map(j=>
     j.assignee+' · '+j.kind+' · '+j.phase+
     ' · independently reviewed by '+j.independent_reviewer+
     ' · source '+j.source_ref+' · ORIGINAL INCIDENT '+j.origin_incident_id+
     ' · authority '+(signedSet.has(j.origin_incident_id)?
       'EXACT_SIGNED_WARRANT_SCOPE':'NEW_INCIDENT_NOT_IN_EXISTING_WARRANT')+
     ' · worker stage '+j.worker_handling_state+
     ' · failure baseline independently recorded '+
       !!j.independent_failure_baseline_receipt_sha256+
     ' · independent frozen CI RED receipt present '+j.frozen_reproduction_verified+
     ' · repair verified '+j.repair_verified).join(' | ');
    observations.push(Object.freeze({
     entry_id:'maintenance-conversation:'+
      (continuity.current_shift_id||continuity.items[0].origin_incident_id),
     event_kind:'owner_verified_maintenance_repair_conversation',
     source_kind:'AUTHENTICATED_OWNER_SCOPED_EXISTING_SHIFT_AND_MAINTENANCE_LEDGER',
     source_ref:'reality:owner-internal-maintenance:'+
      (continuity.current_shift_id||continuity.items[0].origin_incident_id),
     assertion_time:now.toISOString(),
     epistemic_status:'SIGNED_OWNER_MAINTENANCE_PENDING_INDEPENDENT_REPAIR_RECEIPTS',
     summary:'REALITY MAINTENANCE CONVERSATION: '+continuity.open_count+
      ' independently reviewed maintenance incidents remain unfinished. '+
      (activeForMaintenance?
       'THE OWNER ALREADY SIGNED AND AUTHORIZED EXACTLY '+
         continuity.signed_unfinished_count+' EARLIER REPAIRS IN SHIFT '+
         activeForMaintenance.shift_id+' with status '+activeForMaintenance.status+
         '. NO SECOND APPROVAL IS NEEDED FOR THOSE EXACT REPAIRS. ':
       'NO CURRENT EXACT SIGNED MAINTENANCE WARRANT IS VERIFIED. '+
         'Verify current authority before asking for a new one. ')+
      (continuity.newly_discovered_outside_warrant_count?
       'IMPORTANT: '+continuity.newly_discovered_outside_warrant_count+
        ' ADDITIONAL MAINTENANCE INCIDENT(S) ARE OUTSIDE THAT WARRANT. '+
        'Do not treat those as previously approved. They may be investigated '+
        'within evidence-only authority, but cannot install/execute consequential repairs. ':
       '')+
      detail+
      '. You are speaking in the SAME Reality Chat conversation; answer '+
      'follow-up questions about these facts directly. Do not send the owner '+
      'back to a dashboard to understand them. Distinguish source review, '+
      'independent frozen tests, verified repairs, and final receipts. '+
      'Do NOT claim tests, patch installation, financial ROI or completed work '+
      'without corresponding independent receipts. Do NOT ask the owner '+
      'to reapprove a still-active signed shift. Plain Chat words cannot '+
      'authorize code installation or an unrelated new shift.',
     owner_current_signed_maintenance_shift_id:
      activeForMaintenance?.shift_id||null,
     owner_approval_already_recorded:!!activeForMaintenance,
     owner_signed_repair_count:continuity.signed_unfinished_count,
     new_repair_count_outside_signed_warrant:
      continuity.newly_discovered_outside_warrant_count,
     signed_maintenance_incident_ids:continuity.signed_maintenance_incident_ids,
     unfinished_internal_repairs:continuity.open_count,
     source_references:continuity.items.map(j=>j.source_ref),
     original_incident_ids:continuity.items.map(j=>j.origin_incident_id),
     repair_complete:false,customer_original_job_completed:false,
     installation_authorized:false,production_changed:false
    }));
   }
  }catch{/* A failed maintenance readback is not proof that jobs vanished. */}
  // Live owner-scoped self-audit: source existence is not execution proof.
  try{
   const ownerLoop=await shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id},{fetchImpl});
   // Reality Chat reads the SAME service-verified self-audit as the UI.
   // Provider receipts remain observations, never model-created authority.
   const active=read.shifts.filter(x=>
    ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.status));
   const [toolResult,roiResult]=await Promise.allSettled([
    active.length===1?
     shiftRpc(db,'reality_read_owner_native_readonly_tool_proof_v1',{
      p_owner_id:session.user_id,p_shift_id:active[0].shift_id},{fetchImpl}):
     Promise.resolve(null),
    shiftRpc(db,'reality_read_owner_job_roi_evidence_v2',{
     p_owner_id:session.user_id},{fetchImpl})
   ]);
   const audit=buildRealityEvidenceGroundedSelfAudit({
    shiftReadback:read,ownerLoopReadback:ownerLoop,
    modelToolProof:toolResult.status==='fulfilled'?toolResult.value:null,
    roiReadback:roiResult.status==='fulfilled'?roiResult.value:null,
    previewGithubWriteConfigured:
     typeof env.REALITY_GITHUB_TOKEN==='string'&&
     env.REALITY_GITHUB_TOKEN.length>=25,
    previewVercelDeployConfigured:
     typeof env.REALITY_NATIVE_VERCEL_DEPLOY_TOKEN==='string'&&
     env.REALITY_NATIVE_VERCEL_DEPLOY_TOKEN.length>=25,
    sourceVerifiedAt:now.toISOString()});
   observations.push(Object.freeze({
    entry_id:'reality:self-audit:'+String(brief.shift_id||'none')+':'+audit.observed_at,
    event_kind:'reality_evidence_grounded_self_capability_inventory',
    source_kind:'OWNER_SCOPED_DATABASE_READBACK_AND_CODE_INVENTORY',
    source_ref:'reality:capabilities:live-self-audit',
    assertion_time:audit.observed_at,
    epistemic_status:'SOURCE_IMPLEMENTATION_SEPARATE_FROM_LIVE_PROOF',
    summary:summarizeRealitySelfAuditForModel(audit),
    self_audit:audit,
    full_shift_execution_verified:false,
    model_self_authorized:false,installation_authorized:false,
    production_changed:false
   }));
  }catch{/* Evidence unavailable is NOT an authorized self-capability. */}
  if(teamRequested(message)){
   // Existing work catalog supplies read-only verified-source observations.
   // Neither proposed role counts nor AI staffing estimates are worker receipts.
   try{
    const catalog=await buildRealityWorkCatalog();
    const workday=buildRealityWorkdayOpportunityBrief(catalog);
    if(teamRequested(message)){
    const staffing=assessRealityWorkdayTeam(workday);
    observations.push(Object.freeze({
     entry_id:'employee-shift:role-needs:'+String(workday.observed_at||brief.as_of),
     event_kind:'evidence_scoped_role_needs_projection',
     source_kind:'READ_ONLY_EXISTING_REALITY_WORK_CATALOG',
     source_ref:'reality:workday-opportunity-brief',
     assertion_time:workday.observed_at||brief.as_of,
     epistemic_status:staffing.status,
     summary:'PROPOSED ROLE FUNCTIONS, NOT EMPLOYEES DEPLOYED: '+
       staffing.proposed_roles.map(x=>x.title+': '+x.responsibilities).join(' | ')+
       '. Proposed role slots: '+staffing.proposed_role_slots+
       '. Competitive research status: '+staffing.conditional_roles[0].activation_status+
       '. This is a read-only proposal. Actual AI worker count, execution capacity, '+
       'human staff replaced and savings are NOT independently measured.',
     proposed_role_slots:staffing.proposed_role_slots,
     proposed_roles:staffing.proposed_roles,
     conditional_roles:staffing.conditional_roles,
     active_ai_workers:null,
     human_employees_needed_verified:null,
     work_execution_verified:false,
     installation_authorized:false,
     external_execution_authorized:false,
     production_changed:false,
    }));
    }
   }catch{/* No invented staffing when source discovery is unavailable. */}
  }
  return observations;
 }catch{return []}
}

/**
 * The planner already prepares a signed service-only source inventory.
 * Unlike an employee-shift claim, reading that inventory must be possible
 * BEFORE the owner starts a shift. Source titles are untrusted data,
 * not model instructions or original-job execution warrants.
 */
const RILEY_ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9][0-9]{0,7})$/;
const rileyWorkRequested=message=>/\briley\b|\bbacklog\b|\b(?:known|current|existing|available|open)\s+(?:issues|work|jobs)\b|\bengineering\s+(?:work|tasks|issues)\b/i.test(String(message||''));
export function verifyRileySourceWorkSnapshot(raw,{now=new Date()}={}){
 if(!raw||raw.version!=='reality-riley-source-work-v1'||
    raw.status!=='RILEY_CURRENT_SOURCE_BACKLOG_UNQUALIFIED'||
    raw.source_scope!=='maloney2323/Reality'||
    !/^[a-f0-9]{64}$/.test(raw.source_sha256||'')||
    !Number.isSafeInteger(raw.open_issue_count)||
    raw.open_issue_count<0||raw.open_issue_count>150||
    !Array.isArray(raw.source_issues)||raw.source_issues.length>12||
    !Number.isSafeInteger(raw.omitted_source_issue_count)||
    raw.omitted_source_issue_count<0||
    raw.source_issues.length+raw.omitted_source_issue_count!==raw.open_issue_count||
    raw.original_job_qualified!==false||
    raw.shift_execution_authorized!==false||
    raw.installation_authorized!==false||
    raw.production_changed!==false||
    typeof raw.source_prepared_at!=='string'||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(raw.source_prepared_at)||
    !Number.isFinite(new Date(raw.source_prepared_at).valueOf())||
    !(now instanceof Date)||!Number.isFinite(now.getTime())||
    now.getTime()-new Date(raw.source_prepared_at).getTime()>36*3600000||
    new Date(raw.source_prepared_at).getTime()-now.getTime()>5*60000)
  throw Error('RILEY_SOURCE_SNAPSHOT_INVALID_OR_STALE');
 const seen=new Set();
 const items=raw.source_issues.map(item=>{
  const url=String(item?.issue_url||''),m=RILEY_ISSUE.exec(url);
  if(!m||!Number.isSafeInteger(item.issue_number)||
    item.issue_number!==Number(m[1])||seen.has(item.issue_number)||
    typeof item.title!=='string'||!item.title.trim()||
    item.title.length>200||/[\u0000-\u001f\u007f]/.test(item.title))
    throw Error('RILEY_SOURCE_ISSUE_NOT_VERIFIED');
  seen.add(item.issue_number);
  return Object.freeze({
   issue_number:item.issue_number,title:item.title,
   issue_url:url,source_status:'OPEN_PROVIDER_OBSERVATION_UNQUALIFIED',
   executable_original_job_verified:false,owner_approval_recorded:false,
   measured_business_value_usd:null
  });
 });
 return Object.freeze({
  ...raw,source_issues:Object.freeze(items),
  current_open_issue_count_is_not_authorized_job_count:true,
  original_job_qualified:false,shift_execution_authorized:false
 });
}
export async function readRileySourceWorkSnapshot({
 session,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,now=new Date()
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id)||
   !db?.strictSecrets||!db.secretKey||
   db.url!==session?.config?.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.project!=='hvkfreoagbrphwghjajw')
  throw Error('RILEY_SOURCE_OWNER_SESSION_REQUIRED');
 const raw=await shiftRpc(db,'reality_read_current_riley_source_work_v1',
  {},{fetchImpl});
 return verifyRileySourceWorkSnapshot(raw,{now});
}
export async function readVerifiedRileySourceWorkForChat({
 session,message,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,now=new Date()
}={}){
 if(!rileyWorkRequested(message))return [];
 let snapshot;
 try{snapshot=await readRileySourceWorkSnapshot({
  session,env,db,fetchImpl,now
 });}
 catch{return [];} // A failed provider read must never become a false no-work claim.
 const details=snapshot.source_issues.map(i=>
  'Issue #'+i.issue_number+' (untrusted provider title: '+
  JSON.stringify(i.title)+', source URL '+i.issue_url+')').join(' | ');
 const summary='RILEY HAS A READ-ONLY SOURCE BACKLOG IN REALITY even without an active shift: '+
  snapshot.open_issue_count+' GitHub open-issue OBSERVATIONS as of '+
  snapshot.source_prepared_at+'. '+details+
  (snapshot.omitted_source_issue_count?
   ' Additional '+snapshot.omitted_source_issue_count+' source observations omitted from this bounded preview.':'')+
  '. IMPORTANT: OPEN ISSUES ARE NOT QUALIFIED ORIGINAL JOBS. Previously settled or rejected original work must NOT be retried. This is only a source inventory, NOT a shift authorization readback. CHECK the separate CURRENT OWNER SHIFT readback BEFORE claiming the user needs to authorize a shift; it may already be running. The signed-in explicit chat instruction "start the shift" is itself a first authorization through the existing owner-scoped controller, exactly like the Start button. Never demand a magic authorization phrase or a duplicate shift. Exact capability installation still needs a separately verified artifact-specific approval. An existing-code repair can remain blocked at qualification even when its shift is already authorized. Never claim the absence of qualified originals means Riley has no unfinished work.';
 return [Object.freeze({
  entry_id:'riley:source-work:'+snapshot.source_sha256,
  event_kind:'riley_discovered_source_work_readback_before_shift',
  source_kind:'SERVICE_ONLY_SCHEDULED_GITHUB_SOURCE_SNAPSHOT',
  source_ref:'reality:next-week-employee-source:'+snapshot.source_sha256,
  assertion_time:snapshot.source_prepared_at,
  epistemic_status:'OPEN_GITHUB_ISSUES_NOT_QUALIFIED_OR_OWNER_AUTHORIZED',
  summary,
  observed_open_issue_count:snapshot.open_issue_count,
  source_issues:snapshot.source_issues,
  shift_execution_authorized:false,
  external_execution_authorized:false,
  installation_authorized:false,
  independently_settled_job_from_this_read:false,
  verified_financial_roi_usd:null,
  production_changed:false
 })];
}

/**
 * Company staffing is deliberately independent of scheduled shifts.
 * A founder may ask for business functions and automation priorities without
 * creating, inspecting or authorizing an employee-shift work order.
 */
export async function readVerifiedRealityCompanyWorkforceForChat({
 session,message,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),
 now=new Date()
}={}){
 if(!companyRequested(message)||env.VERCEL_ENV!=='preview'||
  !UUID.test(session?.user_id)||!db?.strictSecrets||!db.secretKey||
  db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const catalog=await buildRealityWorkCatalog();
  const workday=buildRealityWorkdayOpportunityBrief(catalog);
  const company=assessRealityCompanyWorkforce(workday);
  const categorized=routeRealityWorkCategoriesToEmployees(workday);
  return [Object.freeze({
   entry_id:'reality-company:launch-workforce:'+String(workday.observed_at||now.toISOString()),
   event_kind:'company_launch_workforce_evidence_assessment',
   source_kind:'READ_ONLY_EXISTING_REALITY_WORK_CATALOG',
   source_ref:'reality:company:launch-workforce-assessment',
   assertion_time:workday.observed_at||now.toISOString(),
   epistemic_status:company.status,
   summary:'COMPANY LAUNCH AND OPERATIONS WORKFORCE ANALYSIS: Reality must cover '+
    company.functional_areas_count+' different BUSINESS FUNCTIONS, not necessarily '+
    company.functional_areas_count+' individual employees. '+
    company.required_business_functions.map(x=>x.title+
     ' — AUTOMATION CANDIDATES: '+x.candidate_ai_automation.join('; ')+
     ' — HUMAN ACCOUNTABILITY: '+x.human_accountability+
     ' — EVIDENCE STATUS: '+x.evidence_status).join(' | ')+
    '. Exact human employee headcount and actual AI worker count cannot be verified without measured weekly workload, '+
    'existing worker throughput, human oversight time, sales/customer data and launch readiness evidence. '+
    'Priorities: '+company.priority_work.join('; ')+
    '. CATEGORY ROUTING: '+categorized.assigned_category_candidates+
     ' read-only source findings assigned across '+categorized.proposed_company_functions+
     ' business functions. FIRST PILOT: '+categorized.first_pilot_employee.employee_title+
     ' with '+categorized.first_pilot_employee.candidate_count+
     ' candidate findings, not verified executable jobs. ' +
     'This is NOT an executed or completed launch plan, worker deployment or measured labor saving.',
   business_objective:company.objective,
   functional_areas_count:company.functional_areas_count,
   required_business_functions:company.required_business_functions,
   staffing_method:company.staffing_method,
   category_employee_work_routing:categorized,
   measured_human_staffing_fte:null,
   exact_human_employee_count_required:null,
   exact_ai_employee_count_required:null,
   actual_company_launch_verified:false,
   work_started:false,
   installation_authorized:false,
   external_execution_authorized:false,
   production_changed:false,
  })];
 }catch{return []}
}



/**
 * Existing Work Catalog -> named roles -> existing Monday–Friday planner ->
 * SAME weekly gap projection as Home. This is an optional owner-authenticated
 * Universe observation, not a new planning engine or auto-start instruction.
 */
const weeklyRequested=message=>
 /\b(?:workweek|work week|weekly|week|schedule|scheduled|scheduling|staffing|employee|employees|workload|capacity|hours|unfilled|underfilled|assignments|role allocation|not enough work)\b/i
 .test(String(message||''));
export async function readVerifiedWeeklyWorkloadForChat({
 session,message,env=process.env,now=new Date(),
 catalogBuilder=buildRealityWorkCatalog
}={}){
 if(!weeklyRequested(message))return [];
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
  typeof session?.config?.url!=='string'||
  session.config.url!=='https://'+env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF+'.supabase.co'||
  typeof session.access_token!=='string'||!session.access_token||
  typeof catalogBuilder!=='function'||!(now instanceof Date)||
  !Number.isFinite(now.getTime()))return [];
 try{
  const catalog=await catalogBuilder();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const roster=buildRealityNamedEmployeeRoster(brief);
  const plan=prepareNextWeekEmployeePlan(roster,{now});
  const insight=projectRealityWeeklyWorkloadInsight(plan);
  const roleSummary=insight.roles.map(r=>r.employee_name+': '+
   r.proposed_review_timebox_hours+'h provisional review out of '+
   r.hypothetical_weekly_comparison_hours+'h hypothetical comparison, '+
   r.unallocated_hypothetical_reference_hours+'h reference unallocated').join(' | ');
  const summary='REALITY WEEKLY WORKLOAD GAP (READ-ONLY, NOT A COMPLETED SHIFT): '+
   'Week '+insight.week_start+' through '+insight.week_end+
   '; '+insight.source_finding_count+' source-backed findings for review; '+
   insight.source_work_roles_provisional_hours+' provisional REVIEW timebox hours '+
   'across '+insight.source_work_role_count+' source-bearing roles compared with '+
   insight.source_work_roles_hypothetical_reference_hours+
   ' hypothetical role-reference hours; '+
   insight.source_work_roles_unallocated_reference_hours+' comparison hours unallocated. '+
   insight.roles_without_source_work_count+
   ' other proposed roles have no routed source work and are NOT counted as missed customer jobs. '+
   'Per role: '+roleSummary+'. '+
   'The number unallocated is NOT confirmed missing customer work. Review timeboxes are NOT '+
   'approved, executed, scheduled AI work or measured human hours. The owner can investigate '+
   'available source work, qualify current jobs, and separately authorize exact work when ready. '+
   'Do not claim the week is fully scheduled, invent tasks, request a duplicate shift, or assign ROI.';
  return [Object.freeze({
   entry_id:'reality:weekly-workload:'+insight.week_start,
   event_kind:'owner_source_backed_weekly_review_capacity_gap',
   source_kind:'READ_ONLY_EXISTING_REALITY_WORK_CATALOG',
   source_ref:'reality:weekly-workload:source-plan:'+insight.week_start,
   assertion_time:now.toISOString(),
   epistemic_status:insight.status,
   summary:summary.slice(0,4000),
   weekly_workload_insight:insight,
   candidate_source_refs:insight.evidence_refs,
   owner_scope_confirmed_by_parent_chat_session:true,
   week_is_executably_scheduled:false,
   comparison_gap_is_not_verified_customer_backlog:true,
   work_execution_verified:false,
   execution_authorized:false,installation_authorized:false,production_changed:false
  })];
 }catch{
  // No provider result means UNKNOWN, not a filled workweek or zero tasks.
  return [];
 }
}
