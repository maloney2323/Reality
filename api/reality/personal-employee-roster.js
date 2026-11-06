// Read-only named employee board for signed-in Reality owner.
// Reuses existing work catalog and category router; never admits jobs, starts
// shifts, installs upgrades, creates agents or grants external business authority.
import {privateChatConfig,authenticatedChatSession} from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief} from '../../src/reality-workday-opportunity-brief-v1.js';
import {buildRealityNamedEmployeeRoster} from '../../src/reality-employee-identity-roster-v1.js';
export const maxDuration=45;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({ok:false,error:'EMPLOYEE_ROSTER_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({ok:false,error:'EMPLOYEE_ROSTER_CLIENT_SCOPE_REJECTED'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'EMPLOYEE_ROSTER_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'EMPLOYEE_ROSTER_PREVIEW_ONLY'});
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const roster=buildRealityNamedEmployeeRoster(brief);
  return res.status(200).json({ok:true,...roster,owner_scope_verified:true,
   source_data_partial:brief.status==='SOURCE_BACKED_DISCOVERY_PARTIAL',
   worker_execution_authorized:false});
 }catch(e){
  console.warn('EMPLOYEE_ROSTER_READ_ONLY',
   /^EMPLOYEE_ROSTER_[A-Z0-9_]+$/.test(e?.message||'')?e.message:'SOURCE_UNAVAILABLE');
  return res.status(503).json({ok:false,
   error:'EMPLOYEE_ROSTER_SOURCE_OR_SESSION_UNAVAILABLE',
   worker_execution_authorized:false,production_changed:false});
 }
}
