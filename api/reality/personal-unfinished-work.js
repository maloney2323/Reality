// Authenticated personal Unfinished Work queue over existing Continuity.
// READ ONLY, across this owner's verified RLS chat conversations.
// Never infer authorization from a recovered goal or a tracking issue.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {listAuthenticatedUnfinishedWork}
 from '../../src/reality-personal-unfinished-work-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')
   return res.status(405).setHeader('Allow','GET').json({
    ok:false,error:'READ_ONLY_GET_REQUIRED',external_action_performed:false,
   });
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED',
    external_action_performed:false});
  const result=await listAuthenticatedUnfinishedWork({session});
  return res.status(200).json({ok:true,...result,
   execution_authorized:false,external_action_performed:false});
 }catch{
  return res.status(503).json({ok:false,
   error:'UNFINISHED_WORK_READBACK_UNAVAILABLE',
   coverage_unverified:true,external_action_performed:false,
  });
 }
}
