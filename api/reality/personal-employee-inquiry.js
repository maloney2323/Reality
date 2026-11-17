// Signed-in Reality owner can ask ONE source-discovery investigation at a time.
// Source, employee and question are selected server-side from existing ledgers.
// No request-supplied source, model instruction, authority or executable job.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase} from '../../src/reality-governed-shift-boundary-v1.js';
import {generateOneEmployeeTemporalInquiry}
 from '../../src/reality-dynamic-employee-inquiry-worker-v1.js';
export const maxDuration=60;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')
  return res.status(405).setHeader('Allow','POST').json({
   ok:false,error:'INQUIRY_POST_ONLY',execution_authorized:false
  });
 if(process.env.VERCEL_ENV!=='preview')
  return res.status(403).json({ok:false,error:'INQUIRY_PREVIEW_ONLY'});
 try{
  if(!req.headers?.origin)throw Error('INQUIRY_SAME_ORIGIN_REQUIRED');
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json')||
     Object.keys(req.query||{}).length||
     !req.body||typeof req.body!=='object'||Array.isArray(req.body)||
     Object.keys(req.body).join(',')!=='intent'||
     req.body.intent!=='INVESTIGATE_NEXT_SOURCE')
   return res.status(400).json({
    ok:false,error:'INQUIRY_CLIENT_SOURCE_OR_AUTHORITY_REJECTED',
    execution_authorized:false
   });
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session||!UUID.test(session.user_id))
   return res.status(401).json({ok:false,error:'INQUIRY_OWNER_SIGN_IN_REQUIRED'});
  const db=shiftDatabase(process.env);
  if(db.url!==session.config?.url)
   return res.status(403).json({ok:false,error:'INQUIRY_DATABASE_SCOPE_MISMATCH'});
  const result=await generateOneEmployeeTemporalInquiry({
   ownerId:session.user_id,db,env:process.env
  });
  return res.status(200).json({ok:true,...result});
 }catch{
  return res.status(503).json({
   ok:false,error:'INQUIRY_PROVIDER_OR_OWNER_PROOF_UNAVAILABLE',
   new_original_jobs_created:0,execution_authorized:false,
   installation_authorized:false,production_changed:false
  });
 }
}
