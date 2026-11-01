// Signed GitHub OIDC -> Reality benchmark Continuity readback.
// Read-only. No server credential is returned; no claim, install or settlement.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-genuine-capability-worker-20261101';
const WORKFLOW='.github/workflows/reality-genuine-capability-worker-v1.yml';
const AUDIENCE='reality-genuine-capability-wake-v1';
const REF=REPO+'/'+WORKFLOW+'@'+BRANCH;
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const response=(obj:Record<string,unknown>,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
function dec(s:string){
 if(!/^[A-Za-z0-9_-]{1,8000}$/.test(s))throw Error('JWT_BASE64URL_INVALID');
 const padded=s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4);
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}
function part(s:string):Record<string,unknown>{
 const x=JSON.parse(new TextDecoder().decode(dec(s)));
 if(!x||Array.isArray(x)||typeof x!=='object')throw Error('JWT_OBJECT_REQUIRED');
 return x;
}
async function verify(jwt:string){
 if(jwt.length<300||jwt.length>9000)throw Error('SIGNED_JWT_SIZE_INVALID');
 const p=jwt.split('.');
 if(p.length!==3)throw Error('SIGNED_JWT_FORMAT_INVALID');
 const header=part(p[0]),claims=part(p[1]);
 const now=Math.floor(Date.now()/1000);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||
  claims.iss!=='https://token.actions.githubusercontent.com'||
  claims.aud!==AUDIENCE||
  claims.repository!==REPO||
  claims.repository_owner!=='maloney2323'||
  String(claims.repository_id)!=='1388852445'||
  String(claims.repository_owner_id)!=='317309322'||
  claims.workflow_ref!==REF||claims.ref!==BRANCH||
  claims.ref_type!=='branch'||claims.event_name!=='push'||
  typeof claims.sha!=='string'||!SHA.test(claims.sha)||
  !/^[1-9][0-9]{0,17}$/.test(String(claims.run_id||''))||
  typeof claims.exp!=='number'||typeof claims.iat!=='number'||
  typeof claims.nbf!=='number'||claims.exp<now-30||
  claims.nbf>now+30||claims.iat>now+30||
  claims.exp-claims.iat>900)
  throw Error('GITHUB_EXACT_WORKFLOW_IDENTITY_INVALID');
 const provider=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',{
  redirect:'error',cache:'no-store'});
 if(!provider.ok)throw Error('GITHUB_SIGNING_KEYS_UNAVAILABLE');
 const signing=(await provider.json()).keys;
 const matches=(Array.isArray(signing)?signing:[]).filter((k:any)=>
  k.kid===header.kid&&k.kty==='RSA'&&
  (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(matches.length!==1)throw Error('GITHUB_SIGNING_KEY_NOT_UNIQUE');
 const key=await crypto.subtle.importKey('jwk',matches[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,dec(p[2]),
  new TextEncoder().encode(p[0]+'.'+p[1]));
 if(!good)throw Error('GITHUB_SIGNATURE_INVALID');
 const run=await fetch('https://api.github.com/repos/'+REPO+
  '/actions/runs/'+claims.run_id,{cache:'no-store',redirect:'error',
   headers:{accept:'application/vnd.github+json',
    'user-agent':'Reality-genuine-capability-wake-v1'}});
 if(!run.ok)throw Error('GITHUB_PROVIDER_RUN_NOT_FOUND');
 const metadata=await run.json();
 if(metadata.id!==Number(claims.run_id)||
  metadata.head_sha!==claims.sha||
  metadata.event!=='push'||
  metadata.path!==WORKFLOW||
  metadata.head_branch!==BRANCH.slice('refs/heads/'.length)||
  metadata.head_repository?.full_name!==REPO)
  throw Error('GITHUB_PROVIDER_IDENTITY_READBACK_MISMATCH');
 return Number(claims.run_id);
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||!/^application\/json(?:;|$)/i.test(
    req.headers.get('content-type')||''))
   return response({ok:false,error:'METHOD_INVALID'},405);
  const bearer=(req.headers.get('authorization')||'')
   .match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!bearer)return response({ok:false,error:'SIGNED_IDENTITY_REQUIRED'},401);
  const text=await req.text();
  if(text.length>270)throw Error('REQUEST_TOO_LARGE');
  const input=JSON.parse(text);
  if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).sort().join(',')!=='action,source_event_id,trigger_id'||
    input.action!=='inspect'||!UUID.test(input.trigger_id)||
    !UUID.test(input.source_event_id))
   throw Error('EXACT_INERT_REQUEST_REQUIRED');
  const runId=await verify(bearer);
  const url=Deno.env.get('SUPABASE_URL');
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(url!=='https://'+PROJECT+'.supabase.co'||!secret)
   throw Error('EXACT_BENCHMARK_DATABASE_REQUIRED');
  const check=await fetch(url+'/rest/v1/rpc/reality_read_genuine_capability_wake_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:secret,authorization:'Bearer '+secret,
    accept:'application/json','content-type':'application/json'},
   body:JSON.stringify({p_trigger_id:input.trigger_id,
    p_source_event_id:input.source_event_id}),
  });
  if(!check.ok)throw Error('ATOMIC_OWNER_GAP_READBACK_UNAVAILABLE');
  const gap=await check.json();
  if(gap.trigger_id!==input.trigger_id||
   gap.source_event_id!==input.source_event_id||
   gap.phase!=='PENDING_FROZEN_REPRODUCTION'||
   gap.owner_goal_current!==true||
   gap.source_readback_verified!==true||
   gap.model_generated!==false||
   gap.installation_authorized!==false||
   gap.original_job_completed!==false||
   gap.production_changed!==false)
   throw Error('TRUSTED_GAP_RECEIPT_MISMATCH');
  // Provider evidence is real but independent frozen reproduction must be
  // performed by the matching business connector BEFORE claiming the trigger.
  return response({ok:true,
   status:'GENUINE_GAP_VERIFIED_AWAITING_PROVIDER_FROZEN_REPRODUCTION',
   github_oidc_verified:true,worker_run_id:runId,
   ...gap,claim_consumed:false,service_credential_returned:false});
 }catch(error){
  const code=error instanceof Error?error.message:'UNKNOWN';
  if(/^[A-Z0-9_]{5,100}$/.test(code))
   console.warn('GENUINE_CAPABILITY_WAKE_REFUSED',code);
  return response({ok:false,error:'SIGNED_WORKER_OR_PROVIDER_EVIDENCE_NOT_VERIFIED',
   claim_consumed:false,installation_authorized:false,
   original_job_completed:false,production_changed:false},403);
 }
});
