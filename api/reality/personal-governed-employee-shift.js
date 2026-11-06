// Owner-authenticated 1–12-hour shift creation and independent progress.
// First approval authorizes source checks, NOT arbitrary new original jobs or
// installs. Exact upgrades are presented in EXISTING Reality Chat.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from '../../src/reality-workday-opportunity-brief-v1.js';
import {assessRealityWorkdayTeam,routeRealityWorkCategoriesToEmployees} from '../../src/reality-workday-team-assessment-v1.js';
import {buildRealityEightHourShiftDraft} from '../../src/reality-eight-hour-shift-plan-v1.js';
import {computeShiftFingerprint,shiftDatabase,shiftRpc,
 assertShiftReceipt,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {findEmployeeShiftCapabilityHandoffs}
 from '../../src/reality-employee-shift-capability-handoff-v1.js';
import {buildRealityShiftConversationBrief}
 from '../../src/reality-shift-conversation-brief-v1.js';
import {diagnoseRealityEmployeeRecovery}
 from '../../src/reality-employee-recovery-route-v1.js';
import {projectRileyExistingBacklog}
 from '../../src/reality-riley-existing-backlog-v1.js';
export const maxDuration=60;
// An owner-authorized shift must begin with the work Reality already knows.
// These are read-only source priorities; no issue, legacy queue or model
// proposal is an original-job admission or installation approval.
export async function ownerExistingRileySourcePriority({catalog,brief,ownerId,db,
 call=shiftRpc}={}){
 if(!UUID.test(ownerId||'')||!Array.isArray(catalog?.items)||
  !Array.isArray(brief?.items))
  throw Error('SHIFT_OWNER_BACKLOG_INPUT_UNVERIFIED');
 const issues=[],seen=new Set();
 for(const finding of catalog.items){
  if(finding?.finding_type!=='OPEN_ISSUE'||finding.source!=='github_issues')
   continue;
  const m=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d{0,6})$/.exec(
   String(finding.evidence_refs?.[0]||''));
  if(!m||seen.has(Number(m[1])))continue;
  seen.add(Number(m[1]));
  issues.push({number:Number(m[1]),state:'open',
   html_url:finding.evidence_refs[0],
   title:String(finding.title||'').slice(0,210)});
  if(issues.length===30)break;
 }
 if(!issues.length)return Object.freeze({
  refs:[],ranked:0,source_coverage_complete:false});
 const loop=await call(db,'reality_read_owner_genuine_loop_v1',
  {p_owner_id:ownerId});
 const prior=await Promise.all(issues.map(async x=>({
  issue_number:x.number,
  record:await call(db,'reality_read_owner_existing_original_issue_v1',{
   p_owner_id:ownerId,p_issue_number:x.number})
 })));
 const reconciled=projectRileyExistingBacklog({
  issues,ownerLoop:loop,priorOriginals:prior,
  coverageComplete:catalog.source_scans?.issues?.query_scope_fully_reconciled===true&&
   seen.size===issues.length,
  activeShiftCount:0
 });
 const candidateURLs=new Set(brief.items.flatMap(x=>
  x.finding_type==='OPEN_ISSUE'?x.evidence_refs.slice(0,1):[]));
 const refs=reconciled.rows.filter(row=>
  ['OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION',
   'EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE'].includes(row.status)&&
  candidateURLs.has(row.source_url)).map(row=>row.source_url);
 return Object.freeze({refs,ranked:reconciled.rows.length,
  source_coverage_complete:reconciled.source_coverage_complete});
}

