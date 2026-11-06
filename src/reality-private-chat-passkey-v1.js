// Preview-only passkey adapter for the existing HttpOnly Supabase Chat session.
// The Supabase Auth server verifies WebAuthn signatures; Reality never receives biometric data.
// NOTE: Supabase Auth passkeys must first be enabled for the isolated project,
// with RP ID and origin matching the durable preview host.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin,establishVerifiedPasskeySession} from './reality-private-chat-auth-v0.1.js';

export const STABLE_PASSKEY_PREVIEW_HOST='reality-git-fix-reality-chat-09c073-maloney2323-5310s-projects.vercel.app';
const VALID=new Set(['register-options','register-verify','login-options','login-verify']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(code,status=400){const e=new Error(code);e.status=status;throw e}
function requireStableOrigin(req,env){
  const host=String(req.headers?.host||'').toLowerCase();
  const rp=String(env.REALITY_PASSKEY_RP_ID||STABLE_PASSKEY_PREVIEW_HOST).toLowerCase();
  if(!rp||!rp.endsWith('.vercel.app')||host!==rp)
    fail('PASSKEY_USE_STABLE_PREVIEW_ADDRESS',409);
  if(req.headers?.origin!=='https://'+rp||req.headers?.['sec-fetch-site']==='cross-site')
    fail('PASSKEY_SAME_ORIGIN_REQUIRED',403);
  assertSameOrigin(req);
}
function credentialBody(req){
  const challenge_id=req.body?.challenge_id,credential=req.body?.credential;
  if(typeof challenge_id!=='string'||!UUID.test(challenge_id)||
    !credential||typeof credential!=='object'||Array.isArray(credential)||
    credential.type!=='public-key'||typeof credential.id!=='string'||
    credential.id.length>4096||typeof credential.rawId!=='string'||
    typeof credential.response!=='object'||!credential.response||
    JSON.stringify(credential).length>22000)
    fail('PASSKEY_CREDENTIAL_INVALID',400);
  return {challenge_id,credential};
}
async function authCall(c,route,{token,body={},fetchImpl=fetch}={}){
  const response=await fetchImpl(c.url+'/auth/v1/passkeys/'+route,{
    method:'POST',
    headers:{apikey:c.key,'content-type':'application/json',
      ...(token?{authorization:'Bearer '+token}:{})},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(12000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const code=String(data?.code||data?.error_code||data?.error||'PASSKEY_PROVIDER_UNAVAILABLE');
    fail(code,response.status===429?429:response.status===401?401:
      response.status>=500?503:400);
  }
  if(!data||typeof data!=='object')fail('PASSKEY_PROVIDER_INVALID_RESPONSE',503);
  return data;
}
export async function passkeyAction(req,res,{env=process.env,fetchImpl=fetch,authSession=authenticatedChatSession}={}){
  if(req.method!=='POST')fail('PASSKEY_POST_REQUIRED',405);
  if(!String(req.headers?.['content-type']||'').includes('application/json'))
    fail('PASSKEY_JSON_REQUIRED',415);
  const c=privateChatConfig(env);
  requireStableOrigin(req,env);
  const action=req.body?.action;
  if(!VALID.has(action))fail('PASSKEY_ACTION_INVALID',400);
  const register=action.startsWith('register-');
  const session=register?await authSession(req,res,{env,fetchImpl}):null;
  if(register&&!session)fail('PASSKEY_SIGN_IN_FIRST',401);
  if(action==='register-options'){
    const data=await authCall(c,'registration/options',{token:session.access_token,fetchImpl});
    if(!UUID.test(data.challenge_id||'')||!data.options)
      fail('PASSKEY_REGISTRATION_OPTIONS_INVALID',503);
    return {ok:true,challenge_id:data.challenge_id,options:data.options};
  }
  if(action==='login-options'){
    const data=await authCall(c,'authentication/options',{fetchImpl});
    if(!UUID.test(data.challenge_id||'')||!data.options)
      fail('PASSKEY_AUTHENTICATION_OPTIONS_INVALID',503);
    return {ok:true,challenge_id:data.challenge_id,options:data.options};
  }
  const body=credentialBody(req);
  if(action==='register-verify'){
    const saved=await authCall(c,'registration/verify',{
      token:session.access_token,body,fetchImpl});
    if(typeof saved.id!=='string'||!UUID.test(saved.id))
      fail('PASSKEY_REGISTRATION_UNVERIFIED',503);
    return {ok:true,passkey_registered:true};
  }
  const signed=await authCall(c,'authentication/verify',{body,fetchImpl});
  const verified=await establishVerifiedPasskeySession(res,signed,{env,fetchImpl});
  return {ok:true,authenticated:true,user_id:verified.user_id};
}
