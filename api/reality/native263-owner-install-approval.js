// Owner's only exact native #263 installation approval surface in Reality Chat.
// Explicit signed-in owner click is separate from an already-authorized shift.
// No model command, passive page refresh, browser session token forwarding,
// GitHub source write, deployment, or third confirmation happens here.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
export const maxDuration=35;
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const INTENT='OWNER_APPROVE_NATIVE263_FROZEN_PREVIEW_INSTALL';
const CONFIRM='APPROVE EXACT TESTED ISSUE 263 INSTALLATION IN ISOLATED PREVIEW';
function serviceHeaders(db){return {
 apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
 accept:'application/json','content-type':'application/json'
}}
async function ownerCard(db,session,fetchImpl=fetch){
 const response=await fetchImpl(db.url+
  '/rest/v1/rpc/reality_read_native263_owner_approval_card_v1',{
  method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12000),headers:serviceHeaders(db),
  body:JSON.stringify({p_owner_id:session.user_id})});
 if(!response.ok)throw Error('NATIVE263_OWNER_CARD_PROVIDER_UNAVAILABLE');
 const card=await response.json().catch(()=>null);
 if(card?.status==='NO_OWNER_NATIVE263_APPROVAL_CARD')
  return {status:'NO_OWNER_NATIVE263_APPROVAL_CARD',
   owner_approval_ready:false};
 if(card?.status!=='EXACT_OWNER_NATIVE263_INSTALLATION_APPROVAL_CARD'||
    card.owner_id!==session.user_id||card.owner_id!==OWNER||
    card.original_work_id!==WORK||card.shift_id!==SHIFT||
    card.artifact_sha256!==HASH||
    card.source_ref!=='https://github.com/maloney2323/Reality/issues/263'||
    card.source_file!=='src/reality-riley-service-original-runtime-v1.js'||
    card.target_branch!=='reality/isolated-openai-governance-gateway-20261108'||
    card.candidate_commit_sha!=='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'||
    card.verified_frozen_ci_run_id!==42525028367||
    card.production_changed!==false||
    typeof card.owner_approval_ready!=='boolean')
  throw Error('NATIVE263_OWNER_CARD_PROOF_MISMATCH');
 return card;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).json({ok:false,error:'NATIVE263_OWNER_GET_OR_EXPLICIT_POST_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'NATIVE263_CLIENT_SCOPE_NOT_ACCEPTED'});
  if(req.method==='POST'){
   if(!req.headers?.origin||
      req.headers?.['sec-fetch-site']==='cross-site'||
      !String(req.headers?.['content-type']||'').toLowerCase()
       .startsWith('application/json'))
    return res.status(403).json({ok:false,error:'NATIVE263_EXPLICIT_SAME_ORIGIN_CLICK_REQUIRED'});
   assertSameOrigin(req);
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'NATIVE263_CHAT_SIGN_IN_REQUIRED'});
  if(session.user_id!==OWNER)return res.status(403).json({
   ok:false,error:'NATIVE263_NOT_CURRENT_ORIGINAL_OWNER'});
  const db=resolveReliabilityBenchmarkDb();
  if(db?.strictSecrets!==true||db.url!==session.config.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
     !db.secretKey)
   throw Error('NATIVE263_ISOLATED_OWNER_SERVICE_SCOPE_REQUIRED');
  const card=await ownerCard(db,session);
  if(req.method==='GET')return res.status(200).json({
   ok:true,...card,installation_completed:card.approval_state==='SOURCE_INSTALLED',
   next_step:card.owner_approval_ready?
     'EXACT_OWNER_CLICK_MAY_AUTHORIZE_SINGLE_AUTOMATIC_INSTALL':
     'CONTINUATION_AND_FINAL_RECEIPT_PROOF_REQUIRED_BEFORE_OWNER_APPROVAL'});
  if(!req.body||typeof req.body!=='object'||
     Object.getPrototypeOf(req.body)!==Object.prototype||
     Array.isArray(req.body)||
     Object.keys(req.body).sort().join(',')!==
      'artifact_sha256,confirmation,intent,original_work_id,request_id'||
     req.body.original_work_id!==WORK||
     req.body.artifact_sha256!==HASH||
     req.body.intent!==INTENT||req.body.confirmation!==CONFIRM||
     !UUID.test(req.body.request_id||''))
   return res.status(403).json({ok:false,
    error:'NATIVE263_EXACT_OWNER_CLICK_ARTIFACT_REQUIRED',
    approval_recorded:false,installation_completed:false});
  if(card.owner_approval_ready!==true)
   return res.status(409).json({ok:false,
    error:'NATIVE263_INSTALL_APPROVAL_BLOCKED_UNVERIFIED_FINAL_CONTINUATION',
    approval_not_recorded:true,owner_approval_ready:false,
    installation_completed:false,original_job_completed:false,
    production_changed:false});
  // This is a USER Supabase JWT RPC, not a service-role authorization.
  // The database checks auth.uid() and atomically binds one approval receipt
  // to both the same native original and the same frozen install warrant.
  const response=await fetch(db.url+
   '/rest/v1/rpc/reality_owner_approve_native263_exact_install_v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(15000),
   headers:{apikey:session.config.key,
    authorization:'Bearer '+session.access_token,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({
    p_original_work_id:WORK,p_artifact_sha256:HASH,
    p_intent:INTENT,p_confirmation:CONFIRM,
    p_request_id:req.body.request_id})});
  if(!response.ok)return res.status(409).json({
   ok:false,error:'NATIVE263_OWNER_APPROVAL_ATOMIC_PROVIDER_REJECTED',
   approval_status_unknown:true,retry_owner_approval:false,
   next_action:'CHECK_EXACT_READBACK_BEFORE_ANY_RETRY'});
  const receipt=await response.json().catch(()=>null);
  if(receipt?.status==='NATIVE263_INSTALL_APPROVAL_BLOCKED_UNVERIFIED_FINAL_CONTINUATION')
   return res.status(409).json({ok:false,error:receipt.status,
    approval_not_recorded:true,original_job_completed:false});
  if(receipt?.status==='NATIVE263_EXACT_OWNER_APPROVAL_ALREADY_RECORDED_NO_REAPPROVE')
   return res.status(202).json({ok:true,...receipt,
    no_third_confirmation:true,retry_owner_approval:false});
  if(receipt?.status!=='OWNER_APPROVED_EXACT_NATIVE263_INSTALL_AUTO_CONTINUATION'||
     receipt.owner_id!==session.user_id||receipt.original_work_id!==WORK||
     receipt.shift_id!==SHIFT||receipt.artifact_sha256!==HASH||
     receipt.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_REALITY_CHAT_CLICK'||
     !UUID.test(receipt.approval_receipt_id||'')||
     receipt.installation_authorized!==true||
     receipt.installation_completed!==false||
     receipt.original_job_completed!==false||
     receipt.production_changed!==false)
   throw Error('NATIVE263_OWNER_APPROVAL_RECEIPT_INVALID');
  // The EXISTING one-minute worker runs the approved installer.
  // This owner-facing route does not perform a second approval or manual
  // resume request. It never claims installation until independent readback.
  return res.status(202).json({
   ok:true,...receipt,no_third_confirmation:true,
   worker_continuation:'EXISTING_SIGNED_SCHEDULED_WORKER',
   retry_owner_approval:false,
   installation_completed:false,original_job_completed:false,
   production_changed:false});
 }catch{
  return res.status(503).json({
   ok:false,error:'NATIVE263_OWNER_APPROVAL_READBACK_UNVERIFIED',
   approval_status_unknown:true,retry_owner_approval:false,
   installation_completed:false,original_job_completed:false,
   production_changed:false});
 }
}
