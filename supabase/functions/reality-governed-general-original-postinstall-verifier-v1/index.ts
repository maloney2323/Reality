// The previously authorized original job settles ONLY after its exact
import {independentlyAcceptInstalledMaintenance} from './maintenance.ts';
// owner-approved isolated source commit independently executes the frozen
// original acceptance job AND the Vercel GitHub App corroborates deployment.
// No extra owner confirmation, manual resume, or fabricated ROI is allowed.
const ROOT='https://api.github.com/repos/maloney2323/Reality';
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^src\/[a-zA-Z0-9/_-]+\.js$/;
const BRANCH=/^reality\/[a-zA-Z0-9/_-]{10,135}$/;
const CHAT_BRANCH=/^(repair|reality)\/[a-zA-Z0-9/_-]{10,135}$/;
const CHAT_SOURCE=/^(src\/|api\/reality\/)[a-zA-Z0-9_/-]+\.js$/;
const CHAT_WORKFLOW='.github/workflows/reality-signed-chat-full-goal-acceptance-v1.yml';
const CHAT_SUITE='test/reality-signed-chat-full-goal-functional-v1.test.js';
const CHAT_CI_NAME='Reality signed Chat original full-goal functional acceptance';
const chatScope=s=>s?.source_family==='SIGNED_CHAT_DEVELOPMENT_RECOVERY';
const CI_NAME='Reality independently accepted governed original post-install';
const CI_WORKFLOW='.github/workflows/reality-governed-general-postinstall-original-acceptance-v1.yml';
const INTEGRATION_NAME='Reality — Isolated governed OpenAI gateway proof';
const INTEGRATION_WORKFLOW='.github/workflows/reality-governed-openai-gateway-isolated-20261108.yml';
const WEB_DEPLOY=/^https:\/\/vercel\.com\/[a-zA-Z0-9_-]+\/reality\/[a-zA-Z0-9_-]{10,100}$/;
const bad=s=>{throw Error('GENERAL_POSTINSTALL_'+s)};
const safe=(status,more={},http=200)=>new Response(JSON.stringify({
 status,original_job_completed:false,production_changed:false,...more
}),{status:http,headers:{'content-type':'application/json',
 'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function rpc(base,key,name,input={}){
 if(!['reality_read_general_original_postinstall_scope_v1',
      'reality_record_general_original_independent_settlement_v1',
      'reality_read_signed_chat_install_scope_v1','reality_record_signed_chat_goal_settlement_v1'].includes(name))
  bad('RPC_NOT_ALLOWLISTED');
 const r=await fetch(base+'/rest/v1/rpc/'+name,{method:'POST',
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(16000),
  headers:{apikey:key,authorization:'Bearer '+key,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(input)});
 if(!r.ok)bad('DURABLE_PROVIDER_RECEIPT_RECORD_OR_AUTH_UNVERIFIED');
 const v=await r.json().catch(()=>null);
 if(!v||typeof v!=='object'||Array.isArray(v))
  bad('DURABLE_SAME_ORIGINAL_RESPONSE_UNVERIFIED');
 return v;
}
async function gh(token,path){
 const r=await fetch(ROOT+path,{method:'GET',cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(16000),
  headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-independent-general-original-final-receipt'}});
 if(!r.ok)bad('GITHUB_SOURCE_RUN_OR_RELEASE_READBACK_UNAVAILABLE');
 const x=await r.json().catch(()=>null);
 if(!x||typeof x!=='object'||Array.isArray(x))
  bad('GITHUB_PROVIDER_RESPONSE_INVALID');
 return x;
}
async function sha(kind,b){
 const x=await crypto.subtle.digest(kind,b);
 return [...new Uint8Array(x)].map(z=>z.toString(16).padStart(2,'0')).join('');
}
async function source(token,path,ref){
 if(!(CHAT_SOURCE.test(path)||path===CHAT_WORKFLOW||path===CHAT_SUITE)||path.includes('..')||path.includes('//')||!SHA.test(ref))bad('ORIGINAL_SOURCE_REF_INVALID');
 const d=await gh(token,'/contents/'+path+'?ref='+ref);
 if(d.path!==path||d.encoding!=='base64'||!SHA.test(d.sha||'')||
  !Number.isSafeInteger(d.size)||d.size<100||d.size>250000||
  typeof d.content!=='string')
  bad('ACTUAL_INSTALLED_SOURCE_NOT_VERIFIED');
 const b=Uint8Array.from(atob(d.content.replace(/\s/g,'')),x=>x.charCodeAt(0));
 const pre=new TextEncoder().encode('blob '+b.length+'\0');
 const all=new Uint8Array(pre.length+b.length);all.set(pre);all.set(b,pre.length);
 if(b.length!==d.size||await sha('SHA-1',all)!==d.sha)
  bad('GITHUB_INSTALLED_SOURCE_CONTENTS_HASH_MISMATCH');
 return {blob:d.sha,digest:'sha256:'+await sha('SHA-256',b)};
}
async function verifyRun(token,id,shaCommit,branch,kind){
 const run=await gh(token,'/actions/runs/'+id);
 const signedChat=kind==='chat-original'||kind==='chat-integration'||kind==='chat-frozen';
 const name=signedChat?CHAT_CI_NAME:kind==='original'?CI_NAME:INTEGRATION_NAME;
 const path=signedChat?CHAT_WORKFLOW:kind==='original'?CI_WORKFLOW:INTEGRATION_WORKFLOW;
 const event=kind==='original'||kind==='chat-original'||kind==='chat-frozen'?'push':'pull_request';
 if(run.id!==id||run.name!==name||
  run.path?.split('@')[0]!==path||
  run.head_sha!==shaCommit||run.event!==event||
  ((kind==='original'||signedChat)&&run.head_branch!==branch)||
  run.status!=='completed'||run.conclusion!=='success'||
  run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+id)
  bad('INDEPENDENT_'+kind.toUpperCase()+'_RUN_IDENTITY_NOT_PROVEN');
 const jobs=await gh(token,'/actions/runs/'+id+'/jobs?per_page=80');
 if(!Array.isArray(jobs.jobs))bad('ORIGINAL_JOB_EXECUTION_STEP_PROVIDER_MISSING');
 const required=signedChat?['Checkout exact candidate or installed commit','Verify exact source identity','Prepare isolated Node runtime',
  'Independently execute full-goal functional contract without secrets or network','Confirm acceptance grants no installation or completion authority']:
  kind==='original'?
  ['Verify isolated preview commit and source tree identity',
   'Independently accept original-job runtime and governed handoff',
   'Independently verify same-original frozen-CI and recovery safeguards',
   'Confirm no upgrade installation or customer settlement from CI']:
  ['Verify Reality model boundary and original tool-continuation regressions'];
 const nameOfJob=signedChat?'independent-chat-full-goal':kind==='original'?'independent-original-acceptance':'boundary-tests';
 const candidates=jobs.jobs.filter(j=>j.run_id===id&&j.name===nameOfJob&&
  j.status==='completed'&&j.conclusion==='success'&&Array.isArray(j.steps));
 if(candidates.length!==1||required.some(step=>
    !candidates[0].steps.some(x=>x.name===step&&x.conclusion==='success')))
  bad('FROZEN_SAME_ORIGINAL_'+kind.toUpperCase()+'_STEPS_NOT_PASSED');
 return run;
}
Deno.serve(async req=>{
 try{
  if(req.method!=='POST'||req.headers.get('content-type')!=='application/json')
   return safe('GENERAL_POSTINSTALL_SIGNED_SERVICE_POST_ONLY',{},405);
  const action=await req.text();
  if(action!=='{"version":1,"action":"verify_and_settle_previously_owner_approved_original"}'&&
     action!=='{"version":1,"action":"verify_and_reconcile_owner_approved_maintenance_install"}')
   return safe('GENERAL_POSTINSTALL_EXACT_RECONCILIATION_ACTION_REQUIRED',{},400);
  const key=req.headers.get('apikey')||'';
  if(key.length<25||req.headers.get('authorization')!=='Bearer '+key)
   return safe('GENERAL_POSTINSTALL_SERVICE_AUTH_REQUIRED',{},403);
  const env=Deno.env.get('SUPABASE_URL')||'';
  let url;try{url=new URL(env)}catch{return safe('GENERAL_POSTINSTALL_ISOLATED_PROJECT_UNVERIFIED',{},503)}
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||
    url.pathname!=='/'||url.search||url.hash)
   return safe('GENERAL_POSTINSTALL_ISOLATED_PROJECT_UNVERIFIED',{},503);
  if(action==='{"version":1,"action":"verify_and_reconcile_owner_approved_maintenance_install"}')
   return await independentlyAcceptInstalledMaintenance(url.origin,key);
  const signedChat=await rpc(url.origin,key,'reality_read_signed_chat_install_scope_v1',{p_postinstall:true});
  const context=signedChat.status==='GENERAL_POSTINSTALL_EXACT_ORIGINAL_PROVIDER_VERIFICATION_ELIGIBLE'?
   signedChat:await rpc(url.origin,key,'reality_read_general_original_postinstall_scope_v1');
  const isChat=chatScope(context);
  if(context.status==='GENERAL_POSTINSTALL_NO_INSTALLED_ORIGINAL'||
     context.status==='GENERAL_POSTINSTALL_OWNER_SHIFT_NOT_CURRENT')
   return safe(context.status);
  if(context.status==='GENERAL_POSTINSTALL_ALREADY_SETTLED')
   return safe(context.status,{
    original_work_id:context.original_work_id,
    final_receipt_id:context.final_receipt_id,
    original_job_completed:context.original_job_completed===true});
  if(context.status!=='GENERAL_POSTINSTALL_EXACT_ORIGINAL_PROVIDER_VERIFICATION_ELIGIBLE'||
   !WORK.test(context.original_work_id||'')||
   !UUID.test(context.attempt_id||'')||
   !UUID.test(context.approval_receipt_id||'')||
   !UUID.test(context.shift_id||'')||
   !(isChat?CHAT_BRANCH:BRANCH).test(context.target_branch||'')||
   context.target_branch.includes('..')||context.target_branch.includes('//')||
   context.target_branch.startsWith('reality/riley/')||
   (isChat&&/^reality\/(chat-recovery|chat-development)\//.test(context.target_branch))||
   !(isChat?CHAT_SOURCE:SOURCE).test(context.target_path||'')||
   !SHA.test(context.installed_commit_sha||'')||
   !SHA.test(context.installed_source_blob_sha||'')||
   !SHA.test(context.candidate_commit_sha||'')||
   !SHA.test(context.expected_parent_commit_sha||'')||
   !SHA.test(context.integrated_test_commit_sha||'')||
   !HASH.test(context.candidate_artifact_sha256||'')||
   !Number.isSafeInteger(context.integrated_test_run_id)||
   context.integrated_test_run_id<=10000||
   !Number.isSafeInteger(context.frozen_candidate_run_id)||
   context.frozen_candidate_run_id<=10000||
   context.original_job_completed!==false||
   context.production_changed!==false)
   bad('EXACT_PREVIOUS_OWNER_APPROVAL_AND_INSTALLED_JOB_UNVERIFIED');
  const token=Deno.env.get('REALITY_GITHUB_BROKER_TOKEN')||'';
  if(token.length<25)return safe('GENERAL_POSTINSTALL_GITHUB_READER_CREDENTIAL_REQUIRED');
  const installed=context.installed_commit_sha;
  const [branchRef,file,gitCommit,checkRuns,vercelStatus,runList]=await Promise.all([
   gh(token,'/git/ref/heads/'+context.target_branch),
   source(token,context.target_path,installed),
   gh(token,'/commits/'+installed),
   gh(token,'/commits/'+installed+'/check-runs?per_page=100'),
   gh(token,'/commits/'+installed+'/status'),
   gh(token,'/actions/runs?head_sha='+installed+'&event=push&per_page=100')
  ]);
  if(branchRef.ref!=='refs/heads/'+context.target_branch||
   branchRef.object?.sha!==installed||
   file.blob!==context.installed_source_blob_sha||
   file.digest!==context.candidate_artifact_sha256||
   !Array.isArray(gitCommit.parents)||gitCommit.parents.length!==1||
   gitCommit.parents[0]?.sha!==context.expected_parent_commit_sha||
   !Array.isArray(gitCommit.files)||gitCommit.files.length!==1||
   gitCommit.files[0].filename!==context.target_path||
   gitCommit.files[0].status!=='modified')
   bad('POSTINSTALL_BRANCH_OR_INDEPENDENT_EXACT_SOURCE_CHANGED');
  if(!Array.isArray(vercelStatus.statuses)||vercelStatus.sha!==installed)
   bad('EXACT_VERCEL_RELEASE_STATUS_MISSING');
  const matchingStatus=vercelStatus.statuses.filter(x=>x.context==='Vercel'&&
   x.state==='success'&&WEB_DEPLOY.test(x.target_url||'')&&
   Number.isSafeInteger(x.id)&&x.id>0);
  if(matchingStatus.length!==1)bad('EXACT_VERCEL_RELEASE_SUCCESS_NOT_UNAMBIGUOUS');
  if(!Array.isArray(checkRuns.check_runs))
   bad('OFFICIAL_VERCEL_PROVIDER_APP_PROOF_MISSING');
  const matchingCheck=checkRuns.check_runs.filter(x=>
   x.head_sha===installed&&x.name==='Vercel Preview Comments'&&
   x.status==='completed'&&x.conclusion==='success'&&
   x.app?.slug==='vercel'&&Number.isSafeInteger(x.app?.id)&&
   x.app.id>0&&Number.isSafeInteger(x.id)&&x.id>0);
  if(matchingCheck.length!==1)bad('OFFICIAL_VERCEL_PROVIDER_APP_NOT_MATCHED_TO_INSTALLED_SHA');
  if(!Array.isArray(runList.workflow_runs))
   bad('EXACT_POSTINSTALL_ORIGINAL_CI_RUNS_UNAVAILABLE');
  const runs=runList.workflow_runs.filter(r=>
   r.name===(isChat?CHAT_CI_NAME:CI_NAME)&&r.head_sha===installed&&
   r.head_branch===context.target_branch&&r.event==='push'&&
   r.path?.split('@')[0]===(isChat?CHAT_WORKFLOW:CI_WORKFLOW)&&
   r.status==='completed'&&r.conclusion==='success');
  if(runs.length!==1||!Number.isSafeInteger(runs[0].id)||runs[0].id<=10000)
   return safe('GENERAL_POSTINSTALL_WAITING_INDEPENDENT_ORIGINAL_ACCEPTANCE',{
    original_work_id:context.original_work_id,
    installation_authorized:true,source_installed:true});
  const original=await verifyRun(token,runs[0].id,installed,context.target_branch,isChat?'chat-original':'original');
  const integrated=await verifyRun(token,context.integrated_test_run_id,
    context.integrated_test_commit_sha,isChat?context.candidate_branch:context.target_branch,isChat?'chat-integration':'integration');
  if(isChat){
   const [workflow,suite,frozen]=await Promise.all([
    source(token,CHAT_WORKFLOW,installed),source(token,CHAT_SUITE,installed),
    verifyRun(token,context.frozen_candidate_run_id,context.candidate_commit_sha,context.candidate_branch,'chat-frozen')]);
   if(workflow.blob!==context.workflow_blob_sha||suite.blob!==context.functional_suite_blob_sha||frozen.id===original.id||frozen.id===integrated.id)
    bad('SIGNED_CHAT_FROZEN_GOAL_CONTRACT_OR_DISTINCT_PROVIDER_RUN_DRIFT');
  }
  if(original.id===integrated.id||
     original.id===context.frozen_candidate_run_id||
     integrated.id===context.frozen_candidate_run_id)
   bad('POSTINSTALL_DISTINCT_PROVIDER_EXECUTION_RUNS_REQUIRED');
  const evidence={schema:'reality-general-original-final-proof-v1',
   original_work_id:context.original_work_id,
   attempt_id:context.attempt_id,shift_id:context.shift_id,
   approval_receipt_id:context.approval_receipt_id,
   installed_commit_sha:installed,
   installed_source_blob_sha:file.blob,
   frozen_candidate_run_id:context.frozen_candidate_run_id,
   integration_run_id:integrated.id,
   original_acceptance_run_id:original.id,
   vercel_status_id:matchingStatus[0].id,
   vercel_app_check_run_id:matchingCheck[0].id,
   vercel_app_id:matchingCheck[0].app.id,
   production_changed:false};
  if(isChat){
   evidence.workflow_blob_sha=context.workflow_blob_sha;
   evidence.functional_suite_blob_sha=context.functional_suite_blob_sha;
   evidence.independent_functional_postinstall_verified=true;
  }
  const digest='sha256:'+await sha('SHA-256',new TextEncoder().encode(
   JSON.stringify(evidence)));
  const saved=isChat?await rpc(url.origin,key,'reality_record_signed_chat_goal_settlement_v1',{
   p_attempt_id:context.attempt_id,p_proof:evidence}):await rpc(url.origin,key,'reality_record_general_original_independent_settlement_v1',{
    p_attempt_id:context.attempt_id,p_installed_commit_sha:installed,
    p_source_blob_sha:file.blob,p_original_acceptance_run_id:original.id,
    p_gateway_run_id:integrated.id,
    p_vercel_status_id:matchingStatus[0].id,
    p_vercel_app_check_id:matchingCheck[0].id,
    p_vercel_app_id:matchingCheck[0].app.id,
    p_final_evidence_sha256:digest
  });
  if(saved.status!=='GENERAL_ORIGINAL_INDEPENDENTLY_SETTLED_WITH_FINAL_RECEIPT'||
   saved.original_work_id!==context.original_work_id||
   saved.shift_id!==context.shift_id||
   saved.approval_receipt_id!==context.approval_receipt_id||
   saved.installed_commit_sha!==installed||
   saved.original_acceptance_run_id!==original.id||
   saved.vercel_deployment_status_id!==matchingStatus[0].id||
   (isChat?!HASH.test(saved.final_receipt_sha256||''):saved.final_receipt_sha256!==digest)||
   !UUID.test(saved.final_receipt_id||'')||
   saved.original_job_completed!==true||
   saved.production_changed!==false||saved.roi_verified!==false||
   saved.roi_status!=='NOT_MEASURED'||saved.no_third_confirmation!==true)
   bad('INDEPENDENT_SAME_ORIGINAL_FINAL_RECEIPT_NOT_DURABLY_READ_BACK');
  return safe(saved.status,{
   original_work_id:saved.original_work_id,shift_id:saved.shift_id,
   final_receipt_id:saved.final_receipt_id,
   installed_commit_sha:installed,
   original_acceptance_run_id:original.id,
   original_job_completed:true,
   roi_status:'NOT_MEASURED',
   ...(isChat?{universe_outcome_event_id:saved.universe_outcome_event_id}:{}),
   no_third_confirmation:true});
 }catch(e){
  const raw=e instanceof Error?e.message:'';
  const code=/^GENERAL_POSTINSTALL_[A-Z0-9_]{5,130}$/.test(raw)?
   raw.slice('GENERAL_POSTINSTALL_'.length):
   'GENERAL_POSTINSTALL_PROVIDER_OR_OWNER_WARRANT_UNVERIFIED';
  return safe(code,{},503);
 }
});