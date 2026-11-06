import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {Script} from 'node:vm';
import {renderRealityReceiptPdf} from '../src/reality-job-receipt-pdf-v1.js';
import {projectDiscoveryEconomicContext} from '../src/reality-discovery-value-v1.js';
const id='candidate-receipt:'+'a'.repeat(32);
const candidate={
 receipt_id:id,
 status:'INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED',
 durable_release_readback_verified:true,
 record_is_immutable:true,
 durable_release_at:'2026-11-03T00:31:57.212615+00:00',
 source_issue:188,
 source_sha256:'b'.repeat(64),
 provider_repository_sha:'c'.repeat(40),
 provider_run_id:41547631404,
 provider_run_url:'https://github.com/maloney2323/Reality/actions/runs/41547631404',
 verification_checks_passed:21,
 proposal_archive_sha256:'d'.repeat(64),
 independent_verification_archive_sha256:'e'.repeat(64),
 installation_authorized:false,
 installed:false,
 new_owner_job_created:false,
 production_changed:false,
};
const economicRow={
 receipt_id:id,status:'RELEASED_VERIFIED_PROVIDER_EVIDENCE',
 durable_readback_verified:true,source_sha256:candidate.source_sha256,
 verified_checks_passed:21,source_of_usage:'IMMUTABLE_INDEPENDENT_VERIFIER_REPORT',
 observed_model_attempts:1,observed_model_input_tokens:2651,
 observed_model_output_tokens:3592,observed_independent_verification_ms:15793,
 observed_model_cost_usd:null,installation_authorized:false,installed:false,
};
const report={
 discovery_value:projectDiscoveryEconomicContext({candidateReceipt:candidate,ownerEconomicReadback:economicRow}),
 ok:true,status:'HARDENED_SOURCE_VERIFIED_NOT_OWNER_WORK_BOUND',
 automatic_candidate_receipt:candidate,
 source_sha256:candidate.source_sha256,
 independent_tests_passed:21,
 qualified_for_owner_installation:false,
 installed:false,owner_approval_issued:false,
 new_original_work_id:null,production_changed:false,
};
test('verified released owner receipt renders a genuine PDF with incomplete steps explicitly marked',()=>{
 const b=renderRealityReceiptPdf(report);
 assert.ok(Buffer.isBuffer(b));
 assert.equal(b.subarray(0,8).toString('latin1'),'%PDF-1.4');
 assert.match(b.toString('latin1'),/xref\n0 [0-9]+\n/);
 assert.match(b.toString('latin1'),/startxref\n[0-9]+\n%%EOF\n/);
 assert.match(b.toString('latin1'),/21 of 21/);
 assert.match(b.toString('latin1'),/INDEPENDENTLY VERIFIED AND DURABLY RELEASED/);
 assert.match(b.toString('latin1'),/New original job binding: NOT VERIFIED/);
 assert.match(b.toString('latin1'),/Exact installation approval: NOT GIVEN/);
 assert.match(b.toString('latin1'),/Cash savings \/ ROI: UNKNOWN/);
 assert.match(b.toString('latin1'),/No receipt, approval, or external action is created by downloading this PDF/);
 assert.match(b.toString('latin1'),/WHY REALITY SUGGESTED THIS UPGRADE/);
 assert.match(b.toString('latin1'),/missing executable final-outcome verification capability/);
 assert.match(b.toString('latin1'),/EXPECTED VALUE /);
 assert.match(b.toString('latin1'),/PROS - expected/);
 assert.match(b.toString('latin1'),/CONS \/ RISKS - unresolved/);
 assert.match(b.toString('latin1'),/INDEPENDENT VERIFICATION GRAPH/);
 assert.match(b.toString('latin1'),/LIFECYCLE PROGRESS/);
 assert.match(b.toString('latin1'),/\/Count 3 >>/);
 assert.match(b.toString('latin1'),/Human baseline \/ supervision: UNKNOWN/);
 assert.match(b.toString('latin1'),/DISCOVERY VALUE/);
 assert.match(b.toString('latin1'),/ILLUSTRATIVE HUMAN DIAGNOSIS LABOR VALUE/);
 assert.match(b.toString('latin1'),/QA USD 100\.28/);
 assert.match(b.toString('latin1'),/DEV USD 130\.76/);
 assert.match(b.toString('latin1'),/DEV USD 261\.52/);
 assert.match(b.toString('latin1'),/ACTUAL FINANCIAL ROI: NOT YET VERIFIABLE/);


 assert.ok(b.length<30000);
 if(process.env.REALITY_PDF_SMOKE_OUT){
  mkdirSync(dirname(process.env.REALITY_PDF_SMOKE_OUT),{recursive:true});
  writeFileSync(process.env.REALITY_PDF_SMOKE_OUT,b);
 }
});
test('unverified, forged or already-installed statuses cannot generate official evidence PDF',()=>{
 for(const changed of [
  {...report,ok:false},
  {...report,source_sha256:'f'.repeat(64)},
  {...report,installed:true},
  {...report,owner_approval_issued:true},
  {...report,automatic_candidate_receipt:{...candidate,durable_release_readback_verified:false}},
  {...report,automatic_candidate_receipt:{...candidate,status:'VERIFIED_CANDIDATE_SOURCE_OBSERVED'}},
  {...report,automatic_candidate_receipt:{...candidate,installation_authorized:true}},
  {...report,automatic_candidate_receipt:{...candidate,verification_checks_passed:22}},
 ])assert.throws(()=>renderRealityReceiptPdf(changed),/REALITY_PDF_RECEIPT_/);
});
test('same owner-signed-in source validates on-screen and downloaded PDF',()=>{
 const route=readFileSync('api/reality/personal-receipt-pdf.js','utf8');
 const review=readFileSync('api/reality/personal-issue188-candidate-review.js','utf8');
 assert.match(route,/authenticatedChatSession\(req,res\)/);
 assert.match(route,/verifiedOwnerCandidateReview\(session\)/);
 assert.match(review,/export async function verifiedOwnerCandidateReview\(session\)/);
 assert.match(review,/independentlyReadBackReleasedCandidate/);
 assert.match(route,/req\.method!=='GET'/);
 assert.match(route,/Object\.keys\(req\.query\|\|\{\}\)\.length/);
 assert.match(route,/Content-Disposition/);
 assert.match(route,/application\/pdf/);
 assert.doesNotMatch(route,/reality_owner_approve_qualified_preview_v1|reality_release_verified_capability_receipt_v1/);
});
test('customer receipt offers a real PDF download link and no extra receipt creation button',()=>{
 const html=readFileSync('index.html','utf8');
 assert.match(html,/Download receipt as PDF/);
 assert.match(html,/\/api\/reality\/personal-receipt-pdf/);
 assert.match(html,/receipt\.automatic_candidate_receipt\.receipt_id\.split\(':'\)/);
 assert.doesNotMatch(html,/Save work receipt · Start automatic repair preparation/);
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 assert.ok(inline.length>0);
 for(const [i,m] of inline.entries())assert.doesNotThrow(()=>new Script(m[1],{filename:'index:'+i}));
});
