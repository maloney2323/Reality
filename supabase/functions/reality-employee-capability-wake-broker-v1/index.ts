// Reality's separate, service-authenticated CAPABILITY WAKE DELIVERY broker.
// Only a currently authorized, source-matched, not-settled original job that
// has already entered the Genuine Capability Engine may be woken.
// This is NOT the approved-upgrade broker, a model agent, or an installer.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const PROOF=/^sha256:[a-f0-9]{64}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const refuse=(x:string):never=>{throw Error('RILEY_BROKER_'+x)};
const respond=(code:number,data:Record<string,unknown>)=>new Response(
 JSON.stringify(data),{status:code,headers:{
  'content-type':'application/json','cache-control':'no-store',
  'x-content-type-options':'nosniff'}});
const facts={worker_acknowledged:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 no_new_job_created:true};
function same(a:string,b:string){
 if(a.length!==b.length)return false;
 let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);
 return z===0;
}
function config(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||key.length<25)
  refuse('ISOLATED_DATABASE_CONFIG_REQUIRED');
 return {url,key,token};
}
async function rpc(body:Record<string,unknown>,config:{url:string;key:string}){
 const r=await fetch(config.url+'/rest/v1/rpc/reality_read_shift_capability_wake_v1',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:config.key,authorization:'Bearer '+config.key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!r.ok)refuse('SERVICE_ONLY_EXACT_READBACK_UNAVAILABLE');
 const value=await r.json().catch(()=>null);
 if(!value||Array.isArray(value)||typeof value!=='object')
  refuse('EXACT_READBACK_INVALID');
 return value;
}
async function github(path:string,token:string,method='GET',body:unknown=undefined):Promise<any>{
 if(token.length<25)refuse('SCOPED_DELIVERY_CREDENTIAL_UNAVAILABLE');
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'content-type':'application/json','x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Source-Bound-Capability-Delivery-v1'},
  body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(12000)});
 if(r.status===404&&method==='GET')return null;
 if(!r.ok)refuse('GITHUB_DELIVERY_EFFECT_OR_READBACK_UNCERTAIN');
 return await r.json().catch(()=>refuse('GITHUB_DELIVERY_JSON_INVALID'));
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return respond(405,{ok:false,...facts,
   status:'BROKER_POST_ONLY'});
  const configValue=config();
  const a=req.headers.get('apikey')||'';
  const b=req.headers.get('authorization')||'';
  if(!same(a,configValue.key)||!same(b,'Bearer '+configValue.key))
   return respond(403,{ok:false,...facts,status:'BROKER_SERVICE_AUTH_REQUIRED'});
  if(req.headers.get('content-type')!=='application/json')
   return respond(415,{ok:false,...facts,status:'BROKER_JSON_REQUIRED'});
  const raw=await req.text();
  if(raw.length<60||raw.length>700)
   return respond(400,{ok:false,...facts,status:'BROKER_EXACT_SOURCE_REQUIRED'});
  const request=JSON.parse(raw);
  if(!request||Array.isArray(request)||typeof request!=='object'||
   Object.keys(request).sort().join(',')!==
    'original_work_id,shift_id,source_proof_sha256,source_ref,trigger_id'||
   !UUID.test(request.shift_id)||!UUID.test(request.trigger_id)||
   !WORK.test(request.original_work_id)||
   !PROOF.test(request.source_proof_sha256)||!ISSUE.test(request.source_ref))
   return respond(400,{ok:false,...facts,status:'BROKER_SOURCE_SCOPE_REJECTED'});
  const item=await rpc({
   p_shift_id:request.shift_id,p_original_work_id:request.original_work_id,
   p_trigger_id:request.trigger_id
  },configValue);
  if(item.status==='NO_ELIGIBLE_SHIFT_CAPABILITY_WAKE')
   return respond(200,{ok:true,...facts,status:'NO_ELIGIBLE_CAPABILITY_WAKE'});
  if(item.status!=='EXACT_SHIFT_CAPABILITY_WAKE_ELIGIBLE'||
   item.shift_id!==request.shift_id||
   item.trigger_id!==request.trigger_id||
   item.original_work_id!==request.original_work_id||
   item.source_ref!==request.source_ref||
   item.source_proof_sha256!==request.source_proof_sha256||
   !UUID.test(item.source_event_id||'')||
   item.existing_job_only!==true||
   item.installation_authorized!==false||
   item.original_job_completed!==false||
   item.production_changed!==false)
   refuse('EXACT_OWNER_GOAL_SOURCE_AND_GAP_CHANGED');
  // Source-bound, deterministic GitHub trigger. Retry reads the same bytes
  // before writing. Existing Reality worker independently leases and verifies
  // the original job; a commit is NOT a worker acknowledgment.
  const id=String(item.trigger_id);
  const path='reality-genuine-triggers/'+id+'.json';
  const bytes=JSON.stringify({trigger_id:id,
   source_event_id:item.source_event_id,
   original_work_id:item.original_work_id},null,2)+'\n';
  const branch=await github('/git/ref/heads/'+BRANCH,configValue.token);
  if(!SHA.test(String(branch?.object?.sha||'')))
   refuse('PINNED_ISOLATED_WORKER_BRANCH_INVALID');
  const check=async()=>{
   const x=await github('/contents/'+path+'?ref='+encodeURIComponent(BRANCH),
    configValue.token);
   if(!x)return false;
   if(x.path!==path||atob(String(x.content||'').replace(/\s/g,''))!==bytes)
    refuse('EXISTING_DELIVERY_CONTENT_CHANGED');
   return true;
  };
  const existing=await check();
  if(!existing){
   const c=await github('/contents/'+path,configValue.token,'PUT',{
    branch:BRANCH,content:btoa(bytes),
    message:'Reality: wake exact existing capability '+id});
   if(!SHA.test(String(c?.commit?.sha||''))||c?.content?.path!==path)
    refuse('PROVIDER_WAKE_COMMIT_UNVERIFIED');
  }
  if(!(await check()))refuse('INDEPENDENT_GITHUB_DELIVERY_READBACK_FAILED');
  return respond(200,{ok:true,...facts,
   status:'EXISTING_CAPABILITY_WAKE_TRANSPORT_CONFIRMED',
   existing_idempotent_delivery:existing});
 }catch(error){
  const code=String(error instanceof Error?error.message:'UNKNOWN');
  if(/^RILEY_BROKER_[A-Z0-9_]{4,110}$/.test(code))
   console.warn('REALITY_CAPABILITY_DELIVERY',code);
  return respond(503,{ok:false,...facts,
   status:'BROKER_DELIVERY_REQUIRES_RECONCILIATION'});
 }
});
