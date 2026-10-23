// Preview-only browser session persistence. Tokens remain in this browser's origin;
// server-side service credentials and authority are NEVER stored here.
export const REALITY_PREVIEW_SESSION_KEY='reality-standalone-preview-session-v1';

export function createPreviewSession({
  getConfig, storage, fetchImpl=fetch, now=()=>Date.now(), onToken=()=>{},
}={}){
  if(typeof getConfig!=='function'||!storage)throw Error('PREVIEW_SESSION_SETUP_REQUIRED');
  let current=null, inFlight=null;
  const read=()=>{
    try{
      const value=JSON.parse(storage.getItem(REALITY_PREVIEW_SESSION_KEY)||'null');
      return value&&typeof value.access_token==='string'&&
        typeof value.refresh_token==='string'&&Number.isFinite(value.expires_at)
        ?value:null;
    }catch{return null;}
  };
  const clear=()=>{
    current=null;storage.removeItem(REALITY_PREVIEW_SESSION_KEY);onToken(null);
  };
  const remember=(data)=>{
    if(typeof data?.access_token!=='string'||!data.access_token||
       typeof data?.refresh_token!=='string'||!data.refresh_token)
      throw Error('PREVIEW_REFRESHABLE_SESSION_REQUIRED');
    const expiresAt=Number(data.expires_at)>1000000000
      ?Number(data.expires_at)*1000
      :now()+Math.max(10,Number(data.expires_in)||3600)*1000;
    current={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:expiresAt};
    storage.setItem(REALITY_PREVIEW_SESSION_KEY,JSON.stringify(current));
    onToken(current.access_token);
    return current;
  };
  const verify=async token=>{
    const {auth_url,publishable_key}=await getConfig();
    const response=await fetchImpl(auth_url+'/auth/v1/user',{
      method:'GET',cache:'no-store',redirect:'error',
      headers:{apikey:publishable_key,Authorization:'Bearer '+token},
    });
    if(!response.ok){
      const e=Error('PREVIEW_SESSION_VERIFICATION_FAILED');
      e.invalid=response.status===401||response.status===403;
      throw e;
    }
    const user=await response.json().catch(()=>null);
    if(!user?.id||user.is_anonymous===true)throw Error('PREVIEW_USER_NOT_AUTHENTICATED');
    return user;
  };
  async function refresh(){
    if(inFlight)return inFlight;
    inFlight=(async()=>{
      // Refresh tokens rotate: always read the latest copy in this origin.
      const latest=read()||current;
      if(!latest?.refresh_token){clear();return null;}
      if(latest.access_token!==current?.access_token&&latest.expires_at>now()+90000){
        await verify(latest.access_token);
        current=latest;onToken(latest.access_token);return latest.access_token;
      }
      const {auth_url,publishable_key}=await getConfig();
      let response;
      try{
        response=await fetchImpl(auth_url+'/auth/v1/token?grant_type=refresh_token',{
          method:'POST',cache:'no-store',redirect:'error',
          headers:{apikey:publishable_key,'Content-Type':'application/json'},
          body:JSON.stringify({refresh_token:latest.refresh_token}),
        });
      }catch{throw Error('PREVIEW_AUTH_NETWORK_UNAVAILABLE');}
      if(!response.ok){
        // Another tab may have rotated the refresh token while this call was running.
        const updated=read();
        if(updated&&updated.refresh_token!==latest.refresh_token){
          await verify(updated.access_token);
          current=updated;onToken(updated.access_token);return updated.access_token;
        }
        if(response.status===400||response.status===401||response.status===403){
          clear();throw Error('PREVIEW_SESSION_EXPIRED_SIGN_IN_AGAIN');
        }
        throw Error('PREVIEW_AUTH_PROVIDER_UNAVAILABLE');
      }
      const updated=await response.json();
      // Save the rotated refresh token even if verification subsequently fails
      // transiently, to avoid losing the one-use token on a network failure.
      remember(updated);
      await verify(updated.access_token);
      return updated.access_token;
    })();
    try{return await inFlight}finally{inFlight=null}
  }
  async function restore(){
    current=read();
    if(!current){onToken(null);return false;}
    try{
      if(current.expires_at<=now()+90000) {
        return Boolean(await refresh());
      }
      await verify(current.access_token);
      onToken(current.access_token);return true;
    }catch(e){
      if(e.invalid||e.message==='PREVIEW_SESSION_EXPIRED_SIGN_IN_AGAIN'||
         e.message==='PREVIEW_USER_NOT_AUTHENTICATED')clear();
      throw e;
    }
  }
  async function accept(data){
    if(!data?.access_token||!data?.refresh_token)
      throw Error('PREVIEW_REFRESHABLE_SESSION_REQUIRED');
    await verify(data.access_token);
    remember(data);return true;
  }
  async function accessToken(){
    if(!current) {
      const ok=await restore();
      if(!ok)throw Error('PREVIEW_SIGN_IN_REQUIRED');
    }
    if(current.expires_at<=now()+90000)return refresh();
    return current.access_token;
  }
  async function signOut(){
    const token=current?.access_token;
    let revoked=false;
    try{
      if(token){
        const {auth_url,publishable_key}=await getConfig();
        const res=await fetchImpl(auth_url+'/auth/v1/logout',{
          method:'POST',cache:'no-store',redirect:'error',
          headers:{apikey:publishable_key,Authorization:'Bearer '+token},
        });
        revoked=res.ok;
      }
    }finally{clear();}
    return {local_session_cleared:true,provider_logout_confirmed:revoked};
  }
  return Object.freeze({accept,restore,accessToken,refresh,signOut,clear});
}
