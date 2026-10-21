// No-cost RETROSPECTIVE replay. Uses previously saved provider candidates.
// Read the frozen scorer only AFTER the boundary has finalized publication.
// This is a development regression, not a new model benchmark or blind test.
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {CASES,buildPublicPacket,scoreDecision} from './business-adversarial-50-six-sector-v0.1.js';
import {reconcileTypedEvidenceFindings} from '../../src/reality-typed-evidence-findings-v0.1.js';
import {resolveEvidenceBoundDecision} from '../../src/reality-evidence-bound-decision-v0.1.js';
import {DISPOSITION_CONTRACT_VERSION,dispositionDigest,canonicalDispositionPolicyAttestation}
 from '../../src/reality-disposition-escalation-contract-v0.1.js';
const path=process.argv[2];
if(!path)throw Error('LOCKED_RECEIPT_INPUT_REQUIRED');
const saved=JSON.parse(readFileSync(path,'utf8'));
if(saved.run_id!=='bd1db32d-6b50-4bca-87e3-5fd3bbce0a11'||
   saved.records?.length!==50||saved.summary?.provider_calls!==50||
   saved.summary?.raw_model_scored!==50)throw Error('UNEXPECTED_PREVIOUSLY_PAID_RECEIPTS');
const keypair=generateKeyPairSync('ed25519');
const publicKey=keypair.publicKey.export({type:'spki',format:'pem'});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function attest(packet,findings){
 const at=Date.now();const a={
  version:DISPOSITION_CONTRACT_VERSION,decision:'ASSERT_TRUSTED_CONTROL_FINDINGS',
  policy_signer_id:'LOCAL_DEVELOPMENT_FIXTURE_NOT_INDEPENDENT',
  work_item_id:packet.work_item_id,evidence_digest:dispositionDigest(packet.evidence),
  findings,policy_version:'SOURCE_ONLY_DEVELOPMENT_NOT_BLINDED',
  source_readback_ref:'FROZEN_SYNTHETIC_EVIDENCE_NO_EXTERNAL_READBACK',
  issued_at:new Date(at-1000).toISOString(),expires_at:new Date(at+60000).toISOString(),
  nonce:'DEV_ONLY_'+packet.work_item_id
 };
 a.signature=sign(null,Buffer.from(canonicalDispositionPolicyAttestation(a)),keypair.privateKey)
  .toString('base64');
 return a;
}
const rows=[];
for(const c of CASES){
 const orig=saved.records.find(x=>x.case_id===c.id);
 const packet=buildPublicPacket(c);
 if(!orig||!orig.raw_candidate||hash(packet)!==orig.public_packet_sha256)
  throw Error('MISSING_OR_MODIFIED_FROZEN_PACKET_'+c.id);
 const pub={
  work_item_id:packet.case_id,question:packet.question,
  evidence:packet.evidence.map(e=>({id:e.id,source:e.source,authority:e.authority,
   text:e.text,observed_at:e.observed_at}))
 };
 const previous=orig.source_policy.findings;
 const policy=reconcileTypedEvidenceFindings(pub,{legacyFindings:previous});
 const final=await resolveEvidenceBoundDecision({
  publicPacket:pub,legacyFindings:previous,rawCandidate:orig.raw_candidate,
  policyAttestation:policy.findings.length?attest(pub,[...policy.findings]):null,
  trustedPolicyPublicKey:publicKey,
  independentSourceReadbackVerified:false
 });
 // Hidden grading material is ONLY accessed after decision and receipts.
 const evaluated=final.publication?scoreDecision(c.id,final.publication):null;
 rows.push({
  case_id:c.id,raw_model_pass:orig.raw_score?.pass===true,
  old_final_pass:orig.governed_score?.pass===true,
  final_pass:evaluated?.pass===true,final_disposition:final.publication?.disposition??null,
  output_kind:final.publication?.kind??null,
  state:final.status,
  policy_findings:[...final.typed_findings.findings],
  typed_evidence_ids:final.typed_findings.findings_with_evidence.map(f=>({
   code:f.finding,evidence_ids:f.evidence_ids,rule_id:f.rule_id})),
  scope_calibration:final.scope_uncertainty_receipt.changed,
  external_action_verified:false,
  source_truth_independently_verified:false,
  decision_receipt_sha256:final.receipt_sha256
 });
}
const tally={
 total:rows.length,paid_model_calls_this_run:0,
 original_raw_pass:rows.filter(x=>x.raw_model_pass).length,
 original_reality_live_final_pass:rows.filter(x=>x.old_final_pass).length,
 replay_pass:rows.filter(x=>x.final_pass).length,
 replay_fail:rows.filter(x=>!x.final_pass).length,
 published:rows.filter(x=>x.output_kind).length,
 withheld:rows.filter(x=>!x.output_kind).length,
 typed_classifications:rows.filter(x=>x.typed_evidence_ids.length).length,
 source_scope_calibrations:rows.filter(x=>x.scope_calibration).length,
 corrected_advisories:rows.filter(x=>x.output_kind==='GOVERNED_CORRECTED_ADVISORY_ONLY').length,
 independently_verified_original_work_outcomes:0,
 frozen_scorer_changed:false,
 blind_holdout_result:false,
 known_cases_development_replay:true,
};
if(rows.length!==50||tally.replay_pass+tally.replay_fail!==50)
 throw Error('RETROSPECTIVE_FIFTY_DENOMINATOR_INVALID');
const report={schema:'reality.development-five-causes.v0.1',
 original_frozen_receipt_sha256:saved.receipt_sha256,
 warning:'KNOWN_CASES_REPLAY_AND_EPHEMERAL_SIGNER_NOT_BLIND_NOT_EXTERNAL_SOURCE_TRUTH',
 tally,rows};
console.log(JSON.stringify({...report,receipt_sha256:hash(report)},null,2));
