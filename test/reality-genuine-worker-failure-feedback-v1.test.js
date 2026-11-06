import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyGenuineOriginalWorkerFailure} from '../src/reality-genuine-worker-failure-provider-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261104_genuine_worker_failure_feedback_v1.sql');
const broker=read('supabase/functions/reality-genuine-capability-auto-admit/index.ts');
const sqlAliasFix=read('supabase/migrations/20261104_genuine_worker_failure_scope_alias_fix_v1.sql');
const workflow=read('.github/workflows/reality-genuine-capability-auto-trigger-v1.yml');
const observer=read('scripts/reality-genuine-worker-failure-observe-v1.mjs');
const research=read('scripts/reality-genuine-worker-failure-research-v1.mjs');
const scope={
 status:'ESCALATED_OWNER_ORIGINAL_WORK_VERIFIED',
 original_work_id:'work:bf17f1716f7c9550680d761e64f8b591',
 trigger_id:'c074d3d1-adab-4291-b3ce-88d02d8bfe5a',
 failed_run_id:41766221591,record_allowed:true,
 model_invocation_authorized:false,installation_authorized:false,
 production_changed:false
};
const run={
 id:41766221591,status:'completed',conclusion:'failure',
 head_sha:'c7599a847d533b6e4b9de8954cc4ba108d8cef45',
 head_branch:'feature/reality-general-capability-engine-20261101',
 path:'.github/workflows/reality-genuine-capability-auto-trigger-v1.yml',
 head_repository:{full_name:'maloney2323/Reality'}
};
const jobs={jobs:[{id:126365505176,name:'resume_original_job',
 run_id:41766221591,status:'completed',conclusion:'failure',
 steps:[{name:'Execute original frozen acceptance against installed source',
 conclusion:'failure'}]}]};

