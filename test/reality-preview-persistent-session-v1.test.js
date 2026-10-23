import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPreviewSession,REALITY_PREVIEW_SESSION_KEY}
 from '../public/reality-preview-session-v1.js';

const conf=async()=>({auth_url:'https://isolated-test.supabase.co',publishable_key:'sb_publishable_TEST_PUBLIC_ONLY'});
function storage(){
 const m=new Map();
 return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),
  removeItem:k=>m.delete(k)};
}
const token=(access='token-a',refresh='refresh-a',expires=3600)=>
 ({access_token:access,refresh_token:refresh,expires_in:expires});

test('sign in once restores same authenticated user across a new page instance',async()=>{
 const store=storage(),requests=[],seen=[];
 const fetchImpl=async(url,opts)=>{
  requests.push({url,method:opts.method});
  assert.equal(opts.headers.apikey,'sb_publishable_TEST_PUBLIC_ONLY');
  assert.match(opts.headers.Authorization,/^Bearer token-a/);
  return {ok:true,status:200,json:async()=>({id:'owner-a',is_anonymous:false})};
 };
 const initial=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>1000,onToken:t=>seen.push(t)});
 await initial.accept(token());
 assert.equal(await initial.accessToken(),'token-a');
 const coldPage=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>2000});
 assert.equal(await coldPage.restore(),true);
 assert.equal(await coldPage.accessToken(),'token-a');
 assert.ok(store.getItem(REALITY_PREVIEW_SESSION_KEY)?.includes('refresh-a'));
 assert.equal(requests.filter(x=>x.url.endsWith('/auth/v1/user')).length,2);
 assert.ok(seen.includes('token-a'));
});
test('expired token rotates once and new credential survives reload',async()=>{
 const store=storage(),requests=[];
 let tick=1000, refreshes=0;
 const fetchImpl=async(url,opt)=>{
  requests.push({url,method:opt.method});
  if(url.includes('grant_type=refresh_token')){
   ++refreshes;
   assert.equal(JSON.parse(opt.body).refresh_token,'refresh-a');
   return {ok:true,status:200,json:async()=>token('token-b','refresh-b',3600)};
  }
  assert.match(opt.headers.Authorization,/Bearer token-[ab]/);
  return {ok:true,status:200,json:async()=>({id:'owner-a',is_anonymous:false})};
 };
 const first=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>tick});
 await first.accept(token('token-a','refresh-a',10));
 tick=13000;
 assert.equal(await first.accessToken(),'token-b');
 assert.equal(refreshes,1);
 const stored=JSON.parse(store.getItem(REALITY_PREVIEW_SESSION_KEY));
 assert.equal(stored.refresh_token,'refresh-b');
 const second=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>tick+10});
 assert.equal(await second.restore(),true);
 assert.equal(await second.accessToken(),'token-b');
});
test('invalid refresh token clears local session and fails closed',async()=>{
 const store=storage();
 let now=1000;
 const fetchImpl=async(url)=>{
  if(url.includes('grant_type=refresh_token'))return {ok:false,status:401,json:async()=>({})};
  return {ok:true,status:200,json:async()=>({id:'owner-a'})};
 };
 const session=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>now});
 await session.accept(token('token-a','refresh-a',10));
 now=30000;
 await assert.rejects(session.accessToken(),/PREVIEW_SESSION_EXPIRED_SIGN_IN_AGAIN/);
 assert.equal(store.getItem(REALITY_PREVIEW_SESSION_KEY),null);
});
test('temporary network outage preserves refresh credentials rather than falsely logging out',async()=>{
 const store=storage();let now=1000;
 const fetchImpl=async(url)=>{
  if(url.includes('grant_type=refresh_token'))throw Error('network down');
  return {ok:true,status:200,json:async()=>({id:'owner-a'})};
 };
 const session=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>now});
 await session.accept(token('token-a','refresh-a',10));
 now=20000;
 await assert.rejects(session.accessToken(),/PREVIEW_AUTH_NETWORK_UNAVAILABLE/);
 assert.ok(store.getItem(REALITY_PREVIEW_SESSION_KEY));
});
test('explicit logout revokes provider session and clears saved credential',async()=>{
 const store=storage(),urls=[],seen=[];
 const fetchImpl=async(url,opt)=>{
  urls.push(url);
  return url.endsWith('/logout')?
   {ok:true,status:204}:
   {ok:true,status:200,json:async()=>({id:'owner-a'})};
 };
 const session=createPreviewSession({getConfig:conf,storage:store,fetchImpl,now:()=>1000,
  onToken:v=>seen.push(v)});
 await session.accept(token());
 const result=await session.signOut();
 assert.equal(result.provider_logout_confirmed,true);
 assert.equal(store.getItem(REALITY_PREVIEW_SESSION_KEY),null);
 assert.equal(seen.at(-1),null);
 assert.ok(urls.includes('https://isolated-test.supabase.co/auth/v1/logout'));
 assert.equal(await session.restore(),false);
});
test('browser wiring restores before chat; live pilot requires click, two turns and verified receipts',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 assert.match(html,/import \{createPreviewSession\} from '\/reality-preview-session-v1\.js'/);
 assert.match(html,/if\(await session\.restore\(\)\)await enterWorkspace/);
 assert.match(html,/session\.signOut\(\)/);
 assert.match(html,/const sendProofTurn=async \(message,turnNumber\)/);
 assert.match(html,/verified_chain!==true/);
 assert.match(html,/turn_commit_status!=='COMMITTED'/);
 assert.match(html,/window\.confirm\(confirmation\)/);
 assert.match(html,/\$\('runContinuityProof'\)\.addEventListener\('click'/);
 assert.doesNotMatch(html,/setInterval\([^]*sendProofTurn/);
 assert.match(html,/No failed turn was retried/);
});

test('public Preview page matches the tested canonical HTML source',()=>{
 const source=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 const publicPage=readFileSync(new URL('../public/standalone.html',import.meta.url),'utf8');
 assert.equal(publicPage,source,'Vercel static page must not drift from the tested HTML');
});

test('older interrupted conversations do not block a fresh, explicitly consented live pilot',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 assert.match(html,/const earlierUnresolved=Boolean\(state\.pendingTurn\|\|state\.serverUnresolved\.length\)/);
 assert.match(html,/unfinished work\. It will remain preserved for read-only review/);
 assert.match(html,/window\.confirm\(confirmation\)/);
 assert.match(html,/reality-standalone-previous-pending-review-v01/);
 assert.match(html,/state\.pendingTurn=null;state\.pendingRetryApproved=false;savePending\(\);/);
 assert.doesNotMatch(html,/An existing turn needs review\. Resolve its status before a live test/);
 assert.match(html,/const conversationId=crypto\.randomUUID\(\)/);
 assert.match(html,/await refreshHistory\(\);\s*await refreshConversationInventory\(\)/);
});
test('reload respects explicit locally selected conversation, not the first old interrupted conversation',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 assert.match(html,/if\(!priorConversationId&&!state\.pendingTurn&&resumable\.length&&/);
 const open=html.indexOf('async function refreshConversationInventory()');
 const close=html.indexOf('async function refreshHistory()',open);
 assert.ok(open>=0&&close>open);
 assert.ok(html.slice(open,close).includes("localStorage.setItem('reality-standalone-conversation-v01'"));
});

test('verified history projection displays truthful committed-reply count without inventing drift',()=>{
 const html=readFileSync(new URL('../standalone.html',import.meta.url),'utf8');
 assert.match(html,/data\.assistant_messages_require_verified_commit===true/);
 assert.match(html,/committedReplies=data\.assistant_messages_require_verified_commit===true/);
 assert.match(html,/committed replies?\'?/);
 assert.match(html,/Not measured from history/);
 assert.match(html,/Model drift and factual accuracy still require separate evidence/);
 assert.match(html,/if\(second\.result\)readout\(second\.result\)/);
 const idx=html.indexOf('if(second.result)readout(second.result)');
 const prior=html.slice(Math.max(0,idx-200),idx);
 assert.match(prior,/await refreshHistory\(\);\s*await refreshConversationInventory\(\)/);
 assert.doesNotMatch(html,/45\.0%|4\.0%|underlying model drift:\s*0/);
});
