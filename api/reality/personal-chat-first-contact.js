// One automatic, owner-scoped first Reality greeting for genuinely NEW
// business customers. Uses the existing saved Chat message ledger.
// Existing operators retain their goals, history and unfinished work.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
export const maxDuration=15;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'FIRST_BUSINESS_CHAT_OWNER_POST_REQUIRED'});
 try{
  privateChatConfig();
  assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session||!validUuid(session.user_id))
   return res.status(401).json({ok:false,error:'FIRST_BUSINESS_CHAT_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'FIRST_BUSINESS_CHAT_PREVIEW_ONLY'});
  const site=String(req.headers?.['sec-fetch-site']||'');
  const ct=String(req.headers?.['content-type']||'');
  const b=req.body;
  if(site&&site!=='same-origin'||
     !/^application\/json(?:;|$)/i.test(ct)||
     !b||typeof b!=='object'||Array.isArray(b)||
     Object.keys(b).sort().join('|')!=='action|conversation_id'||
     b.action!=='SEND_FIRST_OWNER_BUSINESS_CHAT_IF_NEW'||
     !validUuid(b.conversation_id))
   return res.status(400).json({ok:false,error:'FIRST_BUSINESS_CHAT_EXACT_OWNER_INPUT_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(!db.strictSecrets||!db.secretKey||db.url!==session.config?.url)
   throw Error('FIRST_BUSINESS_CHAT_OWNER_DATABASE_UNVERIFIED');
  const proof=await shiftRpc(db,'reality_send_owner_first_business_chat_v1',{
   p_owner_id:session.user_id,p_conversation_id:b.conversation_id});
  const statuses=new Set([
   'OWNER_FIRST_PROACTIVE_CHAT_DURABLY_SENT',
   'OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE',
   'OWNER_RETURNING_CUSTOMER_EXISTING_CHAT_OR_WORK']);
  if(!statuses.has(proof?.status)||proof.owner_id!==session.user_id||
   typeof proof.created!=='boolean'||
   proof.work_shift_authorized!==false||
   proof.production_changed!==false||
   proof.external_actions_authorized!==false||
   proof.provider_connected_by_read!==false||
   proof.new_customer_welcome_sent!==proof.created||
   (proof.created&&
    (proof.conversation_id!==b.conversation_id||
     !validUuid(proof.message_id)||!proof.saved_conversation_message||
     proof.human_request_not_created!==true))||
   (proof.status==='OWNER_FIRST_CHAT_ALREADY_SENT_NO_DUPLICATE'&&
     (!validUuid(proof.conversation_id)||!validUuid(proof.message_id))))
   throw Error('FIRST_BUSINESS_CHAT_DURABLE_SOURCE_READBACK_INVALID');
  return res.status(200).json({
   ok:true,status:proof.status,
   conversation_id:proof.conversation_id||null,
   current_conversation_received_message:proof.created&&
     proof.conversation_id===b.conversation_id,
   saved_message_id:proof.message_id||null,
   contact_kind:proof.contact_kind||null,
   new_customer_welcome_sent:proof.created,
   prior_history_preserved:!proof.created,
   external_actions_authorized:false,
   work_shift_authorized:false,
   provider_connected_by_read:false,
   production_changed:false
  });
 }catch(err){
  const code=/^FIRST_BUSINESS_CHAT_[A-Z0-9_]+$/.test(err?.message||'')?
   err.message:'FIRST_BUSINESS_CHAT_PROVIDER_UNVERIFIED';
  console.warn('REALITY_FIRST_OWNER_CHAT',code);
  return res.status(503).json({ok:false,error:code,
   new_customer_welcome_sent:false,work_shift_authorized:false,
   production_changed:false});
 }
}
