// Preview-only server-side Supabase Auth. No provider secrets reach client or LLM.
import crypto from 'node:crypto';
export const CHAT_COOKIE='reality_private_chat';
function fail(code,status=401){const e=new Error(code);e.status=status;throw e}
export function privateChatConfig(env=process.env){
 if(env.VERCEL_ENV!=='preview')fail('PRIVATE_CHAT_PREVIEW_ONLY',404);
 const ref=String(env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||'');
 let url;try{url=new URL(String(env.REALITY_PERSONAL_CHAT_SUPABASE_URL||''))}catch{fail('CHAT_SUPABASE_URL_REQUIRED',503)}
 if(!/^[a-z0-9]{20}$/.test(ref)||url.origin!=='https://'+ref+'.supabase.co'||
    url.pathname!=='/'||url.search||url.hash)fail('CHAT_DATABASE_PROJECT_MISMATCH',503);
 const key=String(env.REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY||'');
 const seal=String(env.REALITY_CHAT_RECEIPT_HMAC_KEY||'');
 if(!key.startsWith('sb_publishable_')||seal.length<16)fail('CHAT_AUTH_CONFIG_MISSING',503);
 return {url:url.origin,key,seal};
}
function aesKey(secret){return crypto.createHash('sha256').update('reality-private-chat-v1:'+secret).digest()}
function encrypt(state,secret){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',aesKey(secret),iv);
 const payload=Buffer.concat([cipher.update(JSON.stringify(state),'utf8'),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),payload]).toString('base64url');
}
function decrypt(value,secret){
 try{
  const b=Buffer.from(String(value||''),'base64url');
  if(b.length<30||b.length>5500)throw Error('SIZE');
  const d=crypto.createDecipheriv('aes-256-gcm',aesKey(secret),b.subarray(0,12));
  d.setAuthTag(b.subarray(12,28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8'));
 }catch{return null}
}
function tokenCookie(req){
 const item=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(CHAT_COOKIE+'='));
 if(!item)return null;try{return decodeURIComponent(item.slice(CHAT_COOKIE.length+1))}catch{return null}
}
function setCookie(res,state,secret){
 const value=encrypt(state,secret);
 if(value.length>3850)fail('CHAT_SESSION_COOKIE_TOO_LARGE',503);
 res.setHeader('Set-Cookie',CHAT_COOKIE+'='+encodeURIComponent(value)+'; Path=/api/reality; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000');
 res.setHeader('Cache-Control','no-store');
}
export function clearChatCookie(res){
 res.setHeader('Set-Cookie',CHAT_COOKIE+'=; Path=/api/reality; Secure; HttpOnly; SameSite=Lax; Max-Age=0');
 res.setHeader('Cache-Control','no-store');
}
async function provider(config,route,{method='GET',body,token,fetchImpl=fetch}={}){
 const response=await fetchImpl(config.url+'/auth/v1/'+route,{
  method,headers:{apikey:config.key,...(token?{authorization:'Bearer '+token}:{}),
   ...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
 });
 return {ok:response.ok,status:response.status,body:await response.json().catch(()=>null)};
}
export function assertSameOrigin(req){
 const origin=req.headers?.origin,host=req.headers?.host;
 if(origin){
  let source;try{source=new URL(origin)}catch{fail('CROSS_ORIGIN_CHAT_REQUEST_REJECTED',403)}
  if(typeof host!=='string'||source.host!==host||source.protocol!=='https:')fail('CROSS_ORIGIN_CHAT_REQUEST_REJECTED',403);
 }
}
export async function loginChat(req,res,{fetchImpl=fetch,env=process.env}={}){
 assertSameOrigin(req);
 const c=privateChatConfig(env);
 const email=String(req.body?.email||'').trim(),password=req.body?.password;
 if(!email||email.length>254||typeof password!=='string'||password.length<1||password.length>1024)
  fail('CHAT_EMAIL_PASSWORD_REQUIRED',400);
 const signed=await provider(c,'token?grant_type=password',{method:'POST',body:{email,password},fetchImpl});
 if(!signed.ok||!signed.body?.access_token||!signed.body?.refresh_token)
  fail('CHAT_LOGIN_FAILED',signed.status===429?429:401);
 const user=await provider(c,'user',{token:signed.body.access_token,fetchImpl});
 if(!user.ok||!user.body?.id)fail('CHAT_LOGIN_IDENTITY_UNVERIFIED',401);
 const now=Date.now();
 setCookie(res,{access:signed.body.access_token,refresh:signed.body.refresh_token,
  expires:now+Math.min(86400,Number(signed.body.expires_in)||3600)*1000},c.seal);
 return {authenticated:true,user_id:user.body.id};
}
export async function authenticatedChatSession(req,res,{fetchImpl=fetch,env=process.env}={}){
 const c=privateChatConfig(env);
 const state=decrypt(tokenCookie(req),c.seal);
 if(!state||typeof state.access!=='string'||typeof state.refresh!=='string'||
   !Number.isFinite(state.expires))return null;
 let token=state.access,refresh=state.refresh,expires=state.expires;
 if(expires<=Date.now()+60000){
  const next=await provider(c,'token?grant_type=refresh_token',
   {method:'POST',body:{refresh_token:refresh},fetchImpl});
  if(!next.ok||!next.body?.access_token||!next.body?.refresh_token){
   clearChatCookie(res);return null;
  }
  token=next.body.access_token;refresh=next.body.refresh_token;
  expires=Date.now()+Math.min(86400,Number(next.body.expires_in)||3600)*1000;
  setCookie(res,{access:token,refresh,expires},c.seal);
 }
 const user=await provider(c,'user',{token,fetchImpl});
 if(!user.ok||!user.body?.id){clearChatCookie(res);return null}
 return {user_id:user.body.id,access_token:token,config:c};
}
export async function logoutChat(req,res,{fetchImpl=fetch,env=process.env}={}){
 assertSameOrigin(req);
 let session=null;try{session=await authenticatedChatSession(req,res,{fetchImpl,env})}catch{}
 if(session)await provider(session.config,'logout',{method:'POST',token:session.access_token,fetchImpl}).catch(()=>null);
 clearChatCookie(res);
 return {authenticated:false};
}
