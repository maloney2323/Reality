import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {renderRealityCompletedJobPdf}
 from '../src/reality-genuine-completed-receipt-pdf-v1.js';
const proof={
 status:'FULL_LOOP_INDEPENDENTLY_VERIFIED',
 original_work_id:'work:'+'a'.repeat(32),
 artifact_sha256:'b'.repeat(64),
 installed_commit_sha:'c'.repeat(40),
 provider_run_id:41562481013,
 settlement_event_id:'33333333-3333-4333-8333-333333333333',
 verifier_artifact_digest:'sha256:'+'d'.repeat(64),
 verified_at:'2026-11-03T02:00:00Z',
 production_changed:false
};
test('a separately final-verified owner receipt renders one customer PDF, not the uninstalled candidate report',()=>{
 const pdf=renderRealityCompletedJobPdf(proof);
 const text=pdf.toString('latin1');
 assert.equal(text.slice(0,8),'%PDF-1.4');
 assert.match(text,/FINAL VERIFIED CUSTOMER JOB RECEIPT/);
 assert.match(text,/INDEPENDENTLY VERIFIED - ORIGINAL WORK SETTLED/);
 assert.match(text,/FULL-LOOP RESULT/);
 assert.match(text,/Realized cash ROI: NOT VERIFIED/);
 assert.match(text,/\/Count 1/);
 assert.match(text,new RegExp(proof.artifact_sha256));
 assert.match(text,new RegExp(proof.settlement_event_id));
 assert.ok(pdf.length>1500&&pdf.length<60000);
 const path=process.env.REALITY_FINAL_RECEIPT_PDF_SMOKE_OUT;
 if(path){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,pdf);}
});
test('no completion PDF without independently verified final artifact, owner-work identity or immutable provider receipt',()=>{
 for(const forged of [
  {...proof,status:'SETTLED_ISOLATED'},
  {...proof,original_work_id:'not-a-work'},
  {...proof,artifact_sha256:null},
  {...proof,installed_commit_sha:'bad'},
  {...proof,settlement_event_id:'not-a-uuid'},
  {...proof,verifier_artifact_digest:'not-evidence'},
  {...proof,verified_at:null},
  {...proof,production_changed:true}
 ])assert.throws(()=>renderRealityCompletedJobPdf(forged),/INDEPENDENT_PROVIDER_AND_DB_RECEIPT_REQUIRED/);
});
test('authenticated final receipt endpoint is read-only and requires a row in the signed owner ledger',()=>{
 const route=readFileSync(new URL('../api/reality/personal-genuine-final-receipt-pdf.js',import.meta.url),'utf8');
 assert.match(route,/req.method!=='GET'/);
 assert.match(route,/authenticatedChatSession/);
 assert.match(route,/rpc\/reality_read_owner_final_receipts_v1/);
 assert.match(route,/data.does_not_authorize_actions!==true/);
 assert.match(route,/NO_INDEPENDENT_FULL_LOOP_RECEIPT_YET/);
 assert.match(route,/renderRealityCompletedJobPdf\(receipt\)/);
 assert.doesNotMatch(route,/APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY/);
});
