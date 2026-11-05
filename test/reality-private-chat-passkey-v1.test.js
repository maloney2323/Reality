import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {passkeyAction,STABLE_PASSKEY_PREVIEW_HOST} from '../src/reality-private-chat-passkey-v1.js';
import {establishVerifiedPasskeySession} from '../src/reality-private-chat-auth-v0.1.js';

const ref='abcdefghijklmnopqrst';
const env={
 VERCEL_ENV:'preview', REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:ref,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:'https://'+ref+'.supabase.co/',
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_example',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'a-long-preview-encryption-secret-for-testing',
};
const req=(action,other={})=>({
 method:'POST',body:{action,...other},
 headers:{host:STABLE_PASSKEY_PREVIEW_HOST,origin:'https://'+STABLE_PASSKEY_PREVIEW_HOST,
  'content-type':'application/json','sec-fetch-site':'same-origin'}
});
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v}});
const uuid='ef5e0ecb-b200-4dd7-97be-407217f6f3ee';
const credential={id:'a',rawId:'a',type:'public-key',response:{clientDataJSON:'x'}};
test('passkey registration and authentication require exact stable HTTPS preview origin',async()=>{
 let called=false;
 await assert.rejects(passkeyAction({...req('login-options'),headers:{...req('login-options').headers,host:'some-other-preview.vercel.app'}},res(),{
  env,fetchImpl:async()=>{called=true;throw Error('UNEXPECTED')}
 }),/PASSKEY_USE_STABLE_PREVIEW_ADDRESS/);
 assert.equal(called,false);
 await assert.rejects(passkeyAction({...req('login-options'),headers:{...req('login-options').headers,origin:'https://evil.example'}},res(),{
  env,fetchImpl:async()=>{called=true;throw Error('UNEXPECTED')}
 }),/PASSKEY_SAME_ORIGIN_REQUIRED/);
});
test('passwordless login options are requested from only the isolated Supabase Auth provider',async()=>{
 let url,body,headers;
 const out=await passkeyAction(req('login-options'),res(),{
  env,fetchImpl:async(u,o)=>{url=u;body=o.body;headers=o.headers;return{
   ok:true,json:async()=>({challenge_id:uuid,options:{challenge:'abc'}})
  }}
 });
 assert.equal(url,'https://'+ref+'.supabase.co/auth/v1/passkeys/authentication/options');
 assert.equal(body,'{}');
 assert.equal(headers.apikey,env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY);
 assert.equal(headers.authorization,undefined);
 assert.equal(out.challenge_id,uuid);
});
test('only Supabase verification result creates a protected HttpOnly session cookie',async()=>{
 const response=res();let calls=[];
 const out=await passkeyAction(req('login-verify',{challenge_id:uuid,credential}),response,{
  env,fetchImpl:async(url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/authentication/verify'))return {ok:true,json:async()=>({
      access_token:'very-long-supabase-access-token',
      refresh_token:'very-long-supabase-refresh-token',
      expires_in:3600
    })};
    if(url.endsWith('/user'))return {ok:true,json:async()=>({id:uuid})};
    throw Error('unexpected upstream '+url);
  }
 });
 assert.equal(out.authenticated,true);
 assert.equal(out.user_id,uuid);
 assert.equal(calls.length,2);
 assert.match(response.headers['Set-Cookie'],/HttpOnly/);
 assert.match(response.headers['Set-Cookie'],/Secure/);
 assert.match(response.headers['Set-Cookie'],/SameSite=Lax/);
 assert.match(response.headers['Set-Cookie'],/Max-Age=2592000/);
 assert.equal(JSON.stringify(out).includes('access_token'),false);
});
test('no passkey enrollment without authenticated existing account',async()=>{
 let called=false;
 await assert.rejects(passkeyAction(req('register-options'),res(),{
  env,authSession:async()=>null,fetchImpl:async()=>{called=true;throw Error('UNEXPECTED')}
 }),/PASSKEY_SIGN_IN_FIRST/);
 assert.equal(called,false);
});
test('signed-in enrollment uses server-bound session and verifies credential through Supabase',async()=>{
 let path='';
 const fetchImpl=async(url,opts)=>{
   path=url;
   assert.equal(opts.headers.authorization,'Bearer signed-in-owner-token');
   return {ok:true,json:async()=>({id:uuid})};
 };
 const out=await passkeyAction(req('register-verify',{challenge_id:uuid,credential}),res(),{
  env,authSession:async()=>({access_token:'signed-in-owner-token'}),fetchImpl
 });
 assert.equal(out.passkey_registered,true);
 assert.ok(path.endsWith('/registration/verify'));
});
test('no session from unverified token result',async()=>{
 await assert.rejects(establishVerifiedPasskeySession(res(),{
   access_token:'short',refresh_token:'short',expires_in:3600
 },{env,fetchImpl:async()=>{throw Error('unexpected provider call')}}),/PASSKEY_SESSION_TOKENS_REQUIRED/);
});
test('simple chat passkey buttons invoke the native credential API but never grant work authority',()=>{
 const html=readFileSync(new URL('../reality-chat-simple.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,2);
 for(const script of scripts)assert.doesNotThrow(()=>new Script(script));
 assert.match(html,/id="passkeyLogin"/);
 assert.match(html,/id="passkeyEnroll"/);
 assert.match(scripts[1],/navigator\.credentials\[register\?'create':'get'\]/);
 assert.match(scripts[1],/credentialJSON\(credential\)/);
 assert.doesNotMatch(scripts[1],/localStorage\.setItem|installCapability|dispatchWorker/);
});
