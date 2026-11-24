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
  'reality_read_final_loop_event_resume_shadow_v1',
  'reality_record_signed_existing_maintenance_case_ci_v1',
  'reality_read_signed_existing_maintenance_artifact_scope_v1',
  'reality_record_signed_existing_maintenance_artifact_v1',
  'reality_read_signed_maintenance_install_target_review_v1',
  'reality_record_signed_maintenance_install_target_review_v1'
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
 const scoped=Object.prototype.hasOwnProperty.call(b,'resume_event_id');
 if(Object.keys(b).sort().join(',')!==(scoped?'mode,release_sha,resume_event_id,shift_id,worker_run_id':'mode,release_sha,shift_id,worker_run_id')||
    (scoped&&!UUID.test(b.resume_event_id||''))||
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
 let cases=scope.cases;
 if(scoped){
  const shadow=await rpc(c,'reality_read_final_loop_event_resume_shadow_v1',{p_shift_id:b.shift_id});
  const events=Array.isArray(shadow?.events)?shadow.events.filter((e:any)=>
   e.event_id===b.resume_event_id&&e.event_state==='SHADOW_PENDING'&&
   e.source_current===true&&e.would_resume_suspended_obligation===true&&
   ['QUALIFIER_PROOF_CHANGED','INDEPENDENT_FROZEN_CI_RECEIPT'].includes(e.event_kind)&&
   Array.isArray(shadow.subscriptions)&&shadow.subscriptions.some((s:any)=>
    s.original_work_id===e.original_work_id&&s.source_ref===e.source_ref&&
    s.continuity_revision===e.continuity_revision&&s.condition_kind===e.event_kind&&
    s.next_qualified_action==='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC')):[];
  if(shadow?.status!=='FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY'||
     shadow.shift_id!==b.shift_id||shadow.execution_authorized!==false||events.length!==1)
   return response(200,'NO_CURRENT_EXACT_CASE_CI_RESUME_EVENT',{reviewed_count:0});
  cases=scope.cases.filter((x:any)=>x.source_ref===events[0].source_ref&&
   x.owner_id===scope.owner_id&&x.shift_id===b.shift_id);
  if(cases.length!==1)return response(200,'NO_CURRENT_EXACT_CASE_CI_RESUME_EVENT',{reviewed_count:0});
 }
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
 for(const original of cases){
  const result=await verifyOneCase(c,b,original,run,jobs,arts);
  if(result!==null)
   return response(200,result.status,{
    maintenance_id:result.maintenance_id,shift_id:result.shift_id,
    ...(scoped?{resume_event_id:b.resume_event_id,source_ref:original.source_ref}:{}),
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


// The existing signed shift controller re-observes a real verified artifact.
// No GitHub write, independent install permission or customer settlement.
async function verifiedArtifact(c:{url:string,key:string,github:string},b:any){
 if(!b||Array.isArray(b)||typeof b!=='object'||
 Object.keys(b).sort().join(',')!=='mode,release_sha,shift_id,worker_run_id'||
 !UUID.test(b.shift_id||'')||!UUID.test(b.worker_run_id||'')||
 !SHA.test(b.release_sha||''))
  return response(400,'ARTIFACT_SIGNED_WORKER_REQUEST_INVALID');
 const scope=await rpc(c,'reality_read_signed_existing_maintenance_artifact_scope_v1',{
  p_shift_id:b.shift_id,p_worker_run_id:b.worker_run_id});
 if(['NO_SIGNED_MAINTENANCE_ARTIFACT_WORKER_SCOPE',
  'NO_UNRECONCILED_VERIFIED_MAINTENANCE_ARTIFACT'].includes(scope.status))
  return response(200,scope.status,{reconciled_count:0});
 if(scope.status!=='SIGNED_MAINTENANCE_VERIFIED_ARTIFACT_CANDIDATE_READY'||
  scope.shift_id!==b.shift_id||!UUID.test(scope.owner_id||'')||
  !Array.isArray(scope.cases)||scope.candidate_count!==scope.cases.length||
  scope.candidate_count<1||scope.candidate_count>4||
  scope.installation_authorized!==false||
  scope.original_job_completed!==false||scope.production_changed!==false)
   fail('ARTIFACT_SIGNED_LEDGER_SCOPE_INVALID');
 const runs=await github(c,'/actions/runs?branch='+
  encodeURIComponent(EXECUTOR_BRANCH)+'&per_page=100');
 const eligible=(runs?.workflow_runs||[]).filter((r:any)=>
  r.name==='Reality registered signed maintenance executor'&&
  r.path===WORKFLOW&&r.head_branch===EXECUTOR_BRANCH&&
  r.head_sha===b.release_sha&&r.status==='completed'&&
  r.conclusion==='success'&&['push','pull_request'].includes(r.event)&&
  Number.isSafeInteger(r.id)&&r.id>10000&&
  r.html_url==='https://github.com/maloney2323/Reality/actions/runs/'+r.id);
 if(!eligible.length)return response(200,'NO_PINNED_MAINTENANCE_ARTIFACT_CI_YET');
 const run=eligible.sort((x:any,y:any)=>y.id-x.id)[0];
 const [jobs,arts,builder,workflow]=await Promise.all([
  github(c,'/actions/runs/'+run.id+'/jobs?per_page=100'),
  github(c,'/actions/runs/'+run.id+'/artifacts?per_page=100'),
  verifiedGithubBlob(c,
   'scripts/reality-maintenance-build-verified-repair-artifact-v1.mjs',
   b.release_sha),
  verifiedGithubBlob(c,WORKFLOW,b.release_sha)]);
 if(!builder||!workflow||
  !builder.text.includes('REALITY_SIGNED_MAINTENANCE_EXACT_ARTIFACT_BUILT')||
  !builder.text.includes('case_specific_source_epoch_regression_verified')||
  !workflow.text.includes('node scripts/reality-maintenance-build-verified-repair-artifact-v1.mjs'))
  fail('ARTIFACT_SIGNED_BUILDER_SOURCE_UNVERIFIED');
 const jobsMatched=(jobs?.jobs||[]).filter((j:any)=>
  j.run_id===run.id&&j.name==='verify-exact-registered-handoff'&&
  j.head_sha===b.release_sha&&j.conclusion==='success'&&
  j.status==='completed'&&Array.isArray(j.steps)&&[
   'Execute SAME signed maintenance source-epoch frozen regression on historical RED and corrected GREEN',
   'Build exact reviewed candidate source artifact after independent RED GREEN',
   'Preserve owner-reviewable source artifact, not installation authority'
  ].every(name=>j.steps.some((z:any)=>z.name===name&&z.conclusion==='success')));
 if(jobsMatched.length!==1)
  return response(200,'ARTIFACT_PINNED_CI_STEPS_MISSING');
 for(const item of scope.cases){
  if(!UUID.test(item.maintenance_id||'')||
   item.owner_id!==scope.owner_id||item.shift_id!==b.shift_id||
   !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(item.source_ref||'')||
   !HASH.test(item.case_ci_receipt_sha256||'')||
   !SHA.test(item.frozen_test_blob_sha||''))
   fail('ARTIFACT_SIGNED_CASE_MISMATCH');
  const specFile=await verifiedGithubBlob(c,
   'reality-maintenance-case-specs/'+item.maintenance_id+'.json',
   b.release_sha);
  if(!specFile)continue;
  const triggerFile=await verifiedGithubBlob(c,
   'reality-maintenance-ci-triggers/'+item.maintenance_id+'.json',
   b.release_sha);
  if(!triggerFile)fail('ARTIFACT_SIGNED_TRIGGER_ABSENT');
  let spec:any,trigger:any;
  try{spec=JSON.parse(specFile.text);trigger=JSON.parse(triggerFile.text)}
  catch{fail('ARTIFACT_SIGNED_SPEC_JSON_INVALID')}
  if(spec.schema!=='reality-maintenance-case-frozen-ci-v1'||
   spec.maintenance_id!==item.maintenance_id||
   spec.shift_id!==b.shift_id||spec.source_ref!==item.source_ref||
   spec.historical_failure_kind!==item.historical_failure_kind||
   !SHA.test(spec.historical_commit_sha||'')||
   !/^src\/[a-z0-9._/-]+\.js$/.test(spec.target_source_path||'')||
   String(spec.target_source_path).includes('..')||
   !/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/.test(spec.frozen_test_path||'')||
   String(spec.frozen_test_path).includes('..')||
   spec.installation_authorized!==false||
   spec.original_customer_execution_proven!==false||
   spec.case_regression_only!==true||
   trigger.maintenance_id!==item.maintenance_id||
   trigger.shift_id!==b.shift_id||trigger.source_ref!==item.source_ref||
   trigger.historical_failure_kind!==item.historical_failure_kind||
   trigger.installation_authorized!==false||
   trigger.production_changed!==false||
   trigger.original_job_completed!==false||
   trigger.repair_executed!==false)
   fail('ARTIFACT_SIGNED_CASE_SOURCE_DRIFT');
  const matches=(arts?.artifacts||[]).filter((a:any)=>
   a.name==='reality-maintenance-exact-repair-approval-packet-'+run.id&&
   a.expired===false&&HASH.test(a.digest||'')&&
   Number.isSafeInteger(a.id)&&a.id>10000&&
   Number.isSafeInteger(a.size_in_bytes)&&
   a.size_in_bytes>=500&&a.size_in_bytes<=150000&&
   (!a.workflow_run?.head_sha||a.workflow_run.head_sha===b.release_sha));
  if(matches.length!==1)continue;
  const [corrected,historical,test]=await Promise.all([
   verifiedGithubBlob(c,spec.target_source_path,b.release_sha),
   verifiedGithubBlob(c,spec.target_source_path,spec.historical_commit_sha),
   verifiedGithubBlob(c,spec.frozen_test_path,b.release_sha)]);
  if(!corrected||!historical||!test||
   test.sha!==item.frozen_test_blob_sha||
   historical.sha===corrected.sha||
   !historical.text.includes(spec.historical_defect_marker)||
   historical.text.includes(spec.corrected_defect_guard)||
   !corrected.text.includes(spec.corrected_defect_guard))
   fail('ARTIFACT_SOURCE_AND_FROZEN_FAILURE_UNVERIFIED');
  const record=await rpc(c,'reality_record_signed_existing_maintenance_artifact_v1',{
   p_shift_id:b.shift_id,p_worker_run_id:b.worker_run_id,
   p_maintenance_id:item.maintenance_id,
   p_case_ci_receipt_sha256:item.case_ci_receipt_sha256,
   p_candidate_commit_sha:b.release_sha,
   p_source_path:spec.target_source_path,
   p_candidate_blob_sha:corrected.sha,
   p_historical_blob_sha:historical.sha,
   p_frozen_test_blob_sha:test.sha,p_builder_blob_sha:builder.sha,
   p_github_run_id:run.id,p_github_job_id:jobsMatched[0].id,
   p_github_artifact_id:matches[0].id,
   p_github_artifact_digest:matches[0].digest,
   p_artifact_packet_sha256:matches[0].digest});
  if(record.status!=='EXACT_MAINTENANCE_SOURCE_REPAIR_ARTIFACT_RECORDED'||
   record.maintenance_id!==item.maintenance_id||
   record.shift_id!==b.shift_id||record.owner_id!==scope.owner_id||
   record.candidate_commit_sha!==b.release_sha||
   record.source_blob_sha!==corrected.sha||
   record.github_run_id!==run.id||
   record.github_artifact_id!==matches[0].id||
   record.github_artifact_digest!==matches[0].digest||
   !HASH.test(record.review_receipt_sha256||'')||
   record.install_target_verified!==false||
   record.owner_approval_ready!==false||
   record.installation_authorized!==false||
   record.repair_installed!==false||
   record.original_job_completed!==false||
   record.production_changed!==false)
   fail('ARTIFACT_RECORD_NOT_INDEPENDENTLY_ATTESTED');
  return response(200,record.status,{
   owner_id:record.owner_id,shift_id:record.shift_id,
   maintenance_id:record.maintenance_id,source_ref:record.source_ref,
   candidate_commit_sha:record.candidate_commit_sha,
   source_blob_sha:record.source_blob_sha,
   github_run_id:record.github_run_id,
   github_artifact_id:record.github_artifact_id,
   github_artifact_digest:record.github_artifact_digest,
   review_receipt_sha256:record.review_receipt_sha256,
   case_ci_receipt_sha256:record.case_ci_receipt_sha256,
   exact_artifact_review_verified:true,
   owner_approval_ready:false,install_target_verified:false,
   repair_installed:false,
   next_action:'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED'});
 }
 return response(200,'NO_PINNED_VERIFIED_REPAIR_ARTIFACT_MATCHED_CASE');
}


const TARGET_BRANCH='reality/chat-direct-work-handoff-20261115';
// Existing broker performs read-only GitHub target and rollback inspection;
// its independent service-role receipt NEVER creates owner approval.
async function verifiedTarget(c:{url:string,key:string,github:string},b:any){
 if(!b||Object.keys(b).sort().join(',')!=='mode,release_sha,shift_id,worker_run_id'||
  !UUID.test(b.shift_id||'')||!UUID.test(b.worker_run_id||'')||!SHA.test(b.release_sha||''))
  return response(400,'TARGET_REVIEW_EXACT_SIGNED_REQUEST_REQUIRED');
 const x=await rpc(c,'reality_read_signed_maintenance_install_target_review_v1',{
  p_shift_id:b.shift_id,p_worker_run_id:b.worker_run_id});
 if(x.status==='NO_SIGNED_MAINTENANCE_INSTALL_TARGET_REVIEW_DUE'&&
  x.installation_authorized===false&&x.repair_installed===false&&
  x.original_job_completed===false&&x.production_changed===false)
  return response(200,x.status);
 if(x.status!=='SIGNED_MAINTENANCE_EXACT_INSTALL_TARGET_REVIEW_DUE'||
  x.shift_id!==b.shift_id||!UUID.test(x.owner_id||'')||
  !UUID.test(x.maintenance_id||'')||
  x.reviewer_worker_run_id!==b.worker_run_id||
  x.artifact_worker_run_id===b.worker_run_id||
  !UUID.test(x.artifact_worker_run_id||'')||
  x.target_branch!==TARGET_BRANCH||
  !/^src\/[a-z0-9_./-]+\.js$/.test(x.source_path||'')||
  x.source_path.includes('..')||
  !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(x.source_ref||'')||
  !SHA.test(x.candidate_commit_sha||'')||
  !SHA.test(x.candidate_source_blob_sha||'')||
  !SHA.test(x.historical_source_blob_sha||'')||
  !HASH.test(x.case_ci_receipt_sha256||'')||
  !HASH.test(x.artifact_receipt_sha256||'')||
  x.installation_authorized!==false||x.original_job_completed!==false||
  x.owner_approval_ready!==false||x.production_changed!==false||
  x.new_shift_started!==false)
  fail('TARGET_REVIEW_OWNER_WARRANT_OR_ARTIFACT_UNVERIFIED');
 const ref=await github(c,'/git/ref/heads/'+TARGET_BRANCH);
 if(ref.ref!=='refs/heads/'+TARGET_BRANCH||!SHA.test(ref.object?.sha||''))
  fail('TARGET_REVIEW_TARGET_BRANCH_UNVERIFIED');
 const [candidate,target]=await Promise.all([
  verifiedGithubBlob(c,x.source_path,x.candidate_commit_sha),
  verifiedGithubBlob(c,x.source_path,ref.object.sha)
 ]);
 if(!candidate||!target||candidate.sha!==x.candidate_source_blob_sha)
  return response(200,'SIGNED_MAINTENANCE_INSTALL_TARGET_PROVIDER_PROOF_UNAVAILABLE',{
   maintenance_id:x.maintenance_id});
 if(target.sha!==x.historical_source_blob_sha)
  return response(200,'SIGNED_MAINTENANCE_INSTALL_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',{
   maintenance_id:x.maintenance_id});
 const second=await github(c,'/git/ref/heads/'+TARGET_BRANCH);
 if(second.ref!==ref.ref||second.object?.sha!==ref.object.sha)
  return response(200,'SIGNED_MAINTENANCE_INSTALL_TARGET_SOURCE_DRIFT_REQUALIFICATION_REQUIRED',{
   maintenance_id:x.maintenance_id});
 const y=await rpc(c,'reality_record_signed_maintenance_install_target_review_v1',{
  p_shift_id:b.shift_id,p_worker_run_id:b.worker_run_id,
  p_maintenance_id:x.maintenance_id,p_candidate_blob_sha:candidate.sha,
  p_target_branch:TARGET_BRANCH,p_target_head_sha:ref.object.sha,
  p_target_existing_blob_sha:target.sha});
 if(y.status!=='EXACT_SIGNED_MAINTENANCE_INSTALL_TARGET_INDEPENDENTLY_REVIEWED'||
  y.shift_id!==b.shift_id||y.owner_id!==x.owner_id||
  y.maintenance_id!==x.maintenance_id||
  y.candidate_commit_sha!==x.candidate_commit_sha||
  y.candidate_source_blob_sha!==candidate.sha||
  y.target_branch!==TARGET_BRANCH||y.target_head_sha!==ref.object.sha||
  y.target_existing_blob_sha!==target.sha||
  !HASH.test(y.target_review_receipt_sha256||'')||
  y.owner_approval_ready!==false||y.installation_authorized!==false||
  y.repair_installed!==false||y.original_job_completed!==false||
  y.production_changed!==false||y.new_shift_started!==false)
  fail('TARGET_REVIEW_DURABLE_INDEPENDENT_RECEIPT_UNVERIFIED');
 return response(200,y.status,{
  maintenance_id:y.maintenance_id,owner_id:y.owner_id,shift_id:y.shift_id,
  candidate_commit_sha:y.candidate_commit_sha,
  candidate_source_blob_sha:y.candidate_source_blob_sha,
  target_branch:y.target_branch,target_head_sha:y.target_head_sha,
  target_existing_blob_sha:y.target_existing_blob_sha,
  target_review_receipt_sha256:y.target_review_receipt_sha256,
  install_target_verified:true,owner_approval_ready:false,repair_installed:false});
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
  if(b?.mode==='artifact'){
   return await verifiedArtifact(c,b);
  }
  if(b?.mode==='target'){
   return await verifiedTarget(c,b);
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
