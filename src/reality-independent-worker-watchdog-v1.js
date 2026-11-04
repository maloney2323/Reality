// Observer-side diagnosis, NOT the worker observing its own heartbeat.
// Uses independently authenticated cron/edge/broker readback, never a model
// assertion to trigger delivery, repeat an external effect or approve a repair.
export const INDEPENDENT_WATCHDOG_VERSION='reality-independent-worker-watchdog-v1';
const WATCHDOG=new Set(['WATCHDOG_RECENTLY_SUCCEEDED','WATCHDOG_STALE_OR_UNVERIFIED']);
const DELIVERY=new Set(['DISPATCH_CREDENTIAL_MISSING','BROKER_READY_IDLE',
 'DELIVERY_ACCEPTED','BROKER_FAIL_CLOSED','NO_VALID_BROKER_PROOF',
 'NO_RECENT_BROKER_PROOF']);
const WAKE=new Set(['WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED',
 'WORKER_ALIVE','GOVERNANCE_READY','EXECUTING','RETRY_PENDING',
 'STALE_APPROVAL_BLOCKED','ESCALATED','SETTLED','RECEIPT_VERIFIED']);
const WORK=/^work:[a-f0-9]{32}$/;
const t=v=>v==null?null:Date.parse(v);
function fail(x){throw Error('INDEPENDENT_WATCHDOG_'+x)}
const outcome=(status,reason,work=null)=>Object.freeze({
 schema:INDEPENDENT_WATCHDOG_VERSION,status,reason,
 original_work_id:work,
 independent_diagnosis:true,
 research_with_openai_permitted:true,
 research_is_not_solution_verified:true,
 trusted_broker_recheck_required:true,
 retry_external_effects_automatically:false,
 execution_authorized:false,installation_authorized:false,
 production_changed:false,
});
export function diagnoseIndependentWorkerWake({watchdog,wakes=[],now=Date.now(),
 deadAfterMs=180000,watchdogStaleAfterMs=360000}={}){
 if(!watchdog||watchdog.source!=='POSTGRES_CRON_AND_SIGNED_EDGE_HTTP_READBACK'||
  !WATCHDOG.has(watchdog.status)||!DELIVERY.has(watchdog.broker_delivery_status)||
  typeof watchdog.delivery_ready_proven!=='boolean'||
  !Array.isArray(wakes)||wakes.length>12||
  !Number.isFinite(now)||!Number.isFinite(deadAfterMs)||deadAfterMs<30000||
  !Number.isFinite(watchdogStaleAfterMs)||watchdogStaleAfterMs<60000||
  wakes.some(w=>!WORK.test(w.original_work_id)||!WAKE.has(w.wake_state)||
   !Number.isInteger(w.dispatch_attempts)||w.dispatch_attempts<0||
   w.dispatch_attempts>5||w.preview_only!==true||
   (w.dispatched_at!==null&&!Number.isFinite(t(w.dispatched_at)))||
   (w.worker_alive_at!==null&&!Number.isFinite(t(w.worker_alive_at)))))
  fail('INDEPENDENT_ATTESTATION_REQUIRED');
 const last=watchdog.last_run_at?Date.parse(watchdog.last_run_at):NaN;
 if(watchdog.status!=='WATCHDOG_RECENTLY_SUCCEEDED'||
  !Number.isFinite(last)||last>now+60000||
  now-last>watchdogStaleAfterMs)
  return outcome('INDEPENDENT_OBSERVER_STALE',
   'The separate cron/edge watchdog itself needs an external supervision check');
 if(watchdog.broker_delivery_status==='DISPATCH_CREDENTIAL_MISSING'||
  watchdog.broker_delivery_status==='BROKER_FAIL_CLOSED')
  return outcome('BROKER_TRANSPORT_BLOCKED',
   'Inspect broker credentials and signed delivery; do not grant new execution rights');
 for(const w of wakes){
  if(['SETTLED','RECEIPT_VERIFIED'].includes(w.wake_state))continue;
  if(w.wake_state==='ESCALATED'||w.wake_state==='STALE_APPROVAL_BLOCKED')
   return outcome('GOVERNANCE_OR_EXECUTION_ESCALATED',
    'Preserve failure evidence, independently recheck lease, ledger and owner approval',w.original_work_id);
  if(['WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED','RETRY_PENDING'].includes(w.wake_state)){
   const at=t(w.dispatched_at)||t(w.last_updated_at);
   if(at!==null&&Number.isFinite(at)&&now-at>deadAfterMs){
    return outcome(w.worker_alive_at?'WORKER_LOST_AFTER_ACK':'WORKER_DID_NOT_WAKE',
     'Independently inspect durable outbox, signed delivery, worker acknowledgment and lease before a fenced retry',w.original_work_id);
   }
  }
  if(['WORKER_ALIVE','GOVERNANCE_READY','EXECUTING'].includes(w.wake_state)){
   const at=t(w.last_updated_at);
   if(Number.isFinite(at)&&now-at>deadAfterMs)
    return outcome('WORKER_STALLED_AFTER_WAKE',
     'Worker started but did not make independently acknowledged progress; investigate original work and side effects',w.original_work_id);
  }
 }
 return outcome(watchdog.delivery_ready_proven?'INDEPENDENT_TRANSPORT_OBSERVED':
  'DELIVERY_NOT_INDEPENDENTLY_PROVEN',
  'Independent watchdog reports only transport health; a final original-job receipt must be verified separately');
}
