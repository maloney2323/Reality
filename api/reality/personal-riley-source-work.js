// Owner-scoped read-only Riley source inventory, independent of shifts.
// This is a preview status endpoint, never authorization, execution, or ROI.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {readRileySourceWorkSnapshot}
 from '../../src/reality-employee-shift-chat-context-v1.js';
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'RILEY_SOURCE_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'RILEY_SOURCE_CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'RILEY_SOURCE_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'RILEY_SOURCE_PROJECT_SCOPE_MISMATCH'});
  const source=await readRileySourceWorkSnapshot({session,db});
  return res.status(200).json({
   ok:true,...source,owner_scope_verified:true,
   job_started_by_read:false,
   shift_started_by_read:false,installation_authorized:false,
   production_changed:false
  });
 }catch(e){
  console.warn('RILEY_SOURCE_READ_ONLY',
   /^RILEY_SOURCE_[A-Z0-9_]+$/.test(e?.message||'')?
    e.message:'SOURCE_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'RILEY_SOURCE_BACKLOG_READBACK_UNAVAILABLE_NOT_NO_WORK',
   job_started_by_read:false,shift_started_by_read:false,
   installation_authorized:false,production_changed:false});
 }
}
