// Bind Reality's real employee shift status to authenticated Chat
// observations. This does NOT grant authority or let the model update a job.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {buildRealityShiftConversationBrief}
 from './reality-shift-conversation-brief-v1.js';
import {buildRealityEvidenceGroundedSelfAudit,summarizeRealitySelfAuditForModel}
 from './reality-evidence-grounded-self-audit-v1.js';
import {buildRealityWorkCatalog} from './reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from './reality-workday-opportunity-brief-v1.js';
import {assessRealityWorkdayTeam,assessRealityCompanyWorkforce,routeRealityWorkCategoriesToEmployees} from './reality-workday-team-assessment-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const relevant=text=>/\b(shift|workday|work day|employee|employees|staff|staffing|team|headcount|roles|jobs|hire|workers|what did|did you do|doing now|next|progress|task|status|schedule|approval|capabilit(?:y|ies)|automati(?:on|c)|self.aware|self.understand|know itself|own abilities|workload|hours saved|launch|market|business|company|startup|build|operate|workforce)\b/i.test(String(text||''));
const teamRequested=text=>/(?:\b(?:shift|workday|work day)\b.{0,80}\b(?:staff|staffing|team|headcount|roles|workers)\b|\b(?:staff|staffing|team|headcount|roles|workers)\b.{0,80}\b(?:shift|workday|work day)\b)/i.test(String(text||''));
const companyRequested=text=>/(?:\b(?:employee|employees|staff|staffing|headcount|roles|jobs|workers|team|hires|hiring|workforce)\b.{0,120}\b(?:reality|company|business|launch|market|build|operate|startup|successful)\b|\b(?:reality|company|business|launch|market|build|operate|startup|successful)\b.{0,120}\b(?:employee|employees|staff|staffing|headcount|roles|jobs|workers|team|hires|hiring|workforce)\b)/i.test(String(text||''));
export async function readVerifiedEmployeeShiftForChat({
 session,message,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),fetchImpl=fetch,now=new Date()
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
  const brief=buildRealityShiftConversationBrief(read.shifts,[],now);
  const summary='REALITY CURRENT EMPLOYEE SHIFT: '+brief.headline+
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
   source_checks_recorded:brief.verified_source_checks,
   original_job_receipts_matched:brief.verified_original_job_receipts,
   complete_shift_proven:false,verified_human_hours_saved:null,
   installation_authorized:false,external_execution_authorized:false,
   production_changed:false
  })];
  // Live owner-scoped self-audit: source existence is not execution proof.
  try{
   const ownerLoop=await shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id},{fetchImpl});
   const audit=buildRealityEvidenceGroundedSelfAudit({
    shiftReadback:read,ownerLoopReadback:ownerLoop,
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
