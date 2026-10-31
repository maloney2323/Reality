// Service-side continuation of ONE previously owner-authorized job #178.
// The database grants a short-lived, single-use delegation for EXACT original
// work and confirms the immutable seven-failure checkpoint BEFORE model work.
// No browser cookie, arbitrary job selection, new work or installation approval.
import {privateChatConfig} from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {rpc} from '../../src/reality-personal-first-upgrade-178-v0.1.js';
import {runFirst178SingleAction} from '../../src/reality-first178-single-action-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';

export const maxDuration=300;
const EXACT_WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const EXACT_BRANCH='feature/first178-live-single-claim-execution-20261029';
const fail=(reason,status=503)=>{throw Object.assign(
 Error('FIRST178_BACKGROUND_'+reason),{status})};

export async function runOriginal178DelegatedWorker({
 nonce,env=process.env,configReader=privateChatConfig,
 dbReader=resolveReliabilityBenchmarkDb,
 consume=rpc,execute=runFirst178SingleAction,
}={}){
 // This delegation NEVER creates new work or a login identity.
 // It is valid only for the original owner/goal/queue independently
 // verified by the exact service-role database reservation.
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==EXACT_BRANCH||
  !/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  fail('ISOLATED_PREVIEW_REQUIRED',403);
 if(!/^[a-f0-9]{64}$/.test(String(nonce||'')))
  fail('ONE_TIME_NONCE_REQUIRED',403);
 const cfg=configReader(env),db=dbReader(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==cfg.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('ISOLATED_DATABASE_MISMATCH');
 const proof=await consume(db,'reality_consume_first178_background_handoff_v1',
  {p_nonce:nonce});
 if(proof?.verified!==true||
    proof.delegation!=='EXISTING_OWNER_AUTHORIZED_ORIGINAL_JOB'||
    !validUuid(proof.owner_id)||!validUuid(proof.conversation_id)||
    !validUuid(proof.queue_id)||!validUuid(proof.checkpoint_receipt_id)||
    proof.original_work_id!==EXACT_WORK||
    proof.installation_authorized!==false||
    proof.production_changed!==false)
  fail('INDEPENDENT_ONCE_ONLY_DELEGATION_REJECTED');
 // This limited service principal is derived ONLY from the consumed
 // persisted owner authorization. The existing runner reconstructs
 // and re-verifies the authoritative user goal, provider gap and original
 // queue from the database before it touches an isolated sandbox.
 const delegated=Object.freeze({
  user_id:proof.owner_id,config:Object.freeze({url:cfg.url}),
  authorization_origin:'ONCE_ONLY_ORIGINAL_WORK_DELEGATION',
 });
 const result=await execute({
  session:delegated,conversationId:proof.conversation_id,env,
 });
 if(result?.original_work_id!==EXACT_WORK||
    result.installation_authorized!==false||
    result.capability_installed!==false||
    result.original_job_completed!==false||
    result.production_changed!==false)
  fail('DELEGATED_EXECUTION_RESULT_INVALID');
 return Object.freeze({...result,
  existing_work:true,same_original_owner_job:true,
  delegated_server_side:true,installation_authorized:false,
  capability_installed:false,original_job_completed:false,
  production_changed:false});
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){
  res.setHeader('Allow','POST');
  return res.status(405).json({ok:false,error:'FIRST178_BACKGROUND_POST_ONLY'});
 }
 try{
  // This endpoint must NEVER be a browser-sign-in or public owner control.
  // Its only credential is the random, short-lived, database-bound nonce
  // delivered over HTTPS by the trusted database networking worker.
  if(req.headers?.origin)fail('BROWSER_ORIGIN_NOT_ACCEPTED',403);
  if(!String(req.headers?.['content-type']||'').startsWith('application/json'))
   fail('JSON_BODY_REQUIRED',415);
  const body=req.body;
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).sort().join(',')!=='intent,nonce'||
     body.intent!=='RUN_EXISTING_OWNER_AUTHORIZED_FIRST178_ONCE')
   fail('EXACT_DELEGATION_REQUIRED',403);
  const result=await runOriginal178DelegatedWorker({nonce:body.nonce});
  return res.status(200).json({ok:true,...result});
 }catch(error){
  const msg=String(error?.message||'');
  const safe=/^FIRST178_(?:BACKGROUND|SINGLE_ACTION|EXECUTION)_[A-Z0-9_]{3,110}$/;
  return res.status(error?.status||503).json({ok:false,
   error:safe.test(msg)?msg:'FIRST178_BACKGROUND_OUTCOME_REQUIRES_RECONCILIATION',
   do_not_retry:true,installation_authorized:false,capability_installed:false,
   original_job_completed:false,production_changed:false});
 }
}
