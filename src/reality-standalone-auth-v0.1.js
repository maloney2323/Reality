// Independent Vercel identity boundary for the Base44-free migration pilot.
// Uses Supabase Auth's own /auth/v1/user validation, not a caller's user ID,
// unsigned JWT decoding, locally issued compatibility cookies, or browser state.
import {createHash} from 'node:crypto';
import {deriveContinuityRootId} from './reality-continuous-continuity-v1.0.js';

export const STANDALONE_AUTH_VERSION='reality-standalone-auth-v0.1';
export const STANDALONE_HISTORY_PROVENANCE='REALITY_STANDALONE_AUTHENTICATED';
const failure=(code,status=400)=>{
 const e=new Error(code);e.status=status;return e;
};
export function authConfiguration(env=process.env) {
 const raw=env.SUPABASE_URL||'';
 const key=env.SUPABASE_PUBLISHABLE_KEY||'';
 if(!raw||!key)throw failure('STANDALONE_AUTH_NOT_CONFIGURED',503);
 let url;
 try{url=new URL(raw)}catch{throw failure('STANDALONE_AUTH_URL_INVALID',503)}
 if(url.protocol!=='https:'||url.username||url.password||url.port||
    !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)||url.pathname!=='/'||
    url.search||url.hash)throw failure('STANDALONE_AUTH_URL_INVALID',503);
 if(!/^sb_publishable_[\w-]+$/.test(key)&&!/^eyJ[a-zA-Z0-9._-]+$/.test(key))
  throw failure('STANDALONE_PUBLISHABLE_KEY_INVALID',503);
 return Object.freeze({auth_url:url.origin,publishable_key:key});
}

// The isolated migration pilot must NEVER attach a new authenticated identity
// to an unrelated or production Universe database. Exact URL/root binding is
// a prerequisite even when both Supabase projects happen to be accessible.
export function assertStandalonePreviewIsolation(env=process.env){
 if(env.VERCEL_ENV==='production')
  throw failure('STANDALONE_PRODUCTION_RELEASE_NOT_AUTHORIZED',503);
 const ref=String(env.REALITY_STANDALONE_EXPECTED_PROJECT_REF||'');
 if(!/^[a-z0-9-]{10,40}$/.test(ref))
  throw failure('STANDALONE_PREVIEW_PROJECT_BINDING_REQUIRED',503);
 const required='https://'+ref+'.supabase.co';
 const auth=authConfiguration(env);
 const persistence=String(env.REALITY_UNIVERSE_PERSISTENCE_URL||'').replace(/\/$/,'');
 if(auth.auth_url!==required||persistence!==required)
  throw failure('STANDALONE_AUTH_UNIVERSE_PROJECT_MISMATCH',503);
 return Object.freeze({project_ref:ref,auth_and_universe_bound:true,production_allowed:false});
}


// Standalone preview must explicitly provide its OWN scoped service credential.
// The native storage adapter has compatibility fallbacks for older applications;
// this boundary never permits a generic Preview SUPABASE_SECRET_KEY fallback.
// Do not attempt any user/data write if the model or storage is unconfigured.
export function inspectStandaloneReadiness(env=process.env){
 let projectBindingError=null;
 try{assertStandalonePreviewIsolation(env)}catch(e){
   projectBindingError=e.message||'STANDALONE_PREVIEW_PROJECT_UNVERIFIED';
 }
 const explicitKey=String(env.REALITY_UNIVERSE_PERSISTENCE_KEY||'');
 const dedicatedServiceCredential=/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(explicitKey);
 const paidModelKey=String(env.REALITY_STANDALONE_OPENAI_API_KEY||'');
 const modelReady=paidModelKey.startsWith('sk-')&&paidModelKey.length>=20;
 const modelNameReady=typeof env.REALITY_OPENAI_MODEL==='string'&&
   /^[a-z0-9][a-z0-9.-]{1,90}$/.test(env.REALITY_OPENAI_MODEL);
 const checks=Object.freeze({
   preview_isolation:projectBindingError===null,
   preview_project_id:String(env.REALITY_STANDALONE_EXPECTED_PROJECT_REF||'')||
     'NOT_CONFIGURED',
   standalone_enabled:env.REALITY_STANDALONE_CHAT_ENABLED==='true',
   universe_durability_enabled:env.REALITY_UNIVERSE_PERSISTENCE_ENABLED==='true',
   dedicated_server_storage_key:dedicatedServiceCredential,
   model_api_key:modelReady,
   explicit_model_selection:modelNameReady,
 });
 const missing=Object.freeze([
   ...(checks.preview_isolation?[]:['PREVIEW_AUTH_UNIVERSE_PROJECT_BINDING']),
   ...(checks.universe_durability_enabled?[]:['REALITY_UNIVERSE_PERSISTENCE_ENABLED']),
   ...(checks.dedicated_server_storage_key?[]:['REALITY_UNIVERSE_PERSISTENCE_KEY']),
   ...(checks.model_api_key?[]:['REALITY_STANDALONE_OPENAI_API_KEY']),
   ...(checks.explicit_model_selection?[]:['REALITY_OPENAI_MODEL']),
   ...(checks.standalone_enabled?[]:['REALITY_STANDALONE_CHAT_ENABLED']),
 ]);
 return Object.freeze({
   version:'reality-standalone-readiness-v0.1',
   status:missing.length?'NOT_READY':'CONFIGURED_NOT_LIVE_VERIFIED',
   checks,missing,
   live_authentication_verified:false,
   live_database_write_verified:false,
   real_model_call_verified:false,
 });
}
export function requireStandaloneReady(env=process.env){
 const readiness=inspectStandaloneReadiness(env);
 if(!readiness.checks.preview_isolation)
   throw failure('STANDALONE_PREVIEW_PROJECT_BINDING_INVALID',503);
 if(!readiness.checks.dedicated_server_storage_key)
   throw failure('STANDALONE_DEDICATED_STORAGE_KEY_REQUIRED',503);
 if(!readiness.checks.model_api_key||!readiness.checks.explicit_model_selection)
   throw failure('STANDALONE_MODEL_CONFIGURATION_REQUIRED',503);
 return readiness;
}

