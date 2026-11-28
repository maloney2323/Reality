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
