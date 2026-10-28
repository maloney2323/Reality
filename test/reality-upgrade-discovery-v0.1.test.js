import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 projectRealityUpgradeDiscovery,triageOperationalBlocker,
} from '../src/reality-upgrade-discovery-v0.1.js';
import {projectOriginalJobRecoveryLoop}
 from '../src/reality-real-recovery-coordinator-v0.1.js';
const work='work:24cda9611404e9bcb47909976067605c';
const pass='https://github.com/maloney2323/Reality/actions/runs/40605639502';
const evidence={
 original_work_id:work,
 original_job_completed:false,external_action_performed:false,
 execution_authorized:false,
 recovery_receipt_id:'83810e5d-85ab-5701-bb22-813dc2d9f9e5',
 status:'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED',
 later_success:{run_url:pass},
};
test('Issue 143: later passing workflow is correctly NO NEW UPGRADE, not synthetic missing instrument',()=>{
 const result=projectRealityUpgradeDiscovery({
  originalWorkId:work,providerEvidence:evidence,
  cognitionState:{state:'NO_CAPABILITY_GAP'},
 });
 assert.equal(result.status,'NO_NEW_UPGRADE_NEEDED');
 assert.equal(result.needed_upgrade,null);
 assert.ok(result.next_action.includes('source-level correction'));
 assert.equal(result.original_job_completed,false);
 assert.equal(result.github_write_executed,false);
 assert.deepEqual(result.evidence_refs,[evidence.recovery_receipt_id,pass]);
 const report=projectOriginalJobRecoveryLoop({
  originalWorkId:work,
  conversationId:'4cc2f119-385c-48b8-8f03-88bbd47360df',
  evidence,cognitionState:{state:'NO_CAPABILITY_GAP'},
  goalId:'user-goal:219764fa8213a41a2ba638c5c2533d5b',
 });
 assert.equal(report.upgrade_discovery.status,'NO_NEW_UPGRADE_NEEDED');
 assert.equal(report.original_work_id,work);
 assert.equal(report.original_job_completed,false);
});
test('missing later pass is NOT automatically a missing capability',()=>{
 const result=projectRealityUpgradeDiscovery({
  originalWorkId:work,
  providerEvidence:{...evidence,status:'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW',later_success:null},
  cognitionState:{state:'NO_CAPABILITY_GAP'},
 });
 assert.equal(result.status,'DIAGNOSIS_REQUIRED');
 assert.equal(result.needed_upgrade,null);
 assert.equal(result.authorization_granted,false);
});
test('Recovery v1 confirmed gap yields proposal FOR REVIEW but grants no synthesis or promotion authority',()=>{
 const candidate=projectRealityUpgradeDiscovery({
  originalWorkId:work,
  providerEvidence:{...evidence,status:'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW',later_success:null},
  cognitionState:{
   state:'AWAITING_AUTHORIZATION',
   gap:{state:'GAP_CONFIRMED',work_item_id:work,capability_id:'construction.quantity-parser',
    frozen_historical_failure_refs:['github:test:previous-failure'],
   },
   experiment:{state:'SANDBOX_PROPOSED'},
   original_work_executed:false,job_completed:false,
  },
 });
 assert.equal(candidate.status,'CAPABILITY_GAP_CANDIDATE');
 assert.equal(candidate.needed_upgrade,'construction.quantity-parser');
 assert.equal(candidate.sandbox_executed,false);
 assert.equal(candidate.capability_installed,false);
 assert.equal(candidate.github_write_executed,false);
});
test('later verified pass with a forged missing-gap report fails closed',()=>{
 assert.throws(()=>projectRealityUpgradeDiscovery({
  originalWorkId:work,providerEvidence:evidence,
  cognitionState:{state:'AWAITING_AUTHORIZATION',
   gap:{state:'GAP_CONFIRMED',work_item_id:work,capability_id:'parser.fake'}},
 }),/UPGRADE_DISCOVERY_PROVIDER_AND_COGNITION_CONTRADICT/);
});
test('forged completion, foreign job or unconstrained CI link is rejected',()=>{
 for(const changed of [
  {original_job_completed:true},
  {original_work_id:'work:'+'f'.repeat(32)},
  {external_action_performed:true},
  {execution_authorized:true},
 ]){
  assert.throws(()=>projectRealityUpgradeDiscovery({
   originalWorkId:work,providerEvidence:{...evidence,...changed},
   cognitionState:{state:'NO_CAPABILITY_GAP'},
  }),/UPGRADE_DISCOVERY_ORIGINAL_WORK_EVIDENCE_REQUIRED/);
 }
 assert.throws(()=>projectRealityUpgradeDiscovery({
  originalWorkId:work,
  providerEvidence:{...evidence,later_success:{run_url:'https://github.com/other/repo/actions/runs/1'}},
  cognitionState:{state:'NO_CAPABILITY_GAP'},
 }),/UPGRADE_DISCOVERY_PROVIDER_PASS_REF_NOT_VERIFIED/);
});
const verified=(blocker_class,other={})=>({
 original_work_id:work,evidence_kind:'OBSERVED_FAILURE',
 independently_verified:true,source_ref:'provider:recovery:documented:101',
 blocker_class,...other,
});
test('a missing permission, transient provider error or stale fact never causes self-upgrade',()=>{
 for(const kind of ['AUTHORIZATION_MISSING','TRANSIENT_PROVIDER_FAILURE','STALE_EVIDENCE']){
  const p=triageOperationalBlocker({
   originalWorkId:work,observation:verified(kind),
  });
  assert.equal(p.status,'NO_NEW_UPGRADE_NEEDED');
  assert.equal(p.needed_upgrade,null);
  assert.equal(p.authorization_granted,false);
 }
});
test('confirmed existing defect gets a repair classification, not a duplicate capability',()=>{
 const result=triageOperationalBlocker({
  originalWorkId:work,
  observation:verified('EXISTING_CAPABILITY_DEFECT',{capability_id:'parsers.estimate'}),
 });
 assert.equal(result.kind,'EXISTING_CAPABILITY_DEFECT');
 assert.equal(result.needed_upgrade,'parsers.estimate');
 assert.equal(result.capability_installed,false);
});
test('missing instrument is a candidate only if absent from registry and verification contract is supplied',()=>{
 const obs=verified('MISSING_INSTRUMENT',{
  capability_id:'operations.invoice-parser',
  verification_suite_ref:'suite:work:invoice-fixture',
 });
 const absent=triageOperationalBlocker({originalWorkId:work,observation:obs});
 assert.equal(absent.status,'CAPABILITY_GAP_CANDIDATE');
 assert.equal(absent.needed_upgrade,obs.capability_id);
 assert.equal(absent.github_write_executed,false);
 const present=triageOperationalBlocker({originalWorkId:work,
  observation:obs,capabilityRegistry:[{id:obs.capability_id}],
 });
 assert.equal(present.status,'DIAGNOSIS_REQUIRED');
 assert.equal(present.kind,'REGISTERED_CAPABILITY_CONFLICT');
 assert.throws(()=>triageOperationalBlocker({
  originalWorkId:work,observation:{...obs,verification_suite_ref:null},
 }),/UPGRADE_DISCOVERY_MISSING_INSTRUMENT_CONTRACT_REQUIRED/);
});
test('claimed or cross-job failure cannot trigger upgrade discovery',()=>{
 for(const obs of [
  {...verified('MISSING_INSTRUMENT'),independently_verified:false},
  {...verified('MISSING_INSTRUMENT'),evidence_kind:'LLM_CLAIM'},
  {...verified('MISSING_INSTRUMENT'),original_work_id:'work:'+'f'.repeat(32)},
 ]){
  assert.throws(()=>triageOperationalBlocker({
   originalWorkId:work,observation:obs,
  }),/UPGRADE_DISCOVERY_VERIFIED_BLOCKER_REQUIRED/);
 }
});
test('Work Center displays the classification sourced from actual Recovery Loop and no permission inference',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
 assert.ok(script);assert.doesNotThrow(()=>new Function(script));
 assert.match(html,/Reality Upgrade Discovery/);
 assert.match(script,/info\.upgrade_discovery/);
 assert.match(script,/upgrade\.needed_upgrade/);
 assert.match(script,/upgrade\.next_action/);
 assert.match(script,/upgrade\.status\.replaceAll/);
 assert.match(script,/upgrade\.authorization_granted/);
 assert.match(script,/original_job_completed!==false/);
});
