// One owner-scoped Past / Present / Future projection of Reality's EXISTING
// durable ledgers. This read cannot approve, create, dispatch or settle work.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
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
  const checks=await Promise.allSettled([
   shiftRpc(db,'reality_read_owner_final_receipts_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_employee_discovery_v1',
    {p_owner_id:session.user_id})
  ]);
  const now=Date.now();
  const past=checks[0].status==='fulfilled'?
   pastReceiptProjection(checks[0].value):null;
  const present=checks[1].status==='fulfilled'?
   presentShiftProjection(checks[1].value,now):null;
  const potential=checks[2].status==='fulfilled'&&
   checks[2].value?.owner_id===session.user_id?
   futureDiscoveryProjection(checks[2].value,now):null;
  // Each horizon can fail independently; never represent missing evidence as
  // zero jobs, zero receipts, a completed task, or a fresh plan.
  return res.status(200).json({
   ok:true,status:'REALITY_OWNER_TIME_HORIZON_READ_ONLY',
   owner_scope_verified:true,read_only:true,
   checked_at:new Date(now).toISOString(),
   past:past||{status:'PAST_RECEIPTS_NOT_VERIFIED'},
   present:present||{status:'PRESENT_SHIFT_NOT_VERIFIED'},
   future:potential||{status:'FUTURE_DISCOVERY_NOT_VERIFIED'},
   approved_new_work_by_read:false,shift_started_by_read:false,
   deployment_changed_by_read:false,billing_changed_by_read:false,
   new_jobs_created_by_read:0,verified_cash_savings_usd:null
  });
 }catch(e){
  console.warn('REALITY_TIME_OWNER_READBACK_UNAVAILABLE');
  return res.status(503).json({
   ok:false,error:'REALITY_TIME_OWNER_READBACK_UNAVAILABLE',
   owner_scope_verified:false,approved_new_work_by_read:false
  });
 }
}