const SHA=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({ok:false,error:'SHIFT_METHOD_DENIED'});
 // Only the duration selector is accepted; owner and scope remain derived
 // from the signed-in session. Draft lookup is read-only.
 const queryKeys=Object.keys(req.query||{});
 if(queryKeys.some(k=>k!=='hours')||queryKeys.length>1)
  return res.status(400).json({ok:false,error:'SHIFT_CLIENT_SCOPE_REJECTED'});
 if(req.method==='POST'&&queryKeys.length)
  return res.status(400).json({ok:false,error:'SHIFT_CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'SHIFT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'SHIFT_OWNER_PROJECT_MISMATCH'});
  if(req.method==='GET'){
   const hours=req.query?.hours===undefined?null:Number(req.query.hours);
   if(hours!==null&&(!Number.isSafeInteger(hours)||hours<1||hours>12))
    return res.status(400).json({ok:false,error:'SHIFT_DURATION_NOT_SUPPORTED'});
   const read=assertShiftReadback(await shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}));
   let handoffs=[],handoff_status='NO_VERIFIED_SHIFT_BOUND_CAPABILITY_REQUEST';
   const active=read.shifts.some(s=>['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s.status));
   if(active){
    try{
     const [qualified,loop]=await Promise.all([
      shiftRpc(db,'reality_read_owner_qualified_capabilities_v1',
       {p_owner_id:session.user_id}),
      shiftRpc(db,'reality_read_owner_genuine_loop_v1',
       {p_owner_id:session.user_id})]);
     handoffs=findEmployeeShiftCapabilityHandoffs({
      ownerShifts:read.shifts,qualified,loop});
     if(handoffs.length)handoff_status='EXACT_CAPABILITY_APPROVAL_REQUESTED_IN_CHAT';
    }catch{handoff_status='EXACT_CAPABILITY_READBACK_UNAVAILABLE_FAIL_CLOSED';}
   }
   const shift_briefing=buildRealityShiftConversationBrief(read.shifts,handoffs);
   const recovery_diagnosis=diagnoseRealityEmployeeRecovery({shifts:read.shifts,handoffs});
   let draft=null;
   if(hours!==null){
     const catalog=await buildRealityWorkCatalog();
     const brief=buildRealityWorkdayOpportunityBrief(catalog);
     const priority=await ownerExistingRileySourcePriority({
      catalog,brief,ownerId:session.user_id,db});
     const plan=buildRealityEightHourShiftDraft(brief,{
      durationHours:hours,prioritySourceRefs:priority.refs});
     draft={...plan,expected_fingerprint:computeShiftFingerprint(plan),
       proposed_team:assessRealityWorkdayTeam(brief),
       employee_category_assignments:routeRealityWorkCategoriesToEmployees(brief),
       existing_owner_backlog_priorities:priority.refs,
       owner_backlog_issue_records_reconciled:priority.ranked,
       owner_backlog_coverage_complete:priority.source_coverage_complete};
   }
   return res.status(200).json({ok:true,...read,shift_briefing,
    requested_shift_draft:draft,
    recovery_diagnosis,
    capability_approval_handoffs:handoffs,handoff_status,
    job_started_by_read:false,
    shift_approval_does_not_authorize_installation:true,
    existing_chat_approval_required:true});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'SHIFT_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'SHIFT_JSON_REQUIRED'});
  const b=req.body||{},keys=Object.keys(b);
  if(!b||typeof b!=='object'||Array.isArray(b)||
   ![3,4].includes(keys.length)||
   keys.some(x=>!['action','expected_fingerprint','planned_start_at','requested_hours'].includes(x))||
   (keys.length===4&&!Object.hasOwn(b,'requested_hours'))||
   (keys.length===3&&Object.hasOwn(b,'requested_hours'))||
   (!Number.isSafeInteger(b.requested_hours??8)||
   (b.requested_hours??8)<1||(b.requested_hours??8)>12)||
   b.action!=='AUTHORIZE_EXACT_EMPLOYEE_SHIFT'||!SHA.test(b.expected_fingerprint||''))
   return res.status(400).json({ok:false,error:'SHIFT_EXACT_APPROVAL_REQUIRED'});
  const start=new Date(b.planned_start_at);
  if(typeof b.planned_start_at!=='string'||!/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ/.test(b.planned_start_at)||
   !Number.isFinite(start.valueOf())||
   start.getTime()<Date.now()-120000||start.getTime()>Date.now()+7*86400000)
   return res.status(400).json({ok:false,error:'SHIFT_START_NOT_IN_ALLOWED_WINDOW'});
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const priority=await ownerExistingRileySourcePriority({
   catalog,brief,ownerId:session.user_id,db});
  const plan=buildRealityEightHourShiftDraft(brief,{
   durationHours:b.requested_hours??8,prioritySourceRefs:priority.refs});
  const fingerprint=computeShiftFingerprint(plan);
  if(fingerprint!==b.expected_fingerprint)
   return res.status(409).json({ok:false,error:'SHIFT_SOURCE_CHANGED_REBUILD_PLAN'});
  const receipt=assertShiftReceipt(await shiftRpc(db,
   'reality_authorize_employee_shift_v1',{
    p_owner_id:session.user_id,p_fingerprint:fingerprint,
    p_source_observed_at:plan.observed_at,p_start_at:start.toISOString(),
    p_steps:plan.slots
   }));
  const read=assertShiftReadback(await shiftRpc(db,
   'reality_read_owner_employee_shifts_v1',
   {p_owner_id:session.user_id}));
  const exact=read.shifts.find(s=>s.shift_id===receipt.shift_id&&
   s.plan_fingerprint===fingerprint&&s.steps.length===8&&
   Number(new Date(s.planned_end_at))-Number(start)===plan.shift_duration_minutes*60000);
  if(!exact)throw Error('SHIFT_COMMIT_NOT_READ_BACK_VERIFIED');
  return res.status(202).json({ok:true,...receipt,shift:exact,
   initial_authorization_recorded:true,
   installation_authorized:false,
   existing_chat_approval_required_for_exact_capabilities:true,
   job_started:false,shift_started:false,
   worker_dispatch_verified:false,
   production_changed:false});
 }catch(e){
  console.warn('EMPLOYEE_SHIFT_OWNER_BOUNDARY',
   /^SHIFT_[A-Z0-9_]{5,100}$/.test(e?.message||'')?
    e.message:'UNVERIFIED_FAILURE');
  return res.status(503).json({ok:false,
   error:'SHIFT_OWNER_OR_DATABASE_READBACK_UNAVAILABLE',
   job_started:false,shift_started:false,
   installation_authorized:false,production_changed:false});
 }
}
