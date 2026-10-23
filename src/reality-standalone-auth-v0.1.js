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
