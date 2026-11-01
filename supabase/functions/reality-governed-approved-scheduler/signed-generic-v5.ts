// Read-only GitHub Actions -> Supabase trust handshake for the isolated preview.
// Neither a model, a request file, nor a browser grants approval or installation.
// This code never returns the service-role key or changes customer work.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/main';
const WORKFLOW='.github/workflows/reality-governed-approved-scheduler-v1.yml';
const AUDIENCE='reality-governed-approved-scheduler-v1';
const FULL_REF=REPO+'/'+WORKFLOW+'@'+BRANCH;
const SHA=/^[a-f0-9]{40}$/;
const out=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
function decodeBase64Url(part:string){
 if(!/^[A-Za-z0-9_-]{1,8000}$/.test(part))throw Error('OIDC_PART_INVALID');
 const padded=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4);
 return Uint8Array.from(atob(padded),v=>v.charCodeAt(0));
}
function parseJson(part:string):Record<string,unknown>{
 const obj=JSON.parse(new TextDecoder().decode(decodeBase64Url(part)));
 if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error('OIDC_JSON_INVALID');
 return obj;
}
async function verifySignedGitHubIdentity(jwt:string){
 if(jwt.length<300||jwt.length>9000)throw Error('OIDC_JWT_SIZE_INVALID');
 const parts=jwt.split('.');
 if(parts.length!==3)throw Error('OIDC_JWT_PARTS_INVALID');
 const header=parseJson(parts[0]),claims=parseJson(parts[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||
    header.kid.length>160)throw Error('OIDC_ALGORITHM_OR_KEY_INVALID');
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!=='https://token.actions.githubusercontent.com'||
    claims.aud!==AUDIENCE||
    claims.repository!==REPO||
    claims.repository_owner!=='maloney2323'||
    String(claims.repository_id)!=='1388852445'||
    String(claims.repository_owner_id)!=='317309322'||
    claims.workflow_ref!==FULL_REF||
    claims.ref!==BRANCH||
    claims.ref_type!=='branch'||
    !['push','schedule','workflow_dispatch','workflow_run'].includes(String(claims.event_name))||
    typeof claims.sha!=='string'||!SHA.test(claims.sha)||
    !/^[1-9][0-9]{0,17}$/.test(String(claims.run_id||''))||
    typeof claims.exp!=='number'||typeof claims.iat!=='number'||
    typeof claims.nbf!=='number'||
    claims.exp<now-30||claims.nbf>now+30||
    claims.iat>now+30||claims.exp-claims.iat>900)
  throw Error('OIDC_EXACT_WORKFLOW_IDENTITY_INVALID');
 const jwks=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',
   {redirect:'error',cache:'no-store'});
 if(!jwks.ok)throw Error('OIDC_JWKS_UNAVAILABLE');
 const signingKeys=(await jwks.json())?.keys;
 const found=(Array.isArray(signingKeys)?signingKeys:[]).filter(k=>
   k?.kid===header.kid&&k?.kty==='RSA'&&
   (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(found.length!==1)throw Error('OIDC_SIGNING_KEY_NOT_UNIQUE');
 const key=await crypto.subtle.importKey('jwk',found[0],
   {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
   decodeBase64Url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!verified)throw Error('OIDC_SIGNATURE_INVALID');
 const run=await fetch('https://api.github.com/repos/'+REPO+
   '/actions/runs/'+claims.run_id,{cache:'no-store',redirect:'error',headers:{
    accept:'application/vnd.github+json',
    'user-agent':'Reality-isolated-worker-oidc-readiness-v1'}});
 if(!run.ok)throw Error('GITHUB_WORKFLOW_RUN_READBACK_UNAVAILABLE');
 const live=await run.json();
 if(String(live?.id)!==String(claims.run_id)||
    live.head_sha!==claims.sha||
    live.event!==claims.event_name||live.path!==WORKFLOW||
    live.head_branch!==BRANCH.replace('refs/heads/','')||
    live.head_repository?.full_name!==REPO)
  throw Error('OIDC_PROVIDER_WORKFLOW_RUN_MISMATCH');
 return {run_id:Number(claims.run_id),commit_sha:String(claims.sha)};
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||
     !/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))
    return out({ok:false,error:'METHOD_OR_MEDIA_TYPE_REQUIRED'},405);
  const bearer=(req.headers.get('authorization')||'')
    .match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!bearer)return out({ok:false,error:'GITHUB_SIGNED_IDENTITY_REQUIRED'},401);
  const json=await req.text();
  if(json.length>200)throw Error('REQUEST_TOO_LARGE');
  const body=JSON.parse(json);
  if(!body||typeof body!=='object'||Array.isArray(body)||
     Object.keys(body).sort().join(',')!=='action'||
     body.action!=='poll')
    throw Error('READ_ONLY_OIDC_ACTION_REQUIRED');
  const who=await verifySignedGitHubIdentity(bearer);
  const url=Deno.env.get('SUPABASE_URL');
  const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(url!=='https://'+PROJECT+'.supabase.co'||!secret)
    throw Error('ISOLATED_SUPABASE_EDGE_SERVICE_NOT_CONNECTED');
  // Signed, read-only service-role RPC lists *already claimed* owner repairs
  // whose exact owner, current goal epoch, candidate, branch and pending lease
  // are cross-verified inside the private database. Nothing is approved here.
  const check=await fetch(url+'/rest/v1/rpc/reality_read_pending_approved_repairs_for_wake_v1',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:secret,authorization:'Bearer '+secret,accept:'application/json',
    'content-type':'application/json'},body:'{}',
  });
  if(!check.ok)throw Error('ISOLATED_GENERAL_APPROVAL_READBACK_FAILED');
  const observed=await check.json();
  const pending=observed?.pending_approvals;
  const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  if(!Array.isArray(pending)||pending.length>5||
    observed.owner_approval_used!==false||
    observed.installation_performed!==false||
    observed.production_changed!==false||
    observed.status!==(pending.length?
     'PREVIOUSLY_OWNER_APPROVED_WORK_OBSERVED':'NO_APPROVED_WORK'))
   throw Error('ISOLATED_GENERAL_APPROVAL_SOURCE_INVALID');
  const seen=new Set();
  for(const item of pending){
   if(!item||Object.keys(item).sort().join(',')!==
      'candidate_hash,install_branch,issue_number,original_work_id,reservation_id'||
     !uuid.test(String(item.reservation_id||''))||
     !/^work:[0-9a-f]{32}$/.test(String(item.original_work_id||''))||
     !/^[0-9a-f]{64}$/.test(String(item.candidate_hash||''))||
     !Number.isSafeInteger(item.issue_number)||item.issue_number<1||
     item.issue_number>100000||
     !['feature/reality-closed-loop-worker-20261031',
      'feature/reality-home-repair-chat-20261031'].includes(String(item.install_branch))||
     seen.has(item.reservation_id))
    throw Error('ISOLATED_GENERAL_APPROVED_REQUEST_INVALID');
   seen.add(item.reservation_id);
  }
  return out({ok:true,status:pending.length?
   'PREVIOUSLY_OWNER_APPROVED_WORK_OBSERVED':'NO_APPROVED_WORK',
   workflow_run_id:who.run_id,repository_commit:who.commit_sha,
   github_oidc_verified:true,isolated_supabase_readback_verified:true,
   pending_approvals:pending,service_credential_returned:false,
   owner_approval_used:false,installation_performed:false,
   original_job_completed:false,production_changed:false});
 }catch(e){
  const name=e instanceof Error?e.message:'UNKNOWN';
  if(/^[A-Z0-9_]{5,95}$/.test(name))
   console.error('REALITY_WORKER_IDENTITY_REJECTED',name);
  return out({ok:false,error:'WORKER_IDENTITY_OR_ISOLATED_DATABASE_UNAVAILABLE',
    owner_approval_used:false,installation_performed:false,
    original_job_completed:false,production_changed:false},403);
 }
});
