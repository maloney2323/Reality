// RLS-scoped preview chat history. No service-role credential or user-supplied owner ID.
const table='reality_chat_messages';
export function validUuid(s){return typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s)}
function asRows(value){if(!Array.isArray(value))throw Error('CHAT_HISTORY_NOT_ARRAY');return value}
async function storageRequest(session,query,{method='GET',body,fetchImpl=fetch}={}){
 const response=await fetchImpl(session.config.url+'/rest/v1/'+table+query,{
  method,
  headers:{
   apikey:session.config.key,authorization:'Bearer '+session.access_token,
   accept:'application/json',
   ...(body?{'content-type':'application/json',Prefer:'return=representation'}:{}),
  },
  ...(body?{body:JSON.stringify(body)}:{}),
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok){
  const err=new Error(response.status===401||response.status===403?'CHAT_STORAGE_ACCESS_DENIED':'CHAT_STORAGE_UNAVAILABLE');
  err.status=response.status===401||response.status===403?401:503;
  throw err;
 }
 return asRows(result);
}
export async function readPrivateChat(session,conversationId,{fetchImpl=fetch,limit=240}={}){
 if(!validUuid(conversationId)||!Number.isInteger(limit)||limit<1||limit>240)
  throw Object.assign(new Error('CHAT_CONVERSATION_ID_INVALID'),{status:400});
 const q='?select=id,role,content,created_at,request_id'+
  '&user_id=eq.'+encodeURIComponent(session.user_id)+
  '&conversation_id=eq.'+encodeURIComponent(conversationId)+
  '&order=created_at.desc,id.desc&limit='+String(limit+1);
 const rows=await storageRequest(session,q,{fetchImpl});
 for(const row of rows){
  if(!validUuid(row.id)||!validUuid(row.request_id)||
    !['user','assistant'].includes(row.role)||typeof row.content!=='string')
   throw Object.assign(new Error('CHAT_HISTORY_ROW_INVALID'),{status:503});
 }
 const older_missing=rows.length>limit;
 return {
  messages:rows.slice(0,limit).reverse().map(row=>({
   role:row.role,text:row.content,source_ref:'supabase:reality_chat_messages:'+row.id,
   created_at:row.created_at,request_id:row.request_id,
  })),
  older_missing,
  history_status:older_missing?'WINDOW_LIMIT_REACHED':'RETRIEVED_WITHIN_CONVERSATION',
 };
}
export async function recordPrivateMessage(session,{conversationId,requestId,role,text},opts={}){
 if(!validUuid(conversationId)||!validUuid(requestId)||
   !['user','assistant'].includes(role)||typeof text!=='string'||
   !text.trim()||text.length>12000)
  throw Object.assign(new Error('CHAT_MESSAGE_INVALID'),{status:400});
 const rows=await storageRequest(session,'',{
  method:'POST',body:{
   user_id:session.user_id,conversation_id:conversationId,
   request_id:requestId,role,content:text,
  },...opts,
 });
 if(rows.length!==1||!validUuid(rows[0].id))throw Error('CHAT_WRITE_READBACK_FAILED');
 return {source_ref:'supabase:reality_chat_messages:'+rows[0].id};
}


export async function listPrivateConversations(session,{fetchImpl=fetch}={}){
 const q='?select=conversation_id,created_at,role,content'+
  '&user_id=eq.'+encodeURIComponent(session.user_id)+
  '&order=created_at.desc&limit=500';
 const rows=await storageRequest(session,q,{fetchImpl});
 const unique=new Map();
 for(const row of rows){
  if(!validUuid(row.conversation_id)||typeof row.content!=='string')throw Error('CHAT_LIST_ROW_INVALID');
  if(!unique.has(row.conversation_id))unique.set(row.conversation_id,{
   conversation_id:row.conversation_id,
   last_message:row.content.slice(0,72),
   last_message_at:row.created_at,
  });
 }
 return Array.from(unique.values()).slice(0,50);
}


// The most recent SAVED human turn, queried under that human's Supabase
// RLS session. Used solely to avoid creating duplicate unanswered messages
// when an earlier insert succeeded but its HTTP acknowledgment was lost.
// Unlike full conversation reconstruction, this reads ONE lightweight row.
export async function readLatestPrivateChatUserTurn(session,conversationId,{
 fetchImpl=fetch
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
   !session?.access_token||!session?.config)
  throw Object.assign(Error('CHAT_LATEST_USER_IDENTITY_INVALID'),{status:400});
 const q='?select=id,user_id,conversation_id,role,content,created_at,request_id'+
  '&user_id=eq.'+encodeURIComponent(session.user_id)+
  '&conversation_id=eq.'+encodeURIComponent(conversationId)+
  '&role=eq.user&order=created_at.desc,id.desc&limit=1';
 const rows=await storageRequest(session,q,{fetchImpl});
 if(rows.length>1||rows.some(r=>
   !validUuid(r.id)||!validUuid(r.request_id)||
   r.user_id!==session.user_id||r.conversation_id!==conversationId||
   r.role!=='user'||typeof r.content!=='string'))
  throw Error('CHAT_LATEST_USER_READBACK_INVALID');
 const row=rows[0];
 return row?Object.freeze({role:'user',text:row.content,
  request_id:row.request_id,
  source_ref:'supabase:reality_chat_messages:'+row.id,
  created_at:row.created_at}):null;
}

// Final publication happens inside ONE PostgreSQL transaction that locks
// the same principal/conversation resource as each authorized goal transition.
// Requires the reviewed isolated-preview SQL migration. Never downgrade to
// the two-request check when this atomic path was selected.
export async function publishPrivateAssistantAtomically(
 session,{conversationId,requestId,text,expectedRevision,expectedLastEventId=null,isolatedDb},
 {fetchImpl=fetch}={}
){
 if(!isolatedDb?.strictSecrets||isolatedDb.url!==session.config.url||
    !isolatedDb?.secretKey||!validUuid(session.user_id))
  throw Object.assign(new Error('CHAT_ATOMIC_SERVER_DATABASE_SCOPE_INVALID'),{status:503});
 if(!validUuid(conversationId)||!validUuid(requestId)||
    typeof text!=='string'||!text.trim()||text.length>12000||
    !Number.isSafeInteger(expectedRevision)||expectedRevision<0||
    (expectedLastEventId!==null&&!validUuid(expectedLastEventId)))
  throw Object.assign(new Error('CHAT_ATOMIC_PUBLICATION_INPUT_INVALID'),{status:400});
 const response=await fetchImpl(
  isolatedDb.url+'/rest/v1/rpc/reality_publish_assistant_if_goal_current',{
    method:'POST',
    headers:{apikey:isolatedDb.secretKey,authorization:'Bearer '+isolatedDb.secretKey,
      accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({
      p_user_id:session.user_id,
      p_conversation_id:conversationId,p_request_id:requestId,
      p_content:text,p_expected_goal_revision:expectedRevision,
      p_expected_last_goal_event_id:expectedLastEventId,
    }),
  });
 const payload=await response.json().catch(()=>null);
 if(!response.ok){
  const message=String(payload?.message||'');
  const newer=message.includes('CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN');
  const changed=message.includes('CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN');
  const duplicate=message.includes('CHAT_ATOMIC_ASSISTANT_ALREADY_PUBLISHED');
  const code=newer?'CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN':
    changed?'CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN':
    duplicate?'CHAT_ATOMIC_ASSISTANT_ALREADY_PUBLISHED':
    'CHAT_ATOMIC_PUBLICATION_DATABASE_UNAVAILABLE';
  throw Object.assign(new Error(code),{status:newer||changed||duplicate?409:503});
 }
 if(!validUuid(payload))
  throw Object.assign(new Error('CHAT_ATOMIC_PUBLICATION_RECEIPT_MISSING'),{status:503});
 return {source_ref:'supabase:reality_chat_messages:'+payload,
   atomic_goal_revision_checked:true};
}


// The EXISTING owner-goal publication epoch is already independently read
// by the execution controller. For ordinary READ-ONLY Chat, this single
// service-scoped RPC gives the exact goal CAS revision without forcing a
// complete Universe history reconstruction before the model can reply.
// The final atomic publication RPC still checks the same revision, latest
// owner request and exact committed user turn under the existing DB lock.
export async function readPrivateChatGoalPublicationEpoch(
 session,{conversationId,requestId,isolatedDb},{fetchImpl=fetch}={}
){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !validUuid(requestId)||!isolatedDb?.strictSecrets||
    isolatedDb.url!==session.config?.url||
    typeof isolatedDb.secretKey!=='string'||!isolatedDb.secretKey)
  throw Object.assign(Error('CHAT_GOAL_EPOCH_OWNER_SCOPE_INVALID'),{status:503});
 const response=await fetchImpl(
  isolatedDb.url+'/rest/v1/rpc/reality_read_execution_epoch',{
   method:'POST',signal:AbortSignal.timeout(3500),
   headers:{
    apikey:isolatedDb.secretKey,
    authorization:'Bearer '+isolatedDb.secretKey,
    accept:'application/json','content-type':'application/json'
   },
   body:JSON.stringify({
    p_user_id:session.user_id,p_conversation_id:conversationId
   })
  }
 );
 if(!response.ok)
  throw Object.assign(Error('CHAT_GOAL_EPOCH_READ_UNAVAILABLE'),{status:503});
 const result=await response.json().catch(()=>null);
 if(!Array.isArray(result)||result.length!==1)
  throw Object.assign(Error('CHAT_GOAL_EPOCH_EXACT_ROW_REQUIRED'),{status:503});
 const row=result[0];
 if(!Number.isSafeInteger(Number(row.goal_revision))||
    Number(row.goal_revision)<0||
    !Number.isSafeInteger(Number(row.user_message_revision))||
    Number(row.user_message_revision)<1||
    (row.goal_transition_event_id!==null&&
     !validUuid(row.goal_transition_event_id))||
    !validUuid(row.latest_user_request_id))
  throw Object.assign(Error('CHAT_GOAL_EPOCH_INVALID'),{status:503});
 if(row.latest_user_request_id!==requestId)
  throw Object.assign(
   Error('CHAT_NEWER_USER_MESSAGE_DURING_COGNITION_RETRY_NEW_TURN'),
   {status:409}
  );
 return Object.freeze({
  expected_revision:Number(row.goal_revision),
  expected_last_goal_event_id:row.goal_transition_event_id||null,
  user_message_revision:Number(row.user_message_revision),
  latest_user_request_id:row.latest_user_request_id,
  source:'EXISTING_OWNER_SCOPED_EXECUTION_EPOCH_RPC',
  independent_full_history_not_claimed:true,
  execution_authorized:false,installation_authorized:false
 });
}

// Exact authenticated request readback for reply status polling. This reads
// at most two message rows instead of reloading 240 history rows and unrelated
// operational dashboards on every progress tick. RLS and identity are never
// derived from the browser; both principal and conversation are session-bound.
export async function readPrivateChatRequest(session,{conversationId,requestId},
 {fetchImpl=fetch}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !validUuid(requestId)||!session?.access_token||!session?.config)
  throw Object.assign(Error('CHAT_REQUEST_READBACK_IDENTITY_INVALID'),{status:400});
 const q='?select=id,user_id,conversation_id,role,content,created_at,request_id'+
  '&user_id=eq.'+encodeURIComponent(session.user_id)+
  '&conversation_id=eq.'+encodeURIComponent(conversationId)+
  '&request_id=eq.'+encodeURIComponent(requestId)+
  '&order=created_at.asc,id.asc&limit=3';
 const rows=await storageRequest(session,q,{fetchImpl});
 if(rows.length>2||rows.some(row=>
   !validUuid(row.id)||row.user_id!==session.user_id||
   row.conversation_id!==conversationId||row.request_id!==requestId||
   !['user','assistant'].includes(row.role)||
   typeof row.content!=='string')||
   rows.filter(r=>r.role==='user').length>1||
   rows.filter(r=>r.role==='assistant').length>1)
  throw Error('CHAT_REQUEST_READBACK_ROWS_INVALID');
 return Object.freeze({conversation_id:conversationId,request_id:requestId,
  messages:Object.freeze(rows.map(row=>Object.freeze({
   role:row.role,text:row.content,
   source_ref:'supabase:reality_chat_messages:'+row.id,
   created_at:row.created_at,request_id:row.request_id
  }))),
  status:'AUTHENTICATED_EXACT_REQUEST_RLS_READBACK',
  work_execution_authorized:false,installation_authorized:false});
}
