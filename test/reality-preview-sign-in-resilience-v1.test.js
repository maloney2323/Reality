import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loginChat} from '../src/reality-private-chat-auth-v0.1.js';

const env={
 VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://hvkfreoagbrphwghjajw.supabase.co',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_login_fixture',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'test-reality-session-seal-not-real',
};
const request={
 headers:{origin:'https://reality.example',host:'reality.example'},
 body:{email:'user@example.com',password:'correct-test-password'},
};
function response(){
 const headers={};
 return {headers,setHeader(k,v){headers[k]=v;return this;}};
}
function failingProvider(code){
 return async url=>{
  assert.match(url,/\/auth\/v1\/token\?grant_type=password$/);
  return new Response(JSON.stringify({error:'untrusted-secret-provider-error'}),{status:code});
 };
}
async function rejected(code,expectedStatus,expectedCode){
 const res=response();
 await assert.rejects(
  loginChat(request,res,{env,fetchImpl:failingProvider(code)}),
  e=>e.status===expectedStatus&&e.message===expectedCode);
 assert.equal(res.headers['Set-Cookie'],undefined);
}

test('Supabase Auth 500/503/504 outages cannot be reported as an incorrect password',async()=>{
 for(const code of [500,503,504])
  await rejected(code,503,'CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE');
});
test('provider 429 is rate-limit, not an incorrect password',async()=>{
 await rejected(429,429,'CHAT_AUTH_RATE_LIMITED');
});
test('provider explicit invalid email/password remains a 401',async()=>{
 await rejected(400,401,'CHAT_LOGIN_FAILED');
 await rejected(401,401,'CHAT_LOGIN_FAILED');
});
test('a malformed successful auth response does not become an incorrect password',async()=>{
 const res=response();
 await assert.rejects(
  loginChat(request,res,{env,fetchImpl:async()=>new Response('{}',{status:200})}),
  e=>e.status===503&&e.message==='CHAT_AUTH_PROVIDER_RESPONSE_UNVERIFIED');
 assert.equal(res.headers['Set-Cookie'],undefined);
});
test('user identity verification outage after successful password auth is not bad credentials',async()=>{
 const res=response();
 let calls=0;
 const fetchImpl=async url=>{
  calls++;
  if(url.includes('/auth/v1/token'))
   return new Response(JSON.stringify({
    access_token:'access-token-fixture',
    refresh_token:'refresh-token-fixture',
    expires_in:3600,
   }),{status:200});
  assert.match(url,/\/auth\/v1\/user$/);
  return new Response(JSON.stringify({error:'backend-error'}),{status:503});
 };
 await assert.rejects(loginChat(request,res,{env,fetchImpl}),
  e=>e.status===503&&e.message==='CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE');
 assert.equal(calls,2);
 assert.equal(res.headers['Set-Cookie'],undefined);
});
test('successful login still verifies the user and seals an HttpOnly cookie',async()=>{
 const res=response();
 let calls=0;
 const fetchImpl=async (url,opts)=>{
  calls++;
  if(url.includes('/auth/v1/token')){
   assert.equal(opts.method,'POST');
   assert.equal(JSON.parse(opts.body).password,'correct-test-password');
   return new Response(JSON.stringify({
    access_token:'access-token-fixture',
    refresh_token:'refresh-token-fixture',
    expires_in:3600,
   }),{status:200});
  }
  assert.match(url,/\/auth\/v1\/user$/);
  assert.equal(opts.headers.authorization,'Bearer access-token-fixture');
  return new Response(JSON.stringify({id:'owner-identity-fixture'}),{status:200});
 };
 const result=await loginChat(request,res,{env,fetchImpl});
 assert.equal(result.authenticated,true);
 assert.equal(result.user_id,'owner-identity-fixture');
 assert.equal(calls,2);
 assert.match(res.headers['Set-Cookie'],/HttpOnly/);
 assert.match(res.headers['Set-Cookie'],/Secure/);
 assert.doesNotMatch(res.headers['Set-Cookie'],/correct-test-password|access-token-fixture/);
});
test('account login includes accessible eye toggle, Enter submission and outage-specific messaging',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="privatePasswordToggle"[^>]+type="button"/);
 assert.match(html,/aria-label="Show password"/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(html,/aria-controls="privatePassword"/);
 assert.match(html,/input id="privatePassword" type="password"/);
 assert.match(html,/function setPrivatePasswordVisibility\(visible\)/);
 assert.match(html,/password\.type=visible\?'text':'password'/);
 assert.match(html,/event\.key==='Enter'/);
 assert.match(html,/AbortSignal\.timeout\(30000\)/);
 assert.match(html,/CHAT_AUTH_PROVIDER_TEMPORARILY_UNAVAILABLE/);
 assert.match(html,/This does not mean your password is wrong/);
});
