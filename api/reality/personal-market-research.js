// Owner-authenticated, preview-only strategic research. Read-only sources and
// a durable owner-scoped research receipt; never creates jobs or installs code.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {readPinnedRealityMarketSnapshot,runGovernedMarketResearch,
 persistOwnerMarketResearch}
 from '../../src/reality-autonomous-market-intelligence-v1.js';
async function researchBudgetRpc(db,method,body){
 const r=await fetch(db.url+'/rest/v1/rpc/'+method,{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   Accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(body)});
 const data=await r.json().catch(()=>null);
 if(!r.ok||data?.ok!==true)throw Error('RESEARCH_BUDGET_OR_FINALIZATION_UNVERIFIED');
 return data;
}
export const maxDuration=120;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST').json({
    ok:false,error:'RESEARCH_EXPLICIT_POST_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'RESEARCH_PREVIEW_ONLY'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'RESEARCH_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'RESEARCH_JSON_REQUIRED'});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||
    Object.keys(req.body).join(',')!=='intent'||
    req.body.intent!=='RUN_GOVERNED_STRATEGIC_RESEARCH'||Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'RESEARCH_SCOPE_INVALID'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||
    db.url!==session.config.url||
    db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('RESEARCH_ISOLATED_OWNER_DATABASE_UNVERIFIED');
  const apiKey=String(process.env.REALITY_STANDALONE_OPENAI_API_KEY||
   process.env.OPENAI_API_KEY||'');
  if(!apiKey)throw Error('RESEARCH_OPENAI_NOT_CONFIGURED');
  const reservation=await researchBudgetRpc(db,
   'reality_reserve_owner_market_research_v1',
   {p_owner_id:session.user_id});
  if(reservation.status!=='OWNER_RESEARCH_RESERVED'||!reservation.reservation_id)
   throw Error('RESEARCH_BUDGET_RESERVATION_INVALID');
  let snapshot,report,saved;
  try{
   snapshot=await readPinnedRealityMarketSnapshot();
   report=await runGovernedMarketResearch({snapshot,apiKey,
    model:process.env.REALITY_MARKET_RESEARCH_MODEL||'gpt-6-astra'});
   saved=await persistOwnerMarketResearch({
    report,ownerId:session.user_id,db});
   const final=await researchBudgetRpc(db,
    'reality_finalize_owner_market_research_v1',{
     p_owner_id:session.user_id,p_reservation_id:reservation.reservation_id,
     p_phase:'COMPLETE'});
   if(final.phase!=='COMPLETE')throw Error('RESEARCH_FINALIZATION_UNVERIFIED');
  }catch(error){
   await researchBudgetRpc(db,'reality_finalize_owner_market_research_v1',{
    p_owner_id:session.user_id,p_reservation_id:reservation.reservation_id,
    p_phase:'FAILED'}).catch(()=>null);
   throw error;
  }
  return res.status(200).json({
   ok:true,status:'GOVERNED_MARKET_RESEARCH_RECORDED',
   receipt_id:saved.receipt_id,verified_readback:saved.verified_readback,
   research_reservation_id:reservation.reservation_id,
   report_sha256:report.report_sha256,
   source_coverage:'HOSTED_WEB_SEARCH_AND_PINNED_REALITY_CODE_EXCERPTS',
   pinned_commit_sha:snapshot.commit_sha,
   researched_source_count:report.search_source_count,
   findings:saved.findings,
   research_executed:true,review_only:true,
   codebase_completely_audited:false,
   owner_authorized_investigation:false,installation_authorized:false,
   job_started:false,production_changed:false,
  });
 }catch(error){
  const issue=String(error?.message||'');
  console.warn('REALITY_MARKET_RESEARCH_NOT_VERIFIED',
   issue.startsWith('MARKET_RESEARCH_')?issue:'CONFIG_OR_PROVIDER');
  return res.status(issue.includes('UNAVAILABLE_429')?429:503).json({
   ok:false,error:'GOVERNED_MARKET_RESEARCH_NOT_VERIFIED',
   research_executed:false,installation_authorized:false,
   job_started:false,production_changed:false,
  });
 }
}
