// Reality-native exact #263 install warrant. Preparing an immutable
// owner/work/source/artifact proposal is not an installation approval.
// This record only makes the next missing handoffs auditable.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const safe=status=>Object.freeze({status,shift_id:SHIFT,original_work_id:WORK,
 owner_approval_ready:false,installation_authorized:false,
 original_job_completed:false,production_changed:false});
const fail=status=>{throw Error('NATIVE263_WARRANT_'+status)};
export async function stageRealityNative263ExactInstallWarrant({
 db,env=process.env,graph,preflight,contentsProbe,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    graph.shift_id!==SHIFT||graph.owner_id!==OWNER||
    graph.installation_authorized!==false||
    graph.production_changed!==false||!Array.isArray(graph.jobs)||
    graph.jobs.filter(j=>j.original_work_id===WORK&&
     j.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
     j.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
     j.independent_source_proof_verified===true).length!==1||
    preflight?.status!=='NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'||
    preflight.original_work_id!==WORK||
    preflight.candidate_artifact_sha256!==HASH||
    preflight.existing_file_baseline_verified!==true||
    preflight.frozen_candidate_verified!==true||
    preflight.owner_approval_ready!==false||
    contentsProbe?.status!=='NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED'||
    contentsProbe.original_work_id!==WORK||
    contentsProbe.canary_write_verified!==true||
    contentsProbe.provider_http_status!==201||
    contentsProbe.installation_authorized!==false)
  fail('EXACT_CURRENT_OWNER_SOURCE_AND_REAL_GITHUB_PROOF_REQUIRED');
 const staged=await shiftRpc(db,'reality_stage_native263_exact_install_warrant_v1',{},{
  fetchImpl});
 if(staged.status!=='EXACT_NATIVE263_INSTALL_WARRANT_STAGED_PREAPPROVAL'||
    staged.original_work_id!==WORK||staged.shift_id!==SHIFT||
    staged.owner_id!==OWNER||
    staged.candidate_artifact_sha256!==HASH||
    staged.github_contents_permission_independently_verified!==true||
    staged.owner_approval_ready!==false||
    staged.installation_authorized!==false||
    staged.original_job_completed!==false||
    staged.production_changed!==false||
    staged.automatic_deployment_verified!==false||
    staged.postinstall_original_resumption_verified!==false)
  fail('DURABLE_PREAPPROVAL_LEDGER_READBACK_UNVERIFIED');
 if(staged.state!=='STAGED_UNAPPROVED')
  return safe('NATIVE263_WARRANT_EXISTS_WITH_AUTHORITY_REQUIRE_INDEPENDENT_RESUME_READBACK');
 return Object.freeze({
  ...safe('EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED'),
  owner_id:OWNER,candidate_artifact_sha256:HASH,
  source_ref:staged.source_ref,
  exact_target_branch:staged.exact_target_branch,
  exact_target_path:staged.existing_file_path,
  exact_candidate_source_verified:true,
  real_reality_github_contents_write_verified:true,
  owner_approval_ready:false,
  automated_deployment_verified:false,
  same_original_continuation_verified:false,
  next_gate:'VERIFY_DEPLOYMENT_AND_AUTOMATIC_RESUME_BEFORE_EXACT_OWNER_APPROVAL'
 });
}
