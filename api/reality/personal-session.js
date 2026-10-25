import {privateChatConfig,authenticatedChatSession,loginChat,logoutChat,assertSameOrigin} from '../../src/reality-private-chat-auth-v0.1.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET'){
   const session=await authenticatedChatSession(req,res);
   return res.status(200).json({authenticated:Boolean(session)});
  }
  if(req.method==='POST'){
   if(!String(req.headers?.['content-type']||'').includes('application/json'))
    return res.status(415).json({error:'JSON_REQUIRED'});
   const result=await loginChat(req,res);
   return res.status(200).json(result);
  }
  if(req.method==='DELETE'){
   assertSameOrigin(req);
   const result=await logoutChat(req,res);
   return res.status(200).json(result);
  }
  return res.status(405).setHeader('Allow','GET, POST, DELETE, OPTIONS').json({error:'METHOD_NOT_ALLOWED'});
 }catch(e){return res.status(e.status||503).json({error:e.message||'CHAT_SESSION_UNAVAILABLE'})}
}
