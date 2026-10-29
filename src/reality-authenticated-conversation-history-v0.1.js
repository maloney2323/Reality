// Personal Reality server-side history readback.
// Query only the authenticated user's scoped thought/conversation, paginate
// the existing Base44 entity API, preserve source IDs and signal incompleteness.
// No LLM call, authority, or inferred external truth here.
export const AUTHENTICATED_HISTORY_READBACK_VERSION='reality-authenticated-history-readback-v0.1';
const jsonRows=x=>Array.isArray(x)?x:Array.isArray(x?.data)?x.data:null;
export async function loadAuthenticatedConversationHistory({
 userId,thoughtId,conversationId,appId,getPage,pageSize=80,maxMessages=240,
}={}){
 if([userId,thoughtId,conversationId,appId].some(x=>typeof x!=='string'||!x.trim())||
   typeof getPage!=='function')throw Error('HISTORY_AUTHENTICATED_SCOPE_REQUIRED');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100||
    !Number.isInteger(maxMessages)||maxMessages<pageSize||maxMessages>240||
    maxMessages%pageSize!==0)throw Error('HISTORY_PAGINATION_BOUNDS_INVALID');
 const q=encodeURIComponent(JSON.stringify({
  user_id:userId,thought_id:thoughtId,conversation_id:conversationId,
 }));
 const base=`/apps/${appId}/entities/PersonalMessage?q=${q}&sort=-created_date`;
 const collected=[],seen=new Set();
 let exhausted=false,skippedMalformed=0,moreExists=false;
 for(let offset=0;offset<maxMessages;offset+=pageSize){
  const result=await getPage(`${base}&limit=${pageSize}&skip=${offset}`);
  const data=jsonRows(result);
  if(!data||data.length>pageSize)throw Error('HISTORY_PROVIDER_PAGE_INVALID');
  for(const item of data){
   if(!item||typeof item!=='object'||
      (item.user_id!=null&&item.user_id!==userId)||
      (item.conversation_id!=null&&item.conversation_id!==conversationId)||
      (item.thought_id!=null&&item.thought_id!==thoughtId))
    throw Error('HISTORY_SCOPE_MISMATCH');
   if(typeof item.id!=='string'||!item.id.trim()){
    skippedMalformed++;continue;
   }
   if(seen.has(item.id))throw Error('HISTORY_PAGE_OVERLAP_OR_UNSTABLE_SORT');
   seen.add(item.id);
   if(!['user','assistant'].includes(item.role)||typeof item.text!=='string'){
    skippedMalformed++;continue;
   }
   collected.push({
    role:item.role,text:item.text.slice(0,12000),
    source_ref:'base44:PersonalMessage:'+item.id,
    created_at:item.created_date||null,
   });
  }
  if(data.length<pageSize){exhausted=true;break}
 }
 if(!exhausted){
  const peek=jsonRows(await getPage(`${base}&limit=1&skip=${maxMessages}`));
  if(!peek||peek.length>1)throw Error('HISTORY_PROVIDER_PEEK_INVALID');
  moreExists=peek.length>0;
 }
 return Object.freeze({
  version:AUTHENTICATED_HISTORY_READBACK_VERSION,
  // Stable provider sort is newest-first; cognition receives oldest-first.
  turns:Object.freeze(collected.reverse()),
  coverage:moreExists?'WINDOW_LIMIT_REACHED':
    skippedMalformed?'PARTIAL_MALFORMED_ROWS_SKIPPED':'COMPLETE_WITHIN_QUERY_SCOPE',
  queried_scope:'AUTHENTICATED_USER_THOUGHT_AND_CONVERSATION',
  max_messages:maxMessages,source_message_count:collected.length,
  older_messages_may_be_missing:moreExists||skippedMalformed>0,
  skipped_malformed_count:skippedMalformed,
  earliest_message_is_global_first:exhausted&&skippedMalformed===0||!moreExists&&skippedMalformed===0,
 });
}
