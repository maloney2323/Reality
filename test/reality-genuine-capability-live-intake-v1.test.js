import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenuineCapabilityLiveIntake}
 from '../src/reality-genuine-capability-live-intake-v1.js';
import {readFileSync} from 'node:fs';

const work='work:'+'a'.repeat(32),owner='11111111-1111-4111-8111-111111111111';
const conversation='22222222-2222-4222-8222-222222222222';
const transition='33333333-3333-4333-8333-333333333333';
const originalEvent='44444444-4444-4444-8444-444444444444';
const gapEvent='55555555-5555-4555-8555-555555555555';
const trigger='66666666-6666-4666-8666-666666666666';
const failure={
 original_work_id:work,independent:true,independently_verified:true,verified:false,
 evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
 capability_id:'inventory_reconciler',
 source_ref:'reality:provider-verified:inventory:external-observation-0001',
 verification_suite_ref:'inventory:frozen:reconciliation-v3',
 external_action_performed:false,provider_effect_may_have_occurred:false,
 no_automatic_retry:false,
};
const request={
 original_work_id:work,independent_failure:failure,
 original_execution_receipt:'execution:verified-internal-original',
 authorization_continues_unchanged:true,
 production_write_permitted:false,customer_job_completed:false,
};
const goal={
 original_work_id:work,goal_active:true,owner_confirmed:true,
 original_job_settled:false,owner_id:owner,conversation_id:conversation,
 goal_id:'goal:confirmed',goal_transition_event_id:transition,
 original_work_event_id:originalEvent,
 continuity_root_id:'private:worldline-1',worldline_id:'private:worldline-1',
};
function harness({source=failure,goalOverride={},queuedPhase='PENDING_FROZEN_REPRODUCTION',
 wake=true,durable=true,duplicateTrigger=null}={}){
 const called=[];
 const intake=createGenuineCapabilityLiveIntake({
  readOriginalOwnerGoal:async()=>{called.push('goal');return {...goal,...goalOverride}},
  readOriginalProviderFailure:async()=>{called.push('provider');return source;},
  persistGapAndReadback:async receipt=>{
   called.push('persist');assert.equal(receipt.owner_id,owner);
   assert.equal(receipt.value_passport.original_work_id,work);
   assert.equal(receipt.value_passport.original_work_event_id,originalEvent);
   assert.equal(receipt.value_passport.technical_gap_source_ref,failure.source_ref);
   assert.equal(receipt.value_passport.estimated_annual_net_value_usd,null);
   assert.equal(receipt.value_passport.reuse_authorized,false);
   assert.equal(receipt.installation_authorized,false);
   assert.equal(receipt.original_job_completed,false);
   return {independently_verified:durable,event_id:gapEvent,
    original_work_id:work,provider_failure_hash:receipt.provider_failure_hash,
    owner_id:owner,goal_transition_event_id:transition,
    installation_authorized:false,original_job_completed:false};
  },
  enqueueExactGap:async request=>{
   called.push('queue');assert.equal(request.gap_event_id,gapEvent);
   return {trigger_id:duplicateTrigger||trigger,source_event_id:gapEvent,
    original_work_id:work,phase:queuedPhase,
    installation_authorized:false,original_job_completed:false,
    new_customer_job_created:false};
  },
  signalUnattendedWorker:async x=>{
   called.push('wake');
   if(!wake)throw Error('PROVIDER_UNAVAILABLE');
   return {dispatched:true,trigger_id:x.trigger_id,
    original_work_id:work,installation_authorized:false};
  },
 });
 return {intake,called};
}
test('original live executor failure is observed, persisted, enqueued and wakes worker without install',async()=>{
 const h=harness(),result=await h.intake(request);
 assert.equal(result.status,'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED');
 assert.equal(result.wake_status,'WORKER_WAKE_DISPATCHED');
 assert.equal(result.trigger_id,trigger);
 assert.equal(result.value_passport_source_event_id,gapEvent);
 assert.equal(result.value_passport_status,'BUSINESS_VALUE_ASSESSMENT_PENDING');
 assert.deepEqual(h.called,['goal','provider','persist','queue','wake']);
 assert.equal(result.new_job_created,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.original_job_completed,false);
});
test('provider wake failure does not discard durable queue or fabricate worker dispatch',async()=>{
 const h=harness({wake:false}),result=await h.intake(request);
 assert.equal(result.status,'GENUINE_CAPABILITY_GAP_DURABLY_QUEUED');
 assert.equal(result.wake_status,'WORKER_WAKE_NEEDS_RECONCILIATION');
 assert.equal(h.called.includes('queue'),true);
});
test('transient, permission, provider-effect-uncertain or unverified errors never enqueue',async()=>{
 for(const delta of [
  {blocker_class:'TRANSIENT_NETWORK'}, {blocker_class:'AUTHORITY_MISSING'},
  {independent:false}, {verified:true}, {independently_verified:false},
  {provider_effect_may_have_occurred:true}, {external_action_performed:true},
  {no_automatic_retry:true}, {source_ref:'https://example.org'},
  {original_work_id:'work:'+'b'.repeat(32)}
 ]){
  const h=harness();await assert.rejects(h.intake({
   ...request,independent_failure:{...failure,...delta}}),
   /GENUINE_CAPABILITY_INTAKE_EXECUTION_RECEIPT_OR_GAP_NOT_TRUSTED/);
  assert.deepEqual(h.called,[]);
 }
});
test('changed source, missing owner goal or failed independent event readback fail before queue',async()=>{
 const changed=harness({source:{...failure,source_ref:'reality:provider-verified:inventory:different-observation'}});
 await assert.rejects(changed.intake(request),/PROVIDER_FAILURE_CHANGED/);
 assert.deepEqual(changed.called,['goal','provider']);
 const ownerChanged=harness({goalOverride:{goal_active:false}});
 await assert.rejects(ownerChanged.intake(request),/ACTIVE_OWNER_GOAL/);
 assert.deepEqual(ownerChanged.called,['goal']);
 const storageFailed=harness({durable:false});
 await assert.rejects(storageFailed.intake(request),/DURABLE_PROVIDER_GAP_EVENT_READBACK/);
 assert.deepEqual(storageFailed.called,['goal','provider','persist']);
});
test('database migration is service-only, idempotent, owner scoped and cannot authorize installation',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261101_genuine_capability_queue_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/create table if not exists reality_internal\.genuine_capability_queue_v1/);
 assert.match(sql,/unique\(owner_id, original_work_id, gap_event_id\)/);
 assert.match(sql,/on conflict\(gap_event_id\) do nothing/);
 assert.match(sql,/goal_publication_epochs/);
 assert.match(sql,/e\.last_transition_event_id is distinct from transition_uuid/);
 assert.match(sql,/revoke all on reality_internal\.genuine_capability_queue_v1 from public,anon,authenticated/);
 assert.match(sql,/if current_user<>'service_role' then/);
 assert.match(sql,/GENUINE_CAPABILITY_ORIGINAL_UNFINISHED_WORK_REQUIRED/);
 assert.match(sql,/GENUINE_CAPABILITY_ALREADY_CLAIMED_NO_REPLAY/);
 assert.doesNotMatch(sql,/grant execute on function public\.reality_enqueue_genuine_capability_gap_v1\(uuid\)\s+to authenticated/i);
 assert.doesNotMatch(sql,/phase='INSTALLED'/);
});
