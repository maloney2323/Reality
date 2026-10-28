// Governed Autonomous Self-Upgrading — verifier-signed payload warrant v0.1
// Server-owned HMAC, domain-separated from conversational authority. This
// attests to a caller-verified sandbox result, NOT approval to execute code.
// Only a trusted internal verifier may call issueUpgradeEvidenceWarrant;
// never expose that function behind a user/LLM-supplied issuance route.
import {createHash,createHmac,hkdfSync,timingSafeEqual} from 'node:crypto';
import {fingerprintGovernedUpgradeCandidate}
 from './reality-governed-github-upgrade-provider-v0.1.js';
export const UPGRADE_EVIDENCE_WARRANT_VERSION='reality-upgrade-evidence-warrant-v0.1';
const WORK=/^work:[a-f0-9]{32}$/;
const HEX64=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail=code=>{throw Error(code)};
const stable=o=>o===null||typeof o!=='object'?o:
 Array.isArray(o)?o.map(stable):Object.fromEntries(Object.keys(o).sort().map(k=>[k,stable(o[k])]));
const canonical=o=>JSON.stringify(stable(o));
export const hashUpgradeEvidence=o=>createHash('sha256').update(canonical(o)).digest('hex');
function key(env){
 // Existing server-owned secret, derived into a different cryptographic
 // purpose. It is never available to the LLM, browser or the GitHub PR.
 const secret=env?.REALITY_CHAT_RECEIPT_HMAC_KEY;
 if(typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)
  fail('UPGRADE_WARRANT_SERVER_KEY_REQUIRED');
 return Buffer.from(hkdfSync('sha256',Buffer.from(secret,'utf8'),
  Buffer.from('reality-upgrade-warrant-salt-v1'),
  Buffer.from('reality:independent-verifier:warrant:v1'),32));
}
const signature=(body,env)=>createHmac('sha256',key(env)).update(canonical(body)).digest('hex');
function tested(experiment){
 if(experiment?.state!=='SANDBOX_VERIFIED'||!WORK.test(String(experiment.work_item_id||''))||
    !HEX64.test(String(experiment.verification_hash||''))||
    !HEX64.test(String(experiment.experiment_hash||''))||
    experiment.production_graph_write_permitted!==false||
    !/^worldline:ephemeral:[a-f0-9]{32}$/.test(String(experiment.ephemeral_worldline_id||''))||
    experiment.verification_bundle?.frozen_regression?.passed!==true||
    experiment.verification_bundle?.isolated_verification?.verified!==true||
    experiment.verification_bundle?.experiment_hash!==experiment.experiment_hash||
    experiment.verification_bundle?.capability_signature!==experiment.capability_signature||
    !experiment.capability_signature||
    hashUpgradeEvidence(experiment.verification_bundle)!==experiment.verification_hash)
  fail('UPGRADE_WARRANT_EXACT_SANDBOX_VERIFICATION_REQUIRED');
 const files=experiment.verification_bundle.synthesized_capability?.files;
 if(!Array.isArray(files)||files.length<1||
    canonical(files)!==canonical(experiment.synthesized_capability?.files))
  fail('UPGRADE_WARRANT_TESTED_SOURCE_BYTES_MISMATCH');
 // The provider's allowlist and file-byte limits are checked by its
 // candidate hash helper; authorization is enforced separately at dispatch.
 return fingerprintGovernedUpgradeCandidate(files);
}
function mandatory({experiment,originalWorkItem,blockedCheckpointId,goalRevision,
 ownerId,conversationId,baseCommitSha,verifierReceipt}){
 const candidate=tested(experiment);
 if(!UUID.test(String(ownerId||''))||!UUID.test(String(conversationId||''))||
    !UUID.test(String(blockedCheckpointId||''))||
    experiment.work_item_id!==originalWorkItem?.id||
    experiment.continuity_root_id!==originalWorkItem?.continuity_root_id||
    experiment.worldline_id!==originalWorkItem?.worldline_id||
    !originalWorkItem.continuity_root_id||!originalWorkItem.worldline_id||
    typeof goalRevision!=='string'||goalRevision.length<8||
    !SHA.test(String(baseCommitSha||''))||
    verifierReceipt?.status!=='INDEPENDENT_SANDBOX_VERIFIED'||
    verifierReceipt.work_item_id!==originalWorkItem.id||
    verifierReceipt.experiment_hash!==experiment.experiment_hash||
    verifierReceipt.verification_hash!==experiment.verification_hash||
    verifierReceipt.candidate_sha256!==candidate||
    verifierReceipt.frozen_regression_sha256!==
      hashUpgradeEvidence(experiment.verification_bundle.frozen_regression)||
    verifierReceipt.holdout?.passed!==true||
    !Number.isSafeInteger(verifierReceipt.holdout?.case_count)||
    verifierReceipt.holdout.case_count<1||
    !HEX64.test(String(verifierReceipt.holdout?.result_sha256||''))||
    verifierReceipt.isolation?.production_write_permitted!==false||
    verifierReceipt.isolation?.secrets_accessible!==false||
    !/^[a-zA-Z0-9:_./-]{10,300}$/.test(String(verifierReceipt.verifier_run_ref||'')))
  fail('UPGRADE_WARRANT_INDEPENDENT_HOLDOUT_AND_SCOPE_REQUIRED');
 return candidate;
}
export function issueUpgradeEvidenceWarrant({
 experiment,originalWorkItem,blockedCheckpointId,goalRevision,ownerId,conversationId,
 baseCommitSha,verifierReceipt,env=process.env,now=Date.now(),
}={}){
 // verifierReceipt MUST be produced by an internal isolated verifier,
 // not by a model or a browser. This signer authenticates the verifier
 // process's decision; it does not independently run tests here.
 const candidate=mandatory({experiment,originalWorkItem,blockedCheckpointId,
  goalRevision,ownerId,conversationId,baseCommitSha,verifierReceipt});
 if(!Number.isSafeInteger(now)||now<=0)fail('UPGRADE_WARRANT_ISSUANCE_CLOCK_INVALID');
 const body={
  version:UPGRADE_EVIDENCE_WARRANT_VERSION,
  issuer:'REALITY_TRUSTED_VERIFIER',
  owner_id:ownerId,conversation_id:conversationId,
  original_work_id:originalWorkItem.id,
  continuity_root_id:originalWorkItem.continuity_root_id,
  worldline_id:originalWorkItem.worldline_id,
  blocked_checkpoint_id:blockedCheckpointId,
  authorized_goal_revision:goalRevision,
  capability_id:experiment.capability_id,
  experiment_hash:experiment.experiment_hash,
  verification_hash:experiment.verification_hash,
  candidate_sha256:candidate,
  frozen_regression_sha256:hashUpgradeEvidence(experiment.verification_bundle.frozen_regression),
  isolated_verification_sha256:hashUpgradeEvidence(experiment.verification_bundle.isolated_verification),
  holdout_result_sha256:verifierReceipt.holdout.result_sha256,
  verifier_receipt_sha256:hashUpgradeEvidence(verifierReceipt),
  verifier_run_ref:verifierReceipt.verifier_run_ref,
  pinned_base_commit_sha:baseCommitSha,
  issued_at:new Date(now).toISOString(),
  expires_at:new Date(now+24*60*60*1000).toISOString(),
  github_execution_authorized:false,
  promotion_authorized:false,
  original_job_completed:false,
 };
 return Object.freeze({...body,warrant_id:'warrant:'+hashUpgradeEvidence(body),
  signature_algorithm:'HMAC-SHA256:HKDF-DOMAIN-SEPARATED',
  signature:signature(body,env)});
}
export function verifyUpgradeEvidenceWarrant({
 warrant,experiment,originalWorkItem,blockedCheckpointId,goalRevision,
 ownerId,conversationId,baseCommitSha,verifierReceipt,env=process.env,now=Date.now(),
}={}){
 const reject=reason=>Object.freeze({valid:false,reason,execution_authorized:false});
 try{
  const candidate=mandatory({experiment,originalWorkItem,blockedCheckpointId,
   goalRevision,ownerId,conversationId,baseCommitSha,verifierReceipt});
  if(!warrant||warrant.version!==UPGRADE_EVIDENCE_WARRANT_VERSION||
     !HEX64.test(String(warrant.signature||''))||
     warrant.signature_algorithm!=='HMAC-SHA256:HKDF-DOMAIN-SEPARATED')
   return reject('UPGRADE_WARRANT_MISSING_OR_UNSIGNED');
  const {signature:given,warrant_id,signature_algorithm,...body}=warrant;
  if(warrant_id!=='warrant:'+hashUpgradeEvidence(body))
   return reject('UPGRADE_WARRANT_CANONICAL_PAYLOAD_CHANGED');
  const expected=Buffer.from(signature(body,env),'hex');
  if(!timingSafeEqual(expected,Buffer.from(given,'hex')))
   return reject('UPGRADE_WARRANT_SIGNATURE_INVALID');
  if(body.issuer!=='REALITY_TRUSTED_VERIFIER'||
     body.owner_id!==ownerId||body.conversation_id!==conversationId||
     body.original_work_id!==originalWorkItem.id||
     body.continuity_root_id!==originalWorkItem.continuity_root_id||
     body.worldline_id!==originalWorkItem.worldline_id||
     body.blocked_checkpoint_id!==blockedCheckpointId||
     body.authorized_goal_revision!==goalRevision||
     body.capability_id!==experiment.capability_id||
     body.experiment_hash!==experiment.experiment_hash||
     body.verification_hash!==experiment.verification_hash||
     body.candidate_sha256!==candidate||
     body.frozen_regression_sha256!==hashUpgradeEvidence(experiment.verification_bundle.frozen_regression)||
     body.isolated_verification_sha256!==hashUpgradeEvidence(experiment.verification_bundle.isolated_verification)||
     body.holdout_result_sha256!==verifierReceipt.holdout.result_sha256||
     body.verifier_receipt_sha256!==hashUpgradeEvidence(verifierReceipt)||
     body.pinned_base_commit_sha!==baseCommitSha||
     body.github_execution_authorized!==false||
     body.promotion_authorized!==false||
     body.original_job_completed!==false)
   return reject('UPGRADE_WARRANT_SCOPE_OR_CANDIDATE_CHANGED');
  const issued=Date.parse(body.issued_at),expires=Date.parse(body.expires_at);
  if(!Number.isSafeInteger(now)||!Number.isFinite(issued)||
     !Number.isFinite(expires)||issued>now+30000||expires<=now||
     expires<=issued||expires-issued>86400000)
   return reject('UPGRADE_WARRANT_EXPIRED_OR_INVALID_TIME');
  return Object.freeze({valid:true,status:'VERIFIED_NOT_AUTHORIZED',
   warrant_id,warrant_hash:hashUpgradeEvidence(warrant),
   candidate_sha256:candidate,execution_authorized:false,
   promotion_authorized:false,original_job_completed:false});
 }catch(error){
  return reject(/^UPGRADE_WARRANT_/.test(String(error?.message||''))?
   error.message:'UPGRADE_WARRANT_NOT_VERIFIABLE');
 }
}
