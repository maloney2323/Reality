// Automatic owner-scoped opportunity qualification inside the EXISTING signed
// shift worker. A red->green research repair is not an admitted original or
// installation authority. Independently recheck the provider and exact source
// before preparing an owner decision. This module does not mutate any state.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}-[a-f0-9]{12}$/i;
const SHA40=/^[a-f0-9]{40}$/i;
const SHA64=/^[a-f0-9]{64}$/i;
const HASH=/^research:[a-f0-9]{64}$/i;
const FILE=/^src\/[a-zA-Z0-9_./-]+\.js$/;
const REPO='maloney2323/Reality';
const BASE='https://api.github.com/repos/'+REPO;
const deny=(status,other={})=>Object.freeze({
 status,...other,scope_approval_granted:false,
 installation_authorized:false,production_changed:false,
 original_job_completed:false,new_shift_started:false,
 external_effect_performed:false,read_only:true
});
const err=x=>{throw Error('AUTO_REPAIR_QUALIFICATION_'+x)};
const prUrl=n=>'https://github.com/'+REPO+'/pull/'+n;
function validateProof(p){
 return p&&p.status==='FROZEN_RED_TO_GREEN_CANDIDATE_VERIFIED'&&
  p.proof_kind==='EXISTING_CAPABILITY_IMPLEMENTATION_DEFECT'&&
  HASH.test(p.key||'')&&SHA64.test(p.frozen_test_sha256||'')&&
  SHA64.test(p.finding_fingerprint||'')&&
  p.key==='research:'+p.finding_fingerprint&&
  SHA40.test(p.baseline_commit_sha||'')&&
  SHA40.test(p.repair_commit_sha||'')&&
  FILE.test(p.source_file||'')&&!p.source_file.includes('..')&&
  Number.isSafeInteger(p.baseline_run_id)&&p.baseline_run_id>0&&
  Number.isSafeInteger(p.green_run_id)&&p.green_run_id>0&&
  Number.isSafeInteger(p.pull_request_number)&&p.pull_request_number>0&&
  Number.isInteger(p.independent_red_assertion_failures)&&
  p.independent_red_assertion_failures>0&&
  Number.isInteger(p.independent_green_assertion_passes)&&
  p.independent_green_assertion_passes>0&&
  p.owner_install_authorized===false&&
  p.fresh_original_work_verified===false&&
  p.installed===false&&p.production_changed===false&&
  p.candidate_created_by==='ASSISTANT_AUTHORED_IN_ISOLATED_FEATURE_BRANCH';
}
async function githubRead(path,{fetchImpl,githubToken}){
 const response=await fetchImpl(BASE+path,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{
   accept:'application/vnd.github+json',
   'user-agent':'Reality-governed-auto-repair-qualification-v1',
   'x-github-api-version':'2022-11-28',
   ...(githubToken?{authorization:'Bearer '+githubToken}:{})
  },
  signal:AbortSignal.timeout(5500)
 });
 if(!response?.ok)return null;
 return response.json().catch(()=>null);
}
function safeWorkOrder(p,{shiftId,withinScope,action,currentBlob,repairBlob}){
 const exact=prUrl(p.pull_request_number);
 return Object.freeze({
  status:action,source_ref:exact,owner_scope_verified:true,
  shift_id:shiftId,
  candidate_commit_sha:p.repair_commit_sha,
  source_file:p.source_file,
  frozen_test_sha256:p.frozen_test_sha256,
  baseline_run_id:p.baseline_run_id,
  green_run_id:p.green_run_id,
  independent_red_assertion_failures:p.independent_red_assertion_failures,
  independent_green_assertion_passes:p.independent_green_assertion_passes,
  source_current_blob_sha:currentBlob||null,
  candidate_blob_sha:repairBlob||null,
  inside_existing_original_warrant:withinScope,
  exact_owner_work_binding_required:!withinScope,
  // An owner may authorize scope only via the existing trusted owner-intake
  // route. Source qualification alone never creates a job or shifts scope.
  next_governed_action:action===
   'REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING'?
   'PRESENT_SOURCE_BOUND_OWNER_SCOPE_DECISION':
   action==='EXISTING_WARRANT_REPAIR_REQUIRES_INDEPENDENT_INSTALL_REVIEW'?
   'PREPARE_EXISTING_WARRANT_EXACT_INSTALL_TARGET_REVIEW':
   action==='SOURCE_ALREADY_CONTAINS_REPAIR_RECONCILE_ORIGINAL'?
   'VERIFY_EXISTING_INSTALL_AND_ORIGINAL_DISPOSITION':
   'REBASE_AND_RERUN_FROZEN_SOURCE_PROOF',
  owner_scope_decision_ready:
   action==='REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING',
  exact_install_approval_required:true,
  scope_approval_granted:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,
  external_effect_performed:false,read_only:true
 });
}
export async function automaticallyQualifyVerifiedRepairOpportunity({
 db,env=process.env,graph,originalGate,shiftId,workerRunId,
 call=shiftRpc,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||!db.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||'')||
  graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  graph.shift_id!==shiftId||!UUID.test(graph.owner_id||'')||
  !Array.isArray(graph.jobs)||graph.jobs.length>4||
  !SHA40.test(env.VERCEL_GIT_COMMIT_SHA||'')||
  typeof fetchImpl!=='function'||typeof call!=='function')
  err('EXISTING_SIGNED_SHIFT_PREVIEW_REQUIRED');
 const feed=await call(db,'reality_read_owner_market_repair_proofs_v1',{
  p_owner_id:graph.owner_id
 },{fetchImpl});
 if(feed?.ok!==true||
  feed.status!=='SOURCE_PINNED_BUDGET_REPAIR_CANDIDATE_READBACK'||
  feed.owner_id!==graph.owner_id||
  feed.read_only!==true||feed.installation_authorized!==false||
  feed.production_changed!==false||!Array.isArray(feed.items)||
  feed.items.length>4||feed.items.some(x=>!validateProof(x))||
  new Set(feed.items.map(x=>x.key)).size!==feed.items.length)
  err('INDEPENDENT_OWNER_REPAIR_RECEIPT_UNVERIFIED');
 if(!feed.items.length)
  return deny('NO_VERIFIED_REPAIR_OPPORTUNITY_IN_OWNER_LEDGER',{
   reviewed_candidate_count:0,work_orders:[]
  });
 const githubToken=typeof env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN==='string'?
   env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:null;
 // Bounded read-only provider GETs. Each saved candidate is separately
 // checked for frozen RED, corrected GREEN, pinned PR head and source bytes.
 const workOrders=await Promise.all(feed.items.map(async p=>{
  const ref=prUrl(p.pull_request_number);
  const existing=graph.jobs.find(x=>x.source_ref===ref&&
   x.independent_source_proof_verified===true&&
   /^work:[a-f0-9]{32}$/.test(x.original_work_id||''));
  // A job appearing in a shift's source graph is NOT enough to authorize an
  // installation. The independent service-only same-original warrant gate
  // must agree on owner, shift, source, original and canonical business work.
  const withinScope=Boolean(existing&&
   originalGate?.status==='EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE'&&
   originalGate.owner_id===graph.owner_id&&
   originalGate.shift_id===shiftId&&
   originalGate.original_work_id===existing.original_work_id&&
   originalGate.source_ref===ref&&
   originalGate.warrant_mode==='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'&&
   originalGate.read_only===true&&
   originalGate.canonical_owner_business_original_missing===false&&
   originalGate.original_job_completed===false&&
   originalGate.installation_authorized===false&&
   originalGate.production_changed===false);
  let red,green,pr,baseFile,currentFile,repairFile;
  try{
   [red,green,pr,baseFile,currentFile,repairFile]=await Promise.all([
    githubRead('/actions/runs/'+p.baseline_run_id,{fetchImpl,githubToken}),
    githubRead('/actions/runs/'+p.green_run_id,{fetchImpl,githubToken}),
    githubRead('/pulls/'+p.pull_request_number,{fetchImpl,githubToken}),
    githubRead('/contents/'+p.source_file+'?ref='+p.baseline_commit_sha,{fetchImpl,githubToken}),
    githubRead('/contents/'+p.source_file+'?ref='+env.VERCEL_GIT_COMMIT_SHA,{fetchImpl,githubToken}),
    githubRead('/contents/'+p.source_file+'?ref='+p.repair_commit_sha,{fetchImpl,githubToken})
   ]);
  }catch{
   return deny('REPAIR_PROVIDER_READBACK_UNAVAILABLE',{
    source_ref:ref,candidate_commit_sha:p.repair_commit_sha,
    exact_owner_work_binding_required:!withinScope
   });
  }
  if(!red||!green||!pr||!baseFile||!currentFile||!repairFile||
   red.head_sha!==p.baseline_commit_sha||red.conclusion!=='failure'||
   red.status!=='completed'||
   green.head_sha!==p.repair_commit_sha||
   green.conclusion!=='success'||green.status!=='completed'||
   pr.head?.sha!==p.repair_commit_sha||pr.state!=='open'||
   pr.head?.repo?.full_name!==REPO||
   pr.base?.repo?.full_name!==REPO||
   baseFile.path!==p.source_file||
   currentFile.path!==p.source_file||
   repairFile.path!==p.source_file||
   !SHA40.test(baseFile.sha||'')||
   !SHA40.test(currentFile.sha||'')||
   !SHA40.test(repairFile.sha||'')||
   baseFile.sha===repairFile.sha)
   return deny('REPAIR_INDEPENDENT_SOURCE_OR_CI_PROOF_NOT_CURRENT',{
    source_ref:ref,candidate_commit_sha:p.repair_commit_sha,
    exact_owner_work_binding_required:!withinScope
   });
  const action=currentFile.sha===repairFile.sha?
   'SOURCE_ALREADY_CONTAINS_REPAIR_RECONCILE_ORIGINAL':
   currentFile.sha!==baseFile.sha?
    'REPAIR_SOURCE_DRIFT_REBASE_AND_FROZEN_RETEST_REQUIRED':
   withinScope?
    'EXISTING_WARRANT_REPAIR_REQUIRES_INDEPENDENT_INSTALL_REVIEW':
    'REPAIR_REQUIRES_EXACT_OWNER_ORIGINAL_WORK_BINDING';
  return safeWorkOrder(p,{shiftId,withinScope,action,
   currentBlob:currentFile.sha,repairBlob:repairFile.sha});
 }));
 return deny('AUTOMATIC_VERIFIED_REPAIR_OPPORTUNITIES_QUALIFIED',{
  owner_id:graph.owner_id,shift_id:shiftId,
  verified_work_scope_recheck:true,
  reviewed_candidate_count:workOrders.length,
  owner_scope_decisions_pending:workOrders.filter(x=>x.owner_scope_decision_ready).length,
  work_orders:Object.freeze(workOrders)
 });
}
