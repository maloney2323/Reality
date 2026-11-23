// Read-only full-source qualification for the EXISTING Reality PR-review lane.
// Produces proposed bounded review scopes, NOT child-original admission,
// authority, model work, GitHub writes, independent review or settlement.
import {createHash} from 'node:crypto';
export const REALITY_LARGE_PR_SOURCE_QUALIFICATION_VERSION=
 'reality-large-pr-source-qualification-v1';
export const LARGE_PR_NATIVE_SCOPE_LIMIT=8;
export const LARGE_PR_MAX_MANIFEST_FILES=500;
const API='https://api.github.com/repos/maloney2323/Reality';
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/([1-9]\d{0,7})$/;
const HEAD=/^[a-f0-9]{40}$/;
const PROOF=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const digest=value=>'sha256:'+createHash('sha256')
 .update(JSON.stringify(value)).digest('hex');
const denied=(reason,job)=>Object.freeze({
 version:REALITY_LARGE_PR_SOURCE_QUALIFICATION_VERSION,
 status:'LARGE_PR_FULL_SOURCE_QUALIFICATION_UNVERIFIED',reason,
 source_ref:job?.source_ref||null,
 read_only:true,source_manifest_complete:false,
 bounded_scope_count:0,bounded_scopes:Object.freeze([]),
 parent_obligation_remains_open:true,
 native_admission_unchanged:true,
 draft_review_authority_verified:false,
 owner_approval_granted:false,worker_claim_consumed:false,
 model_invoked:false,github_write_performed:false,
 independent_review_completed:false,
 cross_scope_review_verified:false,original_job_completed:false,
 installation_authorized:false,production_changed:false
});
function safeMeta(pr,job,sourceNumber){
 return pr?.number===sourceNumber&&
  pr.html_url===job.source_ref&&
  pr.state==='open'&&typeof pr.draft==='boolean'&&
  HEAD.test(pr.head?.sha||'')&&HEAD.test(pr.base?.sha||'')&&
  Number.isInteger(pr.changed_files)&&pr.changed_files>8&&
  pr.changed_files<=LARGE_PR_MAX_MANIFEST_FILES;
}
async function getGithub(path,{fetchImpl,githubToken}){
 const response=await fetchImpl(API+path,{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(14000),
  headers:{accept:'application/vnd.github+json',
   ...(typeof githubToken==='string'&&githubToken.length>=25?
    {authorization:'Bearer '+githubToken}:{}),
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Final-Loop-Source-Qualification-v1'}
 });
 if(!response?.ok)throw Error('GITHUB_READ_UNAVAILABLE');
 return response.json();
}
function validateFile(file){
 if(!file||typeof file.filename!=='string'||
    !/^[A-Za-z0-9._/-]{1,350}$/.test(file.filename)||
    file.filename.startsWith('/')||
    file.filename.split('/').some(segment=>!segment||segment==='.'||segment==='..')||
    !['added','modified','removed','renamed','copied','changed'].includes(file.status)||
    !HEAD.test(file.sha||'')||
    !Number.isSafeInteger(file.additions)||file.additions<0||
    !Number.isSafeInteger(file.deletions)||file.deletions<0)
  return null;
 if(file.status==='renamed'&&
    (typeof file.previous_filename!=='string'||
     !/^[A-Za-z0-9._/-]{1,350}$/.test(file.previous_filename)||
     file.previous_filename.split('/').some(s=>!s||s==='.'||s==='..')))
  return null;
 return Object.freeze({
  path:file.filename,status:file.status,blob_sha:file.sha,
  previous_path:file.status==='renamed'?file.previous_filename:null,
  additions:file.additions,deletions:file.deletions,
  // GitHub may omit or truncate patches (binary or large files).
  // The file inventory is NOT independent patch/test/review coverage.
  patch_proof_verified:false
 });
}
// Must be called only from the existing signed shift's preview diagnostic.
// It does not create children or alter the parent/original/PR status.
export async function inspectLargePrSourceForBoundedReview({
 job,ownerId,shiftId,metadata,fetchImpl=fetch,githubToken,
 env=process.env
}={}){
 const m=REF.exec(job?.source_ref||'');
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED!=='true'||
    env.REALITY_FINAL_LOOP_LARGE_PR_QUALIFICATION_SHADOW_ENABLED!=='true'||
    !UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
    !m||!PROOF.test(job?.source_proof_sha256||'')||
    (job.original_work_id!==null&&!WORK.test(job.original_work_id||''))||
    !['BLOCKED','NOT_ADMITTED','SOURCE_ADMITTED','CLAIMED','PREPARED','PUBLISHING'].includes(job.phase)||
    typeof fetchImpl!=='function')
  return denied('SIGNED_PREVIEW_SCOPE_OR_FEATURE_GATE_UNVERIFIED',job);
 const number=Number(m[1]);
 if(!safeMeta(metadata,job,number))
  return denied('CURRENT_OPEN_PR_BASE_HEAD_OR_SIZE_UNVERIFIED',job);
 const all=[],paths=new Set();
 try{
  const pages=Math.ceil(metadata.changed_files/100);
  for(let page=1;page<=pages;page++){
   const files=await getGithub('/pulls/'+number+
    '/files?per_page=100&page='+page,{fetchImpl,githubToken});
   if(!Array.isArray(files)||files.length===0||files.length>100||
      (page<pages&&files.length!==100))
    return denied('GITHUB_FILE_PAGE_MISSING_OR_PARTIAL',job);
   for(const f of files){
    const item=validateFile(f);
    if(!item||paths.has(item.path))
     return denied('GITHUB_CHANGED_FILE_IDENTITY_OR_DUPLICATE_UNVERIFIED',job);
    paths.add(item.path);all.push(item);
   }
  }
  if(all.length!==metadata.changed_files)
   return denied('FULL_FILE_COUNT_DOES_NOT_MATCH_PROVIDER',job);
  const latest=await getGithub('/pulls/'+number,{fetchImpl,githubToken});
  if(!safeMeta(latest,job,number)||
     latest.head.sha!==metadata.head.sha||
     latest.base.sha!==metadata.base.sha||
     latest.draft!==metadata.draft||
     latest.changed_files!==metadata.changed_files)
   return denied('PR_SOURCE_REVISION_OR_DRAFT_STATUS_CHANGED_DURING_READ',job);
  // Stable partition over the ENTIRE provider file inventory. A scope is
  // a proposed review unit, never a native claim or independent proof.
  all.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const sourceManifestHash=digest({
   source_ref:job.source_ref,base_sha:latest.base.sha,
   head_sha:latest.head.sha,files:all
  });
  const groups=[];
  for(let i=0;i<all.length;i+=LARGE_PR_NATIVE_SCOPE_LIMIT){
   const files=Object.freeze(all.slice(i,i+LARGE_PR_NATIVE_SCOPE_LIMIT));
   const childScopeHash=digest({
    parent_source_manifest_sha256:sourceManifestHash,
    scope_index:groups.length,files
   });
   groups.push(Object.freeze({
    proposed_scope_sha256:childScopeHash,
    index:groups.length,file_count:files.length,files,
    source_head_sha:latest.head.sha,
    proposed_only:true,
    independent_review_verified:false,
    full_patch_evidence_verified:false,
    integration_impact_verified:false,
    owner_effect_authority_verified:false,
    native_child_original_admitted:false,
    child_execution_authorized:false
   }));
  }
  return Object.freeze({
   version:REALITY_LARGE_PR_SOURCE_QUALIFICATION_VERSION,
   status:latest.draft?
    'FULL_DRAFT_MANIFEST_READ_REVIEW_AUTHORITY_PENDING':
    'FULL_MANIFEST_READ_EXACT_ORIGINAL_ADMISSION_PENDING',
   source_ref:job.source_ref,owner_id:ownerId,shift_id:shiftId,
   original_work_id:job.original_work_id,
   native_phase:job.phase,
   frozen_source_proof_sha256:job.source_proof_sha256,
   live_base_sha:latest.base.sha,live_head_sha:latest.head.sha,
   source_manifest_sha256:sourceManifestHash,
   source_manifest_complete:true,
   manifest_file_count:all.length,
   bounded_scope_limit:LARGE_PR_NATIVE_SCOPE_LIMIT,
   bounded_scope_count:groups.length,
   bounded_scopes:Object.freeze(groups),
   read_only:true,proposed_only:true,
   // Coverage is only inventory coverage, not patch or review coverage.
   patch_coverage_verified:false,
   independent_review_completed:false,
   cross_scope_review_verified:false,
   cross_scope_integration_review_required:true,
   exact_frozen_source_requalification_required:true,
   draft_review_authority_verified:false,
   owner_approval_granted:false,worker_claim_consumed:false,
   native_admission_unchanged:true,
   parent_obligation_remains_open:true,
   model_invoked:false,github_write_performed:false,
   original_job_completed:false,installation_authorized:false,
   production_changed:false
  });
 }catch{
  return denied('GITHUB_FULL_MANIFEST_PROVIDER_READ_UNVERIFIED',job);
 }
}
