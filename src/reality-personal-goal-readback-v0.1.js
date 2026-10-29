// One authenticated user -> one scoped authoritative GoalState readback.
// EXPERIMENTAL preview only. Never accept a goal projection from the browser,
// model or generic reality_principal cookie.
import { createHash } from 'node:crypto';
import { validUuid } from './reality-private-chat-store-v0.1.js';
import { resolveReliabilityBenchmarkDb } from './reality-reliability-db-boundary-v0.1.js';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';
import { createContinuitySpine } from './reality-continuity-spine-v2.0.js';
import { projectAuthoritativeUserGoals }
 from './reality-authoritative-user-goal-ledger-v0.1.js';

export const PERSONAL_GOAL_READBACK_VERSION='reality-personal-goal-readback-v0.1';

export function personalGoalScope({userId,conversationId}={}){
 if(!validUuid(userId)||!validUuid(conversationId))
  throw Error('PERSONAL_GOAL_AUTHENTICATED_SCOPE_INVALID');
 const scope='personal:chat:'+createHash('sha256')
   .update(userId+'|'+conversationId).digest('hex');
 return Object.freeze({root:scope,worldline:scope,world:scope});
}

// session must be produced by authenticatedChatSession() after provider /user
// verification. The injection point is reserved for trusted server tests.
export async function readFreshPersonalGoalState({
 session,conversationId,env=process.env,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !session?.config?.url||typeof createPersistence!=='function')
  throw Error('PERSONAL_GOAL_AUTHENTICATED_SCOPE_INVALID');
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw Error('PERSONAL_GOAL_PREVIEW_DURABILITY_REQUIRED');
 const isolated=resolveReliabilityBenchmarkDb(env);
 if(!isolated||isolated.url!==session.config.url||
   isolated.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('PERSONAL_GOAL_ISOLATED_PROJECT_MISMATCH');
 const scope=personalGoalScope({userId:session.user_id,conversationId});
 const spine=createContinuitySpine({
   continuityRootId:scope.root,worldlineId:scope.worldline,
   subjectId:session.user_id,
 });
 const history=await createPersistence({...isolated}).reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 });
 // projectAuthoritativeUserGoals independently rechecks the entire
 // append-only lineage and user command issuer signatures. No fallback to
 // stored LLM summaries or caller-supplied goal hashes is permitted.
 const state=projectAuthoritativeUserGoals({
  continuityHistory:history,continuityRootId:spine.continuity_root_id,
  worldId:scope.world,principalId:session.user_id,
 });
 return Object.freeze({
  version:PERSONAL_GOAL_READBACK_VERSION,
  principal_id:session.user_id,
  conversation_id:conversationId,
  scope,
  state,
  readback_at:new Date().toISOString(),
  persisted_source:'ISOLATED_CONTINUITY_VERIFIED_READBACK',
  action_authorized_by_readback:false,
 });
}
