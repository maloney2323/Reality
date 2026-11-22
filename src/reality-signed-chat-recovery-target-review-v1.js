// Independent signed-worker review of EXISTING Chat recovery candidate
// against the pinned source dependencies of Reality's real execution and
// installer entrypoints. This is the same evidence/authority discipline used
// by signed maintenance target reviews, but keyed to Chat-original lineage.
// A graph hit proves DEPENDENCY ONLY, not functional acceptance or install.
import {createHash} from 'node:crypto';
import {posix as path} from 'node:path';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const GH='https://api.github.com/repos/maloney2323/Reality';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const SAFEFILE=/^(?:src\/[A-Za-z0-9_./-]+\.js|api\/reality\/[A-Za-z0-9_./-]+\.js|reality-[A-Za-z0-9_.-]+\.(?:js|css)|index\.html)$/;
const ROOTS=Object.freeze([
 'api/reality/governed-employee-shift-worker.js',
 'api/reality/generalized-original-install-review.js',
 'api/reality/generalized-owner-install-approval.js'
]);
const safe=(status,data={})=>Object.freeze({
 status,target_in_graph:false,independent_full_goal_feature_accepted:false,
 source_installed:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 new_shift_started:false,...data
});
function fail(code){throw Error('SIGNED_CHAT_RECOVERY_TARGET_'+code)}
function safePath(p){
 return typeof p==='string'&&SAFEFILE.test(p)&&
  !p.includes('..')&&!p.includes('//')&&
  !p.includes('/.env')&&!p.includes('/secrets')&&
  !p.includes('/credentials');
}
const gitBlob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
async function gh(pathSuffix,token,fetchImpl){
 const r=await fetchImpl(GH+pathSuffix,{method:'GET',cache:'no-store',
  redirect:'error',signal:AbortSignal.timeout(11000),
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-independent-signed-chat-recovery-target-review',
   ...(/^[A-Za-z0-9_-]{20,}$/.test(token||'')?{authorization:'Bearer '+token}:{})}});
 if(!r?.ok)fail('PINNED_GITHUB_READ_UNVERIFIED');
 const json=await r.json().catch(()=>null);
 if(!json||typeof json!=='object'||Array.isArray(json))
  fail('PINNED_GITHUB_JSON_INVALID');
 return json;
}
function decodeSource(file,root){
 if(file?.path!==root||file.encoding!=='base64'||
    !SHA.test(file.sha||'')||typeof file.content!=='string'||
    !Number.isSafeInteger(file.size)||file.size<60||
    file.size>225000)return null;
 const normalized=file.content.replace(/\s/g,'');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized))return null;
 const b=Buffer.from(normalized,'base64');
 if(b.length!==file.size||gitBlob(b)!==file.sha)return null;
 const text=b.toString('utf8');
 if(Buffer.from(text,'utf8').length!==b.length||text.includes('\0'))
  return null;
 return text;
}
export function inspectPinnedSignedRecoverySourceRoots(
 sources,target,expectedRoots=ROOTS){
 if(!Array.isArray(sources)||sources.length!==ROOTS.length||
   !Array.isArray(expectedRoots)||expectedRoots.length!==ROOTS.length||
   expectedRoots.some((x,i)=>x!==ROOTS[i])||!safePath(target))
  return Object.freeze({verified:false,target_in_graph:false,reason:'ROOT_OR_TARGET_SCOPE_INVALID'});
 const candidateEntries=new Set(ROOTS);
 const evidence=[];
 for(let i=0;i<ROOTS.length;i++){
  const {path:root,sha,source}=sources[i]||{};
  if(root!==ROOTS[i]||!SHA.test(sha||'')||
     typeof source!=='string'||source.length<60)
   return Object.freeze({verified:false,target_in_graph:false,reason:'PINNED_ROOT_PROOF_INCOMPLETE'});
  evidence.push({path:root,blob_sha:sha});
  // Scan imports in independently fetched, frozen entrypoint sources. A
  // dependency hit is intentionally a weaker gate than a functional test.
  const re=/(?:^|\n)\s*import\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]\s*;?/g;
  let hit,seen=0;
  while((hit=re.exec(source))!==null){
   if(++seen>350)return Object.freeze({
    verified:false,target_in_graph:false,reason:'PINNED_ENTRYPOINT_IMPORT_LIMIT'});
   if(!hit[1].startsWith('.'))continue;
   const resolved=path.normalize(path.join(path.dirname(root),hit[1]));
   if(safePath(resolved))candidateEntries.add(resolved);
  }
 }
 return Object.freeze({verified:true,target_in_graph:candidateEntries.has(target),
  reason:candidateEntries.has(target)?
   'DIRECT_PINNED_EXECUTOR_DEPENDENCY_FULL_GOAL_STILL_REQUIRED':
   'CANDIDATE_OUTSIDE_PINNED_EXECUTOR_AND_INSTALL_ENTRYPOINT_GRAPH',
  entrypoint_evidence:evidence,source_scope_count:candidateEntries.size,
  source_paths:Object.freeze([...candidateEntries].sort())});
}
export async function independentlyReviewOneSignedChatRecoveryTarget({
 db,env=process.env,workerRunId,fetchImpl=fetch,
 callRpc=shiftRpc
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   !UUID.test(workerRunId||'')||
   typeof fetchImpl!=='function'||typeof callRpc!=='function')
  return safe('SIGNED_CHAT_RECOVERY_REVIEW_WORKER_BOUNDARY_UNVERIFIED');
 const scope=await callRpc(db,'reality_claim_next_signed_chat_recovery_target_review_v1',
  {p_worker_run_id:workerRunId},{fetchImpl});
 if(scope?.status==='NO_SIGNED_CHAT_RECOVERY_CANDIDATE_TARGET_REVIEW_READY'){
  if(scope.installation_authorized!==false||
     scope.original_job_completed!==false||
     scope.production_changed!==false||
     scope.new_shift_started!==false)
   fail('EMPTY_REVIEW_SOURCE_UNTRUSTED');
  return safe(scope.status);
 }
 if(scope?.status!=='SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW_LEASED'||
    !UUID.test(scope.trigger_id||'')||!UUID.test(scope.owner_id||'')||
    !UUID.test(scope.source_message_id||'')||
    !UUID.test(scope.review_id||'')||scope.worker_run_id!==workerRunId||
    !WORK.test(scope.original_work_id||'')||
    !SHA.test(scope.base_sha||'')||!SHA.test(scope.source_blob_sha||'')||
    !HASH.test(scope.candidate_sha256||'')||
    !HASH.test(scope.spec_sha256||'')||
    !HASH.test(scope.blocker_receipt_sha256||'')||
    !safePath(scope.target_path)||
    scope.source_ref!=='supabase:reality_chat_messages:'+scope.source_message_id||
    !Array.isArray(scope.source_entrypoints)||
    scope.source_entrypoints.length!==ROOTS.length||
    scope.source_entrypoints.some((v,i)=>v!==ROOTS[i])||
    scope.original_job_completed!==false||
    scope.installation_authorized!==false||
    scope.source_installed!==false||
    scope.production_changed!==false||
    scope.new_shift_started!==false)
  fail('SIGNED_SOURCE_CANDIDATE_REVIEW_SCOPE_UNVERIFIED');
 const token=String(env.REALITY_GITHUB_TOKEN||'');
 try{
  const proof=await readPinnedSignedRecoverySourceGraph({
   baseSha:scope.base_sha,target:scope.target_path,expectedRoots:scope.source_entrypoints,token,fetchImpl});
  const result=await callRpc(db,'reality_record_signed_chat_recovery_target_review_v1',{
   p_trigger_id:scope.trigger_id,p_review_id:scope.review_id,
   p_worker_run_id:workerRunId,p_tree_sha:proof.tree_sha,
   p_roots:proof.entrypoint_evidence,
   p_target_in_graph:proof.target_in_graph
  },{fetchImpl});
  const wanted=proof.target_in_graph?
   'SIGNED_CHAT_RECOVERY_INDEPENDENT_DEPENDENCY_TARGET_VERIFIED':
   'SIGNED_CHAT_RECOVERY_OFF_TARGET_REJECTED_WITH_RECEIPT';
  if(result?.status!==wanted||
     result.trigger_id!==scope.trigger_id||
     result.original_work_id!==scope.original_work_id||
     result.candidate_sha256!==scope.candidate_sha256||
     result.target_in_graph!==proof.target_in_graph||
     !HASH.test(result.target_review_receipt_sha256||'')||
     result.independent_full_goal_feature_accepted!==false||
     result.source_installed!==false||
     result.installation_authorized!==false||
     result.original_job_completed!==false||
     result.production_changed!==false||
     result.new_shift_started!==false)
   fail('TARGET_REVIEW_DURABLE_RECEIPT_UNVERIFIED');
  return safe(wanted,{
   original_work_id:scope.original_work_id,
   trigger_id:scope.trigger_id,
   candidate_sha256:scope.candidate_sha256,
   target_in_graph:proof.target_in_graph,
   review_receipt_sha256:result.target_review_receipt_sha256,
   provider_source_tree_sha:proof.tree_sha,
   dependency_only:true
  });
 }catch(e){
  // Source may be unreachable or the protected DB receipt may be uncertain.
  // Record the exact class under this leased signed worker rather than
  // abandoning the original in an invisible CLAIMED state. The database
  // independently fences retries to at most one additional signed wake.
  const raw=String(e?.message||'');
  const normalized=raw.startsWith('SIGNED_CHAT_RECOVERY_TARGET_')?
   raw.slice('SIGNED_CHAT_RECOVERY_TARGET_'.length):'PROVIDER_OR_SOURCE_READ_UNVERIFIED';
  const failureCode=/^[A-Z][A-Z0-9_]{5,95}$/.test(normalized)?
   normalized:'PROVIDER_OR_SOURCE_READ_UNVERIFIED';
  let observed=null;
  try{
   observed=await callRpc(db,
    'reality_record_signed_chat_recovery_target_review_failure_v1',{
     p_trigger_id:scope.trigger_id,p_review_id:scope.review_id,
     p_worker_run_id:workerRunId,p_failure_code:failureCode
    },{fetchImpl});
  }catch{
   // Unknown database writes stay unreplayed. The next signed worker only
   // reconciles AFTER the current lease expires, with source proof.
  }
  return safe('SIGNED_CHAT_RECOVERY_TARGET_PROVIDER_READBACK_UNVERIFIED',{
   original_work_id:scope.original_work_id,
   blocker_code:failureCode,
   ...(observed&&/^sha256:[a-f0-9]{64}$/.test(
    observed.failure_receipt_sha256||'')?{
     durable_failure_receipt_sha256:observed.failure_receipt_sha256}: {})
  });
 }
}

