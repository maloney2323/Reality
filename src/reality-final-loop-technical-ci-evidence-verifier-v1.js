// Existing signed Final Loop worker -> GitHub independent technical CI readback.
// This verifies SOURCE/OWNER/ORIGINAL scope and the provider's completed run,
// job, case spec, and artifact. It never records a business-original RED proof,
// mints a warrant, downloads/executes artifact code, or writes to GitHub/DB.
import {createHash} from 'node:crypto';
export const TECHNICAL_CI_PROOF_VERSION='reality-final-loop-technical-ci-provider-verifier-v1';
const REPO='maloney2323/Reality';
const BRANCH='feature/final-loop-governed-qualification-handoff-20261123';
const WORKFLOW='.github/workflows/reality-shared-continuity-verifier-handoff-v1.yml';
const WORKFLOW_NAME='Reality shared Continuity and independent verifier handoff acceptance';
const ARTIFACT='reality-final-loop-technical-recovery-frozen-red-green';
const SPEC_DIR='reality-final-loop-recovery-case-specs';
const STEP_RED='Execute genuine historical RED and corrected GREEN for source-bound technical blocker';
const STEP_ARTIFACT='Preserve case-specific RED and GREEN proof as CI artifact only';
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SRC=/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/;
const result=(status,fields={})=>Object.freeze({
 schema:TECHNICAL_CI_PROOF_VERSION,status,read_only:true,
 independent_technical_ci_verified:false,
 frozen_technical_red_verified:false,
 original_business_case_red_verified:false,
 business_original_warrant_verified:false,
 original_job_claim_admitted:false,
 original_job_completed:false,
 original_settled:false,universe_return_verified:false,
 proof_gate_advanced:false,execution_authorized:false,
 repair_executed:false,capability_installed:false,
 production_changed:false,external_effect_performed:false,
 next_governed_action:'RECONCILE_EXACT_SOURCE_AND_CONTINUITY_PROOFS',
 ...fields
});
function authorized({db,env,proposal,route}){
 const c=proposal?.contract_candidate;
 return env?.VERCEL_ENV==='preview'&&
  db?.strictSecrets===true&&
  db.project===env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF&&
  proposal?.status==='RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE'&&
  proposal.read_only===true&&
  HASH.test(c?.contract_id||'')&&UUID.test(c?.owner_id||'')&&
  UUID.test(c?.shift_id||'')&&UUID.test(c?.continuity_root_id||'')&&
  WORK.test(c?.obligation_id||'')&&SRC.test(c?.source_ref||'')&&
  SHA.test(c?.source_revision||'')&&
  c?.ledger_freeze_verified===false&&
  route?.status==='RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING'&&
  route.owner_id===c.owner_id&&route.shift_id===c.shift_id&&
  route.source_ref===c.source_ref&&route.obligation_id===c.obligation_id&&
  route.contract_id===c.contract_id&&
  UUID.test(route.maintenance_id||'')&&
  HASH.test(route.existing_diagnostic_receipt_sha256||'')&&
  route.prior_diagnostic_verified===true&&
  route.repeat_prior_ci_dispatch_permitted===false&&
  route.original_job_completed===false&&
  route.production_changed===false&&
  route.installation_authorized===false;
}
export async function verifySourceBoundTechnicalRecoveryCi({
 db,env=process.env,contractProposal,existingCiRoute,
 fetchImpl=fetch
}={}){
 if(!authorized({db,env,proposal:contractProposal,route:existingCiRoute})||
  typeof fetchImpl!=='function')
  return result('RECOVERY_TECHNICAL_CI_EXACT_SOURCE_AND_WARRANT_REQUIRED');
 const c=contractProposal.contract_candidate,route=existingCiRoute;
 const base={owner_id:c.owner_id,shift_id:c.shift_id,
  obligation_id:c.obligation_id,source_ref:c.source_ref,
  contract_id:c.contract_id,maintenance_id:route.maintenance_id,
  technical_proof_scope:'PR307_LINKED_TECHNICAL_RECOVERY_HANDOFF_ONLY',
  original_obligation_open:true,source_revision:c.source_revision};
 const token=String(env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
  env.REALITY_GITHUB_TOKEN||env.GITHUB_TOKEN||'').trim();
 const deployed=env.VERCEL_GIT_COMMIT_SHA;
 if(token.length<24||!SHA.test(deployed||'')||
  env.VERCEL_GIT_COMMIT_REF!==BRANCH)
  return result('RECOVERY_TECHNICAL_CI_PREVIEW_SOURCE_OR_PROVIDER_AUTH_UNAVAILABLE',{
   ...base});
 const get=async path=>{
  const response=await fetchImpl('https://api.github.com/repos/'+REPO+path,{
   method:'GET',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(10000),
   headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',
    'user-agent':'Reality-final-loop-technical-proof-readonly-v1'}
  });
  if(!response?.ok)throw Error('RECOVERY_GITHUB_PROVIDER_UNAVAILABLE');
  return response.json();
 };
 try{
  // Bind to exactly the SHA deployed by this signed preview. Do not accept
  // an older successful CI run from another release or another PR.
  const runs=await get('/actions/workflows/'+
   'reality-shared-continuity-verifier-handoff-v1.yml/runs?branch='+
   encodeURIComponent(BRANCH)+'&per_page=15');
  const matched=(runs?.workflow_runs||[]).filter(r=>
   r?.name===WORKFLOW_NAME&&r?.path===WORKFLOW&&
   r?.head_branch===BRANCH&&r?.head_sha===deployed&&
   ['push','pull_request'].includes(r.event)&&
   r.status==='completed'&&r.conclusion==='success'&&
   r.repository?.full_name===REPO&&
   Number.isSafeInteger(r.id)&&r.id>0);
  if(matched.length<1)
   return result('RECOVERY_TECHNICAL_CI_EXACT_SIGNED_RUN_PENDING',{
    ...base,verified_run_count:matched.length});
  const run=matched.sort((a,b)=>b.id-a.id)[0];
  const [dir,jobs,artifacts]=await Promise.all([
   get('/contents/'+SPEC_DIR+'?ref='+deployed),
   get('/actions/runs/'+run.id+'/jobs?per_page=100'),
   get('/actions/runs/'+run.id+'/artifacts?per_page=100')
  ]);
  if(!Array.isArray(dir)||dir.length<1||dir.length>8||
   dir.some(f=>f.type!=='file'||!/^[-a-z0-9]+\.json$/.test(f.name||'')||
    f.path!==SPEC_DIR+'/'+f.name||
    !SHA.test(f.sha||'')))
   return result('RECOVERY_TECHNICAL_CI_CASE_DIRECTORY_UNVERIFIED',{...base});
  let found=null;
  for(const entry of dir){
   const file=await get('/contents/'+entry.path+'?ref='+deployed);
   if(file?.path!==entry.path||file.encoding!=='base64'||
    !SHA.test(file.sha||'')||file.sha!==entry.sha||
    !Number.isSafeInteger(file.size)||file.size<500||file.size>12000||
    typeof file.content!=='string')return result(
     'RECOVERY_TECHNICAL_CI_CASE_BLOB_UNVERIFIED',{...base});
   const bytes=Buffer.from(file.content.replace(/\s/g,''),'base64');
   if(bytes.length!==file.size||
    createHash('sha1').update(Buffer.concat([
     Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')!==file.sha)
    return result('RECOVERY_TECHNICAL_CI_CASE_BLOB_HASH_MISMATCH',{...base});
   let spec;
   try{spec=JSON.parse(bytes.toString('utf8'))}catch{
    return result('RECOVERY_TECHNICAL_CI_CASE_SPEC_INVALID',{...base});
   }
   if(spec?.original_work_id!==c.obligation_id||
    spec?.source_ref!==c.source_ref||
    spec?.maintenance_id!==route.maintenance_id)continue;
   if(found!==null)return result('RECOVERY_TECHNICAL_CI_DUPLICATE_EXACT_CASE',{...base});
   found={spec,git_blob_sha:file.sha};
  }
  const spec=found?.spec;
  if(!spec||spec.schema!=='reality-final-loop-sourcebound-frozen-recovery-v1'||
   spec.source_head_sha!==c.source_revision||
   spec.owner_id!==c.owner_id||spec.shift_id!==c.shift_id||
   spec.continuity_root_id!==c.continuity_root_id||
   spec.independent_prior_ci_diagnostic_receipt_sha256!==
    route.existing_diagnostic_receipt_sha256||
   spec.scope!=='PR307_LINKED_TECHNICAL_RECOVERY_HANDOFF_ONLY'||
   spec.independently_verified_original_customer_admission!==false||
   spec.case_specific_original_business_red_proven!==false||
   spec.model_generated_verdict_allowed!==false||
   spec.original_job_completed!==false||
   spec.installation_authorized!==false||
   spec.production_changed!==false)
   return result('RECOVERY_TECHNICAL_CI_SPEC_NOT_LINKED_TO_CANONICAL_ORIGINAL',{...base});
  const js=(jobs?.jobs||[]).filter(j=>
   j.name==='prove-cross-layer-continuity'&&
   j.run_id===run.id&&j.head_sha===deployed&&
   j.status==='completed'&&j.conclusion==='success'&&
   Array.isArray(j.steps)&&
   [STEP_RED,STEP_ARTIFACT].every(name=>
    j.steps.some(step=>step.name===name&&step.conclusion==='success')));
  const arts=(artifacts?.artifacts||[]).filter(a=>
   a.name===ARTIFACT&&a.expired===false&&
   a.workflow_run?.id===run.id&&
   a.workflow_run?.head_sha===deployed&&
   HASH.test(a.digest||'')&&
   Number.isSafeInteger(a.id)&&a.id>0&&
   Number.isSafeInteger(a.size_in_bytes)&&a.size_in_bytes>500&&
   a.size_in_bytes<20000);
  if(js.length!==1||arts.length!==1)
   return result('RECOVERY_TECHNICAL_CI_GITHUB_JOB_OR_ARTIFACT_UNVERIFIED',{
    ...base,github_run_id:run.id});
  return result('RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING',{
   ...base,independent_technical_ci_verified:true,
   frozen_technical_red_verified:true,
   github_run_id:run.id,github_job_id:js[0].id,
   github_artifact_id:arts[0].id,
   github_artifact_digest:arts[0].digest,
   signed_case_spec_git_blob_sha:found.git_blob_sha,
   github_release_sha:deployed,
   independent_ci_provider_observation:true,
   artifact_content_independently_read:false,
   signed_database_receipt_recorded:false,
   next_governed_action:'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED'
  });
 }catch{
  return result('RECOVERY_TECHNICAL_CI_PROVIDER_RECONCILIATION_RETRY_DUE',{
   ...base});
 }
}
