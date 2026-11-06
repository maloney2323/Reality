// Owner-authenticated read-only verification of real Riley worker activity.
// Public provider data remains evidence, never an action warrant or approval.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readRileyPilotProviderProof}
 from '../../src/reality-riley-pilot-provider-proof-v1.js';
export const maxDuration=45;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'RILEY_PROOF_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'RILEY_PROOF_QUERY_DENIED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'RILEY_PROOF_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'RILEY_PROOF_PREVIEW_ONLY'});
  const result=await readRileyPilotProviderProof();
  return res.status(200).json({ok:true,owner_scope_verified:true,...result,
   read_only:true,worker_execution_authorized_by_read:false});
 }catch(e){
  console.warn('RILEY_PILOT_PROOF_READBACK',
   /^RILEY_PROOF_[A-Z0-9_]+$/.test(e?.message||'')?
    e.message:'PROVIDER_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'RILEY_PROOF_PROVIDER_OR_SESSION_UNAVAILABLE',
   original_job_completed:false,production_changed:false});
 }
}
