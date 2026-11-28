import test from 'node:test';
import assert from 'node:assert/strict';
import {observeExternalInfrastructureBlocker} from '../src/reality-final-loop-external-infrastructure-observer-v1.js';
const base={
 provider:'supabase',project_ref:'txqgqqievsttobujcsli',
 parent_project_ref:'hvkfreoagbrphwghjajw',
 branch_name:'final-loop-444-isolated-acceptance',
 branch_status:'MIGRATIONS_FAILED',preview_project_status:'ACTIVE_HEALTHY',
 observed_at:'2026-11-24T04:28:07.322Z',
 source_receipt_sha256:'sha256:'+'a'.repeat(64)
};
test('recognizes failed isolated branch without granting mutation authority',()=>{
 const x=observeExternalInfrastructureBlocker(base);
 assert.equal(x.status,'EXTERNAL_INFRA_RECOVERY_OBSERVATION_CANDIDATE');
 assert.equal(x.next_actor,'REALITY');
 assert.equal(x.recovery_scope,'ISOLATED_BRANCH_ONLY');
 assert.equal(x.signed_warrant_required_for_mutation,true);
 assert.equal(x.event_dispatched,false);
 assert.equal(x.observation_committed,false);
 assert.equal(x.repair_executed,false);
 assert.equal(x.continuation_verified,false);
 assert.equal(x.production_changed,false);
 assert.equal(Object.isFrozen(x),true);
});
test('requires independently attributable provider receipt',()=>{
 assert.equal(observeExternalInfrastructureBlocker({...base,source_receipt_sha256:null}).status,
  'EXTERNAL_INFRA_SOURCE_PROOF_REQUIRED');
});
test('refuses same project as parent',()=>{
 assert.equal(observeExternalInfrastructureBlocker({...base,project_ref:base.parent_project_ref}).status,
  'EXTERNAL_INFRA_SOURCE_PROOF_REQUIRED');
});
test('does not invent failures for healthy branches',()=>{
 assert.equal(observeExternalInfrastructureBlocker({...base,branch_status:'FUNCTIONS_DEPLOYED'}).status,
  'EXTERNAL_INFRA_NO_SUPPORTED_FAILURE');
});
