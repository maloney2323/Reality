// Trusted server-to-server shift pulse. It reads authorized source steps,
// reconciles existing original-job receipts, and can request an idempotent wake
// for one already-authorized original job only after a separate service-role
// database readback. The existing capability worker independently claims work.
// This endpoint cannot admit new jobs, authorize installation, bypass owner
// approval, settle original work, or alter production operations.
import crypto from 'node:crypto';
import {shiftDatabase,shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
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
import {reconcileOwnerShiftFailureTriage143}
 from '../../src/reality-riley-failure-triage-reconciler-v1.js';
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
  // Admit the ACTUAL source-backed existing-code repair only from the
  // CURRENT signed owner shift and frozen verified issue #263 source proof.
  // Admission creates a durable original ID, NOT a fix or installation.
  let rileyCodeRepair;
  try{
   const ticket=await shiftRpc(db,'reality_admit_exact_riley_263_repair_v1',{});
   if(!['NO_OWNER_AUTHORIZED_263_SOURCE_TO_ADMIT',
     'EXACT_OWNER_SHIFT_REPAIR_SOURCE_ADMITTED',
     'ALREADY_SETTLED_NO_REPLAY'].includes(ticket?.status)||
     ticket.installation_authorized!==false||
     ticket.production_changed!==false||
     (ticket.status==='EXACT_OWNER_SHIFT_REPAIR_SOURCE_ADMITTED'&&(
       !/^work:[a-f0-9]{32}$/.test(ticket.original_work_id||'')||
       !/^sha256:[a-f0-9]{64}$/.test(ticket.source_proof_sha256||'')||
       !['SOURCE_ADMITTED','CANDIDATE_TESTING',
        'CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL','BLOCKED'].includes(ticket.phase)
     )))throw Error('RILEY_REPAIR_EXACT_OWNER_SOURCE_READBACK_INVALID');
   rileyCodeRepair={...ticket,
    original_job_completed:ticket.status==='ALREADY_SETTLED_NO_REPLAY',
    installation_authorized:false,production_changed:false};
  }catch(e){
   const c=String(e?.message||'');
   rileyCodeRepair={status:/^RILEY_REPAIR_[A-Z0-9_]{5,100}$/.test(c)?
    c:'RILEY_REPAIR_SOURCE_ADMISSION_UNVERIFIED',
    original_job_completed:false,installation_authorized:false,
    production_changed:false};
  }
  // This is a different original work item already signed under the
  // SAME shift. It can complete even while the code-repair candidate is
  // still running. No historical defect is declared fixed without evidence.
  let rileyFailureTriage;
  try{
   rileyFailureTriage=await reconcileOwnerShiftFailureTriage143({
    db,fetchImpl:fetch
   });
  }catch(e){
   const code=String(e?.message||'');
   rileyFailureTriage={
    status:/^RILEY_SHIFT_TRIAGE_[A-Z0-9_]{4,115}$/.test(code)?
     code:'RILEY_SHIFT_TRIAGE_CURRENT_PROVIDER_READBACK_UNAVAILABLE',
    original_job_completed:false,code_repair_completed:false,
    installation_authorized:false,production_changed:false
   };
  }
  return res.status(200).json({...result,
    riley_original_review:rileyOriginalReview,
    riley_code_repair_original:rileyCodeRepair,
    riley_failure_triage_original:rileyFailureTriage});
 }catch{
  return res.status(503).json({
   ok:false,error:'SHIFT_WORKER_PROVIDER_OR_DATABASE_UNVERIFIED',
   work_completed:false,installation_authorized:false,
   production_changed:false});
 }
}
