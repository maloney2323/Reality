// Read-only signed owner completion preflight. This cannot execute tests,
// create work, reuse prior install approval, or grant any external authority.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
export const maxDuration=20;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET'||Object.keys(req.query||{}).length)
  return res.status(405).json({ok:false,error:'CHAT_COMPLETION_PREFLIGHT_READ_ONLY'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id||''))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('CHAT_COMPLETION_OWNER_DB_SCOPE_UNVERIFIED');
  const r=await shiftRpc(db,'reality_read_owner_chat_development_completion_preflight_v1',
   {p_owner_id:session.user_id},{timeoutMs:12000});
  if(r?.status!=='OWNER_CHAT_DEVELOPMENT_FULL_GOAL_COMPLETION_PREFLIGHT_READ_ONLY'||
     r.owner_id!==session.user_id||r.read_only!==true||
     !Array.isArray(r.items)||r.items.length>10||
     !Number.isSafeInteger(r.total)||r.total<r.items.length||
     r.new_original_created!==false||r.new_shift_started!==false||
     r.owner_approval_granted!==false||r.execution_authorized!==false||
     r.installation_authorized!==false||
     r.original_job_completed_by_read!==false||r.production_changed!==false||
     r.items.some(x=>!WORK.test(x.original_work_id||'')||
      !UUID.test(x.message_id||'')||
      x.source_ref!=='supabase:reality_chat_messages:'+x.message_id||
      typeof x.next_gate!=='string'||typeof x.original_goal!=='string'||
      typeof x.phase!=='string'||
      x.feature_acceptance_independently_verified!==false||
      x.owner_install_approval_ready!==false||
      x.execution_authorized!==false||x.installation_authorized!==false||
      x.original_job_completed_by_read!==false||x.production_changed!==false))
    throw Error('CHAT_COMPLETION_PREFLIGHT_INDEPENDENT_RECEIPT_INVALID');
  return res.status(200).json({ok:true,...r});
 }catch(e){
  console.warn('REALITY_CHAT_COMPLETION_PREFLIGHT_UNAVAILABLE',
   String(e?.message||'').startsWith('CHAT_COMPLETION_')?
    'OWNER_OR_PROVIDER_SCOPE':'PROVIDER_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'CHAT_COMPLETION_INDEPENDENT_PREFLIGHT_UNAVAILABLE',
   execution_authorized:false,installation_authorized:false,
   production_changed:false});
 }
}
