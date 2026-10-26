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


// Final publication happens inside ONE PostgreSQL transaction that locks
// the same principal/conversation resource as each authorized goal transition.
// Requires the reviewed isolated-preview SQL migration. Never downgrade to
// the two-request check when this atomic path was selected.
export async function publishPrivateAssistantAtomically(
 session,{conversationId,requestId,text,expectedRevision,expectedLastEventId=null},
 {fetchImpl=fetch}={}
){
 if(!validUuid(conversationId)||!validUuid(requestId)||
    typeof text!=='string'||!text.trim()||text.length>12000||
    !Number.isSafeInteger(expectedRevision)||expectedRevision<0||
    (expectedLastEventId!==null&&!validUuid(expectedLastEventId)))
  throw Object.assign(new Error('CHAT_ATOMIC_PUBLICATION_INPUT_INVALID'),{status:400});
 const response=await fetchImpl(
  session.config.url+'/rest/v1/rpc/reality_publish_assistant_if_goal_current',{
    method:'POST',
    headers:{apikey:session.config.key,authorization:'Bearer '+session.access_token,
      accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({
      p_conversation_id:conversationId,p_request_id:requestId,
      p_content:text,p_expected_goal_revision:expectedRevision,
      p_expected_last_goal_event_id:expectedLastEventId,
    }),
  });
 const payload=await response.json().catch(()=>null);
 if(!response.ok){
  const message=String(payload?.message||'');
  const stale=message.includes('CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN');
  throw Object.assign(new Error(stale?
    'CHAT_GOAL_CHANGED_DURING_COGNITION_RETRY_NEW_TURN':
    'CHAT_ATOMIC_PUBLICATION_DATABASE_UNAVAILABLE'),{status:stale?409:503});
 }
 if(!validUuid(payload))
  throw Object.assign(new Error('CHAT_ATOMIC_PUBLICATION_RECEIPT_MISSING'),{status:503});
 return {source_ref:'supabase:reality_chat_messages:'+payload,
   atomic_goal_revision_checked:true};
}
