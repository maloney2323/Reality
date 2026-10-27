// Protected preview only. Live GitHub POST requires NEW explicit user consent,
// a server-authenticated Supabase session, durable policy/goal readbacks,
// atomic single-use DB claim, and separate provider GET verification.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {preparePersonalIssueDispatch,runPersonalIssueDispatch}
 from '../../src/reality-personal-issue-dispatch-v0.1.js';
export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST')
    .json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(req.method==='GET'){
   return res.status(200).json({ok:true,
    status:process.env.VERCEL_ENV==='preview'&&
     Boolean(process.env.REALITY_GITHUB_TOKEN)?
     'PREVIEW_GITHUB_WRITE_ADAPTER_CONFIGURED':'PREVIEW_GITHUB_WRITE_ADAPTER_NOT_CONFIGURED',
    requires_new_execution_confirmation:true,
    requires_fresh_action_approval:true,
    external_action_performed:false});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'DISPATCH_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   return res.status(415).json({ok:false,error:'DISPATCH_JSON_REQUIRED'});
  const b=req.body||{},keys=Object.keys(b);
  if(keys.some(k=>!['intent','conversation_id','discovered_work_id','confirmation'].includes(k))||
   !validUuid(b.conversation_id)||
   !/^work:[a-f0-9]{32}$/.test(String(b.discovered_work_id||'')))
   return res.status(400).json({ok:false,error:'DISPATCH_UNTRUSTED_CLIENT_FIELDS_OR_SCOPE'});
  if(b.intent==='CHECK'){
   const p=await preparePersonalIssueDispatch({
    session,conversationId:b.conversation_id,
    discoveredWorkId:b.discovered_work_id,
   });
   return res.status(200).json({ok:true,status:p.status,
    work_id:b.discovered_work_id,
    work_fingerprint:p.work_fingerprint,
    approval_policy_id:p.action_policy_id,
    credential_configured:Boolean(process.env.REALITY_GITHUB_TOKEN),
    external_action_performed:false});
  }
  if(b.intent!=='RUN'||b.confirmation!=='EXECUTE_THIS_ONE_EXACT_APPROVED_GITHUB_ISSUE')
   return res.status(400).json({ok:false,error:'DISPATCH_NEW_EXPLICIT_USER_CONFIRMATION_REQUIRED'});
  const outcome=await runPersonalIssueDispatch({
   session,conversationId:b.conversation_id,
   discoveredWorkId:b.discovered_work_id,
   confirmation:b.confirmation,
  });
  return res.status(outcome.status==='VERIFIED'?200:202).json({ok:true,...outcome});
 }catch(error){
  const raw=String(error?.message||'');
  // Database errors, nested adapter response bodies and secret scopes never
  // enter the phone UI. The error remains explicitly non-success.
  const unavailable=/UNIVERSE_POSTGRES_HTTP_|CONTINUITY_PERSISTENCE_REQUIRED|CONTINUITY_REHYDRATION_FAILED/.test(raw);
  return res.status(error?.status||503).json({ok:false,
   error:unavailable?'DISPATCH_CONTINUITY_STORAGE_UNAVAILABLE':
    /^([A-Z][A-Z0-9_]{2,120})$/.test(raw)?raw:'DISPATCH_PRECHECK_OR_OUTCOME_UNAVAILABLE',
   verified:false,external_action_performed:false,
   no_automatic_retry:true});
 }
}