// Shared exact pinned-source reader: a diagnostic GET is not a verdict or
// execution authority. The normal reviewer and alternate probe use one proof.
export async function readPinnedSignedRecoverySourceGraph({
 baseSha,target,expectedRoots=ROOTS,token,fetchImpl=fetch
}={}){
 if(!SHA.test(baseSha||'')||!safePath(target)||
  !Array.isArray(expectedRoots)||expectedRoots.length!==ROOTS.length||
  expectedRoots.some((v,i)=>v!==ROOTS[i]))fail('PINNED_SOURCE_SCOPE_INVALID');
 // Same repository-pinned GET boundary; public source does not require a credential.
 const commit=await gh('/git/commits/'+baseSha,token,fetchImpl);
 if(commit.sha!==baseSha||!SHA.test(commit.tree?.sha||''))fail('PINNED_SOURCE_TREE_DRIFT');
 const files=await Promise.all(ROOTS.map(root=>gh('/contents/'+root+'?ref='+baseSha,token,fetchImpl)));
 const roots=files.map((f,i)=>{
  const source=decodeSource(f,ROOTS[i]);
  if(source===null)fail('PINNED_ENTRYPOINT_BYTES_INVALID');
  return {path:ROOTS[i],sha:f.sha,source};
 });
 const proof=inspectPinnedSignedRecoverySourceRoots(roots,target,expectedRoots);
 if(!proof.verified)fail(proof.reason);
 return Object.freeze({...proof,tree_sha:commit.tree.sha});
}
export async function independentlyReobserveStalledRecoveryReview({
 db,env=process.env,shiftId,workerRunId,fetchImpl=fetch,callRpc=shiftRpc,
 readGraph=readPinnedSignedRecoverySourceGraph
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  !UUID.test(shiftId||'')||!UUID.test(workerRunId||''))
  return safe('CONTINUITY_SOURCE_PROBE_SIGNED_PREVIEW_REQUIRED');
 const scope=await callRpc(db,'reality_claim_signed_continuity_review_probe_v1',
  {p_shift_id:shiftId,p_worker_run_id:workerRunId},{fetchImpl});
 if(scope?.status==='NO_INDEPENDENT_CONTINUITY_SOURCE_PROBE_READY')return safe(scope.status);
 if(scope?.status!=='SIGNED_CONTINUITY_SOURCE_PROBE_CLAIMED'||scope.shift_id!==shiftId||
  scope.worker_run_id!==workerRunId||!UUID.test(scope.owner_id||'')||
  !UUID.test(scope.probe_id||'')||!UUID.test(scope.trigger_id||'')||
  !UUID.test(scope.incident_id||'')||!UUID.test(scope.source_message_id||'')||
  scope.source_ref!=='supabase:reality_chat_messages:'+scope.source_message_id||
  !WORK.test(scope.original_work_id||'')||!HASH.test(scope.candidate_sha256||'')||
  !HASH.test(scope.investigation_receipt_sha256||'')||!SHA.test(scope.base_sha||'')||
  !safePath(scope.target_path)||!Array.isArray(scope.source_entrypoints)||
  scope.source_entrypoints.length!==ROOTS.length||scope.source_entrypoints.some((r,i)=>r!==ROOTS[i])||
  scope.installation_authorized!==false||scope.original_job_completed!==false||
  scope.production_changed!==false||scope.new_shift_started!==false)
  return safe('CONTINUITY_SOURCE_PROBE_EXACT_SCOPE_UNVERIFIED');
 let proof=null,code=null;
 try{
  proof=await readGraph({baseSha:scope.base_sha,target:scope.target_path,
   expectedRoots:scope.source_entrypoints,token:String(env.REALITY_GITHUB_TOKEN||''),fetchImpl});
  if(proof?.verified!==true||!SHA.test(proof.tree_sha||'')||
   typeof proof.target_in_graph!=='boolean'||!Array.isArray(proof.entrypoint_evidence)||
   proof.entrypoint_evidence.length!==ROOTS.length||
   proof.entrypoint_evidence.some((r,i)=>r.path!==ROOTS[i]||!SHA.test(r.blob_sha||'')))
   fail('PINNED_SOURCE_PROBE_PROOF_UNVERIFIED');
 }catch(e){
  proof=null;const raw=String(e?.message||'');
  const c=raw.startsWith('SIGNED_CHAT_RECOVERY_TARGET_')?raw.slice('SIGNED_CHAT_RECOVERY_TARGET_'.length):'PROVIDER_OR_SOURCE_READ_UNVERIFIED';
  code=/^[A-Z][A-Z0-9_]{5,95}$/.test(c)?c:'PROVIDER_OR_SOURCE_READ_UNVERIFIED';
 }
 const result=await callRpc(db,'reality_record_signed_continuity_review_probe_v1',{
  p_trigger_id:scope.trigger_id,p_probe_id:scope.probe_id,p_worker_run_id:workerRunId,
  p_tree_sha:proof?.tree_sha||null,p_roots:proof?.entrypoint_evidence||null,
  p_target_in_graph:proof?.target_in_graph??null,p_failure_code:code
 },{fetchImpl});
 if(result?.trigger_id!==scope.trigger_id||result.original_work_id!==scope.original_work_id||
  result.installation_authorized!==false||result.original_job_completed!==false||
  result.production_changed!==false||result.new_shift_started!==false)
  return safe('CONTINUITY_SOURCE_PROBE_DURABLE_RECEIPT_UNVERIFIED');
 if(code){
  return safe(result.status==='SIGNED_CONTINUITY_SOURCE_PROBE_BLOCKED'?
   result.status:'CONTINUITY_SOURCE_PROBE_FAILURE_RECEIPT_UNVERIFIED',{
    original_work_id:scope.original_work_id,blocker_code:code});
 }
 const wanted=proof.target_in_graph?'SIGNED_CHAT_RECOVERY_INDEPENDENT_DEPENDENCY_TARGET_VERIFIED':
  'SIGNED_CHAT_RECOVERY_OFF_TARGET_REJECTED_WITH_RECEIPT';
 if(result.status!==wanted||result.continuity_source_probe_verified!==true||
  result.target_in_graph!==proof.target_in_graph||result.candidate_sha256!==scope.candidate_sha256||
  !HASH.test(result.target_review_receipt_sha256||'')||result.root_cause_verified!==false)
  return safe('CONTINUITY_SOURCE_PROBE_VERDICT_UNVERIFIED');
 return safe(wanted,{original_work_id:scope.original_work_id,trigger_id:scope.trigger_id,
  candidate_sha256:scope.candidate_sha256,target_in_graph:proof.target_in_graph,
  review_receipt_sha256:result.target_review_receipt_sha256,
  continuity_source_probe_verified:true,dependency_only:true});
}
