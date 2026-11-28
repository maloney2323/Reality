// Execute the actual installed projection expression in disposable PostgreSQL.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const sql=readFileSync('sql/reality-final-loop-execution-spine-readback-v1.sql','utf8');
const start=sql.indexOf("'execution_spine_readback',pg_catalog.jsonb_build_object(");
assert.ok(start>=0);
const tail=sql.slice(start);
const end=tail.indexOf("'same_head_evidence_checkpoint_observed'");
assert.ok(end>0);
const expr=tail.slice(tail.indexOf('pg_catalog.jsonb_build_object('),end).trim().replace(/,$/,'');
const result=spawnSync('psql',['-X','-v','ON_ERROR_STOP=1','-At'],{encoding:'utf8',input:`
 WITH fixture(v_fenced_count,v_observation_count,v_return_event) AS (
 VALUES (0,0,NULL::uuid),(4,3,'00000000-0000-4000-8000-000000000001'::uuid),
 (4,4,NULL::uuid),(4,4,'00000000-0000-4000-8000-000000000002'::uuid)
 ), prepared AS (
 SELECT *, '[]'::jsonb v_observations, 'sha256:'||repeat('a',64) v_invocation_observation_hash,
 CASE WHEN v_return_event IS NOT NULL THEN 'sha256:'||repeat('b',64) END v_return_head
 FROM fixture)
 SELECT ${expr} FROM prepared ORDER BY v_fenced_count,v_observation_count,v_return_event NULLS FIRST;
`});
assert.equal(result.status,0,result.stderr);
const rows=result.stdout.trim().split('\n').map(JSON.parse);
assert.equal(rows.length,4);
assert.deepEqual(rows.map(x=>[x.status,x.canonical_return_committed,!!x.canonical_return_event_id,!!x.historical_subset_return_event_id]),[
 ['NO_FENCED_CHILD_INVOCATION_OBSERVED',false,false,false],
 ['SIGNED_INVOCATION_EVIDENCE_RECONCILIATION_REQUIRED',false,false,true],
 ['SIGNED_INVOCATION_OBSERVATIONS_READY_FOR_CANONICAL_RETURN',false,false,false],
 ['SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',true,true,false]
]);
for(const x of rows){assert.equal(x.execution_authorized,false);assert.equal(x.provider_outcome_verified,false);assert.equal(x.original_job_completed,false);assert.equal(x.replay_authorized,false);}
console.log('CURRENT_INVOCATION_AND_HISTORICAL_SUBSET_RETURN_PROJECTION_VERIFIED');

 // Run the actual evidence SELECT against disposable tables. These fixture
 // rows test the join, not a copied implementation of the failure policy.
 const begin=sql.indexOf("SELECT count(*),coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n     'child_work_id'");
 const finish=sql.indexOf(";\n\n   -- The writer's response",begin);
 assert.ok(begin>=0&&finish>begin);
 const owner='00000000-0000-4000-8000-000000000001',shift='00000000-0000-4000-8000-000000000002';
 const parent='work:'+'a'.repeat(32),src='https://github.com/fixture/review/pull/1';
 const query=sql.slice(begin,finish).replace('INTO v_observation_count,v_observations','')
 .replace(/reality_internal\./g,'pg_temp.')
 .replace(/\bv_owner\b/g,"'"+owner+"'::uuid")
 .replace(/\bp_shift_id\b/g,"'"+shift+"'::uuid")
 .replace(/\bv_work\b/g,"'"+parent+"'")
 .replace(/\bv_source\b/g,"'"+src+"'");
 const pg=spawnSync('psql',['-X','-q','-v','ON_ERROR_STOP=1','-At'],{encoding:'utf8',input:`
 BEGIN;
 CREATE TEMP TABLE final_loop_child_review_work_v1(child_work_id text, scope_sha256 text, canonical_prepare_invocation_id uuid,
 claimant_worker_run_id uuid, model_response_id text, scope_index int, owner_id uuid, shift_id uuid, parent_original_work_id text,
 plan_id uuid, packet_id uuid, source_head_sha text, source_manifest_sha256 text, acceptance_contract_sha256 text,
 phase text, review_sha256 text, independent_review_receipt_sha256 text, claimed_at timestamptz);
 CREATE TEMP TABLE final_loop_pr_source_plans_v1(plan_id uuid, owner_id uuid, shift_id uuid,parent_original_work_id text,
 source_ref text,source_head_sha text,source_manifest_sha256 text);
 CREATE TEMP TABLE final_loop_child_approval_packets_v1(packet_id uuid,owner_id uuid,shift_id uuid,plan_id uuid,parent_original_work_id text,
 acceptance_contract_sha256 text,authority_effect text,owner_approval_receipt_sha256 text);
 CREATE TEMP TABLE signed_worker_actual_runs_v1(run_id uuid,status text,started_at timestamptz,finished_at timestamptz,worker_stage text);
 CREATE TEMP TABLE final_loop_resume_events_v1(event_id uuid,governed_wake_worker_run_id uuid,shift_id uuid,owner_id uuid,
 original_work_id text,source_ref text,governed_wake_queued_at timestamptz,continuity_head_sha256 text,continuity_revision bigint,
 release_continuation_claim_id uuid,signal_kind text,signal_next_action text,governed_wake_nonce uuid,governed_wake_request_id bigint,governed_wake_requested_at timestamptz);
 CREATE TEMP TABLE governed_signed_worker_release_wakes_v1(worker_run_id uuid,owner_id uuid,shift_id uuid,operating_lane text,
 release_receipt_sha256 text,release_claim_id uuid,running_release_sha text,running_release_ref text);
 CREATE TEMP TABLE governed_worker_release_approvals_v1(claim_id uuid,owner_id uuid,shift_id uuid,release_sha text,
 approval_receipt_sha256 text,state text,capability_key text,provider_alias_observed_at timestamptz,claimed_at timestamptz,
 provider_alias_observed_deployment_id text,runtime_scope jsonb,release_ref text);
 INSERT INTO final_loop_pr_source_plans_v1 VALUES('00000000-0000-4000-8000-000000000003','${owner}','${shift}','${parent}','${src}',repeat('a',40),'sha256:'||repeat('a',64));
 INSERT INTO final_loop_child_approval_packets_v1 VALUES('00000000-0000-4000-8000-000000000004','${owner}','${shift}','00000000-0000-4000-8000-000000000003','${parent}','sha256:'||repeat('b',64),'READ_ONLY_INTERNAL_PR_REVIEW','sha256:'||repeat('c',64));
 INSERT INTO signed_worker_actual_runs_v1 VALUES('00000000-0000-4000-8000-000000000005','FAILED','2026-01-01 00:00:02+00','2026-01-01 00:00:05+00','EXACT_CLAIMED_REVIEW_CONTINUITY_RETURN_FENCE');
 INSERT INTO final_loop_child_review_work_v1 VALUES('work:'||repeat('b',32),'sha256:'||repeat('d',64),'00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005',NULL,0,'${owner}','${shift}','${parent}','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004',repeat('a',40),'sha256:'||repeat('a',64),'sha256:'||repeat('b',64),'CLAIMED',NULL,NULL,'2026-01-01 00:00:03+00');
 INSERT INTO final_loop_resume_events_v1 VALUES('00000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000005','${shift}','${owner}','${parent}','${src}','2026-01-01 00:00:01+00','sha256:'||repeat('e',64),6,'00000000-0000-4000-8000-000000000008','QUALIFIER_PROOF_CHANGED','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','00000000-0000-4000-8000-000000000009',7,'2026-01-01 00:00:00+00');
 INSERT INTO governed_signed_worker_release_wakes_v1 VALUES('00000000-0000-4000-8000-000000000005','${owner}','${shift}','NORMAL_SIGNED_SHIFT','sha256:'||repeat('f',64),'00000000-0000-4000-8000-000000000008',repeat('1',40),'fixture');
 INSERT INTO governed_worker_release_approvals_v1 VALUES('00000000-0000-4000-8000-000000000008','${owner}','${shift}',repeat('1',40),'sha256:'||repeat('2',64),'CLAIMED_ONCE','VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM','2026-01-01 00:00:00+00','2025-12-31 23:59:59+00','dpl_fixture',jsonb_build_object('target_deployment_id','dpl_fixture','original_work_id','${parent}','source_ref','${src}','exact_runtime_database_contract_verified',true,'independent_gateway_ci_verified',true,'independent_qualification_branch_verified',true,'child_execution_enabled',false,'parent_delivery_enabled',false,'production_changed',false),'fixture');
 ${query};
 UPDATE final_loop_resume_events_v1 SET governed_wake_nonce=NULL;
 ${query};
 UPDATE final_loop_resume_events_v1 SET governed_wake_nonce='00000000-0000-4000-8000-000000000009';
 UPDATE signed_worker_actual_runs_v1 SET worker_stage='FOREIGN_STAGE';
 ${query};
 UPDATE signed_worker_actual_runs_v1 SET worker_stage='EXACT_CLAIMED_REVIEW_CONTINUITY_RETURN_FENCE';
 UPDATE final_loop_child_review_work_v1 SET model_response_id='resp_unverified';
 ${query};
 UPDATE final_loop_child_review_work_v1 SET model_response_id=NULL;
 UPDATE signed_worker_actual_runs_v1 SET status='COMPLETED';
 ${query};
 ROLLBACK;`});
 assert.equal(pg.status,0,pg.stderr);
 const readings=pg.stdout.trim().split('\n').map(l=>{const i=l.indexOf('|');return [Number(l.slice(0,i)),JSON.parse(l.slice(i+1))]});
 assert.deepEqual(readings.map(x=>x[0]),[1,0,0,0,1]);
 assert.equal(readings[0][1][0].worker_completed,false);
 assert.equal(readings[0][1][0].worker_failure_attested,true);
 assert.equal(readings[0][1][0].provider_outcome_unknown,true);
 assert.equal(readings[0][1][0].replay_authorized,false);
 assert.equal(readings[4][1][0].worker_completed,true);
 assert.equal(readings[4][1][0].worker_failure_attested,undefined);
 console.log('SIGNED_FAILURE_OBSERVATION_EXACT_JOIN_AND_NEGATIVE_CONTROLS_VERIFIED');
