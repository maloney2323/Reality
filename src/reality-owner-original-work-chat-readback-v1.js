// Shared owner-bound readback: the same durable original-job ledger that the
// shift worker uses. Never infer an empty queue from a failed provider read.
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
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
