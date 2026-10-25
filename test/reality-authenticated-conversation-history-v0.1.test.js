import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {buildCognitionContinuityHandoff} from '../src/reality-cognition-continuity-handoff-v0.1.js';
import {loadAuthenticatedConversationHistory} from '../src/reality-authenticated-conversation-history-v0.1.js';

const userId='fixture-account',conversationId='fictional-case-01',thoughtId='test-thought',appId='fixture-app';
const original='For the construction estimate, do not send it unless the homeowner approves it.';
const data=Array.from({length:175},(_,i)=>({
  id:'msg-'+String(i+1).padStart(4,'0'),
  user_id:userId,conversation_id:conversationId,thought_id:thoughtId,
  role:i%2?'assistant':'user',
  text:i===0?original:i%2?'Earlier AI comment (not source verified).':
    'Workday inventory update '+i,
  created_date:new Date(Date.UTC(2026,9,1,12,i)).toISOString(),
}));
function pageFetcher(items){
 const calls=[];
 const getPage=async path=>{
  const u=new URL(path,'https://fictional.example');
  const query=JSON.parse(u.searchParams.get('q'));
  assert.deepEqual(query,{user_id:userId,thought_id:thoughtId,conversation_id:conversationId});
  assert.equal(u.searchParams.get('sort'),'-created_date');
  const offset=Number(u.searchParams.get('skip')||'0');
  const limit=Number(u.searchParams.get('limit'));
  calls.push({offset,limit});
  return {data:items.slice().reverse().slice(offset,offset+limit)};
 };
 return {calls,getPage};
}
function load(getPage){return loadAuthenticatedConversationHistory({
 userId,thoughtId,conversationId,appId,getPage,
})}
test('real adapter paginates 175 messages and reorders them earliest first',async()=>{
 const provider=pageFetcher(data);
 const got=await load(provider.getPage);
 assert.deepEqual(provider.calls.map(x=>[x.offset,x.limit]),[[0,80],[80,80],[160,80]]);
 assert.equal(got.turns.length,175);
 assert.equal(got.coverage,'COMPLETE_WITHIN_QUERY_SCOPE');
 assert.equal(got.older_messages_may_be_missing,false);
 assert.equal(got.turns[0].source_ref,'base44:PersonalMessage:msg-0001');
 assert.equal(got.turns.at(-1).source_ref,'base44:PersonalMessage:msg-0175');
 const userSignal=buildGovernedChatSignal({message:'Now focus on material inventory.',
  observedAt:'2026-10-25T15:00:00.000Z'});
 const c=buildCognitionContinuityHandoff({
  governedSignal:userSignal,latestMessage:'Now focus on material inventory.',
  verifiedConversationTurns:got.turns,
 });
 assert.equal(c.source_message_count,175);
 assert.ok(c.older_user_conditions.some(x=>x.source_ref==='base44:PersonalMessage:msg-0001'&&
  x.exact_user_text.includes('homeowner approves')),JSON.stringify(c.older_user_conditions));
 assert.match(c.earliest_available_user_message.text,/construction estimate/);
 assert.ok(c.recent_turns.every(x=>x.source_ref!=='base44:PersonalMessage:msg-0001'));
});
test('older 240-message cutoff is declared and never mistaken for complete continuity',async()=>{
 const source=Array.from({length:260},(_,i)=>({
  ...data[0],id:'id-'+i,text:i===0?original:'Misc '+i,
  role:i%2?'assistant':'user',created_date:new Date(Date.UTC(2026,9,2,0,i)).toISOString(),
 }));
 const provider=pageFetcher(source);
 const result=await load(provider.getPage);
 assert.equal(result.source_message_count,240);
 assert.equal(result.older_messages_may_be_missing,true);
 assert.equal(result.coverage,'WINDOW_LIMIT_REACHED');
 assert.equal(result.earliest_message_is_global_first,false);
 assert.equal(result.turns.some(t=>t.text===original),false);
 assert.deepEqual(provider.calls.map(x=>[x.offset,x.limit]),[[0,80],[80,80],[160,80],[240,1]]);
});
test('malformed source rows trigger partial coverage instead of false completeness',async()=>{
 const malformed=data.map(x=>({...x}));
 malformed[8].role='system';
 const r=await load(pageFetcher(malformed).getPage);
 assert.equal(r.source_message_count,174);
 assert.equal(r.coverage,'PARTIAL_MALFORMED_ROWS_SKIPPED');
 assert.equal(r.older_messages_may_be_missing,true);
});
test('cross-account contamination is rejected despite being returned by provider',async()=>{
 const invalid=data.slice(0,3).map(x=>({...x}));
 invalid[1].user_id='another-account';
 await assert.rejects(()=>load(pageFetcher(invalid).getPage),/HISTORY_SCOPE_MISMATCH/);
});
test('pagination overlap and transient provider failures are surfaced',async()=>{
 const first=pageFetcher(data);
 await assert.rejects(()=>load(async p=>{
  const page=await first.getPage(p);
  const u=new URL(p,'https://fictional.example');
  if(Number(u.searchParams.get('skip'))===80)
    return {data:Array.from({length:80},()=>data[174])};
  return page;
 }),/HISTORY_PAGE_OVERLAP_OR_UNSTABLE_SORT/);
 await assert.rejects(()=>load(async()=>{throw Error('BASE44_UNAVAILABLE')}),/BASE44_UNAVAILABLE/);
});
test('real intelligence API uses paged authenticated readback, not fixed 60 or silent fallback',async()=>{
 const code=await readFile(new URL('../api/reality/intelligence.js',import.meta.url),'utf8');
 assert.match(code,/loadAuthenticatedConversationHistory\(/);
 assert.doesNotMatch(code,/\.slice\(0,\s*60\)/);
 assert.doesNotMatch(code,/loadRealityContext\(req, body\)\.catch/);
 assert.match(code,/conversation_history_coverage/);
 const runner=await readFile(new URL('../src/reality-live-intelligence-orchestration-v0.1.js',import.meta.url),'utf8');
 assert.match(runner,/authenticated_conversation_turns:_unboundedRawConversationHistory/);
 assert.match(runner,/buildCognitionContinuityHandoff\(/);
});
