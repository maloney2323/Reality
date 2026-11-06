// Reality knows itself through owner-scoped evidence, not model assertion.
// This endpoint is diagnostic-only, never a shift/job/install action.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {buildRealityEvidenceGroundedSelfAudit}
 from '../../src/reality-evidence-grounded-self-audit-v1.js';
export const maxDuration=35;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'REALITY_SELF_AUDIT_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,
   error:'REALITY_SELF_AUDIT_CLIENT_SCOPE_NOT_ACCEPTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'REALITY_SELF_AUDIT_OWNER_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'REALITY_SELF_AUDIT_ISOLATED_PREVIEW_ONLY'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,
    error:'REALITY_SELF_AUDIT_OWNER_PROJECT_MISMATCH'});
  const [shifts,loop]=await Promise.all([
   shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id})
  ]);
  const audit=buildRealityEvidenceGroundedSelfAudit({
   shiftReadback:assertShiftReadback(shifts),
   ownerLoopReadback:loop,sourceVerifiedAt:new Date().toISOString()});
  return res.status(200).json({ok:true,read_only:true,
   owner_scope_verified:true,execution_authorized_by_read:false,...audit});
 }catch(error){
  console.warn('REALITY_SELF_AUDIT','READBACK_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'REALITY_SELF_AUDIT_READBACK_UNAVAILABLE',
   installation_authorized:false,production_changed:false,
   full_shift_automation_proven:false});
 }
}
