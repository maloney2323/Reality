// Explicit, signed-in owner admission of a pinned REAL historical pilot proof.
// This route never accepts candidate bytes, model claims, external artifact
// URLs, a customer work ID, a warrant, or execution/promotion authority.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {persistAuthenticatedHistoricalPilotProof}
 from '../../src/reality-historical-upgrade-proof-intake-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'HISTORICAL_PROOF_EXPLICIT_POST_REQUIRED',
   github_write_authorized:false,original_job_completed:false});
  if(!req.headers?.origin)return res.status(403).json({
   ok:false,error:'HISTORICAL_PROOF_SAME_ORIGIN_REQUIRED',
   github_write_authorized:false,original_job_completed:false});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'HISTORICAL_PROOF_JSON_REQUIRED'});
  const body=req.body||{};
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).sort().join(',')!=='conversation_id,intent'||
     body.intent!=='IMPORT_VERIFIED_HISTORICAL_PILOT_PROOF'||
     !validUuid(body.conversation_id))
   return res.status(400).json({ok:false,
    error:'HISTORICAL_PROOF_UNTRUSTED_CLIENT_INPUT',
    github_write_authorized:false,original_job_completed:false});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,
   error:'CHAT_SIGN_IN_REQUIRED',
   github_write_authorized:false,original_job_completed:false});
  const observed=await persistAuthenticatedHistoricalPilotProof({
   session,conversationId:body.conversation_id});
  return res.status(200).json({ok:true,...observed,
   execution_authorized:false,github_write_authorized:false,
   promotion_authorized:false,original_job_completed:false});
 }catch(error){
  const code=String(error?.message||'');
  const safe=/^UPGRADE_IMPORT_[A-Z0-9_]{5,100}$/.test(code)?
   code:'HISTORICAL_PROOF_READBACK_UNAVAILABLE';
  return res.status(error?.status||503).json({ok:false,
   error:safe,github_write_authorized:false,promotion_authorized:false,
   original_job_completed:false});
 }
}
