// Signed-in read-only admission check for the exact controlled finale.
// No JSON input can authorize execution, mutate Continuity, or override scope.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from '../../src/reality-personal-goal-readback-v0.1.js';
import {loadAuthenticatedWarrantedUpgrade}
 from '../../src/reality-warranted-upgrade-candidate-loader-v0.1.js';
import {
 verifyControlledFinaleIndependentEvidence,
 CONTROLLED_FINALE_WORK,CONTROLLED_FINALE_SOURCE_SHA256,
} from '../../src/reality-controlled-finale-independent-admission-v0.1.js';

export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body||{};
  if(!b||typeof b!=='object'||Array.isArray(b)||
    Object.keys(b).sort().join(',')!=='conversation_id,intent'||
    b.intent!=='VERIFY_CONTROLLED_FINALE_READINESS'||
    !validUuid(b.conversation_id))
   return res.status(400).json({ok:false,error:'SCOPE_INVALID'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  // Independent evidence first; absolutely no owner write or permission here.
  const verified=await verifyControlledFinaleIndependentEvidence();
  if(verified.source_sha256!==CONTROLLED_FINALE_SOURCE_SHA256||
     verified.original_work_id!==CONTROLLED_FINALE_WORK)
   throw Error('FINALE_SOURCE_CHANGED');
  if(verified.state==='REVALIDATION_REQUIRED_BASE_MOVED')
   return res.status(200).json({
    ok:true,state:'REVALIDATION_REQUIRED_BASE_MOVED',
    original_work_id:CONTROLLED_FINALE_WORK,
    source_sha256:verified.source_sha256,
    previously_tested_pr_base_sha:verified.review_pr_base_sha,
    current_target_base_sha:verified.observed_base_sha,
    exact_model_source_unchanged:true,
    owner_admission_verified:false,owner_install_authorized:false,
    original_job_completed:false,
    explanation:'Target base changed since reviewed PR; a fresh exact-base verification is required before approval.',
   });
  const goal=await readFreshPersonalGoalState({
   session,conversationId:b.conversation_id,
  });
  if(goal?.principal_id!==session.user_id||
     goal?.conversation_id!==b.conversation_id||
     goal?.state?.active_goal?.status!=='ACTIVE'||
     goal.state.active_goal.user_confirmed!==true)
   return res.status(200).json({
    ok:true,state:'AWAITING_SIGNED_IN_ACTIVE_OWNER_GOAL',
    original_work_id:CONTROLLED_FINALE_WORK,
    source_sha256:verified.source_sha256,
    model_correction_verified:true,owner_admission_verified:false,
    owner_install_authorized:false,original_job_completed:false,
    explanation:'An authenticated confirmed active goal is required before owner scope can be admitted.',
   });
  let admitted=null;
  try{
   admitted=await loadAuthenticatedWarrantedUpgrade({
    session,conversationId:b.conversation_id,
    originalWorkId:CONTROLLED_FINALE_WORK,
   });
  }catch(error){
   // The existing loader fails closed if ANY required owner Continuity
   // checkpoint, sandbox receipt, or signed warrant is not persisted.
   const code=String(error?.message||'');
   if(!/^UPGRADE_LOADER_[A-Z0-9_]+$/.test(code))throw error;
  }
  if(admitted===null)
   return res.status(200).json({
    ok:true,state:'AWAITING_AUTHENTICATED_OWNER_CONTINUITY_ADMISSION',
    original_work_id:CONTROLLED_FINALE_WORK,
    source_sha256:verified.source_sha256,
    evidence_pr_number:verified.github_pr_number,
    independent_run_ids:verified.independent_run_ids,
    model_correction_verified:true,owner_admission_verified:false,
    owner_install_authorized:false,original_job_completed:false,
    explanation:'Signed owner-bound gap, independent sandbox receipt and warrant have not been re-observed.',
   });
  const files=admitted.verifiedExperiment?.verification_bundle?.synthesized_capability?.files;
  if(admitted.original_work_id!==CONTROLLED_FINALE_WORK||
     !Array.isArray(files)||files.length!==1||
     files[0].path!==verified.source_path||
     files[0].content!==verified.actual_model_source_bytes||
     admitted.evidence_warrant?.pinned_base_commit_sha!==verified.observed_base_sha)
   throw Error('FINALE_ADMITTED_SCOPE_DOES_NOT_MATCH_LIVE_CODE');
  return res.status(200).json({
   ok:true,state:'OWNER_WARRANT_VERIFIED_AWAITING_SEPARATE_EXACT_APPROVAL',
   original_work_id:CONTROLLED_FINALE_WORK,
   source_sha256:verified.source_sha256,
   evidence_pr_number:verified.github_pr_number,
   model_correction_verified:true,owner_admission_verified:true,
   warrant_id:admitted.evidence_warrant_id,
   owner_install_authorized:false,
   original_job_completed:false,
  });
 }catch(error){
  const code=String(error?.message||'');
  return res.status(503).json({
   ok:false,error:/^(FINALE|UPGRADE_LOADER)_[A-Z0-9_]+$/.test(code)?
    code:'FINALE_READINESS_UNAVAILABLE',
   owner_install_authorized:false,
   original_job_completed:false,
  });
 }
}
