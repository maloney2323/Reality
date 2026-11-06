// Read-only and owner-scoped. Does not install, authorize, or resume a job.
import {authenticatedChatSession,privateChatConfig}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {createCapabilityValueReport,summarizeQualifiedCapabilityValueReports}
 from '../../src/reality-capability-value-report-v1.js';
import {assessTwoAuthorizationExecutionPreflight}
 from '../../src/reality-two-authorization-execution-preflight-v1.js';
export const maxDuration=30;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({
  ok:false,error:'QUALIFIED_CAPABILITIES_READ_ONLY'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CLIENT_SCOPE_NOT_ACCEPTED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||
    db.url!==session.config.url||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('ISOLATED_OWNER_DATABASE_NOT_VERIFIED');
  const url=db.url,secret=db.secretKey;
  const response=await fetch(
   url+'/rest/v1/rpc/reality_read_owner_qualified_capabilities_v1',{
    method:'POST',headers:{
     apikey:secret,authorization:'Bearer '+secret,
     'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id}),
   });
  if(!response.ok)throw Error('OWNER_READBACK_UNAVAILABLE');
  const entries=await response.json();
  if(!Array.isArray(entries)||entries.length>20||
   entries.some(x=>x.phase!=='AWAITING_OWNER_APPROVAL'||
    x.qualification?.installation_authorized!==false||
    x.qualification?.original_job_completed!==false))
   throw Error('QUALIFICATION_READBACK_INVALID');
  // Derive read-only economic and technical explanations solely from the
  // signed, owner-scoped qualification readback. No further rights granted.
  // After consent is durable, the same owner-scoped queue can still expose
  // its approval receipt. Never send that already-approved row through the
  // UNINSTALLED pre-approval value validator or erase the legitimate approval.
  const waiting=entries.filter(entry=>entry.approval==null);
  const valueReports=waiting.map(createCapabilityValueReport);
  const valueByWork=new Map(waiting.map((entry,i)=>[
   entry.original_work_id,valueReports[i]]));
  const enriched=entries.map(entry=>({...entry,
   value_report:valueByWork.get(entry.original_work_id)||null,
   full_loop_preflight:entry.approval?
    {approval_gate_open:false,status:'ALREADY_OWNER_APPROVED_DO_NOT_REAPPROVE',
     two_authorizations_only:true,original_job_completed:false}:
    assessTwoAuthorizationExecutionPreflight(entry)}));
  const valuePortfolio=summarizeQualifiedCapabilityValueReports(valueReports);
  return res.status(200).json({
   ok:true,status:entries.length?'VERIFIED_UPGRADES_WAITING_FOR_OWNER':'NO_VERIFIED_UPGRADES',
   entries:enriched,value_portfolio:valuePortfolio,
   installation_authorized:false,original_job_completed:false,
   changes_performed:false,
  });
 }catch(e){
  console.warn('REALITY_QUALIFIED_CAPABILITY_READ_UNAVAILABLE',
    String(e?.message||'').startsWith('ISOLATED_')?'CONFIG_SCOPE':'READBACK');
  return res.status(503).json({ok:false,error:'QUALIFIED_CAPABILITY_READBACK_UNAVAILABLE'});
 }
}
