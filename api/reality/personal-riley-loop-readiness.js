// Signed-in owner readback of Riley's REAL full-loop admission gate.
// Does not create a shift, authorize a job, request a wake or install code.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {identifyExactRileyOriginalCandidates,renderRileyLoopReadiness}
 from '../../src/reality-riley-live-loop-readiness-v1.js';
export const maxDuration=40;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'RILEY_PROOF_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'RILEY_PROOF_SCOPE_QUERY_DENIED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'RILEY_PROOF_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'RILEY_PROOF_PREVIEW_ONLY'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'RILEY_PROOF_OWNER_PROJECT_MISMATCH'});
  const [shifts,loop]=await Promise.all([
   shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id})
  ]);
  const valid=assertShiftReadback(shifts);
  const {active_shifts,candidates}=identifyExactRileyOriginalCandidates({
   shiftReadback:valid,loop});
  let verified=[];
  if(candidates.length===1){
   const c=candidates[0];
   verified=[await shiftRpc(db,'reality_read_shift_capability_wake_v1',{
    p_shift_id:c.shift_id,p_original_work_id:c.original_work_id,
    p_trigger_id:c.trigger_id})];
  }
  const proof=renderRileyLoopReadiness({
   activeShiftCount:active_shifts,candidates,verified
  });
  return res.status(200).json({ok:true,owner_scope_verified:true,
   read_only:true,worker_execution_authorized_by_read:false,...proof});
 }catch(e){
  console.warn('RILEY_FULL_LOOP_READINESS','PROVIDER_OR_SCOPE_UNVERIFIED');
  return res.status(503).json({ok:false,
   error:'RILEY_FULL_LOOP_READBACK_UNAVAILABLE',
   original_job_completed:false,installation_authorized:false,
   production_changed:false});
 }
}
