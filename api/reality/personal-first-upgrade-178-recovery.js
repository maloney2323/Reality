// Preauthorized original #178 only. Signed-in original owner requests direct
// server-to-server execution INSIDE the preview runtime where service secrets
// already exist. No browser-supplied job id, nonce, secret, or approval.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {original178OwnerApprovalView}
 from '../../src/reality-first178-live-owner-completion-v0.1.js';
import {dispatchFirst178ApprovedOriginal}
 from './personal-first-upgrade-178-dispatch.js';

export const maxDuration=300;
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
export async function resumeOriginal178OwnerRecovery({
 session,env=process.env,readView=original178OwnerApprovalView,
 dispatch=dispatchFirst178ApprovedOriginal,
}={}){
 const current=await readView({session,env});
 if(current?.status!=='GOVERNED_RECOVERY_READY'||
    current.original_work_id!==WORK||
    current.original_claim_preserved!==true||
    current.autonomous_recovery_eligible!==true||
    current.installation_authorized!==false||
    current.original_job_completed!==false)
  throw Object.assign(Error('FIRST178_RECOVERY_DURABLE_GRANT_NOT_READY'),
   {status:409});
 // The DB must independently mint/consume its already-authorized, once-only
 // handoff. This does not grant installation or customer acceptance.
 const r=await dispatch({env});
 if(r?.verified_server_dispatch!==true||
    r.original_work_id!==WORK||r.installed!==false||
    r.original_job_completed!==false||
    r.production_changed!==false)
  throw Error('FIRST178_RECOVERY_PROVIDER_RESULT_NOT_VERIFIED');
 return Object.freeze(r);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'FIRST178_RECOVERY_POST_ONLY'});
  }
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'FIRST178_RECOVERY_OWNER_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST178_RECOVERY_JSON_REQUIRED'});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||
     Object.keys(req.body).join(',')!=='intent'||
     req.body.intent!=='RESUME_PREAUTHORIZED_ORIGINAL_178_RECOVERY')
   return res.status(403).json({ok:false,error:'FIRST178_RECOVERY_EXACT_INTENT_REQUIRED'});
  const r=await resumeOriginal178OwnerRecovery({session});
  return res.status(200).json({ok:true,...r});
 }catch(e){
  const msg=String(e?.message||'');
  const safe=/^FIRST178_RECOVERY_[A-Z0-9_]+$/.test(msg)?
    msg:'FIRST178_RECOVERY_READBACK_REQUIRED';
  return res.status(e?.status||503).json({ok:false,error:safe,
   do_not_retry:true,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}
