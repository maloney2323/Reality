// Shared owner-bound readback: the same durable original-job ledger that the
// shift worker uses. Never infer an empty queue from a failed provider read.
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc,assertShiftReadback} from './reality-governed-shift-boundary-v1.js';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/[1-9][0-9]*$/;
const fail=()=>{throw Error('CHAT_ORIGINAL_WORK_READBACK_UNVERIFIED')};
export function projectOwnerOriginalWorkReadback(raw,{currentShiftId=null}={}){
 if(raw?.status!=='OWNER_SCOPED_UNATTENDED_REPAIR_ORIGINAL_READBACK'||
    raw.does_not_authorize_new_work!==true||raw.production_changed!==false||
    !Array.isArray(raw.jobs)||raw.jobs.length>6)fail();
 if(currentShiftId!==null&&!UUID.test(currentShiftId))fail();
 const seen=new Set();
 const jobs=raw.jobs.map(job=>{
  if(!UUID.test(job?.shift_id||'')||!WORK.test(job?.original_work_id||'')||
     !SOURCE.test(job?.source_ref||'')||typeof job.phase!=='string'||
     job.phase.length>72||typeof job.original_job_completed!=='boolean'||
     job.production_changed!==false||seen.has(job.original_work_id))fail();
  seen.add(job.original_work_id);
  const settled=job.phase==='SETTLED'&&job.original_job_completed===true&&
   typeof job.original_settlement_receipt_ref==='string'&&
   job.original_settlement_receipt_ref.startsWith('supabase:');
  if(job.original_job_completed===true&&!settled)fail();
  return Object.freeze({
   shift_id:job.shift_id,original_work_id:job.original_work_id,
   source_ref:job.source_ref,phase:job.phase,
   independently_settled:settled,
   original_settlement_receipt_ref:settled?job.original_settlement_receipt_ref:null,
   requires_independent_completion_verification:!settled,
   in_current_authorized_shift:currentShiftId===null?null:
     job.shift_id===currentShiftId,
  });
 });
 const current=currentShiftId===null?jobs:jobs.filter(j=>j.shift_id===currentShiftId);
 const unfinished=current.filter(j=>!j.independently_settled);
 return Object.freeze({
  status:'OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK',
  current_shift_id:currentShiftId,
  // "zero" means only no work in this *bounded* readback, never no other jobs.
  readback_bounded_to_recent_originals:true,
  observed_original_count:current.length,
  observed_unfinished_count:unfinished.length,
  current_shift_has_unfinished_originals:unfinished.length>0,
  jobs:Object.freeze(current),all_recent_jobs:Object.freeze(jobs),
  creates_authorization:false,dispatches_worker:false,
  installation_authorized:false,production_changed:false,
 });
}
export async function readOwnerOriginalWorkForChat({
 session,currentShiftId=null,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
    !db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('CHAT_ORIGINAL_WORK_OWNER_SCOPE_UNVERIFIED');
 const raw=await callRpc(db,'reality_read_owner_riley_repair_original_v1',
  {p_owner_id:session.user_id},{fetchImpl});
 return projectOwnerOriginalWorkReadback(raw,{currentShiftId});
}
export function originalWorkObservation(readback){
 if(readback?.status!=='OWNER_SCOPED_ORIGINAL_WORK_INDEPENDENT_READBACK')return [];
 const summary=readback.jobs.map(j=>
  j.source_ref+' original '+j.original_work_id+
  ' phase '+j.phase+
  (j.independently_settled?' independently settled':' NOT independently settled')
 ).join(' | ');
 return [Object.freeze({
  entry_id:'owner:originals:'+String(readback.current_shift_id||'recent'),
  event_kind:'owner_independent_original_job_state',
  source_kind:'OWNER_SCOPED_DATABASE_SERVICE_READBACK',
  source_ref:'reality:owner-original-job-ledger',
  epistemic_status:'EXACT_READBACK_BOUNDED_NO_NEW_AUTHORITY',
  summary:'READ BEFORE MAKING NO-WORK CLAIMS: '+summary+
   '. Only a signed final receipt means complete. A source-admitted original remains unfinished, even if a different original for the same issue has settled. '+
   'An unreadable ledger cannot prove a queue is empty. The existing authorized shift does not need a duplicate start or blanket reauthorization.',
  unfinished_original_count:readback.observed_unfinished_count,
  current_shift_id:readback.current_shift_id,
  jobs:readback.jobs,model_can_authorize_work:false,
  installation_authorized:false,production_changed:false,
 })];
}

// Reuse the signed weekly source queue; presenting potential work does not
// convert observations into authorized executable originals.
export async function readOwnerWeeklyCandidateQueueForChat({
 session,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
    !db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('CHAT_WEEKLY_QUEUE_OWNER_SCOPE_UNVERIFIED');
 const state=assertShiftReadback(await callRpc(db,
  'reality_read_owner_employee_shifts_v1',
  {p_owner_id:session.user_id},{fetchImpl}));
 const active=state.shifts.filter(x=>
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.status)&&
  !x.closed_at);
 if(active.length!==1)
  return Object.freeze({status:'CHAT_WEEKLY_QUEUE_SHIFT_UNAVAILABLE_OR_AMBIGUOUS',
   source_candidates:[],execution_authorized_by_read:false,
   installation_authorized:false,production_changed:false});
 const shiftId=active[0].shift_id;
 const data=await callRpc(db,'reality_read_owner_shift_weekly_backlog_v1',{
  p_owner_id:session.user_id,p_shift_id:shiftId},{fetchImpl});
 if(data?.shift_id!==shiftId||data?.owner_scope_verified!==true||
    data.production_changed!==false||data.installation_authorized!==false||
    data.execution_authorized_by_read!==false)
  throw Error('CHAT_WEEKLY_QUEUE_READBACK_UNVERIFIED');
 if(data.status==='NO_FRESH_WEEK_SOURCE_SNAPSHOT')
  return Object.freeze({status:'CHAT_WEEKLY_QUEUE_SNAPSHOT_MISSING',
   shift_id:shiftId,source_candidates:[],snapshot_read_verified:false,
   execution_authorized_by_read:false,installation_authorized:false,
   production_changed:false});
 if(data.status!=='EXISTING_WEEKLY_SOURCE_SNAPSHOT_RECONCILED_READ_ONLY'||
    !Array.isArray(data.open_issues)||data.open_issues.length>30||
    data.snapshot_is_new_execution_authority!==false||
    data.snapshot_is_original_job_qualification!==false||
    !Number.isSafeInteger(data.open_issue_count)||
    data.open_issues.length!==data.open_issue_count)
  throw Error('CHAT_WEEKLY_QUEUE_READBACK_UNVERIFIED');
 const candidates=data.open_issues.map(item=>{
  if(!SOURCE.test(item?.issue_url||'')||
     !Number.isSafeInteger(item.issue_number)||
     item.issue_url.split('/issues/')[1]!==String(item.issue_number)||
     typeof item.title!=='string'||item.title.length>220||
     !item.qualification||typeof item.qualification.status!=='string'||
     item.qualification.executable_original!==false||
     item.qualification.execution_authorized!==false||
     item.qualification.installation_authorized!==false)
   throw Error('CHAT_WEEKLY_QUEUE_ITEM_UNVERIFIED');
  return Object.freeze({
   source_ref:item.issue_url,
   title:item.title.slice(0,220),
   employee_role:String(item.qualification.employee||'Unassigned').slice(0,70),
   qualification_status:item.qualification.status.slice(0,100),
   next_evidence_required:String(item.qualification.next_proof||'').slice(0,400),
   executable_original:false,execution_authorized:false,
  });
 });
 return Object.freeze({status:'CHAT_WEEKLY_SOURCE_CANDIDATES_VERIFIED',
  shift_id:shiftId,week_start:data.week_start,
  source_candidate_count:candidates.length,
  source_candidates:Object.freeze(candidates),
  snapshot_is_original_job_qualification:false,
  execution_authorized_by_read:false,installation_authorized:false,
  production_changed:false,
 });
}
export function weeklyQueueObservation(readback){
 if(readback?.status!=='CHAT_WEEKLY_SOURCE_CANDIDATES_VERIFIED')return [];
 return [Object.freeze({
  entry_id:'owner:weekly-source-queue:'+String(readback.shift_id),
  event_kind:'owner_weekly_employee_source_candidate_backlog',
  source_kind:'OWNER_SCOPED_FROZEN_WEEKLY_GITHUB_SNAPSHOT',
  source_ref:'reality:verified-weekly-source-queue',
  epistemic_status:'SOURCE_CANDIDATES_UNQUALIFIED_NOT_EXECUTED',
  summary:'EXISTING EMPLOYEE WORK QUEUE: '+readback.source_candidate_count+
   ' source-backed candidates for week '+readback.week_start+'. '+
   readback.source_candidates.map(i=>
    i.employee_role+' · '+i.source_ref+' · '+i.qualification_status+
    ' · next evidence: '+i.next_evidence_required).join(' | ')+
   '. These are not new work authorizations or executed jobs. '+ 
   'Reality must qualify and investigate eligible work using current source evidence, preserve the same shift and settled originals, and never demand a duplicate shift start.',
  shift_id:readback.shift_id,
  candidate_count:readback.source_candidate_count,
  source_candidates:readback.source_candidates,
  execution_authorized_by_read:false,
  installation_authorized:false,production_changed:false,
 })];
}
