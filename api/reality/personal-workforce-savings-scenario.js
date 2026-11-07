// Authenticated PRIVATE role-level staffing WHAT-IF calculator.
// Nothing is persisted, no HR changes, execution, layoffs or production writes.
// Signed-in business owner's financial inputs remain request-local.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog}
 from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster}
 from '../../src/reality-employee-identity-roster-v1.js';
import {projectRoleWorkforceConsolidation}
 from '../../src/reality-role-workforce-savings-scenario-v1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {projectOperationalRoiEvidenceV2}
 from '../../src/reality-operational-roi-v2.js';
import {projectOwnerRoleWorkforceEvidence,unavailableOwnerRoleWorkforceEvidence}
 from '../../src/reality-role-workforce-evidence-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const maxDuration=35;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).setHeader('Allow','POST')
   .json({ok:false,error:'WORKFORCE_SCENARIO_POST_ONLY'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'WORKFORCE_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'WORKFORCE_JSON_REQUIRED'});
  const body=req.body;
  if(!body||Array.isArray(body)||typeof body!=='object'||
   Object.keys(body).sort().join(',')!==
    'assumptions,shared_monthly_model_runtime_capacity_hours'||
   !Array.isArray(body.assumptions)||body.assumptions.length>8||
   JSON.stringify(body).length>9500)
   return res.status(400).json({ok:false,error:'WORKFORCE_SCENARIO_SCOPE_INVALID'});
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'WORKFORCE_PREVIEW_ONLY'});
  // Always re-read this signed-in owner's CURRENT validated role catalog.
  // No client can supply roles, model results, verified savings or permissions.
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const roster=buildRealityNamedEmployeeRoster(brief);
  const projection=projectRoleWorkforceConsolidation({
   roster,assumptions:body.assumptions,
   shared_monthly_model_runtime_capacity_hours:
    body.shared_monthly_model_runtime_capacity_hours,
  });
  let workforce_evidence=unavailableOwnerRoleWorkforceEvidence();
  // Independent owner-scoped job readback; never derive economic evidence from
  // owner-submitted salary estimates or a generic Github issue list.
  // Unavailable -> UNKNOWN. A failed source must not zero-out true results.
  try{
   const env=process.env;
   const db=resolveReliabilityBenchmarkDb(env);
   if(!db?.strictSecrets||!db.secretKey||
     db.url!==session.config?.url||
     db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
    throw Error('WORKFORCE_OWNER_ROI_CONFIG_NOT_MATCHED');
   const response=await fetch(db.url+
    '/rest/v1/rpc/reality_read_owner_job_roi_evidence_v2',{
     method:'POST',redirect:'error',cache:'no-store',
     headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
      'content-type':'application/json',accept:'application/json'},
     body:JSON.stringify({p_owner_id:session.user_id}),
     signal:AbortSignal.timeout(12000)
    });
   if(!response.ok)throw Error('WORKFORCE_ROI_RECEIPT_NOT_AVAILABLE');
   const raw=await response.json();
   const trusted=projectOperationalRoiEvidenceV2(raw);
   workforce_evidence=projectOwnerRoleWorkforceEvidence({roster,roi:trusted});
  }catch{
   // No false '0 settlements', payroll savings, or role replacement
   // when independent provider receipts cannot be read.
  }
  return res.status(200).json({ok:true,...projection,
   workforce_evidence,
   endpoint_scope:'SIGNED_IN_OWNER_PRIVATE_PREVIEW_READ_ONLY',
   inputs_saved:false,individual_employees_evaluated:false,
   positions_terminated:false,
   externally_actioned:false});
 }catch(e){
  const code=String(e?.message||'');
  return res.status(/REALITY_WORKFORCE_SCENARIO_/.test(code)?400:
    e?.status||503).json({ok:false,
   error:/^REALITY_WORKFORCE_SCENARIO_[A-Z0-9_]+$/.test(code)?
    code:'WORKFORCE_SCENARIO_SOURCE_UNAVAILABLE',
   inputs_saved:false,positions_terminated:false,
   external_action_performed:false});
 }
}
