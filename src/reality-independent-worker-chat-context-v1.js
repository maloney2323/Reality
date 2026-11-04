// Authenticated, read-only independent worker diagnosis for Reality Chat.
// Evidence from Supabase cron+edge watch, NOT the worker under investigation.
// No authenticated owner id is taken from user text or model response.
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {diagnoseIndependentWorkerWake}
 from './reality-independent-worker-watchdog-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const relevant=text=>/\b(worker|wake|waking|watchdog|broker|dispatch|failure|failed|repair|recover|recovery|shift|automation|autonomous|self[- ]?improv|capabilit(?:y|ies))\b/i.test(String(text||''));
export async function readVerifiedIndependentWorkerForChat({
 session,message,env=process.env,
 db=resolveReliabilityBenchmarkDb(env),fetchImpl=fetch,now=Date.now()
}={}){
 if(!relevant(message)||env.VERCEL_ENV!=='preview'||
  !UUID.test(session?.user_id)||!db?.strictSecrets||!db.secretKey||
  db.url!==session?.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.project!=='hvkfreoagbrphwghjajw')return [];
 try{
  const response=await fetchImpl(db.url+
   '/rest/v1/rpc/reality_read_owner_governed_wakes_v1',{
    method:'POST',cache:'no-store',redirect:'error',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id}),
    signal:AbortSignal.timeout(8000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.status!=='OWNER_GOVERNED_WAKE_READBACK'||
   data.read_only!==true||data.production_changed!==false||
   data.execution_authorized_by_read!==false||
   !Array.isArray(data.wakes)||data.wakes.length>12||
   !data.watchdog)
   return [];
  const diagnosis=diagnoseIndependentWorkerWake({
   watchdog:data.watchdog,wakes:data.wakes,now});
  const summary='REALITY INDEPENDENT WORKER WATCHDOG: '+
   'Observed state '+diagnosis.status+'. '+
   'Independent evidence: '+diagnosis.reason+'. '+
   'Worker acknowledgments are not job completion. '+
   'Reality may use OpenAI to investigate provider logs, signed delivery, leases, and observed failures; '+
   'this is not a verified repair, no approval or installation is granted, and an uncertain external effect must never be automatically repeated. '+
   'Do not make users manually restart work that can safely resume under their existing approval.';
  return [Object.freeze({
   entry_id:'governed-worker-independent-watchdog',
   event_kind:'governed_worker_independent_diagnosis',
   source_kind:'AUTHENTICATED_OWNER_SCOPED_SUPABASE_INDEPENDENT_CRON_READBACK',
   source_ref:'reality:governed-wake-watchdog',
   assertion_time:new Date(now).toISOString(),
   epistemic_status:'INDEPENDENT_WORKER_HEALTH_CLASSIFICATION_NOT_REPAIR_VERIFIED',
   summary,diagnosis_status:diagnosis.status,
   original_work_id:diagnosis.original_work_id,
   independent_observer_verified:diagnosis.independent_diagnosis,
   research_permitted:true,repair_verified:false,worker_executed_now:false,
   installation_authorized:false,external_execution_authorized:false,
   production_changed:false
  })];
 }catch{return []}
}
