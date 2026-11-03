// Reality's existing production-held REALITY_GITHUB_TOKEN stays in Vercel.
// This endpoint is a DELIVERY RELAY, not an authority grantor or installer.
// A 90-second single-use, service-issued token is required before even
// reading a durable outbox claim. Writes are restricted to ONE preview branch.
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const SUPABASE_RELAY='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-governed-wake-relay-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const fail=(code,status=403)=>{const error=new Error(code);error.httpStatus=status;throw error};
function exact(body){
 if(!body||Array.isArray(body)||typeof body!=='object'||
    Object.keys(body).sort().join(',')!=='relay_nonce,version'||
    body.version!==1||typeof body.relay_nonce!=='string'||
    !UUID.test(body.relay_nonce))fail('ONE_TIME_EDGE_ISSUED_RELAY_REQUIRED',400);
}
function tok(){
 const s=process.env.REALITY_GITHUB_TOKEN;
 if(typeof s!=='string'||s.length<25)fail('EXISTING_PRODUCTION_GITHUB_CREDENTIAL_NOT_CONFIGURED',503);
 return s;
}
async function edge(body){
 const r=await fetch(SUPABASE_RELAY,{method:'POST',cache:'no-store',redirect:'error',
  headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(9000)});
 const data=await r.json().catch(()=>null);
 if(!r.ok||!data||data.ok!==true)fail('SINGLE_USE_EDGE_LEDGER_VERIFICATION_FAILED',503);
 return data;
}
async function github(token,path,method='GET',body){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28','content-type':'application/json',
    'user-agent':'Reality-preview-governed-wake-delivery-v1'},
  body:body===undefined?undefined:JSON.stringify(body)});
 if(r.status===404&&method==='GET')return null;
 const data=await r.json().catch(()=>null);
 if(!r.ok)fail('GITHUB_'+method+'_'+r.status,503);
 return data;
}
function source(claim){
 return JSON.stringify({
  approval_id:claim.approval_id,
  trigger_id:claim.trigger_id,
  dispatch_fence:claim.dispatch_fence,
  original_work_id:claim.original_work_id,
  pre_state_hash:claim.pre_state_hash,
  artifact_sha256:claim.artifact_sha256,
  target_environment:'ISOLATED_PREVIEW',
  authorization_source:'DURABLE_OWNER_RECEIPT_READBACK_REQUIRED'
 },null,2)+'\n';
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_ONLY'});
 try{
  exact(req.body);
  const token=tok(); // Credential never leaves this server process.
  const claim=await edge({action:'claim',relay_nonce:req.body.relay_nonce});
  if(claim.status==='NO_APPROVED_WAKE_READY'&&claim.execution_authorized===false)
   return res.status(200).json({ok:true,status:claim.status,
    execution_authorized:false,production_changed:false});
  if(['STALE_APPROVAL_BLOCKED','ESCALATED'].includes(claim.status)&&
     claim.execution_authorized===false)
   return res.status(200).json({ok:true,status:claim.status,
    execution_authorized:false,production_changed:false});
  if(claim.status!=='DELIVERY_CLAIMED_NOT_EXECUTION_AUTHORIZED'||
     claim.delivery_only!==true||claim.execution_authorized!==false||
     claim.owner_approval_created!==false||
     claim.target_environment!=='ISOLATED_PREVIEW'||
     !UUID.test(String(claim.approval_id||''))||
     !UUID.test(String(claim.trigger_id||''))||
     !UUID.test(String(claim.claim_id||''))||
     !UUID.test(String(claim.ack_nonce||''))||
     !WORK.test(String(claim.original_work_id||''))||
     !HASH.test(String(claim.artifact_sha256||''))||
     !HASH.test(String(claim.pre_state_hash||''))||
     !Number.isInteger(claim.dispatch_fence)||
     claim.dispatch_fence<1||claim.dispatch_fence>5)
    fail('EXACT_SIGNED_DURABLE_DELIVERY_SCOPE_REQUIRED');
  const wakePath='reality-approved-install-wakes/'+claim.approval_id+
    '-attempt-'+claim.dispatch_fence+'.json';
  const bodyText=source(claim);
  const endpoint='/contents/'+wakePath+'?ref='+encodeURIComponent(BRANCH);
  const prior=await github(token,endpoint);
  if(prior){
   const priorText=typeof prior.content==='string'?
    Buffer.from(prior.content.replace(/\s/g,''),'base64').toString('utf8'):null;
   if(prior.path!==wakePath||priorText!==bodyText)
    fail('CONFLICTING_WAKE_FILE_CANNOT_OVERWRITE');
  }else{
   const ref=await github(token,'/git/ref/heads/'+BRANCH);
   if(!COMMIT.test(String(ref?.object?.sha||'')))
    fail('PREVIEW_BRANCH_REF_READBACK_REQUIRED',503);
   const saved=await github(token,'/contents/'+wakePath,'PUT',{
    branch:BRANCH,message:'Wake only existing approved isolated job '+claim.approval_id,
    content:Buffer.from(bodyText,'utf8').toString('base64')});
   if(!COMMIT.test(String(saved?.commit?.sha||''))||
      saved?.content?.path!==wakePath)
    fail('PREVIEW_WAKE_COMMIT_NOT_VERIFIED',503);
  }
  const verified=await github(token,endpoint);
  const readback=typeof verified?.content==='string'?
   Buffer.from(verified.content.replace(/\s/g,''),'base64').toString('utf8'):null;
  if(verified?.path!==wakePath||readback!==bodyText)
   fail('GITHUB_WAKE_PROVIDER_READBACK_MISMATCH',503);
  const receipt=await edge({action:'ack',ack_nonce:claim.ack_nonce,
    approval_id:claim.approval_id,
    claim_id:claim.claim_id,fence:claim.dispatch_fence,
    delivery_id:crypto.randomUUID()});
  if(receipt.status!=='DISPATCH_ACCEPTED_NOT_EXECUTION_PROVEN'||
     receipt.execution_authorized!==false||receipt.worker_alive!==false||
     receipt.approval_id!==claim.approval_id||
     receipt.dispatch_fence!==claim.dispatch_fence)
   fail('DELIVERY_RECEIPT_RECONCILIATION_UNVERIFIED',503);
  return res.status(200).json({ok:true,status:receipt.status,
   approval_id:claim.approval_id,dispatch_fence:claim.dispatch_fence,
   worker_started:false,installation_performed:false,
   execution_authorized:false,production_changed:false});
 }catch(error){
  const code=error?.message||'UNKNOWN';
  if(/^([A-Z0-9_]{4,100}|GITHUB_(GET|PUT)_\d{3})$/.test(code))
   console.warn('REALITY_RELAY_FAIL_CLOSED',code);
  return res.status(error?.httpStatus===400?400:503).json({
   ok:false,status:'RELAY_DELIVERY_NOT_VERIFIED',
   execution_authorized:false,worker_started:false,
   installation_performed:false,production_changed:false});
 }
}
