// Bind Reality's real employee shift status to authenticated Chat
// observations. This does NOT grant authority or let the model update a job.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc,assertShiftReadback}
 from './reality-governed-shift-boundary-v1.js';
import {buildRealityShiftConversationBrief}
 from './reality-shift-conversation-brief-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const relevant=text=>/\b(shift|workday|work day|employee|what did|did you do|doing now|next|progress|task|status|schedule|approval|capabilit(?:y|ies)|automati(?:on|c)|workload|hours saved)\b/i.test(String(text||''));
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
  return [Object.freeze({
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
 }catch{return []}
}
