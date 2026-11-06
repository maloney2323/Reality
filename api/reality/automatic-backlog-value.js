// Signed-in owner's automatic backlog planning explanation. GET-only.
// Fresh GitHub issue evidence is reconciled against Reality's existing
// source-backed category catalog before showing any conditional dollars.
// Never writes job approval, tasks, receipts or economic observations.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog,fetchCatalogGitHub}
 from '../../src/reality-work-catalog-v0.1.js';
import {buildRealityWorkdayOpportunityBrief}
 from '../../src/reality-workday-opportunity-brief-v1.js';
import {deriveAutomaticBacklogPlanning}
 from '../../src/reality-automatic-backlog-planning-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'AUTOMATIC_BACKLOG_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({
   ok:false,error:'AUTOMATIC_BACKLOG_CLIENT_SCOPE_REJECTED'});
 try{
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({
    ok:false,error:'AUTOMATIC_BACKLOG_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id)
   return res.status(401).json({
    ok:false,error:'AUTOMATIC_BACKLOG_OWNER_SIGN_IN_REQUIRED'});
  const [catalog,liveIssues]=await Promise.all([
   buildRealityWorkCatalog(),fetchCatalogGitHub('issues')]);
  const brief=buildRealityWorkdayOpportunityBrief(catalog);
  const assessment=deriveAutomaticBacklogPlanning({brief,liveIssues,sourceCatalog:catalog});
  return res.status(200).json({ok:true,...assessment});
 }catch(e){
  console.warn('AUTOMATIC_BACKLOG_READBACK_UNAVAILABLE',
   String(e?.message||'').startsWith('REALITY_AUTO_BACKLOG_')?
    'SOURCE_VALIDATION_OR_REFERENCE':'PROVIDER_OR_CONFIGURATION');
  return res.status(503).json({
   ok:false,error:'AUTOMATIC_BACKLOG_EVIDENCE_UNAVAILABLE',
   verified_financial_savings_usd:null,
   owner_approval_granted:false,job_started:false,
   installation_authorized:false,production_changed:false
  });
 }
}
