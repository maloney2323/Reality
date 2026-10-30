// The ONLY owner-facing installation action for original #178.
// GET = independently verified current state; POST = exact signed-in owner
// approval and continuous provider-backed completion. No source or credentials
// accepted from browser and no model/cron-origin owner approvals.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {original178OwnerApprovalView,runOriginal178OneApproval}
 from '../../src/reality-first178-live-owner-completion-v0.1.js';
export const maxDuration=300;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method)){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'FIRST178_OWNER_APPROVAL_METHOD_REJECTED'});
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(req.method==='GET'){
   if(Object.keys(req.query||{}).length)
    return res.status(400).json({ok:false,error:'FIRST178_OWNER_APPROVAL_NO_CLIENT_SCOPE'});
   const out=await original178OwnerApprovalView({session});
   return res.status(200).json({ok:true,...out});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'FIRST178_OWNER_ACTION_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'FIRST178_OWNER_ACTION_JSON_REQUIRED'});
  const data=req.body;
  if(!data||typeof data!=='object'||Array.isArray(data)||
     Object.keys(data).sort().join(',')!==
      'candidate_artifact_hash,checkpoint_hash,checkpoint_receipt_id,intent,original_work_id,owner_confirms_installation'||
     data.intent!=='APPROVE_EXACT_VERIFIED_178_UPGRADE_AND_FINISH'||
     data.owner_confirms_installation!==true)
   return res.status(403).json({ok:false,error:'FIRST178_EXACT_OWNER_APPROVAL_ACTION_REQUIRED'});
  const out=await runOriginal178OneApproval({
   session,ownerAction:data,
  });
  if(out.status!=='ORIGINAL_JOB_INDEPENDENTLY_SETTLED'||
     out.original_job_completed!==true||
     out.independently_verified!==true||out.production_changed!==false)
   return res.status(503).json({ok:false,error:'FIRST178_FINAL_PROVIDER_RESULT_NOT_SETTLED',
    original_job_completed:false,do_not_retry:true});
  return res.status(200).json({ok:true,...out});
 }catch(e){
  const msg=String(e?.message||'');
  const safe=/^(?:FIRST178_|FIRST_178_CONTINUITY_|SELF_IMPROVEMENT_|FOUNDATION_)[A-Z0-9_]{5,125}$/;
  return res.status(e?.status||503).json({ok:false,
   error:safe.test(msg)?msg:'FIRST178_OUTCOME_REQUIRES_READ_ONLY_RECONCILIATION',
   do_not_retry:true,owner_approval_not_inferred:true,
   original_job_completed:false,production_changed:false});
 }
}
