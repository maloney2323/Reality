import test from 'node:test';
import assert from 'node:assert/strict';
import {loginChat,authenticatedChatSession,logoutChat,CHAT_COOKIE}
 from '../src/reality-private-chat-auth-v0.1.js';
const env={
 VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_fixture_only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'a-long-fixture-only-encryption-key-not-production'
};
function response(){
 const headers={};
 return {headers,setHeader:(key,value)=>{headers[key]=value},status:()=>({json:()=>{}})};
}
const request=(cookie,body)=>({
 method:'GET',headers:{host:'reality-test.vercel.app',
  ...(cookie?{cookie}:{}),
  ...(body?{origin:'https://reality-test.vercel.app'}:{})},
 body
});
function provider({refreshStatus=200,userStatus=200,logout=false}={}){
 const calls=[];
 return {calls,fetch:async (url,opts={})=>{
   const path=new URL(url).pathname,method=opts.method||'GET';
   calls.push({path,method});
   if(path==='/auth/v1/token'){
     const isRefresh=new URL(url).searchParams.get('grant_type')==='refresh_token';
     if(isRefresh && refreshStatus!==200)
       return new Response('{}',{status:refreshStatus});
     return new Response(JSON.stringify({
       access_token:'fixture-access',refresh_token:'fixture-refresh',
       expires_in:isRefresh?3600:1}),{status:200});
   }
   if(path==='/auth/v1/user')
     return new Response(userStatus===200?JSON.stringify({id:'85eeae0b-2988-43c4-b20c-590fb51da70d'}):'{}',
      {status:userStatus});
   if(path==='/auth/v1/logout')return new Response('{}',{status:200});
   throw Error('UNEXPECTED_FIXTURE_ROUTE');
 }};
}
async function login(){
 const res=response(),p=provider();
 const owner=await loginChat(request(null,{email:'demo@example.com',password:'correct'}),res,{fetchImpl:p.fetch,env});
 return {owner,cookie:res.headers['Set-Cookie'].split(';')[0]};
}
test('signed-in cookie survives page close, includes 30-day retention and refreshes on return',async()=>{
 const signed=await login();
 assert.equal(signed.owner.authenticated,true);
 const r=response(),p=provider();
 const user=await authenticatedChatSession(request(signed.cookie),r,{fetchImpl:p.fetch,env});
 assert.equal(user.user_id,signed.owner.user_id);
 assert.ok(p.calls.some(c=>c.path==='/auth/v1/token'));
 assert.ok(r.headers['Set-Cookie'].includes('HttpOnly; SameSite=Lax; Max-Age=2592000'));
 assert.doesNotMatch(r.headers['Set-Cookie'],/fixture-access|fixture-refresh/);
});
test('temporary provider 503 does not erase a previously authenticated session cookie',async()=>{
 const signed=await login(),r=response(),p=provider({refreshStatus:503});
 await assert.rejects(
   authenticatedChatSession(request(signed.cookie),r,{fetchImpl:p.fetch,env}),
   /CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/
 );
 assert.equal(r.headers['Set-Cookie'],undefined);
 const recovery=response(),healthy=provider();
 const user=await authenticatedChatSession(request(signed.cookie),recovery,
   {fetchImpl:healthy.fetch,env});
 assert.equal(user.user_id,signed.owner.user_id);
});
test('rejected refresh clears cookie; explicit logout always ends account session',async()=>{
 const signed=await login(),r=response(),p=provider({refreshStatus:401});
 const user=await authenticatedChatSession(request(signed.cookie),r,{fetchImpl:p.fetch,env});
 assert.equal(user,null);
 assert.match(r.headers['Set-Cookie'],/Max-Age=0/);
 const signed2=await login(),out=response(),healthy=provider();
 const result=await logoutChat(request(signed2.cookie),out,{fetchImpl:healthy.fetch,env});
 assert.equal(result.authenticated,false);
 assert.match(out.headers['Set-Cookie'],new RegExp(CHAT_COOKIE+'=;'));
 assert.match(out.headers['Set-Cookie'],/Max-Age=0/);
 assert.ok(healthy.calls.some(c=>c.path==='/auth/v1/logout'));
});
test('no cookie means no session; never grants server worker authority',async()=>{
 const r=response(),p=provider();
 assert.equal(await authenticatedChatSession(request(),r,{fetchImpl:p.fetch,env}),null);
 assert.equal(p.calls.length,0);
});
