// Recovery readback/checkpoint for an ALREADY verified external tracking
// outcome. Does not discover new work, authorize code changes, run a model,
// retry the original issue creation, or grant connector permissions.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {inspectPersonalRecoveryCheckpoint,persistPersonalRecoveryCheckpoint}
 from '../../src/reality-personal-recovery-checkpoint-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST')
    .json({ok:false,error:'METHOD_NOT_ALLOWED',external_action_performed:false});
  let conversationId,workId;
  if(req.method==='POST'){
   if(!req.headers?.origin)
    throw Object.assign(Error('RECOVERY_SAME_ORIGIN_REQUIRED'),{status:403});
   assertSameOrigin(req);
   if(!String(req.headers?.['content-type']||'').includes('application/json'))
    throw Object.assign(Error('RECOVERY_JSON_REQUIRED'),{status:415});
   const body=req.body||{};
   if(Object.keys(body).some(k=>!['intent','conversation_id','work_id'].includes(k))||
      body.intent!=='CHECKPOINT')
    throw Object.assign(Error('RECOVERY_CLIENT_AUTHORITY_OR_WORK_PAYLOAD_REJECTED'),{status:400});
   conversationId=body.conversation_id;
   workId=body.work_id;
  }else{
   conversationId=req.query?.conversation_id;
   workId=req.query?.work_id;
  }
  if(!validUuid(conversationId)||!/^work:[a-f0-9]{32}$/.test(String(workId||'')))
   throw Object.assign(Error('RECOVERY_ORIGINAL_SCOPE_INVALID'),{status:400});
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED',
    external_action_performed:false});
  const input={session,conversationId,workId};
  const recovery=req.method==='POST'?
   await persistPersonalRecoveryCheckpoint(input):
   await inspectPersonalRecoveryCheckpoint(input);
  return res.status(200).json({ok:true,...recovery,
   execution_authorized:false,external_action_performed:false,
   job_completed:false,
  });
 }catch(e){
  const raw=String(e?.message||'');
  const db=/UNIVERSE_POSTGRES_HTTP_|RECOVERY_ISOLATED_DATABASE_|PERSISTENCE|CONTINUITY/.test(raw);
  const status=e.status||503;
  return res.status(status).json({ok:false,
   error:db?'RECOVERY_CONTINUITY_READBACK_UNAVAILABLE':
    status===503?'RECOVERY_SOURCE_OR_GOAL_UNVERIFIED':raw,
   execution_authorized:false,external_action_performed:false,
   job_completed:false,
  });
 }
}
