import crypto from 'node:crypto';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
export const SHIFT_FINGERPRINT_VERSION='reality-exact-eight-hour-shift-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export function computeShiftFingerprint(plan){
 if(!plan||plan.version!=='reality-eight-hour-employee-shift-draft-v1'||
  plan.status!=='DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED'||
  plan.shift_duration_minutes!==480||plan.read_only!==true||
  plan.ready_to_execute_batch!==false||plan.job_started!==false||
  !Array.isArray(plan.slots)||plan.slots.length!==8)
  throw Error('SHIFT_FINGERPRINT_UNVERIFIED_PLAN');
 const source=plan.slots.map(x=>({
  i:x.sequence,id:x.id,stage:x.stage,
  begin:x.offset_start_minutes,end:x.offset_end_minutes,
  source:x.candidate?.source_url||null,
  finding:x.candidate?.finding_id||null,
  gate:x.required_gate||null
 }));
 const hash=crypto.createHash('sha256').update(JSON.stringify({
  version:SHIFT_FINGERPRINT_VERSION,source_scope:plan.source_scope,
  timebox:480,slots:source
 })).digest('hex');
 return 'sha256:'+hash;
}
export function shiftDatabase(env=process.env){
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('SHIFT_ISOLATED_DATABASE_BOUNDARY_UNVERIFIED');
 return db;
}
export async function shiftRpc(db,rpc,payload,{fetchImpl=fetch}={}){
 if(!/^reality_(?:authorize_employee_shift_v1|read_owner_employee_shifts_v1|claim_employee_shift_step_v1|settle_employee_shift_step_v1|close_employee_shift_v1|read_owner_final_receipts_v1|read_owner_genuine_loop_v1|read_owner_qualified_capabilities_v1)$/.test(rpc))
  throw Error('SHIFT_RPC_NOT_ALLOWLISTED');
 const r=await fetchImpl(db.url+'/rest/v1/rpc/'+rpc,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload)
 });
 const result=await r.json().catch(()=>null);
 if(!r.ok||result===null||typeof result!=='object')
  throw Error('SHIFT_DATABASE_RPC_'+rpc+'_UNAVAILABLE');
 return result;
}
export function assertShiftReceipt(x){
 if(!x||!['SHIFT_DURABLY_AUTHORIZED','SHIFT_ALREADY_AUTHORIZED'].includes(x.status)||
   !UUID.test(x.shift_id||'')||x.owner_scope_verified!==true||
   x.installation_authorized!==false||x.production_changed!==false)
  throw Error('SHIFT_AUTHORIZED_RECEIPT_UNTRUSTED');
 return x;
}
export function assertShiftReadback(x){
 if(!x||x.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  x.work_installation_authorized_by_read!==false||
  x.production_changed!==false||x.verified_human_hours_saved!==null||
  !Array.isArray(x.shifts)||x.shifts.length>5||
  x.shifts.some(s=>!UUID.test(s.shift_id)||!/^sha256:[a-f0-9]{64}$/.test(s.plan_fingerprint)||
    !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK','ENDED_WITH_BLOCKED_WORK','ENDED_READ_ONLY','ESCALATED'].includes(s.status)||
    !Array.isArray(s.steps)||s.steps.length!==8||
    s.steps.some((t,i)=>t.step_index!==i+1||
     !['QUEUED','CLAIMED','SOURCE_CHECKED','AWAITING_EXACT_WORK','BLOCKED_PROVIDER','REPORTED'].includes(t.state)||
     (t.proof_sha256!=null&&!/^sha256:[a-f0-9]{64}$/.test(t.proof_sha256)))))
  throw Error('SHIFT_INDEPENDENT_READBACK_INVALID');
 return x;
}
