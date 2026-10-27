// Exact-owner original repair evidence verification. All provider calls GET.
// No model calls, GitHub POST, deployment, upgrade authorization or settlement.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {inspectAuthenticatedOriginalWorkRepairEvidence}
 from '../../src/reality-recovery-evidence-gate-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')
   return res.status(405).setHeader('Allow','GET').json({
    ok:false,error:'READ_ONLY_GET_REQUIRED',external_action_performed:false,
   });
  const conversationId=req.query?.conversation_id;
  const workId=req.query?.work_id;
  if(!validUuid(conversationId)||!/^work:[a-f0-9]{32}$/.test(String(workId||'')))
   return res.status(400).json({
    ok:false,error:'ORIGINAL_WORK_SCOPE_INVALID',external_action_performed:false,
   });
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({
   ok:false,error:'CHAT_SIGN_IN_REQUIRED',external_action_performed:false,
  });
  const state=await inspectAuthenticatedOriginalWorkRepairEvidence({
   session,conversationId,workId,
  });
  return res.status(200).json({ok:true,...state,
   original_job_completed:false,execution_authorized:false,
   external_action_performed:false,
  });
 }catch{
  return res.status(503).json({
   ok:false,error:'RECOVERY_PROVIDER_OR_LEDGER_EVIDENCE_UNAVAILABLE',
   original_job_completed:false,external_action_performed:false,
  });
 }
}
