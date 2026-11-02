// Genuine isolated safety drill: signed HALT -> deny real claims -> rollback installed
// source on a NEW drill branch -> independent GitHub and database readback -> resume.
// Preserves historical owner-approved installed branch and production.
import {mkdirSync,writeFileSync} from 'node:fs';
const e=process.env;
const REPO='maloney2323/Reality';
const BRANCH='feature/reality-general-capability-engine-20261101';
const SHA=/^[a-f0-9]{40}$/;
const fatal=x=>{throw Error('REALITY_GENUINE_ISOLATED_SAFETY_DRILL_'+x)};
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_EVENT_NAME!=='push'||
 e.GITHUB_REPOSITORY!==REPO||e.GITHUB_REF!=='refs/heads/'+BRANCH||
 !SHA.test(e.GITHUB_SHA||'')||!e.ACTIONS_ID_TOKEN_REQUEST_URL||
 !e.ACTIONS_ID_TOKEN_REQUEST_TOKEN||typeof e.GH_TOKEN!=='string'||e.GH_TOKEN.length<20||
 !/^[1-9][0-9]{7,17}$/.test(e.GITHUB_RUN_ID||''))
 fatal('SIGNED_ISOLATED_GITHUB_WORKFLOW_REQUIRED');
const endpoint='https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-auto-admit';
async function signedBroker(action,proof){
 const url=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
 url.searchParams.set('audience','reality-genuine-capability-auto-admit-v1');
 const response=await fetch(url,{cache:'no-store',redirect:'error',headers:{
  authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!response.ok)fatal('GITHUB_SIGNED_OIDC_MISSING');
 const jwt=(await response.json()).value;
 if(typeof jwt!=='string'||jwt.length<300)fatal('SIGNED_OIDC_INVALID');
 const result=await fetch(endpoint,{method:'POST',cache:'no-store',redirect:'error',headers:{
  authorization:'Bearer '+jwt,'content-type':'application/json',
  'x-reality-github-provider-token':e.GH_TOKEN},
  body:JSON.stringify({action,scope:{repository_sha:e.GITHUB_SHA},...(proof?{proof}:{})})});
 const obj=await result.json().catch(()=>null);
 if(!result.ok||obj?.ok!==true)
  fatal('SIGNED_BROKER_'+action+'_'+String(obj?.error||result.status).slice(0,110));
 if(obj.production_changed!==false)fatal('PRODUCTION_CHANGE_REJECTED');
 return obj;
}
async function gh(method,path,body){
 const response=await fetch('https://api.github.com/repos/'+REPO+path,{
  method,cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+e.GH_TOKEN,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-genuine-rollback-drill-v1',
   ...(body?{'content-type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined});
 const data=await response.json().catch(()=>null);
 if(!response.ok)fatal('GITHUB_'+method+'_'+path.split('/').slice(0,4).join('/')+'_'+response.status);
 return data;
}
const safePaths=x=>Array.isArray(x)&&x.length>=2&&x.length<=12&&
 x.every(p=>typeof p==='string'&&/^(?:src|test)\/reality-extensions\/[a-zA-Z0-9._-]+\.(?:mjs|js)$/.test(p))&&
 new Set(x).size===x.length;
let halted=false;
let evidence=null;
try{
 const stop=await signedBroker('safety_halt');
 if(stop.status!=='ISOLATED_PREVIEW_HALTED'||stop.mode!=='HALTED'||
    stop.signed_run_id!==Number(e.GITHUB_RUN_ID))fatal('DURABLE_HALT_NOT_COMMITTED');
 halted=true;
 console.log('REALITY_EMERGENCY_STOP_DURABLY_HALTED',JSON.stringify({epoch:stop.epoch,production_changed:false}));
 const probe=await signedBroker('safety_probe');
 if(probe.status!=='ISOLATED_HALT_ENFORCED'||probe.blocked_admission_operations!==3||
    probe.halt_controller_run_id!==Number(e.GITHUB_RUN_ID))
    fatal('REAL_ADMISSION_GATES_NOT_BLOCKED');
 console.log('REALITY_EMERGENCY_STOP_ACTUAL_ADMISSION_BLOCKED',JSON.stringify(probe));
 const scope=await signedBroker('safety_rollback_scope');
 if(scope.schema!=='reality-signed-isolated-rollback-scope-v1'||
    !SHA.test(scope.installed_commit_sha)||!safePaths(scope.source_paths)||
    scope.target_environment!=='ISOLATED_PREVIEW')
    fatal('PINNED_INSTALLED_SCOPE_INVALID');
 const head=await gh('GET','/git/ref/heads/'+scope.installed_branch);
 if(head?.object?.sha!==scope.installed_commit_sha)fatal('HISTORICAL_INSTALL_BRANCH_MOVED');
 const installed=await gh('GET','/git/commits/'+scope.installed_commit_sha);
 const installedTree=await gh('GET','/git/trees/'+installed.tree.sha+'?recursive=1');
 if(installedTree.truncated||scope.source_paths.some(p=>!installedTree.tree.some(row=>row.path===p)))
    fatal('APPROVED_CAPABILITY_NOT_ACTUALLY_INSTALLED');
 // Walk actual Git parent history until all installed paths are absent.
 let current=installed,base=null;
 for(let i=0;i<=scope.source_paths.length+2;i++){
  if(!Array.isArray(current.parents)||current.parents.length!==1)
    fatal('INSTALL_CHAIN_HAS_NO_SINGLE_PARENT');
  current=await gh('GET','/git/commits/'+current.parents[0].sha);
  const tree=await gh('GET','/git/trees/'+current.tree.sha+'?recursive=1');
  if(tree.truncated||!Array.isArray(tree.tree))fatal('BASE_SOURCE_TREE_UNVERIFIED');
  if(scope.source_paths.every(p=>!tree.tree.some(row=>row.path===p))){base=current;break;}
 }
 if(!base||!SHA.test(base.tree.sha))fatal('CLEAN_PRE_INSTALL_BASE_NOT_FOUND');
 const drillBranch='feature/reality-rollback-drill-'+e.GITHUB_RUN_ID;
 const created=await gh('POST','/git/refs',{
  ref:'refs/heads/'+drillBranch,sha:scope.installed_commit_sha});
 if(created?.object?.sha!==scope.installed_commit_sha)fatal('DRILL_REF_NOT_CREATED_AT_INSTALLED_COMMIT');
 // Make a REAL append-only rollback commit. It restores the exact old tree and
 // is fast-forwarded on only the newly-created drill branch (never force-push).
 const rollback=await gh('POST','/git/commits',{
  message:'Reality isolated emergency rollback drill (provider-verified source reversion)',
  tree:base.tree.sha,parents:[scope.installed_commit_sha]});
 if(!SHA.test(rollback?.sha)||rollback?.tree?.sha!==base.tree.sha||
    rollback?.parents?.[0]?.sha!==scope.installed_commit_sha)
    fatal('ROLLBACK_GIT_COMMIT_INVALID');
 await gh('PATCH','/git/refs/heads/'+drillBranch,{sha:rollback.sha,force:false});
 const [drillHead,originalHead,reverted]=await Promise.all([
  gh('GET','/git/ref/heads/'+drillBranch),
  gh('GET','/git/ref/heads/'+scope.installed_branch),
  gh('GET','/git/trees/'+rollback.tree.sha+'?recursive=1')]);
 if(drillHead?.object?.sha!==rollback.sha||
    originalHead?.object?.sha!==scope.installed_commit_sha||
    reverted.truncated===true||
    scope.source_paths.some(p=>reverted.tree.some(row=>row.path===p)))
    fatal('ACTUAL_GIT_ROLLBACK_INDEPENDENT_READBACK_FAILED');
 const proof={original_work_id:scope.original_work_id,installed_commit_sha:scope.installed_commit_sha,
  rollback_commit_sha:rollback.sha,drill_branch:drillBranch,
  base_tree_sha:base.tree.sha,source_paths:scope.source_paths};
 const recorded=await signedBroker('safety_rollback_record',proof);
 if(recorded.status!=='ISOLATED_ROLLBACK_DRILL_RECORDED'||
    recorded.rollback_commit_sha!==rollback.sha||
    recorded.original_branch_preserved!==true||
    recorded.rolled_back_source_absent!==true||
    recorded.signed_run_id!==Number(e.GITHUB_RUN_ID))
    fatal('INDEPENDENT_GITHUB_AND_DB_ROLLBACK_ATTESTATION_FAILED');
 evidence={schema:'reality-real-isolated-emergency-stop-and-rollback-v1',
  signed_run_id:Number(e.GITHUB_RUN_ID),repository_sha:e.GITHUB_SHA,
  halt_epoch:stop.epoch,halted_claims:probe.blocked_admission_operations,
  actual_owner_approved_work_id:scope.original_work_id,
  installed_branch:scope.installed_branch,installed_commit_sha:scope.installed_commit_sha,
  rollback_branch:drillBranch,rollback_commit_sha:rollback.sha,
  pre_install_tree_sha:base.tree.sha,source_paths_removed:scope.source_paths,
  original_install_preserved:true,provider_rollback_verified:true,
  durable_database_receipt:recorded.status,
  actual_active_installed_branch_rolled_back:false,
  emergency_stop_can_cancel_already_running_jobs:false,
  production_changed:false,production_release_authorized:false};
 console.log('REALITY_PROVIDER_ROLLBACK_DRILL_VERIFIED',JSON.stringify(evidence));
}finally{
 if(halted){
  const released=await signedBroker('safety_release');
  if(released.mode!=='RUNNING'||released.status!=='ISOLATED_PREVIEW_RUNNING')
   fatal('EMERGENCY_STOP_RELEASE_READBACK_FAILED');
  console.log('REALITY_EMERGENCY_STOP_RESUMED',JSON.stringify({
   epoch:released.epoch,mode:released.mode,production_changed:false}));
  if(evidence){
   evidence.final_execution_mode='RUNNING';
   evidence.release_epoch=released.epoch;
  }
 }
}
if(!evidence)fatal('SAFETY_DRILL_UNFINISHED');
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-real-isolated-stop-rollback.json',JSON.stringify(evidence,null,2)+'\n');
console.log('REALITY_ISOLATED_STOP_AND_GIT_ROLLBACK_PROVEN',JSON.stringify(evidence));
