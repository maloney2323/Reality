// Reality's read-only qualification of signed *unbound* source discoveries.
// A missing file and a frozen test do NOT constitute a customer-owned job,
// a passing independent acceptance test, or an installation warrant.
import {createHash} from 'node:crypto';
const REPO='maloney2323/Reality';
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const TEST=/^test\/reality-frozen-regressions\/[a-z0-9._-]+\.test\.js$/;
const MODULE=/^src\/reality-extensions\/[a-z0-9._-]+\.mjs$/;
const DEFAULT_HEADERS={accept:'application/vnd.github+json',
 'user-agent':'Reality-governed-unbound-source-readback-v1',
 'x-github-api-version':'2022-11-28'};
const fail=x=>{throw Error('REALITY_UNBOUND_SOURCE_'+x)};
const digest=b=>createHash('sha256').update(b).digest('hex');
function validateSource(v){
 return v&&TEST.test(v.frozen_test_path)&&MODULE.test(v.missing_module_path)&&
  SHA64.test(v.frozen_sha256)&&SHA40.test(v.first_observed_sha)&&
  SHA40.test(v.latest_observed_sha)&&
  v.status==='AWAITING_OWNER_WORK_BINDING'&&
  Number.isSafeInteger(v.observations)&&v.observations>=1&&
  v.observations<=100000&&
  typeof v.last_observed_at==='string'&&
  Number.isFinite(Date.parse(v.last_observed_at));
}
const WORK=/^work:[a-f0-9]{32}$/;
const PHASES=new Set(['ISOLATED_INSTALLED_PROBATION',
 'FROZEN_REPRODUCED_AWAITING_CANDIDATE','AWAITING_OWNER_APPROVAL']);
