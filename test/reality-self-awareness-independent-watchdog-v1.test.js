import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildModelInput} from '../src/reality-model-gateway-v0.1.js';
import {buildRealityCapabilityOperatingContext} from '../src/reality-capability-operating-context-v1.js';
import {diagnoseIndependentWorkerWake} from '../src/reality-independent-worker-watchdog-v1.js';

const now=Date.parse('2026-11-04T23:35:00Z');
const watch={source:'POSTGRES_CRON_AND_SIGNED_EDGE_HTTP_READBACK',
 status:'WATCHDOG_RECENTLY_SUCCEEDED',last_run_at:'2026-11-04T23:34:00Z',
 broker_checked_at:'2026-11-04T23:30:00Z',delivery_ready_proven:true,
 broker_delivery_status:'BROKER_READY_IDLE'};
const wake={
 original_work_id:'work:'+'a'.repeat(32),wake_state:'ESCALATED',
 dispatch_attempts:1,dispatched_at:'2026-11-04T03:17:49Z',
 worker_alive_at:'2026-11-04T03:18:00Z',
 last_updated_at:'2026-11-04T04:49:00Z',preview_only:true};
const signal={
 cleaner_version:'0.1.0',packet:{packet_id:'rsp:self',raw_content_digest:'sha256:test'},
 fragments:[{fragment_id:'sig:self',cleaned_text:'Why did the worker fail to wake?'}],
 transformation_receipt:{receipt_id:'tr:self'},
 lineage:{packet_id:'rsp:self'}
};
test('Reality model receives trusted self-capability operating playbook',()=>{
 const play=buildRealityCapabilityOperatingContext();
 assert.equal(play.execution_authorized,false);
 assert.equal(play.installation_authorized,false);
 assert.equal(play.new_capability_verified,false);
 assert.equal(play.hard_boundaries.model_cannot_mint_authority,true);
 assert.ok(play.process.includes('RESEARCH_PROVIDER_EVIDENCE_AND_EXISTING_CAPABILITIES'));
 assert.ok(play.process.includes('USE_OPENAI_TO_PROPOSE_BOUNDED_IMPLEMENTATION_AND_TESTS'));
 assert.ok(play.process.includes('CONTINUE_OTHER_AUTHORIZED_WORK_WHILE_ONE_TASK_IS_BLOCKED'));
 assert.ok(play.known_components.some(x=>
  x.id==='fully_autonomous_every_failure_repair'&&x.status==='NOT_INDEPENDENTLY_PROVEN'));
 const input=buildModelInput({governedSignal:signal,
  systemContext:{reality_capability_operating_context:{model_cannot_install:false},
   business_goal:'Investigate actual worker failure'}});
 assert.equal(input.system_context.business_goal,'Investigate actual worker failure');
 assert.equal(input.system_context.reality_capability_operating_context.hard_boundaries.model_cannot_install,true);
 assert.equal(input.authority.execution_authorized,false);
});
test('healthy independent observer is not a settled customer job',()=>{
 const r=diagnoseIndependentWorkerWake({watchdog:watch,wakes:[],now});
 assert.equal(r.status,'INDEPENDENT_TRANSPORT_OBSERVED');
 assert.equal(r.execution_authorized,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.retry_external_effects_automatically,false);
 assert.equal(r.research_is_not_solution_verified,true);
});
test('prior signed worker ACK changes root cause from never-woke to post-wake failure',()=>{
 const r=diagnoseIndependentWorkerWake({watchdog:watch,wakes:[wake],now});
 assert.equal(r.status,'WORKER_WOKE_THEN_ESCALATED');
 assert.equal(r.original_work_id,wake.original_work_id);
 assert.match(r.reason,/signed run and failed stage/);
 assert.equal(r.execution_authorized,false);
});
test('independent observer detects a never-acknowledged wake',()=>{
 const w={...wake,wake_state:'DISPATCH_ACCEPTED',worker_alive_at:null,
  dispatched_at:'2026-11-04T23:20:00Z',last_updated_at:'2026-11-04T23:20:00Z'};
 const r=diagnoseIndependentWorkerWake({watchdog:watch,wakes:[w],now});
 assert.equal(r.status,'WORKER_DID_NOT_WAKE');
 assert.match(r.reason,/signed delivery/);
});
test('observer failure cannot be mislabeled a healthy worker',()=>{
 const r=diagnoseIndependentWorkerWake({watchdog:{
  ...watch,status:'WATCHDOG_STALE_OR_UNVERIFIED'},wakes:[],now});
 assert.equal(r.status,'INDEPENDENT_OBSERVER_STALE');
 assert.equal(r.trusted_broker_recheck_required,true);
});
test('misconfigured delivery blocks retry and never authorizes installation',()=>{
 const r=diagnoseIndependentWorkerWake({watchdog:{
  ...watch,broker_delivery_status:'DISPATCH_CREDENTIAL_MISSING',
  delivery_ready_proven:false},wakes:[wake],now});
 assert.equal(r.status,'BROKER_TRANSPORT_BLOCKED');
 assert.equal(r.installation_authorized,false);
});
test('untrusted unsigned watchdog/tenant data fail closed',()=>{
 assert.throws(()=>diagnoseIndependentWorkerWake({watchdog:{
  ...watch,source:'MODEL_ASSERTION'},wakes:[],now}),/INDEPENDENT_ATTESTATION_REQUIRED/);
 assert.throws(()=>diagnoseIndependentWorkerWake({watchdog:watch,
  wakes:[{...wake,preview_only:false}],now}),/INDEPENDENT_ATTESTATION_REQUIRED/);
 assert.throws(()=>diagnoseIndependentWorkerWake({watchdog:watch,
  wakes:[{...wake,original_work_id:'forged'}],now}),/INDEPENDENT_ATTESTATION_REQUIRED/);
});
test('read-only authenticated owner route surfaces diagnosis, not an installer',()=>{
 const route=readFileSync(new URL('../api/reality/personal-governed-wake-status.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/reality-model-gateway-v0.1.js',import.meta.url),'utf8');
 assert.match(route,/authenticatedChatSession/);
 assert.match(route,/reality_read_owner_governed_wakes_v1/);
 assert.match(route,/diagnoseIndependentWorkerWake/);
 assert.match(route,/independent_worker_diagnosis:diagnosis/);
 assert.match(model,/buildRealityCapabilityOperatingContext/);
 assert.match(model,/SELF-CAPABILITY RESEARCH CONTRACT/);
 assert.doesNotMatch(route,/method:'PUT'|method:'PATCH'|method:'DELETE'/);
});
