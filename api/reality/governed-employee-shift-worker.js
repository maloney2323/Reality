// Trusted server-to-server shift pulse. It reads authorized source steps,
// reconciles existing original-job receipts, and can request an idempotent wake
// for one already-authorized original job only after a separate service-role
// database readback. The existing capability worker independently claims work.
// This endpoint cannot admit new jobs, authorize installation, bypass owner
// approval, settle original work, or alter production operations.
import crypto from 'node:crypto';
import {shiftDatabase} from '../../src/reality-governed-shift-boundary-v1.js';
import {processGovernedEmployeeShiftTick}
 from '../../src/reality-governed-employee-shift-worker-v1.js';
import {createOneOpenAICombinedRoleCoordinator}
 from '../../src/reality-one-openai-combined-role-handoff-v1.js';
import {createRileyServiceOriginalRuntime}
 from '../../src/reality-riley-service-original-runtime-v1.js';
import {createRileyTrustedOriginalDriver}
 from '../../src/reality-riley-trusted-original-driver-bridge-v1.js';
import {runAuthorizedRileyPrReview}
 from '../../src/reality-riley-authorized-pr-review-job-v1.js';
export const maxDuration=60;
function validSecret(req,env){
 const secret=String(env.REALITY_EMPLOYEE_SHIFT_WORKER_TOKEN||'');
 const auth=String(req.headers?.authorization||'');
 if(!/^[a-f0-9]{64}$/.test(secret)||!auth.startsWith('Bearer '))return false;
 const token=auth.slice(7);
 return /^[a-f0-9]{64}$/.test(token)&&
  crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(token));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'SHIFT_WORKER_POST_ONLY'});
 if(process.env.VERCEL_ENV!=='preview'||!validSecret(req,process.env))
  return res.status(403).json({ok:false,error:'SHIFT_WORKER_AUTHORIZATION_REQUIRED',
   installation_authorized:false,production_changed:false});
 if(Object.keys(req.query||{}).length||
  (req.body&&(Object.getPrototypeOf(req.body)!==Object.prototype||
    Array.isArray(req.body)||Object.keys(req.body).length>0)))
  return res.status(400).json({ok:false,error:'SHIFT_WORKER_INPUT_FORBIDDEN'});
 try{
  const db=shiftDatabase(process.env);
  // The signed shift step is already a DB-fenced, owner-authorized read.
  // One shared model offers bounded read-only role context on that same step.
  // A missing API key leaves an explicit unavailable role advisory; source
  // inspection and final receipts remain independently governed.
  // Isolated-preview model credential is named REALITY_STANDALONE_OPENAI_API_KEY.
  // A production-only OPENAI_API_KEY must not be necessary for a preview worker.
  // No secret goes into browser output, role evidence or database receipts.
  const key=process.env.REALITY_STANDALONE_OPENAI_API_KEY||
   process.env.OPENAI_API_KEY;
  const coordinateRoleWork=typeof key==='string'&&key.length>=12?
   createOneOpenAICombinedRoleCoordinator({
    apiKey:key,model:process.env.REALITY_OPENAI_MODEL||'gpt-5.4'
   }):null;
  // An eligible step-six original enters Reality's EXISTING governed
  // source-backed executor only after service-role owner/goal readback and
  // independent provider preflight, before the global single-use DB claim.
  // The same worker token covers this already-authorized shift; no model,
  // browser or employee can mint new scope or installation approval.
  const originalAdapters=process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED==='true'?
   createRileyServiceOriginalRuntime({db,env:process.env}):null;
  const executeQualifiedOriginals=originalAdapters?
   createRileyTrustedOriginalDriver({
    db,loadShiftReadback:originalAdapters.loadShiftReadback,
    loadOwnerLedgerReadback:originalAdapters.loadOwnerLedgerReadback,
    loadTrustedAuthorizedOriginal:originalAdapters.loadTrustedAuthorizedOriginal,
    runOriginal:originalAdapters.runOriginal,
   }):null;
  const result=await processGovernedEmployeeShiftTick(db,{
   coordinateRoleWork,executeQualifiedOriginals
  });
  // Complete ONE source-backed assigned PR review as a REAL original job:
  // OpenAI authors the review, GitHub receives it, an independent provider
  // GET proves the exact effect, and the owner-scoped service ledger settles.
  // No installation or code repair is inferred from this kind of job.
  // Any uncertain GitHub write is fenced in the database and never re-POSTed.
  let rileyOriginalReview;
  try{
   rileyOriginalReview=await runAuthorizedRileyPrReview({db,env:process.env});
  }catch(e){
   const code=String(e?.message||'');
   rileyOriginalReview={
    status:/^RILEY_PR_REVIEW_[A-Z0-9_]{5,115}$/.test(code)?
     code:'RILEY_PR_REVIEW_PROVIDER_OR_RECEIPT_UNAVAILABLE',
    original_job_completed:false,installation_authorized:false,
    production_changed:false
   };
  }
  return res.status(200).json({...result,riley_original_review:rileyOriginalReview});
 }catch{
  return res.status(503).json({
   ok:false,error:'SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED',
   work_completed:false,installation_authorized:false,
   production_changed:false});
 }
}
