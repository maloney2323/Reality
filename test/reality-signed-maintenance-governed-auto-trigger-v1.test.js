import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeSignedMaintenanceContinuityTrigger}
 from '../src/reality-governed-auto-trigger-v1.0.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const originalWork='work:315562fe1bd66b30a48bb9be4f1d162a';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const event='4abf203a-8959-5674-9ae3-a9092dfd2c62';
const gate={
 owner_id:owner,shift_id:shift,read_only:true,
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 warrant_mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 installation_authorized:false,original_job_completed:false,
 production_changed:false,
 original_work_id:originalWork,
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
};
const base={
 continuity_committed:true,continuity_root_id:root,
 latest_event_id:event,
 install_eligible_from_continuity:false,
 installer_reconcile_only_from_continuity:false,
 original_job_completed:false,new_shift_started:false,
 production_changed:false
};
const route=(continuity,originalGate=gate,scope={ownerId:owner,shiftId:shift})=>
 routeSignedMaintenanceContinuityTrigger({
  continuity,originalGate,...scope
 });
test('verified target receipt triggers an owner decision, NEVER an installation or a new shift',()=>{
 const trigger=route({...base,
  status:'CONTINUITY_VERIFIED_TARGET_AWAITING_OWNER_CLICK',
  next_authorized_action:'AWAIT_EXACT_OWNER_APPROVAL'});
 assert.equal(trigger.status,'SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY');
 assert.equal(trigger.owner_action_required,true);
 assert.equal(trigger.installer_dispatch_permitted,false);
 assert.equal(trigger.installer_reconcile_only,false);
 assert.equal(trigger.execution_authorized_by_trigger,false);
 assert.equal(trigger.shift_id,shift);
 assert.equal(trigger.continuity_event_id,event);
 assert.equal(trigger.next_action,'AWAIT_EXACT_OWNER_APPROVAL');
});
test('only independent hash-verified owner authority sends exact approved source to EXISTING installer',()=>{
 const trigger=route({...base,
  status:'CONTINUITY_VERIFIED_APPROVAL_RECEIPTED_INSTALL_ELIGIBLE',
  next_authorized_action:'CONTINUE_PREVIOUSLY_APPROVED_EXACT_INSTALL',
  install_eligible_from_continuity:true
 });
 assert.equal(trigger.status,'SIGNED_MAINTENANCE_GOVERNED_TRIGGER_READY');
 assert.equal(trigger.installer_dispatch_permitted,true);
 assert.equal(trigger.installer_reconcile_only,false);
 assert.equal(trigger.owner_action_required,false);
 assert.equal(trigger.execution_authorized_by_trigger,false);
});
test('fenced prior attempt can ONLY reconcile existing installer state, never a new write',()=>{
 const trigger=route({...base,
  status:'CONTINUITY_VERIFIED_APPROVAL_FENCED_OR_INSTALLED',
  next_authorized_action:'GET_ONLY_RECONCILE_PREVIOUSLY_FENCED_INSTALL',
  installer_reconcile_only_from_continuity:true
 });
 assert.equal(trigger.installer_reconcile_only,true);
 assert.equal(trigger.installer_dispatch_permitted,false);
});
test('independent postinstall controls original-work resumption but does not declare it settled',()=>{
 const pending=route({...base,
  status:'CONTINUITY_INSTALLED_PENDING_INDEPENDENT_POSTINSTALL',
  next_authorized_action:'VERIFY_INSTALLED_SOURCE_WITH_SEPARATE_PROVIDER'
 });
 assert.equal(pending.independent_postinstall_due,true);
 assert.equal(pending.same_original_work_due,false);
 const resumed=route({...base,
  status:'CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_SAME_SHIFT_RECONCILED',
  next_authorized_action:gate.next_action,original_work_id:originalWork
 });
 assert.equal(resumed.same_original_work_due,true);
 assert.equal(resumed.original_work_id,originalWork);
 assert.equal(resumed.next_action,gate.next_action);
 assert.equal(resumed.original_job_completed,false);
 assert.equal(resumed.installer_dispatch_permitted,false);
 assert.equal(resumed.execution_authorized_by_trigger,false);
});
test('missing, forged, drifted, contradictory and cross-owner receipts never trigger execution',()=>{
 const approved={...base,
  status:'CONTINUITY_VERIFIED_APPROVAL_RECEIPTED_INSTALL_ELIGIBLE',
  next_authorized_action:'CONTINUE_PREVIOUSLY_APPROVED_EXACT_INSTALL',
  install_eligible_from_continuity:true
 };
 const variants=[
  {...approved,continuity_committed:false},
  {...approved,continuity_root_id:'not-verified'},
  {...approved,latest_event_id:null},
  {...approved,new_shift_started:true},
  {...approved,production_changed:true},
  {...approved,original_job_completed:true},
  {...approved,next_authorized_action:'WRONG_ACTION'},
  {...approved,status:'CONTINUITY_VERIFIED_TARGET_AWAITING_OWNER_CLICK'},
  {...approved,status:'CONTINUITY_VERIFIED_APPROVAL_FENCED_OR_INSTALLED'},
  {...approved,status:'CONTINUITY_INSTALLED_PENDING_INDEPENDENT_POSTINSTALL'},
  {...approved,status:'CONTINUITY_UNKNOWN'}
 ];
 for(const v of variants){
  const x=route(v);
  assert.equal(x.status,'SIGNED_MAINTENANCE_TRIGGER_BLOCKED');
  assert.equal(x.installer_dispatch_permitted,false);
 }
 for(const g of [{...gate,owner_id:'11111111-2222-4333-8444-555555555555'},
  {...gate,installation_authorized:true},
  {...gate,warrant_mode:'UNSIGNED'},
  {...gate,read_only:false}]){
  const x=route(approved,g);
  assert.equal(x.installer_dispatch_permitted,false);
 }
 assert.equal(route(approved,gate,{ownerId:owner,shiftId:'11111111-2222-4333-8444-555555555555'}).installer_dispatch_permitted,false);
 assert.equal(route({...base,status:'CONTINUITY_INDEPENDENT_REPAIR_VERIFIED_SAME_SHIFT_RECONCILED',next_authorized_action:gate.next_action,original_work_id:'work:'+'f'.repeat(32)}).same_original_work_due,false);
});
test('the actual signed worker invokes existing governor BEFORE installer, and uses Universe return for next shift work',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const admission=s.indexOf("SIGNED_VERIFIED_MAINTENANCE_CONTINUITY_RECEIPT_ADMISSION");
 const trigger=s.indexOf("SIGNED_MAINTENANCE_GOVERNED_TRIGGER_ROUTING");
 const installer=s.indexOf("EXACT_OWNER_APPROVED_MAINTENANCE_AUTOMATIC_INSTALL");
 const verification=s.indexOf("EXACT_SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_VERIFICATION");
 const universe=s.indexOf("SIGNED_MAINTENANCE_POSTINSTALL_UNIVERSE_RECONCILIATION");
 const after=s.indexOf("const signedMaintenanceReturnTrigger=");
 assert.ok(admission>=0&&trigger>admission&&installer>trigger&&
  verification>installer&&universe>verification&&after>universe);
 assert.match(s,/signedMaintenanceGovernedTrigger\.installer_dispatch_permitted===true/);
 assert.match(s,/signedMaintenanceGovernedTrigger\.installer_reconcile_only===true/);
 assert.match(s,/signed_maintenance_governed_trigger:signedMaintenanceGovernedTrigger/);
 assert.match(s,/signed_maintenance_universe_return_trigger:signedMaintenanceReturnTrigger/);
});
