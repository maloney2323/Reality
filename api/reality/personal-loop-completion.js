// Read-only authoritative customer settlement projection.
// Never routes to an installer, enqueue, background lease, or claim.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readOriginalLoopCompletion}
 from '../../src/reality-original-loop-completion-proof-v1.0.js';
const WORK=/^work:[a-f0-9]{32}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET'){
   res.setHeader('Allow','GET');
   return res.status(405).json({ok:false,error:'LOOP_PROOF_GET_ONLY'});
  }
  if(Object.keys(req.query||{}).sort().join(',')!=='work_id'||
   !WORK.test(String(req.query.work_id||'')))
   return res.status(400).json({ok:false,error:'LOOP_PROOF_EXACT_WORK_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const result=await readOriginalLoopCompletion({
   session,originalWorkId:req.query.work_id,
  });
  if(result.loop_complete===true&&
   (result.status!=='LOOP_COMPLETE_VERIFIED'||
    result.independently_verified!==true||
    !/^supabase:universe_events:[a-f0-9-]{36}$/i.test(
     String(result.settlement_receipt_ref||''))))
   throw Error('LOOP_PROOF_INDEPENDENT_RECEIPT_REQUIRED');
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const code=String(error?.message||'');
  const safe=/^(?:LOOP_COMPLETION_|REAL_INSTALLED_WORK_|LOOP_PROOF_)[A-Z0-9_]{4,110}$/;
  return res.status(error?.status||503).json({
   ok:false,error:safe.test(code)?code:
    'LOOP_PROOF_TRUSTED_INDEPENDENT_READBACK_UNAVAILABLE',
   loop_complete:false,original_job_completed:false,
   production_changed:false,
  });
 }
}
