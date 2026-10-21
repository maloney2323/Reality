// Offline-only diagnostic. Replays frozen, already-paid provider answers through
// the revised advisory boundary; does NOT make a model or external-action call.
// Development/test data were seen during implementation: NOT blind evidence.
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {dispositionDigest,DISPOSITION_CONTRACT_VERSION,canonicalDispositionPolicyAttestation}
  from '../../src/reality-disposition-escalation-contract-v0.1.js';
import {repairPolicyMisalignedAdvisory}
  from '../../src/reality-governed-advisory-repair-v0.1.js';
import {CASES,buildPublicPacket,scoreDecision} from './business-adversarial-50-six-sector-v0.1.js';
import {publishUnverifiedInformationalAdvisory} from '../../src/reality-advisory-publication-boundary-v0.1.js';
const input=process.argv[2];
if(!input)throw Error('LOCKED_PROVIDER_RECEIPT_FILE_REQUIRED');
const data=JSON.parse(readFileSync(input,'utf8'));
if(data.run_id!=='bd1db32d-6b50-4bca-87e3-5fd3bbce0a11'||
  data.records?.length!==50||
  data.summary.provider_calls!==50||
  data.summary.raw_model_scored!==50)throw Error('UNKNOWN_OR_INCOMPLETE_LOCKED_RECEIPTS');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const trustedPolicyPublicKey=publicKey.export({type:'spki',format:'pem'});
const results=[];
for(const c of CASES){
  const original=data.records.find(x=>x.case_id===c.id);
  if(!original||!original.raw_candidate)throw Error('MISSING_CASE_'+c.id);
  const packet=buildPublicPacket(c);
  if(hash(packet)!==original.public_packet_sha256)throw Error('FROZEN_PUBLIC_PACKET_HASH_MISMATCH_'+c.id);
  const pub={
    work_item_id:c.id,question:packet.question,
    evidence:packet.evidence.map(e=>({id:e.id,source:e.source,authority:e.authority,
      observed_at:e.observed_at,text:e.text}))
  };
  let disposition=original.governed_publication;
  let state=original.outcome_status;
  let reason='ORIGINAL_SIGNED_POLICY_GATE_UNCHANGED';
  if(original.source_policy.findings.length&&
     original.outcome_status==='WITHHELD_PENDING_GOVERNED_REVIEW'){
    const t=Date.now();
    const policy={
      version:DISPOSITION_CONTRACT_VERSION,decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
      policy_signer_id:'LOCAL_REPLAY_NOT_INDEPENDENT',
      work_item_id:c.id,evidence_digest:dispositionDigest(pub.evidence),
      findings:[...original.source_policy.findings],
      policy_version:'FROZEN_DEVELOPMENT_POLICY_ALREADY_SEEN',
      source_readback_ref:'SYNTHETIC_CASE_EVIDENCE_ONLY',
      issued_at:new Date(t-1000).toISOString(),expires_at:new Date(t+60000).toISOString(),
      nonce:'REPLAY_LOCAL_'+c.id
    };
    policy.signature=sign(null,Buffer.from(canonicalDispositionPolicyAttestation(policy)),
      privateKey).toString('base64');
    const repaired=repairPolicyMisalignedAdvisory({
      publicPacket:pub,policyAttestation:policy,
      trustedPolicyPublicKey,candidateDecision:original.raw_candidate
    });
    disposition=repaired.publication;
    state=repaired.status;
    reason=repaired.reason||repaired.assessment_receipt?.reason||repaired.status;
  }else if(!original.source_policy.findings.length){
    const released=publishUnverifiedInformationalAdvisory({
      publicPacket:pub,candidateDecision:original.raw_candidate,
      classifiedControlFindings:original.source_policy.findings
    });
    disposition=released.publication;
    state=released.status;
    reason=released.assessment_receipt.reason;
  }
  // Evaluation ONLY AFTER publication, never passed to a generating/verifying component.
  const finalScore=disposition?scoreDecision(c.id,disposition):null;
  results.push({
    case_id:c.id,baseline_raw_correct:original.raw_score?.pass===true,
    original_governed_correct:original.governed_score?.pass===true,
    revised_correct:finalScore?.pass===true,
    revised_published:Boolean(disposition),state,
    policy_source_independently_proven:false,
    unverified_advisory:Boolean(disposition?.kind==='UNVERIFIED_INFORMATIONAL_ADVISORY'),
    corrected_advisory:Boolean(disposition?.kind==='GOVERNED_CORRECTED_ADVISORY_ONLY'),
    external_action_verified:false,reason
  });
}
const summary={
  frozen_cases:50,original_provider_calls:50,new_provider_calls:0,
  original_raw_pass:results.filter(x=>x.baseline_raw_correct).length,
  original_governed_pass:results.filter(x=>x.original_governed_correct).length,
  revised_offline_score:results.filter(x=>x.revised_correct).length,
  revised_offline_fails:results.filter(x=>!x.revised_correct).length,
  revised_unverified_advisories:results.filter(x=>x.unverified_advisory).length,
  revised_policy_bound_corrected_advisories:results.filter(x=>x.corrected_advisory).length,
  revised_original_strict_governed_passthrough:results.filter(x=>x.revised_published&&!x.unverified_advisory&&!x.corrected_advisory).length,
  revised_withheld:results.filter(x=>!x.revised_published).length,
  original_frozen_scorer_unmodified:true,source_policy_rules_unmodified:true,
  independent_holdout_performance:false,
  original_customer_tasks_independently_verified:0,
};
console.log(JSON.stringify({schema:'reality.offline-advisory-boundary-replay.v0.1',
  original_receipt_sha256:data.receipt_sha256,
  caveat:'RETROSPECTIVE_KNOWN_PROVIDER_ANSWERS_DEVELOPMENT_POLICY_AND_EPHEMERAL_SIGNER_NOT_INDEPENDENT_BENCHMARK_PROOF',
  summary,results},null,2));
