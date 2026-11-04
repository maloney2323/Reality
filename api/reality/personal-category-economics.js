// Owner-authenticated preview-only Work Center category economic observations.
// Existing categories and their ranked source receipts are read, not changed.
// The owner-specific capability intake is separately read by the signed-in
// dashboard using the existing audited personal-gap-intake API.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {buildRealityWorkCatalog} from '../../src/reality-work-catalog-v0.1.js';
import {buildCategoryEconomicPortfolio}
 from '../../src/reality-category-economic-portfolio-v1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')
  return res.status(405).setHeader('Allow','GET').json({
   ok:false,error:'CATEGORY_ECONOMICS_READ_ONLY'});
 if(Object.keys(req.query||{}).length)
  return res.status(400).json({
   ok:false,error:'CATEGORY_ECONOMICS_CLIENT_SCOPE_REJECTED'});
 try{
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({
    ok:false,error:'CATEGORY_ECONOMICS_PREVIEW_ONLY'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id)return res.status(401).json({
   ok:false,error:'CATEGORY_ECONOMICS_SIGN_IN_REQUIRED'});
  const catalog=await buildRealityWorkCatalog();
  const report=buildCategoryEconomicPortfolio(catalog);
  return res.status(200).json({ok:true,...report});
 }catch(error){
  console.warn('CATEGORY_ECONOMICS_READ_UNAVAILABLE',
   String(error?.message||'').startsWith('REALITY_CATEGORY_ECONOMICS_')?
    'SOURCE_OR_WAGE_CONTRACT':'SOURCE_OR_CONFIGURATION');
  return res.status(503).json({
   ok:false,error:'CATEGORY_ECONOMICS_EVIDENCE_UNAVAILABLE',
   verified_cash_savings_usd:null,
   read_only:true,owner_approval_granted:false,
   job_started:false,installation_authorized:false,production_changed:false
  });
 }
}
