// Authenticated preview-only, read-only owner registry and original-job readiness.
// Never treats an installed module import as activation or final settlement.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_REPAIR_WORK,prepareOriginalMaintenanceRepair}
 from '../../src/reality-extensions/reality-original-maintenance-executor.mjs';
import {ORIGINAL_WORK,inspectAuthenticatedOriginalCapabilityReadiness}
 from '../../src/reality-original-upgrade-readback-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')
   return res.status(405).json({ok:false,error:'READ_ONLY_GET_REQUIRED'});
  const conversationId=req.query?.conversation_id;
  const workId=req.query?.work_id;
  if(!validUuid(conversationId)||workId!==ORIGINAL_WORK)
   return res.status(400).json({ok:false,error:'ORIGINAL_WORK_SCOPE_INVALID'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(ORIGINAL_REPAIR_WORK!==ORIGINAL_WORK||
     typeof prepareOriginalMaintenanceRepair!=='function')
   throw Error('ORIGINAL_EXECUTOR_IMPORT_NOT_PRESENT');
  const state=await inspectAuthenticatedOriginalCapabilityReadiness({
   session,conversationId,workId,
  });
  return res.status(200).json({ok:true,...state});
 }catch(e){
  const raw=String(e?.message||'');
  return res.status(503).json({ok:false,
   error:/^ORIGINAL_UPGRADE_[A-Z0-9_]+$/.test(raw)?raw:
    'ORIGINAL_UPGRADE_INDEPENDENT_READBACK_UNAVAILABLE',
   owner_capability_registry_registered:false,
   original_job_final_settlement_persisted:false,
   completion_not_proven:true,external_action_performed:false});
 }
}
