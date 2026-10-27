// Legacy generic authority writes cannot establish authenticated, source-
// proven, exact-work user approval. Do not persist new connector scopes from
// a signed generic cookie or browser JSON; they could be replayed or mistaken
// for the separate goal-bound authorization required by Reality's new engine.
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { getAuthorityPolicy } from '../../src/reality-authority-v1.0.js';

export default async function handler(req,res){
 if(!['GET','POST'].includes(req.method))
  return res.status(405).setHeader('Allow','GET, POST').json({
   ok:false,error:'METHOD_NOT_ALLOWED',
  });
 res.setHeader('Cache-Control','no-store');
 if(req.method==='POST')
  return res.status(403).json({
   ok:false,status:'BLOCKED',
   error:'LEGACY_AUTHORITY_POLICY_WRITE_DISABLED',
   blocked_reason:'AUTHENTICATED_GOAL_BOUND_EXACT_WORK_USER_APPROVAL_REQUIRED',
   authority_created:false,external_action_performed:false,
  });
 try{
  const principal=getOrCreateSessionPrincipal(req,res);
  return res.status(200).json({
   ok:true,authority:await getAuthorityPolicy(principal.principal_id),
   legacy_write_enabled:false,
  });
 }catch(error){
  return res.status(error.status||503).json({ok:false,error:error.message});
 }
}
