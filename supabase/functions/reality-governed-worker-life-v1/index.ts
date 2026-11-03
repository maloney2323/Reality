// Reality independently verified GitHub Actions proof-of-life.
// OIDC is authenticated against GitHub JWKS and the exact private provider run.
// This endpoint never approves installation, mints permissions or executes work.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const WORKFLOW='.github/workflows/reality-genuine-capability-auto-trigger-v1.yml';
const AUDIENCE='reality-governed-worker-life-v1';
const FULL_REF=REPO+'/'+WORKFLOW+'@'+BRANCH;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const out=(v:Record<string,unknown>,status=200)=>new Response(JSON.stringify(v),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
const deny=(s:string):never=>{throw Error('REALITY_LIFE_'+s)};
function decode(s:string){
 if(!/^[A-Za-z0-9_-]{1,10000}$/.test(s))deny('OIDC_BASE64_INVALID');
 const t=s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4);
 return Uint8Array.from(atob(t),c=>c.charCodeAt(0));
}
function parse(s:string){
 try{
  const obj=JSON.parse(new TextDecoder().decode(decode(s)));
  if(!obj||typeof obj!=='object'||Array.isArray(obj))deny('OIDC_OBJECT_INVALID');
  return obj as Record<string,unknown>;
 }catch{deny('OIDC_OBJECT_INVALID')}
}
async function verifySignedRunner(jwt:string,providerToken:string){
 if(jwt.length<300||jwt.length>9000||providerToken.length<25)
   deny('SIGNED_GITHUB_RUN_REQUIRED');
 const parts=jwt.split('.');
 if(parts.length!==3)deny('OIDC_PARTS_INVALID');
 const header=parse(parts[0]),claims=parse(parts[1]);
 const now=Math.floor(Date.now()/1000);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||
    header.kid.length>160||claims.iss!=='https://token.actions.githubusercontent.com'||
    claims.aud!==AUDIENCE||claims.repository!==REPO||
    claims.repository_owner!=='maloney2323'||
    String(claims.repository_id)!=='1388852445'||
    String(claims.repository_owner_id)!=='317309322'||
    claims.workflow_ref!==FULL_REF||claims.ref!==BRANCH||
    claims.ref_type!=='branch'||claims.event_name!=='push'||
    typeof claims.sha!=='string'||!SHA.test(claims.sha)||
    !/^[1-9][0-9]{0,17}$/.test(String(claims.run_id||''))||
    !/^[1-9][0-9]{0,2}$/.test(String(claims.run_attempt||''))||
    !Number.isSafeInteger(Number(claims.run_id))||
    typeof claims.iat!=='number'||typeof claims.exp!=='number'||
    typeof claims.nbf!=='number'||claims.nbf>now+30||
    claims.iat>now+30||claims.exp<now-30||
    claims.exp-claims.iat>900)
   deny('OIDC_REQUIRED_RUN_IDENTITY_MISMATCH');
 const jwks=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',
  {redirect:'error',cache:'no-store'});
 if(!jwks.ok)deny('GITHUB_JWKS_UNAVAILABLE');
 const keys=(await jwks.json())?.keys;
 const found=(Array.isArray(keys)?keys:[]).filter(k=>k?.kid===header.kid&&
   k?.kty==='RSA'&&(!k?.alg||k.alg==='RS256')&&(!k?.use||k.use==='sig'));
 if(found.length!==1)deny('OIDC_SIGNING_KEY_UNVERIFIED');
 const key=await crypto.subtle.importKey('jwk',found[0],
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
   decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))
   deny('OIDC_SIGNATURE_INVALID');
 const response=await fetch('https://api.github.com/repos/'+REPO+
   '/actions/runs/'+claims.run_id,{redirect:'error',cache:'no-store',headers:{
   authorization:'Bearer '+providerToken,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-governed-worker-life-v1'}});
 if(!response.ok)deny('SIGNED_PROVIDER_RUN_READBACK_UNAVAILABLE');
 const run=await response.json();
 if(run.id!==Number(claims.run_id)||run.head_sha!==claims.sha||
    run.event!=='push'||run.path!==WORKFLOW||
    run.head_branch!==BRANCH.slice('refs/heads/'.length)||
    run.head_repository?.full_name!==REPO||
    !Number.isInteger(run.run_attempt)||run.run_attempt<Number(claims.run_attempt))
  deny('GITHUB_PROVIDER_RUN_NOT_CONSISTENT');
 return {run_id:Number(claims.run_id),run_attempt:Number(claims.run_attempt),
   source_sha:String(claims.sha)};
}
async function rpc(name:string,body:Record<string,unknown>){
 const url=Deno.env.get('SUPABASE_URL');
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(url!=='https://'+PROJECT+'.supabase.co'||!secret||secret.length<25)
  deny('ISOLATED_SERVICE_LEDGER_UNAVAILABLE');
 const resp=await fetch(url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',headers:{
   apikey:secret,authorization:'Bearer '+secret,
   accept:'application/json','content-type':'application/json'},
  body:JSON.stringify(body)});
 const result=await resp.json().catch(()=>null);
 if(!resp.ok||!result||Array.isArray(result)||typeof result!=='object')
  deny('FENCED_LEDGER_MUTATION_REJECTED');
 return result as Record<string,unknown>;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||!/^application\/json(?:;|$)/i.test(
    req.headers.get('content-type')||''))
   return out({ok:false,error:'OIDC_JSON_POST_REQUIRED'},405);
  const raw=await req.text();
  if(raw.length>220)deny('BODY_TOO_LARGE');
  const body=JSON.parse(raw);
  if(!body||Array.isArray(body)||typeof body!=='object'||
    Object.keys(body).sort().join(',')!=='action,approval_id,dispatch_fence'||
    !['alive','ready'].includes(body.action)||
    !UUID.test(String(body.approval_id||''))||
    !Number.isSafeInteger(body.dispatch_fence)||body.dispatch_fence<1||
    body.dispatch_fence>5)deny('EXACT_FENCED_WORKER_SCOPE_REQUIRED');
  const jwt=(req.headers.get('authorization')||'')
    .match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1]||'';
  const providerToken=req.headers.get('x-reality-github-read-token')||'';
  const id=await verifySignedRunner(jwt,providerToken);
  const result=body.action==='alive'?
    await rpc('reality_ack_governed_worker_alive_v1',{
     p_approval_id:body.approval_id,p_fence:body.dispatch_fence,
     p_run_id:id.run_id,p_run_attempt:id.run_attempt,
     p_source_sha:id.source_sha}):
    await rpc('reality_validate_governed_worker_freshness_v1',{
     p_approval_id:body.approval_id,p_fence:body.dispatch_fence,
     p_run_id:id.run_id,p_run_attempt:id.run_attempt});
  const expected=body.action==='alive'?
    'WORKER_ALIVE_SIGNED_AND_RECORDED':'GOVERNANCE_READY';
  if(result.status!==expected||result.execution_authorized!==false)
    deny('WORKER_GOVERNANCE_NOT_ADMITTED');
  return out({ok:true,status:expected,provider_run_id:id.run_id,
   provider_run_attempt:id.run_attempt,exact_approval_id:body.approval_id,
   dispatch_fence:body.dispatch_fence,oidc_verified:true,
   execution_authorized:false,production_changed:false});
 }catch(e){
  const name=e instanceof Error?e.message:'UNKNOWN';
  if(/^REALITY_LIFE_[A-Z0-9_]{4,110}$/.test(name))
   console.warn('REALITY_LIFE_FAIL_CLOSED',name);
  return out({ok:false,status:'GOVERNED_WORKER_LIFE_REJECTED',
   worker_alive_not_proven:true,execution_authorized:false,
   production_changed:false},403);
 }
});
