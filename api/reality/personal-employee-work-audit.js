// Owner-clicked employee RESPONSIBILITY audit in the existing isolated Reality.
// Reuses live source Work Center, signed scheduled source qualification and the
// existing independent capability audit. Does not start or authorize work.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog}
 from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../../src/reality-employee-identity-roster-v1.js';
import {buildEmployeeResponsibilityAudit}
 from '../../src/reality-employee-responsibility-audit-v1.js';
import {discoverGovernedCapabilityAudit,saveGovernedCapabilityAudit}
 from '../../src/reality-customer-capability-discovery-audit-v1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=120;
const SCOPES=new Set(['ALL','Avery','Riley','Quinn','Taylor',
 'Casey','Morgan','Jordan','Sage']);
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST').json({
    ok:false,error:'EMPLOYEE_AUDIT_POST_ONLY'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'EMPLOYEE_AUDIT_PREVIEW_ONLY'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'EMPLOYEE_AUDIT_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'EMPLOYEE_AUDIT_JSON_REQUIRED'});
  if(Object.keys(req.query||{}).length||
   !req.body||typeof req.body!=='object'||Array.isArray(req.body)||
   Object.keys(req.body).sort().join(',')!=='employee_name,intent'||
   req.body.intent!=='AUDIT_EMPLOYEE_WEEK'||
   !SCOPES.has(req.body.employee_name))
   return res.status(400).json({
    ok:false,error:'EMPLOYEE_AUDIT_FIXED_OWNER_ROLE_REQUIRED',
    installation_authorized:false,production_changed:false});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url||
   db.project!=='hvkfreoagbrphwghjajw'||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('EMPLOYEE_AUDIT_ISOLATED_OWNER_DATABASE_MISMATCH');
  // Fresh catalog includes bounded GitHub issues, PRs and current CI signals.
  const [catalog,snapshotResult]=await Promise.all([
   buildRealityWorkCatalog(),
   shiftRpc(db,'reality_read_next_week_source_snapshot_v1',{})
    .catch(()=>null)
  ]);
  if(!catalog||!['OBSERVED','PARTIAL'].includes(catalog.status))
   throw Error('EMPLOYEE_AUDIT_LIVE_PROVIDER_CATALOG_UNVERIFIED');
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const roster=buildRealityNamedEmployeeRoster(brief);
  let savedAudit=null;
  let capabilityAuditStatus='NOT_APPLICABLE_TO_SELECTED_ROLE';
  const needsCapabilityAudit=['ALL','Riley','Quinn','Taylor'].includes(
   req.body.employee_name);
  if(needsCapabilityAudit){
   try{
    const providerAudit=await discoverGovernedCapabilityAudit();
    savedAudit=await saveGovernedCapabilityAudit({
     report:providerAudit,ownerId:session.user_id,db
    });
    capabilityAuditStatus='INDEPENDENT_CAPABILITY_AUDIT_DURABLY_RECORDED';
   }catch{
    capabilityAuditStatus='CAPABILITY_AUDIT_PROVIDER_OR_RECEIPT_UNVERIFIED';
   }
  }
  const audit=buildEmployeeResponsibilityAudit({
   roster,snapshot:snapshotResult,employee:req.body.employee_name,
   capabilityAudit:savedAudit
  });
  return res.status(200).json({
   ok:true,...audit,
   fresh_catalog_observed_at:catalog.observed_at,
   fresh_catalog_status:catalog.status,
   source_coverage:catalog.source_coverage,
   capability_audit_status:capabilityAuditStatus,
   owner_scope_verified:true,
   source_check_executed:true,
   // These switches must NEVER be derived from a GitHub issue title.
   original_job_executed:false,installation_authorized:false,
   shift_started:false,production_changed:false
  });
 }catch(error){
  const code=String(error?.message||'');
  console.warn('EMPLOYEE_RESPONSIBILITY_AUDIT_UNAVAILABLE',
   /^EMPLOYEE_RESPONSIBILITY_AUDIT_[A-Z0-9_]+$/.test(code)?
    code:'PROVIDER_OR_OWNER_SOURCE_UNAVAILABLE');
  return res.status(error?.status||503).json({
   ok:false,error:'EMPLOYEE_AUDIT_SOURCE_OR_OWNER_PROOF_UNAVAILABLE',
   original_job_executed:false,installation_authorized:false,
   production_changed:false
  });
 }
}
