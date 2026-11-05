// Bind Reality's real employee shift status to authenticated Chat
// observations. This does NOT grant authority or let the model update a job.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {buildRealityShiftConversationBrief}
 from './reality-shift-conversation-brief-v1.js';
import {buildRealityWorkCatalog} from './reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from './reality-workday-opportunity-brief-v1.js';
import {assessRealityWorkdayTeam,assessRealityCompanyWorkforce} from './reality-workday-team-assessment-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const relevant=text=>/\b(shift|workday|work day|employee|employees|staff|staffing|team|headcount|roles|jobs|hire|workers|what did|did you do|doing now|next|progress|task|status|schedule|approval|capabilit(?:y|ies)|automati(?:on|c)|workload|hours saved|launch|market|business|company|startup|build|operate|workforce)\b/i.test(String(text||''));
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
  if(teamRequested(message)||companyRequested(message)){
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
    if(companyRequested(message)){
     const company=assessRealityCompanyWorkforce(workday);
     observations.push(Object.freeze({
      entry_id:'reality-company:launch-workforce:'+String(workday.observed_at||brief.as_of),
      event_kind:'company_launch_workforce_evidence_assessment',
      source_kind:'READ_ONLY_EXISTING_REALITY_WORK_CATALOG',
      source_ref:'reality:company:launch-workforce-assessment',
      assertion_time:workday.observed_at||brief.as_of,
      epistemic_status:company.status,
      summary:'BUSINESS BUILD, LAUNCH, MARKET AND OPERATE ASSESSMENT: '+
       'Reality needs to cover '+company.functional_areas_count+
       ' distinct business FUNCTIONS (not '+company.functional_areas_count+
       ' individual employees). Functions and candidates for safe automation: '+
       company.required_business_functions.map(x=>x.title+
        ': '+x.candidate_ai_automation.join('; ')+
        '. HUMAN ACCOUNTABILITY: '+x.human_accountability+
        '. EVIDENCE LIMIT: '+x.evidence_status).join(' | ')+
       '. Actual human headcount and virtual AI worker count cannot yet be calculated without verified workload hours, customer/sales evidence and measured automation throughput. '+
       'Next: '+company.priority_work.join('; ')+
       '. This is an assessment, not a completed marketing, launch or autonomous worker result.',
      business_objective:company.objective,
      functional_areas_count:company.functional_areas_count,
      required_business_functions:company.required_business_functions,
      staffing_method:company.staffing_method,
      exact_human_employee_count_required:null,
      exact_ai_employee_count_required:null,
      measured_human_staffing_fte:null,
      actual_company_launch_verified:false,
      work_started:false,
      installation_authorized:false,
      external_execution_authorized:false,
      production_changed:false
     }));
    }
   }catch{/* No invented staffing when source discovery is unavailable. */}
  }
  return observations;
 }catch{return []}
}
