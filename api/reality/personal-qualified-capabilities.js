// Read-only and owner-scoped. Does not install, authorize, or resume a job.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'QUALIFIED_CAPABILITIES_READ_ONLY'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CLIENT_SCOPE_NOT_ACCEPTED'});
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const secret=String(process.env.SUPABASE_SECRET_KEY||'');
  if(url!==session.config.url||!secret.startsWith('sb_secret_'))
   throw Error('ISOLATED_OWNER_DATABASE_NOT_VERIFIED');
  const response=await fetch(
   url+'/rest/v1/rpc/reality_read_owner_qualified_capabilities_v1',{
    method:'POST',headers:{
     apikey:secret,authorization:'Bearer '+secret,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id}),
   });
  if(!response.ok)throw Error('OWNER_READBACK_UNAVAILABLE');
  const entries=await response.json();
  if(!Array.isArray(entries)||entries.length>20||
   entries.some(x=>x.phase!=='AWAITING_OWNER_APPROVAL'||
    x.qualification?.installation_authorized!==false||
    x.qualification?.original_job_completed!==false))
   throw Error('QUALIFICATION_READBACK_INVALID');
  return res.status(200).json({
   ok:true,status:entries.length?'VERIFIED_UPGRADES_WAITING_FOR_OWNER':'NO_VERIFIED_UPGRADES',
   entries,installation_authorized:false,original_job_completed:false,
   changes_performed:false,
  });
 }catch(e){
  console.warn('REALITY_QUALIFIED_CAPABILITY_READ_UNAVAILABLE',
    String(e?.message||'').startsWith('ISOLATED_')?'CONFIG_SCOPE':'READBACK');
  return res.status(503).json({ok:false,error:'QUALIFIED_CAPABILITY_READBACK_UNAVAILABLE'});
 }
}
