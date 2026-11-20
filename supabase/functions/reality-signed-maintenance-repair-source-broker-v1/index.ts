// Read-only GitHub source transport for EXACT existing signed maintenance
// candidates. Reuses Reality's Supabase GitHub broker credential. Never
// writes GitHub, executes model source, changes owner authority, or settles.
const PROJECT='hvkfreoagbrphwghjajw';
const REPO='https://api.github.com/repos/maloney2323/Reality';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const FILE=/^(?:src|api\/reality)\/[A-Za-z0-9_./-]+\.js$/;
const fail=(reason:string):never=>{throw Error('SIGNED_SOURCE_BROKER_'+reason)};
const response=(code:number,status:string,extra:Record<string,unknown>={})=>
 new Response(JSON.stringify({
  ok:code===200,status,...extra,
  source_read_only:true,model_generated:false,
  independent_frozen_red_verified:false,independent_ci_verified:false,
  installation_authorized:false,repair_executed:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false
 }),{status:code,headers:{'content-type':'application/json',
  'cache-control':'no-store','x-content-type-options':'nosniff'}});
function same(a:string,b:string){
 if(a.length!==b.length)return false;
 let z=0;for(let i=0;i<a.length;i++)z|=a.charCodeAt(i)^b.charCodeAt(i);
 return z===0;
}
function config(){
 const url=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const github=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
 if(url!=='https://'+PROJECT+'.supabase.co'||
    key.length<25||github.length<25)
  fail('PINNED_PROJECT_CREDENTIALS_UNVERIFIED');
 return {url,key,github};
}
async function rpc(c:{url:string,key:string},name:string,args:Record<string,unknown>){
 if(![
  'reality_read_signed_maintenance_repair_source_scope_v1',
  'reality_read_signed_existing_maintenance_case_ci_scope_v1',
  'reality_record_signed_existing_maintenance_case_ci_v1'
 ].includes(name))fail('UNREGISTERED_SOURCE_RPC');
 const r=await fetch(c.url+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(9000),
  headers:{apikey:c.key,authorization:'Bearer '+c.key,
   'content-type':'application/json'},
  body:JSON.stringify(args)
 });
 if(!r.ok)fail('OWNER_SIGNED_SOURCE_SCOPE_READ_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||typeof d!=='object')fail('SOURCE_SCOPE_RESPONSE_INVALID');
 return d;
}
async function github(c:{github:string},path:string){
 const r=await fetch(REPO+path,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(11000),
  headers:{authorization:'Bearer '+c.github,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-signed-maintenance-source-inspection-v1'}
 });
 if(!r.ok)fail('PINNED_GITHUB_PROVIDER_UNAVAILABLE');
 const d=await r.json().catch(()=>null);
 if(!d||Array.isArray(d)||typeof d!=='object')fail('PINNED_GITHUB_RESPONSE_INVALID');
 return d;
}
async function gitBlobSha(buffer:Uint8Array):Promise<string>{
 const prefix=new TextEncoder().encode('blob '+buffer.length+'\0');
 const body=new Uint8Array(prefix.length+buffer.length);
 body.set(prefix);body.set(buffer,prefix.length);
 const h=await crypto.subtle.digest('SHA-1',body);
 return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// Existing maintenance signed-worker CI reviewer. Both Github source and
// Actions CI evidence are rechecked using Reality's existing private
// broker credential before a same-shift receipt is recorded.
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORKFLOW='.github/workflows/reality-registered-signed-maintenance-executor-v1.yml';
const EXECUTOR_BRANCH='repair/maintenance-warrant-scope-handoff-20261119';
async function optionalGithub(c:{github:string},path:string){
 const r=await fetch(REPO+path,{method:'GET',redirect:'error',
  cache:'no-store',signal:AbortSignal.timeout(11000),
  headers:{authorization:'Bearer '+c.github,
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-signed-maintenance-sourcecase-review-v1'}});
 if(r.status===404)return null;
 if(!r.ok)fail('CASE_CI_INDEPENDENT_GITHUB_PROVIDER_UNAVAILABLE');
 return r.json();
}
async function verifiedGithubBlob(c:{github:string},path:string,ref:string){
 const file=await optionalGithub(c,'/contents/'+path+'?ref='+ref);
 if(file===null)return null;
 if(file.path!==path||file.encoding!=='base64'||
    !SHA.test(file.sha||'')||typeof file.content!=='string'||
    !Number.isSafeInteger(file.size)||file.size<20||
    file.size>90000)fail('CASE_CI_BLOB_METADATA_UNVERIFIED');
 const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),
   x=>x.charCodeAt(0));
 if(bytes.length!==file.size||await gitBlobSha(bytes)!==file.sha)
  fail('CASE_CI_GITHUB_BLOB_SHA_MISMATCH');
 return {sha:file.sha,text:new TextDecoder().decode(bytes)};
}
async function verifyOneCase(c:{url:string,key:string,github:string},
 b:any,scope:any,run:any,jobs:any,arts:any){
 if(!UUID.test(scope.maintenance_id||'')||
    !UUID.test(scope.owner_id||'')||scope.shift_id!==b.shift_id||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(scope.source_ref||'')||
    !HASH.test(scope.signed_repair_handoff_receipt_sha256||'')||
    !HASH.test(scope.source_epoch_receipt_sha256||'')||
    !HASH.test(scope.independent_failure_baseline_receipt_sha256||'')||
    typeof scope.historical_failure_kind!=='string')
  fail('CASE_CI_SIGNED_MAINTENANCE_SOURCE_UNVERIFIED');
 const prefix='reality-maintenance-case-specs/'+scope.maintenance_id+'.json';
 const specFile=await verifiedGithubBlob(c,prefix,b.release_sha);
 if(specFile===null)return null; // Other signed incidents require their own frozen suite.
 let spec:any;
 try{spec=JSON.parse(specFile.text)}catch{fail('CASE_CI_SPEC_JSON_INVALID')}
 if(spec?.schema!=='reality-maintenance-case-frozen-ci-v1'||
    spec.maintenance_id!==scope.maintenance_id||
    spec.shift_id!==scope.shift_id||
    spec.source_ref!==scope.source_ref||
    spec.historical_failure_kind!==scope.historical_failure_kind||
    !SHA.test(spec.historical_commit_sha||'')||
    !/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(spec.frozen_test_path||'')||
    !/^src\/[a-z0-9_./-]+\.js$/.test(spec.target_source_path||'')||
    String(spec.target_source_path).includes('..')||
    String(spec.frozen_test_path).includes('..')||
    typeof spec.expected_red_test_name!=='string'||
    spec.expected_red_test_name.length<35||
    spec.original_customer_execution_proven!==false||
    spec.case_regression_only!==true||
    spec.installation_authorized!==false)
  fail('CASE_CI_SPEC_DOES_NOT_MATCH_SIGNED_SCOPE');
 const triggerPath='reality-maintenance-ci-triggers/'+scope.maintenance_id+'.json';
 const triggerFile=await verifiedGithubBlob(c,triggerPath,b.release_sha);
 if(!triggerFile)fail('CASE_CI_EXISTING_SIGNED_TRIGGER_MISSING');
 let trigger:any;
 try{trigger=JSON.parse(triggerFile.text)}catch{fail('CASE_CI_TRIGGER_JSON_INVALID')}
 if(trigger.schema!=='reality-signed-maintenance-case-ci-trigger-v1'||
    trigger.maintenance_id!==scope.maintenance_id||
    trigger.shift_id!==scope.shift_id||
    trigger.source_ref!==scope.source_ref||
    trigger.historical_failure_kind!==scope.historical_failure_kind||
    trigger.source_epoch_receipt_sha256!==scope.source_epoch_receipt_sha256||
    trigger.frozen_ci_red_verified!==false||
    trigger.repair_executed!==false||
    trigger.original_job_completed!==false||
    trigger.installation_authorized!==false||
    trigger.production_changed!==false)
  fail('CASE_CI_OLD_SIGNED_TRIGGER_SOURCE_DRIFT');
 const scriptPath='scripts/reality-maintenance-sourcebound-case-ci-v1.mjs';
 const [script,testFile,corrected,historical]=await Promise.all([
  verifiedGithubBlob(c,scriptPath,b.release_sha),
  verifiedGithubBlob(c,spec.frozen_test_path,b.release_sha),
  verifiedGithubBlob(c,spec.target_source_path,b.release_sha),
  verifiedGithubBlob(c,spec.target_source_path,spec.historical_commit_sha)
 ]);
 if(!script||!testFile||!corrected||!historical||
    !script.text.includes('SIGNED_CASE_RED_GREEN_INDEPENDENT_TEST_PROVED')||
    !script.text.includes('verifySuite(red,{expectsRed:true')||
    !script.text.includes('copyFileSync(spec.frozen_test_path,testDest)')||
    !testFile.text.includes(spec.expected_red_test_name)||
    !historical.text.includes(spec.historical_defect_marker)||
    historical.text.includes(spec.corrected_defect_guard)||
    !corrected.text.includes(spec.corrected_defect_guard))
  fail('CASE_CI_HISTORICAL_RED_CORRECTED_GREEN_SOURCE_MISMATCH');
 const actualJobs=Array.isArray(jobs?.jobs)?jobs.jobs.filter((x:any)=>
  x.run_id===run.id&&x.name==='verify-exact-registered-handoff'&&
  x.status==='completed'&&x.conclusion==='success'&&
  x.head_sha===run.head_sha&&
  Array.isArray(x.steps)&&
  x.steps.some((v:any)=>v.name===
    'Execute SAME signed maintenance source-epoch frozen regression on historical RED and corrected GREEN'&&v.conclusion==='success')&&
  x.steps.some((v:any)=>v.name===
    'Preserve exact signed source-case RED GREEN evidence without claiming original settlement'&&v.conclusion==='success')
 ):[];
 const actualArtifacts=Array.isArray(arts?.artifacts)?
  arts.artifacts.filter((x:any)=>
   x.name==='reality-maintenance-sourcebound-case-red-green-'+run.id&&
   x.expired===false&&HASH.test(x.digest||'')&&
   Number.isSafeInteger(x.id)&&x.id>0&&
   Number.isSafeInteger(x.size_in_bytes)&&x.size_in_bytes>=300&&
   x.size_in_bytes<=20000&&
   (!x.workflow_run?.head_sha||x.workflow_run.head_sha===run.head_sha)
  ):[];
 if(actualJobs.length!==1||actualArtifacts.length!==1)
  return null;
 const result=await rpc(c,'reality_record_signed_existing_maintenance_case_ci_v1',{
  p_shift_id:b.shift_id,
  p_worker_run_id:b.worker_run_id,
  p_maintenance_id:scope.maintenance_id,
  p_release_sha:b.release_sha,
  p_github_run_id:run.id,
  p_github_job_id:actualJobs[0].id,
  p_artifact_id:actualArtifacts[0].id,
  p_artifact_digest:actualArtifacts[0].digest,
  p_frozen_test_blob_sha:testFile.sha,
  p_signed_case_spec_blob_sha:specFile.sha,
  p_signed_trigger_blob_sha:triggerFile.sha,
  p_independent_runner_blob_sha:script.sha
 });
 if(result?.status!=='EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED'||
    result.maintenance_id!==scope.maintenance_id||
    result.owner_id!==scope.owner_id||
    result.shift_id!==b.shift_id||
    result.source_ref!==scope.source_ref||
    result.github_run_id!==run.id||
    !HASH.test(result.case_specific_ci_receipt_sha256||'')||
    result.case_specific_frozen_red_attested!==true||
    result.code_regression_green_verified!==true||
    result.repair_installed!==false||result.repair_executed!==false||
    result.original_job_completed!==false||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.new_shift_started!==false)
  fail('CASE_CI_DURABLE_SIGNED_RECEIPT_UNVERIFIED');
 return result;
}
async function verifiedCaseCi(c:{url:string,key:string,github:string},b:any){
 if(Object.keys(b).sort().join(',')!=='mode,release_sha,shift_id,worker_run_id'||
    !UUID.test(b.shift_id||'')||!UUID.test(b.worker_run_id||'')||
    !SHA.test(b.release_sha||''))
  return response(400,'CASE_CI_EXACT_SIGNED_WORKER_REQUEST_INVALID');
 const scope=await rpc(c,'reality_read_signed_existing_maintenance_case_ci_scope_v1',{
  p_shift_id:b.shift_id,p_worker_run_id:b.worker_run_id
 });
 if(scope.status==='NO_CURRENT_SIGNED_MAINTENANCE_CASE_CI_REVIEW_WARRANT'||
    scope.status==='NO_UNREVIEWED_SIGNED_MAINTENANCE_CASE_CI_SCOPE')
  return response(200,scope.status,{reviewed_count:0});
 if(scope.status!=='SIGNED_EXISTING_MAINTENANCE_CASE_CI_INDEPENDENT_REVIEW_READY'||
    scope.shift_id!==b.shift_id||
    !UUID.test(scope.owner_id||'')||
    !Array.isArray(scope.cases)||
    scope.cases.length!==scope.case_count||
    scope.case_count<1||scope.case_count>4||
    scope.case_ci_read_authorized!==true||
    scope.original_job_completed!==false||
    scope.installation_authorized!==false||
    scope.production_changed!==false)
  fail('CASE_CI_WARRANT_READBACK_INVALID');
 const runs=await github(c,'/actions/runs?branch='+
   encodeURIComponent(EXECUTOR_BRANCH)+'&per_page=100');
 const matches=Array.isArray(runs?.workflow_runs)?
  runs.workflow_runs.filter((x:any)=>
   x.name==='Reality registered signed maintenance executor'&&
   x.path===WORKFLOW&&
   x.head_sha===b.release_sha&&
   x.head_branch===EXECUTOR_BRANCH&&
   ['push','pull_request'].includes(x.event)&&
   x.status==='completed'&&x.conclusion==='success'&&
   Number.isSafeInteger(x.id)&&x.id>0&&
   x.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+x.id
  ):[];
 if(matches.length===0)
  return response(200,'NO_PINNED_SIGNED_CASE_CI_GITHUB_RUN_YET',{
   reviewed_count:0,expected_sha:b.release_sha});
 const run=matches.sort((x:any,y:any)=>y.id-x.id)[0];
 const [jobs,arts]=await Promise.all([
   github(c,'/actions/runs/'+run.id+'/jobs?per_page=100'),
   github(c,'/actions/runs/'+run.id+'/artifacts?per_page=100')
 ]);
 for(const original of scope.cases){
  const result=await verifyOneCase(c,b,original,run,jobs,arts);
  if(result!==null)
   return response(200,result.status,{
    maintenance_id:result.maintenance_id,shift_id:result.shift_id,
    github_run_id:result.github_run_id,
    case_specific_ci_receipt_sha256:result.case_specific_ci_receipt_sha256,
    case_specific_frozen_red_attested:true,
    code_regression_green_verified:true,
    original_job_completed:false,installation_authorized:false,
    production_changed:false,new_shift_started:false,
    next_action:result.next_action
   });
 }
 return response(200,'NO_MATCHING_FROZEN_SOURCE_CASE_OR_PINNED_ARTIFACT',{
  reviewed_count:0,expected_sha:b.release_sha});
}

Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return response(405,'SIGNED_SOURCE_BROKER_POST_ONLY');
  const c=config();
  if(!same(req.headers.get('apikey')||'',c.key)||
     !same(req.headers.get('authorization')||'','Bearer '+c.key))
   return response(403,'SIGNED_SOURCE_BROKER_SERVICE_AUTH_REQUIRED');
  if(req.headers.get('content-type')!=='application/json')
   return response(415,'SIGNED_SOURCE_BROKER_JSON_ONLY');
  const raw=await req.text();
  if(raw.length<120||raw.length>620)
   return response(400,'SIGNED_SOURCE_BROKER_EXACT_BODY_REQUIRED');
  const b=JSON.parse(raw);
  if(b?.mode==='case_ci'){
   return await verifiedCaseCi(c,b);
  }
  if(!b||Array.isArray(b)||typeof b!=='object'||
     !['manifest','source'].includes(b.mode)||
     !UUID.test(b.maintenance_id||'')||
     !UUID.test(b.request_id||'')||
     !SHA.test(b.release_sha||'')||
     Object.keys(b).sort().join(',')!==
      (b.mode==='manifest'?'maintenance_id,mode,release_sha,request_id':
       'maintenance_id,mode,release_sha,request_id,target_path')||
     (b.mode==='source'&&(!FILE.test(b.target_path||'')||
       b.target_path.includes('..')||b.target_path.includes('//'))))
   return response(400,'SIGNED_SOURCE_BROKER_SCOPE_INVALID');
  const scope=await rpc(c,'reality_read_signed_maintenance_repair_source_scope_v1',{
   p_maintenance_id:b.maintenance_id,p_request_id:b.request_id,
   p_release_sha:b.release_sha
  });
  if(scope.status!=='SIGNED_MAINTENANCE_CANDIDATE_SOURCE_BROKER_SCOPE_VERIFIED'||
     scope.maintenance_id!==b.maintenance_id||
     scope.request_id!==b.request_id||
     scope.release_sha!==b.release_sha||
     !UUID.test(scope.owner_id||'')||
     !UUID.test(scope.shift_id||'')||
     scope.source_read_authorized!==true||
     scope.model_candidate_only!==true||
     scope.installation_authorized!==false||
     scope.original_job_completed!==false||
     scope.production_changed!==false)
   return response(403,'SIGNED_SOURCE_BROKER_LEDGER_SCOPE_REQUIRED');
  const commit=await github(c,'/git/commits/'+b.release_sha);
  if(commit.sha!==b.release_sha||!SHA.test(commit.tree?.sha||''))
   fail('PINNED_GIT_COMMIT_DRIFT');
  const tree=await github(c,'/git/trees/'+commit.tree.sha+'?recursive=1');
  if(tree.sha!==commit.tree.sha||tree.truncated===true||
     !Array.isArray(tree.tree))
   fail('PINNED_SOURCE_TREE_DRIFT');
  const files=tree.tree.filter((x:any)=>x?.type==='blob'&&
   FILE.test(x.path||'')&&!x.path.includes('..')&&
   SHA.test(x.sha||'')&&Number.isSafeInteger(x.size)&&
   x.size>=300&&x.size<=60000)
   .map((x:any)=>({path:x.path,sha:x.sha,size:x.size}));
  if(!files.length||files.length>2500)
   fail('PINNED_SOURCE_LIST_OUT_OF_BOUNDS');
  // Source selection is restricted to the RUNNING signed executor's
  // own exact static dependency graph, not incidental UI/projection
  // files whose vocabulary happens to resemble a GitHub PR description.
  const workerPath='api/reality/governed-employee-shift-worker.js';
  const worker=await github(c,'/contents/'+workerPath+
   '?ref='+b.release_sha);
  if(worker.path!==workerPath||worker.encoding!=='base64'||
     !SHA.test(worker.sha||'')||
     !Number.isSafeInteger(worker.size)||worker.size<1000||
     worker.size>190000||typeof worker.content!=='string')
   fail('PINNED_SIGNED_WORKER_SOURCE_UNVERIFIED');
  const workerBytes=Uint8Array.from(
   atob(worker.content.replace(/\s/g,'')),v=>v.charCodeAt(0));
  if(workerBytes.length!==worker.size||
     await gitBlobSha(workerBytes)!==worker.sha)
   fail('SIGNED_WORKER_GIT_SOURCE_HASH_INVALID');
  const workerText=new TextDecoder().decode(workerBytes);
  const imported=new Set([...workerText.matchAll(
   /from\s+['"]\.\.\/\.\.\/(src\/[A-Za-z0-9_./-]+\.js)['"]/g
  )].map(m=>m[1]).filter(x=>!x.includes('..')));
  const eligible=files.filter((x:{path:string})=>imported.has(x.path));
  if(!eligible.length||eligible.length>350)
   fail('SIGNED_WORKER_EXECUTABLE_MODULE_GRAPH_UNVERIFIED');
  if(b.mode==='manifest')
   return response(200,'SIGNED_MAINTENANCE_SOURCE_MANIFEST_VERIFIED',{
    maintenance_id:b.maintenance_id,request_id:b.request_id,
    release_sha:b.release_sha,source_tree_sha:tree.sha,
    worker_source_blob_sha:worker.sha,runtime_imports_count:eligible.length,
    files:eligible
   });
  const match=eligible.find((x:{path:string})=>x.path===b.target_path);
  if(!match)fail('SOURCE_FILE_NOT_IN_PINNED_TREE');
  const file=await github(c,'/contents/'+b.target_path+
   '?ref='+b.release_sha);
  if(file.path!==match.path||file.sha!==match.sha||
     file.size!==match.size||file.encoding!=='base64'||
     typeof file.content!=='string')
   fail('SOURCE_FILE_METADATA_DRIFT');
  const data=Uint8Array.from(atob(file.content.replace(/\s/g,'')),
   v=>v.charCodeAt(0));
  if(data.length!==match.size||await gitBlobSha(data)!==match.sha)
   fail('SOURCE_FILE_GIT_BLOB_MISMATCH');
  return response(200,'SIGNED_MAINTENANCE_SOURCE_FILE_VERIFIED',{
   maintenance_id:b.maintenance_id,request_id:b.request_id,
   release_sha:b.release_sha,source_tree_sha:tree.sha,
   path:file.path,sha:file.sha,size:data.length,
   encoding:'base64',content:file.content
  });
 }catch(e){
  const msg=String(e instanceof Error?e.message:'UNKNOWN');
  if(/^SIGNED_SOURCE_BROKER_[A-Z0-9_]{3,90}$/.test(msg))
   console.warn('REALITY_SIGNED_SOURCE_PROVIDER',msg);
  return response(503,'SIGNED_SOURCE_BROKER_PROVIDER_OR_SCOPE_UNVERIFIED');
 }
});