// One branch-scoped callback only. Caller-controlled email/redirect URLs cannot
// redirect authentication tokens to arbitrary sites or localhost.
export function standaloneConfirmationRedirect(env=process.env){
 const raw=String(env.REALITY_STANDALONE_AUTH_CALLBACK_URL||'');
 let url;
 try{url=new URL(raw)}catch{throw failure('STANDALONE_CONFIRMATION_CALLBACK_REQUIRED',503)}
 if(url.protocol!=='https:'||url.username||url.password||url.port||
    !/^[a-z0-9-]+\\.vercel\\.app$/i.test(url.hostname)||
    url.pathname!=='/standalone.html'||url.search||url.hash)
   throw failure('STANDALONE_CONFIRMATION_CALLBACK_INVALID',503);
 return url.href;
}

function bearer(req){
 const h=req?.headers?.authorization||req?.headers?.Authorization||'';
 const m=typeof h==='string'?h.match(/^Bearer ([a-zA-Z0-9._-]{24,4096})$/):null;
 if(!m)throw failure('AUTHENTICATED_SESSION_REQUIRED',401);
 return m[1];
}
export async function verifyStandaloneUser(req,{fetchImpl=fetch,env=process.env}={}){
 const {auth_url,publishable_key}=authConfiguration(env);
 const token=bearer(req);
 let response;
 try{
  response=await fetchImpl(auth_url+'/auth/v1/user',{
    method:'GET',headers:{apikey:publishable_key,Authorization:'Bearer '+token,
      Accept:'application/json'},redirect:'error'});
 }catch{throw failure('AUTH_PROVIDER_UNAVAILABLE',503)}
 if(response.status===401||response.status===403)throw failure('AUTHENTICATED_SESSION_INVALID',401);
 if(!response.ok)throw failure('AUTH_PROVIDER_UNAVAILABLE',503);
 const user=await response.json().catch(()=>null);
 if(!user||typeof user.id!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)||
    user.is_anonymous===true)throw failure('AUTHENTICATED_USER_INVALID',401);
 // Do not trust raw_user_meta_data for authorization.
 return Object.freeze({user_id:user.id,identity_basis:'SUPABASE_AUTH_SERVER_VERIFIED'});
}
function selector(v,name) {
 if(typeof v!=='string'||!/^[a-zA-Z0-9:_-]{1,96}$/.test(v))
  throw failure(name+'_SELECTOR_INVALID');
 return v;
}
export function createStandaloneConversationScope({userId,conversationId,thoughtId='personal'}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(userId||'')))
  throw failure('AUTHENTICATED_USER_REQUIRED',401);
 const conversation=selector(conversationId,'CONVERSATION');
 const thought=selector(thoughtId,'THOUGHT');
 // Customer selectors are *not* authoritative context or tenant identity.
 const scoped='principal:'+userId+':thought:'+thought+':conversation:'+conversation;
 const root=deriveContinuityRootId({conversationId:scoped});
 if(!root)throw failure('CONTINUITY_ROOT_REQUIRED',503);
 return Object.freeze({
  authenticated_user_id:userId,
  identity_basis:'SUPABASE_AUTH_SERVER_VERIFIED',
  context_source:STANDALONE_HISTORY_PROVENANCE,
  conversation_id:scoped,
  thought_id:thought,
  client_conversation_selector:conversation,
  continuity_root_id:root,
  worldline_id:'reality:primary',
  truth_authorized:false,action_authorized:false,
  ephemeral_no_history:false,
 });
}
export function rejectUnsafeStandalonePayload(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw failure('INVALID_CHAT_BODY');
 const allowed=new Set(['message','conversation_id','thought_id','turn_id']);
 for(const field of Object.keys(body))
  if(!allowed.has(field))throw failure('STANDALONE_CONTEXT_OR_AUTHORITY_INJECTION_REJECTED',400);
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>10000)
  throw failure('MESSAGE_INVALID');
 const turnId=selector(body.turn_id,'TURN');
 return Object.freeze({
  message:body.message.trim(),
  conversationId:selector(body.conversation_id,'CONVERSATION'),
  thoughtId:body.thought_id===undefined?'personal':selector(body.thought_id,'THOUGHT'),
  turnId,
 });
}
export function scopedTurnEntryId({root,turnId,role}){
 // Stable IDs allow durable idempotency checks at the storage boundary.
 return 'reality-standalone-chat:'+
  createHash('sha256').update(JSON.stringify([root,turnId,role])).digest('hex');
}
