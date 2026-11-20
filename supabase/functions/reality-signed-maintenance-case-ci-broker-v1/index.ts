// Service-authenticated, exact owner/shift maintenance CLAIM -> source-bound
// GitHub Actions trigger. This is CI transport, not a failing test, repaired
// code, owner install approval, or final customer work. No new shift created.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='maloney2323/Reality';
const BRANCH='repair/maintenance-warrant-scope-handoff-20261119';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const fail=(x:string):never=>{throw Error('MAINTENANCE_CI_BROKER_'+x)};
function respond(code:number,body:Record<string,unknown>){
 return new Response(JSON.stringify({ok:code===200,...body,
  frozen_ci_red_verified:false,repair_executed:false,
  original_job_completed:false,installation_authorized:false,
  production_changed:false}),
 {status:code,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
}
function same(a:string,b:string){
 if(a.length!==b.length)return false;
 let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);
 return z===0;
}
const config=()=>{
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||key.length<25||token.length<25)
  fail('EXACT_SERVICE_AND_GITHUB_DELIVERY_CONFIG_REQUIRED');
 return {url,key,token};
};
async function rpc(c:{url:string,key:string},name:string,args:Record<string,unknown>){
 if(!['reality_read_signed_maintenance_ci_dispatch_scope_v1',
  'reality_record_signed_maintenance_ci_dispatch_v1'].includes(name))
  fail('RPC_NOT_ALLOWLISTED');
 const response=await fetch(c.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(12500),
  headers:{apikey:c.key,authorization:'Bearer '+c.key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(args)});
 if(!response.ok)fail('OWNER_SCOPED_SIGNED_CLAIM_OR_RECEIPT_MISSING');
 const data=await response.json().catch(()=>null);
 if(!data||typeof data!=='object'||Array.isArray(data))
  fail('SERVICE_READBACK_NOT_OBJECT');
 return data;
}
async function github(token:string,path:string,method='GET',payload?:unknown):Promise<any>{
 const res=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(14000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-signed-maintenance-case-CI-v1',
   'content-type':'application/json'},
  ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
 if(res.status===404&&method==='GET')return null;
 if(!res.ok)fail('GITHUB_TRIGGER_EFFECT_UNVERIFIED');
 const data=await res.json().catch(()=>null);
 if(!data||typeof data!=='object')fail('GITHUB_RESPONSE_NOT_VERIFIED');
 return data;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return respond(405,{status:'MAINTENANCE_CI_BROKER_POST_ONLY'});
  const c=config();
  const a=req.headers.get('apikey')||'',b=req.headers.get('authorization')||'';
  if(!same(a,c.key)||!same(b,'Bearer '+c.key))
   return respond(403,{status:'MAINTENANCE_CI_SERVICE_AUTH_REQUIRED'});
  if(req.headers.get('content-type')!=='application/json')
   return respond(415,{status:'MAINTENANCE_CI_JSON_REQUIRED'});
  const body=await req.text();
  if(body.length<90||body.length>380)
   return respond(400,{status:'MAINTENANCE_CI_BOUND_SOURCE_REQUIRED'});
  const reqData=JSON.parse(body);
  if(!reqData||Array.isArray(reqData)||typeof reqData!=='object'||
   Object.keys(reqData).sort().join(',')!=='maintenance_id,shift_id,worker_run_id'||
   !UUID.test(reqData.maintenance_id)||!UUID.test(reqData.shift_id)||
   !UUID.test(reqData.worker_run_id))
   return respond(400,{status:'MAINTENANCE_CI_BOUND_SCOPE_INVALID'});
  const ids={p_shift_id:reqData.shift_id,
   p_maintenance_id:reqData.maintenance_id,
   p_worker_run_id:reqData.worker_run_id};
  const scope=await rpc(c,'reality_read_signed_maintenance_ci_dispatch_scope_v1',ids);
  if(scope.status!=='SIGNED_MAINTENANCE_CASE_CI_DISPATCH_AUTHORIZED'||
   scope.maintenance_id!==reqData.maintenance_id||
   scope.shift_id!==reqData.shift_id||
   scope.worker_run_id!==reqData.worker_run_id||
   !SOURCE.test(scope.source_ref||'')||
   !HASH.test(scope.source_epoch_receipt_sha256||'')||
   !['HISTORICAL_ZERO_ORIGINAL_CLAIMS_WITH_SIGNED_INQUIRIES',
    'HISTORICAL_SOURCE_EPOCH_MISMATCH_INDEPENDENTLY_REOBSERVED'].includes(
     scope.historical_failure_kind)||
   scope.dispatch_is_only_transport!==true||
   scope.frozen_ci_red_verified!==false||
   scope.repair_executed!==false||
   scope.original_job_completed!==false||
   scope.installation_authorized!==false||
   scope.production_changed!==false)
   fail('EXACT_WARRANTED_MAINTENANCE_PROOF_MISSING');
  const path='reality-maintenance-ci-triggers/'+reqData.maintenance_id+'.json';
  const data=JSON.stringify({
   schema:'reality-signed-maintenance-case-ci-trigger-v1',
   maintenance_id:reqData.maintenance_id,shift_id:reqData.shift_id,
   worker_run_id:reqData.worker_run_id,
   source_ref:scope.source_ref,
   source_epoch_receipt_sha256:scope.source_epoch_receipt_sha256,
   historical_failure_kind:scope.historical_failure_kind,
   frozen_ci_red_verified:false,repair_executed:false,
   original_job_completed:false,installation_authorized:false,
   production_changed:false},null,2)+'\n';
  // GitHub file commits on the isolated feature branch trigger CI via push.
  // No workflow_dispatch registration on main or new GitHub credentials.
  const get=()=>github(c.token,'/contents/'+path+
    '?ref='+encodeURIComponent(BRANCH));
  const prior=await get();
  let commit:string|null=null;
  if(prior){
   if(prior.path!==path||prior.encoding!=='base64'||
      atob(String(prior.content||'').replace(/\s/g,''))!==data)
     fail('EXISTING_GITHUB_TRIGGER_SCOPE_CHANGED');
   const commits=await github(c.token,
     '/commits?path='+encodeURIComponent(path)+
       '&sha='+encodeURIComponent(BRANCH)+'&per_page=1');
   if(!Array.isArray(commits)||commits.length!==1||
      !SHA.test(commits[0]?.sha||''))
    fail('EXISTING_TRIGGER_GITHUB_COMMIT_NOT_FOUND');
   commit=commits[0].sha;
  }else{
   const head=await github(c.token,
     '/git/ref/heads/'+BRANCH);
   if(!SHA.test(head?.object?.sha||''))fail('GITHUB_PREVIEW_BRANCH_NOT_VERIFIED');
   const created=await github(c.token,'/contents/'+path,'PUT',{
    branch:BRANCH,
    message:'Reality: execute signed maintenance CI evidence for '+reqData.maintenance_id,
    content:btoa(data)});
   if(!SHA.test(created?.commit?.sha||'')||
      created?.content?.path!==path)
    fail('NEW_GITHUB_CI_TRIGGER_NOT_PROVEN');
   commit=created.commit.sha;
  }
  const after=await get();
  if(after?.path!==path||after.encoding!=='base64'||
     atob(String(after.content||'').replace(/\s/g,''))!==data)
   fail('CI_GITHUB_TRIGGER_READBACK_MISMATCH');
  if(!SHA.test(commit||''))fail('CI_TRIGGER_COMMIT_REQUIRED');
  const receipt=await rpc(c,'reality_record_signed_maintenance_ci_dispatch_v1',{
   ...ids,p_github_commit_sha:commit});
  if(receipt.status!=='SIGNED_MAINTENANCE_CASE_CI_DISPATCH_CONFIRMED_RED_NOT_VERIFIED'||
     receipt.maintenance_id!==reqData.maintenance_id||
     receipt.shift_id!==reqData.shift_id||
     receipt.github_trigger_commit_sha!==commit||
     !HASH.test(receipt.ci_dispatch_receipt_sha256||'')||
     receipt.frozen_ci_red_verified!==false||
     receipt.repair_executed!==false||
     receipt.original_job_completed!==false||
     receipt.installation_authorized!==false||
     receipt.production_changed!==false)
   fail('DURABLE_GITHUB_TRIGGER_RECEIPT_REQUIRED');
  return respond(200,{status:receipt.status,
   shift_id:reqData.shift_id,maintenance_id:reqData.maintenance_id,
   source_ref:scope.source_ref,github_trigger_commit_sha:commit,
   ci_dispatch_receipt_sha256:receipt.ci_dispatch_receipt_sha256,
   trigger_existing:!!prior});
 }catch(e){
  const code=String(e instanceof Error?e.message:'UNKNOWN');
  if(/^MAINTENANCE_CI_BROKER_[A-Z0-9_]{3,115}$/.test(code))
   console.warn('REALITY_MAINTENANCE_CI_TRANSPORT',code);
  return respond(503,{status:'MAINTENANCE_CASE_CI_BROKER_UNVERIFIED_NO_RED_RECEIPT'});
 }
});
