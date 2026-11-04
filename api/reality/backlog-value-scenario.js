// No-write owner-scoped economic *scenario* API. Owner-provided assumptions
// are calculated against a fresh read-only GitHub source catalog. Never
// commits them to the ledger, starts work, sets an owner goal, or bills anyone.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../../src/reality-workday-opportunity-brief-v1.js';
import {projectBacklogLaborScenario}
 from '../../src/reality-backlog-labor-scenario-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).json({
  ok:false,error:'LABOR_SCENARIO_POST_REQUIRED'});
 if(Object.keys(req.query||{}).length)return res.status(400).json({
  ok:false,error:'LABOR_SCENARIO_CLIENT_SCOPE_REJECTED'});
 if(!String(req.headers?.['content-type']||'').toLowerCase().startsWith('application/json'))
  return res.status(415).json({ok:false,error:'LABOR_SCENARIO_JSON_REQUIRED'});
 const body=req.body;
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).length!==1||
  !Object.hasOwn(body,'assumptions')||
  !Array.isArray(body.assumptions)||body.assumptions.length>12)
  return res.status(400).json({ok:false,error:'LABOR_SCENARIO_INPUT_INVALID'});
 try{
  if(process.env.VERCEL_ENV!=='preview')return res.status(403).json({
   ok:false,error:'LABOR_SCENARIO_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id)return res.status(401).json({
   ok:false,error:'LABOR_SCENARIO_SIGN_IN_REQUIRED'});
  const catalog=await buildRealityWorkCatalog();
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const scenario=projectBacklogLaborScenario({
   brief,assumptions:body.assumptions});
  return res.status(200).json({ok:true,...scenario});
 }catch(e){
  const input=String(e?.message||'');
  return res.status(input.startsWith('REALITY_BACKLOG_VALUE_')?422:503).json({
   ok:false,error:input.startsWith('REALITY_BACKLOG_VALUE_')?
    'LABOR_SCENARIO_SOURCE_OR_ASSUMPTION_REJECTED':
    'LABOR_SCENARIO_SOURCE_READBACK_UNAVAILABLE',
   dollar_savings_verified:false,scenario_not_persisted:true,
   job_started:false,installation_authorized:false,production_changed:false
  });
 }
}
