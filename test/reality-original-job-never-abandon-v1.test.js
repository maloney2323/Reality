import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planOriginalJobRecovery} from '../src/reality-original-job-never-abandon-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schema=read('supabase/migrations/20261104_genuine_original_never_abandon_recovery_v1.sql');
const trigger=read('supabase/migrations/20261104_genuine_failure_observation_recovery_trigger_v1.sql');
const research=read('scripts/reality-genuine-worker-failure-research-v1.mjs');
const observation={
 status:'SIGNED_WORKER_FAILURE_RECORDED',
 original_work_id:'work:bf17f1716f7c9550680d761e64f8b591',
 provider_evidence_sha256:'a'.repeat(64),
 failed_run_id:41766221591,
 failed_job_id:126365505176,
 independent_github_readback:true,
 finding:'HISTORICAL_RECONCILIATION_ALREADY_VERIFIED',
 original_job_completed:false,installation_authorized:false,
 new_customer_job_created:false,retry_external_effects_authorized:false,
 production_changed:false
};
test('historical no-op is not forgotten or falsely settled',()=>{
 const v=planOriginalJobRecovery({observation});
 assert.equal(v.recovery_status,'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK');
 assert.equal(v.next_evidence_action,'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION');
 assert.equal(v.current_job_terminal,false);
 assert.equal(v.same_original_job_preserved,true);
 assert.equal(v.original_job_completed,false);
 assert.equal(v.original_execution_replay_authorized,false);
 assert.equal(v.installation_authorized,false);
 assert.equal(v.fresh_customer_job_created,false);
});
test('unresolved failure keeps same original and requires side-effect readback before repair',()=>{
 const v=planOriginalJobRecovery({
   observation:{...observation,finding:'SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS'}
 });
 assert.equal(v.recovery_status,'INDEPENDENT_DIAGNOSIS_REQUIRED');
 assert.equal(v.next_evidence_action,'VERIFY_EXTERNAL_EFFECTS_AND_CLASSIFY_FAILURE');
 assert.equal(v.external_effect_reconciliation_required,true);
 assert.equal(v.after_approved_installation,'RESUME_SAME_ORIGINAL_AND_INDEPENDENTLY_SETTLE');
 assert.equal(v.build_missing_capability_only_after_frozen_proof,true);
 assert.equal(v.owner_approval_required_for_new_installation,true);
});
test('untrusted assistant claims, wrong work and unverified readback cannot obtain continuation',()=>{
 for(const patch of [
  {independent_github_readback:false},{status:'AI_SAYS_FAILED'},
  {original_job_completed:true},{installation_authorized:true},
  {retry_external_effects_authorized:true},{production_changed:true},
  {new_customer_job_created:true},{original_work_id:'work:invalid'},
  {provider_evidence_sha256:'sha256:fake'},
  {finding:'MODEL_GENERATED_MISSING_CAPABILITY'}
 ])assert.throws(()=>planOriginalJobRecovery({observation:{...observation,...patch}}),
    /ORIGINAL_RECOVERY_POLICY_/);
 assert.throws(()=>planOriginalJobRecovery({
   observation,continuation:{
     original_work_id:'work:'+'b'.repeat(32),original_job_completed:false,
     production_changed:false,recovery_status:'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK'
   }
 }),/DURABLE_ORIGINAL_RECOVERY_SCOPE_CHANGED/);
});
test('durable obligation is service-role-only, same original, and has no new execution authority',()=>{
 for(const c of [
   'genuine_original_recovery_commitments_v1',
   'original_work_id text not null unique',
   'latest_observation_id uuid not null',
   'original_job_settled boolean not null default false',
   'reality_commit_genuine_original_recovery_v1',
   "current_user<>'service_role'",
   "g.last_transition_event_id=q.goal_transition_event_id",
   "q.phase='ISOLATED_INSTALLED_PROBATION'",
   "ev.epistemic_status='VERIFIED'",
   "ev.payload->>'owner_authorized_investigation'='true'",
   "fr.owner_id=q.owner_id and fr.original_work_id=q.original_work_id",
   'FOR UPDATE',
   'GENUINE_RECOVERY_IMMUTABLE_ORIGINAL_SCOPE_CONFLICT',
   "original_job_completed',false",
   "retry_external_effects_authorized',false",
   "model_generation_authorized',false",
   "installation_authorized',false",
   "owner_approval_for_new_install_still_required',true"
 ])assert.ok(schema.toLowerCase().includes(c.toLowerCase()),c);
 assert.ok(!schema.includes('INSERT INTO public.universe_events'));
 assert.ok(!schema.includes('INSERT INTO reality_internal.genuine_capability_queue_v1'));
 assert.ok(!schema.includes('UPDATE reality_internal.genuine_original_continuations_v1'));
});
test('existing signed failure observation automatically persists recovery obligation',()=>{
 assert.match(trigger,/after insert on reality_internal\.genuine_worker_failure_observations_v1/);
 assert.match(trigger,/for each row execute function/);
 assert.match(trigger,/public\.reality_commit_genuine_original_recovery_v1\(NEW\.observation_id\)/);
 assert.match(trigger,/GENUINE_RECOVERY_OBLIGATION_COMMITMENT_UNVERIFIED/);
 assert.match(trigger,/current_user<>'service_role'/);
 assert.match(research,/planOriginalJobRecovery/);
 assert.match(research,/modelHandoff\.recovery_plan=planOriginalJobRecovery/);
 assert.match(research,/if\(evidence\.status==='SIGNED_WORKER_FAILURE_RECORDED'/);
 assert.doesNotMatch(research,/install_capability|original_execution_replay_authorized:true/);
});
