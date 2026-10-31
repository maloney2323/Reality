// An isolated, single-purpose OIDC broker for preauthorized #178 investigation.
// No user API key, model output, public request file or LLM grants authority.
// The GitHub-signed workflow identity and pinned Git commit are independently
// verified before the private atomic service-role claim.
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-closed-loop-worker-20261031';
const WORKFLOW=REPO+'/.github/workflows/reality-source-bound-model-generation-v1.yml@'+BRANCH;
const AUD='reality-original-178-recovery-v1';
const ORIGINAL_WORK='work:9b9578b3c65427589c4c6da68fe0fc87';
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const body=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json','cache-control':'no-store'}});
function bytes(s:string):Uint8Array{
 if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length>8192)throw Error('INVALID_JWT_ENCODING');
 const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function jsonPart(s:string):Record<string,unknown>{
 const x=JSON.parse(new TextDecoder().decode(bytes(s)));
 if(!x||typeof x!=='object'||Array.isArray(x))throw Error('INVALID_JWT_PART');
 return x;
}
async function verifyGitHubToken(token:string){
 if(token.length<300||token.length>9000)throw Error('SIGNED_GITHUB_TOKEN_REQUIRED');
 const parts=token.split('.');
 if(parts.length!==3)throw Error('JWT_PARTS_INVALID');
 const header=jsonPart(parts[0]),claim=jsonPart(parts[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>160)
  throw Error('GITHUB_SIGNING_ALGORITHM_INVALID');
 const now=Math.floor(Date.now()/1000);
 if(claim.iss!=='https://token.actions.githubusercontent.com'||
  claim.aud!==AUD||claim.repository!==REPO||
  claim.repository_owner!=='maloney2323'||claim.ref!==BRANCH||
  claim.ref_type!=='branch'||claim.event_name!=='push'||
  claim.workflow_ref!==WORKFLOW||
  claim.sub!=='repo:'+REPO+':ref:'+BRANCH||
  typeof claim.sha!=='string'||!SHA.test(claim.sha)||
  typeof claim.run_id!=='string'||!/^[1-9][0-9]{0,17}$/.test(claim.run_id)||
  typeof claim.exp!=='number'||typeof claim.nbf!=='number'||
  typeof claim.iat!=='number'||claim.exp<now-30||
  claim.nbf>now+30||claim.iat>now+30||
  claim.exp-claim.iat>900)
  throw Error('GITHUB_EXACT_WORKFLOW_IDENTITY_INVALID');
 const jwks=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',{
  redirect:'error',cache:'no-store'});
 if(!jwks.ok)throw Error('GITHUB_IDENTITY_KEYS_UNAVAILABLE');
 const payload=await jwks.json();
 const eligible=(payload?.keys||[]).filter((k:Record<string,unknown>)=>
  k.kid===header.kid&&k.kty==='RSA'&&
  (!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 if(eligible.length!==1)throw Error('GITHUB_VERIFICATION_KEY_INVALID');
 const key=await crypto.subtle.importKey('jwk',eligible[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',
  key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!verified)throw Error('GITHUB_OIDC_SIGNATURE_INVALID');
 return {sha:claim.sha as string,runId:claim.run_id as string};
}
async function checkedJson(url:string){
 const response=await fetch(url,{redirect:'error',cache:'no-store',headers:{
  accept:'application/vnd.github+json','user-agent':'Reality-original-178-oidc-claim-v1'}});
 if(!response.ok)throw Error('GITHUB_SOURCE_PROVIDER_READBACK_UNAVAILABLE');
 return await response.json();
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))
   return body({error:'METHOD_OR_CONTENT_TYPE_REQUIRED'},405);
  const token=(req.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
  if(!token)return body({error:'SIGNED_IDENTITY_REQUIRED'},401);
  const identity=await verifyGitHubToken(token);
  const raw=await req.text();
  if(raw.length>1600)throw Error('REQUEST_SIZE_EXCEEDED');
  const request=JSON.parse(raw);
  if(!request||Object.keys(request).sort().join(',')!==
   'issue_number,original_work_id,queue_id,schema'||
   request.schema!=='reality-original-178-recovery-request-v1'||
   request.original_work_id!==ORIGINAL_WORK||request.issue_number!==178||
   !UUID.test(request.queue_id))throw Error('ORIGINAL_178_PINNED_REQUEST_REQUIRED');
  const path='reality-requests/'+request.queue_id+'.json';
  const source=await checkedJson('https://api.github.com/repos/'+REPO+
   '/commits/'+identity.sha);
  if(source?.sha!==identity.sha||source?.parents?.length!==1||
   source?.files?.length!==1||source.files[0]?.filename!==path||
   !['added','modified'].includes(source.files[0]?.status))
   throw Error('GITHUB_SINGLE_CHANGE_PROVENANCE_INVALID');
  const run=await checkedJson('https://api.github.com/repos/'+REPO+
   '/actions/runs/'+identity.runId);
  if(String(run?.id)!==identity.runId||run?.head_sha!==identity.sha||
   run?.event!=='push'||run?.path!==
   '.github/workflows/reality-source-bound-model-generation-v1.yml')
   throw Error('GITHUB_EXACT_WORKFLOW_RUN_INVALID');
  const original=await fetch('https://raw.githubusercontent.com/'+REPO+'/'+
   identity.sha+'/'+path,{cache:'no-store',redirect:'error'});
  if(!original.ok||JSON.stringify(await original.json())!==JSON.stringify(request))
   throw Error('GITHUB_EXACT_REQUEST_BYTES_CHANGED');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url=Deno.env.get('SUPABASE_URL');
  if(!key||!url||new URL(url).hostname!=='hvkfreoagbrphwghjajw.supabase.co')
   throw Error('ISOLATED_SERVICE_CONFIGURATION_UNAVAILABLE');
  const response=await fetch(url+'/rest/v1/rpc/reality_claim_original_178_recovery_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:key,authorization:'Bearer '+key,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({p_queue_id:request.queue_id,
    p_original_work_id:ORIGINAL_WORK,p_github_sha:identity.sha,p_request_path:path}),
  });
  if(!response.ok)throw Error('PRIVATE_ATOMIC_RECOVERY_CLAIM_REJECTED');
  const result=await response.json();
  if(result?.status!=='EXACT_ORIGINAL_178_RECOVERY_ADMITTED'||
   result.original_work_id!==ORIGINAL_WORK||result.queue_id!==request.queue_id||
   result.prior_worker_claim_preserved!==true||
   result.installation_authorized!==false||result.job_completed!==false)
   throw Error('PRIVATE_RECOVERY_CLAIM_SCOPE_INVALID');
  return body(result);
 }catch(_error){
  return body({error:'SOURCE_BOUND_GITHUB_IDENTITY_OR_PRIVATE_CLAIM_REJECTED'},403);
 }
});
