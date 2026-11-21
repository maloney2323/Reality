import test from 'node:test';
import assert from 'node:assert/strict';
import {createContinuitySpine,appendContinuityNode,advanceSpine}
 from '../src/reality-continuity-spine-v2.0.js';
import {projectCanonicalContinuityIntoUniverse}
 from '../src/reality-continuity-universe-projection-v1.js';

const when='2026-11-20T21:10:10.000Z';
const source='signed-maintenance-continuity-enforcement-v1';
const validProvenance={
 source:'independently_read_owner_maintenance_rpc',
 authoritative_source:'service_role_existing_signed_shift',
 original_work_scope:'EXACT_ALREADY_SIGNED_WARRANT',
 classifier_grants_authority:false
};
function chain({workStatus='VERIFIED',tampers=false}={}){
 let spine=createContinuitySpine({
  continuityRootId:'test:signed-maintenance-owner:existing-shift',
  worldlineId:'reality:signed-maintenance:existing-shift',
  subjectId:'owner'
 });
 const first=appendContinuityNode({spine,stage:'RAW_SIGNAL',
  entityId:'existing-shift:authorized',epistemicStatus:'OBSERVED',
  effectiveTime:when,assertionTime:when,
  payload:{contract:source,original_job_completed:false,
   production_changed:false,new_shift_started:false}
 });
 spine=advanceSpine(spine,first);
 function milestone(stage,step,payload,epistemicStatus='VERIFIED'){
  const parent=spine.last_event_id,prior=spine.last_lineage_hash;
  const node=appendContinuityNode({spine,stage,
   entityId:'maintenance:'+step,parentEventId:parent,
   priorLineageHash:prior,effectiveTime:when,assertionTime:when,
   epistemicStatus,provenance:validProvenance,
   evidenceRefs:['sha256:'+'a'.repeat(64)],
   payload:{contract:source,signed_maintenance_step:step,
    original_job_completed:false,production_changed:false,
    new_shift_started:false,...payload}
  });
  spine=advanceSpine(spine,node);
  return {...node,provenance:{...node.provenance,
   continuity_spine:{prior_lineage_hash:prior,transformation_receipt_id:null}}};
 }
 const accepted=milestone('VERIFICATION','INDEPENDENT_POSTINSTALL_ACCEPTED',{
  repair_verified:true,original_customer_job_completed:false,
  verified_fact:'INDEPENDENT_INSTALLED_SOURCE_GITHUB_CI_AND_VERCEL'
 });
 const work=milestone('WORK','NEXT_SIGNED_ORIGINAL_OBLIGATION_RECONCILED',{
  original_customer_job_completed:false,
  work_executed_by_classification:false,
  next_external_action_authorized_by_classification:false,
  verified_fact:'CURRENT_ORIGINAL_REMAINS_UNFINISHED',
  next_required_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'
 },workStatus);
 return {
  spine,events:[first,accepted,
   ...(tampers?[{...work,payload:{...work.payload,original_job_completed:true}}]:[work])]
 };
}
test('real signed repair and unfinished original become distinguishable Universe facts without false settlement',()=>{
 const {spine,events}=chain();
 const result=projectCanonicalContinuityIntoUniverse({
  history:events,rootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id
 });
 assert.equal(result.status,'CANONICAL_CONTINUITY_PROJECTED_TO_UNIVERSE');
 assert.equal(result.verified_history_event_count,3);
 const repair=result.entries[1];
 const original=result.entries[2];
 assert.equal(repair.event_type,'INTERNAL_MAINTENANCE_REPAIR_INDEPENDENTLY_VERIFIED');
 assert.equal(repair.independently_verified_internal_repair,true);
 assert.equal(repair.original_work_remains_unfinished,false);
 assert.equal(original.event_type,'ORIGINAL_WORK_REMAINS_UNFINISHED');
 assert.equal(original.independently_verified_internal_repair,false);
 assert.equal(original.original_work_remains_unfinished,true);
 assert.equal(original.next_required_evidence_action,
  'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI');
 for(const e of result.entries){
  assert.equal(e.verified_external_truth,false);
  assert.equal(e.grants_execution_authority,false);
  assert.equal(e.installation_authorized,false);
 }
 assert.equal(result.permits_external_execution,false);
 assert.equal(result.permits_installation,false);
});
test('unverified original-work event cannot claim canonical verified-work status',()=>{
 const {spine,events}=chain({workStatus:'OBSERVED'});
 const result=projectCanonicalContinuityIntoUniverse({history:events,
  rootId:spine.continuity_root_id,worldlineId:spine.worldline_id});
 assert.equal(result.entries.at(-1).event_type,'UNCLASSIFIED_EVENT_TYPE');
 assert.equal(result.entries.at(-1).original_work_remains_unfinished,false);
 assert.equal(result.entries.at(-1).next_required_evidence_action,null);
});
test('ledger tampering fails before Universe re-entry can infer repaired capability',()=>{
 const {spine,events}=chain({tampers:true});
 assert.throws(()=>projectCanonicalContinuityIntoUniverse({
  history:events,rootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id
 }),/RELIABILITY_HISTORY_CONTENT_HASH_INVALID/);
});
