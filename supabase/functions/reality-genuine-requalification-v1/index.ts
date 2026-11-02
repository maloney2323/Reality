// Signed GitHub Actions discovery -> independent provider readback ->
// owner-authorized original Continuity append -> existing atomic genuine queue.
// Never grants installation, execution, model trust, or customer settlement.
// This endpoint is NOT authenticated by a user or a GitHub issue body.
// It verifies the GitHub-issued OIDC signature and immutable workflow identity.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='refs/heads/feature/reality-general-capability-engine-20261101';
const WORKFLOW='.github/workflows/reality-genuine-capability-auto-trigger-v1.yml';
const AUDIENCE='reality-genuine-requalification-v1';
const REF=REPO+'/'+WORKFLOW+'@'+BRANCH;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const TEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const MODULE=/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/;
const WORK=/^work:[a-f0-9]{32}$/;
const respond=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'content-type':'application/json','cache-control':'no-store',
 'x-content-type-options':'nosniff'}});
const deny=code=>{throw Error('AUTO_ADMIT_'+code)};
function decode64(s){
 if(!/^[A-Za-z0-9_-]{1,10000}$/.test(s))deny('BASE64URL_INVALID');
 const normalized=s.replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(normalized+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
}
function jsonPart(s){
 const v=JSON.parse(new TextDecoder().decode(decode64(s)));
 if(!v||Array.isArray(v)||typeof v!=='object')deny('TOKEN_PART_NOT_OBJECT');
 return v;
}
async function hash(bytes){
 const b=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
 const output=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
 return [...output].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function uuid(text){
 const bits=new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(text)));
 bits[6]=(bits[6]&15)|80;bits[8]=(bits[8]&63)|128;
 const s=[...bits.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('');
 return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+
  s.slice(16,20)+'-'+s.slice(20);
}
function stable(v){
 return v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):
  Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
}
const digest=async v=>hash(JSON.stringify(stable(v)));
async function api(path,githubToken?:string|null){
 const r=await fetch('https://api.github.com/repos/'+REPO+path,{
  redirect:'error',cache:'no-store',headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-genuine-auto-admit-v1',
   ...(githubToken?{authorization:'Bearer '+githubToken}:{})}});
 if(r.status===404)return null;
 if(!r.ok)deny('GITHUB_READBACK_UNAVAILABLE');
 return r.json();
}
async function verify(jwt,commit,githubToken?:string|null){
 if(typeof jwt!=='string'||jwt.length<300||jwt.length>9000)
  deny('SIGNED_IDENTITY_INVALID');
 const p=jwt.split('.');
 if(p.length!==3)deny('JWT_FORMAT');
 const h=jsonPart(p[0]),c=jsonPart(p[1]),now=Math.floor(Date.now()/1000);
 if(h.alg!=='RS256'||typeof h.kid!=='string'||
  c.iss!=='https://token.actions.githubusercontent.com'||
  c.aud!==AUDIENCE||c.repository!==REPO||
  c.repository_owner!=='maloney2323'||
  String(c.repository_id)!=='1388852445'||
  c.workflow_ref!==REF||c.ref!==BRANCH||c.ref_type!=='branch'||
  !c.event_name==='push'||c.sha!==commit||!SHA40.test(commit)||
  !/^[1-9][0-9]{0,17}$/.test(String(c.run_id||''))||
  typeof c.exp!=='number'||typeof c.iat!=='number'||
  typeof c.nbf!=='number'||c.exp<now-30||c.nbf>now+30||
  c.iat>now+30||c.exp-c.iat>900)
  deny('EXACT_SIGNED_GITHUB_WORKFLOW_REQUIRED');
 const jwks=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',
  {redirect:'error',cache:'no-store'});
 if(!jwks.ok)deny('SIGNING_JWKS_UNAVAILABLE');
 const keys=(await jwks.json()).keys;
 const found=(Array.isArray(keys)?keys:[]).filter(k=>
  k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&
  (!k.use||k.use==='sig'));
 if(found.length!==1)deny('SIGNER_NOT_UNIQUE');
 const key=await crypto.subtle.importKey('jwk',found[0],
  {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const good=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,
  decode64(p[2]),new TextEncoder().encode(p[0]+'.'+p[1]));
 if(!good)deny('SIGNATURE_FAILED');
 const run=await api('/actions/runs/'+c.run_id,githubToken);
 if(run?.id!==Number(c.run_id)||run.head_sha!==commit||
  run.event!==c.event_name||run.path!==WORKFLOW||
  run.head_branch!==BRANCH.slice('refs/heads/'.length)||
  run.head_repository?.full_name!==REPO)
  deny('GITHUB_WORKFLOW_PROVIDER_READBACK_MISMATCH');
 return run;
}
function credentials(){
 const url=Deno.env.get('SUPABASE_URL');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(url!=='https://'+PROJECT+'.supabase.co'||!key||key.length<30)
  deny('ISOLATED_SERVICE_DATABASE_UNAVAILABLE');
 return {url,key};
}
async function database(path,{method='GET',body}={}){
 const {url,key}=credentials();
 const response=await fetch(url+'/rest/v1/'+path,{
  method,redirect:'error',cache:'no-store',
  headers:{apikey:key,authorization:'Bearer '+key,
   accept:'application/json','content-type':'application/json',
   ...(method==='POST'?{Prefer:'return=representation'}:{})},
  body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>null);
 if(!response.ok){
  console.warn('REALITY_QUALIFICATION_DATABASE_ERROR_CLASS',
   String(result?.code||'UNKNOWN').slice(0,24),
   String(path).split('?')[0].slice(0,100));
  const safeCode=String(result?.message||'').match(/(?:GENUINE_AUTO|QUALIFICATION)_[A-Z0-9_]{4,100}/)?.[0];
  if(safeCode)throw Error(safeCode);
  deny('DATABASE_'+response.status+'_UNAVAILABLE');
 }
 return result;
}

Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=='POST')deny('REQUALIFICATION_POST_REQUIRED');
  const raw=await req.text();
  if(raw.length<100||raw.length>310000)deny('REQUALIFICATION_PAYLOAD_BOUNDS');
  const body=JSON.parse(raw);
  const bearer=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');
  const token=req.headers.get('x-reality-github-provider-token')||'';
  if(token.length<12)deny('REQUALIFICATION_PROVIDER_TOKEN_REQUIRED');
  if(body?.action!=='requalify'||!body?.scope||!body?.proposal||!body?.proof||
    Object.keys(body).sort().join(',')!=='action,proof,proposal,scope'||
    Object.keys(body.scope).sort().join(',')!=='repository_sha,trigger_id'||
    !SHA40.test(body.scope.repository_sha)||!UUID.test(body.scope.trigger_id))
    deny('REQUALIFICATION_ENVELOPE_INVALID');
  const run=await verify(bearer,body.scope.repository_sha,token);
  const model=body.proposal.candidate;
  const ticket=body.proposal.ticket;
  const sandbox=body.proof;
  if(body.proposal.source!=='REAL_OPENAI_MODEL_GENERATION'||
    body.proposal.correction_origin!=='INDEPENDENT_REAL_PROVIDER_HOLDOUT_FAILURE'||
    body.proposal.installation_authorized!==false||
    body.proposal.original_job_completed!==false||
    !model||!ticket||model.installed!==false||model.authority_granted!==false||
    !SHA64.test(model.artifact_sha256)||!SHA64.test(model.ticket_hash)||
    model.ticket_hash!==ticket.ticket_hash||
    model.original_work_id!==ticket.original_work_id||
    ticket.repository_base_sha!==run.head_sha||
    !Array.isArray(model.files)||model.files.length<2||model.files.length>16||
    !/^resp_[A-Za-z0-9_-]{12,160}$/.test(model.model_response_id||'')||
    body.proposal.prior_model_response_id===model.model_response_id||
    !SHA64.test(body.proposal.prior_artifact_sha256)||
    body.proposal.prior_artifact_sha256===model.artifact_sha256||
    sandbox.schema!=='reality-genuine-sandbox-v1'||
    sandbox.runner_isolation!=='DOCKER_NETWORK_NONE_READONLY_NO_SECRETS'||
    sandbox.original_work_id!==model.original_work_id||
    sandbox.artifact_sha256!==model.artifact_sha256||
    sandbox.model_response_id!==model.model_response_id||
    sandbox.runner_git_sha!==run.head_sha||
    sandbox.workflow_run_id!==String(run.id)||
    sandbox.passed!==true||
    sandbox.installation_authorized!==false||
    sandbox.original_job_completed!==false||
    sandbox.production_changed!==false||
    sandbox.frozen_suite_sha256!==ticket.frozen_regression_sha256||
    sandbox.frozen_result?.exit_code!==0||
    sandbox.candidate_result?.exit_code!==0||
    sandbox.frozen_result?.fail!==0||
    sandbox.candidate_result?.fail!==0)
    deny('REQUALIFICATION_MODEL_AND_SANDBOX_SCOPE_INVALID');
  const paths=new Set<string>();
  const sorted=[...model.files].sort((a,b)=>String(a.path).localeCompare(String(b.path)));
  for(const file of sorted){
   if(!/^(?:src\/reality-extensions\/|test\/reality-extensions\/)[A-Za-z0-9._/-]+$/.test(file.path||'')||
    file.path.includes('..')||paths.has(file.path)||
    typeof file.content!=='string'||file.content.length<1||file.content.length>70000)
    deny('REQUALIFICATION_EXTENSION_SCOPE_INVALID');
   paths.add(file.path);
  }
  if(!paths.has(ticket.source_entrypoint)||
     ![...paths].some(x=>x.startsWith('test/'))||
     await digest(sorted.map(x=>({path:x.path,content:x.content})))!==model.artifact_sha256)
    deny('REQUALIFICATION_NEW_SOURCE_DIGEST_INVALID');
  const jobs=await api('/actions/runs/'+run.id+'/jobs?per_page=100',token);
  const artifacts=await api('/actions/runs/'+run.id+'/artifacts?per_page=100',token);
  const generator=jobs?.jobs?.filter(j=>
    j.name==='requalify_201_model_candidate'&&j.status==='completed'&&j.conclusion==='success')||[];
  const verifier=jobs?.jobs?.filter(j=>
    j.name==='verify_201_new_model_candidate'&&j.status==='completed'&&j.conclusion==='success')||[];
  if(generator.length!==1||verifier.length!==1||
     !verifier[0].steps?.some(s=>s.name==='Verify frozen contract in isolated Docker'&&s.conclusion==='success')||
     !verifier[0].steps?.some(s=>s.name==='Hold out historical provider evidence in isolated Docker'&&s.conclusion==='success'))
    deny('REQUALIFICATION_INDEPENDENT_JOBS_NOT_GREEN');
  const exact=(name:string)=>(artifacts?.artifacts||[]).filter(a=>
    a.name===name&&a.expired===false&&/^sha256:[a-f0-9]{64}$/.test(a.digest||''));
  if(exact('reality-201-model-correction-'+run.id).length!==1||
     exact('reality-201-new-model-verification-'+run.id).length!==1)
     deny('REQUALIFICATION_INDEPENDENT_ARTIFACTS_NOT_VERIFIED');
  const newProof={
   status:'INDEPENDENT_PROVIDER_HOLDOUT_PASS',
   original_work_id:model.original_work_id,
   prior_artifact_sha256:body.proposal.prior_artifact_sha256,
   artifact_sha256:model.artifact_sha256,
   model_response_id:model.model_response_id,
   frozen_suite_sha256:ticket.frozen_regression_sha256,
   provider_run_id:String(run.id),
   runner_git_sha:run.head_sha,
   verification_artifact_digest:exact('reality-201-new-model-verification-'+run.id)[0].digest,
   independent_provider_holdout_verified:true,
   provider_verification_job_passed:true,
   holdout_tests:5,holdout_pass:5,
   sandbox,
   installation_authorized:false,original_job_completed:false,production_changed:false
  };
  const candidate={original_work_id:model.original_work_id,ticket_hash:model.ticket_hash,
   artifact_sha256:model.artifact_sha256,model_response_id:model.model_response_id,
   files:sorted.map(x=>({path:x.path,content:x.content}))};
  const receipt=await database('rpc/reality_supersede_genuine_qualified_candidate_v1',{
   method:'POST',body:{p_trigger_id:body.scope.trigger_id,
    p_candidate:candidate,p_proof:newProof}});
  if(receipt?.status!=='AWAITING_OWNER_APPROVAL'||
     receipt?.artifact_sha256!==model.artifact_sha256||
     receipt?.real_provider_holdout_verified!==true||
     receipt?.real_provider_holdout_artifact_sha256!==model.artifact_sha256||
     receipt?.installation_authorized!==false||
     receipt?.original_job_completed!==false||
     receipt?.production_changed!==false)
    deny('REQUALIFICATION_DATABASE_READBACK_INVALID');
  return respond({ok:true,...receipt});
 }catch(error){
  const msg=String(error?.message||'');
  const safe=/^(?:AUTO_ADMIT|GENUINE_REQUALIFICATION)_[A-Z0-9_]{3,120}$/.test(msg)?
    msg:'REQUALIFICATION_INDEPENDENT_PROOF_REQUIRED';
  console.warn('REALITY_REQUALIFICATION_REFUSED',safe);
  return respond({ok:false,error:safe,installation_authorized:false,
   original_job_completed:false,production_changed:false},403);
 }
});
