// Protected preview only. Live GitHub POST requires NEW explicit user consent,
// a server-authenticated Supabase session, durable policy/goal readbacks,
// atomic single-use DB claim, and separate provider GET verification.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {verifyPersonalGithubIssueToken}
 from '../../src/reality-personal-github-execution-bridge-v0.1.js';
import {preparePersonalIssueDispatch,runPersonalIssueDispatch,
 inspectPersonalIssueAttemptsReadOnly}
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
   let status='PREVIEW_GITHUB_WRITE_ADAPTER_NOT_CONFIGURED';
   let token_identity_verified=false;
   let repository_issue_read_verified=false;
   // Token presence is NOT proof that the credential was generated correctly.
   // A protected read-only GitHub /user + repository issues probe checks the
   // actual preview credential before the UI offers any RUN button.
   if(process.env.VERCEL_ENV==='preview'&&process.env.REALITY_GITHUB_TOKEN){
    try{
     const verified=await verifyPersonalGithubIssueToken();
     if(verified.credential_identity_verified&&
        verified.repository_issues_read_verified){
      status='PREVIEW_GITHUB_WRITE_ADAPTER_CONFIGURED';
      token_identity_verified=true;
      repository_issue_read_verified=true;
     }
    }catch{
     status='PREVIEW_GITHUB_CREDENTIAL_NOT_VERIFIED';
    }
   }
   return res.status(200).json({ok:true,status,
    token_identity_verified,repository_issue_read_verified,
    github_issue_write_permission_not_yet_proven:true,
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
   (b.intent!=='RECONCILE'&&
    !/^work:[a-f0-9]{32}$/.test(String(b.discovered_work_id||'')))||
   (b.intent==='RECONCILE'&&b.discovered_work_id!==undefined&&
    !/^work:[a-f0-9]{32}$/.test(String(b.discovered_work_id||''))))
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
  if(b.intent==='RECONCILE'){
   if(b.confirmation!==undefined)
    return res.status(400).json({ok:false,error:'RECONCILIATION_IS_READ_ONLY'});
   const inspected=await inspectPersonalIssueAttemptsReadOnly({
    session,conversationId:b.conversation_id,
    discoveredWorkId:b.discovered_work_id,
   });
   return res.status(200).json({ok:true,...inspected});
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
  // These named failures only arise in signed-in goal/work admission,
  // before atomic reservation and provider execution. Never describe them
  // as a GitHub write of uncertain outcome.
  const knownBeforeDispatch=new Set([
   'PERSONAL_EXECUTION_PERSISTED_GOAL_BOUND_APPROVAL_REQUIRED',
   'PERSONAL_DISPATCH_PREVIOUS_ATTEMPT_RECONCILIATION_REQUIRED_NO_RETRY',
   'PERSONAL_DISPATCH_SOURCE_CHANGED_REPREPARE',
   'PERSONAL_DISPATCH_DURABLE_SOURCE_AND_GOAL_RECEIPT_REQUIRED',
  ]).has(raw);
  return res.status(error?.status||(knownBeforeDispatch?409:503)).json({ok:false,
   error:unavailable?'DISPATCH_CONTINUITY_STORAGE_UNAVAILABLE':
    /^([A-Z][A-Z0-9_]{2,120})$/.test(raw)?raw:'DISPATCH_PRECHECK_OR_OUTCOME_UNAVAILABLE',
   failure_phase:knownBeforeDispatch?'BEFORE_PROVIDER_DISPATCH':'NOT_ESTABLISHED',
   verified:false,external_action_performed:knownBeforeDispatch?false:null,
   no_automatic_retry:true});
 }
}
