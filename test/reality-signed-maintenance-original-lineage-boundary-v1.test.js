import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isSignedMaintenanceOriginalLineageMissing}
 from '../src/reality-signed-maintenance-original-lineage-boundary-v1.js';
const hash=x=>'sha256:'+x.repeat(64);
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const original={
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
 canonical_owner_business_original_missing:true,
 case_specific_maintenance_ci_red_attested:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false,original_work_id:work,
 source_ref:'https://github.com/maloney2323/Reality/pull/307',
 signed_external_review_receipt_sha256:hash('a'),
 scoped_maintenance_case_ci_receipts:[{
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  case_specific_ci_receipt_sha256:hash('b'),
  original_job_completed:false,repair_installed:false
 }]
};
test('only actual signed no-owner-original lineage is routed to qualification, not invented CI-RED or completion',()=>{
 assert.equal(isSignedMaintenanceOriginalLineageMissing(original),true);
 assert.equal(isSignedMaintenanceOriginalLineageMissing({
  ...original,scoped_maintenance_case_ci_receipts:[]}),true);
});
test('the unrelated PR308 independently verified code RED must not settle or qualify PR307 original work',()=>{
 assert.equal(original.scoped_maintenance_case_ci_receipts[0].source_ref.includes('/308'),true);
 assert.equal(original.case_specific_maintenance_ci_red_attested,false);
 assert.equal(isSignedMaintenanceOriginalLineageMissing({...original,
  next_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'}),false);
 assert.equal(isSignedMaintenanceOriginalLineageMissing({...original,
  canonical_owner_business_original_missing:false}),false);
});
test('fail closed on forged owner-original, install, settlement and unsourced evidence',()=>{
 const variants=[
  {status:'EXISTING_ORIGINAL_NOT_AUTHORIZED_BY_MAINTENANCE_SHIFT'},
  {original_job_completed:true},
  {installation_authorized:true},
  {production_changed:true},
  {original_work_id:'work:forgery'},
  {source_ref:'https://github.com/attacker/Reality/pull/307'},
  {signed_external_review_receipt_sha256:null},
  {scoped_maintenance_case_ci_receipts:[{
   case_specific_ci_receipt_sha256:hash('b'),
   original_job_completed:true,repair_installed:false}]},
  {scoped_maintenance_case_ci_receipts:[{
   case_specific_ci_receipt_sha256:hash('b'),
   original_job_completed:false,repair_installed:true}]}
 ];
 for(const bad of variants)
  assert.equal(isSignedMaintenanceOriginalLineageMissing({
   ...original,...bad}),false);
});
test('the running signed worker uses this guard and the existing read-only original gate remains owner-scoped',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/isSignedMaintenanceOriginalLineageMissing\(sameOriginalPostmaintenanceGate\)/);
 assert.match(worker,/SIGNED_MAINTENANCE_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_REQUIRED/);
 assert.match(worker,/reality_read_same_original_postmaintenance_gate_v1/);
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261120184500_existing_original_business_linkage_gate_v1.sql',
  import.meta.url),'utf8');
 for(const term of [
  "current_user<>'service_role'",
  "m.maintenance_kind='EMPLOYEE_QUALIFICATION_HANDOFF_STALLED'",
  "m.independent_review_status='NO_ORIGINAL_ADMISSION_CONFIRMED'",
  "m.original_customer_work_id IS NULL",
  "c.shift_id IN(m.origin_shift_id,p_shift_id)",
  "VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI",
  "case_specific_maintenance_ci_red_attested",
  "scoped_maintenance_case_ci_receipts"
 ])assert.ok(sql.includes(term),term);
 assert.doesNotMatch(sql,/update reality_internal|insert into reality_internal|net\.http_post/i);
});
