// Owner-initiated provider audit, preview only. Distinct from adopt / install.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {discoverGovernedCapabilityAudit,saveGovernedCapabilityAudit}
 from '../../src/reality-customer-capability-discovery-audit-v1.js';
export const maxDuration=120;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  if(req.method!=='POST')
   return res.status(405).setHeader('Allow','POST').json({
    ok:false,error:'CAPABILITY_AUDIT_EXPLICIT_POST_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'CAPABILITY_AUDIT_PREVIEW_ONLY'});
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'CAPABILITY_AUDIT_SAME_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'CAPABILITY_AUDIT_JSON_REQUIRED'});
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||
     Object.keys(req.body).join(',')!=='intent'||
     req.body.intent!=='RUN_GOVERNED_CAPABILITY_DISCOVERY_AUDIT'||
     Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CAPABILITY_AUDIT_SCOPE_INVALID'});
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(!db?.strictSecrets||!db.secretKey||
     db.url!==session.config.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('AUDIT_ISOLATED_OWNER_DATABASE_NOT_VERIFIED');
  const report=await discoverGovernedCapabilityAudit();
  const saved=await saveGovernedCapabilityAudit({
   report,ownerId:session.user_id,db,
  });
  return res.status(200).json({ok:true,...saved});
 }catch(error){
  console.warn('REALITY_GOVERNED_CAPABILITY_AUDIT_UNAVAILABLE',
   String(error?.message||'').startsWith('CAPABILITY_DISCOVERY_AUDIT_')?
    'SOURCE_OR_RECEIPT':'CONFIG_OR_SIGN_IN');
  return res.status(error?.status||503).json({
   ok:false,error:'GOVERNED_CAPABILITY_AUDIT_NOT_VERIFIED',
   audit_executed:false,installation_authorized:false,
   job_started:false,production_changed:false,
  });
 }
}
