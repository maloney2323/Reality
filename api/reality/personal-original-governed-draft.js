// Signed-in owner entrypoint for the ORIGINAL governed draft PR.
// PREPARE: no mutation. DISPATCH: already approved action, single-use
// database reservation and independent verification; no install/merge.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {ORIGINAL_OWNER_WORK_ID}
 from '../../src/reality-original-owner-console-v0.1.js';
import {prepareOriginalGovernedDraft}
 from '../../src/reality-original-governed-draft-prepare-v0.1.js';
import {dispatchAuthenticatedGovernedUpgradeDraft}
 from '../../src/reality-governed-upgrade-execution-dispatch-v0.1.js';
export const maxDuration=60;
const HASH='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';
const validBody=(body,keys)=>Boolean(body&&typeof body==='object'&&
 !Array.isArray(body)&&Object.keys(body).sort().join(',')===keys.slice().sort().join(','));
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'POST_REQUIRED'});
  if(!req.headers?.origin)return res.status(403).json({ok:false,error:'ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').toLowerCase().includes('application/json'))
   return res.status(415).json({ok:false,error:'JSON_REQUIRED'});
  const b=req.body;
  if(!validUuid(b?.conversation_id)||b?.original_work_id!==ORIGINAL_OWNER_WORK_ID)
   return res.status(400).json({ok:false,error:'EXACT_ORIGINAL_JOB_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(validBody(b,['intent','conversation_id','original_work_id'])&&
     b.intent==='PREPARE_EXACT_GOVERNED_DRAFT'){
   const result=await prepareOriginalGovernedDraft({
    session,conversationId:b.conversation_id,originalWorkId:b.original_work_id,
   });
   return res.status(200).json({ok:true,...result});
  }
  if(validBody(b,['intent','conversation_id','original_work_id','expected_candidate_hash','grounding_proof','execution_confirmation'])&&
     b.intent==='DISPATCH_ONE_OWNER_APPROVED_GOVERNED_DRAFT'&&
     b.expected_candidate_hash===HASH&&
     b.execution_confirmation==='EXECUTE_ONE_EXACT_VERIFIED_UPGRADE_DRAFT_PR'){
   const result=await dispatchAuthenticatedGovernedUpgradeDraft({
    session,conversationId:b.conversation_id,originalWorkId:b.original_work_id,
    expectedCandidateHash:HASH,
    groundingProof:b.grounding_proof,
    executionConfirmation:b.execution_confirmation,
   });
   if(result?.original_work_id!==ORIGINAL_OWNER_WORK_ID||
      result?.original_job_completed!==false)
    throw Error('ORIGINAL_DRAFT_RESULT_SCOPE_INVALID');
   return res.status(200).json({ok:true,...result});
  }
  return res.status(400).json({ok:false,error:'EXACT_DRAFT_PREPARE_OR_DISPATCH_REQUIRED'});
 }catch(error){
  const raw=String(error?.message||'');
  const safe=/^(?:UPGRADE_|ORIGINAL_DRAFT_|GOAL_|PERSONAL_|AUTONOMOUS_UPGRADE_)[A-Z0-9_]+$/.test(raw)?
   raw:'ORIGINAL_DRAFT_UNAVAILABLE_OR_UNVERIFIED';
  return res.status(503).json({ok:false,error:safe,
   original_job_completed:false,installation_authorized:false,
   no_automatic_provider_retry:true});
 }
}
