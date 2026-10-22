import {processStandaloneChat} from '../../src/reality-standalone-chat-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Allow','POST');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 try{
  const result=await processStandaloneChat(req);
  return res.status(200).json(result);
 }catch(e){
  const allowed=new Set([400,401,403,409,503]);
  const status=allowed.has(e?.status)?e.status:500;
  return res.status(status).json({ok:false,
   error:status===500?'STANDALONE_CHAT_INTERNAL_ERROR':e.message,
   execution:'NOT_EXECUTED'});
 }
}
