// Explicit authenticated user-goal administration (isolated PREVIEW only).
// No LLM, no background model judge, no external work actions, no new DB table.
// Source is an RLS-verified user message persisted before a goal-transition
// event is allowed into the SAME append-only Continuity spine.
import {createHash} from 'node:crypto';
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {readPrivateChat,recordPrivateMessage,validUuid}
 from '../../src/reality-private-chat-store-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {createUniversePostgresPersistence}
 from '../../src/reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine}
 from '../../src/reality-continuity-spine-v2.0.js';
import {buildGovernedChatSignal}
 from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime}
 from '../../src/reality-continuity-spine-runtime-v0.1.js';
import {projectAuthoritativeUserGoals,appendAuthenticatedUserGoalCommand,USER_GOAL_COMMANDS}
 from '../../src/reality-authoritative-user-goal-ledger-v0.1.js';
export const maxDuration=60;
function fail(code,status=400){const e=new Error(code);e.status=status;throw e}
function scopeFor(session,conversationId){
 const scope=createHash('sha256').update(session.user_id+'|'+conversationId).digest('hex');
 return {
  root:'personal:chat:'+scope,
  worldline:'personal:chat:'+scope,
  world:'personal:chat:'+scope,
 };
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  privateChatConfig();
  if(!['GET','POST'].includes(req.method))
   return res.status(405).setHeader('Allow','GET, POST').json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(req.method==='POST'){
   // Explicit state-changing user commands require browser-origin proof.
   if(!req.headers?.origin)fail('GOAL_COMMAND_ORIGIN_REQUIRED',403);
   assertSameOrigin(req);
  }
  const session=await authenticatedChatSession(req,res);
  if(!session)fail('CHAT_SIGN_IN_REQUIRED',401);
  const conversationId=String((req.method==='GET'?
   req.query?.conversation_id:req.body?.conversation_id)||'');
  if(!validUuid(conversationId))fail('CHAT_CONVERSATION_ID_INVALID');
  if(process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
   fail('GOAL_CONTINUITY_DURABILITY_REQUIRED',503);
  const isolated=resolveReliabilityBenchmarkDb();
  if(!isolated||isolated.url!==session.config.url||
      isolated.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   fail('GOAL_CONTINUITY_PRIVATE_LEDGER_SCOPE_MISMATCH',503);
  const scoped=scopeFor(session,conversationId);
  const spine=createContinuitySpine({
   continuityRootId:scoped.root,worldlineId:scoped.worldline,
   subjectId:session.user_id,
  });
  // Read-only GET never creates Continuity events or invokes Cognition.
  const persistence=createUniversePostgresPersistence({...isolated});
  if(req.method==='GET'){
   const history=await persistence.reconstruct({
    continuityRootId:spine.continuity_root_id,
    worldlineId:spine.worldline_id,
   });
   const state=projectAuthoritativeUserGoals({
    continuityHistory:history,continuityRootId:spine.continuity_root_id,
    worldId:scoped.world,principalId:session.user_id,
   });
   return res.status(200).json({ok:true,conversation_id:conversationId,goal_state:state});
  }
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
   fail('GOAL_COMMAND_JSON_REQUIRED',415);
  const requestId=String(req.body?.request_id||'');
  const command=String(req.body?.operation||'');
  const text=String(req.body?.message||'').trim();
  const target=String(req.body?.target_goal_id||'');
  if(!validUuid(requestId)||!USER_GOAL_COMMANDS.includes(command)||
     !text||text.length>700||text.includes('\u0000')||
     target.length>140)
   fail('GOAL_COMMAND_INVALID');
  if(['SET_ACTIVE','START_DETOUR'].includes(command)&&target)
   fail('GOAL_CREATE_TARGET_MUST_BE_EMPTY');
  if(!['SET_ACTIVE','START_DETOUR'].includes(command)&&!target)
   fail('GOAL_TARGET_REQUIRED');
  // Persist the user's EXACT instruction in the authenticated RLS chat
  // history. A reviewer or model cannot submit this API command.
  const history=await readPrivateChat(session,conversationId);
  if(history.messages.some(x=>x.request_id===requestId))
   fail('GOAL_COMMAND_REQUEST_ID_ALREADY_USED',409);
  const saved=await recordPrivateMessage(session,{
   conversationId,requestId,role:'user',text,
  });
  const recovered=await readPrivateChat(session,conversationId);
  const row=recovered.messages.find(x=>
   x.role==='user'&&x.request_id===requestId&&
   x.source_ref===saved.source_ref&&x.text===text);
  if(!row)fail('GOAL_USER_TURN_RLS_READBACK_NOT_VERIFIED',503);
  const observedAt=new Date().toISOString();
  const runtime=await startContinuityRuntime({
   continuityRootSource:scoped.root,worldlineSource:scoped.worldline,
   subjectId:session.user_id,
   signal:buildGovernedChatSignal({message:text,observedAt}),
   observedAt,
  });
  if(!runtime.enabled)fail('GOAL_CONTINUITY_DURABILITY_REQUIRED',503);
  const outcome=await appendAuthenticatedUserGoalCommand({
   continuityRuntime:runtime,worldId:scoped.world,principalId:session.user_id,
   command,sourceUserMessage:text,sourceUserMessageRef:row.source_ref,
   sourceRequestId:requestId,
   targetGoalId:target||null,observedAt,
  });
  return res.status(200).json({ok:true,conversation_id:conversationId,
   source_user_message_ref:row.source_ref,
   transition_receipt_id:outcome.event_id,
   goal_state:outcome.state,
   external_execution_authorized:false,
   independently_verified_business_outcome:false,
  });
 }catch(err){
  const status=Number(err?.status)||(
   /REQUEST_ID_ALREADY_USED|DUPLICATE|TARGET_INVALID|UNKNOWN_TARGET|PAUSE_NOT_ACTIVE/.test(err?.message||'')?
    409:503);
  return res.status(status).json({ok:false,error:err?.message||'GOAL_COMMAND_UNAVAILABLE'});
 }
}
