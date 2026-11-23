// Evidence-only evaluator of an existing Reality-generated code candidate.
// It does not invoke a model, execute source, make an owner warrant, install,
// write a database row, or settle the originating Final Loop obligation.
// Actual behavioral probes must run in an isolated uncredentialed runner.
import {createHash} from 'node:crypto';
export const ENGINEERING_EVALUATION_VERSION=
 'reality-governed-engineering-candidate-evaluation-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const TARGET=/^(?:src|api\/reality)\/[a-zA-Z0-9_.\/-]+\.js$/;
const sha256=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const blobSha=x=>{const b=Buffer.from(x,'utf8');return createHash('sha1')
 .update('blob '+b.length+'\0').update(b).digest('hex')};
const deny=(status,details={})=>Object.freeze({
 schema:ENGINEERING_EVALUATION_VERSION,status,
 evidence_only:true,read_only:true,
 source_installed:false,repair_executed:false,
 original_job_completed:false,independent_original_verified:false,
 owner_approval_granted:false,installation_authorized:false,
 production_changed:false,model_certifies_nothing:true,
 ...details
});
export function inspectPinnedEngineeringCandidate({
 workId,maintenanceId,sourceRef,sourcePath,sourceText,
 sourceBlobSha,sourceFileSha256,patch,proposedSha256,
 candidateReceiptSha256
}={}){
 if(!WORK.test(workId||'')||!UUID.test(maintenanceId||'')||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9]\d*$/.test(sourceRef||'')||
    !TARGET.test(sourcePath||'')||sourcePath.includes('..')||
    !SHA.test(sourceBlobSha||'')||
    !HASH.test(sourceFileSha256||'')||
    !HASH.test(proposedSha256||'')||
    !HASH.test(candidateReceiptSha256||'')||
    typeof sourceText!=='string'||sourceText.length<300||sourceText.length>60000||
    !patch||Array.isArray(patch)||
    typeof patch.find!=='string'||patch.find.length<15||
    typeof patch.replace!=='string'||patch.replace.length<15||
    typeof patch.reason!=='string'||patch.reason.length<25)
  return deny('ENGINEERING_CANDIDATE_IDENTITY_OR_PATCH_INVALID');
 if(blobSha(sourceText)!==sourceBlobSha||
    sha256(sourceText)!==sourceFileSha256)
  return deny('ENGINEERING_CANDIDATE_PINNED_SOURCE_DRIFT');
 const first=sourceText.indexOf(patch.find);
 if(first<0||first!==sourceText.lastIndexOf(patch.find))
  return deny('ENGINEERING_CANDIDATE_FIND_NOT_UNIQUE');
 const proposed=sourceText.slice(0,first)+patch.replace+
  sourceText.slice(first+patch.find.length);
 if(sha256(proposed)!==proposedSha256)
  return deny('ENGINEERING_CANDIDATE_PROPOSED_SOURCE_HASH_MISMATCH');
 if(proposed===sourceText)
  return deny('ENGINEERING_CANDIDATE_NO_SOURCE_CHANGE');
 return deny('ENGINEERING_CANDIDATE_EXACT_SOURCE_READY_FOR_ISOLATED_PROBE',{
  work_id:workId,maintenance_id:maintenanceId,source_ref:sourceRef,
  source_path:sourcePath,source_blob_sha:sourceBlobSha,
  candidate_receipt_sha256:candidateReceiptSha256,
  proposed_source_sha256:proposedSha256,
  source_span_replaced_once:true,model_candidate_not_verified_fix:true,
  // A source-text return value exists only to be consumed by a trusted
  // temporary-workspace test harness, never a production publisher.
  proposed_source_text:proposed
 });
}
export function compareIsolatedEngineeringProbes({
 inspection,baseline,candidate
}={}){
 const refuse=status=>deny(status,{
  work_id:inspection?.work_id??null,
  maintenance_id:inspection?.maintenance_id??null,
  source_ref:inspection?.source_ref??null
 });
 if(inspection?.status!==
  'ENGINEERING_CANDIDATE_EXACT_SOURCE_READY_FOR_ISOLATED_PROBE')
  return refuse('ENGINEERING_CANDIDATE_FROZEN_SOURCE_UNVERIFIED');
 const verify=xs=>Array.isArray(xs)&&xs.length>=2&&xs.length<=20&&
   xs.every(x=>x&&typeof x.case_id==='string'&&
    /^[A-Za-z0-9_.-]{4,90}$/.test(x.case_id)&&
    typeof x.status==='string'&&
    /^[A-Z][A-Z0-9_]{5,90}$/.test(x.status)&&
    x.original_job_completed===false&&x.installation_authorized===false&&
    x.production_changed===false);
 if(!verify(baseline)||!verify(candidate)||
    baseline.length!==candidate.length||
    baseline.some((x,i)=>x.case_id!==candidate[i].case_id))
  return refuse('ENGINEERING_CANDIDATE_ISOLATED_PROBES_UNVERIFIED');
 const observedChange=baseline.some((x,i)=>x.status!==candidate[i].status);
 const proof=sha256(JSON.stringify({version:ENGINEERING_EVALUATION_VERSION,
  original:inspection.work_id,
  maintenance:inspection.maintenance_id,
  source_sha:inspection.source_blob_sha,
  candidate_sha:inspection.proposed_source_sha256,
  baseline,candidate}));
 return deny(observedChange?
  'ENGINEERING_CANDIDATE_OBSERVABLE_CHANGE_REQUIRES_FROZEN_RED':
  'ENGINEERING_CANDIDATE_NO_OBSERVED_BEHAVIOR_CHANGE',{
  work_id:inspection.work_id,maintenance_id:inspection.maintenance_id,
  source_ref:inspection.source_ref,probe_count:baseline.length,
  isolated_probe_receipt_sha256:proof,
  behavioral_change_observed:observedChange,
  frozen_case_red_independently_verified:false,
  actual_original_acceptance_passed:false,
  next_governed_action:observedChange?
   'RUN_INDEPENDENT_ORIGINAL_CASE_SPECIFIC_FROZEN_RED':
   'REQUALIFY_CANDIDATE_AGAINST_FROZEN_FAILURE_REQUIREMENTS'
 });
}