test('Reality independently binds failed provider stage to one existing original job, with no new execution authority',()=>{
 const found=verifyGenuineOriginalWorkerFailure({scope,run,jobs});
 assert.equal(found.failed_run_id,41766221591);
 assert.equal(found.failed_job_id,126365505176);
 assert.equal(found.original_work_id,scope.original_work_id);
 assert.match(found.provider_evidence_sha256,/^[a-f0-9]{64}$/);
 assert.equal(found.read_only,true);
 assert.equal(found.independently_verified,true);
 assert.equal(found.model_gap_verified,false);
 assert.equal(found.retry_external_effects_authorized,false);
 assert.equal(found.installation_authorized,false);
 assert.equal(found.original_job_completed,false);
});
test('failed workflow alone is never a verified missing capability or a cause to replay',()=>{
 assert.throws(()=>verifyGenuineOriginalWorkerFailure({
  scope,run:{...run,conclusion:'success'},jobs
 }),/SAME_SIGNED_WORKFLOW_PROVIDER_RUN_REQUIRED/);
 assert.throws(()=>verifyGenuineOriginalWorkerFailure({
  scope,run,jobs:{jobs:[{...jobs.jobs[0],run_id:99}]}
 }),/EXACT_FAILED_ORIGINAL_RESUME_STAGE_REQUIRED/);
 assert.throws(()=>verifyGenuineOriginalWorkerFailure({
  scope:{...scope,model_invocation_authorized:true},run,jobs
 }),/TRUSTED_EXISTING_ORIGINAL_SCOPE_REQUIRED/);
 assert.throws(()=>verifyGenuineOriginalWorkerFailure({
  scope,run:{...run,head_branch:'main'},jobs
 }),/SAME_SIGNED_WORKFLOW_PROVIDER_RUN_REQUIRED/);
});
test('signed broker and service-role SQL cross-check existing owner, current goal, original and provider failed run',()=>{
 for(const part of [
   "w.wake_state='ESCALATED'","q.phase='ISOLATED_INSTALLED_PROBATION'",
   "g.last_transition_event_id=q.goal_transition_event_id",
   "e.payload->>'owner_id'=q.owner_id::text",
   "e.payload->>'owner_authorized_investigation'='true'",
   "e.payload->>'original_job_completed'='false'",
   "a.consumed_at is not null","w.target_environment='ISOLATED_PREVIEW'",
   "reality_read_genuine_worker_failure_scope_v1",
   "reality_record_genuine_worker_failure_v1",
   "unique(original_work_id,failed_run_id,failed_job_id)",
   "GENUINE_FAILURE_IMMUTABLE_PROVIDER_CONFLICT",
   "HISTORICAL_RECONCILIATION_ALREADY_VERIFIED",
   "SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS",
   "current_user<>'service_role'",
   "model_invocation_authorized',false",
   "original_job_completed',false",
   "installation_authorized',false"
 ])assert.ok(sql.includes(part),part);
 for(const p of [
   "input?.action==='observe_worker_failure'",
   "verify(bearer,input.scope.repository_sha,ghProviderToken)",
   "await api('/actions/runs/'+scope.failed_run_id",
   "matching.length!==1",
   "reality_record_genuine_worker_failure_v1",
   "saved.retry_external_effects_authorized!==false",
   "model_invoked:false",
   "execution_replayed:false"
 ])assert.ok(broker.includes(p),p);
 assert.ok(!sql.includes('INSERT INTO public.universe_events'));
 assert.ok(!sql.includes('INSERT INTO reality_internal.genuine_capability_queue_v1'));
});
test('existing genuine capability workflow autonomously runs signed failure feedback after resume, keeping real build gates',()=>{
 assert.ok(workflow.includes('observe_governed_original_worker_failure:'));
 assert.ok(workflow.includes('needs: [resume_original_job]'));
 assert.ok(workflow.includes('always() && github.event_name == \'push\''));
 assert.ok(workflow.includes('node scripts/reality-genuine-worker-failure-observe-v1.mjs'));
 assert.ok(workflow.includes('node scripts/reality-genuine-worker-failure-research-v1.mjs'));
 assert.ok(workflow.includes("needs['detect-real-frozen-capability-deficits'].outputs.build_ready == 'true'"));
 assert.ok(workflow.includes("if: needs.verify_missing_capability.result == 'success'"));
 assert.ok(observer.includes("action:'observe_worker_failure'"));
 assert.ok(observer.includes("model_invoked!==false"));
 assert.ok(research.includes("invokeRealityModel"));
 assert.ok(research.includes("from '../src/reality-model-gateway-v0.1.js'"));
 assert.ok(research.includes("model_findings_are_hypotheses:true"));
 assert.ok(research.includes("frozen_missing_capability_verified:false"));
 assert.ok(research.includes("independent_repair_tests_passed:false"));
 assert.ok(research.includes("new_customer_job_created:false"));
 assert.ok(!research.includes('authorization_granted:true'));
 assert.ok(!research.includes("install_capability"));
});
test('immutable observation cannot be mistaken for an independent final original-job receipt',()=>{
 assert.ok(sql.includes("genuine_worker_failure_observations_v1"));
 assert.ok(sql.includes("grant select,insert on reality_internal.genuine_worker_failure_observations_v1 to service_role"));
 assert.ok(sql.includes("installation_authorized boolean not null default false"));
 assert.ok(sql.includes("original_job_completed boolean not null default false"));
 assert.ok(sql.includes("production_changed boolean not null default false"));
 assert.ok(sql.includes("frozen_missing_capability_verified',false"));
 assert.ok(sql.includes("model_generated',false"));
 assert.ok(sql.includes("retry_external_effects_authorized',false"));
 assert.equal((sql.match(/create or replace function public.reality_/g)||[]).length,2);
 assert.equal((sql.match(/end \$fn\$;/g)||[]).length,2);
});

test('live Postgres failure readback uses an unambiguous record variable without table alias shadowing',()=>{
 assert.ok(sqlAliasFix.includes('declare v_scope record;'));
 assert.ok(sqlAliasFix.includes('into v_scope'));
 assert.ok(sqlAliasFix.includes('from reality_internal.governed_execution_wake_outbox_v1 w'));
 assert.ok(sqlAliasFix.includes("s.owner_id=v_scope.owner_id"));
 assert.ok(sqlAliasFix.includes("w.wake_state='ESCALATED'"));
 assert.ok(!sqlAliasFix.includes('declare w record;'));
 assert.ok(!sqlAliasFix.includes(' into w\\n'));
 assert.ok(sqlAliasFix.includes("current_user<>'service_role'"));
 assert.ok(sqlAliasFix.includes("original_job_completed',false"));
});
