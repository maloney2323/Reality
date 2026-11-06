// Reality's signed-in owner backlog for Riley's existing assigned duties.
// No new task, shift, model action, approval or worker execution.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc,assertShiftReadback}
 from '../../src/reality-governed-shift-boundary-v1.js';
import {fetchCatalogGitHub}
 from '../../src/reality-work-catalog-v0.1.js';
import {projectRileyExistingBacklog}
 from '../../src/reality-riley-existing-backlog-v1.js';
export const maxDuration=60;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'RILEY_BACKLOG_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'RILEY_BACKLOG_CLIENT_SCOPE_DENIED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'RILEY_BACKLOG_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'RILEY_BACKLOG_PREVIEW_ONLY'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'RILEY_BACKLOG_OWNER_PROJECT_MISMATCH'});
  const [issues,loop,shiftRaw]=await Promise.all([
   fetchCatalogGitHub('issues'),
   shiftRpc(db,'reality_read_owner_genuine_loop_v1',
    {p_owner_id:session.user_id}),
   shiftRpc(db,'reality_read_owner_employee_shifts_v1',
    {p_owner_id:session.user_id})
  ]);
  const shifts=assertShiftReadback(shiftRaw);
  if(!Array.isArray(issues)||issues.length>500)
   throw Error('RILEY_BACKLOG_PROVIDER_UNTRUSTED');
  // The catalog is paginated, but owner matching remains bounded.
  // If this project grows past 30 open issues, report partial coverage
  // instead of silently calling the uninspected backlog empty.
  const sourceIssues=issues.filter(x=>
   x?.state==='open'&&!x.pull_request&&
   Number.isSafeInteger(x.number)&&x.number>0&&x.number<=100000&&
   /^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/.test(
    String(x.html_url||''))).slice(0,30);
  const priorOriginals=await Promise.all(sourceIssues.map(async x=>({
   issue_number:x.number,
   record:await shiftRpc(db,'reality_read_owner_existing_original_issue_v1',{
    p_owner_id:session.user_id,p_issue_number:x.number})
  })));
  const backlog=projectRileyExistingBacklog({
   issues:sourceIssues,ownerLoop:loop,priorOriginals,
   activeShiftCount:shifts.shifts.filter(x=>
    ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(x.status)).length,
   coverageComplete:issues.source_scan?.query_scope_fully_reconciled===true&&
    sourceIssues.length===issues.filter(x=>x?.state==='open'&&!x.pull_request).length
  });
  return res.status(200).json({ok:true,owner_scope_verified:true,
   read_only:true,worker_execution_authorized_by_read:false,...backlog});
 }catch(e){
  console.warn('RILEY_BACKLOG_OWNER_READBACK','INDEPENDENT_SOURCE_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'RILEY_BACKLOG_RECONCILIATION_UNAVAILABLE',
   worker_executed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false});
 }
}
