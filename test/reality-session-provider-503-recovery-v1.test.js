import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loginChat,authenticatedChatSession}
 from '../src/reality-private-chat-auth-v0.1.js';

const env={
 VERCEL_ENV:'preview',REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_fixture_only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'fixture-session-sealing-only-never-production'
};
const req=(cookie,body)=>({headers:{host:'reality-preview.vercel.app',
 ...(cookie?{cookie}:{}),...(body?{origin:'https://reality-preview.vercel.app'}:{})},body});
function res(){
 const h={};return{headers:h,setHeader:(k,v)=>{h[k]=v}};
}
function provider({tokenStatus=200,userStatus=200}={}){
 return async(url,options)=>{
  const u=new URL(url),route=u.pathname;
  assert.ok(options.signal instanceof AbortSignal,'provider calls remain bounded');
  assert.equal(options.headers.apikey,env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY);
  if(route.endsWith('/token')){
   return new Response(tokenStatus===200?JSON.stringify({
    access_token:'signed-access-fixture',refresh_token:'signed-refresh-fixture',expires_in:3600
   }):'{}',{status:tokenStatus});
  }
  if(route.endsWith('/user'))
   return new Response(userStatus===200?
    JSON.stringify({id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611'}):'{}',
    {status:userStatus});
  throw Error('UNKNOWN_AUTH_FIXTURE_ROUTE');
 };
}
test('Supabase provider 504 is a service outage, never bad owner credentials',async()=>{
 const reply=res();
 await assert.rejects(loginChat(req(null,{email:'owner@example.com',password:'correct'}),reply,{
  env,fetchImpl:provider({tokenStatus:504})}),/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.equal(reply.headers['Set-Cookie'],undefined);
});
test('a 504 after valid email/password must not establish an unverified identity',async()=>{
 const reply=res();
 await assert.rejects(loginChat(req(null,{email:'owner@example.com',password:'correct'}),reply,{
  env,fetchImpl:provider({userStatus:504})}),/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.equal(reply.headers['Set-Cookie'],undefined);
 const recovered=res();
 const signed=await loginChat(req(null,{email:'owner@example.com',password:'correct'}),recovered,{
  env,fetchImpl:provider()});
 assert.equal(signed.authenticated,true);
 const cookie=recovered.headers['Set-Cookie'].split(';')[0];
 assert.equal((await authenticatedChatSession(req(cookie),res(),{
  env,fetchImpl:provider()
 })).user_id,signed.user_id);
});
test('a dead Supabase Auth socket does not destroy a previously sealed identity cookie',async()=>{
 const ok=res();
 await loginChat(req(null,{email:'owner@example.com',password:'correct'}),ok,{
  env,fetchImpl:provider()});
 const cookie=ok.headers['Set-Cookie'].split(';')[0];
 const verify=res();
 await assert.rejects(authenticatedChatSession(req(cookie),verify,{
  env,fetchImpl:async()=>{throw Error('temporary provider network outage') }
 }),/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.equal(verify.headers['Set-Cookie'],undefined);
});
test('session 503 must show Reality sign-in fields instead of trapping owners behind retry',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../src/reality-private-chat-auth-v0.1.js',import.meta.url),'utf8');
 const api=readFileSync(new URL('../api/reality/personal-session.js',import.meta.url),'utf8');
 assert.match(html,/const loginAlreadyVisible=el\('privateLogin'\)\.style\.display==='block'/);
 assert.match(html,/if\(!loginAlreadyVisible\)el\('privateLogin'\)\.style\.display='none'/);
 assert.match(html,/el\('privateLogin'\)\.style\.display='block';\s*el\('privateReady'\)\.style\.display='none'/);
 assert.match(html,/You can try your existing Reality sign-in below or retry the connection/);
 assert.match(html,/signal:AbortSignal\.timeout\(23500\)/);
 assert.match(html,/signal:AbortSignal\.timeout\(40000\)/);
 assert.match(api,/REALITY_PREVIEW_SESSION_READBACK_FAILED/);
 assert.match(api,/export const maxDuration=45/);
 assert.match(auth,/signal:AbortSignal\.timeout\(16500\)/);
 assert.match(auth,/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.doesNotMatch(api,/authenticated:true/);
});
