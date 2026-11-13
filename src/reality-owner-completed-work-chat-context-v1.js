// Recent independently settled owner work as read-only conversational memory.
// This is not a keyword router or a second memory table. The existing
// owner-scoped final-receipt ledger supplies the data on EVERY chat turn;
// cognition resolves anaphora and decides when a receipt is relevant.
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';

const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/i;
const SHA40=/^[a-f0-9]{40}$/i;
const SHA64=/^(?:sha256:)?[a-f0-9]{64}$/i;
const MAX=5;

export function projectOwnerCompletedWorkForChat(read,{
 ownerId,now=new Date()
}={}){
 if(!UUID.test(ownerId||'')||!Number.isFinite(now.getTime())||
  read?.status!=='INDEPENDENT_FINAL_RECEIPT_READBACK'||
  read.does_not_authorize_actions!==true||
  !Array.isArray(read.receipts)||read.receipts.length>100)
  throw Error('OWNER_FINAL_RECEIPTS_SOURCE_NOT_VERIFIED');
 const unique=new Set(),entries=[];
 for(const r of read.receipts){
  if(r?.status!=='FULL_LOOP_INDEPENDENTLY_VERIFIED'||
   !WORK.test(r.original_work_id||'')||
   !SHA64.test(r.artifact_sha256||'')||
   !SHA40.test(r.installed_commit_sha||'')||
   !UUID.test(r.settlement_event_id||'')||
   r.production_changed!==false||
   !Number.isFinite(Date.parse(r.verified_at||''))||
   (r.provider_run_id!=null&&!Number.isSafeInteger(Number(r.provider_run_id))))
   throw Error('OWNER_FINAL_RECEIPT_ROW_UNVERIFIED');
  if(unique.has(r.original_work_id))continue;
  unique.add(r.original_work_id);
  entries.push(Object.freeze({
   entry_id:'owner:verified-original:'+r.original_work_id+':'+r.settlement_event_id,
   event_kind:'owner_independent_original_job_final_receipt',
   source_kind:'SERVICE_VERIFIED_OWNER_SCOPED_EXISTING_FINAL_RECEIPT_LEDGER',
   source_ref:'supabase:genuine_independent_final_receipts_v1:'+r.settlement_event_id,
   assertion_time:r.verified_at,
   epistemic_status:'INDEPENDENT_ORIGINAL_JOB_SETTLEMENT_VERIFIED',
   original_work_id:r.original_work_id,
   installed_commit_sha:r.installed_commit_sha,
   independent_settlement_event_id:r.settlement_event_id,
   original_job_completed:true,
   verified_cash_savings_usd:null,
   verified_human_hours_saved:null,
   production_changed:false,
   execution_authorized:false,
   installation_authorized:false,
   summary:'EXISTING INDEPENDENT ORIGINAL-JOB RECEIPT: Original '+
    r.original_work_id+' was verified as settled in the isolated environment on '+
    r.verified_at+'. Installed commit '+r.installed_commit_sha+
    '; settlement evidence event '+r.settlement_event_id+
    '. This is completed original-job evidence, NOT confirmation the whole shift finished. '+
    'No production changes or measured cash/labor savings. A read-only chat cannot restart or reapprove it.'
  }));
  if(entries.length===MAX)break;
 }
 return entries;
}

export async function readVerifiedOwnerCompletedWorkForChat({
 session,env=process.env,db=resolveReliabilityBenchmarkDb(env),
 fetchImpl=fetch,rpc=shiftRpc,now=new Date()
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
   db?.strictSecrets!==true||!db.secretKey||
   db.url!==session?.config?.url||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const source=await rpc(db,'reality_read_owner_final_receipts_v1',
   {p_owner_id:session.user_id},{fetchImpl});
  return projectOwnerCompletedWorkForChat(source,{ownerId:session.user_id,now});
 }catch{
  // Missing source evidence never becomes conversational fact.
  return [];
 }
}
