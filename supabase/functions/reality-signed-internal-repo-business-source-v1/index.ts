// Actual GitHub source transport for the already-signed Reality worker.
// Uses the existing isolated Supabase Edge BROKER credential, never exports
// it to Vercel/Chat/LLM. Service-authenticated and owner-source scoped.
// This is INTERNAL operational evidence; NO business/customer job admitted.
const PROJECT='hvkfreoagbrphwghjajw'; // isolating trust anchor, NOT customer/job ID
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REPO=/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/;
const REF=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/(issues|pull)\/([1-9][0-9]*)$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
const err=(code:string):never=>{throw Error('INTERNAL_BUSINESS_PROVIDER_'+code)};
const result=(code:number,status:string,extra:Record<string,unknown>={})=>
 new Response(JSON.stringify({
  ok:code===200,status,...extra,
  customer_source_connection_verified:false,
  business_original_admitted:false,model_execution_authorized:false,
  owner_approval_granted:false,original_customer_job_completed:false,
  new_shift_started:false,installation_authorized:false,
  production_changed:false
 }),{status:code,headers:{'cache-control':'no-store',
  'content-type':'application/json','x-content-type-options':'nosniff'}});
const same=(a:string,b:string)=>{
 if(a.length!==b.length)return false;
 let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);
 return z===0;
};
function env(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const github=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||key.length<25||github.length<25)
  err('ISOLATED_EXISTING_BROKER_CREDENTIAL_NOT_AVAILABLE');
 return {url,key,github};
}
async function rpc(c:{url:string;key:string},fn:string,payload:Record<string,unknown>){
 if(!['reality_read_next_signed_internal_repo_business_source_v1',
  'reality_record_signed_internal_repo_provider_proof_v1'].includes(fn))
  err('SOURCE_RPC_NOT_REGISTERED');
 const r=await fetch(c.url+'/rest/v1/rpc/'+fn,{
  method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(10000),
  headers:{apikey:c.key,authorization:'Bearer '+c.key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload)});
 if(!r.ok)err('OWNER_SIGNED_DB_SCOPE_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||typeof d!=='object'||Array.isArray(d))
  err('OWNER_SIGNED_DB_RESPONSE_UNVERIFIED');
 return d;
}
async function source(c:{github:string},ref:string,repo:string){
 const m=REF.exec(ref);
 if(!m||m[1]+'/'+m[2]!==repo)err('EXACT_SIGNED_SOURCE_REPO_MISMATCH');
 const [,owner,slug,kind,n]=m;
 const base='https://api.github.com/repos/'+owner+'/'+slug;
 const url=base+'/'+(kind==='issues'?'issues/':'pulls/')+n;
 const r=await fetch(url,{method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(9000),
  headers:{authorization:'Bearer '+c.github,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Signed-Internal-Source-Readback/1.0'}});
 if(!r.ok)err('CURRENT_GITHUB_PROVIDER_READ_UNAVAILABLE');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x)||
  x.number!==Number(n)||x.html_url!==ref||x.state!=='open'||
  (kind==='issues'?x.repository_url!==base||Boolean(x.pull_request):
   x.base?.repo?.full_name!==repo)||
  typeof x.title!=='string'||!x.title.trim()||x.title.length>500||
  (x.body!==null&&typeof x.body!=='string')||
  String(x.body||'').length>120000||
  !Number.isFinite(Date.parse(x.updated_at||''))||
  Date.parse(x.updated_at)>Date.now()+120000)
  err('EXACT_PROVIDER_ORIGINAL_SOURCE_DRIFT');
 const evidence={
  source_ref:ref,source_title:x.title,current_state:x.state,
  provider_updated_at:x.updated_at,
  source_body:String(x.body||'').slice(0,9000)
 };
 const h=await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(JSON.stringify(evidence)));
 const digest='sha256:'+Array.from(new Uint8Array(h))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
 return {...evidence,provider_proof_sha256:digest};
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')
   return result(405,'INTERNAL_BUSINESS_BROKER_POST_ONLY');
  const c=env();
  if(!same(req.headers.get('apikey')||'',c.key)||
   !same(req.headers.get('authorization')||'','Bearer '+c.key))
   return result(403,'INTERNAL_BUSINESS_BROKER_SERVICE_ROLE_AUTH_REQUIRED');
  if(req.headers.get('content-type')!=='application/json')
   return result(415,'INTERNAL_BUSINESS_BROKER_JSON_ONLY');
  const body=await req.text();
  if(body.length<70||body.length>350)
   return result(400,'INTERNAL_BUSINESS_BROKER_EXACT_REQUEST_REQUIRED');
  const b=JSON.parse(body);
  if(!b||Array.isArray(b)||typeof b!=='object'||
   Object.keys(b).sort().join(',')!=='mode,repository_full_name,worker_run_id'||
   b.mode!=='source_reobserve'||!UUID.test(b.worker_run_id||'')||
   !REPO.test(b.repository_full_name||''))
   return result(400,'INTERNAL_BUSINESS_BROKER_SIGNED_SOURCE_SCOPE_REQUIRED');
  const scope=await rpc(c,'reality_read_next_signed_internal_repo_business_source_v1',{
   p_worker_run_id:b.worker_run_id,p_repo_full_name:b.repository_full_name});
  if(scope.status==='NO_DUE_SIGNED_INTERNAL_PROVIDER_BUSINESS_SOURCE'&&
   scope.model_execution_authorized===false&&scope.new_shift_started===false)
   return result(200,scope.status,{internal_source_provider_readback_verified:false});
  if(scope.status!=='SIGNED_OWNER_INTERNAL_PROVIDER_SOURCE_SELECTED'||
   scope.worker_run_id!==b.worker_run_id||
   !UUID.test(scope.owner_id||'')||
   !ROUTE.test(scope.continuity_ref||'')||
   scope.intake_family!=='EMPLOYEE_SCHEDULE'||
   !REF.test(scope.source_ref||'')||
   !scope.source_ref.startsWith('https://github.com/'+b.repository_full_name+'/')||
   scope.provider_recheck_required!==true||
   scope.customer_connection_verified!==false||
   scope.original_job_admitted!==false||
   scope.owner_approval_granted!==false||
   scope.model_execution_authorized!==false||
   scope.new_shift_started!==false||
   scope.installation_authorized!==false||
   scope.production_changed!==false)
   err('SIGNED_OWNER_CONTINUITY_SOURCE_UNVERIFIED');
  const first=await source(c,scope.source_ref,b.repository_full_name);
  const second=await source(c,scope.source_ref,b.repository_full_name);
  if(!SHA.test(first.provider_proof_sha256)||
   first.provider_proof_sha256!==second.provider_proof_sha256||
   first.provider_updated_at!==second.provider_updated_at||
   first.source_title!==second.source_title)
   return result(200,'INTERNAL_BUSINESS_SOURCE_PROVIDER_EPOCH_CHANGED_NO_RECEIPT',{
    internal_source_provider_readback_verified:false,
    source_ref:scope.source_ref});
  const receipt=await rpc(c,'reality_record_signed_internal_repo_provider_proof_v1',{
   p_worker_run_id:b.worker_run_id,p_owner_id:scope.owner_id,
   p_intake_key:scope.intake_key,p_continuity_ref:scope.continuity_ref,
   p_source_ref:scope.source_ref,p_source_title:first.source_title,
   p_source_updated_at:first.provider_updated_at,
   p_first_sha256:first.provider_proof_sha256,
   p_second_sha256:second.provider_proof_sha256
  });
  if(receipt.status!=='SIGNED_INTERNAL_BUSINESS_SOURCE_DOUBLE_PROVIDER_READBACK_RECORDED'||
   receipt.owner_id!==scope.owner_id||
   receipt.source_ref!==scope.source_ref||
   receipt.continuity_ref!==scope.continuity_ref||
   receipt.provider_proof_sha256!==first.provider_proof_sha256||
   receipt.internal_source_provider_readback_verified!==true||
   receipt.customer_connection_verified!==false||
   receipt.original_job_admitted!==false||
   receipt.model_execution_authorized!==false||
   receipt.owner_approval_granted!==false||
   receipt.new_shift_started!==false||
   receipt.installation_authorized!==false||
   receipt.production_changed!==false)
   err('SIGNED_INTERNAL_BUSINESS_SOURCE_RECEIPT_INVALID');
  return result(200,receipt.status,{
   owner_id:scope.owner_id,continuity_ref:scope.continuity_ref,
   source_ref:scope.source_ref,
   provider_proof_sha256:first.provider_proof_sha256,
   internal_source_provider_readback_verified:true
  });
 }catch(e){
  const msg=String(e instanceof Error?e.message:'UNKNOWN');
  if(/^INTERNAL_BUSINESS_PROVIDER_[A-Z0-9_]{3,90}$/.test(msg))
   console.warn('REALITY_INTERNAL_BUSINESS_SOURCE_PROVIDER',msg);
  return result(503,'INTERNAL_BUSINESS_PROVIDER_OR_SOURCE_NOT_VERIFIED');
 }
});
