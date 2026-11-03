// Supabase edge broker v1. Authenticated by a one-use HMAC signed database
// wake hint. The ledger is the authority; the broker is only delivery.
// No chat, arbitrary job ID, or request body can authorize installation.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const respond=(v:Record<string,unknown>,status=200)=>new Response(JSON.stringify(v),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff'}});
const reject=(code:string):never=>{throw Error('REALITY_BROKER_'+code)};
function config(){
 const url=Deno.env.get('SUPABASE_URL');
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(url!=='https://'+PROJECT+'.supabase.co'||!secret||secret.length<25)
  reject('ISOLATED_DATABASE_KEY_UNAVAILABLE');
 return {url,secret};
}
async function rpc(name:string,body:Record<string,unknown>){
 const {url,secret}=config();
 const response=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{'content-type':'application/json',accept:'application/json',
   apikey:secret,authorization:'Bearer '+secret},
  body:JSON.stringify(body)});
 const out=await response.json().catch(()=>null);
 if(!response.ok||!out||Array.isArray(out)||typeof out!=='object')
  reject('DB_'+name.toUpperCase().replace(/[^A-Z0-9_]/g,'')+'_REJECTED');
 return out as Record<string,unknown>;
}
async function github(path:string,{method='GET',body}:{method?:string,body?:unknown}={}){
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN');
 if(!token||token.length<25)reject('SCOPED_GITHUB_BROKER_CREDENTIAL_MISSING');
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','content-type':'application/json',
   'user-agent':'Reality-governed-wake-edge-v1'},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(r.status===404&&method==='GET')return null;
 const data=await r.json().catch(()=>null);
 if(!r.ok)reject('GITHUB_'+method+'_'+r.status);
 return data;
}
function decodeSource(raw:unknown){
 if(typeof raw!=='string'||raw.length>10000)reject('GITHUB_WAKE_SOURCE_INVALID');
 try{return atob(raw.replace(/\s/g,''))}catch{reject('GITHUB_WAKE_SOURCE_INVALID')}
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||!/application\/json/i.test(req.headers.get('content-type')||''))
   return respond({ok:false,error:'POST_JSON_SIGNED_HINT_REQUIRED'},405);
  const raw=await req.text();
  if(raw.length>512)reject('BODY_TOO_LONG');
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw)}catch{reject('JSON_INVALID')}
  if(!body||Array.isArray(body)||typeof body!=='object'||
     Object.keys(body).sort().join(',')!=='action,cause,issued_at,nonce,version'||
     body.version!==1||body.action!=='wake'||
     !['approval','watchdog','audit'].includes(String(body.cause))||
     !UUID.test(String(body.nonce||''))||
     (typeof body.issued_at!=='number'||!Number.isSafeInteger(body.issued_at))||
     !SHA64.test(req.headers.get('x-reality-wake-signature')||''))
   reject('SIGNED_HINT_ENVELOPE_INVALID');
  const proof=await rpc('reality_authenticate_governed_wake_hint_v1',{
   p_nonce:body.nonce,p_issued_at:body.issued_at,
   p_cause:body.cause,p_signature:req.headers.get('x-reality-wake-signature')});
  if(proof.status!=='SIGNED_WAKE_HINT_VERIFIED'||
     proof.delivery_not_execution!==true||proof.permission_granted!==false)
   reject('SIGNED_HINT_DATABASE_VERIFICATION_FAILED');

  // The existing GitHub credential is held only in Vercel production.
  // Never copy it into Supabase, branch previews, databases or logs.
  // This one-use, delivery-only relay transports the signed DB wake to a
  // narrow production endpoint. A relay nonce is NOT execution authority.
  if(!Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||
     (Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'').length<25){
   const token=await rpc('reality_issue_governed_wake_relay_v1',{});
   if(token.status!=='ONE_TIME_DELIVERY_TOKEN_ISSUED'||
      !UUID.test(String(token.relay_nonce||''))||
      token.execution_authorized!==false||
      token.owner_approval_created!==false)
     reject('RELAY_ISSUANCE_NOT_VERIFIED');
   let relayStatus=0,relay:Record<string,unknown>|null=null;
   try{
    const response=await fetch(
      'https://reality-blond.vercel.app/api/reality/governed-wake-relay',{
       method:'POST',cache:'no-store',redirect:'error',
       headers:{'content-type':'application/json'},
       body:JSON.stringify({version:1,relay_nonce:token.relay_nonce})});
    relayStatus=response.status;
    relay=await response.json().catch(()=>null);
   }catch{
    return respond({ok:false,status:'PRODUCTION_GITHUB_RELAY_UNREACHABLE',
     signed_hint_verified:true,worker_started:false,
     retry_will_be_reconsidered_by_watchdog:true,production_changed:false},503);
   }
   if(relayStatus===200&&relay?.ok===true&&
      ['NO_APPROVED_WAKE_READY','DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN',
       'STALE_APPROVAL_BLOCKED','ESCALATED'].includes(String(relay.status))&&
      relay.production_changed===false&&relay.execution_authorized===false)
    return respond({ok:true,status:relay.status,
     signed_hint_verified:true,worker_started:false,
     production_changed:false,via:'PRODUCTION_SECRET_HOLDER_DELIVERY_ONLY'});
   return respond({ok:false,status:'PRODUCTION_GITHUB_RELAY_NOT_YET_READY',
    signed_hint_verified:true,worker_started:false,
    retry_will_be_reconsidered_by_watchdog:true,production_changed:false},503);
  }
  const claim=await rpc('reality_claim_governed_wake_v1',{});
  if(claim.status==='NO_APPROVED_WAKE_READY')
   return respond({ok:true,status:'NO_APPROVED_WAKE_READY',
    signed_hint_verified:true,worker_started:false,production_changed:false});
  if(claim.status==='STALE_APPROVAL_BLOCKED'||claim.status==='ESCALATED')
   return respond({ok:true,status:claim.status,
    signed_hint_verified:true,worker_started:false,production_changed:false});
  if(claim.status!=='DELIVERY_CLAIMED_NOT_EXECUTION_AUTHORIZED'||
     !UUID.test(String(claim.approval_id||''))||
     !UUID.test(String(claim.trigger_id||''))||
     !UUID.test(String(claim.claim_id||''))||
     !WORK.test(String(claim.original_work_id||''))||
     !SHA64.test(String(claim.artifact_sha256||''))||
     (typeof claim.dispatch_fence!=='number'||!Number.isSafeInteger(claim.dispatch_fence))||
     claim.dispatch_fence<1||
     claim.target_environment!=='ISOLATED_PREVIEW'||
     claim.execution_authorized!==false||
     claim.owner_approval_created!==false)
   reject('ATOMIC_CLAIM_READBACK_MISMATCH');

  // This provider commit is merely a wake request. The existing Actions
  // runner independently rechecks the original signed owner approval.
  const ref=await github('/git/ref/heads/'+BRANCH);
  if(!SHA40.test(String(ref?.object?.sha||'')))reject('PINNED_BRANCH_UNAVAILABLE');
  // Each bounded retry gets a NEW wake file. An old runner is rejected by
  // the latest database fence, and an accepted retry genuinely fires GitHub.
  const path='reality-approved-install-wakes/'+claim.approval_id+
   '-attempt-'+claim.dispatch_fence+'.json';
  const source=JSON.stringify({
    approval_id:claim.approval_id,
    trigger_id:claim.trigger_id, // exact queued job identity; NOT authority
    dispatch_fence:claim.dispatch_fence,
    original_work_id:claim.original_work_id,
    pre_state_hash:claim.pre_state_hash,
    artifact_sha256:claim.artifact_sha256,
    target_environment:'ISOLATED_PREVIEW',
    authorization_source:'DURABLE_OWNER_RECEIPT_READBACK_REQUIRED'
  },null,2)+'\n';
  const endpoint='/contents/'+path+'?ref='+encodeURIComponent(BRANCH);
  const before=await github(endpoint);
  if(before){
   if(before.path!==path||decodeSource(before.content)!==source)
    reject('EXISTING_WAKE_FILE_COLLISION');
  }else{
   const b64=btoa(source);
   const result=await github('/contents/'+path,{method:'PUT',body:{
    branch:BRANCH,message:'Wake only existing approved isolated job '+claim.approval_id,
    content:b64}});
   if(!SHA40.test(String(result?.commit?.sha||''))||
     result?.content?.path!==path)reject('WAKE_COMMIT_UNVERIFIED');
  }
  const readback=await github(endpoint);
  if(readback?.path!==path||decodeSource(readback.content)!==source)
   reject('WAKE_FILE_READBACK_MISMATCH');
  const delivered=await rpc('reality_record_governed_delivery_v1',{
   p_approval_id:claim.approval_id,p_claim_id:claim.claim_id,
   p_fence:claim.dispatch_fence,p_delivery_id:crypto.randomUUID()});
  if(delivered.status!=='DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN'||
     delivered.execution_authorized!==false||
     delivered.worker_alive!==false)reject('DELIVERY_LEDGER_RECONCILIATION_FAILED');
  return respond({ok:true,status:delivered.status,
   signed_hint_verified:true,approval_id:claim.approval_id,
   dispatch_fence:claim.dispatch_fence,worker_started:false,
   installation_performed:false,production_changed:false});
 }catch(err){
  const code=err instanceof Error?err.message:'UNKNOWN';
  if(/^REALITY_BROKER_[A-Z0-9_]{3,120}$/.test(code))
   console.warn('REALITY_WAKE_DELIVERY_CHECK',code);
  return respond({ok:false,status:'WAKE_BROKER_FAIL_CLOSED',
   worker_started:false,installation_performed:false,
   production_changed:false},403);
 }
});
