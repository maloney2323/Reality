// Isolated customer-authorized worker credential broker.
// This is NOT a general secret vault or a customer approval endpoint.
// A GitHub-signed exact worker run AND one already-consumed owner reservation
// are necessary before handing the transient service identity to the runner.
// Never expose credentials to model output, logs, source files, browser or UI.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-background-continuation-20261031';
const WORKFLOW='.github/workflows/reality-approved-repair-background-v1.yml';
const AUDIENCE='reality-approved-background-execution-v1';
const WORK_ID=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/,SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const PREFIX='reality-approved-continuations/';
function response(data:Record<string,unknown>,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  'content-type':'application/json','cache-control':'private, no-store, max-age=0',
  'pragma':'no-cache','x-content-type-options':'nosniff'}});
}
function bytePart(s:string){
 if(!/^[A-Za-z0-9_-]{1,8000}$/.test(s))throw Error('OIDC_PART_INVALID');
 return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+
   '='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
}
function parsePart(s:string){
 const result=JSON.parse(new TextDecoder().decode(bytePart(s)));
 if(!result||typeof result!=='object'||Array.isArray(result))
  throw Error('OIDC_CLAIMS_INVALID');
 return result;
}
async function verifyIdentity(jwt:string){
 if(jwt.length<300||jwt.length>9000)throw Error('GITHUB_SIGNED_IDENTITY_REQUIRED');
 const parts=jwt.split('.');
 if(parts.length!==3)throw Error('GITHUB_JWT_INVALID');
 const header=parsePart(parts[0]),claims=parsePart(parts[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||
    header.kid.length>160)throw Error('GITHUB_SIGNING_HEADER_INVALID');
 const now=Math.floor(Date.now()/1000);
 if(claims.iss!=='https://token.actions.githubusercontent.com'||
   claims.aud!==AUDIENCE||
   claims.repository!==REPO||
   claims.repository_owner!=='maloney2323'||
   String(claims.repository_owner_id)!=='317309322'||
   String(claims.repository_id)!=='1388852445'||
   claims.ref!==BRANCH||claims.ref_type!=='branch'||
   claims.workflow_ref!==REPO+'/'+WORKFLOW+'@'+BRANCH||
   claims.event_name!=='push'||
   typeof claims.sha!=='string'||!SHA.test(claims.sha)||
   !/^[1-9][0-9]{0,17}$/.test(String(claims.run_id||''))||
   typeof claims.exp!=='number'||typeof claims.nbf!=='number'||
   typeof claims.iat!=='number'||claims.exp<now-30||
   claims.nbf>now+30||claims.iat>now+30||
   claims.exp-claims.iat>900)throw Error('GITHUB_WORKFLOW_IDENTITY_MISMATCH');
 const keys=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',
   {cache:'no-store',redirect:'error'});
 if(!keys.ok)throw Error('GITHUB_SIGNING_KEYS_UNAVAILABLE');
 const jwks=(await keys.json())?.keys;
 const choices=(Array.isArray(jwks)?jwks:[]).filter(k=>
  k?.kid===header.kid&&k.kty==='RSA'&&
  (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(choices.length!==1)throw Error('GITHUB_SIGNING_KEY_MISMATCH');
 const publicKey=await crypto.subtle.importKey('jwk',choices[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,
  bytePart(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!verified)throw Error('GITHUB_SIGNED_IDENTITY_INVALID');
 return {sha:String(claims.sha),run_id:String(claims.run_id)};
}
async function github(path:string){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  method:'GET',cache:'no-store',redirect:'error',headers:{
   accept:'application/vnd.github+json',
   'user-agent':'Reality-isolated-approved-worker-oidc-lease-v1'}});
 if(!r.ok)throw Error('GITHUB_PROVIDER_READBACK_'+r.status);
 return await r.json();
}
async function verifySingleApprovedRequest(identity:{sha:string,run_id:string},
 request:Record<string,unknown>){
 const expectedKeys=['candidate_hash','install_branch','issue_number','original_work_id','reservation_id'];
 if(Object.keys(request).sort().join(',')!==expectedKeys.sort().join(',')||
  !UUID.test(String(request.reservation_id||''))||
  !HASH.test(String(request.candidate_hash||''))||
  !WORK_ID.test(String(request.original_work_id||''))||
  !Number.isSafeInteger(request.issue_number)||request.issue_number!==178||
  request.original_work_id!=='work:9b9578b3c65427589c4c6da68fe0fc87'||
  request.install_branch!=='feature/reality-closed-loop-worker-20261031')
  throw Error('EXACT_APPROVED_REQUEST_INVALID');
 const commit=await github('/commits/'+identity.sha);
 const requestPath=PREFIX+request.reservation_id+'.json';
 if(commit?.sha!==identity.sha||commit?.parents?.length!==1||
    !Array.isArray(commit.files)||commit.files.length!==1||
    commit.files[0]?.filename!==requestPath||
    commit.files[0]?.status!=='added')
  throw Error('SINGLE_APPROVED_WAKE_COMMIT_REQUIRED');
 const run=await github('/actions/runs/'+identity.run_id);
 if(String(run?.id)!==identity.run_id||run?.head_sha!==identity.sha||
    run.event!=='push'||run.path!==WORKFLOW||
    run.head_repository?.full_name!==REPO)
  throw Error('GITHUB_APPROVED_WORKFLOW_RUN_INVALID');
 const file=await fetch('https://raw.githubusercontent.com/'+REPO+'/'+
  identity.sha+'/'+requestPath,{method:'GET',cache:'no-store',redirect:'error'});
 if(!file.ok)throw Error('APPROVED_SOURCE_BYTES_UNAVAILABLE');
 const actual=JSON.parse(await file.text());
 if(JSON.stringify(actual)!==JSON.stringify(request))
  throw Error('APPROVED_REQUEST_SOURCE_CHANGED');
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||
   !/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))
   return response({ok:false,error:'METHOD_OR_MEDIA_TYPE_REQUIRED'},405);
  const signed=(req.headers.get('authorization')||'')
   .match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!signed)return response({ok:false,error:'GITHUB_SIGNED_WORKER_REQUIRED'},401);
  const raw=await req.text();
  if(raw.length>2000)throw Error('REQUEST_TOO_LARGE');
  const body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).sort().join(',')!=='action,request'||
   body.action!=='lease'||!body.request||
   typeof body.request!=='object'||Array.isArray(body.request))
   throw Error('EXACT_LEASE_ONLY');
  const identity=await verifyIdentity(signed);
  await verifySingleApprovedRequest(identity,body.request);
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(url!=='https://'+PROJECT+'.supabase.co'||!key)
   throw Error('ISOLATED_SERVICE_CONFIGURATION_MISSING');
  const result=await fetch(url+'/rest/v1/rpc/reality_lease_exact_approved_repair_v2',{
   method:'POST',cache:'no-store',redirect:'error',headers:{
    apikey:key,authorization:'Bearer '+key,accept:'application/json',
    'content-type':'application/json'},
   body:JSON.stringify({
    p_reservation_id:body.request.reservation_id,
    p_install_branch:body.request.install_branch}),
  });
  if(!result.ok)throw Error('ATOMIC_APPROVED_WORK_LEASE_DENIED');
  const lease=await result.json();
  if(lease?.status==='NO_APPROVED_WORK')
   return response({ok:true,status:'NO_ATOMICALLY_APPROVED_WORK',
    service_credential_returned:false,owner_approval_used:false,
    installation_performed:false,original_job_completed:false,
    production_changed:false});
  if(lease?.status!=='EXACT_OWNER_APPROVED_WORK_LEASED'||
   !UUID.test(String(lease.lease_id||''))||
   !UUID.test(String(lease.owner_id||''))||
   !UUID.test(String(lease.conversation_id||''))||
   lease.reservation_id!==body.request.reservation_id||
   lease.original_work_id!==body.request.original_work_id||
   lease.candidate_hash!==body.request.candidate_hash||
   lease.issue_number!==body.request.issue_number||
   lease.install_branch!==body.request.install_branch)
   throw Error('ATOMIC_APPROVED_LEASE_SCOPE_MISMATCH');
  // Key is returned only in-memory to the exact signed, approved and leased
  // private GitHub runner. The broker and worker MUST NOT log or persist it.
  return response({ok:true,status:'EXACT_OWNER_APPROVED_WORK_LEASED',
   lease,service_role_key:key,scope:'ONE_ISOLATED_ALREADY_APPROVED_WORK',
   service_credential_returned:true,installation_performed:false,
   original_job_completed:false,production_changed:false});
 }catch(e){
  const code=e instanceof Error?e.message:'UNKNOWN';
  if(/^[A-Z0-9_]{4,100}$/.test(code))
   console.error('REALITY_APPROVED_OIDC_WORKER_REJECTED',code);
  return response({ok:false,error:'SIGNED_GITHUB_APPROVAL_OR_PRIVATE_LEASE_REQUIRED',
   service_credential_returned:false,installation_performed:false,
   original_job_completed:false,production_changed:false},403);
 }
});
