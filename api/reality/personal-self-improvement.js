// Owner-authenticated, Continuity-backed self-improvement orientation.
// This is an observational gateway, NOT a code generator or execution route.
// It lets Reality discover its OWN existing unfinished work from signed-in
// chat conversations without requiring the user to type the work ID.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {inspectAuthenticatedSelfImprovement}
 from '../../src/reality-personal-governed-self-improvement-v0.1.js';
import {diagnoseOriginal178Self}
 from '../../src/reality-first178-self-diagnosis-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')
   return res.status(405).setHeader('Allow','GET').json({
    ok:false,error:'SELF_IMPROVEMENT_READ_ONLY_GET_REQUIRED',
    execution_authorized:false,
   });
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED',
    execution_authorized:false});
  if(Object.keys(req.query||{}).length!==0)
   return res.status(400).json({ok:false,
    error:'SELF_IMPROVEMENT_CLIENT_SCOPE_NOT_ACCEPTED',
    execution_authorized:false});
  const status=await inspectAuthenticatedSelfImprovement({session});
  // Reuse the SAME owner-scoped constitutional repair finding in the
  // Personal Self-Improvement surface. A failed optional diagnostic never
  // fabricates a new job, or hides the separate original work result.
  let originalRepair=null;
  try{
   const observed=await diagnoseOriginal178Self({session});
   if(observed?.read_only===true&&
      observed?.original_work_id==='work:9b9578b3c65427589c4c6da68fe0fc87'&&
      observed?.self_repair_strategy?.discovery_status==='SOURCE_VERIFIED_REPAIR_DISCOVERY'){
    originalRepair={
     original_work_id:observed.original_work_id,
     repair_status:observed.status,
     strategy:observed.self_repair_strategy.strategy,
     category:observed.self_repair_strategy.discovered_work?.category,
     evidence_refs:observed.self_repair_strategy.evidence_refs,
     existing_work_only:true,
     execution_authorized:false,
     installation_authorized:false,
     original_job_completed:false,
    };
   }
  }catch{/* Other jobs still render; no claim of verified #178 repair. */}
  return res.status(200).json({
   ok:true,...status,
   verified_self_repair_opportunity:originalRepair,
   execution_authorized:false,owner_approval_granted:false,
   self_upgrade_executed:false,production_changed:false,
  });
 }catch(error){
  const code=String(error?.message||'');
  const allowed=/^(SELF_IMPROVEMENT_|UNFINISHED_)[A-Z0-9_]{4,110}$/;
  // No raw PostgREST, provider, password, or model error text is returned.
  return res.status(error?.status||503).json({
   ok:false,error:allowed.test(code)?code:'SELF_IMPROVEMENT_READBACK_UNAVAILABLE',
   execution_authorized:false,
   original_job_completed:false,
  });
 }
}
