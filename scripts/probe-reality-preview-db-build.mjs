// Isolated REAL Supabase benchmark proof, triggered during Vercel PREVIEW
// build of the dedicated reliability feature branch. Never production.
// Each phase runs in a distinct OS process: no shared in-memory Continuity.
// Idempotent: repeat builds only recheck established records, never create duplicates.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildGovernedChatSignal} from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import {startContinuityRuntime} from '../src/reality-continuity-spine-runtime-v0.1.js';
import {recordSourceAttestedEvidence,readGroundedEvidence} from '../src/reality-reliability-evidence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from '../src/reality-reliability-db-boundary-v0.1.js';

const BRANCH='feature/reality-drift-live-continuity-v1-20261024';
const BENCHMARK_REF='hvkfreoagbrphwghjajw';
const DB='https://'+BENCHMARK_REF+'.supabase.co';
const ROOT='probe:vercel-preview-actual-pg-restart-20261025-v1';
const WORLDLINE='reality:benchmark:actual-ci-restart';
const WORLD='reality:benchmark:actual-ci-chronology';
const phase=process.argv[2]||'run';
const now=()=>new Date().toISOString();
const digest=obj=>'sha256:'+crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');

if(process.env.VERCEL_ENV!=='preview'||process.env.VERCEL_GIT_COMMIT_REF!==BRANCH){
  throw Error('PREVIEW_TEST_BRANCH_REQUIRED');
}
if(!['run','seed','supersede','recover'].includes(phase))throw Error('INVALID_RESTART_PHASE');
// The Preview reliability feature has branch-scoped benchmark project variables;
// no default production URL, key, project, or cross-project fallback is allowed.
process.env.REALITY_CONTINUOUS_RELIABILITY_ENABLED='true';
process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED='true';
const db=resolveReliabilityBenchmarkDb();
if(db.project!==BENCHMARK_REF||db.url!==DB||db.strictSecrets!==true){
  throw Error('WRONG_DATABASE_BOUNDARY');
}
// On all phases, persistence resolves benchmark URL + only the selected existing
// server-side Preview credential; the key is never printed or sent to GitHub.
const sourceId={seed:40164102484,supersede:40164146058};
async function source(which){
  const id=sourceId[which],expected=which==='seed'?'failure':'success';
  const response=await fetch('https://api.github.com/repos/maloney2323/Reality/actions/runs/'+id,{
    headers:{accept:'application/vnd.github+json','user-agent':'Reality-Preview-Benchmark'},
    signal:AbortSignal.timeout(14000),
  });
  if(!response.ok)throw Error('GITHUB_READBACK_UNAVAILABLE_'+response.status);
  const item=await response.json();
  if(item.id!==id||item.status!=='completed'||item.conclusion!==expected)
    throw Error('ACTUAL_GITHUB_SOURCE_DISAGREES');
  return {run_id:id,conclusion:expected.toUpperCase(),updated_at:item.updated_at,
    head_sha:item.head_sha,url:item.html_url};
}
async function open(){
  const r=await startContinuityRuntime({
    continuityRootSource:ROOT,worldlineSource:WORLDLINE,
    subjectId:'benchmark-vercel-preview-restart',
    signal:buildGovernedChatSignal({message:'Read verified GitHub CI history from benchmark only.',
      observedAt:now()}),
    observedAt:now(),
  });
  if(!r.enabled||r.status!=='PERSISTED')throw Error('PERSISTED_CONTINUITY_RUNTIME_UNAVAILABLE');
  return r;
}
async function history(r){
  const all=await r.readback();
  return {all,ground:readGroundedEvidence(all,{worldId:WORLD})};
}
if(phase==='run'){
  // Separate processes guarantee Continuity must rehydrate from real PostgreSQL.
  for(const step of ['seed','supersede','recover']){
    execFileSync(process.execPath,[process.argv[1],step],{
      env:process.env,stdio:'inherit',timeout:60000,
    });
  }
  console.log('REAL_PREVIEW_DB_TEST '+JSON.stringify({phase:'COMPLETE',passes:3,
    same_in_memory_object:false,real_benchmark_postgres:true,
    customer_actions:0,model_calls:0,production_database:false}));
}else if(phase==='seed'){
  const src=await source('seed'),r=await open();
  const prior=await history(r);
  const first=prior.ground.facts.find(f=>f.key==='first_run_conclusion');
  if(!first){
    if(prior.ground.facts.some(f=>f.key==='scoped_current_run'))
      throw Error('FIRST_RUN_MISSING_BUT_CURRENT_PRESENT');
    await recordSourceAttestedEvidence({
      continuityRuntime:r,worldId:WORLD,sourceKind:'CONNECTED_PROVIDER_READBACK',
      sourceRef:src.url,sourceDigest:digest(src),observedAt:now(),
      facts:[{key:'first_run_conclusion',value:src.conclusion},
       {key:'scoped_current_run',value:src.conclusion},
       {key:'first_run_source_timestamp',value:src.updated_at}],
    });
  }else assert.equal(first.value,'FAILURE');
  const after=await history(r);
  assert.equal(after.ground.facts.find(f=>f.key==='first_run_conclusion')?.value,'FAILURE');
  console.log('REAL_PREVIEW_DB_TEST '+JSON.stringify({phase:'SEED',source:'actual_github',
    recorded:'FAILURE',readback:true,prior_events:r.prior_event_count}));
}else if(phase==='supersede'){
  const src=await source('supersede'),r=await open();
  if(r.prior_event_count<1)throw Error('SEPARATE_PROCESS_NO_PERSISTED_HISTORY');
  const prior=await history(r);
  const first=prior.ground.facts.find(f=>f.key==='first_run_conclusion');
  assert.equal(first?.value,'FAILURE');
  const before=prior.ground.facts.find(f=>f.key==='scoped_current_run');
  if(before?.value==='FAILURE'){
    await recordSourceAttestedEvidence({
      continuityRuntime:r,worldId:WORLD,sourceKind:'CONNECTED_PROVIDER_READBACK',
      sourceRef:src.url,sourceDigest:digest(src),observedAt:now(),
      facts:[{key:'second_run_conclusion',value:src.conclusion},
       {key:'scoped_current_run',value:src.conclusion,
        supersedes_evidence_ref:before.evidence_ref},
       {key:'second_run_source_timestamp',value:src.updated_at}],
    });
  }else assert.equal(before?.value,'SUCCESS');
  const after=await history(r);
  assert.equal(after.ground.facts.find(f=>f.key==='scoped_current_run')?.value,'SUCCESS');
  assert.ok(after.all.some(ev=>ev.event_id===first.evidence_ref));
  console.log('REAL_PREVIEW_DB_TEST '+JSON.stringify({phase:'SUPERSEDE',
    current:'SUCCESS',old:'FAILURE',readback:true,
    separate_process_rehydrated:r.prior_event_count>0}));
}else{
  const r=await open();
  if(r.prior_event_count<2)throw Error('THIRD_PROCESS_NO_HISTORY');
  const after=await history(r),facts=new Map(after.ground.facts.map(x=>[x.key,x]));
  assert.equal(facts.get('first_run_conclusion')?.value,'FAILURE');
  assert.equal(facts.get('second_run_conclusion')?.value,'SUCCESS');
  assert.equal(facts.get('scoped_current_run')?.value,'SUCCESS');
  const histories=after.all.filter(e=>e.payload?.event_type==='SOURCE_ATTESTED_EVIDENCE');
  assert.ok(histories.some(e=>e.payload.facts.some(x=>x.key==='scoped_current_run'&&x.value==='FAILURE')));
  assert.ok(histories.some(e=>e.payload.facts.some(x=>x.key==='scoped_current_run'&&x.value==='SUCCESS')));
  console.log('REAL_PREVIEW_DB_TEST '+JSON.stringify({phase:'RECOVER',
    current:'SUCCESS',older:'FAILURE',historical_events_retained:true,
    fresh_runtime_process:true,event_count:after.all.length,
    production_database:false,model_calls:0,external_actions:0}));
}
