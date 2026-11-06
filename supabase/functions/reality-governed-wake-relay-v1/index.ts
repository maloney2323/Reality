// One-time credentialless relay attestation for an already HMAC-verified
// durable wake. Public endpoint with 128-bit one-time database bearer nonce.
// This relay NEVER grants approval or installation authority.
const PROJECT='hvkfreoagbrphwghjajw';
const ID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA64=/^[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const reply=(v:Record<string,unknown>,status=200)=>new Response(JSON.stringify(v),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
function fail(code:string):never{throw Error('RELAY_'+code)}
async function rpc(name:string,payload:Record<string,unknown>){
 const url=Deno.env.get('SUPABASE_URL');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(url!=='https://'+PROJECT+'.supabase.co'||!key||key.length<24)
  fail('SERVICE_KEY_NOT_AVAILABLE');
 const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',
  redirect:'error',cache:'no-store',
  headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json',
    'content-type':'application/json'},
  body:JSON.stringify(payload)});
 const j=await r.json().catch(()=>null);
 if(!r.ok||!j||typeof j!=='object'||Array.isArray(j))
  fail('DATABASE_'+name.toUpperCase().replace(/[^A-Z0-9_]/g,'')+'_REJECTED');
 return j as Record<string,unknown>;
}
Deno.serve(async request=>{
 try{
  if(request.method!=='POST'||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))
   return reply({ok:false,status:'POST_JSON_REQUIRED'},405);
  const data=await request.text();
  if(data.length>650)fail('ENVELOPE_TOO_LARGE');
  let payload:Record<string,unknown>;
  try{payload=JSON.parse(data)}catch{fail('MALFORMED_JSON')}
  if(!payload||Array.isArray(payload)||typeof payload!=='object')
   fail('INVALID_ENVELOPE');
  if(payload.action==='verify'){
   // Read-only, service-gated nonce validation before any Vercel-held
   // GitHub credential gets used. A forged envelope never touches GitHub.
   if(Object.keys(payload).sort().join(',')!=='action,relay_nonce'||
      !ID.test(String(payload.relay_nonce||'')))
    fail('PREFLIGHT_ONE_TIME_NONCE_REQUIRED');
   const proof=await rpc('reality_verify_governed_wake_relay_nonce_v1',{
    p_relay_nonce:payload.relay_nonce});
   if(proof.status!=='ONE_TIME_DELIVERY_NONCE_VALID'||
      proof.execution_authorized!==false||
      proof.owner_approval_created!==false)
    fail('PREFLIGHT_UNCONSUMED_NONCE_UNVERIFIED');
   return reply({ok:true,status:'RELAY_NONCE_VERIFIED_NOT_CONSUMED',
    execution_authorized:false,owner_approval_created:false,
    worker_started:false,production_changed:false});
  }
  if(payload.action==='claim'){
   if(Object.keys(payload).sort().join(',')!=='action,relay_nonce'||
     !ID.test(String(payload.relay_nonce||'')))fail('CLAIM_ONE_TIME_NONCE_REQUIRED');
   const consumed=await rpc('reality_consume_governed_wake_relay_v1',{
    p_relay_nonce:payload.relay_nonce});
   if(consumed.status!=='ONE_TIME_DELIVERY_TOKEN_CONSUMED'||
      consumed.execution_authorized!==false)fail('RELAY_CONSUMPTION_UNPROVEN');
   const claim=await rpc('reality_claim_governed_wake_v1',{});
   if(claim.status==='NO_APPROVED_WAKE_READY')
    return reply({ok:true,status:'NO_APPROVED_WAKE_READY',
     execution_authorized:false,approval_created:false});
   if(['STALE_APPROVAL_BLOCKED','ESCALATED'].includes(String(claim.status)))
    return reply({ok:true,status:claim.status,execution_authorized:false});
   if(claim.status!=='DELIVERY_CLAIMED_NOT_EXECUTION_AUTHORIZED'||
      !ID.test(String(claim.approval_id||''))||
      !ID.test(String(claim.trigger_id||''))||
      !ID.test(String(claim.claim_id||''))||
      !WORK.test(String(claim.original_work_id||''))||
      !SHA64.test(String(claim.artifact_sha256||''))||
      !SHA64.test(String(claim.pre_state_hash||''))||
      !Number.isSafeInteger(claim.dispatch_fence)||
      Number(claim.dispatch_fence)<1||Number(claim.dispatch_fence)>5||
      claim.target_environment!=='ISOLATED_PREVIEW'||
      claim.execution_authorized!==false||claim.owner_approval_created!==false)
    fail('EXACT_LEDGER_CLAIM_REQUIRED');
   // A second short-lived nonce is bound to this exact approved claim.
   // Only the production-held credential relay receives it; public callers
   // cannot acknowledge someone else's delivery from IDs alone.
   const ack=await rpc('reality_issue_governed_relay_ack_v1',{
    p_approval_id:claim.approval_id,
    p_claim_id:claim.claim_id,
    p_fence:claim.dispatch_fence});
   if(ack.status!=='EXACT_DELIVERY_ACK_NONCE_ISSUED'||
      !ID.test(String(ack.ack_nonce||''))||
      ack.approval_id!==claim.approval_id||
      ack.claim_id!==claim.claim_id||
      ack.dispatch_fence!==claim.dispatch_fence||
      ack.execution_authorized!==false)
     fail('SCOPED_DELIVERY_ACK_NONCE_UNVERIFIED');
   return reply({ok:true,...claim,ack_nonce:ack.ack_nonce,
    delivery_only:true,worker_started:false,production_changed:false});
  }
  if(payload.action==='ack'){
   if(Object.keys(payload).sort().join(',')!=='ack_nonce,action,approval_id,claim_id,delivery_id,fence'||
      !ID.test(String(payload.ack_nonce||''))||
      !ID.test(String(payload.approval_id||''))||
      !ID.test(String(payload.claim_id||''))||
      !ID.test(String(payload.delivery_id||''))||
      !Number.isSafeInteger(payload.fence)||
      Number(payload.fence)<1||Number(payload.fence)>5)
    fail('FENCED_ACK_REQUIRED');
   // Receipt remains dispatch-only. OIDC is separately verified by worker.
   const receipt=await rpc('reality_record_governed_relay_delivery_v1',{
    p_ack_nonce:payload.ack_nonce,
    p_approval_id:payload.approval_id,p_claim_id:payload.claim_id,
    p_fence:payload.fence,p_delivery_id:payload.delivery_id});
   if(receipt.status!=='DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN'||
     receipt.execution_authorized!==false||receipt.worker_alive!==false)
    fail('EXACT_DELIVERY_RECONCILIATION_REQUIRED');
   return reply({ok:true,...receipt,production_changed:false});
  }
  fail('RELAY_ACTION_NOT_ALLOWED');
 }catch(error){
  const safe=error instanceof Error?error.message:'UNKNOWN';
  if(/^RELAY_[A-Z0-9_]{3,150}$/.test(safe))
   console.warn('REALITY_WAKE_RELAY_REJECTED',safe);
  return reply({ok:false,status:'RELAY_REJECTED',execution_authorized:false,
   production_changed:false},403);
 }
});
