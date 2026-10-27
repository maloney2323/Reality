// Authenticated READ-ONLY completion receipts from the owner's existing
// append-only Continuity worldline. Never create an action, goal, or receipt.
import {authenticatedChatSession,privateChatConfig} from '../../src/reality-private-chat-auth-v0.1.js';
import {validUuid} from '../../src/reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from '../../src/reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../../src/reality-reliability-db-boundary-v0.1.js';
import {createUniversePostgresPersistence} from '../../src/reality-universe-postgres-persistence-v0.1.js';
import {projectPersonalCompletionReports} from '../../src/reality-completion-report-v0.1.js';

export const maxDuration=60;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'READ_ONLY_GET_REQUIRED'});
  const conversationId=req.query?.conversation_id;
  if(!validUuid(conversationId))
   return res.status(400).json({ok:false,error:'CONVERSATION_ID_INVALID'});
  const session=await authenticatedChatSession(req,res);
  if(!session)
   return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const grounded=await readFreshPersonalGoalState({session,conversationId});
  if(grounded.principal_id!==session.user_id||
     grounded.conversation_id!==conversationId||
     !grounded.scope?.root||!grounded.scope?.worldline)
   throw Error('COMPLETION_SCOPE_UNVERIFIED');
  const db=resolveReliabilityBenchmarkDb();
  if(!db||db.strictSecrets!==true||
     db.url!==session.config.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('COMPLETION_ISOLATED_READBACK_REQUIRED');
  const history=await createUniversePostgresPersistence({...db}).reconstruct({
   continuityRootId:grounded.scope.root,worldlineId:grounded.scope.worldline
  });
  const reports=projectPersonalCompletionReports({events:history,limit:12});
  return res.status(200).json({ok:true,status:'PERSISTED_READ_ONLY',
   reports,verified_external_actions:reports.filter(x=>x.action_completed).length,
   full_jobs_verified_complete:0,external_action_performed:false,
   readback_at:new Date().toISOString()});
 }catch(error){
  const reason=String(error?.message||'');
  const err=/CHAT_|SESSION_|CONFIG|PREVIEW|PROJECT|DATABASE|POSTGRES|PERSISTENCE|ISOLATED|AUTHENTICATED|GOAL|RELIABILITY|CONTINUITY/i.test(reason)?
   'COMPLETION_READBACK_UNAVAILABLE':'COMPLETION_READBACK_FAILED';
  return res.status(503).json({ok:false,error:err,
   completion_not_proven:true,external_action_performed:false});
 }
}
