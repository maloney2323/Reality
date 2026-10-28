// Signed-in and separately confirmed owner acceptance of existing source
// correction evidence. No GitHub issue writes, repair execution or settlement.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {recordAuthenticatedOwnerRepairAcceptance,SOURCE_CORRECTION_CONFIRMATION}
 from '../../src/reality-owner-repair-acceptance-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body||{};
  if(Object.keys(b).some(k=>!['conversation_id','work_id',
      'source_evidence_receipt_id','confirmation'].includes(k))||
     !validUuid(b.conversation_id)||
     b.work_id!=='work:24cda9611404e9bcb47909976067605c'||
     !validUuid(b.source_evidence_receipt_id)||
     b.confirmation!==SOURCE_CORRECTION_CONFIRMATION)
   return res.status(400).json({ok:false,error:'EXACT_REPAIR_ACCEPTANCE_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await recordAuthenticatedOwnerRepairAcceptance({
   session,conversationId:b.conversation_id,workId:b.work_id,
   sourceEvidenceReceiptId:b.source_evidence_receipt_id,
   confirmation:b.confirmation,
  });
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const raw=String(error?.message||'');
  return res.status(503).json({ok:false,
   error:/^OWNER_CORRECTION_[A-Z0-9_]{5,110}$/.test(raw)?
    raw:'OWNER_CORRECTION_CONTINUITY_UNAVAILABLE',
   original_job_completed:false,original_issue_closed:false,
   external_action_performed:false});
 }
}
