// ONE signed-in Riley full-shift start authorizes only the exact source
// URLs inside its previously approved fingerprint. Multiple ORIGINAL
// investigations may be admitted automatically; installation approval
// remains artifact-specific in existing Reality Chat.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {fetchCatalogGitHub}
 from '../../src/reality-work-catalog-v0.1.js';
import {verifyRealMissingRepairIssue,authorizeExistingRealRepairWork}
 from '../../src/reality-real-repair-opportunity-intake-v1.0.js';
import {queueVerifiedOriginalRepair}
 from '../../src/reality-original-repair-worker-handoff-v1.0.js';
import {selectRileyFullShiftOriginals}
 from '../../src/reality-riley-full-shift-batch-intake-v1.js';
export const maxDuration=120;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'RILEY_FULL_SHIFT_POST_ONLY'});
 if(!req.headers?.origin)return res.status(403).json({
  ok:false,error:'RILEY_FULL_SHIFT_SAME_ORIGIN_REQUIRED'});
 try{
  privateChatConfig();
  assertSameOrigin(req);
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'RILEY_FULL_SHIFT_PREVIEW_ONLY'});
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'RILEY_FULL_SHIFT_JSON_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'RILEY_FULL_SHIFT_QUERY_DENIED'});
  const data=req.body;
  if(!data||typeof data!=='object'||Array.isArray(data)||
   Object.keys(data).sort().join(',')!==
    'action,conversation_id,expected_fingerprint,shift_id'||
   data.action!=='ADMIT_QUALIFIED_WORK_IN_EXACT_AUTHORIZED_RILEY_SHIFT'||
   !UUID.test(data.conversation_id||'')||
   !UUID.test(data.shift_id||'')||
   !SHA.test(data.expected_fingerprint||''))
   return res.status(400).json({ok:false,error:'RILEY_FULL_SHIFT_EXACT_SCOPE_REQUIRED'});
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'RILEY_FULL_SHIFT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'RILEY_FULL_SHIFT_OWNER_PROJECT_CHANGED'});
  const [shiftReadback,ownerLoopReadback,issues]=await Promise.all([
   shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id}),
   fetchCatalogGitHub('issues')
  ]);
  const checked=assertShiftReadback(shiftReadback);
  const matching=checked.shifts.filter(s=>s.shift_id===data.shift_id&&
   s.plan_fingerprint===data.expected_fingerprint);
  if(matching.length!==1||
   !['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(matching[0].status))
   throw Error('SHIFT_NOT_OWNER_APPROVED_FOR_THIS_EXACT_SOURCE');
  // No nominations from a model or browser. Source candidates are
  // reconstructed from signed-in shift and independently rechecked GitHub.
  const allowed=new Set(matching[0].steps.map(x=>x.source_ref).filter(x=>ISSUE.test(String(x||''))));
  if(!Array.isArray(issues)||issues.length>500)
   throw Error('ISSUE_CATALOG_READBACK_UNTRUSTED');
  const sourceIssues=issues.filter(x=>x?.state==='open'&&!x.pull_request&&
   allowed.has(x.html_url)&&ISSUE.test(String(x.html_url||''))).slice(0,12);
  const verified=[];
  for(const issue of sourceIssues){
   try{
    const source=await verifyRealMissingRepairIssue({issueNumber:issue.number});
    if(source?.independently_verified===true&&source.issue_url===issue.html_url)
     verified.push(source);
   }catch{ /* An open issue alone is never authority to generate. */ }
  }
  const priorOriginals=await Promise.all(verified.map(async x=>({
   issue_number:x.issue_number,
   record:await shiftRpc(db,'reality_read_owner_existing_original_issue_v1',
    {p_owner_id:session.user_id,p_issue_number:x.issue_number})
  })));
  const selected=selectRileyFullShiftOriginals({
   ownerId:session.user_id,shiftId:data.shift_id,
   expectedFingerprint:data.expected_fingerprint,
   shiftReadback:checked,ownerLoopReadback,
   opportunities:verified,priorOriginals
  });
  const outcomes=[];
  for(const job of selected.selected){
   let original=null;
   try{
    original=await authorizeExistingRealRepairWork({
     session,conversationId:data.conversation_id,
     issueNumber:job.issue_number,
     expectedFailedRunId:job.original_provider_failed_run_id,
     expectedSourceSha:job.source_sha
    });
    if(!/^work:[a-f0-9]{32}$/.test(original?.original_work_id||'')||
     original.installation_authorized!==false||
     original.original_job_completed!==false||
     original.production_changed!==false)
     throw Error('ORIGINAL_OWNER_ADMISSION_NOT_INDEPENDENTLY_VERIFIED');
    const queue=await queueVerifiedOriginalRepair({session,work:original});
    if(queue.original_work_id!==original.original_work_id||
     queue.installation_authorized!==false||
     queue.original_job_completed!==false||
     queue.production_changed!==false)
     throw Error('ORIGINAL_QUEUE_IDENTITY_NOT_VERIFIED');
    outcomes.push({issue_number:job.issue_number,
     original_work_id:original.original_work_id,
     status:queue.status,
     worker_dispatch_started:queue.worker_dispatch_started===true,
     installation_authorized:false,
     original_job_completed:false});
   }catch{
    // An original Continuity event MAY already have been written.
    // NEVER retry in this request. Owner/broker must reconcile before reuse.
    outcomes.push({issue_number:job.issue_number,
     original_work_id:/^work:[a-f0-9]{32}$/.test(original?.original_work_id||'')?
      original.original_work_id:null,
     status:'ORIGINAL_INTAKE_OR_DISPATCH_REQUIRES_DURABLE_RECONCILIATION',
     worker_dispatch_started:false,installation_authorized:false,
     original_job_completed:false});
   }
  }
  return res.status(202).json({
   ok:true,status:outcomes.length?
    'OWNER_AUTHORIZED_MULTI_ORIGINAL_INTAKE_RECORDED':
    'NO_NEW_VERIFIED_WORK_IN_EXACT_AUTHORIZED_SHIFT',
   shift_id:data.shift_id,shift_fingerprint:data.expected_fingerprint,
   sources_in_authorized_plan:allowed.size,
   independently_verified_repair_sources:verified.length,
   selected_count:selected.selected_count,
   outcomes,skipped:selected.skipped,
   one_authorization_for_exact_shift:true,no_per_job_buttons_required:true,
   shift_worker_execution_proven:false,
   installation_authorized:false,original_job_completed:false,
   final_receipt_recorded:false,production_changed:false
  });
 }catch(e){
  console.warn('RILEY_FULL_SHIFT_INTAKE','OWNER_OR_PROVIDER_RECONCILIATION_REQUIRED');
  return res.status(503).json({ok:false,
   error:'RILEY_FULL_SHIFT_INTAKE_REQUIRES_RECONCILIATION',
   no_automatic_retry:true,owner_installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}
