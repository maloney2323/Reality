// Owner-scoped recovery inventory for the independent Reality preview.
// The Universe is authoritative; browser localStorage is only a convenience.
// No mutations, model calls, credentials or cross-user scans occur here.
import {validateUniverseEntry} from './reality-universe-persistence-contract-v1.0.js';
import {assertStandalonePreviewIsolation,verifyStandaloneUser,
 createStandaloneConversationScope,STANDALONE_HISTORY_PROVENANCE}
 from './reality-standalone-auth-v0.1.js';

const fail=(code,status=503)=>{const e=new Error(code);e.status=status;return e;};
const MAX_ROWS=300;
function requireRecoveryStore(env){
 if(env.REALITY_STANDALONE_CHAT_ENABLED!=='true' ||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  throw fail('STANDALONE_RECOVERY_DISABLED');
 assertStandalonePreviewIsolation(env);
 const key=String(env.REALITY_UNIVERSE_PERSISTENCE_KEY||'');
 if(!/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(key))
  throw fail('STANDALONE_RECOVERY_STORAGE_UNAVAILABLE');
 return {url:env.REALITY_UNIVERSE_PERSISTENCE_URL,key};
}
export async function readOwnerConversationRows({userId,rootId=null,env=process.env,fetchImpl=fetch}={}){
 const {url,key}=requireRecoveryStore(env);
 if(!/^[0-9a-f-]{36}$/i.test(String(userId||'')))throw fail('RECOVERY_USER_INVALID',401);
 if(rootId!==null&&!/^continuity:[a-f0-9]{32}$/.test(String(rootId)))
  throw fail('RECOVERY_ROOT_SELECTOR_INVALID',400);
 const q=new URLSearchParams({
  select:'*',event_kind:'eq.AUTHENTICATED_CONVERSATION_MESSAGE',
  worldline_id:'eq.reality:primary',
  'provenance->>authenticated_user_id':'eq.'+userId,
  order:'assertion_time.desc',limit:String(MAX_ROWS),
 });
 if(rootId)q.set('continuity_root_id','eq.'+rootId);
 let response;
 try{response=await fetchImpl(url.replace(/\/$/,'')+'/rest/v1/reality_universe_entries?'+q,{
  method:'GET',headers:{apikey:key,Accept:'application/json'},
  cache:'no-store',redirect:'error',
 });}catch{throw fail('RECOVERY_STORAGE_REQUEST_FAILED');}
 if(!response.ok)throw fail('RECOVERY_STORAGE_READ_FAILED');
 const rows=await response.json().catch(()=>null);
 if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw fail('RECOVERY_STORAGE_RESPONSE_INVALID');
 return rows;
}
export function summarizeOwnerConversations(rows,userId){
 if(!Array.isArray(rows))throw fail('RECOVERY_ROWS_INVALID');
 const group=new Map();
 for(const row of rows){
  validateUniverseEntry(row);
  if(row.event_kind!=='AUTHENTICATED_CONVERSATION_MESSAGE'||
     row.worldline_id!=='reality:primary'||
     row.provenance?.source!==STANDALONE_HISTORY_PROVENANCE||
     row.provenance?.authenticated_user_id!==userId||
     row.payload?.principal_id!==userId||
     row.payload?.role!=='user')continue;
  const root=row.continuity_root_id;
  if(!/^continuity:[a-f0-9]{32}$/.test(root))throw fail('RECOVERY_ROOT_INVALID');
  let conversationId=null;
  const id=row.payload?.client_conversation_selector;
  const thought=row.payload?.thought_id||'personal';
  if(typeof id==='string'){
   const scope=createStandaloneConversationScope({userId,conversationId:id,thoughtId:thought});
   if(scope.continuity_root_id!==root)throw fail('RECOVERY_SELECTOR_ROOT_MISMATCH');
   if(thought==='personal')conversationId=id;
  }
  const old=group.get(root);
  const record={
   conversation_id:conversationId||old?.conversation_id||null,
   recovery_root:root,
   last_activity_at:!old||Date.parse(row.assertion_time)>Date.parse(old.last_activity_at)
    ?row.assertion_time:old.last_activity_at,
   saved_user_message_count:(old?.saved_user_message_count||0)+1,
   recovery_mode:conversationId||old?.conversation_id?'RESUMABLE_BY_SELECTOR':'LEGACY_READ_ONLY',
  };
  group.set(root,record);
 }
 return Object.freeze([...group.values()].sort((a,b)=>Date.parse(b.last_activity_at)-Date.parse(a.last_activity_at)));
}
export async function listOwnerConversations(req,{
 env=process.env,fetchImpl=fetch,loadRows=readOwnerConversationRows,
}={}){
 requireRecoveryStore(env);
 if(req?.query&&Object.keys(req.query).length)throw fail('RECOVERY_QUERY_NOT_ALLOWED',400);
 const principal=await verifyStandaloneUser(req,{env,fetchImpl});
 const rows=await loadRows({userId:principal.user_id,env,fetchImpl});
 const conversations=summarizeOwnerConversations(rows,principal.user_id);
 return Object.freeze({ok:true,version:'reality-conversation-recovery-v0.1',
  conversations,bounded_inventory:true,inventory_limit:MAX_ROWS,
  server_owned:true,history_is_complete:false});
}
// Legacy pre-registry turns have no recoverable client UUID. Offer their
// owner-verified USER messages read-only, never an uncommitted model answer.
export async function previewOwnerLegacyConversation(req,{
 env=process.env,fetchImpl=fetch,loadRows=readOwnerConversationRows,
}={}){
 requireRecoveryStore(env);
 const q=req?.query||{};
 if(!q||typeof q!=='object'||Array.isArray(q)||
    Object.keys(q).some(k=>k!=='root_id')||typeof q.root_id!=='string')
  throw fail('RECOVERY_ROOT_SELECTOR_INVALID',400);
 const principal=await verifyStandaloneUser(req,{env,fetchImpl});
 const rows=await loadRows({userId:principal.user_id,rootId:q.root_id,env,fetchImpl});
 const candidates=summarizeOwnerConversations(rows,principal.user_id);
 const selected=candidates.find(c=>c.recovery_root===q.root_id);
 if(!selected)throw fail('RECOVERY_CONVERSATION_NOT_FOUND',404);
 if(selected.recovery_mode!=='LEGACY_READ_ONLY')
  throw fail('RECOVERY_USE_NORMAL_HISTORY_ENDPOINT',409);
 const messages=rows.filter(r=>
   r.continuity_root_id===selected.recovery_root &&
   r.provenance?.authenticated_user_id===principal.user_id &&
   r.payload?.principal_id===principal.user_id &&
   r.payload?.role==='user')
  .slice().reverse().slice(-60).map(r=>Object.freeze({
   role:'user',turn_id:r.payload.turn_id,text:String(r.payload.text||'').slice(0,10000),
  }));
 return Object.freeze({ok:true,version:'reality-legacy-preview-v0.1',
  recovery_root:selected.recovery_root,messages,read_only:true,
  assistant_completion_verified:false,history_is_complete:false,
  recovery_requires_review:true});
}
