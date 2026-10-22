
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createBitemporalLedgerEntry,validateLedgerEntry,createLedgerCorrection,
 reconstructAsBelievedAt,assertLedgerContinuity,
} from '../src/reality-universe-bitemporal-ledger-v0.1.js';
const before='2026-10-20T10:00:00Z',after='2026-10-22T10:00:00Z';
const original=()=>createBitemporalLedgerEntry({
 entryId:'invoice:17:amount:v1',eventKind:'INVOICE_ASSERTION',
 effectiveTime:before,assertionTime:before,
 continuityRootId:'business:owner',worldlineId:'reality:primary',
 payload:{amount:90,currency:'USD',status:'PENDING'},
 evidenceReferences:['receipt:old'],sourceRef:'synthetic:invoice:source',
});
test('valid bitemporal event passes independent provenance and content hash checks',()=>{
 const first=original();
 assert.equal(validateLedgerEntry(first),true);
 assert.equal(first.provenance_hash.length,64);
 assert.equal(first.ledger_entry_hash.length,64);
});
test('payload, event time, tenant scope and evidence-reference tampering all fail',()=>{
 const first=original();
 const edits=[
  {...first,payload:{amount:100,currency:'USD',status:'PENDING'}},
  {...first,effective_time:'2026-10-21T10:00:00Z'},
  {...first,continuity_root_id:'business:other'},
  {...first,evidence_references:['receipt:forged']},
  {...first,parent_entry_id:'unknown'},
 ];
 for(const bad of edits)
  assert.throws(()=>validateLedgerEntry(bad),/BITEMPORAL_PROVENANCE_HASH_MISMATCH/);
});
test('forged ledger-entry hash is rejected even when provenance hash is valid',()=>{
 assert.throws(()=>validateLedgerEntry({
  ...original(),ledger_entry_hash:'not-a-hash'
 }),/BITEMPORAL_LEDGER_ENTRY_HASH_MISMATCH/);
});
test('backdated correction does not rewrite what Reality believed at an earlier time',()=>{
 const first=original();
 const corrected=createLedgerCorrection({
  correctionEntryId:'invoice:17:correction',originalEntry:first,
  correctionPayload:{amount:100,currency:'USD',reason:'customer-supplied-new-receipt'},
  effectiveTime:before,assertionTime:after,
  evidenceReferences:['receipt:customer-verified'],
 });
 assert.equal(validateLedgerEntry(corrected),true);
 assert.equal(assertLedgerContinuity(first,corrected),true);
 const earlier=reconstructAsBelievedAt([first,corrected],{
  assertionTime:'2026-10-21T00:00:00Z',
  continuityRootId:first.continuity_root_id,worldlineId:first.worldline_id,
 });
 assert.deepEqual(earlier.map(x=>x.entry_id),[first.entry_id]);
 const latest=reconstructAsBelievedAt([first,corrected],{
  assertionTime:'2026-10-23T00:00:00Z',
  continuityRootId:first.continuity_root_id,worldlineId:first.worldline_id,
 });
 assert.equal(latest.length,2);
 assert.deepEqual(first.payload,{amount:90,currency:'USD',status:'PENDING'});
 assert.equal(corrected.correction_of_entry_id,first.entry_id);
});
test('reconstruction refuses a forged historical row rather than silently returning it',()=>{
 const first=original();
 assert.throws(()=>reconstructAsBelievedAt([{...first,payload:{amount:9000}}],{
  assertionTime:after,
 }),/BITEMPORAL_PROVENANCE_HASH_MISMATCH/);
});