function validExistingOriginalMatch(x){
 return x?.status==='EXISTING_UNSETTLED_OWNER_ORIGINAL_MATCHED'&&
  WORK.test(x.original_work_id)&&PHASES.has(x.queue_phase)&&
  typeof x.continuation_state==='string'&&
  x.continuation_state.length>=8&&x.continuation_state.length<=80&&
  (x.recovery_status===null||
   ['RECONCILE_ALREADY_SATISFIED_PRIOR_WORK',
    'INDEPENDENT_DIAGNOSIS_REQUIRED'].includes(x.recovery_status))&&
  (x.next_evidence_action===null||
   ['INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION',
    'VERIFY_EXTERNAL_EFFECTS_AND_CLASSIFY_FAILURE'].includes(x.next_evidence_action))&&
  x.original_source_frozen_red_verified===true&&
  x.same_owner_active_goal_verified===true&&
  x.existing_original_reused===true&&
  x.fresh_job_required===false&&
  x.fresh_capability_generation_authorized===false&&
  x.replay_external_effects_authorized===false&&
  x.independent_final_receipt_recorded===false&&
  x.installation_authorized_by_discovery===false&&
  x.production_changed===false;
}
function linkExistingOriginal(v,existing,sourceChecked){
 const result=stableFinding(v,'EXISTING_ORIGINAL_RECOVERY_DISPOSITION_REQUIRED',
  existing.next_evidence_action==='INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION'?
   'Reality already reproduced and installed the exact original-job capability in isolation. The prior target was independently satisfied, but this SAME original job remains unsettled. Verify its terminal disposition against the durable ledger; do not create a job, replay work, or build the same capability again.':
   'The existing owner-authorized original job has the exact frozen source and is unsettled. Independently classify its unresolved effects and continue the original recovery before any new candidate or installation.',sourceChecked);
 return Object.freeze({...result,
  linked_original_work_id:existing.original_work_id,
  existing_original_queue_phase:existing.queue_phase,
  existing_recovery_status:existing.recovery_status,
  existing_next_evidence_action:existing.next_evidence_action,
  existing_original_source_verified:true,
  existing_original_final_receipt_recorded:false,
  owner_authorized_existing_investigation:true,
  owner_authorized_new_job:false,
  candidate_independently_tested:false,
  executable_job:false,installation_authorized:false,
  verified_missing_capability:false,
  risk:'The historical target may be satisfied without this original work being settled. A false final receipt or replay would violate continuity.',
  pros:['Existing original job and owner authorization were independently matched',
    'Exact frozen test and source hash match its previously reproduced failure'],
  cons:['This original job still has no independent final receipt',
    'A historical no-op is not a settlement of the current job']
 });
}
function stableFinding(v,status,detail,checked=false){
 const name=v.missing_module_path.split('/').at(-1).replace('.mjs','').replaceAll('-',' ');
 return Object.freeze({
  key:'unbound:'+v.frozen_sha256,
  kind:'UNBOUND_FROZEN_DISCOVERY',
  title:'Frozen capability discovery · '+name,
  stage:status,
  priority:2,
  source_url:'https://github.com/'+REPO+'/blob/'+v.latest_observed_sha+'/'+v.frozen_test_path,
  source_receipt:'github:frozen-test:sha256:'+v.frozen_sha256,
  source_sha256:v.frozen_sha256,
  last_seen_at:v.last_observed_at,
  observed_count:v.observations,
  source_check_completed:checked,
  verified_current_source_absence:status==='CURRENT_SOURCE_MISSING_OWNER_JOB',
  verified_missing_capability:false,
  candidate_independently_tested:false,
  owner_approval_needed:false,
  owner_authorized_new_job:false,
  executable_job:false,installation_authorized:false,production_changed:false,
  what_it_does:'Proposed extension '+v.missing_module_path+
    '; frozen acceptance source '+v.frozen_test_path+'.',
  potential_value:'Unknown until a real, owner-authorized original job is independently verified and completed.',
  pros:['Frozen test and repeated source-observation history retained',
    'Could support an exact job-bound repair if independently reproduced'],
  cons:['No fresh owner-authorized original job is bound',
    'Missing source is not proof of a remaining executable defect'],
  risk:'A synthetic or historical failure could cause an unnecessary or unsafe upgrade.',
  next_proof:detail
 });
}
async function getSource(fetchImpl,path,commit,token){
 const url='https://api.github.com/repos/'+REPO+'/contents/'+path+
   '?ref='+encodeURIComponent(commit);
 const response=await fetchImpl(url,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{...DEFAULT_HEADERS,...(token?{authorization:'Bearer '+token}:{})},
  signal:AbortSignal.timeout(6500)
 });
 if(response.status===404)return {missing:true};
 if(!response.ok)fail('GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 const found=await response.json();
 if(found?.path!==path||found.encoding!=='base64'||
    typeof found.content!=='string'||found.content.length>150000)
  fail('GITHUB_SOURCE_BYTES_NOT_VERIFIED');
 const bytes=Buffer.from(found.content.replace(/\s/g,''),'base64');
 if(!bytes.length||bytes.length>90000)fail('SOURCE_BYTES_OUT_OF_BOUNDS');
 return {bytes};
}
export async function qualifyUnboundSourceForReview(v,{
 currentCommit,fetchImpl=fetch,githubToken=null,
}={}){
 if(!validateSource(v))fail('MALFORMED_SIGNED_OBSERVATION');
 if(v.existing_original_match!=null&&
   !validExistingOriginalMatch(v.existing_original_match))
  fail('FORGED_OR_UNVERIFIED_EXISTING_ORIGINAL_MATCH');
 const pending='The frozen source has only been observed historically. Recheck it against the current preview commit, prove an actual job failure independently, and bind the exact owner/goal/original work before model generation.';
 if(!SHA40.test(String(currentCommit||'')))
  return stableFinding(v,'SOURCE_CHECK_UNAVAILABLE',pending);
 try{
  const [pinned,current,module]=await Promise.all([
   getSource(fetchImpl,v.frozen_test_path,v.latest_observed_sha,githubToken),
   getSource(fetchImpl,v.frozen_test_path,currentCommit,githubToken),
   getSource(fetchImpl,v.missing_module_path,currentCommit,githubToken)
  ]);
  if(!pinned.bytes||digest(pinned.bytes)!==v.frozen_sha256)
   return stableFinding(v,'FROZEN_SOURCE_CHANGED_NEEDS_REQUALIFICATION',
    'The pinned frozen suite no longer matches its saved SHA-256. Independent source investigation required before any job can be admitted.',true);
  if(!current.bytes||digest(current.bytes)!==v.frozen_sha256)
   return stableFinding(v,'FROZEN_SOURCE_CHANGED_NEEDS_REQUALIFICATION',
    'The current preview frozen suite differs from the signed observation. Reproduce the exact current failure before any upgrade.',true);
  // A service-role SQL join has ALREADY verified the same owner, active
  // goal, exact immutable original event, frozen RED and absence of final
  // receipt. The current preview source check confirms no test drift.
  // Missing source in preview is not a second missing owner capability.
  if(v.existing_original_match)
   return linkExistingOriginal(v,v.existing_original_match,true);
  if(!module.missing)
   return stableFinding(v,'CAPABILITY_PRESENT_RECONCILE_HISTORICAL_WORK',
    'The extension is present in current preview source. Check whether the work was previously satisfied; do not replay or install duplicates.',true);
  return stableFinding(v,'CURRENT_SOURCE_MISSING_OWNER_JOB',
   'The frozen test bytes match the signed observation and the extension is absent in current source. The remaining requirement is a fresh independently failing original job with current owner/goal authorization; no installation approval is implied.',true);
 }catch{
  return stableFinding(v,'SOURCE_CHECK_UNAVAILABLE',pending);
 }
}
export async function qualifyUnboundSourceBatch(observations,options={}){
 if(!Array.isArray(observations)||observations.length>8)
  fail('BOUNDED_SIGNED_OBSERVATIONS_REQUIRED');
 if(observations.some(x=>!validateSource(x)||
   x.existing_original_match!=null&&
   !validExistingOriginalMatch(x.existing_original_match)))
  fail('UNTRUSTED_OBSERVATION');
 if(new Set(observations.map(x=>x.frozen_sha256)).size!==observations.length)
  fail('DUPLICATE_FROZEN_SOURCE');
 return Promise.all(observations.map(x=>qualifyUnboundSourceForReview(x,options)));
}
