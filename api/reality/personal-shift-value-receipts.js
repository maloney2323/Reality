// Current signed-in owner's independently settled shift-job receipts +
// source-labelled economic accountability. Read-only; never starts or settles.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {readOwnerShiftFinalValueReceipts}
 from '../../src/reality-owner-shift-final-value-readback-v1.js';
export const maxDuration=35;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'SHIFT_VALUE_RECEIPTS_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'SHIFT_VALUE_QUERY_NOT_ALLOWED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'SHIFT_VALUE_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  const evidence=await readOwnerShiftFinalValueReceipts({session,db});
  return res.status(200).json({ok:true,...evidence});
 }catch{
  return res.status(503).json({ok:false,
   error:'SHIFT_VALUE_INDEPENDENT_READBACK_UNAVAILABLE',
   financial_roi_verified:false,
   installation_authorized:false,production_changed:false});
 }
}
