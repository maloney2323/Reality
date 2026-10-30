// Phase 1: server-only dispatch of the existing owner-authorized #178 job.
// This file is an AUTHENTICATED ingress, never an authority source.
// The same Vercel function mints and consumes the single-use database
// delegation; no self-HTTP call through protected Vercel preview is needed.
import {timingSafeEqual} from 'node:crypto';
import {privateChatConfig} from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {rpc} from '../../src/reality-personal-first-upgrade-178-v0.1.js';
import {runOriginal178DelegatedWorker}
 from './personal-first-upgrade-178-background.js';

export const maxDuration=300;
const WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const BRANCH='feature/first178-live-single-claim-execution-20261029';
const bad=(code,status=403)=>{throw Object.assign(
 Error('FIRST178_DISPATCH_'+code),{status})};

export function verifyFirst178DispatchAuthorization({
 method,headers={},env=process.env,
}={}){
 if(!['GET','POST'].includes(method))bad('METHOD_NOT_PERMITTED',405);
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==BRANCH||
    !/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  bad('EXACT_ISOLATED_PREVIEW_REQUIRED');
 if(headers.origin||headers.cookie||headers['x-forwarded-user'])
  bad('NO_BROWSER_OR_SESSION_AUTH');
 const supplied=String(headers.authorization||'');
 // GET is only for a Vercel CRON_SECRET authenticated cron request.
 // POST is only for a dedicated server-to-server dispatcher secret.
 // Production cron cannot run a preview worker: this route explicitly
 // denies all production invocations.
 const secret=method==='GET'?env.CRON_SECRET:
   env.REALITY_FIRST178_DISPATCH_SECRET;
 if(typeof secret!=='string'||secret.length<32||
    !supplied.startsWith('Bearer ')||supplied.length!==secret.length+7)
  bad('SERVICE_DISPATCH_SECRET_REQUIRED');
 const a=Buffer.from(supplied.slice(7));
 const b=Buffer.from(secret);
 if(a.length!==b.length||!timingSafeEqual(a,b))
  bad('INVALID_SERVICE_DISPATCH_SECRET');
 return true;
}

export async function dispatchFirst178ApprovedOriginal({
 env=process.env,configReader=privateChatConfig,
 dbReader=resolveReliabilityBenchmarkDb,call=rpc,
 worker=runOriginal178DelegatedWorker,
}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==BRANCH||
  !/^[a-f0-9]{40}$/.test(String(env.VERCEL_GIT_COMMIT_SHA||'')))
  bad('EXACT_ISOLATED_PREVIEW_REQUIRED');
 const config=configReader(env),db=dbReader(env);
 if(!db?.strictSecrets||!db.secretKey||!config?.url||
    db.url!==config.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  bad('SCOPED_SERVICE_DATABASE_REQUIRED',503);
 const grant=await call(db,'reality_mint_first178_background_handoff_v1',{});
 if(grant?.minted_once!==true||
    grant.original_work_id!==WORK||
    !/^[a-f0-9]{64}$/.test(String(grant.nonce||''))||
    !/^[0-9a-f-]{36}$/i.test(String(grant.queue_id||''))||
    !/^[0-9a-f-]{36}$/i.test(String(grant.checkpoint_receipt_id||''))||
    grant.installation_authorized!==false)
  bad('DATABASE_ONE_SHOT_DISPATCH_NOT_VERIFIED',503);
 // Calls existing worker DIRECTLY. Do not transmit nonce over HTTP,
 // store it in logs, or put it into owner/client response.
 const result=await worker({nonce:grant.nonce,env});
 if(result?.original_work_id!==WORK||
    result?.installation_authorized!==false||
    result?.capability_installed!==false||
    result?.original_job_completed!==false||
    result?.production_changed!==false)
  bad('ORIGINAL_JOB_WORKER_RESULT_UNVERIFIED',503);
 return Object.freeze({
  status:result.status,original_work_id:WORK,
  queue_id:grant.queue_id,checkpoint_receipt_id:result.checkpoint_receipt_id||null,
  owner_approval_required:result.owner_approval_required===true,
  installed:false,original_job_completed:false,production_changed:false,
  verified_server_dispatch:true,
 });
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  verifyFirst178DispatchAuthorization({
   method:req.method,headers:req.headers,env:process.env,
  });
  if(req.method==='POST'&&
     (req.body==null||typeof req.body!=='object'||Array.isArray(req.body)||
      Object.keys(req.body).length!==0))
   bad('NO_CLIENT_WORK_OR_APPROVAL_FIELDS');
  if(req.method==='GET'&&Object.keys(req.query||{}).length)
   bad('NO_CLIENT_SCOPE');
  const outcome=await dispatchFirst178ApprovedOriginal();
  return res.status(200).json({ok:true,...outcome});
 }catch(err){
  const message=String(err?.message||'');
  const safe=/^FIRST178_DISPATCH_[A-Z0-9_]+$/.test(message)?
    message:'FIRST178_DISPATCH_RECONCILIATION_REQUIRED';
  return res.status(err?.status||503).json({
   ok:false,error:safe,do_not_retry:true,
   installation_authorized:false,original_job_completed:false,
  });
 }
}
