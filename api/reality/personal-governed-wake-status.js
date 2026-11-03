// Signed-in, read-only Reality governed worker wake status. Never authorizes.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
const WORK=/^work:[a-f0-9]{32}$/;
const STATES=new Set(['WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED',
 'WORKER_ALIVE','GOVERNANCE_READY','EXECUTING','RETRY_PENDING',
 'STALE_APPROVAL_BLOCKED','ESCALATED','SETTLED','RECEIPT_VERIFIED']);
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'WAKE_READ_ONLY_GET'});
  if(Object.keys(req.query||{}).length)return res.status(400).json({
   ok:false,error:'CLIENT_WORK_ID_NOT_ACCEPTED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
     db.url!==session.config.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     db.project!=='hvkfreoagbrphwghjajw'||!db.secretKey)
   return res.status(403).json({ok:false,error:'ISOLATED_OWNER_WAKE_SCOPE_NOT_VERIFIED'});
  const response=await fetch(db.url+
   '/rest/v1/rpc/reality_read_owner_governed_wakes_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})});
  const data=await response.json().catch(()=>null);
  if(!response.ok||data?.status!=='OWNER_GOVERNED_WAKE_READBACK'||
     data.read_only!==true||data.production_changed!==false||
     data.execution_authorized_by_read!==false||
     !Array.isArray(data.wakes)||data.wakes.length>12||
     data.wakes.some(w=>!WORK.test(w.original_work_id)||
       !STATES.has(w.wake_state)||
       !Number.isSafeInteger(w.dispatch_attempts)||
       w.dispatch_attempts<0||w.dispatch_attempts>5||
       w.preview_only!==true||
       typeof w.ledger_phase!=='string'||
       w.ledger_phase.length>80)||
     !data.watchdog||
     !['WATCHDOG_RECENTLY_SUCCEEDED','WATCHDOG_STALE_OR_UNVERIFIED']
       .includes(data.watchdog.status)||
     !['DISPATCH_CREDENTIAL_MISSING','BROKER_READY_IDLE',
       'DELIVERY_ACCEPTED','BROKER_FAIL_CLOSED',
       'NO_VALID_BROKER_PROOF','NO_RECENT_BROKER_PROOF']
       .includes(data.watchdog.broker_delivery_status)||
     typeof data.watchdog.delivery_ready_proven!=='boolean'||
     data.watchdog.source!=='POSTGRES_CRON_AND_SIGNED_EDGE_HTTP_READBACK')
   throw Error('WAKE_OWNER_READBACK_NOT_TRUSTED');
  return res.status(200).json({ok:true,...data});
 }catch{
  return res.status(503).json({ok:false,error:'OWNER_WAKE_READBACK_UNAVAILABLE',
   worker_started:false,installation_performed:false,production_changed:false});
 }
}