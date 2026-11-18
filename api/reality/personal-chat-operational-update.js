// Source-backed operational Chat messages: existing owner account, active
// employee maintenance, scheduled source reviews and capability inquiries.
// No user text, model output, shift approval or external execution permitted.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
export const maxDuration=20;
const STATUSES=new Set([
 'VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT',
 'OPERATIONAL_STATE_ALREADY_DELIVERED_NO_REPEAT',
 'OPERATIONAL_GREETING_COOLDOWN_NO_REPEAT',
 'NO_NEW_ACTIONABLE_VERIFIED_OPERATIONAL_STATE'
]);
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'OPERATIONAL_CHAT_POST_REQUIRED'});
 try{
  privateChatConfig();
  assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session||!validUuid(session.user_id))
   return res.status(401).json({
    ok:false,error:'OPERATIONAL_CHAT_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({
    ok:false,error:'OPERATIONAL_CHAT_PREVIEW_ONLY'});
  const site=String(req.headers?.['sec-fetch-site']||'');
  const ct=String(req.headers?.['content-type']||'');
  const b=req.body;
  if((site&&site!=='same-origin')||
    !/^application\/json(?:;|$)/i.test(ct)||
    !b||typeof b!=='object'||Array.isArray(b)||
    Object.keys(b).sort().join('|')!=='action|conversation_id'||
    b.action!=='CHECK_VERIFIED_OWNER_OPERATIONAL_UPDATES'||
    !validUuid(b.conversation_id))
   return res.status(400).json({ok:false,
    error:'OPERATIONAL_CHAT_EXACT_OWNER_INPUT_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(!db.strictSecrets||!db.secretKey||db.url!==session.config?.url)
   throw Error('OPERATIONAL_CHAT_OWNER_DATABASE_BOUNDARY_UNVERIFIED');
  const proof=await shiftRpc(db,
   'reality_send_owner_operational_chat_digest_v1',{
    p_owner_id:session.user_id,p_conversation_id:b.conversation_id});
  if(!STATUSES.has(proof?.status)||proof.owner_id!==session.user_id||
     proof.created!==(proof.status==='VERIFIED_OPERATIONAL_CHAT_DURABLY_SENT')||
     proof.shift_authorized!==false||
     proof.installation_authorized!==false||
     proof.production_changed!==false||
     (proof.created&&(
      proof.message_saved!==true||
      !validUuid(proof.message_id||'')||
      proof.conversation_id!==b.conversation_id||
      !Number.isSafeInteger(proof.unfinished_maintenance)||
      !Number.isSafeInteger(proof.previously_signed_repairs)||
      !Number.isSafeInteger(proof.outside_signed_authority)||
      proof.unfinished_maintenance!==
       proof.previously_signed_repairs+proof.outside_signed_authority||
      !Number.isSafeInteger(proof.scheduled_source_reviews)||
      !Number.isSafeInteger(proof.unverified_capability_inquiries))))
   throw Error('OPERATIONAL_CHAT_VERIFIED_OWNER_RECEIPT_INVALID');
  return res.status(200).json({
   ok:true,status:proof.status,
   current_conversation_received_message:proof.created&&
    proof.conversation_id===b.conversation_id,
   conversation_id:proof.conversation_id||null,
   saved_message_id:proof.message_id||null,
   created:proof.created,
   source:'OWNER_VERIFIED_UNIVERSE_WORK_LEDGER',
   unfinished_maintenance:proof.created?proof.unfinished_maintenance:null,
   previously_signed_repairs:proof.created?proof.previously_signed_repairs:null,
   outside_signed_authority:proof.created?proof.outside_signed_authority:null,
   scheduled_source_reviews:proof.created?proof.scheduled_source_reviews:null,
   unverified_capability_inquiries:proof.created?
    proof.unverified_capability_inquiries:null,
   shift_authorized:false,installation_authorized:false,
   production_changed:false
  });
 }catch(e){
  const code=/^OPERATIONAL_CHAT_[A-Z0-9_]+$/.test(e?.message||'')?
   e.message:'OPERATIONAL_CHAT_SOURCE_UNVERIFIED';
  console.warn('REALITY_OPERATIONAL_CHAT_DIGEST',code);
  return res.status(503).json({ok:false,error:code,
   shift_authorized:false,installation_authorized:false,
   production_changed:false});
 }
}
